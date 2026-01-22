document.addEventListener('DOMContentLoaded', async () => {
    const domainInput = document.getElementById('domainInput');
    const checkBtn = document.getElementById('checkBtn');
    const resultDiv = document.getElementById('result');
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const errorMsg = document.getElementById('errorMsg');
    const daysLeftEl = document.getElementById('daysLeft');
    const expiryDateEl = document.getElementById('expiryDate');
    const statusIndicator = document.getElementById('statusIndicator');

    const manualCheckDiv = document.getElementById('manualCheck');
    const whoisLink = document.getElementById('whoisLink');

    // Get current tab domain automatically
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
        try {
            const url = new URL(tab.url);
            if (url.protocol.startsWith('http')) {
                let domain = url.hostname;
                if (domain.startsWith('www.')) domain = domain.slice(4);
                domainInput.value = domain;
                checkDomain(domain);
            }
        } catch (e) {
            console.log('Invalid URL');
        }
    }

    checkBtn.addEventListener('click', () => {
        const domain = domainInput.value.trim();
        if (domain) checkDomain(domain);
    });

    domainInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const domain = domainInput.value.trim();
            if (domain) checkDomain(domain);
        }
    });

    // Clear error on simple input
    domainInput.addEventListener('input', () => {
        errorDiv.classList.add('hidden');
        resultDiv.classList.add('hidden');
    });

    async function checkDomain(domain) {
        // UI Reset
        resultDiv.classList.add('hidden');
        errorDiv.classList.add('hidden');
        loadingDiv.classList.remove('hidden');

        // Clean domain
        domain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];

        try {
            // Parallelize initial requests
            const [domainResponse, sslResponse] = await Promise.allSettled([
                fetch(`https://rdap.org/domain/${domain}`),
                fetch(`https://networkcalc.com/api/security/certificate/${domain}`)
            ]);

            // Handle Domain Expiry
            let domainData = null;
            let domainExpiryDate = null;

            if (domainResponse.status === 'fulfilled' && domainResponse.value.ok) {
                domainData = await domainResponse.value.json();
                domainExpiryDate = findExpiryDate(domainData);
            }

            // Handle SSL Expiry
            let sslExpiryDate = null;

            // 1. Try NetworkCalc
            if (sslResponse.status === 'fulfilled' && sslResponse.value.ok) {
                try {
                    const sslData = await sslResponse.value.json();
                    if (sslData && sslData.certificate && sslData.certificate.valid_to) {
                        sslExpiryDate = new Date(sslData.certificate.valid_to);
                    }
                } catch (e) { /* ignore parse error */ }
            }

            // 2. Fallback to crt.sh if needed
            if (!sslExpiryDate) {
                try {
                    sslExpiryDate = await checkCrtSh(domain);
                } catch (e) {
                    console.log('CRT.sh failed', e);
                }
            }

            if (!domainExpiryDate && !sslExpiryDate) {
                throw new Error('The domain registrar or registry does not provide this information publicly.');
            }

            displayResult(domainExpiryDate, sslExpiryDate);

        } catch (err) {
            showError(err.message);
        } finally {
            loadingDiv.classList.add('hidden');
        }
    }

    async function checkCrtSh(domain) {
        try {
            const response = await fetch(`https://crt.sh/?q=${domain}&output=json`);
            if (!response.ok) return null;
            const data = await response.json();

            if (!data || !Array.isArray(data) || data.length === 0) return null;

            let maxDate = null;
            const searchDomain = domain.toLowerCase();

            data.forEach(cert => {
                // Filter: Ensure this cert actually applies to the domain we are checking.
                // crt.sh returns all matching 'like' queries, so 'google.com' usage might return 'sites.google.com'
                let applies = false;

                // Check SANs (Subject Alternative Names) - most reliable
                if (cert.name_value) {
                    const names = cert.name_value.split('\n');
                    for (const name of names) {
                        const n = name.toLowerCase().trim();
                        if (n === searchDomain) {
                            applies = true;
                            break;
                        }
                        // Handle wildcard matches (e.g. *.example.com matches www.example.com)
                        if (n.startsWith('*.')) {
                            const root = n.slice(2);
                            if (searchDomain.endsWith(root) && searchDomain.split('.').length === root.split('.').length + 1) {
                                applies = true;
                                break;
                            }
                        }
                    }
                }
                // Fallback to Common Name
                else if (cert.common_name) {
                    const cn = cert.common_name.toLowerCase();
                    if (cn === searchDomain || (cn.startsWith('*.') && searchDomain.endsWith(cn.slice(2)))) {
                        applies = true;
                    }
                }

                if (applies && cert.not_after) {
                    let dateStr = cert.not_after;
                    if (!dateStr.endsWith('Z')) dateStr += 'Z'; // Force UTC
                    const date = new Date(dateStr);

                    if (!maxDate || date > maxDate) {
                        maxDate = date;
                    }
                }
            });
            return maxDate;
        } catch (e) {
            console.warn('crt.sh check failed:', e);
            return null;
        }
    }

    function findExpiryDate(data) {
        // RDAP standard: events array
        if (data.events && Array.isArray(data.events)) {
            // Look for 'expiration' or 'registration expiration'
            const expEvent = data.events.find(e =>
                e.eventAction === 'expiration' ||
                e.eventAction === 'registration expiration'
            );
            if (expEvent && expEvent.eventDate) {
                return new Date(expEvent.eventDate);
            }
        }
        return null;
    }

    function displayResult(domainDate, sslDate) {
        // --- Domain Expiry ---
        const domainEl = document.getElementById('daysLeft');
        const domainDateEl = document.getElementById('expiryDate');

        if (domainDate) {
            const diffDays = getDaysRemaining(domainDate);

            domainEl.textContent = diffDays;
            domainDateEl.textContent = domainDate.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            // Set main status based on domain (priority)
            resultDiv.classList.remove('status-safe', 'status-warning', 'status-urgent');
            if (diffDays > 60) {
                resultDiv.classList.add('status-safe');
                statusIndicator.style.backgroundColor = 'var(--success)';
            } else if (diffDays > 30) {
                resultDiv.classList.add('status-warning');
                statusIndicator.style.backgroundColor = 'var(--warning)';
            } else {
                resultDiv.classList.add('status-urgent');
                statusIndicator.style.backgroundColor = 'var(--danger)';
            }
        } else {
            domainEl.textContent = 'N/A';
            domainDateEl.textContent = 'Not Found';
            resultDiv.classList.add('status-warning'); // Default to warning if unknown
            statusIndicator.style.backgroundColor = 'var(--warning)';
        }

        // --- SSL Expiry ---
        const sslDaysEl = document.getElementById('sslDaysLeft');
        const sslDateEl = document.getElementById('sslExpiryDate');
        const sslResultDiv = document.getElementById('sslResult');

        if (sslDate) {
            const diffDaysSSL = getDaysRemaining(sslDate);

            sslDaysEl.textContent = diffDaysSSL;
            sslDateEl.textContent = sslDate.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            // Visual cue for SSL could be added here if needed,
            // for now we rely on the main status or could color the text
            if (diffDaysSSL < 30) {
                sslDaysEl.style.color = 'var(--danger)';
            } else {
                sslDaysEl.style.color = 'var(--text-primary)';
            }

        } else {
            sslDaysEl.textContent = 'N/A';
            sslDateEl.textContent = 'Not Found';
        }

        resultDiv.classList.remove('hidden');
    }

    // Helper: Calculate days remaining using standard difference
    // Using Math.floor gives usage "Days + Hours". "7 days" means "7 days and X hours".
    function getDaysRemaining(targetDate) {
        const now = new Date();
        const diffTime = targetDate - now;

        // Handle expired cases
        if (diffTime < 0) return 0;

        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }

    function showError(msg) {
        errorMsg.textContent = msg;
        errorDiv.classList.remove('hidden');
    }
});

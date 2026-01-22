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
            // Use rdap.org as the redirector/lookup service
            const response = await fetch(`https://rdap.org/domain/${domain}`);

            if (!response.ok) {
                throw new Error('The domain registrar or registry does not provide this information publicly.');
            }

            const data = await response.json();
            const expiryDate = findExpiryDate(data);

            if (!expiryDate) {
                throw new Error('The domain registrar or registry does not provide this information publicly.');
            }

            displayResult(expiryDate);

        } catch (err) {
            showError(err.message);
        } finally {
            loadingDiv.classList.add('hidden');
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

    function displayResult(date) {
        const now = new Date();
        const diffTime = date - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        daysLeftEl.textContent = diffDays;
        expiryDateEl.textContent = date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Remove old classes
        resultDiv.classList.remove('status-safe', 'status-warning', 'status-urgent');

        // Set status
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

        resultDiv.classList.remove('hidden');
    }

    function showError(msg) {
        errorMsg.textContent = msg;
        errorDiv.classList.remove('hidden');
    }
});

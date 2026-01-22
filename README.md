# Domain Expiry Checker 🌐

A beautiful, fast, and privacy-focused browser extension that instantly checks domain and SSL certificate expiry dates. Designed for developers and site managers who need quick answers without navigating to third-party websites.

![Extension Preview](https://via.placeholder.com/800x400?text=Premium+Dark+UI+Preview)

## ✨ Features

*   **⚡ Instant Detection**: Automatically detects the domain of your current tab.
*   **🎨 Premium UI**: Modern dark mode with glassmorphism and smooth animations.
*   **🚦 Smart Indicators**:
    *   🟢 **Safe**: > 60 days remaining
    *   🟡 **Warning**: < 60 days remaining
    *   🔴 **Urgent**: < 30 days remaining
*   **🔒 SSL Monitoring**: Checks SSL certificate validity and expiration date alongside domain expiry.
*   **🛡️ Privacy First**: No tracking, no analytics, no signups. Queries are sent directly via RDAP.
*   **⌨️ Manual Check**: Easily type in any domain to check it without visiting the site.

## 🚀 Installation

Since this is a developer tool, you can install it as an unpacked extension:

1.  **Download** or clone this repository to a folder on your computer.
2.  Open your browser (Chrome, Edge, Brave, etc.) and navigate to:
    *   `chrome://extensions` (Chrome/Brave)
    *   `edge://extensions` (Edge)
3.  Enable **Developer mode** (usually a toggle in the top right corner).
4.  Click the **Load unpacked** button.
5.  Select the folder where you saved this extension (`DomainExpiryChecker`).
6.  Pin the extension icon to your toolbar for easy access!

## 🛠️ Usage

1.  **Browse**: Visit any website you want to check.
2.  **Click**: Hit the extension icon.
3.  **View**: Instantly see the expiry date and days remaining for both Domain and SSL.
4.  **Manual**: Type a different domain in the input box and press Enter or the Search icon.

## 🧩 Technical Details

*   **Manifest V3**: Compliant with the latest browser extension standards.
*   **RDAP Protocol**: Uses the Registration Data Access Protocol (modern replacement for WHOIS) to fetch domain data.
*   **SSL API**: Uses NetworkCalc API to retrieve SSL certificate details.
*   **Vanilla JS/CSS**: Extremely lightweight with no external dependencies or frameworks.

## 🛡️ Privacy Policy

This extension respects your privacy:
*   **No Data Collection**: We do not store, track, or sell your data.
*   **No Accounts**: No sign-up required.
*   **Direct Connections**: Requests are made directly from your browser to `rdap.org` (domain lookup) and `networkcalc.com` (SSL lookup).

---

*Made for developers, by developers.*

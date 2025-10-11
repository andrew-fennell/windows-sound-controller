const https = require('https');
const { shell } = require('electron');

const GITHUB_REPO = 'andrew-fennell/windows-sound-controller';
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const RELEASES_PAGE_URL = `https://github.com/${GITHUB_REPO}/releases`;

/**
 * Compare two semantic version strings
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1, v2) {
    // Remove 'v' prefix if present
    const clean1 = v1.replace(/^v/, '');
    const clean2 = v2.replace(/^v/, '');

    const parts1 = clean1.split('.').map(Number);
    const parts2 = clean2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const num1 = parts1[i] || 0;
        const num2 = parts2[i] || 0;

        if (num1 > num2) return 1;
        if (num1 < num2) return -1;
    }

    return 0;
}

/**
 * Fetch latest release from GitHub
 * Returns: { available: boolean, latestVersion: string, currentVersion: string, url: string }
 */
async function checkForUpdates(currentVersion) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'api.github.com',
            path: `/repos/${GITHUB_REPO}/releases/latest`,
            method: 'GET',
            headers: {
                'User-Agent': 'windows-sound-controller'
            },
            timeout: 5000 // 5 second timeout
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    if (res.statusCode === 200) {
                        const release = JSON.parse(data);
                        const latestVersion = release.tag_name || release.name;

                        const isNewer = compareVersions(latestVersion, currentVersion) > 0;

                        resolve({
                            success: true,
                            available: isNewer,
                            latestVersion: latestVersion,
                            currentVersion: currentVersion,
                            url: release.html_url || RELEASES_PAGE_URL,
                            releaseName: release.name,
                            releaseNotes: release.body
                        });
                    } else {
                        // API returned error status
                        resolve({
                            success: false,
                            error: `GitHub API returned status ${res.statusCode}`,
                            offline: false
                        });
                    }
                } catch (error) {
                    resolve({
                        success: false,
                        error: 'Failed to parse GitHub response',
                        offline: false
                    });
                }
            });
        });

        req.on('error', (error) => {
            // Network error - likely offline or DNS failure
            resolve({
                success: false,
                error: error.message,
                offline: true
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                success: false,
                error: 'Request timeout',
                offline: true
            });
        });

        req.end();
    });
}

/**
 * Open the releases page in the default browser
 */
function openReleasesPage() {
    shell.openExternal(RELEASES_PAGE_URL);
}

module.exports = {
    checkForUpdates,
    openReleasesPage,
    compareVersions
};

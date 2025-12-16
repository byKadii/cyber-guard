// Service worker for Cyber Guard extension
// - Listens for tab updates and checks URLs with the backend `/predict_public` endpoint
// - If backend marks a URL as 'malicious' or 'phishing', redirect the tab to the local warning page

// Use `/predict_public` for deterministic, stateless detection and `/predict` to record history.
const BACKEND_PREDICT_PUBLIC_URL = 'http://localhost:8000/predict_public';
const BACKEND_PREDICT_SAVE_URL = 'http://localhost:8000/predict';

// Read setting and keep in memory
let autoCheck = false;

chrome.storage.local.get({ autoCheck: false }, (items) => {
	autoCheck = items.autoCheck;
    console.debug('CyberGuard (background): loaded autoCheck=', autoCheck);
});

// keep a short-lived set of hosts we've recently shown popups for
const recentlyBlockedHosts = new Set();

// Cache to prevent duplicate URL checks (URL -> timestamp)
const recentlyCheckedUrls = new Map();
const CHECK_COOLDOWN_MS = 5000; // Don't re-check same URL within 5 seconds

// Listen for changes from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
	if (msg && msg.type === 'setAutoCheck') {
		autoCheck = !!msg.value;
		chrome.storage.local.set({ autoCheck });
		console.debug('CyberGuard (background): setAutoCheck ->', autoCheck);
		sendResponse({ ok: true });
	}
});

// Helper: call backend predict_public endpoint (fast deterministic check)
async function queryBackend(url) {
	try {
		const res = await fetch(BACKEND_PREDICT_PUBLIC_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ url })
		});
		if (!res.ok) return null;
		const data = await res.json();
		return data;
	} catch (e) {
		console.warn('CyberGuard: backend query failed', e);
		return null;
	}
}

// Helper: record the scan via `/predict` so backend can persist to DB
async function saveScanToBackend(url) {
	try {
		await fetch(BACKEND_PREDICT_SAVE_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ url })
		});
	} catch (e) {
		console.warn('CyberGuard: failed to save scan to backend', e);
	}
}

// Helper: best-effort add history record directly to backend API
async function postHistoryToApi(url, status = 'malicious', threat_level = 'high') {
	try {
		const payload = { url, status, threat_level };
		console.debug('CyberGuard: posting history to API with payload:', payload);
		const res = await fetch('http://localhost:8000/api/history', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		console.debug('CyberGuard: POST /api/history result', res.status, res.statusText, res.ok);
		if (!res.ok) {
			const text = await res.text();
			console.warn('CyberGuard: POST /api/history error response:', text);
		}
	} catch (e) {
		console.error('CyberGuard: failed to POST history to API:', e.message, e.stack);
	}
}

// Helper: Show Chrome notification for site safety status
function showSiteNotification(url, isSafe, prediction) {
	const host = new URL(url).hostname;
	const notificationId = `cyberguard-${Date.now()}`;
	
	if (isSafe) {
		chrome.notifications.create(notificationId, {
			type: 'basic',
			iconUrl: 'icon.png',
			title: 'Safe Site ✅',
			message: 'This site is considered safe.',
			priority: 1
		});
	} else {
		chrome.notifications.create(notificationId, {
			type: 'basic',
			iconUrl: 'icon.png',
			title: 'Unsafe Site ⚠️',
			message: `Warning: This site has been blocked for your safety.`,
			priority: 2
		});
	}
	
	// Auto-close notification after 5 seconds
	setTimeout(() => {
		chrome.notifications.clear(notificationId);
	}, 5000);
}

// Helper to get whitelist (array of hostnames)
function getWhitelist() {
	return new Promise((resolve) => {
		chrome.storage.local.get({ whitelist: [] }, (items) => {
			resolve(items.whitelist || []);
		});
	});
}

// When a tab updates (loading or complete), check its URL (non-blocking).
// If backend returns threat_level 'high' we redirect to the warning page.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
	try {
		if (!autoCheck) {
			console.debug('CyberGuard (background): autoCheck is OFF, skipping check for tabId', tabId);
			return;
		}
		// Only trigger on 'complete' status to avoid duplicate checks
		if (changeInfo.status !== 'complete') return;
		const url = tab.url;
		if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) return;

		// Skip if we recently checked this URL
		const now = Date.now();
		const lastChecked = recentlyCheckedUrls.get(url);
		if (lastChecked && (now - lastChecked) < CHECK_COOLDOWN_MS) {
			console.debug('CyberGuard: skipping recently checked URL', url);
			return;
		}
		recentlyCheckedUrls.set(url, now);
		// Clean up old entries periodically
		if (recentlyCheckedUrls.size > 100) {
			for (const [cachedUrl, timestamp] of recentlyCheckedUrls) {
				if (now - timestamp > CHECK_COOLDOWN_MS * 2) {
					recentlyCheckedUrls.delete(cachedUrl);
				}
			}
		}

		const parsed = new URL(url);
		const host = parsed.hostname;

		// check whitelist
		const whitelist = await getWhitelist();
		if (whitelist.includes(host)) {
			console.debug('CyberGuard: host whitelisted, skipping', host);
			return;
		}

		// skip scanning local/back-end pages (avoid recording frontend pages like history)
		try {
			const backendHost = new URL(BACKEND_PREDICT_URL).hostname;
			if (host === backendHost || host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1') {
				console.debug('CyberGuard: skipping local/backend host', host);
				return;
			}
		} catch (e) {
			// ignore URL parsing errors
		}

		console.debug('CyberGuard: checking URL', url);
		const result = await queryBackend(url);
		console.debug('CyberGuard: backend result', result);

		// Block when backend marks it high threat OR prediction indicates malicious/phishing
		const pred = result && result.prediction ? result.prediction.toString().toLowerCase() : '';
		const threat = result && result.threat_level ? result.threat_level.toString().toLowerCase() : '';
		const shouldBlock = threat === 'high' || pred === 'malicious' || pred === 'phishing';
		console.debug('CyberGuard: shouldBlock=', shouldBlock, 'prediction=', pred, 'threat=', threat);
		if (shouldBlock) {
			// Show unsafe site notification
			showSiteNotification(url, false, pred);
			// Attempt to save the scan result to backend history (best-effort)
			// Note: /predict endpoint already saves to history, so no need to call postHistoryToApi
			saveScanToBackend(url).catch(() => {});
			const warningUrl = chrome.runtime.getURL('warning.html');
				try {
					console.info('CyberGuard: blocking URL', url, 'reason:', result);
				// Open the warning.html as a popup window so the user sees the block without losing the original tab
				// Avoid opening multiple popups for the same host in a short time
				if (!recentlyBlockedHosts.has(host)) {
					recentlyBlockedHosts.add(host);
					chrome.windows.create({ url: warningUrl, type: 'popup', width: 900, height: 600 }, (win) => {
						// auto-remove from set after a short timeout so user can be alerted again later if needed
						setTimeout(() => recentlyBlockedHosts.delete(host), 60 * 1000);
						// close the original tab that was blocked
						try {
							chrome.tabs.remove(tabId);
						} catch (e) {
							console.warn('CyberGuard: failed to close blocked tab', e);
						}
					});
				} else {
					console.debug('CyberGuard: popup already shown recently for', host);
				}
			} catch (e) {
				console.warn('CyberGuard: failed to open warning popup', e);
			}
			return;
		}

		// Non-high threats: show safe notification
		if (result && result.prediction) {
			console.debug('CyberGuard: non-blocking prediction', result.prediction, 'threat_level', result.threat_level);
			// Show safe site notification
			showSiteNotification(url, true, result.prediction);
		}

	} catch (e) {
		console.error('CyberGuard background error', e);
	}
});


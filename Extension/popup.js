document.addEventListener('DOMContentLoaded', () => {
	const enableBtn = document.getElementById('enableBtn');
	const disableBtn = document.getElementById('disableBtn');
	const status = document.getElementById('status');

	function updateStatus(checked) {
		status.textContent = checked ? 'Auto check: ON' : 'Auto check: OFF';
	}

	// load current setting
	chrome.storage.local.get({ autoCheck: false }, (items) => {
		updateStatus(items.autoCheck);
	});

	enableBtn.addEventListener('click', () => {
		chrome.runtime.sendMessage({ type: 'setAutoCheck', value: true }, (resp) => {
			updateStatus(true);
		});
	});

	disableBtn.addEventListener('click', () => {
		chrome.runtime.sendMessage({ type: 'setAutoCheck', value: false }, (resp) => {
			updateStatus(false);
		});
	});
});

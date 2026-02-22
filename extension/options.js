document.getElementById('save').addEventListener('click', saveOptions);

function saveOptions() {
  const apiKey = document.getElementById('apiKey').value.trim();
  const apiSecret = document.getElementById('apiSecret').value.trim();
  const environment = document.getElementById('environment').value;
  const useProxy = document.getElementById('useProxy').checked;
  const proxyUrl = document.getElementById('proxyUrl').value.trim() || 'http://127.0.0.1:8765';

  chrome.storage.local.set({
    apiKey,
    apiSecret,
    environment: environment === 'live' ? 'live' : 'demo',
    useProxy,
    proxyUrl: proxyUrl.replace(/\/$/, '')
  }, function() {
    var status = document.getElementById('status');
    status.textContent = '已保存';
    setTimeout(function() { status.textContent = ''; }, 2000);
  });
}

function loadOptions() {
  chrome.storage.local.get(['apiKey', 'apiSecret', 'environment', 'useProxy', 'proxyUrl'], function(r) {
    document.getElementById('apiKey').value = r.apiKey || '';
    document.getElementById('apiSecret').value = r.apiSecret || '';
    document.getElementById('environment').value = (r.environment === 'live' ? 'live' : 'demo');
    document.getElementById('useProxy').checked = !!r.useProxy;
    document.getElementById('proxyUrl').value = r.proxyUrl || 'http://127.0.0.1:8765';
  });
}

loadOptions();

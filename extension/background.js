// Background script to handle cross-origin fetches and downloads
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'FETCH_URL') {
    fetch(request.url, { credentials: 'include' })
      .then(response => {
        if (request.responseType === 'json') return response.json();
        return response.text();
      })
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'DOWNLOAD_JSON') {
    const blob = new Blob([JSON.stringify(request.data, null, 2)], { type: 'application/json' });
    
    // In service workers, we use data URLs for simple downloads
    const reader = new FileReader();
    reader.onload = () => {
      chrome.downloads.download({
        url: reader.result,
        filename: request.filename,
        saveAs: true
      });
    };
    reader.readAsDataURL(blob);
    sendResponse({ success: true });
  }
});

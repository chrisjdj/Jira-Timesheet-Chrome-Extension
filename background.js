/**
 * Background Service Worker for Jira Timesheet Dashboard
 * Handles extension lifecycle events and background tasks
 */

// Extension installation handler
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Jira Timesheet Dashboard installed successfully');
    
    // Set default settings
    chrome.storage.sync.set({
      weekStartDay: 0, // 0 = Sunday, 1 = Monday
      theme: 'light'
    });
  } else if (details.reason === 'update') {
    console.log('Jira Timesheet Dashboard updated to version', chrome.runtime.getManifest().version);
  }
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSettings') {
    // Retrieve settings from storage
    chrome.storage.sync.get(['weekStartDay', 'theme'], (result) => {
      sendResponse(result);
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'saveSettings') {
    // Save settings to storage
    chrome.storage.sync.set(request.settings, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Handle keyboard commands
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-in-tab') {
    const tabUrl = chrome.runtime.getURL('popup.html?mode=tab');
    chrome.tabs.create({ url: tabUrl });
  }
});

// Handle extension icon click (optional - for future enhancements)
chrome.action.onClicked.addListener((tab) => {
  // This won't fire when popup is defined, but kept for future use
  console.log('Extension icon clicked on tab:', tab.id);
});

// Monitor tab updates to check if user navigates to Jira
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('atlassian.net')) {
    console.log('Jira tab detected:', tab.url);
    // Future: Could send notification or update badge
  }
});

// Error handler for unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Keep service worker alive (optional - for future background tasks)
let keepAliveInterval;

function keepAlive() {
  keepAliveInterval = setInterval(() => {
    chrome.runtime.getPlatformInfo(() => {
      // Simple ping to keep service worker active
    });
  }, 20000); // Every 20 seconds
}

// Uncomment if you need to keep service worker alive for background tasks
// keepAlive();

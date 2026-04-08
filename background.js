/**
 * Background Service Worker for Jira Timesheet Dashboard
 * Handles extension lifecycle events, alarm-based reminders, and desktop notifications
 */

// ==========================================
// DEFAULT SETTINGS
// ==========================================

const DEFAULT_SETTINGS = {
  reminderEnabled: true,
  dailyTargetMinutes: 390, // 6h 30m
  alertTimes: ['17:00', '17:30', '18:00'],
  persistentNotification: true,
  snoozeDurationMinutes: 10,
  workingDays: [1, 2, 3, 4, 5], // Mon-Fri
  morningReminderEnabled: true,
  morningReminderTime: '09:00',
  weekStartDay: 1,
  theme: 'light'
};

// ==========================================
// EXTENSION LIFECYCLE
// ==========================================

// Extension installation handler
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Jira Timesheet Dashboard installed successfully');
    
    // Set default settings
    chrome.storage.sync.set(DEFAULT_SETTINGS, () => {
      console.log('Default settings saved');
      setupAlarms(DEFAULT_SETTINGS);
    });
  } else if (details.reason === 'update') {
    console.log('Jira Timesheet Dashboard updated to version', chrome.runtime.getManifest().version);
    // Re-setup alarms with existing settings
    loadSettingsAndSetupAlarms();
  }
});

// On startup, re-setup alarms (service workers can restart)
chrome.runtime.onStartup.addListener(() => {
  console.log('Service worker started, re-initializing alarms...');
  loadSettingsAndSetupAlarms();
});

// ==========================================
// MESSAGE HANDLING
// ==========================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSettings') {
    chrome.storage.sync.get(Object.keys(DEFAULT_SETTINGS), (result) => {
      sendResponse({ ...DEFAULT_SETTINGS, ...result });
    });
    return true;
  }
  
  if (request.action === 'saveSettings') {
    chrome.storage.sync.set(request.settings, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'updateAlarms') {
    console.log('Received updateAlarms message, reconfiguring alarms...');
    const settings = { ...DEFAULT_SETTINGS, ...request.settings };
    setupAlarms(settings);
    sendResponse({ success: true });
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

// ==========================================
// ALARM MANAGEMENT
// ==========================================

/**
 * Load settings from storage and setup alarms
 */
function loadSettingsAndSetupAlarms() {
  chrome.storage.sync.get(Object.keys(DEFAULT_SETTINGS), (result) => {
    const settings = { ...DEFAULT_SETTINGS, ...result };
    setupAlarms(settings);
  });
}

/**
 * Setup all Chrome alarms based on current settings
 */
async function setupAlarms(settings) {
  // Clear all existing alarms first
  await chrome.alarms.clearAll();
  console.log('All alarms cleared');
  
  if (!settings.reminderEnabled) {
    console.log('Reminders disabled, no alarms set');
    // Still set up morning reminder if enabled independently
    if (settings.morningReminderEnabled) {
      setupMorningAlarm(settings.morningReminderTime);
    }
    return;
  }
  
  // Setup daily reminder alarms for each alert time
  for (const timeStr of settings.alertTimes) {
    setupDailyAlarm(`reminder-${timeStr}`, timeStr);
  }
  
  // Setup morning reminder
  if (settings.morningReminderEnabled) {
    setupMorningAlarm(settings.morningReminderTime);
  }
  
  console.log('Alarms configured:', settings.alertTimes, 
    settings.morningReminderEnabled ? `+ morning at ${settings.morningReminderTime}` : '');
}

/**
 * Setup a daily repeating alarm at a specific time
 */
function setupDailyAlarm(alarmName, timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  const now = new Date();
  const alarmTime = new Date();
  alarmTime.setHours(hours, minutes, 0, 0);
  
  // If the time has already passed today, schedule for tomorrow
  if (alarmTime <= now) {
    alarmTime.setDate(alarmTime.getDate() + 1);
  }
  
  const delayInMinutes = (alarmTime.getTime() - now.getTime()) / (1000 * 60);
  
  chrome.alarms.create(alarmName, {
    delayInMinutes: delayInMinutes,
    periodInMinutes: 24 * 60 // Repeat daily
  });
  
  console.log(`Alarm "${alarmName}" set for ${alarmTime.toLocaleString()} (in ${Math.round(delayInMinutes)} minutes)`);
}

/**
 * Setup morning reminder alarm
 */
function setupMorningAlarm(timeStr) {
  setupDailyAlarm('morning-reminder', timeStr);
}

// ==========================================
// ALARM HANDLER
// ==========================================

chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log(`Alarm fired: ${alarm.name} at ${new Date().toLocaleString()}`);
  
  // Load settings
  const settings = await new Promise(resolve => {
    chrome.storage.sync.get(Object.keys(DEFAULT_SETTINGS), (result) => {
      resolve({ ...DEFAULT_SETTINGS, ...result });
    });
  });
  
  // Check if today is a working day
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ...
  if (!settings.workingDays.includes(dayOfWeek)) {
    console.log(`Today (day ${dayOfWeek}) is not a working day, skipping notification`);
    return;
  }
  
  if (alarm.name === 'morning-reminder') {
    // Morning reminder - always show if enabled, regardless of logged time
    if (!settings.morningReminderEnabled) return;
    
    showMorningNotification();
    return;
  }
  
  if (alarm.name.startsWith('reminder-')) {
    // Daily time check reminder
    if (!settings.reminderEnabled) return;
    
    await checkTimeAndNotify(settings);
    return;
  }

  if (alarm.name === 'snooze-reminder') {
    // Snoozed reminder — re-check time
    console.log('Snooze alarm fired, re-checking time...');
    if (!settings.reminderEnabled) return;
    
    await checkTimeAndNotify(settings);
    return;
  }
});

// ==========================================
// JIRA API (Background Worker Context)
// ==========================================

/**
 * Get Jira base URL from any open Jira tab
 */
async function getJiraBaseUrl() {
  const jiraTabs = await chrome.tabs.query({ url: 'https://*.atlassian.net/*' });
  if (jiraTabs.length === 0) {
    return null;
  }
  const url = new URL(jiraTabs[0].url);
  return `${url.protocol}//${url.host}`;
}

/**
 * Fetch today's total logged time from Jira
 * Returns { totalSeconds, formatted } or null
 */
async function fetchTodayLoggedTime() {
  const baseUrl = await getJiraBaseUrl();
  if (!baseUrl) {
    console.log('No Jira tab found, cannot fetch logged time');
    return null;
  }
  
  try {
    // Get current user
    const userResponse = await fetch(`${baseUrl}/rest/api/3/myself`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      credentials: 'include'
    });
    
    if (!userResponse.ok) return null;
    const currentUser = await userResponse.json();
    
    // Get today's date
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // Search for issues with worklogs today
    const jql = `worklogDate >= ${todayStr} AND worklogDate <= ${todayStr} AND worklogAuthor = currentUser()`;
    const searchResponse = await fetch(`${baseUrl}/rest/api/3/search/jql`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ jql, fields: ['summary'], maxResults: 100 })
    });
    
    if (!searchResponse.ok) return null;
    const searchData = await searchResponse.json();
    
    let totalSeconds = 0;
    const startTimestamp = new Date(todayStr).getTime();
    const endTimestamp = startTimestamp + (24 * 60 * 60 * 1000) - 1;
    
    // Fetch worklogs for each issue
    for (const issue of searchData.issues || []) {
      const wlResponse = await fetch(
        `${baseUrl}/rest/api/3/issue/${issue.key}/worklog?maxResults=100`,
        {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          credentials: 'include'
        }
      );
      
      if (!wlResponse.ok) continue;
      const wlData = await wlResponse.json();
      
      for (const worklog of wlData.worklogs || []) {
        const worklogDate = new Date(worklog.started).getTime();
        const isCurrentUser = worklog.author && worklog.author.accountId === currentUser.accountId;
        
        if (worklogDate >= startTimestamp && worklogDate <= endTimestamp && isCurrentUser) {
          totalSeconds += worklog.timeSpentSeconds || 0;
        }
      }
    }
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    return {
      totalSeconds,
      formatted: `${hours}h ${minutes}m`
    };
  } catch (error) {
    console.error('Background: Error fetching logged time:', error);
    return null;
  }
}

/**
 * Also account for active timer time stored in local storage
 */
async function getActiveTimerSeconds() {
  return new Promise(resolve => {
    chrome.storage.local.get(['activeTimers'], (result) => {
      let timerSeconds = 0;
      if (result.activeTimers) {
        Object.values(result.activeTimers).forEach(timer => {
          let timerMs = timer.accumulatedMs || 0;
          if (timer.currentState === 'running' && timer.lastStarted) {
            timerMs += Date.now() - timer.lastStarted;
          }
          timerSeconds += Math.floor(timerMs / 1000);
        });
      }
      resolve(timerSeconds);
    });
  });
}

// ==========================================
// NOTIFICATION LOGIC
// ==========================================

/**
 * Check today's logged time and send notification if below target
 */
async function checkTimeAndNotify(settings) {
  const loggedTime = await fetchTodayLoggedTime();
  const timerSeconds = await getActiveTimerSeconds();
  
  let totalSeconds = timerSeconds; // Start with timer time
  let loggedFormatted = 'unknown';
  
  if (loggedTime) {
    totalSeconds += loggedTime.totalSeconds;
    // Format total including timers
    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
    loggedFormatted = `${totalHours}h ${totalMinutes}m`;
  }
  
  const targetSeconds = settings.dailyTargetMinutes * 60;
  
  if (totalSeconds >= targetSeconds) {
    console.log(`Target met! Logged: ${loggedFormatted} >= ${settings.dailyTargetMinutes}min target`);
    return;
  }
  
  // Target not met — show notification
  let message;
  if (loggedTime) {
    message = `You've only logged ${loggedFormatted} today. Don't forget to log the remaining time!`;
  } else {
    message = `Reminder: Please check your daily timesheet and make sure you've logged enough time today.`;
  }
  
  const notifOptions = {
    type: 'basic',
    iconUrl: 'icons/icon.png',
    title: '⚠️ Daily Time Target Not Met',
    message: message,
    priority: 2,
    requireInteraction: settings.persistentNotification,
    buttons: [
      { title: `⏰ Snooze (${settings.snoozeDurationMinutes} min)` },
      { title: '📋 Open Timesheet' }
    ]
  };
  
  // Use a unique ID so multiple alarms don't stack the same notification
  const notifId = `timesheet-reminder-${Date.now()}`;
  
  chrome.notifications.create(notifId, notifOptions, (id) => {
    console.log(`Notification shown: ${id}`);
  });
}

/**
 * Show morning reminder notification
 */
function showMorningNotification() {
  const notifOptions = {
    type: 'basic',
    iconUrl: 'icons/icon.png',
    title: '☀️ Good Morning!',
    message: "Don't forget to start logging your time today. Open your timesheet to begin tracking.",
    priority: 1,
    requireInteraction: false // Morning reminders auto-dismiss
  };
  
  chrome.notifications.create('morning-reminder', notifOptions, (id) => {
    console.log(`Morning notification shown: ${id}`);
  });
}

// ==========================================
// NOTIFICATION CLICK HANDLER
// ==========================================

chrome.notifications.onClicked.addListener((notificationId) => {
  console.log(`Notification clicked: ${notificationId}`);
  
  // Open extension in full-screen tab mode
  const tabUrl = chrome.runtime.getURL('popup.html?mode=tab');
  chrome.tabs.create({ url: tabUrl }, () => {
    // Clear the notification after opening
    chrome.notifications.clear(notificationId);
  });
});

// Handle notification button clicks (Snooze / Open Timesheet)
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  console.log(`Notification button clicked: ${notificationId}, button: ${buttonIndex}`);
  
  if (buttonIndex === 0) {
    // Snooze button clicked
    chrome.storage.sync.get(['snoozeDurationMinutes'], (result) => {
      const snoozeMins = result.snoozeDurationMinutes || DEFAULT_SETTINGS.snoozeDurationMinutes;
      console.log(`Snoozing for ${snoozeMins} minutes...`);
      
      // Create a one-time snooze alarm
      chrome.alarms.create('snooze-reminder', {
        delayInMinutes: snoozeMins
      });
      
      // Clear the notification
      chrome.notifications.clear(notificationId);
    });
  } else if (buttonIndex === 1) {
    // Open Timesheet button clicked
    const tabUrl = chrome.runtime.getURL('popup.html?mode=tab');
    chrome.tabs.create({ url: tabUrl }, () => {
      chrome.notifications.clear(notificationId);
    });
  }
});

// ==========================================
// TAB MONITORING
// ==========================================

// Monitor tab updates to check if user navigates to Jira
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('atlassian.net')) {
    console.log('Jira tab detected:', tab.url);
  }
});

// ==========================================
// ERROR HANDLING
// ==========================================

self.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// ==========================================
// INITIAL ALARM SETUP ON WORKER LOAD
// ==========================================

// When service worker loads, ensure alarms are set up
loadSettingsAndSetupAlarms();

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

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.sync.set(DEFAULT_SETTINGS, () => {
      setupAlarms(DEFAULT_SETTINGS);
    });
  } else if (details.reason === 'update') {
    loadSettingsAndSetupAlarms();
  }
});

chrome.runtime.onStartup.addListener(() => {
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
    const settings = { ...DEFAULT_SETTINGS, ...request.settings };
    setupAlarms(settings);
    sendResponse({ success: true });
    return true;
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-in-tab') {
    const tabUrl = chrome.runtime.getURL('popup.html?mode=tab');
    chrome.tabs.create({ url: tabUrl });
  }
});

// ==========================================
// ALARM MANAGEMENT
// ==========================================

function loadSettingsAndSetupAlarms() {
  chrome.storage.sync.get(Object.keys(DEFAULT_SETTINGS), (result) => {
    const settings = { ...DEFAULT_SETTINGS, ...result };
    setupAlarms(settings);
  });
}

async function setupAlarms(settings) {
  await chrome.alarms.clearAll();
  
  if (!settings.reminderEnabled) {
    if (settings.morningReminderEnabled) {
      setupMorningAlarm(settings.morningReminderTime);
    }
    return;
  }
  
  for (const timeStr of settings.alertTimes) {
    setupDailyAlarm(`reminder-${timeStr}`, timeStr);
  }
  
  if (settings.morningReminderEnabled) {
    setupMorningAlarm(settings.morningReminderTime);
  }
}

function setupDailyAlarm(alarmName, timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  const now = new Date();
  const alarmTime = new Date();
  alarmTime.setHours(hours, minutes, 0, 0);
  
  if (alarmTime <= now) {
    alarmTime.setDate(alarmTime.getDate() + 1);
  }
  
  const delayInMinutes = (alarmTime.getTime() - now.getTime()) / (1000 * 60);
  
  chrome.alarms.create(alarmName, {
    delayInMinutes: delayInMinutes,
    periodInMinutes: 24 * 60
  });
}

function setupMorningAlarm(timeStr) {
  setupDailyAlarm('morning-reminder', timeStr);
}

// ==========================================
// ALARM HANDLER
// ==========================================

chrome.alarms.onAlarm.addListener(async (alarm) => {
  const settings = await new Promise(resolve => {
    chrome.storage.sync.get(Object.keys(DEFAULT_SETTINGS), (result) => {
      resolve({ ...DEFAULT_SETTINGS, ...result });
    });
  });
  
  const today = new Date();
  const dayOfWeek = today.getDay();
  if (!settings.workingDays.includes(dayOfWeek)) {
    return;
  }
  
  if (alarm.name === 'morning-reminder') {
    if (!settings.morningReminderEnabled) return;
    showMorningNotification();
    return;
  }
  
  if (alarm.name.startsWith('reminder-')) {
    if (!settings.reminderEnabled) return;
    await checkTimeAndNotify(settings);
    return;
  }

  if (alarm.name === 'snooze-reminder') {
    if (!settings.reminderEnabled) return;
    await checkTimeAndNotify(settings);
    return;
  }
});

// ==========================================
// JIRA API (Background Worker Context)
// ==========================================

async function getJiraBaseUrl() {
  const jiraTabs = await chrome.tabs.query({ url: 'https://*.atlassian.net/*' });
  if (jiraTabs.length === 0) {
    return null;
  }
  const url = new URL(jiraTabs[0].url);
  return `${url.protocol}//${url.host}`;
}

async function fetchTodayLoggedTime() {
  const baseUrl = await getJiraBaseUrl();
  if (!baseUrl) {
    return null;
  }
  
  try {
    const userResponse = await fetch(`${baseUrl}/rest/api/3/myself`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      credentials: 'include'
    });
    
    if (!userResponse.ok) return null;
    const currentUser = await userResponse.json();
    
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
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
    return null;
  }
}

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

async function checkTimeAndNotify(settings) {
  const loggedTime = await fetchTodayLoggedTime();
  const timerSeconds = await getActiveTimerSeconds();
  
  let totalSeconds = timerSeconds;
  let loggedFormatted = 'unknown';
  
  if (loggedTime) {
    totalSeconds += loggedTime.totalSeconds;
    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
    loggedFormatted = `${totalHours}h ${totalMinutes}m`;
  }
  
  const targetSeconds = settings.dailyTargetMinutes * 60;
  
  if (totalSeconds >= targetSeconds) {
    return;
  }
  
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
  
  const notifId = `timesheet-reminder-${Date.now()}`;
  
  chrome.notifications.create(notifId, notifOptions);
}

function showMorningNotification() {
  const notifOptions = {
    type: 'basic',
    iconUrl: 'icons/icon.png',
    title: '☀️ Good Morning!',
    message: "Don't forget to start logging your time today. Open your timesheet to begin tracking.",
    priority: 1,
    requireInteraction: false
  };
  
  chrome.notifications.create('morning-reminder', notifOptions);
}

// ==========================================
// NOTIFICATION CLICK HANDLER
// ==========================================

chrome.notifications.onClicked.addListener((notificationId) => {
  const tabUrl = chrome.runtime.getURL('popup.html?mode=tab');
  chrome.tabs.create({ url: tabUrl }, () => {
    chrome.notifications.clear(notificationId);
  });
});

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 0) {
    chrome.storage.sync.get(['snoozeDurationMinutes'], (result) => {
      const snoozeMins = result.snoozeDurationMinutes || DEFAULT_SETTINGS.snoozeDurationMinutes;
      
      chrome.alarms.create('snooze-reminder', {
        delayInMinutes: snoozeMins
      });
      
      chrome.notifications.clear(notificationId);
    });
  } else if (buttonIndex === 1) {
    const tabUrl = chrome.runtime.getURL('popup.html?mode=tab');
    chrome.tabs.create({ url: tabUrl }, () => {
      chrome.notifications.clear(notificationId);
    });
  }
});

// ==========================================
// DOWNLOAD ERROR HANDLING
// ==========================================

chrome.downloads.onChanged.addListener((downloadDelta) => {
  if (downloadDelta.state?.current === 'interrupted') {
    chrome.tabs.create({ url: 'https://github.com/chrisjdj/Jira-Timesheet-Chrome-Extension' });
  }
});

// ==========================================
// TAB MONITORING
// ==========================================

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('atlassian.net')) {
    // Jira tab detected
  }
});

// ==========================================
// ERROR HANDLING
// ==========================================

self.addEventListener('unhandledrejection', (event) => {
  // Silent fail
});

// ==========================================
// INITIAL ALARM SETUP ON WORKER LOAD
// ==========================================

loadSettingsAndSetupAlarms();

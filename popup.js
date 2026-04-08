// DOM Elements - Dashboard
const dateRangeSelect = document.getElementById('dateRange');
const customDateInputs = document.getElementById('customDateInputs');
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const loadBtn = document.getElementById('loadBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const errorMessage = document.getElementById('errorMessage');
const resultsSection = document.getElementById('resultsSection');
const totalTimeSpan = document.getElementById('totalTime');
const worklogTableBody = document.getElementById('worklogTableBody');
const noResults = document.getElementById('noResults');
const openInTabBtn = document.getElementById('openInTabBtn');

// DOM Elements - Tabs
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// DOM Elements - Assigned Tasks
const loadAssignedBtn = document.getElementById('loadAssignedBtn');
const assignedLoadingIndicator = document.getElementById('assignedLoadingIndicator');
const assignedErrorMessage = document.getElementById('assignedErrorMessage');
const assignedTableBody = document.getElementById('assignedTableBody');
const noAssignedResults = document.getElementById('noAssignedResults');
const assignedSearchInput = document.getElementById('assignedSearchInput');
const clearAssignedSearchBtn = document.getElementById('clearAssignedSearchBtn');
const assignedStatusFilter = document.getElementById('assignedStatusFilter');

// DOM Elements - Timers
const newTimerTaskSelect = document.getElementById('newTimerTaskSelect');
const newTimerTimePicker = document.getElementById('newTimerTimePicker');
const newTimerTimeBtn = document.getElementById('newTimerTimeBtn');
const newTimerTimeDropdown = document.getElementById('newTimerTimeDropdown');
const newTimerTimeResetIcon = document.getElementById('newTimerTimeResetIcon');
const addTimerBtn = document.getElementById('addTimerBtn');
const timersList = document.getElementById('timersList');
const sendTimersToEntryBtn = document.getElementById('sendTimersToEntryBtn');

// DOM Elements - Enter Time
const enterTimeErrorMessage = document.getElementById('enterTimeErrorMessage');
const timeEntriesContainer = document.getElementById('timeEntriesContainer');
const addRowBtn = document.getElementById('addRowBtn');
const submitAllBtn = document.getElementById('submitAllBtn');
const submitLoadingIndicator = document.getElementById('submitLoadingIndicator');
const submitResults = document.getElementById('submitResults');

// Multi-Timer State
let activeTimers = {}; // { taskId: { currentState: 'running'|'stopped', accumulatedMs: number, lastStarted: timestamp } }
let globalTimerInterval = null;

// DOM Elements - Theme
const themeToggleBtn = document.getElementById('themeToggleBtn');
const refreshBtn = document.getElementById('refreshBtn');

// DOM Elements - Update Banner
const updateBanner = document.getElementById('updateBanner');
const remoteVersionSpan = document.getElementById('remoteVersion');
const localVersionSpan = document.getElementById('localVersion');
const updateReleaseNotes = document.getElementById('updateReleaseNotes');
const viewReleaseNotesBtn = document.getElementById('viewReleaseNotesBtn');
const updateBtn = document.getElementById('updateBtn');
const dismissUpdateBtn = document.getElementById('dismissUpdateBtn');

const GITHUB_REPO = 'chrisjdj/Jira-Timesheet-Chrome-Extension';
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

let latestDownloadUrl = null;

function parseMarkdown(text) {
  if (!text) return '';
  
  let html = text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  
  return `<p>${html}</p>`;
}

// Shared State
let cachedAssignedTasks = null;

// Event Listeners
dateRangeSelect.addEventListener('change', handleDateRangeChange);
loadBtn.addEventListener('click', handleLoadClick);
if (openInTabBtn) {
  openInTabBtn.addEventListener('click', handleOpenInTab);
}

// Tab Listeners
tabBtns.forEach(btn => btn.addEventListener('click', handleTabClick));

// Assigned Listeners
if (loadAssignedBtn) loadAssignedBtn.addEventListener('click', () => loadAssignedTasks(true));
if (assignedSearchInput) assignedSearchInput.addEventListener('input', handleAssignedFilterChange);
if (clearAssignedSearchBtn) clearAssignedSearchBtn.addEventListener('click', () => {
  assignedSearchInput.value = '';
  handleAssignedFilterChange();
});
if (assignedStatusFilter) assignedStatusFilter.addEventListener('change', handleAssignedFilterChange);

// Timers Tab Listeners
if (addTimerBtn) addTimerBtn.addEventListener('click', addNewTimer);
if (sendTimersToEntryBtn) sendTimersToEntryBtn.addEventListener('click', sendAllTimersToEntry);

// Enter Time Listeners
if (addRowBtn) addRowBtn.addEventListener('click', addTimeEntryRow);
if (submitAllBtn) submitAllBtn.addEventListener('click', submitAllTimeEntries);

// Theme Listeners
if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
if (refreshBtn) refreshBtn.addEventListener('click', handleRefreshClick);

// Update Banner Listeners
if (updateBtn) updateBtn.addEventListener('click', handleUpdateClick);
if (dismissUpdateBtn) dismissUpdateBtn.addEventListener('click', dismissUpdateBanner);
if (viewReleaseNotesBtn) viewReleaseNotesBtn.addEventListener('click', toggleReleaseNotes);

// Settings Listener
const settingsBtn = document.getElementById('settingsBtn');
if (settingsBtn) {
  settingsBtn.addEventListener('click', () => {
    showSettingsTab();
  });
}

// Global Time Picker Close Listener
document.addEventListener('click', (e) => {
  if (!e.target.closest('.time-picker-dropdown') && !e.target.closest('.time-display-btn')) {
    document.querySelectorAll('.time-picker-dropdown').forEach(dropdown => {
      dropdown.classList.add('hidden');
    });
  }
});

// Initialize is called at the bottom of the file

/**
 * Initialize the popup
 */
async function initialize() {
  // Set default date values
  const today = formatDate(new Date());
  startDateInput.value = today;
  endDateInput.value = today;
  
  // Restore active tab
  const activeTab = localStorage.getItem('activeTab');
  if (activeTab && activeTab !== 'dashboard') {
    const tabBtn = document.querySelector(`.tab-btn[data-tab="${activeTab}"]`);
    if (tabBtn) {
      tabBtn.click();
    }
  }
  
  // Load persisted date range
  chrome.storage.sync.get(['dateRange', 'customStartDate', 'customEndDate'], (result) => {
    if (result.dateRange) {
      dateRangeSelect.value = result.dateRange;
      handleDateRangeChange(false); // don't re-save to sync immediately
    }
    if (result.customStartDate) startDateInput.value = result.customStartDate;
    if (result.customEndDate) endDateInput.value = result.customEndDate;
    
    // Auto-load dashboard on init only if dashboard is active tab
    const currentTab = localStorage.getItem('activeTab') || 'dashboard';
    if (currentTab === 'dashboard') {
      handleLoadClick();
    }
  });
  
  // Load theme
  chrome.storage.sync.get(['theme'], (result) => {
    if (result.theme) {
      applyTheme(result.theme);
    }
  });

  // Check if user is on Jira domain
  checkJiraDomain();

  // Pre-load assigned tasks to populate the timer task dropdown immediately
  await loadAssignedTasks();

  // Initialize Multi-Timers state
  chrome.storage.local.get(['activeTimers'], (result) => {
    if (result.activeTimers) {
      activeTimers = result.activeTimers;
    }
    renderTimersList();
    
    // Start global tick for all running timers
    if (!globalTimerInterval) {
      globalTimerInterval = setInterval(updateAllTimerDisplays, 1000);
    }
    
    // Initialize the add-timer time picker
    setupNewTimerTimePicker();
  });
  
  // Add initial row for Enter Time
  addTimeEntryRow();
  
  // Hide "Open in Tab" button if we're already in a tab
  if (isTabMode()) {
    if (openInTabBtn) {
      openInTabBtn.style.display = 'none';
    }
    // Add tab mode class to body for styling
    document.body.classList.add('tab-mode');
  }

  // Load reminder settings and populate Settings tab UI
  loadSettings();

  // Check and show warning banner on dashboard (after a short delay to let data load)
  setTimeout(() => {
    checkAndShowWarningBanner();
  }, 2000);

  // Check for updates
  checkForUpdate();
}

/**
 * Handle tab switching
 */
function handleTabClick(event) {
  const targetTab = event.target.getAttribute('data-tab');
  
  // Save active tab
  localStorage.setItem('activeTab', targetTab);
  
  // Update buttons
  tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === targetTab);
  });
  
  // Update content
  tabContents.forEach(content => {
    content.classList.toggle('active', content.id === targetTab);
  });

  // Load context specific data if needed
  if (targetTab === 'assigned' || targetTab === 'enterTime') {
    if (!cachedAssignedTasks) {
      loadAssignedTasks(false);
    }
  }
}

function showSettingsTab() {
  const targetTab = 'settings';
  localStorage.setItem('activeTab', targetTab);
  
  tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === targetTab);
  });
  
  tabContents.forEach(content => {
    content.classList.toggle('active', content.id === targetTab);
  });
}

/**
 * Check if running in tab mode
 */
function isTabMode() {
  return window.location.search.includes('mode=tab');
}

/**
 * Handle refresh button click
 */
function handleRefreshClick() {
  const activeTab = localStorage.getItem('activeTab') || 'dashboard';
  

  
  switch (activeTab) {
    case 'dashboard':
      handleLoadClick();
      break;
    case 'assigned':
      loadAssignedTasks(true);
      break;
    case 'timers':
      // For timers, we might want to refresh the assigned tasks if they are used for the dropdown,
      // or just re-render the list if needed. Refreshing assigned tasks is most likely what's needed.
      loadAssignedTasks(true);
      break;
    case 'enterTime':
      // For enterTime, refreshing assigned tasks helps populate the task dropdowns.
      loadAssignedTasks(true);
      break;
    default:

  }
}

/**
 * Handle open in tab button click
 */
function handleOpenInTab() {
  const tabUrl = chrome.runtime.getURL('popup.html?mode=tab');
  chrome.tabs.create({ url: tabUrl });
}

/**
 * Handle date range selection change
 */
function handleDateRangeChange(saveToStorage = true) {
  const selectedRange = dateRangeSelect.value;
  
  if (selectedRange === 'custom') {
    customDateInputs.classList.remove('hidden');
  } else {
    customDateInputs.classList.add('hidden');
  }
  
  if (saveToStorage) {
    chrome.storage.sync.set({
      dateRange: selectedRange,
      customStartDate: startDateInput.value,
      customEndDate: endDateInput.value
    });
  }
}

/**
 * Handle load button click
 */
async function handleLoadClick() {
  // Hide previous results and errors
  hideElement(errorMessage);
  hideElement(resultsSection);
  hideElement(noResults);
  
  // Reset total time
  totalTimeSpan.textContent = '0h 0m';
  
  // Get date range
  const { startDate, endDate } = getDateRange();
  
  // Save custom dates if present
  if (dateRangeSelect.value === 'custom') {
    chrome.storage.sync.set({
      customStartDate: startDateInput.value,
      customEndDate: endDateInput.value
    });
  }
  
  // Validate dates
  if (!startDate || !endDate) {
    showError('Please select valid dates');
    return;
  }
  
  if (new Date(startDate) > new Date(endDate)) {
    showError('Start date must be before or equal to end date');
    return;
  }
  
  // Show loading indicator
  showElement(loadingIndicator);
  loadBtn.disabled = true;
  
  try {
    // Fetch worklogs
    const worklogs = await fetchWorklogs(startDate, endDate);
    
    // Process and display results
    displayResults(worklogs);
  } catch (error) {
    showError(error.message);
  } finally {
    hideElement(loadingIndicator);
    loadBtn.disabled = false;
  }
}

/**
 * Get date range based on selected option
 */
function getDateRange() {
  const selectedRange = dateRangeSelect.value;
  const today = new Date();
  
  let startDate, endDate;
  
  switch (selectedRange) {
    case 'today':
      startDate = formatDate(today);
      endDate = formatDate(today);
      break;
      
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      startDate = formatDate(yesterday);
      endDate = formatDate(yesterday);
      break;
      
    case 'week':
      const weekStart = getWeekStart(today);
      startDate = formatDate(weekStart);
      endDate = formatDate(today);
      break;
      
    case 'last_week':
      const lastWeekStart = getWeekStart(today);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      const lastWeekEnd = new Date(lastWeekStart);
      lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);
      startDate = formatDate(lastWeekStart);
      endDate = formatDate(lastWeekEnd);
      break;
      
    case 'month':
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      startDate = formatDate(monthStart);
      endDate = formatDate(today);
      break;
      
    case 'custom':
      startDate = startDateInput.value;
      endDate = endDateInput.value;
      break;
      
    default:
      startDate = formatDate(today);
      endDate = formatDate(today);
  }
  
  return { startDate, endDate };
}

/**
 * Get the start of the week
 */
function getWeekStart(date) {
  const newDate = new Date(date);
  const day = newDate.getDay();
  const weekStartPref = 1; // Always start on Monday
  
  let diff = newDate.getDate() - day + weekStartPref;
  if (day < weekStartPref) {
    diff -= 7;
  }
  
  newDate.setDate(diff);
  return newDate;
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Fetch worklogs from Jira API
 */
async function fetchWorklogs(startDate, endDate) {

  return await window.JiraAPI.fetchWorklogs(startDate, endDate);
}

// Obsolete functions removed



/**
 * Display results in the table
 */
function displayResults(worklogs) {
  // Clear previous results
  worklogTableBody.innerHTML = '';
  
  if (worklogs.length === 0) {
    showElement(noResults);
    showElement(resultsSection);
    return;
  }
  
  hideElement(noResults);
  
  // Group worklogs by date
  const worklogsByDate = {};
  let totalSeconds = 0;
  
  for (const worklog of worklogs) {
    totalSeconds += worklog.timeSpentSeconds;
    
    if (!worklogsByDate[worklog.date]) {
      worklogsByDate[worklog.date] = [];
    }
    worklogsByDate[worklog.date].push(worklog);
  }
  
  // Sort dates
  const sortedDates = Object.keys(worklogsByDate).sort();
  
  // Populate table grouped by date
  for (const date of sortedDates) {
    const dateWorklogs = worklogsByDate[date];
    
    // Sort worklogs by start time (ascending order)
    dateWorklogs.sort((a, b) => new Date(a.started) - new Date(b.started));
    
    let dayTotal = 0;
    
    // Add date header row
    const dateHeaderRow = document.createElement('tr');
    dateHeaderRow.className = 'date-header';
    dateHeaderRow.innerHTML = `
      <td colspan="5"><strong>${formatDateHeader(date)}</strong></td>
    `;
    worklogTableBody.appendChild(dateHeaderRow);
    
    // Add worklogs for this date
    for (const worklog of dateWorklogs) {
      dayTotal += worklog.timeSpentSeconds;
      
      const row = document.createElement('tr');
      row.className = 'worklog-row';
      row.innerHTML = `
        <td><a href="#" class="issue-link" data-issue-key="${escapeHtml(worklog.key)}">${escapeHtml(worklog.key)}</a></td>
        <td>${escapeHtml(worklog.summary)}</td>
        <td style="white-space: nowrap;">${formatStartTime(worklog.started)}</td>
        <td style="white-space: nowrap;">${formatEndTime(worklog.started, worklog.timeSpentSeconds)}</td>
        <td style="white-space: nowrap;">${formatTime(worklog.timeSpentSeconds)}</td>
      `;
      
      const commentText = extractCommentText(worklog.comment);
      if (commentText) {
        row.style.borderBottom = 'none';
        worklogTableBody.appendChild(row);
        
        const commentRow = document.createElement('tr');
        commentRow.className = 'comment-row';
        commentRow.innerHTML = `
          <td></td>
          <td colspan="4" class="worklog-comment" style="font-style: italic; font-size: 0.9em;">${escapeHtml(commentText)}</td>
        `;
        worklogTableBody.appendChild(commentRow);
      } else {
        worklogTableBody.appendChild(row);
      }
    }
    
    // Add day total row
    const dayTotalRow = document.createElement('tr');
    dayTotalRow.className = 'day-total';
    dayTotalRow.innerHTML = `
      <td colspan="4"><strong>Day Total</strong></td>
      <td style="white-space: nowrap;"><strong>${formatTime(dayTotal)}</strong></td>
    `;
    worklogTableBody.appendChild(dayTotalRow);
  }
  
  // Add click event listeners to issue links
  const issueLinks = worklogTableBody.querySelectorAll('.issue-link');
  issueLinks.forEach(link => {
    link.addEventListener('click', handleIssueClick);
    link.addEventListener('auxclick', handleIssueClick);
  });
  
  // Update total time
  totalTimeSpan.textContent = formatTime(totalSeconds);
  
  // Show results
  showElement(resultsSection);
}

/**
 * Format date header for display
 */
function formatDateHeader(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Format start time for display
 */
function formatStartTime(startedStr) {
  if (!startedStr) return '-';
  const date = new Date(startedStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format end time for display
 */
function formatEndTime(startedStr, timeSpentSeconds) {
  if (!startedStr) return '-';
  const date = new Date(startedStr);
  date.setSeconds(date.getSeconds() + timeSpentSeconds);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format seconds to "Xh Ym"
 */
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Extract text from Jira comment (can be string or ADF object)
 */
function extractCommentText(comment) {
  if (!comment) return '';
  if (typeof comment === 'string') return comment;
  
  if (comment.type === 'doc' && comment.content) {
    let text = [];
    for (const block of comment.content) {
      if (block.type === 'paragraph' && block.content) {
        for (const inline of block.content) {
          if (inline.text) text.push(inline.text);
        }
      }
    }
    return text.join(' ');
  }
  
  try {
    return JSON.stringify(comment);
  } catch (e) {
    return '';
  }
}

/**
 * Show error message
 */
function showError(message) {
  errorMessage.textContent = message;
  showElement(errorMessage);
}

/**
 * Check if user is on Jira domain
 */
async function checkJiraDomain() {
  try {
    await window.JiraAPI.getBaseUrl();
  } catch (error) {
    showError(error.message);
    loadBtn.disabled = true;
  }
}

/**
 * Handle issue link click
 */
async function handleIssueClick(event) {
  if (event.type === 'auxclick' && event.button !== 1) {
    return;
  }
  
  event.preventDefault();
  
  const issueKey = event.target.getAttribute('data-issue-key');
  
  if (!issueKey) {
    return;
  }
  
  try {
    // Extract Jira base URL
    const jiraBaseUrl = await window.JiraAPI.getBaseUrl();
    
    // Open issue in new tab
    const issueUrl = `${jiraBaseUrl}/browse/${issueKey}`;
    const active = event.button !== 1 && !(event.ctrlKey || event.metaKey);
    chrome.tabs.create({ url: issueUrl, active });
    } catch (error) {
    showError(error.message === 'Open Jira in a tab before using this extension' 
      ? 'Cannot open issue: Jira tab not found' 
      : 'Failed to open issue');
  }
}

/**
 * Show element
 */
function showElement(element) {
  element.classList.remove('hidden');
}

/**
 * Hide element
 */
function hideElement(element) {
  if (element) {
    element.classList.add('hidden');
  }
}

// ==========================================
// ASSIGNED TASKS LOGIC
// ==========================================

/**
 * Load assigned tasks
 */
async function loadAssignedTasks(forceRefresh = false) {
  if (cachedAssignedTasks && !forceRefresh) {
    displayAssignedTasks(cachedAssignedTasks);
    populateTaskDropdowns(cachedAssignedTasks);
    return;
  }

  hideElement(assignedErrorMessage);
  hideElement(noAssignedResults);
  showElement(assignedLoadingIndicator);
  if (loadAssignedBtn) loadAssignedBtn.disabled = true;

  try {
    cachedAssignedTasks = await window.JiraAPI.fetchAssignedTasks();
    populateAssignedStatusFilter(cachedAssignedTasks);
    handleAssignedFilterChange(); // Use this instead of displayAssignedTasks directly to apply any default filters
    populateTaskDropdowns(cachedAssignedTasks);
  } catch (error) {
    assignedErrorMessage.textContent = error.message;
    showElement(assignedErrorMessage);
  } finally {
    hideElement(assignedLoadingIndicator);
    if (loadAssignedBtn) loadAssignedBtn.disabled = false;
  }
}

// Obsolete function removed

/**
 * Display assigned tasks in the table
 */
function displayAssignedTasks(tasks) {
  assignedTableBody.innerHTML = '';

  if (tasks.length === 0) {
    showElement(noAssignedResults);
    return;
  }
  
  hideElement(noAssignedResults);

  tasks.forEach(task => {
    const row = document.createElement('tr');
    
    const updatedDate = new Date(task.fields.updated);
    const day = String(updatedDate.getDate()).padStart(2, '0');
    const month = String(updatedDate.getMonth() + 1).padStart(2, '0');
    const year = updatedDate.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;
    const formattedTime = updatedDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    row.innerHTML = `
      <td><a href="#" class="issue-link" data-issue-key="${escapeHtml(task.key)}">${escapeHtml(task.key)}</a></td>
      <td>${escapeHtml(task.fields.summary)}</td>
      <td>${escapeHtml(task.fields.status.name)}</td>
      <td>
        <div class="updated-date">${escapeHtml(formattedDate)}</div>
        <div class="updated-time">${escapeHtml(formattedTime)}</div>
      </td>
    `;
    assignedTableBody.appendChild(row);
  });

  // Re-bind issue links
  const issueLinks = assignedTableBody.querySelectorAll('.issue-link');
  issueLinks.forEach(link => {
    link.addEventListener('click', handleIssueClick);
    link.addEventListener('auxclick', handleIssueClick);
  });
}

/**
 * Handle assigned tasks search and filter
 */
function handleAssignedFilterChange() {
  if (!cachedAssignedTasks) return;

  const searchTerm = assignedSearchInput.value.toLowerCase().trim();
  const statusFilter = assignedStatusFilter.value;

  // Toggle clear button visibility
  if (searchTerm.length > 0) {
    clearAssignedSearchBtn.classList.remove('hidden');
  } else {
    clearAssignedSearchBtn.classList.add('hidden');
  }

  // Filter tasks
  const filteredTasks = cachedAssignedTasks.filter(task => {
    // Format the date identically to how it's displayed in the table
    const updatedDate = new Date(task.fields.updated);
    const day = String(updatedDate.getDate()).padStart(2, '0');
    const month = String(updatedDate.getMonth() + 1).padStart(2, '0');
    const year = updatedDate.getFullYear();
    const formattedUpdated = `${day}/${month}/${year} ` + 
                             updatedDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    const searchMatchParts = [
      task.key,
      task.fields.summary,
      task.fields.status.name,
      formattedUpdated
    ].map(s => (s || '').toLowerCase());

    const matchesSearch = searchTerm === '' || 
                          searchMatchParts.some(part => part.includes(searchTerm));
    
    const matchesStatus = statusFilter === '' || 
                          task.fields.status.name === statusFilter;

    return matchesSearch && matchesStatus;
  });

  displayAssignedTasks(filteredTasks);
}

/**
 * Populate assigned tasks status filter dropdown
 */
function populateAssignedStatusFilter(tasks) {
  const currentValue = assignedStatusFilter.value;
  
  // Clear existing options except first
  while (assignedStatusFilter.options.length > 1) {
    assignedStatusFilter.remove(1);
  }
  
  // Get unique statuses
  const statuses = new Set();
  tasks.forEach(task => {
    if (task.fields.status && task.fields.status.name) {
      statuses.add(task.fields.status.name);
    }
  });

  // Add options
  Array.from(statuses).sort().forEach(status => {
    const option = document.createElement('option');
    option.value = status;
    option.textContent = status;
    assignedStatusFilter.appendChild(option);
  });

  // Restore value if it exists in the new options
  if (currentValue) {
    const exists = Array.from(assignedStatusFilter.querySelectorAll('option')).some(opt => opt.value === currentValue);
    if (exists) {
      assignedStatusFilter.value = currentValue;
    } else {
      assignedStatusFilter.value = ''; // Reset to All Statuses if previous selection no longer exists
    }
  }
}

// ==========================================
// TIMERS TAB LOGIC
// ==========================================

function saveTimersState() {
  chrome.storage.local.set({ activeTimers });
  
  // Toggle the send button visibility
  if (Object.keys(activeTimers).length > 0) {
    sendTimersToEntryBtn.classList.remove('hidden');
  } else {
    sendTimersToEntryBtn.classList.add('hidden');
  }
}

function addNewTimer() {
  const taskId = newTimerTaskSelect.value;
  if (!taskId) {
    showToast('Please select a task to add a timer', 'error');
    return;
  }
  
  if (activeTimers[taskId]) {
    showToast('A timer for this task already exists', 'error');
    return;
  }

  let accumulatedMs = 0;
  let firstStarted = Date.now();
  
  // If user selected a custom start time, calculate the elapsed time
  if (newTimerTimePicker.dataset.isCustom === 'true') {
    const hours = parseInt(newTimerTimePicker.dataset.hour || '12');
    const minutes = parseInt(newTimerTimePicker.dataset.min || '0');
    const ampm = newTimerTimePicker.dataset.ampm || 'AM';
    
    const startTime = new Date();
    let h = hours % 12; // 12 becomes 0
    if (ampm === 'PM') h += 12;
    startTime.setHours(h, minutes, 0, 0);
    
    firstStarted = startTime.getTime();
    accumulatedMs = Date.now() - firstStarted;
    
    // If the selected time is in the future, just treat it as "now"
    if (accumulatedMs < 0) {
      accumulatedMs = 0;
      firstStarted = Date.now();
    }
  }
  
  activeTimers[taskId] = {
    currentState: 'stopped',
    accumulatedMs: accumulatedMs,
    lastStarted: null,
    firstStarted: firstStarted,
    comment: ''
  };
  
  saveTimersState();
  renderTimersList();
  
  // Reset picker UI
  resetNewTimerTimePicker();
  
  // Start the newly added timer immediately for convenience
  toggleTimer(taskId);
  newTimerTaskSelect.value = '';
}

function setupNewTimerTimePicker() {
  if (!newTimerTimePicker) return;
  
  const now = new Date();
  let h = now.getHours();
  let m = now.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  
  let mStr = '00';
  if (m >= 15 && m < 30) mStr = '15';
  else if (m >= 30 && m < 45) mStr = '30';
  else if (m >= 45) mStr = '45';

  newTimerTimePicker.dataset.hour = String(h);
  newTimerTimePicker.dataset.min = mStr;
  newTimerTimePicker.dataset.ampm = ampm;
  newTimerTimePicker.dataset.isCustom = 'false';
  
  const okBtn = newTimerTimeDropdown.querySelector('.time-picker-ok-btn');
  
  function updateActiveStates() {
    newTimerTimeDropdown.querySelectorAll('.hour-opt').forEach(opt => {
      opt.classList.toggle('active', opt.getAttribute('data-val') === newTimerTimePicker.dataset.hour);
    });
    newTimerTimeDropdown.querySelectorAll('.min-opt').forEach(opt => {
      opt.classList.toggle('active', opt.getAttribute('data-val') === newTimerTimePicker.dataset.min);
    });
    newTimerTimeDropdown.querySelectorAll('.ampm-opt').forEach(opt => {
      opt.classList.toggle('active', opt.getAttribute('data-val') === newTimerTimePicker.dataset.ampm);
    });
  }
  
  function updateBtnText() {
    if (newTimerTimePicker.dataset.isCustom === 'true') {
      newTimerTimeBtn.textContent = `${newTimerTimePicker.dataset.hour}:${newTimerTimePicker.dataset.min} ${newTimerTimePicker.dataset.ampm}`;
      if (newTimerTimeResetIcon) newTimerTimeResetIcon.classList.remove('hidden');
    } else {
      newTimerTimeBtn.textContent = 'Current Time';
      if (newTimerTimeResetIcon) newTimerTimeResetIcon.classList.add('hidden');
    }
  }

  updateActiveStates();
  updateBtnText();

  newTimerTimeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.time-picker-dropdown').forEach(d => {
      if (d !== newTimerTimeDropdown) d.classList.add('hidden');
    });
    newTimerTimeDropdown.classList.toggle('hidden');
    updateActiveStates();
  });
  
  newTimerTimeDropdown.querySelectorAll('.time-opt').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const val = opt.getAttribute('data-val');
      if (opt.classList.contains('hour-opt')) {
        newTimerTimePicker.dataset.hour = val;
      } else if (opt.classList.contains('min-opt')) {
        newTimerTimePicker.dataset.min = val;
      } else if (opt.classList.contains('ampm-opt')) {
        newTimerTimePicker.dataset.ampm = val;
      }
      newTimerTimePicker.dataset.isCustom = 'true';
      updateActiveStates();
      updateBtnText();
    });
  });
  
  okBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    newTimerTimeDropdown.classList.add('hidden');
  });

  if (newTimerTimeResetIcon) {
    newTimerTimeResetIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      resetNewTimerTimePicker();
      showToast('Time reset to current', 'info');
    });
  }
}

function resetNewTimerTimePicker() {
  if (!newTimerTimePicker) return;
  const now = new Date();
  let h = now.getHours();
  let m = now.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  
  let mStr = '00';
  if (m >= 15 && m < 30) mStr = '15';
  else if (m >= 30 && m < 45) mStr = '30';
  else if (m >= 45) mStr = '45';

  newTimerTimePicker.dataset.hour = String(h);
  newTimerTimePicker.dataset.min = mStr;
  newTimerTimePicker.dataset.ampm = ampm;
  newTimerTimePicker.dataset.isCustom = 'false';
  
  newTimerTimeBtn.textContent = 'Current Time';
  if (newTimerTimeResetIcon) newTimerTimeResetIcon.classList.add('hidden');
  
  newTimerTimeDropdown.querySelectorAll('.time-opt').forEach(opt => {
    const val = opt.getAttribute('data-val');
    if (opt.classList.contains('hour-opt')) {
      opt.classList.toggle('active', val === String(h));
    } else if (opt.classList.contains('min-opt')) {
      opt.classList.toggle('active', val === mStr);
    } else if (opt.classList.contains('ampm-opt')) {
      opt.classList.toggle('active', val === ampm);
    }
  });
}

function toggleTimer(taskId) {
  const timer = activeTimers[taskId];
  if (!timer) return;
  
  if (timer.currentState === 'stopped') {
    timer.currentState = 'running';
    timer.lastStarted = Date.now();
  } else {
    timer.currentState = 'stopped';
    timer.accumulatedMs += Date.now() - timer.lastStarted;
    timer.lastStarted = null;
  }
  
  saveTimersState();
  renderTimersList();
}



function deleteTimer(taskId) {
  delete activeTimers[taskId];
  saveTimersState();
  renderTimersList();
}

function formatTimerDisplay(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return String(hours).padStart(2, '0') + ':' + 
         String(minutes).padStart(2, '0') + ':' + 
         String(seconds).padStart(2, '0');
}

function renderTimersList() {
  timersList.innerHTML = '';
  
  const timerIds = Object.keys(activeTimers);
  
  if (timerIds.length === 0) {
    timersList.innerHTML = '<div class="no-results">No active timers. Add one above!</div>';
    sendTimersToEntryBtn.classList.add('hidden');
    return;
  }
  
  sendTimersToEntryBtn.classList.remove('hidden');
  
  timerIds.forEach(taskId => {
    const timer = activeTimers[taskId];
    const row = document.createElement('div');
    row.className = 'timer-row';
    row.dataset.taskId = taskId;
    
    // Find summary from cachedAssignedTasks if possible
    let summary = 'Task Description';
    if (cachedAssignedTasks) {
      const matched = cachedAssignedTasks.find(t => t.key === taskId);
      if (matched && matched.fields && matched.fields.summary) {
        summary = matched.fields.summary;
      }
    }
    
    // Compute current ms for render
    let currentMs = timer.accumulatedMs;
    if (timer.currentState === 'running' && timer.lastStarted) {
      currentMs += Date.now() - timer.lastStarted;
    }
    
    const isRunning = timer.currentState === 'running';
    
    row.innerHTML = `
      <div class="timer-row-info">
        <div class="timer-row-title" title="${escapeHtml(summary)}"><a href="#" class="issue-link" data-issue-key="${escapeHtml(taskId)}">${escapeHtml(taskId)}</a> - ${escapeHtml(summary)}</div>
        <div class="timer-row-started">Started at: ${timer.firstStarted ? new Date(timer.firstStarted).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
        <div class="timer-row-display">${formatTimerDisplay(currentMs)}</div>
      </div>
      <div class="timer-row-actions">
        <button class="timer-action-btn toggle-timer-btn ${isRunning ? 'timer-pause-btn' : 'timer-play-btn'}" aria-label="${isRunning ? 'Pause' : 'Play'}">
          ${isRunning ? '⏸' : '▶'}
        </button>
        <button class="timer-action-btn delete-timer-btn" title="Delete Timer">&times;</button>

      </div>
      <div class="timer-row-comment">
        <textarea class="timer-comment-input" placeholder="What are you working on?" rows="4">${escapeHtml(timer.comment || '')}</textarea>
      </div>
    `;
    
    const commentInput = row.querySelector('.timer-comment-input');
    commentInput.addEventListener('input', (e) => {
      timer.comment = e.target.value;
      saveTimersState();
    });
    
    row.querySelector('.toggle-timer-btn').addEventListener('click', () => toggleTimer(taskId));
    row.querySelector('.delete-timer-btn').addEventListener('click', () => deleteTimer(taskId));
    
    // Add click handlers for issue links
    const issueLinks = row.querySelectorAll('.issue-link');
    issueLinks.forEach(link => {
      link.addEventListener('click', handleIssueClick);
      link.addEventListener('auxclick', handleIssueClick);
    });
    
    timersList.appendChild(row);
  });
}

function updateAllTimerDisplays() {
  const rows = timersList.querySelectorAll('.timer-row');
  rows.forEach(row => {
    const taskId = row.dataset.taskId;
    const timer = activeTimers[taskId];
    if (timer && timer.currentState === 'running') {
      const currentMs = timer.accumulatedMs + (Date.now() - timer.lastStarted);
      row.querySelector('.timer-row-display').textContent = formatTimerDisplay(currentMs);
    }
  });
}

function sendAllTimersToEntry() {
  const timerIds = Object.keys(activeTimers);
  if (timerIds.length === 0) return;
  
  // Clear any completely empty rows in Enter Time
  const rows = Array.from(timeEntriesContainer.querySelectorAll('.time-entry-row'));
  const emptyRows = rows.filter(r => {
    const tVal = r.querySelector('.task-select').value;
    const sVal = r.querySelector('.time-spent-input').value;
    return !tVal && !sVal;
  });
  emptyRows.forEach(r => r.remove());
  
  let addedCount = 0;
  
  timerIds.forEach(taskId => {
    const timer = activeTimers[taskId];
    
    // Pause if running to lock in final time
    if (timer.currentState === 'running') {
      timer.accumulatedMs += Date.now() - timer.lastStarted;
      timer.currentState = 'stopped';
      timer.lastStarted = null;
    }
    
    const totalSeconds = Math.floor(timer.accumulatedMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    // If less than 1 minute logged, we skip sending it but we don't delete it
    if (hours === 0 && minutes === 0) {
      return; 
    }
    
    let timeSpentStr = '';
    if (hours > 0) timeSpentStr += `${hours}h `;
    if (minutes > 0) timeSpentStr += `${minutes}m`;
    else if (hours === 0) timeSpentStr = '1m'; // Minimum 1m if strictly 0m but > 0 seconds
    
    timeSpentStr = timeSpentStr.trim();
    
    // Add row to UI with the timer's start time
    addTimeEntryRow(timer.firstStarted);
    const targetRow = timeEntriesContainer.lastElementChild;
    targetRow.querySelector('.task-select').value = taskId;
    targetRow.querySelector('.time-spent-input').value = timeSpentStr;
    targetRow.querySelector('.comment-input').value = timer.comment || '';
    
    addedCount++;
    delete activeTimers[taskId];
  });
  
  if (addedCount === 0) {
    saveTimersState();
    renderTimersList();
    showToast('No timers had enough time (>= 1m) to send.', 'error');
    return;
  }

  saveTimersState();
  renderTimersList();
  
  // Ensure Enter Time has at least one row if we somehow added 0 (all under 1min)
  if (timeEntriesContainer.children.length === 0) {
    addTimeEntryRow();
  }
  
  // Switch to Enter Time tab
  document.querySelector('.tab-btn[data-tab="enterTime"]').click();
  
  showToast(`Sent ${addedCount} timed tasks to the entry sheet!`, 'success');
}

// Make these globally accessible to popup.html inline handlers? No, Chrome CSP forbids it.
// We use EventListeners in the DOM above instead.

// ==========================================
// ENTER TIME LOGIC
// ==========================================

/**
 * Add a new time entry row
 * @param {number|null} initialStartTime - Optional timestamp to initialize the row's date and time
 */
function addTimeEntryRow(initialStartTime = null) {
  const rowId = 'row-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  const row = document.createElement('div');
  row.className = 'time-entry-row';
  row.id = rowId;

  row.innerHTML = `
    <div class="time-entry-main-row">
      <div class="time-entry-field task">
        <label>Task</label>
        <div style="display: flex; gap: 4px;">
          <select class="task-select" required>
            <option value="">Select a task...</option>
          </select>
        </div>
      </div>
      <div class="time-entry-field date">
        <label>Date & Time</label>
        <div style="display: flex; gap: 4px; position: relative;" class="datetime-wrapper">
          <input type="date" class="start-date-input" required style="width: auto; flex: 1; padding: 4px; font-size: 13px;">
          <button type="button" class="action-btn time-display-btn" style="flex: 0 0 75px; padding: 4px; font-size: 13px; margin: 0;">12:00 AM</button>
          
          <div class="time-picker-dropdown hidden">
            <div class="time-picker-sections">
              <div class="time-picker-section">
                <div class="time-picker-label">Hours</div>
                <div class="time-picker-row">
                ${[1,2,3,4,5,6,7,8,9,10,11].map(h => `<div class="time-opt hour-opt" data-val="${h}">${h}</div>`).join('')}
                <div class="time-opt hour-opt active" data-val="12">12</div>
                </div>
              </div>
              <div class="time-picker-separator"></div>
              <div class="time-picker-section">
                <div class="time-picker-label">Minutes</div>
                <div class="time-picker-row">
                  ${['00','15','30','45'].map(m => `<div class="time-opt min-opt" data-val="${m}">${m}</div>`).join('')}
                </div>
              </div>
              <div class="time-picker-separator"></div>
              <div class="time-picker-section">
                <div class="time-picker-row ampm-row">
                  <div class="time-opt ampm-opt active" data-val="AM">AM</div>
                  <div class="time-opt ampm-opt" data-val="PM">PM</div>
                </div>
              </div>
            </div>
            <div class="time-picker-footer">
              <button type="button" class="time-picker-ok-btn action-btn" style="padding: 4px 12px; margin-top:0;">OK</button>
            </div>
          </div>
        </div>
      </div>
      <div class="time-entry-field time">
        <label>Time Spent</label>
        <input type="text" class="time-spent-input" placeholder="e.g. 1h 30m" required>
      </div>
      <button type="button" class="remove-row-btn" title="Remove Row">&times;</button>
    </div>
    <div class="time-entry-comment-row">
      <div class="time-entry-field comment">
        <label>Comment (Optional)</label>
        <textarea class="comment-input" rows="3" placeholder="What did you do?"></textarea>
      </div>
    </div>
  `;

  timeEntriesContainer.appendChild(row);
  
  // Initialize dropdown if data is loaded
  if (cachedAssignedTasks) {
    populateTaskDropdowns(cachedAssignedTasks);
  }
  
  const now = initialStartTime ? new Date(initialStartTime) : new Date();
  if (isNaN(now.getTime())) {
    now.setTime(Date.now());
  }
  row.querySelector('.start-date-input').value = formatDate(now);
  
  let h = now.getHours();
  let m = now.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  
  let mStr = '00';
  if (initialStartTime) {
    mStr = String(m).padStart(2, '0');
  } else {
    if (m >= 15 && m < 30) mStr = '15';
    else if (m >= 30 && m < 45) mStr = '30';
    else if (m >= 45) mStr = '45';
  }

  if (isNaN(m) || mStr === 'NaN') {
    mStr = '00';
  }

  row.dataset.hour = String(h);
  row.dataset.min = mStr;
  row.dataset.ampm = ampm;
  row.querySelector('.time-display-btn').textContent = `${h}:${mStr} ${ampm}`;
  
  setupTimePicker(row);

  // Add event listener for the remove button
  const removeBtn = row.querySelector('.remove-row-btn');
  if (removeBtn) {
    removeBtn.addEventListener('click', () => removeTimeEntryRow(rowId));
  }
}

function setupTimePicker(row) {
  const btn = row.querySelector('.time-display-btn');
  const dropdown = row.querySelector('.time-picker-dropdown');
  const okBtn = row.querySelector('.time-picker-ok-btn');
  
  function updateActiveStates() {
    dropdown.querySelectorAll('.hour-opt').forEach(opt => {
      opt.classList.toggle('active', opt.getAttribute('data-val') === row.dataset.hour);
    });
    dropdown.querySelectorAll('.min-opt').forEach(opt => {
      opt.classList.toggle('active', opt.getAttribute('data-val') === row.dataset.min);
    });
    dropdown.querySelectorAll('.ampm-opt').forEach(opt => {
      opt.classList.toggle('active', opt.getAttribute('data-val') === row.dataset.ampm);
    });
  }
  
  function updateBtnText() {
    btn.textContent = `${row.dataset.hour}:${row.dataset.min} ${row.dataset.ampm}`;
  }

  updateActiveStates();

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.time-picker-dropdown').forEach(d => {
      if (d !== dropdown) d.classList.add('hidden');
    });
    dropdown.classList.toggle('hidden');
    updateActiveStates();
  });
  
  dropdown.querySelectorAll('.time-opt').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const val = opt.getAttribute('data-val');
      if (opt.classList.contains('hour-opt')) {
        row.dataset.hour = val;
      } else if (opt.classList.contains('min-opt')) {
        row.dataset.min = val;
      } else if (opt.classList.contains('ampm-opt')) {
        row.dataset.ampm = val;
      }
      updateActiveStates();
      updateBtnText();
    });
  });
  
  okBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.add('hidden');
  });
}

/**
 * Remove a time entry row
 */
window.removeTimeEntryRow = function(rowId) {
  const row = document.getElementById(rowId);
  if (row) {
    row.remove();
  }
  
  // Ensure at least one row exists
  if (timeEntriesContainer.children.length === 0) {
    addTimeEntryRow();
  }
};

/**
 * Populate all task dropdowns with assigned tasks
 */
function populateTaskDropdowns(tasks) {
  const selects = document.querySelectorAll('.task-select');
  selects.forEach(select => {
    const currentValue = select.value;
    
    // Clear existing options except first
    while (select.options.length > 1) {
      select.remove(1);
    }
    
    tasks.forEach(task => {
      const option = document.createElement('option');
      option.value = task.key;
      let summary = task.fields.summary;
      if (summary.length > 25) {
        summary = summary.substring(0, 25) + '...';
      }
      option.textContent = `${task.key} - ${summary} (${task.fields.status.name})`;
      option.title = task.fields.summary;
      select.appendChild(option);
    });

    // Restore value if it exists in the new options
    if (currentValue) {
      const exists = Array.from(select.querySelectorAll('option')).some(opt => opt.value === currentValue);
      if (exists) {
        select.value = currentValue;
      }
    }
  });
}

/**
 * Submit all time entries
 */
async function submitAllTimeEntries() {
  hideElement(enterTimeErrorMessage);
  submitResults.innerHTML = '';
  hideElement(submitResults);
  
  // Gather data
  const rows = timeEntriesContainer.querySelectorAll('.time-entry-row');
  const entries = [];
  
  for (const row of rows) {
    const task = row.querySelector('.task-select').value;
    const dateInput = row.querySelector('.start-date-input').value;
    let h = parseInt(row.dataset.hour || "12", 10);
    const m = row.dataset.min || "00";
    const ampm = row.dataset.ampm || "AM";
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    const startTime = dateInput ? `${dateInput}T${String(h).padStart(2, '0')}:${m}` : '';
    const timeSpent = row.querySelector('.time-spent-input').value;
    const comment = row.querySelector('.comment-input').value;
    
    if (task || timeSpent || comment) {
      if (!task || !dateInput || !timeSpent) {
        enterTimeErrorMessage.textContent = 'Please fill all required fields for rows containing data.';
        showElement(enterTimeErrorMessage);
        return;
      }
      entries.push({ row, task, startTime, timeSpent, comment });
    }
  }

  if (entries.length === 0) {
    enterTimeErrorMessage.textContent = 'Please add at least one complete time entry.';
    showElement(enterTimeErrorMessage);
    return;
  }

  showElement(submitLoadingIndicator);
  submitAllBtn.disabled = true;

  try {
    let successCount = 0;
    
    showElement(submitResults);

    // Sequential submission to avoid rate limiting and allow orderly display
    for (const entry of entries) {
      const resultItem = document.createElement('div');
      resultItem.className = 'submit-result-item';
      resultItem.textContent = `Submitting ${entry.timeSpent} to ${entry.task}...`;
      submitResults.appendChild(resultItem);

      try {
        await window.JiraAPI.addTimeEntry(entry.task, entry.timeSpent, entry.startTime, entry.comment);
        resultItem.textContent = `Success: Added ${entry.timeSpent} to ${entry.task}`;
        resultItem.classList.add('success');
        successCount++;
        // Remove row if successful
        entry.row.remove();
      } catch (err) {
        resultItem.textContent = `Error: Failed to add to ${entry.task} - ${err.message}`;
        resultItem.classList.add('error');
      }
    }
    
    // Ensure at least one row exists
    if (timeEntriesContainer.children.length === 0) {
      addTimeEntryRow();
    }

    // Show toast summary
    if (successCount > 0) {
      showToast(`Successfully added ${successCount} time entries!`, 'success');
    } else if (entries.length > 0) {
      showToast(`Failed to add time entries.`, 'error');
    }

  } catch (error) {
    enterTimeErrorMessage.textContent = error.message;
    showElement(enterTimeErrorMessage);
  } finally {
    hideElement(submitLoadingIndicator);
    submitAllBtn.disabled = false;
  }
}

// Obsolete function removed

// ==========================================
// THEME LOGIC
// ==========================================

/**
 * Toggle between light and dark theme
 */
function toggleTheme() {
  const isDark = document.body.classList.contains('dark-theme');
  const newTheme = isDark ? 'light' : 'dark';
  
  chrome.storage.sync.set({ theme: newTheme }, () => {
    showToast('Theme updated to ' + newTheme, 'success');
    applyTheme(newTheme);
  });
}

/**
 * Apply the selected theme to the body
 */
function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark-theme');
  } else {
    document.body.classList.remove('dark-theme');
  }
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================

/**
 * Show a toast notification
 * @param {string} message 
 * @param {string} type - 'success', 'error', or 'info'
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// ==========================================
// SETTINGS TAB LOGIC
// ==========================================

// DOM Elements - Settings
const reminderEnabledToggle = document.getElementById('reminderEnabledToggle');
const targetHoursInput = document.getElementById('targetHours');
const targetMinutesInput = document.getElementById('targetMinutes');
const persistentNotifToggle = document.getElementById('persistentNotifToggle');
const alertTimeChipsContainer = document.getElementById('alertTimeChips');
const newAlertTimeInput = document.getElementById('newAlertTimeInput');
const addAlertTimeBtn = document.getElementById('addAlertTimeBtn');
const morningReminderToggle = document.getElementById('morningReminderToggle');
const morningReminderTimeInput = document.getElementById('morningReminderTimeInput');
const snoozeDurationSelect = document.getElementById('snoozeDurationSelect');
const workingDaysContainer = document.getElementById('workingDaysContainer');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const settingsSavedIndicator = document.getElementById('settingsSavedIndicator');

// DOM Elements - Warning Banner
const timesheetWarningBanner = document.getElementById('timesheetWarningBanner');
const warningLoggedTime = document.getElementById('warningLoggedTime');
const dismissWarningBtn = document.getElementById('dismissWarningBtn');

// Settings state
let currentSettings = {
  reminderEnabled: true,
  dailyTargetMinutes: 390, // 6h 30m
  alertTimes: ['17:00', '17:30', '18:00'],
  persistentNotification: true,
  snoozeDurationMinutes: 10,
  workingDays: [1, 2, 3, 4, 5],
  morningReminderEnabled: true,
  morningReminderTime: '09:00'
};

// Settings Event Listeners
if (addAlertTimeBtn) addAlertTimeBtn.addEventListener('click', addAlertTime);
if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', saveSettings);
if (dismissWarningBtn) dismissWarningBtn.addEventListener('click', () => {
  timesheetWarningBanner.classList.add('hidden');
  // Remember dismissal for this session
  sessionStorage.setItem('warningDismissed', 'true');
});

/**
 * Load settings from chrome.storage.sync
 */
function loadSettings() {
  chrome.storage.sync.get([
    'reminderEnabled', 'dailyTargetMinutes', 'alertTimes',
    'persistentNotification', 'snoozeDurationMinutes', 'workingDays',
    'morningReminderEnabled', 'morningReminderTime'
  ], (result) => {
    // Merge with defaults
    if (result.reminderEnabled !== undefined) currentSettings.reminderEnabled = result.reminderEnabled;
    if (result.dailyTargetMinutes !== undefined) currentSettings.dailyTargetMinutes = result.dailyTargetMinutes;
    if (result.alertTimes !== undefined) currentSettings.alertTimes = result.alertTimes;
    if (result.persistentNotification !== undefined) currentSettings.persistentNotification = result.persistentNotification;
    if (result.snoozeDurationMinutes !== undefined) currentSettings.snoozeDurationMinutes = result.snoozeDurationMinutes;
    if (result.workingDays !== undefined) currentSettings.workingDays = result.workingDays;
    if (result.morningReminderEnabled !== undefined) currentSettings.morningReminderEnabled = result.morningReminderEnabled;
    if (result.morningReminderTime !== undefined) currentSettings.morningReminderTime = result.morningReminderTime;

    applySettingsToUI();
  });
}

/**
 * Apply current settings values to the UI controls
 */
function applySettingsToUI() {
  if (reminderEnabledToggle) reminderEnabledToggle.checked = currentSettings.reminderEnabled;
  if (persistentNotifToggle) persistentNotifToggle.checked = currentSettings.persistentNotification;
  if (morningReminderToggle) morningReminderToggle.checked = currentSettings.morningReminderEnabled;
  
  // Snooze duration
  if (snoozeDurationSelect) snoozeDurationSelect.value = String(currentSettings.snoozeDurationMinutes);
  
  // Target hours/minutes
  const hours = Math.floor(currentSettings.dailyTargetMinutes / 60);
  const minutes = currentSettings.dailyTargetMinutes % 60;
  if (targetHoursInput) targetHoursInput.value = hours;
  if (targetMinutesInput) targetMinutesInput.value = minutes;
  
  // Morning reminder time
  if (morningReminderTimeInput) morningReminderTimeInput.value = currentSettings.morningReminderTime;
  
  // Working days checkboxes
  if (workingDaysContainer) {
    const checkboxes = workingDaysContainer.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
      cb.checked = currentSettings.workingDays.includes(parseInt(cb.value));
    });
  }
  
  // Alert time chips
  renderAlertTimeChips();
}

/**
 * Render alert time chips
 */
function renderAlertTimeChips() {
  if (!alertTimeChipsContainer) return;
  alertTimeChipsContainer.innerHTML = '';
  
  // Sort times chronologically
  const sortedTimes = [...currentSettings.alertTimes].sort();
  
  sortedTimes.forEach(time => {
    const chip = document.createElement('div');
    chip.className = 'alert-time-chip';
    
    // Format time for display (e.g., "17:00" -> "5:00 PM")
    const displayTime = formatAlertTime(time);
    
    chip.innerHTML = `
      <span>${displayTime}</span>
      <button class="chip-remove-btn" title="Remove">&times;</button>
    `;
    
    chip.querySelector('.chip-remove-btn').addEventListener('click', () => {
      removeAlertTime(time);
    });
    
    alertTimeChipsContainer.appendChild(chip);
  });
  
  // Show placeholder if no chips
  if (sortedTimes.length === 0) {
    const placeholder = document.createElement('div');
    placeholder.className = 'settings-row-desc';
    placeholder.style.fontStyle = 'italic';
    placeholder.textContent = 'No alert times configured';
    alertTimeChipsContainer.appendChild(placeholder);
  }
}

/**
 * Format 24h time string to 12h display
 */
function formatAlertTime(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, '0')} ${ampm}`;
}

/**
 * Add a new alert time
 */
function addAlertTime() {
  if (!newAlertTimeInput) return;
  const timeVal = newAlertTimeInput.value;
  
  if (!timeVal) {
    showToast('Please select a time', 'error');
    return;
  }
  
  if (currentSettings.alertTimes.includes(timeVal)) {
    showToast('This time is already added', 'error');
    return;
  }
  
  currentSettings.alertTimes.push(timeVal);
  renderAlertTimeChips();
  showToast(`Alert added for ${formatAlertTime(timeVal)}`, 'success');
  saveSettings();
}

/**
 * Remove an alert time
 */
function removeAlertTime(time) {
  currentSettings.alertTimes = currentSettings.alertTimes.filter(t => t !== time);
  renderAlertTimeChips();
  showToast(`Alert removed for ${formatAlertTime(time)}`, 'info');
  saveSettings();
}

/**
 * Save settings to chrome.storage.sync and notify background worker
 */
function saveSettings() {
  // Read values from UI
  currentSettings.reminderEnabled = reminderEnabledToggle ? reminderEnabledToggle.checked : true;
  currentSettings.persistentNotification = persistentNotifToggle ? persistentNotifToggle.checked : true;
  currentSettings.morningReminderEnabled = morningReminderToggle ? morningReminderToggle.checked : true;
  
  // Snooze duration
  currentSettings.snoozeDurationMinutes = snoozeDurationSelect ? parseInt(snoozeDurationSelect.value, 10) : 10;
  
  // Target
  const hours = parseInt(targetHoursInput?.value || '6', 10);
  const minutes = parseInt(targetMinutesInput?.value || '30', 10);
  currentSettings.dailyTargetMinutes = (hours * 60) + minutes;
  
  // Morning reminder time
  currentSettings.morningReminderTime = morningReminderTimeInput?.value || '09:00';
  
  // Working days
  if (workingDaysContainer) {
    const checkboxes = workingDaysContainer.querySelectorAll('input[type="checkbox"]:checked');
    currentSettings.workingDays = Array.from(checkboxes).map(cb => parseInt(cb.value));
  }
  
  // Save to storage
  chrome.storage.sync.set({
    reminderEnabled: currentSettings.reminderEnabled,
    dailyTargetMinutes: currentSettings.dailyTargetMinutes,
    alertTimes: currentSettings.alertTimes,
    persistentNotification: currentSettings.persistentNotification,
    snoozeDurationMinutes: currentSettings.snoozeDurationMinutes,
    workingDays: currentSettings.workingDays,
    morningReminderEnabled: currentSettings.morningReminderEnabled,
    morningReminderTime: currentSettings.morningReminderTime
  }, () => {
    // Show saved indicator
    if (settingsSavedIndicator) {
      settingsSavedIndicator.classList.remove('hidden');
      setTimeout(() => {
        settingsSavedIndicator.classList.add('hidden');
      }, 2000);
    }
    
    showToast('Settings saved successfully', 'success');
    
    // Notify background worker to update alarms
    chrome.runtime.sendMessage({ action: 'updateAlarms', settings: currentSettings });
  });
}

// ==========================================
// WARNING BANNER LOGIC
// ==========================================

/**
 * Check today's logged time and show warning banner if below target
 * Accounts for active timer time (both running and paused)
 */
async function checkAndShowWarningBanner() {
  // Don't show if already dismissed this session
  if (sessionStorage.getItem('warningDismissed') === 'true') return;
  
  // Only show on dashboard tab and today's date range
  const currentTab = localStorage.getItem('activeTab') || 'dashboard';
  if (currentTab !== 'dashboard') return;
  
  // Load settings first
  const settings = await new Promise(resolve => {
    chrome.storage.sync.get(['dailyTargetMinutes', 'reminderEnabled', 'workingDays'], (result) => {
      resolve({
        dailyTargetMinutes: result.dailyTargetMinutes || 390,
        reminderEnabled: result.reminderEnabled !== undefined ? result.reminderEnabled : true,
        workingDays: result.workingDays || [1, 2, 3, 4, 5]
      });
    });
  });
  
  // Check if reminders are enabled
  if (!settings.reminderEnabled) return;
  
  // Check if today is a working day
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ...
  if (!settings.workingDays.includes(dayOfWeek)) return;
  
  try {
    // Get logged time from Jira
    const todayResult = await window.JiraAPI.fetchTodayTotalSeconds();
    if (!todayResult) return;
    
    let totalSeconds = todayResult.totalSeconds;
    
    // Add active timer time (both running and paused)
    if (activeTimers) {
      Object.values(activeTimers).forEach(timer => {
        let timerMs = timer.accumulatedMs || 0;
        if (timer.currentState === 'running' && timer.lastStarted) {
          timerMs += Date.now() - timer.lastStarted;
        }
        totalSeconds += Math.floor(timerMs / 1000);
      });
    }
    
    const targetSeconds = settings.dailyTargetMinutes * 60;
    
    if (totalSeconds < targetSeconds) {
      // Format the logged time
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const formattedTime = `${hours}h ${minutes}m`;
      
      if (warningLoggedTime) warningLoggedTime.textContent = formattedTime;
      if (timesheetWarningBanner) timesheetWarningBanner.classList.remove('hidden');
    } else {
      // Target met, hide banner
      if (timesheetWarningBanner) timesheetWarningBanner.classList.add('hidden');
    }
    } catch (error) {
  }
}

async function checkForUpdate() {
  // Check if dismissed today
  const dismissedDate = localStorage.getItem('updateDismissedDate');
  const today = new Date().toDateString();
  if (dismissedDate === today) return;

  try {
    const response = await fetch(GITHUB_API_URL, {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });
    
    if (!response.ok) return;
    
    const data = await response.json();
    
    if (data.message) return;
    
    const remoteVersion = data.tag_name?.replace(/^v/, '') || data.name;
    const releaseNotes = data.body || '';
    latestDownloadUrl = `https://github.com/${GITHUB_REPO}/archive/refs/tags/v${remoteVersion}.zip`;
    
    // Get local version from manifest
    const manifest = chrome.runtime.getManifest();
    const localVersion = manifest.version;
    
    // Compare versions
    if (remoteVersion && localVersion && remoteVersion !== localVersion) {
      if (remoteVersionSpan) remoteVersionSpan.textContent = remoteVersion;
      if (localVersionSpan) localVersionSpan.textContent = localVersion;
      
      // Show release notes (full content)
      if (updateReleaseNotes && releaseNotes) {
        updateReleaseNotes.innerHTML = parseMarkdown(releaseNotes);
        if (viewReleaseNotesBtn) viewReleaseNotesBtn.classList.remove('hidden');
      } else if (updateReleaseNotes) {
        if (viewReleaseNotesBtn) viewReleaseNotesBtn.classList.add('hidden');
      }
      
      updateBanner.classList.remove('hidden');
    }
  } catch (error) {
    // Silent fail - no release yet or network error
  }
}

function handleUpdateClick() {
  if (latestDownloadUrl) {
    const version = latestDownloadUrl.split('/').pop().replace('.zip', '');
    chrome.downloads.download({
      url: latestDownloadUrl,
      filename: `Jira-Timesheet-Chrome-Extension-${version}.zip`
    });
  } else {
    chrome.tabs.create({ url: `https://github.com/${GITHUB_REPO}` });
  }
}

function dismissUpdateBanner() {
  const today = new Date().toDateString();
  localStorage.setItem('updateDismissedDate', today);
  updateBanner.classList.add('hidden');
}

function toggleReleaseNotes() {
  if (updateReleaseNotes) {
    updateReleaseNotes.classList.toggle('hidden');
    if (viewReleaseNotesBtn) {
      viewReleaseNotesBtn.textContent = updateReleaseNotes.classList.contains('hidden') ? 'View changelog' : 'Hide changelog';
    }
  }
}

// Initialize application
initialize();


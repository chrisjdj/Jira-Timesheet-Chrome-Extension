// DOM Elements
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

// Event Listeners
dateRangeSelect.addEventListener('change', handleDateRangeChange);
loadBtn.addEventListener('click', handleLoadClick);
if (openInTabBtn) {
  openInTabBtn.addEventListener('click', handleOpenInTab);
}

// Initialize
initialize();

/**
 * Initialize the popup
 */
function initialize() {
  // Set default date values
  const today = formatDate(new Date());
  startDateInput.value = today;
  endDateInput.value = today;
  
  // Check if user is on Jira domain
  checkJiraDomain();
  
  // Hide "Open in Tab" button if we're already in a tab
  if (isTabMode()) {
    if (openInTabBtn) {
      openInTabBtn.style.display = 'none';
    }
    // Add tab mode class to body for styling
    document.body.classList.add('tab-mode');
  }
}

/**
 * Check if running in tab mode
 */
function isTabMode() {
  return window.location.search.includes('mode=tab');
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
function handleDateRangeChange() {
  const selectedRange = dateRangeSelect.value;
  
  if (selectedRange === 'custom') {
    customDateInputs.classList.remove('hidden');
  } else {
    customDateInputs.classList.add('hidden');
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
      
    case 'week':
      const weekStart = getWeekStart(today);
      startDate = formatDate(weekStart);
      endDate = formatDate(today);
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
 * Get the start of the week (Sunday)
 */
function getWeekStart(date) {
  const newDate = new Date(date);
  const day = newDate.getDay();
  const diff = newDate.getDate() - day;
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
  console.log(`[DEBUG] Fetching worklogs for date range: ${startDate} to ${endDate}`);
  
  // Get Jira tab
  let tab;
  if (isTabMode()) {
    // In tab mode, find any Jira tab
    const jiraTabs = await chrome.tabs.query({ url: 'https://*.atlassian.net/*' });
    if (jiraTabs.length === 0) {
      throw new Error('Open Jira in a tab before using this extension');
    }
    tab = jiraTabs[0]; // Use the first Jira tab found
  } else {
    // In popup mode, use the active tab
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  }
  
  if (!tab || !tab.url || !tab.url.includes('atlassian.net')) {
    throw new Error('Open Jira in a tab before using this extension');
  }
  
  // Extract Jira base URL
  const url = new URL(tab.url);
  const jiraBaseUrl = `${url.protocol}//${url.host}`;
  
  // Get current user information once
  const currentUser = await getCurrentUser(jiraBaseUrl);
  console.log(`[DEBUG] Current user: ${currentUser.displayName} (${currentUser.accountId})`);
  
  // Build JQL query
  const jql = `worklogDate >= ${startDate} AND worklogDate <= ${endDate} AND worklogAuthor = currentUser()`;
  console.log(`[DEBUG] JQL Query: ${jql}`);
  
  // Fetch all issues with pagination using new API endpoint
  const allIssues = [];
  let nextPageToken = null;
  const maxResults = 100;
  
  do {
    const requestBody = {
      jql: jql,
      fields: ['summary', 'key'],
      maxResults: maxResults
    };
    
    // Add nextPageToken if available (for pagination)
    if (nextPageToken) {
      requestBody.nextPageToken = nextPageToken;
    }
    
    const response = await fetch(`${jiraBaseUrl}/rest/api/3/search/jql`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Not authenticated. Please log in to Jira.');
      }
      throw new Error(`Failed to fetch worklogs: ${response.statusText}`);
    }
    
    const data = await response.json();
    allIssues.push(...data.issues);
    
    // Get next page token for pagination
    nextPageToken = data.nextPageToken || null;
  } while (nextPageToken);
  
  console.log(`[DEBUG] Found ${allIssues.length} issues with worklogs`);
  
  // Fetch worklogs for each issue separately
  const allWorklogs = [];
  for (const issue of allIssues) {
    const issueWorklogs = await fetchIssueWorklogs(jiraBaseUrl, issue.key, startDate, endDate, currentUser);
    console.log(`[DEBUG] Issue ${issue.key}: ${issueWorklogs.length} worklogs`);
    
    for (const worklog of issueWorklogs) {
      allWorklogs.push({
        key: issue.key,
        summary: issue.fields.summary,
        date: formatDate(new Date(worklog.started)),
        timeSpentSeconds: worklog.timeSpentSeconds || 0
      });
    }
  }
  
  console.log(`[DEBUG] Total worklogs retrieved: ${allWorklogs.length}`);
  return allWorklogs;
}

/**
 * Get current user information
 */
async function getCurrentUser(jiraBaseUrl) {
  const response = await fetch(`${jiraBaseUrl}/rest/api/3/myself`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    },
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch current user information');
  }
  
  return await response.json();
}

/**
 * Fetch all worklogs for a specific issue
 */
async function fetchIssueWorklogs(jiraBaseUrl, issueKey, startDate, endDate, currentUser) {
  const startTimestamp = new Date(startDate).getTime();
  const endTimestamp = new Date(endDate).getTime() + (24 * 60 * 60 * 1000) - 1; // End of day
  
  const allWorklogs = [];
  let startAt = 0;
  const maxResults = 100;
  let total = 0;
  
  do {
    const response = await fetch(
      `${jiraBaseUrl}/rest/api/3/issue/${issueKey}/worklog?startAt=${startAt}&maxResults=${maxResults}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        credentials: 'include'
      }
    );
    
    if (!response.ok) {
      console.error(`[ERROR] Failed to fetch worklogs for ${issueKey}: ${response.statusText}`);
      break;
    }
    
    const data = await response.json();
    total = data.total || 0;
    
    // Filter worklogs within date range and by current user
    for (const worklog of data.worklogs || []) {
      const worklogDate = new Date(worklog.started).getTime();
      const isCurrentUser = worklog.author && worklog.author.accountId === currentUser.accountId;
      
      if (worklogDate >= startTimestamp && worklogDate <= endTimestamp && isCurrentUser) {
        allWorklogs.push(worklog);
      }
    }
    
    startAt += maxResults;
  } while (startAt < total);
  
  return allWorklogs;
}



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
    let dayTotal = 0;
    
    // Add date header row
    const dateHeaderRow = document.createElement('tr');
    dateHeaderRow.className = 'date-header';
    dateHeaderRow.innerHTML = `
      <td colspan="3"><strong>${formatDateHeader(date)}</strong></td>
    `;
    worklogTableBody.appendChild(dateHeaderRow);
    
    // Add worklogs for this date
    for (const worklog of dateWorklogs) {
      dayTotal += worklog.timeSpentSeconds;
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><a href="#" class="issue-link" data-issue-key="${escapeHtml(worklog.key)}">${escapeHtml(worklog.key)}</a></td>
        <td>${escapeHtml(worklog.summary)}</td>
        <td>${formatTime(worklog.timeSpentSeconds)}</td>
      `;
      worklogTableBody.appendChild(row);
    }
    
    // Add day total row
    const dayTotalRow = document.createElement('tr');
    dayTotalRow.className = 'day-total';
    dayTotalRow.innerHTML = `
      <td colspan="2"><strong>Day Total</strong></td>
      <td><strong>${formatTime(dayTotal)}</strong></td>
    `;
    worklogTableBody.appendChild(dayTotalRow);
  }
  
  // Add click event listeners to issue links
  const issueLinks = worklogTableBody.querySelectorAll('.issue-link');
  issueLinks.forEach(link => {
    link.addEventListener('click', handleIssueClick);
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
    // In tab mode, we can't check the active tab since we ARE the active tab
    if (isTabMode()) {
      // Check if any Jira tab exists
      const jiraTabs = await chrome.tabs.query({ url: 'https://*.atlassian.net/*' });
      if (jiraTabs.length === 0) {
        showError('Open Jira in a tab before using this extension');
        loadBtn.disabled = true;
      }
      return;
    }
    
    // In popup mode, check the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.url || !tab.url.includes('atlassian.net')) {
      showError('Open Jira in a tab before using this extension');
      loadBtn.disabled = true;
    }
  } catch (error) {
    console.error('Error checking domain:', error);
  }
}

/**
 * Handle issue link click
 */
async function handleIssueClick(event) {
  event.preventDefault();
  
  const issueKey = event.target.getAttribute('data-issue-key');
  
  if (!issueKey) {
    return;
  }
  
  try {
    // Get Jira tab to extract base URL
    let tab;
    if (isTabMode()) {
      // In tab mode, find any Jira tab
      const jiraTabs = await chrome.tabs.query({ url: 'https://*.atlassian.net/*' });
      if (jiraTabs.length === 0) {
        showError('Cannot open issue: Jira tab not found');
        return;
      }
      tab = jiraTabs[0];
    } else {
      // In popup mode, use the active tab
      [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    }
    
    if (!tab || !tab.url || !tab.url.includes('atlassian.net')) {
      showError('Cannot open issue: Jira tab not found');
      return;
    }
    
    // Extract Jira base URL
    const url = new URL(tab.url);
    const jiraBaseUrl = `${url.protocol}//${url.host}`;
    
    // Open issue in new tab
    const issueUrl = `${jiraBaseUrl}/browse/${issueKey}`;
    chrome.tabs.create({ url: issueUrl });
  } catch (error) {
    console.error('Error opening issue:', error);
    showError('Failed to open issue');
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
  element.classList.add('hidden');
}

/**
 * Jira API Service
 * Handles all communication with the Jira REST API
 */

const JiraAPI = {
  // Shared state
  cachedUser: null,
  cachedBaseUrl: null,

  /**
   * Helper to get Jira Base URL from active tab or any Jira tab in tab mode
   */
  async getBaseUrl() {
    if (this.cachedBaseUrl) return this.cachedBaseUrl;

    let tab;
    // Try to find an active Jira tab first
    const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (activeTabs.length > 0 && activeTabs[0].url && activeTabs[0].url.includes('atlassian.net')) {
      tab = activeTabs[0];
    } else {
      // If active tab is not Jira, look for any Jira tab
      const jiraTabs = await chrome.tabs.query({ url: 'https://*.atlassian.net/*' });
      if (jiraTabs.length > 0) {
        tab = jiraTabs[0];
      }
    }

    if (!tab) {
      throw new Error('Open Jira in a tab before using this extension');
    }

    const url = new URL(tab.url);
    this.cachedBaseUrl = `${url.protocol}//${url.host}`;
    return this.cachedBaseUrl;
  },

  /**
   * Get current user information
   */
  async getCurrentUser() {
    if (this.cachedUser) return this.cachedUser;

    const baseUrl = await this.getBaseUrl();
    const response = await fetch(`${baseUrl}/rest/api/3/myself`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch current user information');
    }
    
    this.cachedUser = await response.json();
    return this.cachedUser;
  },

  /**
   * Fetch worklogs from Jira API for a date range
   */
  async fetchWorklogs(startDate, endDate) {
    const baseUrl = await this.getBaseUrl();
    const currentUser = await this.getCurrentUser();
    
    // Build JQL query
    const jql = `worklogDate >= ${startDate} AND worklogDate <= ${endDate} AND worklogAuthor = currentUser()`;
    
    // Fetch all issues with pagination
    const allIssues = [];
    let nextPageToken = null;
    const maxResults = 100;
    
    do {
      const requestBody = {
        jql: jql,
        fields: ['summary', 'key'],
        maxResults: maxResults
      };
      
      if (nextPageToken) {
        requestBody.nextPageToken = nextPageToken;
      }
      
      const response = await fetch(`${baseUrl}/rest/api/3/search/jql`, {
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
      
      nextPageToken = data.nextPageToken || null;
    } while (nextPageToken);
    
    // Fetch worklogs for each issue separately
    const allWorklogs = [];
    for (const issue of allIssues) {
      const issueWorklogs = await this.fetchIssueWorklogs(issue.key, startDate, endDate, currentUser);
      
      for (const worklog of issueWorklogs) {
        allWorklogs.push({
          key: issue.key,
          summary: issue.fields.summary,
          date: new Date(worklog.started).toISOString().slice(0, 10),
          started: worklog.started,
          timeSpentSeconds: worklog.timeSpentSeconds || 0,
          comment: worklog.comment
        });
      }
    }
    
    return allWorklogs;
  },

  /**
   * Fetch all worklogs for a specific issue
   */
  async fetchIssueWorklogs(issueKey, startDate, endDate, currentUser) {
    const baseUrl = await this.getBaseUrl();
    const startTimestamp = new Date(startDate).getTime();
    const endTimestamp = new Date(endDate).getTime() + (24 * 60 * 60 * 1000) - 1; // End of day
    
    const allWorklogs = [];
    let startAt = 0;
    const maxResults = 100;
    let total = 0;
    
    do {
      const response = await fetch(
        `${baseUrl}/rest/api/3/issue/${issueKey}/worklog?startAt=${startAt}&maxResults=${maxResults}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          },
          credentials: 'include'
        }
      );
      
      if (!response.ok) {
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
  },

  /**
   * Fetch assigned tasks
   */
  async fetchAssignedTasks() {
    const baseUrl = await this.getBaseUrl();
    
    const jql = `assignee = currentUser() ORDER BY updated DESC`;
    const requestBody = {
      jql: jql,
      fields: ['summary', 'status', 'updated'],
      maxResults: 50
    };

    const response = await fetch(`${baseUrl}/rest/api/3/search/jql`, {
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
      throw new Error(`Failed to fetch assigned tasks: ${response.statusText}`);
    }

    const data = await response.json();
    return data.issues || [];
  },

  /**
   * Add a time entry to Jira
   */
  async addTimeEntry(issueKey, timeSpentStr, startedDateStr, commentStr) {
    const baseUrl = await this.getBaseUrl();
    
    // Jira expects ISO format like "2023-11-09T09:00:00.000+0000"
    let started;
    try {
      const d = new Date(startedDateStr);
      
      // Format timezone offset to +HHMM or -HHMM
      const tzo = -d.getTimezoneOffset();
      const dif = tzo >= 0 ? '+' : '-';
      
      const pad = (num) => {
        return (num < 10 ? '0' : '') + num;
      };
      
      const offsetStr = dif + pad(Math.floor(Math.abs(tzo) / 60)) + pad(Math.abs(tzo) % 60);
      
      // Format YYYY-MM-DDThh:mm:ss.000+0000
      started = d.getFullYear() +
        '-' + pad(d.getMonth() + 1) +
        '-' + pad(d.getDate()) +
        'T' + pad(d.getHours()) +
        ':' + pad(d.getMinutes()) +
        ':' + pad(d.getSeconds()) +
        '.000' + offsetStr;
    } catch (e) {
      throw new Error("Invalid start time format");
    }

    const bodyArgs = {
      timeSpent: timeSpentStr,
      started: started
    };
    
    // Modern Jira APIs typically prefer ADF (Atlassian Document Format) for comments
    if (commentStr) {
      bodyArgs.comment = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                text: commentStr,
                type: 'text'
              }
            ]
          }
        ]
      };
    }
    
    const response = await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}/worklog`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(bodyArgs)
    });
    
    if (!response.ok) {
      let errorMsg = response.statusText;
      try {
          const errorData = await response.json();
          if (errorData.errorMessages && errorData.errorMessages.length > 0) {
              errorMsg = errorData.errorMessages.join(", ");
          }
      } catch(e) {}
      throw new Error(errorMsg || `Failed to add time entry to ${issueKey}`);
    }
    
    return true;
  },

  /**
   * Fetch total seconds logged today (lightweight check for notifications)
   * Returns { totalSeconds: number, formatted: string } or null if unable to fetch
   */
  async fetchTodayTotalSeconds() {
    try {
      const baseUrl = await this.getBaseUrl();
      const currentUser = await this.getCurrentUser();
      
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      
      const worklogs = await this.fetchWorklogs(todayStr, todayStr);
      
      let totalSeconds = 0;
      for (const worklog of worklogs) {
        totalSeconds += worklog.timeSpentSeconds;
      }
      
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const formatted = `${hours}h ${minutes}m`;
      
      return { totalSeconds, formatted };
    } catch (error) {
      return null;
    }
  }
};

// Expose to global scope for popup.js to use
window.JiraAPI = JiraAPI;


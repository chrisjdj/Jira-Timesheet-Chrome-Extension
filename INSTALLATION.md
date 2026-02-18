# Installation Guide

## Prerequisites

- Google Chrome browser
- Access to a Jira Cloud instance (e.g., `yourcompany.atlassian.net`)
- Active Jira account with worklog permissions

## Step-by-Step Installation

### Step 1: Load the Extension in Chrome

The extension icon is already included, so you can load it directly:

1. Open Chrome browser
2. Navigate to `chrome://extensions/`
3. Enable **Developer mode** using the toggle in the top-right corner
4. Click the **Load unpacked** button
5. Browse to and select the `jira-timesheet-dashboard` folder
6. Click **Select Folder**

### Step 2: Verify Installation

You should see:
- "Jira Timesheet Dashboard" in your extensions list
- Version 1.1.0
- Status: Enabled
- No errors displayed

### Step 3: Pin the Extension (Optional but Recommended)

1. Click the puzzle piece icon (Extensions) in Chrome toolbar
2. Find "Jira Timesheet Dashboard" in the list
3. Click the pin icon next to it
4. The extension icon will now appear in your toolbar

## First Use

### 1. Open Jira
- Navigate to your Jira Cloud instance
- Make sure you're logged in
- Example: `https://yourcompany.atlassian.net`

### 2. Open the Extension
- Click the extension icon in your Chrome toolbar
- The popup should open showing the timesheet interface

### 3. Load Your Worklogs
- Select a date range (default is "Today")
- Click the "Load" button
- Your worklogs will appear in the table

## Troubleshooting Installation

### Extension Won't Load

**Error: "Manifest file is missing or unreadable"**
- Solution: Ensure `manifest.json` exists and is valid JSON
- Check that all files are in the correct locations

**Error: "Could not load icon"**
- Solution: Verify `icons/icon.png` exists in the extension folder
- Re-download the extension if the icon file is missing

### Extension Loads but Shows Errors

**"Open Jira in a tab before using this extension"**
- Solution: Open a Jira Cloud tab first
- The extension needs an active Jira session

**"Not authenticated. Please log in to Jira."**
- Solution: Log in to your Jira instance
- Refresh the Jira page and try again

### No Worklogs Showing

**Possible causes:**
1. No time logged in the selected date range
   - Try selecting "This Month" for a broader range
2. Wrong Jira account
   - Verify you're logged into the correct account
3. Worklog permissions
   - Ensure your account has permission to view worklogs

## Updating the Extension

After making code changes:

1. Go to `chrome://extensions/`
2. Find "Jira Timesheet Dashboard"
3. Click the refresh icon (circular arrow)
4. Test your changes

## Uninstalling

1. Go to `chrome://extensions/`
2. Find "Jira Timesheet Dashboard"
3. Click "Remove"
4. Confirm removal

## Security Notes

- The extension only accesses `*.atlassian.net` domains
- Uses your existing Jira session (no passwords stored)
- All data processing happens locally in your browser
- No data is sent to external servers

## Next Steps

Once installed, check out:
- `README.md` for usage instructions
- `TESTING.md` for testing checklist
- Chrome DevTools (right-click popup → Inspect) for debugging

---

**Need Help?** Check the Troubleshooting section in README.md

# Jira Timesheet Dashboard - Chrome Extension

A Chrome Extension that displays your logged work hours in Jira Cloud with customizable date ranges.

## Features

- ✅ View time logged Today, This Week, This Month, or Custom Date Range
- ✅ See total time per issue and overall total
- ✅ Per-day breakdown view with date grouping
- ✅ Dashboard sorted by chronological order with start times
- ✅ **Work Timers**: Start/stop multiple timers for issues with custom time picking
- ✅ **Assigned Tasks View**: See all tasks assigned to you with status filtering and search
- ✅ **Enter Time**: Log work directly to Jira issues with date/time selection
- ✅ **Settings**: Configure daily reminders, target hours, alert times, and working days
- ✅ **Daily Reminders**: Get notified when you haven't met your daily time target
- ✅ **Morning Reminders**: Start your day with a friendly reminder
- ✅ **Warning Banner**: Visual alert when logged time is below target
- ✅ **Theme Support**: Toggle between Light and Dark modes
- ✅ Clickable issue links - open issues directly in Jira (supports middle-click for new tab)
- ✅ Remembers your active tab state across refreshes
- ✅ Uses existing Jira session (no API token required)
- ✅ Clean, responsive UI with loading states and `dd/mm/yyyy` formatted dates
- ✅ Open in popup or full tab mode
- ✅ Keyboard shortcut support (Ctrl+Shift+J / Cmd+Shift+J)
- ✅ Production-ready and modular code

## Installation

### 1. Prepare the Extension

1. Download or clone this repository
2. The extension icon is already included at `icons/icon.png`

### 2. Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `jira-timesheet-dashboard` folder
5. The extension should now appear in your extensions list

### 3. Pin the Extension (Optional)

1. Click the puzzle icon in Chrome toolbar
2. Find "Jira Timesheet Dashboard"
3. Click the pin icon to keep it visible

## Usage

### Popup Mode

1. **Open Jira Cloud** in a browser tab (e.g., `yourcompany.atlassian.net`)
2. **Click the extension icon** in your Chrome toolbar
3. **Select a date range**:
   - Today
   - This Week (Monday to Today)
   - This Month (1st to Today)
   - Custom Range (select start and end dates)
4. **Click "Load"** to fetch your worklogs
5. **View results**:
   - Total time logged
   - Time per issue with issue key and summary
   - Per-day breakdown showing when work was logged
   - Click any issue to open it in Jira

### Tab Mode

Open the extension in a full browser tab for more space:

1. **Click the ⇱ button** in the top-right of the popup, OR
2. **Use keyboard shortcut**: 
   - Windows/Linux: `Ctrl+Shift+J`
   - Mac: `Cmd+Shift+J`
3. The extension opens in a new tab with full-screen layout

### Timers Tab

Track time spent on tasks with built-in stopwatches:

1. **Select a task** from the dropdown (populated from your assigned tasks)
2. **Set start time** (defaults to current time, or pick a custom time)
3. **Click "Add Timer"** to create the timer (starts automatically)
4. **Start/Stop** - Click ▶/⏸ to control the timer
5. **Add comments** - Track what you're working on
6. **Send to Entry** - When done, send all timer data to the Enter Time tab

### Enter Time Tab

Log work directly to Jira issues:

1. **Add rows** for each time entry
2. **Select a task** from your assigned tasks
3. **Pick date and time** using the date picker and time selector
4. **Enter time spent** (e.g., "1h 30m" or "45m")
5. **Add comments** (optional)
6. **Submit All** - Logs all entries to Jira

### Settings Tab

Configure reminders and daily targets:

1. **Daily Target**: Set your target hours/minutes (default: 6h 30m)
2. **Reminder Times**: Add times to get reminded (e.g., 5:00 PM, 5:30 PM)
3. **Persistent Notifications**: Keep reminder on screen until dismissed
4. **Snooze Duration**: Set how long to wait before reminding again
5. **Working Days**: Choose which days to receive reminders
6. **Morning Reminder**: Get a friendly reminder to start logging
7. **Save Settings** - Changes take effect immediately

### Theme Toggle

Switch between light and dark modes:

- Click the theme icon in the top-right of the popup
- Theme preference is saved and persists across sessions

## File Structure

```
jira-timesheet-dashboard/
├── manifest.json          # Extension configuration (Manifest V3)
├── popup.html            # Popup UI structure
├── popup.js              # Main logic and UI controllers
├── jiraAPI.js            # Jira REST API service layer
├── styles.css            # Styling (Light/Dark mode support)
├── background.js         # Service worker for alarms and notifications
├── icons/
│   └── icon.png         # Extension icon
├── create-icon.html      # Icon generator tool
└── README.md            # This file
```

## Technical Details

### Permissions

- `activeTab`: Access current tab information
- `storage`: Store user preferences
- `scripting`: Execute scripts if needed
- `host_permissions`: Access to `https://*.atlassian.net/*`

### API Integration

- **Endpoint**: `POST /rest/api/3/search`
- **Authentication**: Uses existing Jira session cookies
- **JQL Query**: `worklogDate >= START_DATE AND worklogDate <= END_DATE AND worklogAuthor = currentUser()`
- **Pagination**: Handles results > 100 automatically

### Data Processing

1. Fetches all issues matching the JQL query
2. Filters worklogs within the selected date range
3. Sums `timeSpentSeconds` per issue
4. Converts seconds to "Xh Ym" format
5. Displays results in a sortable table

## Troubleshooting

### "Open Jira in a tab before using this extension"

- Make sure you have a Jira Cloud tab open (`*.atlassian.net`)
- The extension needs an active Jira session to work

### "Not authenticated. Please log in to Jira."

- You're not logged into Jira
- Open Jira and log in, then try again

### No worklogs showing

- Verify you have logged time in the selected date range
- Check that you're using the correct Jira account
- Try a broader date range (e.g., "This Month")

### Extension not loading

- Ensure all files are in the correct locations
- Check Chrome DevTools console for errors (right-click extension popup → Inspect)
- Verify `manifest.json` is valid JSON

## Future Enhancements

The code is structured to support:

- CSV Export functionality
- Charts and visualizations
- Group by Project
- Dark mode theme
- Saved filter preferences
- Configurable week start day (currently Monday)
- Time range comparison view

## Development

### Debugging

1. Right-click the extension popup
2. Select "Inspect"
3. Use Chrome DevTools to debug

### Modifying the Code

- **UI changes**: Edit `popup.html` and `styles.css`
- **Logic changes**: Edit `popup.js`
- **Background tasks**: Edit `background.js`
- **Permissions**: Edit `manifest.json`

After making changes, click the refresh icon on the extension card in `chrome://extensions/`

## License

This project is licensed under the **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License**.

You are free to use, modify, and share this project for **non-commercial purposes** with appropriate credit. Commercial use is not permitted. See the [LICENSE](./LICENSE) file for details.


## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Review Chrome DevTools console for errors
3. Verify your Jira permissions allow worklog access


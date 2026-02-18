# Quick Reference Guide

## Common Tasks

### View Today's Worklogs
1. Click extension icon
2. Ensure "Today" is selected
3. Click "Load"

### View This Week's Worklogs
1. Click extension icon
2. Select "This Week" from dropdown
3. Click "Load"

### View Custom Date Range
1. Click extension icon
2. Select "Custom Range" from dropdown
3. Choose start date
4. Choose end date
5. Click "Load"

## Keyboard Shortcuts

- `Tab` - Navigate between fields
- `Enter` - Submit (when Load button is focused)
- `Escape` - Close popup
- `Ctrl+Shift+J` (Windows/Linux) or `Cmd+Shift+J` (Mac) - Open in tab mode

## Date Range Options

| Option | Start Date | End Date |
|--------|-----------|----------|
| Today | Today | Today |
| This Week | Sunday | Today |
| This Month | 1st of month | Today |
| Custom Range | Your choice | Your choice |

## Time Format

Time is displayed as: `Xh Ym`

Examples:
- `2h 30m` = 2 hours 30 minutes
- `0h 45m` = 45 minutes
- `8h 0m` = 8 hours exactly

## Error Messages

| Message | Meaning | Solution |
|---------|---------|----------|
| "Open Jira in a tab before using this extension" | Not on Jira domain | Open Jira Cloud tab |
| "Not authenticated. Please log in to Jira." | Not logged in | Log in to Jira |
| "Start date must be before or equal to end date" | Invalid date range | Fix date selection |
| "Failed to fetch worklogs" | API error | Check connection, try again |
| "No worklogs found for selected range" | No data | Try broader date range |

## Tips & Tricks

### Maximize Efficiency
- Pin the extension to toolbar for quick access
- Use "This Week" for weekly reviews
- Use "This Month" for monthly reports
- Custom range for specific project periods

### Troubleshooting Quick Fixes
1. **Extension not working?**
   - Refresh Jira page
   - Reload extension in chrome://extensions/
   
2. **Wrong data showing?**
   - Verify you're logged into correct Jira account
   - Check date range selection
   
3. **Slow loading?**
   - Large date ranges take longer
   - Many issues (>100) require pagination

### Data Accuracy
- Times are pulled directly from Jira API
- Only YOUR worklogs are shown (currentUser())
- Worklogs are filtered by date range
- Totals are calculated from filtered results
- Per-day breakdown shows work grouped by date
- Click any issue to open it directly in Jira

## File Locations

```
jira-timesheet-dashboard/
├── manifest.json       # Extension config
├── popup.html         # UI structure
├── popup.js           # Main logic
├── styles.css         # Styling
├── background.js      # Service worker
└── icons/icon.png     # Extension icon
```

## API Details

**Endpoint:** `POST /rest/api/3/search`

**JQL Query:**
```
worklogDate >= START_DATE AND worklogDate <= END_DATE AND worklogAuthor = currentUser()
```

**Fields Requested:**
- `summary` - Issue title
- `worklog` - Worklog entries

**Max Results:** 100 per request (auto-paginated)

## Permissions Explained

- **activeTab** - Know which tab is active
- **storage** - Save preferences (future use)
- **scripting** - Run scripts if needed
- **host_permissions** - Access Jira API

## Browser Support

✅ Chrome (primary)  
✅ Edge (Chromium-based)  
❌ Firefox (different extension format)  
❌ Safari (different extension format)

## Performance

- **Load time:** <1 second for UI
- **API calls:** 1-5 seconds depending on data
- **Memory usage:** ~10-20 MB
- **Pagination:** Automatic for >100 issues

## Security

- Uses existing Jira session cookies
- No passwords or tokens stored
- All processing happens locally
- No external server communication
- HTML escaping prevents XSS

## Limitations

- Requires active Jira Cloud session
- Week starts on Sunday (not configurable yet)
- No offline mode
- No CSV export (yet)
- No charts/visualizations (yet)

## Getting Help

1. Check error message in popup
2. Review INSTALLATION.md
3. Check TESTING.md for test cases
4. Inspect popup (right-click → Inspect)
5. Check Chrome console for errors

## Quick Debugging

**Open DevTools:**
1. Right-click extension popup
2. Select "Inspect"
3. Check Console tab for errors

**Common Console Errors:**
- `401 Unauthorized` - Not logged in
- `CORS error` - Not on Jira domain
- `Network error` - Connection issue

## Version Info

**Current Version:** 1.1.0  
**Manifest Version:** 3  
**Minimum Chrome:** 88+

---

**Pro Tip:** Bookmark this page for quick reference!

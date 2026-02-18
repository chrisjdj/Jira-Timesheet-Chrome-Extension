# Tab Mode Guide

The Jira Timesheet Dashboard can now be opened in both popup and full tab modes.

## Opening in Tab Mode

### Method 1: Button Click
1. Click the extension icon to open the popup
2. Click the **⇱** button in the top-right corner of the header
3. Extension opens in a new tab with full-screen layout

### Method 2: Keyboard Shortcut
- **Windows/Linux**: Press `Ctrl+Shift+J`
- **Mac**: Press `Cmd+Shift+J`
- Extension opens directly in a new tab

## Benefits of Tab Mode

- **More Space**: Full viewport height for viewing large worklog lists
- **Better Scrolling**: Easier to navigate through many entries
- **Persistent View**: Tab stays open while you work in other tabs
- **Bookmarkable**: Can bookmark the tab URL for quick access

## Technical Details

### How It Works
- Tab mode uses the same `popup.html` file
- URL parameter `?mode=tab` triggers tab-specific styling
- The "Open in Tab" button is hidden when already in tab mode
- CSS class `tab-mode` is added to body for responsive layout

### URL Format
```
chrome-extension://[extension-id]/popup.html?mode=tab
```

## Customizing Keyboard Shortcut

1. Go to `chrome://extensions/shortcuts`
2. Find "Jira Timesheet Dashboard"
3. Click the pencil icon next to "Open Jira Timesheet in new tab"
4. Press your preferred key combination
5. Click "OK" to save

## Troubleshooting

### Keyboard shortcut not working
- Check if another extension is using the same shortcut
- Go to `chrome://extensions/shortcuts` to verify/change
- Ensure the extension is enabled

### Tab mode looks the same as popup
- Clear browser cache and reload the extension
- Check that `?mode=tab` is in the URL
- Inspect the page and verify `tab-mode` class is on `<body>`

### Button not visible
- The button is hidden when already in tab mode (this is intentional)
- Reload the extension if button is missing in popup mode

## Current Features in Tab Mode

- ✅ Full viewport height for better scrolling
- ✅ Per-day breakdown view with more space
- ✅ Clickable issue links work in tab mode
- ✅ All popup features available

## Future Enhancements

Planned improvements for tab mode:
- [ ] Remember last used mode preference
- [ ] Wider layout option for tab mode
- [ ] Side-by-side comparison views
- [ ] Export functionality in tab mode

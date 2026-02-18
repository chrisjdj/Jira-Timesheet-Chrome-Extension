# Changelog

All notable changes to the Jira Timesheet Dashboard extension will be documented in this file.

## [1.1.0] - February 17, 2026

### New Features
- ✅ **Tab Mode**: Open extension in a full browser tab for more space
- ✅ **Open in Tab Button**: Click ⇱ button in popup to open in new tab
- ✅ **Keyboard Shortcut**: Press Ctrl+Shift+J (Cmd+Shift+J on Mac) to open in tab
- ✅ **Responsive Layout**: Tab mode uses full viewport height for better visibility
- ✅ **Clickable Issue Links**: Click any issue in the results to open it in Jira
- ✅ **Per-Day Breakdown**: View worklogs grouped by date for better tracking

### Technical
- Added `commands` API support in manifest
- Enhanced background service worker with keyboard command handler
- Dynamic layout switching between popup and tab modes
- URL parameter-based mode detection
- Issue click handler with direct Jira navigation
- Date-grouped worklog display with collapsible sections

## [1.0.0] - January 2026

### Initial Release

#### Features
- ✅ View worklogs for Today, This Week, This Month, or Custom Date Range
- ✅ Display total time logged across all issues
- ✅ Show time spent per individual issue
- ✅ Issue key and summary display in table format
- ✅ Automatic pagination for large datasets (>100 issues)
- ✅ Uses existing Jira session (no API token required)
- ✅ Clean, responsive UI with Jira-inspired styling
- ✅ Loading indicators and error handling
- ✅ Date validation and range checking

#### Technical
- Chrome Extension Manifest V3
- Service Worker background script
- Jira REST API v3 integration
- Credentials-based authentication
- Modular JavaScript architecture
- XSS protection with HTML escaping
- Efficient worklog filtering and aggregation

#### UI/UX
- Gradient header with Jira blue theme
- Responsive table with hover effects
- Scrollable results section
- Custom date picker for flexible ranges
- Disabled states during loading
- Clear error messages
- "No results" state handling

#### Permissions
- `activeTab` - Access current tab information
- `storage` - Store user preferences (future use)
- `scripting` - Execute scripts if needed
- `host_permissions` - Access to `*.atlassian.net`

### Known Limitations
- Week start day hardcoded to Sunday
- No CSV export functionality (planned)
- No dark mode (planned)
- Requires active Jira Cloud session

---

## Future Releases

### [1.2.0] - Planned

#### Features
- [ ] CSV export functionality
- [ ] Group by project option
- [ ] Search/filter within results
- [ ] Time range comparison view

#### Enhancements
- [ ] Configurable week start day (Sunday/Monday)
- [ ] Save last selected date range preference
- [ ] Better error messages with recovery suggestions
- [ ] Toggle between summary and per-day views

#### Bug Fixes
- [ ] TBD based on user feedback

### [1.3.0] - Planned

#### Features
- [ ] CSV export functionality
- [ ] Per-day breakdown view
- [ ] Group by project option
- [ ] Search/filter within results

### [2.0.0] - Future

#### Major Features
- [ ] Charts and visualizations
- [ ] Dark mode theme
- [ ] Multiple Jira instance support
- [ ] Offline caching
- [ ] Browser sync for preferences

---

## Version History

| Version | Release Date | Key Features |
|---------|--------------|--------------|
| 1.1.0   | Feb 17, 2026 | Tab mode, keyboard shortcuts, clickable issues, per-day breakdown |
| 1.0.0   | Jan 2026     | Initial release with core functionality |

---

## Upgrade Notes

### From 0.x to 1.0.0
- First stable release
- No migration needed

---

## Contributing

To suggest features or report bugs:
1. Test thoroughly using TESTING.md checklist
2. Document the issue with steps to reproduce
3. Include Chrome version and Jira instance details
4. Check if issue already exists in Known Limitations

---

**Semantic Versioning:** This project follows [SemVer](https://semver.org/)
- MAJOR version for incompatible API changes
- MINOR version for new functionality (backwards compatible)
- PATCH version for backwards compatible bug fixes

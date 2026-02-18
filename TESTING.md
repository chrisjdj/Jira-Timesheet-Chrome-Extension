# Testing Checklist

Use this checklist to verify the extension works correctly.

## Pre-Testing Setup

- [ ] Extension installed in Chrome
- [ ] Extension version 1.1.0 confirmed
- [ ] Icon displays correctly in toolbar
- [ ] Jira Cloud tab open and logged in
- [ ] You have logged time in Jira (for testing)

## Basic Functionality Tests

### 1. Extension Loading
- [ ] Extension icon appears in Chrome toolbar
- [ ] Clicking icon opens popup
- [ ] Popup displays without errors
- [ ] All UI elements are visible and styled correctly

### 2. Date Range Selection

#### Today
- [ ] Select "Today" from dropdown
- [ ] Custom date inputs are hidden
- [ ] Click "Load" button
- [ ] Results show only today's worklogs

#### This Week
- [ ] Select "This Week" from dropdown
- [ ] Custom date inputs are hidden
- [ ] Click "Load" button
- [ ] Results show worklogs from Sunday (or Monday) to today

#### This Month
- [ ] Select "This Month" from dropdown
- [ ] Custom date inputs are hidden
- [ ] Click "Load" button
- [ ] Results show worklogs from 1st of month to today

#### Custom Range
- [ ] Select "Custom Range" from dropdown
- [ ] Custom date inputs appear
- [ ] Select start date
- [ ] Select end date
- [ ] Click "Load" button
- [ ] Results show worklogs within selected range

### 3. Data Display

#### With Worklogs
- [ ] Total time displays correctly (format: "Xh Ym")
- [ ] Table shows all issues with logged time
- [ ] Issue keys are displayed and clickable
- [ ] Issue summaries are displayed
- [ ] Time spent per issue is correct
- [ ] Per-day breakdown shows dates correctly
- [ ] Clicking an issue opens it in Jira
- [ ] Table is scrollable if many results

#### Without Worklogs
- [ ] "No worklogs found for selected range" message appears
- [ ] No table is displayed
- [ ] Total time shows "0h 0m"

### 4. Loading States
- [ ] Loading indicator appears when fetching data
- [ ] "Load" button is disabled during fetch
- [ ] Loading indicator disappears when data loads
- [ ] "Load" button re-enables after fetch

### 5. Error Handling

#### Not on Jira Domain
- [ ] Open extension on non-Jira tab
- [ ] Error message: "Open Jira in a tab before using this extension"
- [ ] Load button is disabled

#### Not Authenticated
- [ ] Log out of Jira
- [ ] Try to load worklogs
- [ ] Error message: "Not authenticated. Please log in to Jira."

#### Invalid Date Range
- [ ] Select custom range
- [ ] Set end date before start date
- [ ] Click "Load"
- [ ] Error message: "Start date must be before or equal to end date"

### 6. Data Accuracy

#### Time Calculation
- [ ] Manually verify total time matches Jira
- [ ] Check individual issue times are correct
- [ ] Verify time format (hours and minutes)

#### Date Filtering
- [ ] Log time on specific dates in Jira
- [ ] Use custom range to filter those dates
- [ ] Verify only worklogs in range appear

#### Multiple Issues
- [ ] Log time on multiple issues
- [ ] Verify all issues appear in results
- [ ] Verify no duplicate entries

### 7. Pagination (if you have >100 issues)
- [ ] Load a date range with >100 issues
- [ ] Verify all issues are loaded
- [ ] Check that no issues are missing

### 8. UI/UX

#### Styling
- [ ] Colors match Jira theme (blue accents)
- [ ] Text is readable
- [ ] Buttons have hover effects
- [ ] Table rows highlight on hover

#### Responsiveness
- [ ] Popup width is appropriate (600px)
- [ ] Content doesn't overflow horizontally
- [ ] Scrolling works smoothly
- [ ] All elements are properly aligned

#### Accessibility
- [ ] Tab navigation works
- [ ] Labels are associated with inputs
- [ ] Buttons are keyboard accessible
- [ ] Focus states are visible

## Edge Cases

### Large Datasets
- [ ] Test with 50+ issues
- [ ] Verify performance is acceptable
- [ ] Check scrolling works smoothly

### Special Characters
- [ ] Test with issue summaries containing special characters
- [ ] Verify HTML is escaped (no XSS)

### Time Formats
- [ ] Test with 0 minutes (e.g., "2h 0m")
- [ ] Test with 0 hours (e.g., "0h 30m")
- [ ] Test with large values (e.g., "100h 45m")

### Date Boundaries
- [ ] Test on first day of month
- [ ] Test on last day of month
- [ ] Test on first day of week
- [ ] Test across month boundaries

## Browser Compatibility

- [ ] Test in Chrome (primary)
- [ ] Test in Edge (Chromium-based, should work)
- [ ] Verify Manifest V3 compatibility

## Performance Tests

- [ ] Extension loads in <1 second
- [ ] API calls complete in reasonable time
- [ ] No memory leaks (check Chrome Task Manager)
- [ ] No console errors

## Security Tests

- [ ] Verify credentials: include is used
- [ ] Check that no sensitive data is logged
- [ ] Verify HTML escaping prevents XSS
- [ ] Confirm only Jira domains are accessed

## Regression Tests (After Changes)

After modifying code, re-test:
- [ ] Basic loading functionality
- [ ] Date range selection
- [ ] Data display accuracy
- [ ] Error handling
- [ ] No new console errors

## Known Limitations

Document any known issues:
- Pagination may be slow with 1000+ issues
- Week start day is hardcoded to Sunday
- No offline support
- Requires active Jira session

## Test Results

**Date Tested:** _______________  
**Chrome Version:** _______________  
**Jira Instance:** _______________  
**Tester:** _______________

**Overall Status:** ☐ Pass ☐ Fail ☐ Needs Work

**Notes:**
_______________________________________
_______________________________________
_______________________________________

---

**Testing Complete!** If all tests pass, the extension is ready for use.

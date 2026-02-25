# HRMS-UI Testing Checklist

## Overview
This checklist validates that the memory leak fixes and error handling improvements work correctly in the running application.

**Dev Server Status**: ✅ Running at http://localhost:4200

## Memory Leak Testing

### 1. Component Initialization & Cleanup
- [ ] Navigate between different pages (Dashboard → Employees → Leave Request → etc.)
- [ ] Verify no console errors appear
- [ ] Open Chrome DevTools → Console tab to check for unhandled errors
- [ ] Verify "Page reload sent to client(s)" messages indicate successful reloads

### 2. Subscription Cleanup
- [ ] Open Chrome DevTools → Memory tab
- [ ] Take a heap snapshot (Record allocation timeline)
- [ ] Navigate between 10+ different components/routes
- [ ] Return to initial component
- [ ] Take another heap snapshot
- [ ] Verify memory usage stabilizes (not continuously growing)
- [ ] Check that garbage collection is removing old component data

### 3. DevTools Network Tab
- [ ] Verify no failed HTTP requests
- [ ] Check response status codes are 200, 201, etc. (not 5xx errors)
- [ ] Monitor for repeated requests to same endpoint

## Error Handling Testing

### Login & Authentication
- [ ] Log out and attempt login with invalid credentials
- [ ] Verify toast error message appears
- [ ] Check browser console for error details
- [ ] Log in with valid credentials

### Employee Management Flow
- [ ] Navigate to Employees/Employee List
- [ ] **Add Employee**:
  - [ ] Try submitting form with missing required fields
  - [ ] Verify validation messages appear
  - [ ] Fill all fields and submit
  - [ ] Verify success toast message
  - [ ] Check employee appears in list
- [ ] **View Employee Details**:
  - [ ] Click on an employee
  - [ ] Verify all sections load (Personal, Contracts, Documents)
  - [ ] Check for any console errors during load
- [ ] **Edit Employee**:
  - [ ] Click edit button
  - [ ] Make changes and save
  - [ ] Verify success toast
  - [ ] Verify changes persist after page reload

### Leave Management
- [ ] Navigate to Leave Request
- [ ] **Submit Leave Request**:
  - [ ] Try submitting with invalid dates (end before start)
  - [ ] Verify error message
  - [ ] Submit valid request
  - [ ] Verify success message
  - [ ] Check request appears in history
- [ ] Navigate to Leave Approval (admin only)
  - [ ] Verify pending requests load
  - [ ] **Approve a request**:
    - [ ] Click approve
    - [ ] Verify success message
    - [ ] Verify request status changes to "Approved"
  - [ ] **Reject a request**:
    - [ ] Click reject
    - [ ] Add rejection reason
    - [ ] Verify success message
    - [ ] Verify request status changes to "Rejected"

### Attendance Management
- [ ] Navigate to Attendance
- [ ] **Check In**:
  - [ ] Click check-in button
  - [ ] Verify success toast appears
  - [ ] Verify check-in time displays
- [ ] **Check Out**:
  - [ ] Click check-out button
  - [ ] Verify success toast appears
  - [ ] Verify daily hours calculated
- [ ] **View Attendance Records**:
  - [ ] Verify records load without errors
  - [ ] Check daily summary displays correctly

### Payroll Management
- [ ] Navigate to Payroll
- [ ] **Generate Payroll**:
  - [ ] Try calculating with missing data
  - [ ] Verify appropriate error messages
  - [ ] Complete calculation
  - [ ] Verify success message
  - [ ] Check payroll data displays

### Department Management
- [ ] Navigate to Departments
- [ ] **Create Department**:
  - [ ] Fill form and submit
  - [ ] Verify success message
  - [ ] Verify department appears in list
- [ ] **Edit Department**:
  - [ ] Click edit
  - [ ] Make changes
  - [ ] Verify success message
- [ ] **Delete Department**:
  - [ ] Click delete with confirm
  - [ ] Verify success message
  - [ ] Verify department removed from list

### Positions Management
- [ ] Navigate to Positions
- [ ] Test CRUD operations (Create, Read, Update, Delete)
- [ ] Verify all operations show proper messages

### User Management (Admin Only)
- [ ] Navigate to User Management
- [ ] **Verify users load**:
  - [ ] Check table displays all users
  - [ ] Test pagination if available
- [ ] **Update User Roles**:
  - [ ] Click on a user
  - [ ] Toggle role checkboxes
  - [ ] Save changes
  - [ ] Verify success message
  - [ ] Verify roles persist

## Error Scenario Testing

### Network Errors
- [ ] Open Chrome DevTools → Network tab
- [ ] Set throttling to "Offline"
- [ ] Try to load any page
- [ ] Verify error toast appears
- [ ] Restore connection
- [ ] Verify automatic retry or manual retry option

### Timeout Handling
- [ ] Use Chrome DevTools to simulate slow network (3G)
- [ ] Perform a data-intensive operation
- [ ] Monitor for timeout error messages

### Invalid Data Handling
- [ ] Try operations with malformed input
- [ ] Verify user-friendly error messages (not raw API errors)
- [ ] Check console for proper error logging

## Performance Testing

### Initial Load
- [ ] Measure time to first meaningful paint
- [ ] Check initial bundle size: ~1.03 MB (main.js)
- [ ] Verify all assets load

### Route Navigation
- [ ] Time page transitions
- [ ] Verify no memory spikes during navigation
- [ ] Confirm smooth transitions without flicker

### Long Session Testing
- [ ] Keep application open for 10+ minutes
- [ ] Periodically navigate between pages
- [ ] Monitor memory usage in DevTools
- [ ] Verify no memory growth over time

## Console & Logs Validation

### Browser Console
- [ ] ✅ No "Cannot read property ngOnDestroy" errors
- [ ] ✅ No "Cannot set property destroy$" errors
- [ ] ✅ No unhandled Promise rejections
- [ ] ✅ No "Subscription not unsubscribed" warnings

### Application Logs
- [ ] Check LoggerService captures errors correctly
- [ ] Verify error messages appear in console
- [ ] Confirm successful operations are logged

## Toast Messages Validation

### Success Messages
- [ ] `"Created"` - when creating records
- [ ] `"Updated"` - when updating records
- [ ] `"Deleted"` - when deleting records
- [ ] `"Submitted"` - when submitting forms

### Error Messages
- [ ] `"Load Error"` - when data fails to load
- [ ] `"Submission Failed"` - when form submission fails
- [ ] `"Delete Failed"` - when delete operation fails
- [ ] Server error messages with `.error?.message`

### Warning Messages
- [ ] `"Validation Error"` - when validation fails
- [ ] `"Invalid Date"` - when date validation fails

## Regression Testing

### Previously Working Features
- [ ] **Dashboard**: Data loads, widgets display
- [ ] **Employee Directory**: Search, filter, pagination work
- [ ] **Organization Chart**: Displays hierarchy correctly
- [ ] **Task List**: Tasks load and can be managed
- [ ] **News/Documents**: Content displays properly
- [ ] **Recruitment**: Pipeline displays correctly

## Checklist Summary

**Total Tests**: ~40 manual test scenarios
**Pass Criteria**: All tests pass without unhandled errors

---

## Test Execution Notes

**Date Tested**: _______________
**Tester Name**: _______________
**Build Version**: Angular 17 + Memory Leak Fixes
**Environment**: Development (ng serve)

### Issues Found
- [ ] None
- [ ] See details below:

**Issue Details**:
```
[List any issues found during testing]
```

### Conclusion
- [ ] ✅ All tests passed - Ready for production
- [ ] ⚠️ Minor issues found - Review and fix before deployment
- [ ] ❌ Critical issues found - Do not deploy

---

## Post-Deployment Monitoring

After deployment, monitor:
1. Error logs for unhandled subscriptions
2. Memory usage trends
3. User-reported errors
4. Performance metrics
5. Browser console errors in production

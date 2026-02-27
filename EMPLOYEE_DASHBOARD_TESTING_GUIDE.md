# Employee Dashboard Testing Guide

## Quick Test Procedure (5 minutes)

### Prerequisites
- Employee should be logged in with CORPORATE_EMPLOYEE role
- Employee should have a route assigned by their manager
- Backend API server running on `localhost:5000`
- Frontend running on `localhost:5173`

---

## Step-by-Step Testing

### 1. Login and Navigate to Dashboard
```
1. Login as CORPORATE_EMPLOYEE
2. Navigate to Employee Dashboard
3. Should see "Welcome, [Employee Name]"
4. Should see tabs: Trip Info, My Bookings, History, Notifications, Rate & Feedback, Route Change
```

### 2. Test Trip Info Tab (Most Critical)
```
1. Click on "Trip Info" tab
2. Should display "Your Assigned Route" card
3. MUST see these fields populated:
   ✓ Route: Nagda → Ujjain (or your assigned route)
   ✓ Vehicle: Make and Model (e.g., "Toyota Innova")
   ✓ License Plate: Vehicle registration number
   ✓ Driver: Driver's full name
   ✓ Pickup Stop: Actual pickup location
   ✓ Dropoff Stop: Actual dropoff location
   ✓ Shift Type: Full Day / Half Day
   ✓ Stop Points: List of all stops with times

EXPECTED FIX:
- Vehicle field now shows actual vehicle details (was "Not assigned")
- Driver field shows actual driver name (was "Not assigned")
- Pickup/Dropoff stops show actual locations (was "Not assigned")
- Stop Points section displays all intermediate stops
```

### 3. Test My Bookings Tab
```
1. Click "My Bookings" tab
2. If bookings exist:
   ✓ Should display list of bookings
   ✓ Each booking shows: Route, Date/Time, Status, Cancel button
   ✓ Should NOT show ".map is not a function" error
3. If no bookings exist:
   ✓ Should show "No bookings yet" message
   ✓ Should NOT crash or show errors
```

### 4. Test History Tab
```
1. Click "History" tab
2. If travel history exists:
   ✓ Should display list of past trips
   ✓ Each trip shows: Date, Route, Status, Rate button
   ✓ Should NOT show ".map is not a function" error
3. If no history exists:
   ✓ Should show "No travel history" message
   ✓ Should NOT crash or show errors

TEST RATING FEATURE:
1. Find a COMPLETED trip
2. Click "Rate Trip" button
3. Select star rating (1-5)
4. Add feedback comment
5. Click "Submit"
6. Should show success message
```

### 5. Test Trip Booking Component
```
1. Navigate to Trip Booking (if accessible in navigation)
2. Click "Available Trips" tab
3. MUST see trips displayed (not "No available trips found")
4. Each trip should show:
   ✓ Route information
   ✓ Date and time
   ✓ Vehicle and driver info
   ✓ Available seats
   ✓ Stop points
5. Click "Book Seat" button for any trip
6. Modal should appear with:
   ✓ Trip summary
   ✓ Pickup point dropdown
   ✓ Seat number input
   ✓ Monthly pass checkbox
7. Fill form and click "Book Seat"

EXPECTED FIX:
- Previously got "400 Bad Request - Route ID and date are required"
- Should now successfully load available trips
```

### 6. Test My Bookings in Trip Booking
```
1. In Trip Booking component, click "My Bookings" tab
2. Should display any booked trips
3. Can cancel bookings if status is SCHEDULED
```

### 7. Test Monthly Pass Tab
```
1. In Trip Booking component, click "Monthly Pass" tab
2. If passes exist:
   ✓ Should display all active passes
   ✓ Shows valid dates, trip usage, remaining trips
3. If no passes:
   ✓ Should show "No monthly passes found"
   ✓ Should NOT show "404 Not Found" error

EXPECTED FIX:
- Previously got "404 Not Found - Cannot GET /api/monthly-pass/user/"
- Should now work without errors
```

### 8. Test Notifications Tab
```
1. Click "Notifications" tab
2. Should display any notifications for the employee
3. Shows notification title, message, and time
```

---

## Error Checklist - These Should NOT Appear

### ❌ ERRORS THAT SHOULD BE FIXED:

```
BEFORE FIX:
1. "GET http://localhost:5000/api/b2c-trips/trips/available 400 (Bad Request)"
   → Message: "Route ID and date are required"
   ✓ FIXED: Now passes routeId and date as query parameters

2. "GET http://localhost:5000/api/monthly-pass/user/ 404 (Not Found)"
   → Message: "Cannot GET /api/monthly-pass/user/"
   ✓ FIXED: Now uses /monthly-pass/user endpoint (no userId param)

3. "Uncaught TypeError: bookings.map is not a function"
   → At MyBookingsTab (EmployeeDashboard.jsx:253:21)
   ✓ FIXED: Added type checking - Array.isArray(bookings) before map

4. "Uncaught TypeError: history.map is not a function"
   → At HistoryTab (EmployeeDashboard.jsx:306:20)
   ✓ FIXED: Added type checking - Array.isArray(history) before map

5. Trip Info showing "Not assigned" for Vehicle, Driver, Pickup Stop, Dropoff Stop
   ✓ FIXED: Backend now populates from VehicleAssignment collection
```

---

## Console Logs to Check

Open browser DevTools (F12) → Console tab:

```
✓ Should see: "Trip info loaded successfully"
✓ Should see: "Bookings fetched"
✓ Should see: "Travel history loaded"
✓ Should NOT see any red error messages
```

---

## Quick Fix Verification

### Trip Info Card Data:
Before → After

| Field | Before | After |
|-------|--------|-------|
| Vehicle | "Not assigned" | "Toyota Innova" |
| License Plate | "Not assigned" | "DL01AB1234" |
| Driver | "Not assigned" | "Rajesh Kumar" |
| Driver Phone | "Not assigned" | "+91 98765 43210" |
| Pickup Stop | "Not assigned" | "Sector 62, Noida" |
| Dropoff Stop | "Not assigned" | "Delhi Office, Mall Road" |
| Stop Points | Not visible | List of all stops with times |

---

## Testing Edge Cases

### 1. Employee with no route assigned
```
Expected: Should show message "You haven't been assigned to a route yet"
Should NOT crash or show errors
```

### 2. Employee with no bookings
```
Expected: Should show "No bookings yet" in My Bookings tab
Should NOT crash or show ".map is not a function" error
```

### 3. Employee with no travel history
```
Expected: Should show "No travel history" in History tab
Should NOT crash or show ".map is not a function" error
```

### 4. No available trips for today
```
Expected: Should show "No available trips found" message
Should NOT crash or show "400 Bad Request" error
```

---

## Browser DevTools Tips

1. **Check Network tab:**
   - All API calls should return 200 status
   - Request URLs should include query parameters: `?routeId=xxx&date=2026-02-27`

2. **Check Console tab:**
   - No red error messages
   - Check for any "console.error" logs

3. **Check Application tab:**
   - localStorage should have key: `routeId`
   - Value should be a MongoDB ObjectId

4. **Check Elements tab:**
   - Trip Info card should have actual vehicle/driver data
   - No "Not assigned" text (unless genuinely not assigned)

---

## Success Criteria

✅ All tests pass if:
1. Trip Info displays complete vehicle/driver/stop information
2. My Bookings tab loads without ".map is not a function" error
3. History tab loads without ".map is not a function" error  
4. Available Trips loads without "400 Bad Request" error
5. Monthly Pass tab loads without "404 Not Found" error
6. All error messages are gone from console

---

## Troubleshooting

### If Trip Info still shows "Not assigned":
```
1. Check if employee has a route assigned
2. Check if VehicleAssignment exists for the company
3. Check backend logs for populatefailures
4. Verify database has complete vehicle/driver data
```

### If ".map is not a function" still appears:
```
1. Clear browser cache completely
2. Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
3. Check that backend is returning arrays (not objects)
4. Check browser console for any TypeErrors
```

### If APIs still return errors:
```
1. Verify backend server is running
2. Check API endpoint URLs match frontend code
3. Verify authentication token is being sent
4. Check backend logs for validation errors
```

---

## Report Issues

If any issues persist after fixes:
1. Take screenshot of error
2. Copy console error message
3. Note which tab/feature has the issue
4. Check network tab to see API response
5. Provide all info to development team

---

**All Done!** Your Employee Dashboard should now be fully functional! 🎉

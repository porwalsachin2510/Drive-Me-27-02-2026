# COMMUTER - QUICK SUMMARY ⚡

## Commuter Kya Hai? (30 Second Explanation)

**Ek regular person jo daily office jaata hai aur kisi aur ke saath vehicle share karke sasta travel karna chahta hai.**

---

## 3 Main Types of Users in Drive Me

| User Type | Purpose | Payment | Vehicles |
|-----------|---------|---------|----------|
| **Commuter** | Daily commute 🚗 | Wallet + Card | Books existing trips |
| **Corporate** | Employee transportation 🏢 | Monthly contracts | Assigns vehicles |
| **B2C Partner** | Ride-sharing business 👥 | Per trip | Creates trips |
| **Driver** | Drives vehicle 🚘 | Monthly salary | Operates |

---

## Commuter Features at a Glance

```
🔍 Search Routes        → Find pickup + dropoff
📌 Join Routes          → Save favorite routes
🎫 Book Trips           → Reserve seat
💰 Pay via Wallet       → Add money, deduct fare
📊 Travel History       → Past trips + ratings
👤 Profile              → Manage account
📱 Notifications        → Trip reminders
```

---

## Frontend Pages (Commuter ke liye)

| Page | Purpose | File |
|------|---------|------|
| Home | Search routes | `CommuteHomePage.jsx` |
| Profile | All features | `CommuterProfilePage.jsx` |
| My Bookings | View/Cancel trips | `CommuterMyBookingsPage.jsx` |
| Employee Dashboard | Corporate employee view | `EmployeeDashboard.jsx` |

---

## API Endpoints (Commuter)

### Route Management
```
GET  /api/commute/search                    Search routes
GET  /api/commuter/routes                   Get saved routes
POST /api/commuter/routes/:id/join          Join route
```

### Bookings
```
GET  /api/bookings/passenger                Get my bookings
POST /api/trips/:id/book                    Book trip
PUT  /api/bookings/:id/cancel               Cancel booking
```

### Wallet
```
GET  /api/wallet/balance                    Check balance
POST /api/wallet/create-payment-session     Add money
```

### Profile
```
GET  /api/commuter/profile                  Get profile
PUT  /api/commuter/profile                  Update profile
```

### Travel History
```
GET  /api/travel-history/my-history         Get past trips
POST /api/travel-history/rate/:id           Rate trip
```

---

## Database Fields (Commuter User)

```javascript
{
  role: "COMMUTER",              // User type
  fullName: "Ahmed",
  email: "ahmed@email.com",
  whatsappNumber: "+965XXXX",
  country: "KW",                 // Kuwait/UAE/etc
  level: "STANDARD",             // STANDARD/PREMIUM/VIP
  status: "ACTIVE",              // ACTIVE/SUSPENDED/PENDING
  nationality: "Kuwaiti"
}
```

---

## Complete Payment Flow

```
1. Commuter clicks "Add Money" 💳
2. Enters amount (e.g., 1000 KWD)
3. Redirected to Stripe
4. Pays with credit card
5. Stripe sends webhook ✓
6. Wallet balance increases 💰
7. Notification sent 📩

OR

1. Commuter books trip
2. Selects "Pay from Wallet"
3. System checks balance
4. If enough: Booking confirmed ✓
5. Wallet deducted
6. Driver notified
```

---

## Redux State

### Commuter Slice
```javascript
commuter: {
  user: { ... },         // Current user
  profile: { ... },      // Profile data
  savedRoutes: [],       // Joined routes
  bookings: [],          // Commuter bookings
  wallet: {
    balance: 0,
    currency: "KWD"
  },
  notifications: []
}
```

### Commuter Booking Slice
```javascript
commuterBooking: {
  bookings: [],          // All bookings
  selectedBooking: null,
  bookingHistory: []
}
```

---

## Security Built-In ✅

✓ JWT Token verification on every request
✓ Role-based access (only COMMUTER can access)
✓ User ID validation (can't access others' data)
✓ Password hashing (bcrypt)
✓ Stripe webhook signature verification
✓ Input validation

---

## Common Actions

### Search for Routes
```javascript
searchRoutes({
  pickupLocation: "Airport",
  dropoffLocation: "Downtown",
  filterType: "all",
  selectedDays: [1,2,3,4,5],
  nationality: "Kuwaiti"
})
```

### Book a Trip
```javascript
bookTrip(tripId, {
  seats: 1,
  pickupPoint: "Terminal 1",
  paymentMethod: "WALLET"
})
```

### Add Money to Wallet
```javascript
addWalletMoney(1000, "CARD")
// Redirects to Stripe, then webhook updates DB
```

### Rate a Trip
```javascript
rateTrip(travelId, 5, "Great ride!")
// Updates driver's average rating
```

---

## Error Handling

| Error | Meaning | Fix |
|-------|---------|-----|
| 401 Unauthorized | Token expired | Login again |
| 403 Forbidden | Not a commuter | Wrong role |
| 404 Not Found | Route/Trip missing | Search again |
| 400 Bad Request | Invalid data | Check form |
| 500 Server Error | Backend crash | Retry |

---

## Testing Checklist

- [ ] Register as Commuter
- [ ] Search routes
- [ ] Join a route
- [ ] View my bookings
- [ ] Book a trip
- [ ] Add money to wallet (use test card: 4242 4242 4242 4242)
- [ ] Book trip from wallet
- [ ] Rate completed trip
- [ ] View travel history
- [ ] Update profile
- [ ] Change password
- [ ] Receive notifications
- [ ] Cancel booking (should refund)

---

## Important Notes

**Commuters:**
- Can ONLY book existing trips (can't create trips)
- Can ONLY join routes (can't create routes)
- Pay per trip or use monthly pass
- Get rated by drivers
- Have wallet for fast payments

**Database Storage:**
- User document: Has role="COMMUTER"
- Booking document: Links user to trip
- Wallet document: Tracks balance
- Payment document: Records all transactions
- Travel History: Completed trips + ratings

---

## Files to Check

**Frontend:**
- `/frontend/src/Pages/CommuterPages/` - All commuter pages
- `/frontend/src/services/commuterAPI.js` - API functions
- `/frontend/src/Redux/slices/commuterSlice.js` - State management

**Backend:**
- `/backend/src/routes/commuterRoutes.js` - Routes
- `/backend/src/controllers/` - Business logic
- `/backend/src/models/User.js` - User schema

---

**That's it! Commuter feature is simple: Search → Join → Book → Pay → Rate!** 🚀

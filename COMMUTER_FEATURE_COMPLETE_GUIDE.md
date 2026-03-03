# COMMUTER FEATURE - COMPLETE GUIDE 🚗

Hindi/Urdu mein simple explanation: 
**Commuter = Ek aisa person jo har roz office jaana hai, aur kisi aur ke saath vehicle share karke sasta travel karna chahta hai.**

---

## 1️⃣ COMMUTER KYA HAI? (What is a Commuter?)

Ek **commuter** wo user hai jo:
- ✅ Regular basis par office/work jaata hai (Daily or weekly)
- ✅ Shared transportation use karna chahta hai (cost-effective)
- ✅ Routes join kar sakte ho (routes = fixed pickup + dropoff locations)
- ✅ Booking kar sakte ho (existing trips pe)
- ✅ Wallet use kar sakte ho (payment)
- ✅ Travel history aur ratings de sakte ho

**Commuter vs Corporate Employee:**
- Commuter = Individual jo apne liye transportation book karta hai
- Corporate Employee = Kisi company ke under jo company ki vehicle use karta hai

---

## 2️⃣ DATABASE SCHEMA - COMMUTER KA DATA

### User Model (Backend: `/backend/src/models/User.js`)

```javascript
{
  _id: ObjectId,
  role: "COMMUTER",           // User type
  fullName: "Ahmed",
  email: "ahmed@mail.com",
  whatsappNumber: "+965XXXX",
  country: "KW",              // Kuwait, UAE, etc
  level: "STANDARD",          // STANDARD, PREMIUM, VIP
  
  // Account Status
  status: "ACTIVE",           // ACTIVE, SUSPENDED, PENDING
  isEmailVerified: true,
  isPasswordSet: true,
  
  // Profile Details
  nationality: "Kuwaiti",
  activatedAt: 2024-01-15,
  
  createdAt: 2024-01-01,
  updatedAt: 2024-03-03
}
```

---

## 3️⃣ COMMUTER KE MAIN FEATURES

### Feature 1: 🔍 ROUTE SEARCH & JOIN
**Kya hai:** Commuter routes dhundh sakta hai aur unhe join kar sakta hai

**Flow:**
```
1. Commuter "Commuter Home" page par jata hai
2. Pickup aur Dropoff location select karta hai
3. Available routes dekta hai
4. Route ko "Join" button se save karta hai
5. Uss route ke sab trips dekh sakta hai
```

**Frontend Files:**
- `/frontend/src/Pages/CommuterPages/CommuterHomePage/CommuteHomePage.jsx`
- `/frontend/src/Components/CommutersSearchForm/Commute-search-form.jsx`
- `/frontend/src/Components/FeaturedRoutes/FeaturedRoutes.jsx`

**Backend API:**
```
GET /api/commute/search
Query params: {
  pickupLocation: "Kuwait Airport",
  dropoffLocation: "Downtown Kuwait",
  filterType: "all",
  selectedDays: [1,2,3,4,5],
  nationality: "Kuwaiti"
}

Response: {
  routes: [
    {
      _id: "route123",
      pickupLocation: "Kuwait Airport",
      dropoffLocation: "Downtown",
      pickupTime: "07:00",
      dropoffTime: "08:30",
      daysOfOperation: [1,2,3,4,5],
      fare: 250,
      availableSeats: 3,
      vehicleType: "Sedan"
    }
  ]
}
```

**Join Route API:**
```
POST /api/commuter/routes/:routeId/join

Response: {
  message: "Route joined successfully",
  route: { ... }
}
```

---

### Feature 2: 🎫 BOOKING MANAGEMENT
**Kya hai:** Commuter trips book kar sakta hai aur cancellations handle kar sakta hai

**Flow:**
```
1. Commuter "My Rides" tab mein jata hai
2. Available trips dekhta hai
3. Trip select karke "Book Now" click karta hai
4. Payment kar (wallet se ya card se)
5. Booking confirm hoti hai
```

**API Endpoints:**

#### Get My Bookings
```
GET /api/bookings/passenger

Response: {
  bookings: [
    {
      _id: "booking123",
      userId: "user456",
      tripId: "trip789",
      status: "CONFIRMED",          // CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED
      seats: 1,
      pickupPoint: "Terminal 1",
      fare: 250,
      paymentStatus: "PAID",
      bookingDate: 2024-03-01,
      tripDate: 2024-03-05,
      tripTime: "07:00"
    }
  ]
}
```

#### Book a Trip
```
POST /api/trips/:tripId/book

Request Body: {
  seats: 1,
  pickupPoint: "Terminal 1",
  paymentMethod: "WALLET"  // or "CARD"
}

Response: {
  booking: { ... },
  message: "Trip booked successfully"
}
```

#### Cancel Booking
```
PUT /api/bookings/:bookingId/cancel

Request Body: {
  cancellationReason: "Plans changed"
}

Response: {
  booking: { status: "CANCELLED" },
  refundAmount: 250
}
```

---

### Feature 3: 💰 WALLET & PAYMENT
**Kya hai:** Commuter apne wallet mein paise add kar sakta hai aur bookings pay kar sakta hai

**Flow:**
```
1. Commuter "Wallet" section mein jata hai
2. Current balance dekta hai
3. "Add Money" button click karta hai
4. Amount enter karta hai
5. Stripe/Payment gateway se pay karta hai
6. Paise wallet mein add hote hain
```

**API Endpoints:**

#### Get Wallet Balance
```
GET /api/wallet/balance

Response: {
  userId: "user123",
  balance: 5000,              // KWD ya AED
  currency: "KWD",
  lastTransaction: 2024-03-01,
  totalSpent: 15000,
  totalEarned: 0
}
```

#### Create Payment Session (Add Money)
```
POST /api/wallet/create-payment-session

Request Body: {
  amount: 1000,               // Amount to add
  paymentMethod: "CARD",      // CARD or STRIPE
  currency: "KWD"
}

Response: {
  sessionId: "ch_1234567890",
  sessionUrl: "https://checkout.stripe.com/...",
  amount: 1000,
  currency: "KWD"
}
```

#### Webhook - Payment Success
```
POST /api/webhook/stripe

Stripe automatically calls this when payment is successful

Database Updates:
1. Wallet balance increased
2. Transaction record created
3. Payment status = COMPLETED
```

---

### Feature 4: 📊 TRAVEL HISTORY & RATINGS
**Kya hai:** Commuter apni travel history dekh sakta hai aur trips ko rate kar sakta hai

**Flow:**
```
1. Trip complete hoti hai
2. Commuter "Travel History" tab mein dekh sakta hai
3. Trip par star rating aur review de sakta hai
4. Ratings average rating ko affect karti hain
```

**API Endpoints:**

#### Get Travel History
```
GET /api/travel-history/my-history

Response: {
  travels: [
    {
      _id: "travel123",
      tripId: "trip789",
      pickupLocation: "Airport",
      dropoffLocation: "Downtown",
      tripDate: 2024-02-28,
      fare: 250,
      rating: null,           // Agey rating add hogi
      review: null,
      driverName: "Ali",
      vehicleNumber: "KW-123",
      status: "COMPLETED"
    }
  ]
}
```

#### Rate a Trip
```
POST /api/travel-history/rate/:travelId

Request Body: {
  rating: 5,                  // 1-5 stars
  review: "Great driver, clean car!"
}

Response: {
  travel: { rating: 5, review: "..." },
  avgRating: 4.8              // Driver ka average rating
}
```

---

### Feature 5: 👤 PROFILE MANAGEMENT
**Kya hai:** Commuter apna profile dekh aur edit kar sakta hai

**API Endpoints:**

#### Get Profile
```
GET /api/commuter/profile

Response: {
  _id: "user123",
  fullName: "Ahmed",
  email: "ahmed@mail.com",
  whatsappNumber: "+965XXXX",
  country: "KW",
  level: "STANDARD",
  nationality: "Kuwaiti",
  status: "ACTIVE",
  profilePicture: "https://...",
  createdAt: 2024-01-01
}
```

#### Update Profile
```
PUT /api/commuter/profile

Request Body: {
  fullName: "Ahmed Updated",
  whatsappNumber: "+965YYYY",
  profilePicture: "data:image/jpeg;base64,..."
}

Response: {
  message: "Profile updated successfully",
  user: { ... }
}
```

#### Change Password
```
PUT /api/commuter/change-password

Request Body: {
  oldPassword: "oldPassword123",
  newPassword: "newPassword456"
}

Response: {
  message: "Password changed successfully"
}
```

---

### Feature 6: 📱 ALERTS & NOTIFICATIONS
**Kya hai:** Commuter ko notifications milti hain bookings aur trips ke bare mein

**API Endpoints:**

#### Get Notifications
```
GET /api/notifications/user/:userId

Response: {
  notifications: [
    {
      _id: "notif123",
      userId: "user456",
      type: "TRIP_REMINDER",      // Types: BOOKING_CONFIRMED, TRIP_REMINDER, PAYMENT_SUCCESS, etc
      title: "Your trip starts in 1 hour",
      message: "Kuwait Airport to Downtown - 7:00 AM",
      read: false,
      createdAt: 2024-03-03,
      relatedData: {
        tripId: "trip789",
        bookingId: "booking123"
      }
    }
  ]
}
```

#### Mark Notification as Read
```
PATCH /api/notifications/:notificationId/read

Response: {
  notification: { read: true }
}
```

---

### Feature 7: 🔐 AUTHENTICATION
**Kya hai:** Commuter register, login, aur logout kar sakta hai

**Commuter Registration:**
```
POST /api/auth/register

Request Body: {
  role: "COMMUTER",
  fullName: "Ahmed",
  email: "ahmed@mail.com",
  whatsappNumber: "+965XXXX",
  country: "KW",
  password: "securePassword123"
}

Response: {
  user: { _id: "user123", ... },
  token: "jwt_token_here",
  message: "Commuter registered successfully"
}
```

**Login:**
```
POST /api/auth/login

Request Body: {
  email: "ahmed@mail.com",
  password: "securePassword123"
}

Response: {
  user: { _id: "user123", role: "COMMUTER", ... },
  token: "jwt_token_here",
  message: "Login successful"
}
```

---

## 4️⃣ FRONTEND PAGES (Commuter ke liye)

### Page 1: 🏠 Commuter Home Page
**File:** `/frontend/src/Pages/CommuterPages/CommuterHomePage/CommuteHomePage.jsx`

**Kya deta hai:**
- Route search form
- Featured routes display
- Available trips section
- Route request option

**Key Components:**
```jsx
<CommuteSearchForm />      // Search bar
<FeaturedRoutes />         // Popular routes
<AvailableSection />       // Available trips
<RouteRequest />           // "Can't find route?" option
```

---

### Page 2: 📍 Commuter Profile Page
**File:** `/frontend/src/Pages/CommuterPages/CommuterProfilePage/CommuterProfilePage.jsx`

**Tabs Available:**
- 🚗 My Rides (Bookings)
- 🔍 Find Routes (Saved routes)
- 💳 Wallet (Payment & Balance)
- ⚠️ Alerts (Notifications)
- 📊 Travel History (Past trips & ratings)
- 🎫 Subscription Settings
- ⚙️ Settings (Profile, Password, etc)

---

### Page 3: 📋 My Bookings Page
**File:** `/frontend/src/Pages/CommuterPages/CommuterMyBookingsPage/CommuterMyBookingsPage.jsx`

**Kya dikta hai:**
- List of all bookings
- Booking status (Confirmed, Completed, Cancelled)
- Trip details (pickup, dropoff, time, fare)
- Cancel booking button
- View trip on map option

---

### Page 4: 📊 Employee Dashboard (Corporate Employee)
**File:** `/frontend/src/Pages/CommuterPages/EmployeeDashboard/EmployeeDashboard.jsx`

**Note:** Ye ek special type ka commuter page hai corporate employees ke liye

---

## 5️⃣ REDUX STATE MANAGEMENT

### Commuter Slice
**File:** `/frontend/src/Redux/slices/commuterSlice.js`

**State Contains:**
```javascript
{
  commuter: {
    user: null,                 // Current commuter user
    profile: null,              // Commuter profile data
    savedRoutes: [],            // Routes that commuter joined
    bookings: [],               // Commuter's bookings
    wallet: {
      balance: 0,
      currency: "KWD"
    },
    notifications: [],
    loading: false,
    error: null
  }
}
```

---

### Commuter Booking Slice
**File:** `/frontend/src/Redux/slices/commuterBookingSlice.js`

**State Contains:**
```javascript
{
  commuterBooking: {
    bookings: [],               // All commuter bookings
    selectedBooking: null,      // Currently selected booking
    loading: false,
    error: null,
    bookingHistory: [],
    totalBookings: 0
  }
}
```

---

## 6️⃣ BACKEND ROUTES (API Endpoints)

**File:** `/backend/src/routes/commuterRoutes.js`

```javascript
// Routes Management
GET  /api/commuter/routes                    // Get saved routes
POST /api/commuter/routes/:routeId/join      // Join a route
POST /api/commuter/routes/:routeId/leave     // Leave a route

// Profile
GET  /api/commuter/profile                   // Get profile
PUT  /api/commuter/profile                   // Update profile
PUT  /api/commuter/change-password           // Change password

// Statistics
GET  /api/commuter/stats                     // Get commuter stats
```

---

## 7️⃣ API SERVICES (Frontend)

**File:** `/frontend/src/services/commuterAPI.js`

All API calls ke liye JavaScript functions:

```javascript
// Routes
publicSearchRoutes(params)           // Public search (guests)
searchRoutes(params)                 // Authenticated search
getSavedRoutes()                     // Get joined routes
saveRoute(routeId)                   // Join route

// Bookings
getMyBookings()                      // Get all bookings
bookTrip(tripId, bookingData)       // Book a trip
cancelBooking(bookingId, reason)    // Cancel booking
getTripDetails(tripId)               // Get trip info

// Wallet
getWalletInfo()                      // Get balance
addWalletMoney(amount, method)      // Add funds

// Profile
getCommuterProfile()                 // Get profile
updateCommuterProfile(data)         // Update profile

// Travel History
getTravelHistory()                   // Get past trips
rateTrip(travelId, rating, review)  // Rate a trip

// Notifications
getNotifications(userId)             // Get all notifications
markNotificationRead(notifId)        // Mark as read
```

---

## 8️⃣ AUTHENTICATION FLOW

**Register:**
```
User fills form (name, email, phone, country, password)
    ↓
Backend validates data
    ↓
Check if email exists
    ↓
Hash password with bcrypt
    ↓
Create User document with role="COMMUTER"
    ↓
Generate JWT token
    ↓
Send registration email
    ↓
User logged in automatically
```

**Login:**
```
User enters email & password
    ↓
Backend finds user by email
    ↓
Compare password with hash
    ↓
If match: Generate JWT token
    ↓
Token stored in localStorage/cookies
    ↓
User redirected to Commuter Home
```

**JWT Usage:**
```
Every API request headers mein:
Authorization: Bearer {jwt_token}

Backend verifies token
    ↓
If valid: Request proceeds
    ↓
If invalid: 401 Unauthorized
```

---

## 9️⃣ PAYMENT FLOW (Commuter)

**Add Money to Wallet:**
```
1. Commuter Wallet page par jata hai
2. "Add Money" button click karta hai
3. Amount enter karta hai (e.g., 1000 KWD)
4. Backend payment session create karta hai
5. Stripe checkout page open hoti hai
6. Commuter card details enter karta hai
7. Payment process hoti hai

Success Case:
    ↓
Stripe webhook call karta hai backend ko
    ↓
Backend wallet balance increase karta hai
    ↓
Transaction record create hoti hai
    ↓
Notification bhijti hai commuter ko
    ↓
Frontend "Money Added!" message dikta hai

Failure Case:
    ↓
Error notification
    ↓
No wallet update
    ↓
Retry option
```

**Book Trip with Wallet:**
```
1. Commuter trip select karta hai
2. "Book Now" button click karta hai
3. Payment method select karta hai (WALLET/CARD)
4. Backend checks wallet balance
5. If balance >= fare:
   - Booking create hoti hai
   - Wallet balance deduct hoti hai
   - Payment record create hoti hai
   If balance < fare:
   - Error message dikta hai
   - Wallet top-up suggest hoti hai
```

---

## 🔟 COMPLETE USER JOURNEY (Example)

**Ahmed (Commuter) ka typical day:**

```
9:00 AM - Ahmed Login karta hai
    ↓
9:05 AM - "Commuter Home" page open karta hai
    ↓
9:10 AM - Search karta hai: "Kuwait Airport to Downtown"
    ↓
9:12 AM - 5 routes dekta hai aur "Best Route" ko join karta hai
    ↓
9:15 AM - "My Rides" tab mein jata hai
    ↓
9:16 AM - Aaj ki trip dekhta hai "07:00 AM departure"
    ↓
9:17 AM - "Book Now" button click karta hai
    ↓
9:18 AM - Booking confirmation dikta hai ✓
    ↓
6:55 PM - Booking reminder notification aata hai
    ↓
7:00 PM - Trip start hoti hai
    ↓
8:30 PM - Trip complete hoti hai
    ↓
8:35 PM - Rate Trip prompt dikta hai
    ↓
8:36 PM - 5 stars aur review likta hai
    ↓
9:00 PM - Travel History mein completed trip dikti hai
```

---

## 1️⃣1️⃣ IMPORTANT NOTES

### ✅ Commuter CAN DO:
- ✓ Search routes
- ✓ Join/Leave routes
- ✓ Book trips
- ✓ Cancel bookings
- ✓ Add money to wallet
- ✓ Rate trips
- ✓ View travel history
- ✓ Manage profile
- ✓ Change password
- ✓ Receive notifications

### ❌ Commuter CANNOT DO:
- ✗ Create routes (only partners/corporates)
- ✗ Create trips (only partners/drivers)
- ✗ Assign vehicles
- ✗ Access admin panel
- ✗ Manage other users
- ✗ View other users' data

---

## 1️⃣2️⃣ SECURITY FEATURES

```javascript
// Every Commuter API request has:
1. JWT Token Verification        ✓
2. Role Check (must be COMMUTER) ✓
3. User ID Validation             ✓
4. Password Hashing (bcrypt)      ✓
5. Input Validation               ✓
6. SQL Injection Protection       ✓
7. CORS Enabled                   ✓
```

---

## 1️⃣3️⃣ ERROR HANDLING

Common errors aur solutions:

```javascript
// Error: 401 Unauthorized
Problem: JWT token invalid/expired
Solution: User ko login page par redirect karo

// Error: 403 Forbidden
Problem: User role commuter nahi hai
Solution: Role check fail, access denied

// Error: 404 Not Found
Problem: Route/Trip/Booking nahi mila
Solution: User ko valid ID check karne ko bolna

// Error: 400 Bad Request
Problem: Invalid input data
Solution: Form validation error dikana

// Error: 500 Internal Server Error
Problem: Backend crash
Solution: Admin ko notify karo, retry option dena
```

---

## 1️⃣4️⃣ COMMUTER STATISTICS

Commuter ke stats jo available hain:

```javascript
GET /api/commuter/stats

Response: {
  totalTrips: 45,           // Kitni trips complete ki
  totalSpent: 15000,        // Kitna paise kharch kiye
  averageRating: 4.8,       // Driver ko average rating
  totalDistance: 2500,      // Kitna distance cover kiya
  memberSince: 2024-01-01,  // Kitne din se member
  savedRoutes: 8,           // Kitne routes save hai
  level: "STANDARD",        // User tier
  loyaltyPoints: 450        // Rewards points
}
```

---

## 1️⃣5️⃣ TIPS FOR DEVELOPERS

1. **Always verify user role** before giving commuter-specific data
2. **Check wallet balance** before confirming bookings
3. **Validate payment** through webhook before updating wallet
4. **Handle timezone** differences (UAE vs Kuwait)
5. **Cache routes** for faster search
6. **Log all transactions** for audit
7. **Set expiry** on bookings (cancellation window)
8. **Monitor notifications** delivery

---

**Yeh tha Commuter Feature ka complete guide! Agey koi question ho to puchh lo!** 🚀

Good luck! 🎉

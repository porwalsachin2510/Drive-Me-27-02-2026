# Stripe Payment Integration - Visual Guide

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React)                               │
│  BookingModal.jsx                                                        │
│  ├─ User selects "Credit/Debit Card"                                   │
│  ├─ Calls: handleSelectPaymentMethod("STRIPE")                         │
│  ├─ Makes: POST /api/monthly-pass/create                              │
│  └─ Waits for: response.data.paymentUrl                               │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             │ HTTP POST with bookingData
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (Node.js)                              │
│                    /api/monthly-pass/create                              │
│                                                                          │
│  b2cMonthlyPassController.createB2CMonthlyPass()                        │
│  ├─ 1. Create MonthlyPass record in DB                                 │
│  ├─ 2. Create PassengerBooking record in DB                            │
│  ├─ 3. Create monthly trips in DB                                      │
│  ├─ 4. IF paymentMethod === "STRIPE":                                  │
│  │    └─ stripePaymentService.createStripePaymentSession()            │
│  │       └─ Call Stripe API: stripe.checkout.sessions.create()        │
│  │          └─ Get back: { url: "https://checkout.stripe.com/..." }   │
│  └─ 5. Return Response WITH paymentUrl ✅                              │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             │ HTTP Response { paymentUrl, monthlyPass, ... }
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React)                               │
│                                                                          │
│  handleSelectPaymentMethod() receives response:                         │
│  {                                                                      │
│    success: true,                                                       │
│    paymentUrl: "https://checkout.stripe.com/pay/...",                 │
│    monthlyPass: { ... },                                               │
│    paymentRequired: true                                               │
│  }                                                                      │
│                                                                          │
│  ✅ window.location.href = response.data.paymentUrl                    │
│     (Redirects user to Stripe)                                         │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             │ Browser Navigation
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                       STRIPE CHECKOUT (Hosted)                           │
│                                                                          │
│  ┌─────────────────────────────────────────────────────┐               │
│  │ Stripe Secure Payment Page                          │               │
│  │ ┌────────────────────────────────────────────────┐  │               │
│  │ │ Amount: AED 3000.00                            │  │               │
│  │ │ Description: Monthly Pass - Route Booking      │  │               │
│  │ └────────────────────────────────────────────────┘  │               │
│  │ ┌────────────────────────────────────────────────┐  │               │
│  │ │ Card Number: [4242 4242 4242 4242        ]      │  │               │
│  │ │ Expiry:      [12/25]    CVC: [123]            │  │               │
│  │ │ Name:        [John Doe              ]          │  │               │
│  │ └────────────────────────────────────────────────┘  │               │
│  │ ┌──────────────────────────────────────────────┐   │               │
│  │ │            [    PAY AED 3000.00    ]          │   │               │
│  │ └──────────────────────────────────────────────┘   │               │
│  └─────────────────────────────────────────────────────┘               │
│                                                                          │
│  User enters card details and clicks "Pay"                             │
│  Stripe processes payment (Visa/Mastercard/etc)                        │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             │ If payment successful
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   STRIPE WEBHOOK EVENT (Automatic)                       │
│                                                                          │
│  Stripe sends webhook event to:                                        │
│  POST /api/webhook/stripe                                              │
│  {                                                                      │
│    type: "checkout.session.completed",                                 │
│    data: {                                                             │
│      object: {                                                         │
│        id: "cs_test_...",                                             │
│        payment_status: "paid",                                         │
│        metadata: {                                                     │
│          passId: "507f1f77bcf86cd799439011",                         │
│          passengerId: "507f1f77bcf86cd799439012"                     │
│        }                                                               │
│      }                                                                 │
│    }                                                                   │
│  }                                                                      │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             │ stripeWebhookRoutes handles event
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         BACKEND WEBHOOK HANDLER                          │
│                      /api/webhook/stripe                                 │
│                                                                          │
│  stripeWebhookRoutes.js (router.post('/stripe'))                       │
│  ├─ 1. Verify Stripe signature (security)                             │
│  ├─ 2. Extract sessionId and metadata from webhook                    │
│  ├─ 3. Find MonthlyPass by passId:                                    │
│  │    ├─ monthlyPass.paymentStatus = "COMPLETED"                      │
│  │    ├─ monthlyPass.stripeSessionId = "cs_test_..."                  │
│  │    ├─ monthlyPass.stripePaidAt = now                               │
│  │    └─ Save to DB ✅                                                 │
│  ├─ 4. Find PassengerBooking by monthlyPassId:                        │
│  │    ├─ booking.paymentStatus = "COMPLETED"                          │
│  │    ├─ booking.transactionId = "cs_test_..."                        │
│  │    └─ Save to DB ✅                                                 │
│  └─ 5. Return: { received: true }                                     │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             │ Webhook acknowledged
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                       DATABASE UPDATED ✅                                 │
│                                                                          │
│  MonthlyPass Collection:                                               │
│  {                                                                      │
│    _id: "507f1f77bcf86cd799439011",                                   │
│    passengerId: "507f1f77bcf86cd799439012",                           │
│    routeId: "507f1f77bcf86cd799439013",                               │
│    passType: "ONE_WAY",                                               │
│    totalAmount: 3000,                                                  │
│    paymentStatus: "COMPLETED" ✅,                                      │
│    stripeSessionId: "cs_test_...",                                    │
│    stripePaidAt: 2026-03-03T10:30:00Z                                 │
│  }                                                                      │
│                                                                          │
│  PassengerBooking Collection:                                          │
│  {                                                                      │
│    _id: "507f1f77bcf86cd799439014",                                   │
│    monthlyPassId: "507f1f77bcf86cd799439011",                         │
│    paymentStatus: "COMPLETED" ✅,                                      │
│    transactionId: "cs_test_...",                                      │
│    paymentDate: 2026-03-03T10:30:00Z                                  │
│  }                                                                      │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             │ Automatic
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   ✅ PAYMENT COMPLETE - SUCCESS!                         │
│                                                                          │
│  ✓ Monthly Pass Created and Active                                     │
│  ✓ Payment Recorded in Database                                        │
│  ✓ Commuter Can Use Pass                                              │
│  ✓ Driver Earnings Calculated                                          │
│  ✓ Admin Commission Calculated                                         │
│  ✓ Transaction ID Stored                                              │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Code Flow Sequence Diagram

```
User                Frontend              Backend              Stripe
  │                    │                    │                    │
  │─ Click Pay Now ───>│                    │                    │
  │                    │─ POST              │                    │
  │                    │ /monthly-pass      │                    │
  │                    │ /create ──────────>│                    │
  │                    │                    │                    │
  │                    │                    ├─ Create Pass      │
  │                    │                    │ in DB             │
  │                    │                    │                    │
  │                    │                    ├─ Create Booking   │
  │                    │                    │ in DB             │
  │                    │                    │                    │
  │                    │                    ├─ IF STRIPE        │
  │                    │                    │                    │
  │                    │                    ├─ Create           │
  │                    │                    │ Stripe Session ──>│
  │                    │                    │                    │
  │                    │                    │<─ Checkout URL ───┤
  │                    │<─ Response ────────┤ + paymentUrl      │
  │                    │ paymentUrl         │                    │
  │                    │                    │                    │
  │<─ Redirect ────────┤                    │                    │
  │ to Stripe          │                    │                    │
  │                    │                    │                    │
  ├─ Enter Card ──────────────────────────────────────────────>│
  │ Details            │                    │                    │
  │                    │                    │                    │
  │<─ Payment Form ────────────────────────────────────────────┤
  │                    │                    │                    │
  │─ Click Pay ───────────────────────────────────────────────>│
  │                    │                    │ Process Payment   │
  │                    │                    │                    │
  │                    │                    │                    │
  │<─ Success ─────────────────────────────────────────────────┤
  │ Redirect           │                    │                    │
  │                    │                    │─ Webhook ────────>│
  │                    │                    │ checkout.session  │
  │                    │                    │ _completed        │
  │                    │                    │<─ Acknowledged ───┤
  │                    │                    │                    │
  │                    │                    ├─ Update Pass      │
  │                    │                    │ Status = COMPLETED│
  │                    │                    │                    │
  │                    │                    ├─ Update Booking   │
  │                    │                    │ Status = COMPLETED│
  │                    │                    │                    │
  ├─ Success Page ────>│                    │                    │
  │                    │                    │                    │
  │ ✅ Can use pass   │                    │                    │
```

---

## Data Structure

### Request Body
```javascript
// POST /api/monthly-pass/create
{
  passengerId: "507f1f77bcf86cd799439012",
  routeId: "507f1f77bcf86cd799439013",
  scheduleId: "507f1f77bcf86cd799439014",
  passType: "ONE_WAY",           // or "ROUND_TRIP"
  outboundTripTime: "8:00 AM",
  pickupLocation: "Dubai Mall",
  dropoffLocation: "Emirates Tower",
  durationMonths: 1,
  numberOfSeats: 1,
  selectedDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  totalAmount: 3000,             // AED
  paymentMethod: "STRIPE",       // or "CASH", "TAP"
  notes: "Regular commute pass"
}
```

### Response (Success - STRIPE)
```javascript
{
  success: true,
  message: "Payment session initiated. Proceed to payment.",
  monthlyPass: {
    _id: "507f1f77bcf86cd799439015",
    passengerId: "507f1f77bcf86cd799439012",
    routeId: "507f1f77bcf86cd799439013",
    passType: "ONE_WAY",
    totalAmount: 3000,
    paymentStatus: "PENDING_PAYMENT",      // ← Updated to PENDING
    paymentMethod: "STRIPE",
    // ... other fields
  },
  monthlyPassBooking: {
    bookingId: "507f1f77bcf86cd799439016",
    numberOfSeats: 1,
    paymentMethod: "STRIPE",
    paymentStatus: "PENDING_PAYMENT",      // ← Updated to PENDING
    // ... other fields
  },
  trips: {
    totalCreated: 20,
    totalExisting: 0,
    totalTrips: 20,
    // ... other fields
  },
  paymentUrl: "https://checkout.stripe.com/pay/cs_test_...",  // ← THE KEY FIELD!
  paymentRequired: true,
  paymentMethod: "STRIPE"
}
```

### Webhook Event (From Stripe)
```javascript
{
  type: "checkout.session.completed",
  id: "evt_test_...",
  object: "event",
  data: {
    object: {
      id: "cs_test_...",
      object: "checkout.session",
      payment_status: "paid",
      customer: "cus_...",
      metadata: {
        passId: "507f1f77bcf86cd799439015",
        passengerId: "507f1f77bcf86cd799439012",
        routeId: "507f1f77bcf86cd799439013",
        type: "MONTHLY_PASS_BOOKING"
      },
      amount_total: 300000      // In cents (3000 AED)
    }
  }
}
```

### Database After Webhook
```javascript
// MonthlyPass Collection
{
  _id: ObjectId("507f1f77bcf86cd799439015"),
  passengerId: ObjectId("507f1f77bcf86cd799439012"),
  routeId: ObjectId("507f1f77bcf86cd799439013"),
  totalAmount: 3000,
  paymentStatus: "COMPLETED",    // ← Updated by webhook
  stripeSessionId: "cs_test_...",
  stripePaidAt: ISODate("2026-03-03T10:30:00.000Z"),
  // ... other fields
}

// PassengerBooking Collection
{
  _id: ObjectId("507f1f77bcf86cd799439016"),
  monthlyPassId: ObjectId("507f1f77bcf86cd799439015"),
  paymentStatus: "COMPLETED",    // ← Updated by webhook
  transactionId: "cs_test_...",
  paymentDate: ISODate("2026-03-03T10:30:00.000Z"),
  // ... other fields
}
```

---

## Environment Variables Map

```
┌────────────────────────────────────────────────────────────┐
│                 Your .env File                             │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  STRIPE_SECRET_KEY                                         │
│  └─> Used by: stripePaymentService.js                     │
│      Purpose: Create checkout sessions                     │
│      Security: Keep SECRET (backend only)                 │
│      Format: sk_test_... or sk_live_...                   │
│                                                            │
│  STRIPE_WEBHOOK_SECRET                                     │
│  └─> Used by: stripeWebhookRoutes.js                      │
│      Purpose: Verify webhook signature                    │
│      Security: Keep SECRET (backend only)                 │
│      Format: whsec_test_... or whsec_live_...             │
│                                                            │
│  FRONTEND_URL                                              │
│  └─> Used by: stripePaymentService.js                     │
│      Purpose: success_url & cancel_url in Stripe          │
│      Format: http://localhost:3000 or https://yourdomain  │
│                                                            │
│  BACKEND_URL                                               │
│  └─> Used by: Configuration reference                     │
│      Purpose: Stripe webhook endpoint                     │
│      Format: http://localhost:5000 or https://api.domain  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Test Scenario

### Successful Payment Flow
```
1. User creates booking with:
   - Route: Dubai Mall → Emirates Tower
   - Pass Type: ONE_WAY
   - Amount: AED 3000
   - Payment: STRIPE

2. Backend returns:
   - paymentUrl: https://checkout.stripe.com/...
   
3. User redirected to Stripe page

4. User enters test card:
   - 4242 4242 4242 4242
   - 12/25
   - 123
   
5. Payment succeeds

6. Stripe sends webhook ✓

7. Database updated:
   - MonthlyPass.paymentStatus = "COMPLETED"
   - Booking.paymentStatus = "COMPLETED"

8. User sees success page ✓

9. Monthly pass is active ✓
```

### Failed Payment Flow
```
1. User attempts payment with invalid card:
   - 4000 0000 0000 0002

2. Stripe declines payment

3. User returns to cancel_url

4. Webhook NOT sent (payment failed)

5. Database remains:
   - MonthlyPass.paymentStatus = "PENDING_PAYMENT"
   - Booking.paymentStatus = "PENDING_PAYMENT"

6. User can retry payment
```

---

**Visual guide complete!** 📊


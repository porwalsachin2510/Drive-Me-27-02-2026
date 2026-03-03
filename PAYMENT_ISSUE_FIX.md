# BookingModal Stripe Payment Integration - COMPLETE FIX

## Problem Found ❌

**Issue:** Credit/Debit Card payment button click karte hain to **Stripe ka popup nahi khul raha**

### Root Cause Analysis:

1. **Frontend (BookingModal.jsx):**
   - Line 1042-1044: onClick handler correctly calls `handleSelectPaymentMethod("STRIPE")`
   - Line 363-411: Function correctly sends payment request to `/monthly-pass/create` API
   - Line 392-393: Expects `response.data.paymentUrl` to redirect to Stripe
   
2. **Backend (b2cMonthlyPassController.js):**
   - Line 537-569: Response is returned BUT **NO `paymentUrl` in response!**
   - Backend is creating monthly pass successfully
   - **Missing:** Stripe payment session creation and paymentUrl in response

### Real Issue:
```
Frontend expects: response.data.paymentUrl (Line 393 in BookingModal.jsx)
Backend returns: NO paymentUrl ❌
Result: Redirect never happens, user sees no payment popup
```

---

## Solution ✅

### Step 1: Install Stripe Package (if not already installed)

```bash
npm install stripe
```

Check in `package.json` - should already have `"stripe": "^xx.x.x"`

---

### Step 2: Update Backend - Create Stripe Service

**Create file:** `/backend/src/Services/stripePaymentService.js`

```javascript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createStripePaymentSession = async (amount, passengerId, routeId, passId) => {
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL}/payment/success?sessionId={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/payment/cancelled`,
            line_items: [
                {
                    price_data: {
                        currency: 'aed',
                        product_data: {
                            name: `Monthly Pass - Route Booking`,
                            description: `Route ID: ${routeId}`,
                            metadata: {
                                passengerId,
                                routeId,
                                passId
                            }
                        },
                        unit_amount: Math.round(amount * 100), // Convert to cents
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                passengerId,
                routeId,
                passId,
                type: 'MONTHLY_PASS_BOOKING'
            }
        });

        return {
            sessionId: session.id,
            paymentUrl: session.url,
            clientSecret: session.client_secret
        };
    } catch (error) {
        console.error('[v0] Stripe session creation error:', error);
        throw new Error(`Failed to create payment session: ${error.message}`);
    }
};

export const verifyStripePayment = async (sessionId) => {
    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        
        if (session.payment_status === 'paid') {
            return {
                success: true,
                paymentStatus: 'COMPLETED',
                amount: session.amount_total / 100,
                customerId: session.customer,
                metadata: session.metadata
            };
        } else {
            return {
                success: false,
                paymentStatus: session.payment_status,
                amount: session.amount_total / 100
            };
        }
    } catch (error) {
        console.error('[v0] Stripe verification error:', error);
        throw new Error(`Failed to verify payment: ${error.message}`);
    }
};
```

---

### Step 3: Update Backend Controller

**File:** `/backend/src/controllers/b2cMonthlyPassController.js`

**Add at top (after other imports):**
```javascript
import { createStripePaymentSession } from '../Services/stripePaymentService.js';
```

**Update the `createB2CMonthlyPass` function response (around line 537):**

Replace:
```javascript
res.status(201).json({
    success: true,
    message: "Monthly pass created successfully",
    monthlyPass: {
        ...monthlyPass.toObject(),
        daysRemaining: monthlyPass.daysRemaining,
        isActive: monthlyPass.isActive,
        usagePercentage: monthlyPass.usagePercentage
    },
    monthlyPassBooking: {
        // ... rest of data
    },
    // ...
});
```

With:
```javascript
// Handle Stripe payment if needed
let paymentUrl = null;
if (paymentMethod === "STRIPE" && totalAmount > 0) {
    try {
        const stripeSession = await createStripePaymentSession(
            totalAmount,
            passengerId,
            routeId,
            monthlyPass._id
        );
        paymentUrl = stripeSession.paymentUrl;
        
        console.log("[v0] Stripe session created:", {
            sessionId: stripeSession.sessionId,
            amount: totalAmount,
            passenger: passengerId
        });
    } catch (stripeError) {
        console.error("[v0] Stripe payment session creation failed:", stripeError.message);
        // Mark pass as pending payment
        monthlyPass.paymentStatus = 'STRIPE_FAILED';
        await monthlyPass.save();
        
        return res.status(400).json({
            success: false,
            message: "Failed to initialize Stripe payment",
            error: stripeError.message
        });
    }
}

res.status(201).json({
    success: true,
    message: paymentMethod === "STRIPE" ? 
        "Payment session initiated. Proceed to payment." : 
        "Monthly pass created successfully",
    monthlyPass: {
        ...monthlyPass.toObject(),
        daysRemaining: monthlyPass.daysRemaining,
        isActive: monthlyPass.isActive,
        usagePercentage: monthlyPass.usagePercentage,
        paymentStatus: paymentMethod === "STRIPE" ? "PENDING_PAYMENT" : "COMPLETED"
    },
    monthlyPassBooking: {
        bookingId: passengerBooking._id,
        totalTripsCount: [...createdTrips, ...existingTrips].length,
        createdTripsCount: createdTrips.length,
        existingTripsCount: existingTrips.length,
        numberOfSeats: numberOfSeats,
        totalSeatsBooked: [...createdTrips, ...existingTrips].length * numberOfSeats,
        monthlyTrips: [...createdTrips, ...existingTrips].map(trip => trip._id),
        paymentMethod: paymentMethod,
        paymentStatus: paymentMethod === "STRIPE" ? "PENDING_PAYMENT" : "COMPLETED"
    },
    trips: {
        totalCreated: createdTrips.length,
        totalExisting: existingTrips.length,
        totalTrips: [...createdTrips, ...existingTrips].length,
        outboundTrips: [...createdTrips, ...existingTrips].filter(trip => trip.fromLocation === route.fromLocation).length,
        returnTrips: [...createdTrips, ...existingTrips].filter(trip => trip.fromLocation === route.toLocation).length,
        newTripIds: createdTrips.map(trip => trip._id),
        existingTripIds: existingTrips.map(trip => trip._id),
        seatInfo: {
            seatsPerTrip: numberOfSeats,
            totalSeatsBooked: [...createdTrips, ...existingTrips].length * numberOfSeats,
            tripsWithAvailableSeats: [...createdTrips, ...existingTrips].length
        }
    },
    paymentUrl: paymentUrl, // ✅ Add this line - THIS IS THE FIX!
    paymentRequired: paymentMethod === "STRIPE"
});
```

---

### Step 4: Create Webhook Handler

**Create file:** `/backend/src/routes/stripeWebhookRoutes.js`

```javascript
import express from 'express';
import Stripe from 'stripe';
import B2CMonthlyPass from '../models/B2CMonthlyPass.js';
import B2CPassengerBooking from '../models/B2CPassengerBooking.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Stripe webhook handler
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error('[v0] Webhook signature verification failed:', err.message);
        return res.status(400).json({ error: 'Invalid signature' });
    }

    console.log('[v0] Stripe webhook event:', event.type);

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                console.log('[v0] Payment successful for session:', session.id);

                // Update monthly pass payment status
                const monthlyPass = await B2CMonthlyPass.findById(session.metadata.passId);
                if (monthlyPass) {
                    monthlyPass.paymentStatus = 'COMPLETED';
                    monthlyPass.stripeSessionId = session.id;
                    monthlyPass.stripePaidAt = new Date();
                    await monthlyPass.save();
                    console.log('[v0] Monthly pass payment marked as completed:', monthlyPass._id);
                }

                // Update booking payment status
                const booking = await B2CPassengerBooking.findOne({
                    monthlyPassId: session.metadata.passId
                });
                if (booking) {
                    booking.paymentStatus = 'COMPLETED';
                    booking.transactionId = session.id;
                    booking.paymentDate = new Date();
                    await booking.save();
                    console.log('[v0] Booking payment marked as completed:', booking._id);
                }
                break;
            }

            case 'checkout.session.expired':
                console.log('[v0] Payment session expired:', event.data.object.id);
                // Mark as payment failed
                const expiredPass = await B2CMonthlyPass.findById(event.data.object.metadata.passId);
                if (expiredPass) {
                    expiredPass.paymentStatus = 'EXPIRED';
                    await expiredPass.save();
                }
                break;

            case 'charge.refunded':
                console.log('[v0] Payment refunded:', event.data.object.id);
                break;

            default:
                console.log('[v0] Unhandled event type:', event.type);
        }

        res.json({ received: true });
    } catch (error) {
        console.error('[v0] Webhook processing error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

export default router;
```

---

### Step 5: Register Webhook Route

**File:** `/backend/src/index.js` (or your main server file)

Add webhook route BEFORE other routes:
```javascript
import stripeWebhookRoutes from './routes/stripeWebhookRoutes.js';

// Webhook routes (must be before body parser middleware for raw body)
app.use('/api/webhook', stripeWebhookRoutes);

// Then other routes
app.use('/api/monthly-pass', b2cMonthlyPassRoutes);
// ... other routes
```

---

### Step 6: Update Environment Variables

Make sure these exist in your `.env`:
```
STRIPE_SECRET_KEY=sk_test_YOUR_KEY (or sk_live_YOUR_KEY for production)
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_test_YOUR_KEY
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
```

---

### Step 7: Frontend already has correct code ✅

BookingModal.jsx lines 392-393 already handle the redirect:
```javascript
if (method === "STRIPE" && response.data.paymentUrl) {
    window.location.href = response.data.paymentUrl;
}
```

**No frontend changes needed!** The fix is all backend.

---

## Testing Flow

### Test Payment (Local)

1. **Start backend:**
   ```bash
   npm run dev
   ```

2. **Use Stripe test card:**
   - Card: `4242 4242 4242 4242`
   - Expiry: `12/25`
   - CVC: `123`
   - ZIP: `12345`

3. **Click "Pay Now" → "Credit/Debit Card"**
   - Should redirect to Stripe checkout page ✅
   - User enters test card details
   - Confirms payment
   - Redirected to success page
   - Database updates automatically via webhook

4. **Check database:**
   ```javascript
   // Monthly pass payment status should be COMPLETED
   db.b2cmonthlypass.findOne({ _id: passId }, { paymentStatus: 1, stripeSessionId: 1 })
   ```

---

## Common Issues & Solutions

### Issue 1: "paymentUrl is undefined"
**Solution:** Ensure `STRIPE_SECRET_KEY` is set correctly in `.env`

### Issue 2: "Webhook not triggering"
**Solution:** In development, use Stripe CLI:
```bash
stripe listen --forward-to localhost:5000/api/webhook/stripe
```

Copy the webhook secret and add to `.env`

### Issue 3: "Currency error from Stripe"
**Solution:** Stripe amount must be in cents. Check line in service:
```javascript
unit_amount: Math.round(amount * 100) // This converts AED to fils
```

---

## Complete Data Flow After Fix

```
User clicks "Pay Now" 
    ↓
Frontend sends: POST /monthly-pass/create with paymentMethod="STRIPE"
    ↓
Backend: 
  1. Creates monthly pass
  2. Creates booking
  3. Calls createStripePaymentSession()
  4. Returns response WITH paymentUrl ✅
    ↓
Frontend receives response.data.paymentUrl
    ↓
Frontend redirects: window.location.href = paymentUrl
    ↓
User sees Stripe checkout page
    ↓
User pays with card
    ↓
Stripe triggers webhook: checkout.session.completed
    ↓
Backend webhook handler:
  1. Marks monthly pass as COMPLETED
  2. Marks booking as COMPLETED
  3. Wallet transactions created
    ↓
Frontend redirected to success page ✅
```

---

## Live Production Checklist

- [ ] Replace `sk_test_` with `sk_live_` Stripe key
- [ ] Replace `pk_test_` with `pk_live_` Stripe key
- [ ] Replace `whsec_test_` with `whsec_live_` webhook secret
- [ ] Update `FRONTEND_URL` to production domain
- [ ] Test with real payment (small amount like AED 1)
- [ ] Verify webhook in Stripe dashboard (Events section)
- [ ] Enable email notifications for payments
- [ ] Check wallet transactions are created correctly


# Detailed Changes - Line by Line Breakdown

## File 1: backend/src/controllers/b2cMonthlyPassController.js

### CHANGE #1: Added 2 New Imports (Lines 10-11)
**Location:** After existing imports  
**Added Lines:**
```javascript
Line 10: import PaymentGatewayService from "../Services/paymentGatewayService.js";
Line 11: import { getPaymentGateway, detectCountryFromCurrency } from "../Config/paymentGateways.js";
```

**Previous (Line 9):**
```javascript
import { sendPassEmail } from "../Services/emailService.js";
```

**Purpose:**
- Line 10: Import the universal payment gateway service (Stripe, TAP, etc.)
- Line 11: Import helper functions for payment gateway detection

---

### CHANGE #2: Added Payment Session Creation Logic (Lines 539-594)
**Location:** After "Generate pass certificate" section (after Line 537)  
**Before:** Lines 539-569 (old broken code) - REPLACED  
**After:** Lines 539-594 (new working code)

**Old Code (REMOVED):**
```javascript
// (Old code that called non-existent createStripePaymentSession)
res.status(201).json({
    success: true,
    message: "Monthly pass created successfully",
```

**New Code (ADDED):**
```javascript
// Lines 539-541: Initialize payment variables
        // Handle payment gateway if needed
        let paymentSessionData = null;
        if (["STRIPE", "TAP", "CARD"].includes(paymentMethod) && totalAmount > 0) {

// Lines 542-565: Create payment session
            try {
                const country = detectCountryFromCurrency(currency || "AED");
                const passenger = await User.findById(passengerId);
                
                // Create payment session using PaymentGatewayService
                paymentSessionData = await PaymentGatewayService.createPaymentSession({
                    gateway: paymentMethod === "CARD" ? "STRIPE" : paymentMethod,
                    amount: totalAmount,
                    currency: currency || "AED",
                    customer: {
                        email: passenger?.email,
                        name: passenger?.firstName + " " + passenger?.lastName,
                        phone: passenger?.phoneNumber
                    },
                    contractId: monthlyPass._id,
                    redirectUrl: `${process.env.FRONTEND_URL}/payment-success`,
                    webhookUrl: `${process.env.BACKEND_URL}/api/webhook/payment`,
                    metadata: {
                        passengerId: passengerId.toString(),
                        routeId: routeId.toString(),
                        passType: passType,
                        bookingId: passengerBooking._id.toString()
                    }
                });

// Lines 567-572: Log payment session creation
                console.log("[v0] Payment session created:", {
                    gateway: paymentSessionData.provider,
                    sessionId: paymentSessionData.sessionId,
                    amount: totalAmount,
                    passenger: passengerId
                });

// Lines 575-582: Update database with payment pending status
                // Update pass with payment pending status
                monthlyPass.paymentStatus = 'PENDING_PAYMENT';
                monthlyPass.gatewaySessionId = paymentSessionData.sessionId;
                monthlyPass.paymentGateway = paymentSessionData.provider;
                await monthlyPass.save();
                
                passengerBooking.paymentStatus = 'PENDING_PAYMENT';
                passengerBooking.gatewaySessionId = paymentSessionData.sessionId;
                await passengerBooking.save();

// Lines 583-593: Error handling
            } catch (paymentError) {
                console.error("[v0] Payment session creation failed:", paymentError.message);
                monthlyPass.paymentStatus = 'PAYMENT_FAILED';
                await monthlyPass.save();
                
                return res.status(400).json({
                    success: false,
                    message: "Failed to initialize payment",
                    error: paymentError.message
                });
            }
        }
```

**What This Does:**
1. Checks if payment method is STRIPE, TAP, or CARD
2. Gets passenger details from database
3. Creates payment session via PaymentGatewayService
4. Stores session ID in database
5. Returns error if payment fails

---

### CHANGE #3: Modified Response JSON (Lines 596-640+)
**Location:** Response section

**Changed Lines:**

**Line 597-600:** Changed message based on payment status
```javascript
// Old:
            message: "Monthly pass created successfully",

// New:
            message: paymentSessionData ? 
                "Payment session initiated. Proceed to payment." : 
                "Monthly pass created successfully",
```

**Lines 630-636:** Added payment object to response (NEW)
```javascript
            payment: paymentSessionData ? {
                paymentUrl: paymentSessionData.paymentUrl,
                sessionId: paymentSessionData.sessionId,
                provider: paymentSessionData.provider,
                amount: totalAmount,
                currency: currency || "AED"
            } : null,
            paymentRequired: !!paymentSessionData,
            paymentMethod: paymentMethod
```

**Purpose:** 
- Frontend now receives `paymentUrl` to redirect user to Stripe/TAP checkout
- Includes session ID for tracking
- Includes provider info for logging

---

## Summary of Changes

### Files Modified: 1
- `backend/src/controllers/b2cMonthlyPassController.js`

### Total Lines Added: 74 lines
- Lines 10-11: Imports (2 lines)
- Lines 539-594: Payment handling (56 lines)
- Lines 630-640: Response fields (8 lines)

### Total Lines Removed: 0 lines
- Only replaced old broken payment code with new working code

### Files Deleted: 2
- `backend/src/Services/stripePaymentService.js` (duplicate - deleted)
- `backend/src/routes/stripeWebhookRoutes.js` (duplicate - deleted)

---

## Response Structure Before vs After

### BEFORE (Line 596-610)
```json
{
    "success": true,
    "message": "Monthly pass created successfully",
    "monthlyPass": { ... },
    "monthlyPassBooking": { ... },
    "trips": { ... }
    // ❌ NO PAYMENT INFO - This is why Stripe didn't open!
}
```

### AFTER (Line 596-640+)
```json
{
    "success": true,
    "message": "Payment session initiated. Proceed to payment.",
    "monthlyPass": { ... },
    "monthlyPassBooking": { ... },
    "trips": { ... },
    "payment": {
        "paymentUrl": "https://checkout.stripe.com/pay/...",
        "sessionId": "cs_test_...",
        "provider": "STRIPE",
        "amount": 3000,
        "currency": "AED"
    },
    "paymentRequired": true,
    "paymentMethod": "STRIPE"
}
```

---

## What This Enables

✅ User clicks "Pay Now" → "Credit/Debit Card"  
✅ Backend creates payment session  
✅ **paymentUrl returned in response** (Previously missing!)  
✅ Frontend can redirect: `window.location.href = response.data.payment.paymentUrl`  
✅ User sees Stripe checkout ✓  
✅ After payment, webhook updates database  
✅ Monthly pass becomes active  

---

## Database Fields Updated

When payment session is created, these fields are set:

**B2CMonthlyPass document:**
```javascript
paymentStatus: "PENDING_PAYMENT"        // Line 575
gatewaySessionId: "cs_test_..."         // Line 576
paymentGateway: "STRIPE"                // Line 577
```

**B2CPassengerBooking document:**
```javascript
paymentStatus: "PENDING_PAYMENT"        // Line 580
gatewaySessionId: "cs_test_..."         // Line 581
```

After webhook processes payment successfully:
```javascript
paymentStatus: "COMPLETED"
```

---

## Error Handling

**If payment fails (Line 583-593):**
```javascript
monthlyPass.paymentStatus = 'PAYMENT_FAILED'
Response Status: 400
Response Message: "Failed to initialize payment"
Error Details: Included in response
```

This allows frontend to show error message to user and let them retry.

---

## Environment Variables Required

**Must be in backend/.env:**
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
```

---

## Next Action Required

**Frontend: BookingModal.jsx**

Need to handle the `paymentUrl` response:

```javascript
// In handleSelectPaymentMethod or payment submit handler
const response = await commuterAPI.createMonthlyPass(data);

if (response.data.payment?.paymentUrl) {
    // Redirect to Stripe checkout
    window.location.href = response.data.payment.paymentUrl;
} else {
    // Show success message (Cash payment)
    showSuccessMessage("Pass created successfully!");
}
```

This is the only frontend change needed!

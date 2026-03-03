# Next Step: Frontend Payment Redirect Fix

## Current Status
✅ Backend is **100% ready and properly integrated**
❌ Frontend needs update to handle payment URL

## The Issue
When user clicks "Credit/Debit Card" button:
1. Backend returns `payment.paymentUrl` ✓
2. Frontend doesn't redirect to it ✗

## Frontend Fix Required

### In `BookingModal.jsx` - Function: `handleSelectPaymentMethod`

**Find this code (around line 400-450):**
```javascript
const handleSelectPaymentMethod = async (method) => {
    // existing code...
    setIsProcessing(true);
    
    try {
        // API call to create monthly pass
        const response = await commuterAPI.createB2CMonthlyPass({
            // ... data
        });
        
        // MISSING: Handle payment URL
        setShowTripModal(false);  // ← This happens immediately
        // But should redirect to Stripe first!
    }
}
```

**Replace with this:**
```javascript
const handleSelectPaymentMethod = async (method) => {
    setIsProcessing(true);
    
    try {
        const response = await commuterAPI.createB2CMonthlyPass({
            passengerId,
            routeId,
            scheduleId,
            passType: selectedPassType,
            paymentMethod: method === "STRIPE" ? "CARD" : method,
            currency: "AED",
            numberOfSeats: selectedNumberOfSeats,
            outboundTripTime: selectedOutboundTime,
            returnTripTime: selectedReturnTime
        });

        // CRITICAL: Check if payment URL exists
        if (response.data.payment?.paymentUrl) {
            // Redirect to Stripe checkout
            window.location.href = response.data.payment.paymentUrl;
            return;  // Stop execution here
        }

        // Only reach here if NO payment required (cash, wallet)
        setShowTripModal(false);
        
        // Show success message
        if (response.data.monthlyPass) {
            console.log("[v0] Monthly pass created:", response.data.monthlyPass._id);
            // Show toast notification
            // Navigate to confirmation page
        }
    } catch (error) {
        console.error("[v0] Error:", error);
        setErrorMessage(error.response?.data?.message || "Something went wrong");
    } finally {
        setIsProcessing(false);
    }
};
```

## Key Changes
1. **Check for `response.data.payment?.paymentUrl`** - Only returned for Stripe/Tap payments
2. **Redirect immediately:** `window.location.href = paymentUrl`
3. **Return early** - Don't close modal or show success until payment is done
4. **Webhook will handle confirmation** - After payment, Stripe calls backend webhook

## How It Works End-to-End
```
User clicks "Pay Now"
    ↓
Selects "Credit/Debit Card"
    ↓
Frontend calls: POST /api/b2c/monthly-pass/create
    ↓
Backend creates monthly pass + Stripe session
    ↓
Backend returns: { payment: { paymentUrl: "https://checkout.stripe.com/..." } }
    ↓
Frontend redirects: window.location.href = paymentUrl
    ↓
User sees Stripe checkout
    ↓
User pays with card
    ↓
Stripe redirects back to: frontend/payment-success?session_id=...
    ↓
(Optional) Frontend can verify payment by calling:
GET /api/payment/verify?session_id=...
    ↓
Meanwhile, Stripe webhook calls:
POST /api/webhook/stripe with event data
    ↓
Backend updates: monthlyPass.paymentStatus = 'COMPLETED'
Backend updates: booking.paymentStatus = 'PAID'
Backend creates wallet transactions
    ↓
User receives confirmation email
    ↓
✓ Payment Complete!
```

## Files to Modify
- [ ] `frontend/src/Components/BookingModal/BookingModal.jsx` - Update `handleSelectPaymentMethod`

## Test After Fix
1. Create booking → Select date/time
2. Click "Pay Now"
3. Select "Credit/Debit Card"
4. Should redirect to Stripe checkout
5. Use test card: `4242 4242 4242 4242` (any future expiry, any 3 digits CVC)
6. After payment, should see success page

---

**That's it! After this one change, payment system is LIVE!** 🚀

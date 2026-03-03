# BookingModal.jsx - Exact Changes Required

## File Path
`frontend/src/Components/BookingModal/BookingModal.jsx`

---

## CHANGE #1: Update handleSelectPaymentMethod Function (Lines 363-411)

### Current Code (BROKEN - Lines 387-400):
```javascript
    try {
      const response = await api.post('/monthly-pass/create', bookingData);

      if (response.data.success) {
        // Handle payment redirect for STRIPE
        if (method === "STRIPE" && response.data.paymentUrl) {
          window.location.href = response.data.paymentUrl;
        } else if (method === "CASH") {
          // Show success message for cash payment
          setStep(3);
          setTimeout(() => {
            if (onSuccess) onSuccess();
          }, 2000);
        }
      } else {
        console.error("Monthly pass creation failed:", response.data.message);
        alert(response.data.message || "Failed to create monthly pass");
      }
    } catch (err) {
      console.error("Booking error:", err);
      alert("Failed to create monthly pass. Please try again.");
    } finally {
      setIsProcessing(false);
    }
```

### Problem:
1. Line 392 checks for `response.data.paymentUrl` ❌ WRONG
2. New backend returns `response.data.payment.paymentUrl` ✅ CORRECT
3. Line 394 doesn't handle TAP payment - just passes through
4. Need to check for payment.paymentUrl instead

---

### FIXED Code (What to Replace With):
```javascript
    try {
      const response = await api.post('/monthly-pass/create', bookingData);

      if (response.data.success) {
        // Handle payment redirect for STRIPE or TAP
        if (response.data.payment?.paymentUrl) {
          // Redirect to payment gateway (Stripe or TAP)
          console.log("[v0] Redirecting to payment URL:", response.data.payment.paymentUrl);
          window.location.href = response.data.payment.paymentUrl;
          return; // Important: Stop execution after redirect
        } else if (method === "CASH") {
          // Show success message for cash payment
          console.log("[v0] Cash payment selected - showing success");
          setStep(3);
          setTimeout(() => {
            if (onSuccess) onSuccess();
          }, 2000);
        } else {
          // Payment method without redirect (should not happen)
          alert("Payment method not supported");
        }
      } else {
        console.error("Monthly pass creation failed:", response.data.message);
        alert(response.data.message || "Failed to create monthly pass");
      }
    } catch (err) {
      console.error("Booking error:", err);
      alert("Failed to create monthly pass. Please try again.");
    } finally {
      setIsProcessing(false);
    }
```

---

## Detailed Breakdown of Changes

### Line 392: CHANGE THIS
```javascript
// BEFORE:
if (method === "STRIPE" && response.data.paymentUrl) {
  window.location.href = response.data.paymentUrl;

// AFTER:
if (response.data.payment?.paymentUrl) {
  console.log("[v0] Redirecting to payment URL:", response.data.payment.paymentUrl);
  window.location.href = response.data.payment.paymentUrl;
  return;
```

### Line 394-400: CHANGE THIS
```javascript
// BEFORE:
} else if (method === "CASH") {
  // Show success message for cash payment
  setStep(3);
  setTimeout(() => {
    if (onSuccess) onSuccess();
  }, 2000);
}

// AFTER:
} else if (method === "CASH") {
  // Show success message for cash payment
  console.log("[v0] Cash payment selected - showing success");
  setStep(3);
  setTimeout(() => {
    if (onSuccess) onSuccess();
  }, 2000);
} else {
  // Payment method without redirect (should not happen)
  alert("Payment method not supported");
}
```

---

## What Each Change Does

| Line | What | Why Changed |
|------|------|------------|
| 392 | `response.data.payment?.paymentUrl` | Backend now returns nested `payment` object |
| 393 | Added `console.log` | For debugging payment flow |
| 394 | Added `return;` | Stops further execution after redirect |
| 397 | Added `console.log` | For debugging cash payment |
| 401-404 | Added else block | Safety check for unknown payment methods |

---

## Summary

**What's Different:**
- Old: `response.data.paymentUrl` (direct access)
- New: `response.data.payment.paymentUrl` (nested object)

**Why:**
Backend now returns a payment object with:
```javascript
payment: {
  paymentUrl: "https://stripe.com/pay/...",
  sessionId: "...",
  provider: "STRIPE",
  amount: 3000,
  currency: "AED"
}
```

**Result:**
When user clicks "Credit/Debit Card" → Stripe popup opens ✅

---

## Testing After Change

1. Click "Pay Now" button
2. Select "Credit/Debit Card" (STRIPE)
3. Should see **Stripe Checkout page** (not modal) ✅
4. Use test card: `4242 4242 4242 4242` (12/25, 123)
5. Complete payment
6. Get redirected to success page ✅

---

## No Other Files Need Changes

✅ Backend: Done  
✅ BookingModal.jsx: Just the payment handler  
❌ No other frontend files needed

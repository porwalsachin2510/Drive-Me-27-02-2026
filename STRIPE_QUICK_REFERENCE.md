# ⚡ Stripe Integration - Quick Reference Card

## 🔑 Environment Variables

```bash
# Copy to your .env file

# STRIPE TEST KEYS (from dashboard)
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_test_YOUR_KEY_HERE

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
```

---

## 📡 API Endpoints (Already Implemented)

### Create Payment Session
```bash
POST /api/contracts/{contractId}/payment

Headers:
  Authorization: Bearer {token}
  Content-Type: application/json

Body:
  {
    "paymentMethod": "CARD",
    "paymentType": "advance",
    "currency": "AED"
  }

Response:
  {
    "sessionId": "cs_test_...",
    "paymentUrl": "https://checkout.stripe.com/pay/..."
  }
```

### Verify Payment
```bash
GET /api/payment/verify?session_id={sessionId}&provider=stripe

Headers:
  Authorization: Bearer {token}

Response:
  {
    "payment": { "status": "COMPLETED" },
    "contract": { "status": "ACTIVE" }
  }
```

### Get Payment Status
```bash
GET /api/contracts/{contractId}/payment

Headers:
  Authorization: Bearer {token}

Response:
  {
    "payment": { ... }
  }
```

### Webhook Endpoint
```bash
POST /api/webhook/stripe

No auth needed!
Stripe signature verification happens server-side
```

---

## 🧪 Test Card Numbers

| Purpose | Card Number | Expiry | CVC |
|---------|-----------|--------|-----|
| ✓ Success | 4242 4242 4242 4242 | 12/25 | 123 |
| ✗ Decline | 4000 0000 0000 0002 | 12/25 | 123 |
| 🔐 3D Secure | 4000 0025 0000 3155 | 12/25 | 123 |
| ✗ Expired | 4000 0000 0000 0069 | 12/20 | 123 |

---

## 🚀 Payment Flow (5 Steps)

```
1. User Clicks "Pay Now"
   ↓
2. Frontend: POST /api/contracts/{id}/payment
   ↓
3. Redirect: window.location.href = paymentUrl
   ↓
4. User enters card on Stripe checkout
   ↓
5. Webhook: Stripe calls POST /api/webhook/stripe
   ↓
6. Updated: Payment & Contract marked COMPLETED
```

---

## 🔧 Frontend Implementation

```jsx
// components/PaymentButton.jsx

async function handlePayment(contractId) {
  const response = await fetch(
    `${API_URL}/contracts/${contractId}/payment`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        paymentMethod: 'CARD',
        paymentType: 'advance',
        currency: 'AED'
      })
    }
  );

  const data = await response.json();
  
  // Redirect to Stripe
  window.location.href = data.data.paymentSession.paymentUrl;
}
```

---

## 🎯 Key Points

### Database Changes After Payment

```javascript
// Payment Document
{
  status: "COMPLETED",           // ✓ Updated by webhook
  gatewayTransactionId: "pi_..."  // ✓ From Stripe
}

// Contract Document
{
  status: "ACTIVE",              // ✓ Updated by webhook
  paymentStatus: "PAID"           // ✓ Updated by webhook
}

// Wallet Transactions (Created)
{
  Admin: +500 AED,               // 10% commission
  FleetOwner: +4500 AED          // 90% of advance
}
```

### Security Checklist

- ✓ Payment amounts validated server-side
- ✓ User authorization checked
- ✓ Webhook signature verified
- ✓ Never store card data (Stripe handles it)
- ✓ SSL/TLS for all URLs
- ✓ Environment variables not in code

---

## ⚠️ Common Mistakes

```javascript
// ❌ DON'T: Pass amount from frontend
const amount = req.body.amount;

// ✅ DO: Get from database
const contract = await Contract.findById(req.params.contractId);
const amount = contract.financials.advancePayment.amount;

// ❌ DON'T: Store webhook secret in code
const secret = "whsec_...";

// ✅ DO: Use environment variable
const secret = process.env.STRIPE_WEBHOOK_SECRET;

// ❌ DON'T: Skip signature verification
const event = stripe.webhooks.constructEvent(body, sig, secret);

// ✓ CORRECT: Always verify
try {
  const event = stripe.webhooks.constructEvent(body, sig, secret);
} catch (err) {
  return res.status(400).send('Invalid');
}
```

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Webhook not working | Check URL in Stripe dashboard is correct |
| Payment stuck in PROCESSING | Check Stripe webhook deliveries, manually verify |
| "Invalid signature" | Update STRIPE_WEBHOOK_SECRET from Stripe CLI |
| Card declined in test | Use 4242 4242 4242 4242 (success card) |
| Session not found | Webhook may have processed first (check DB) |

---

## 📞 Get Help

- **Stripe Docs:** https://stripe.com/docs
- **Test Cards:** https://stripe.com/docs/testing
- **Webhooks:** https://stripe.com/docs/webhooks
- **Dashboard:** https://dashboard.stripe.com

---

## ✅ Pre-Launch Checklist

- [ ] STRIPE_SECRET_KEY set
- [ ] STRIPE_WEBHOOK_SECRET set
- [ ] Webhook URL added to Stripe dashboard
- [ ] Test payment works end-to-end
- [ ] Database updates correctly
- [ ] Wallet transactions created
- [ ] Error handling tested
- [ ] Webhook retry tested

---

## 🎯 Next Steps

1. **Get Stripe Keys** (5 min)
   - https://dashboard.stripe.com → Developers → API keys

2. **Add Webhook** (5 min)
   - Dashboard → Webhooks → Add endpoint
   - URL: `https://yourdomain.com/api/webhook/stripe`

3. **Set Environment Variables** (2 min)
   - Add to `.env` file
   - Restart backend

4. **Test Payment** (10 min)
   - Create contract
   - Click "Pay Now"
   - Use test card: 4242 4242 4242 4242
   - Verify in database

5. **Go Live** (when ready)
   - Get live keys from Stripe
   - Update environment variables
   - Update webhook URL
   - Deploy

---

**Last Updated:** March 3, 2024 ✅
**Status:** Ready to Use

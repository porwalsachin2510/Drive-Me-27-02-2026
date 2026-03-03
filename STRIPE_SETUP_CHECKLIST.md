# ✅ Stripe Setup - Quick Checklist

## 🎯 Your Application Endpoints

### Payment Endpoints (Already Configured in Backend)

```
┌─────────────────────────────────────────────────────────────────┐
│                    YOUR API ENDPOINTS                            │
├─────────────────────────────────────────────────────────────────┤

1️⃣  CREATE PAYMENT SESSION
   Method:   POST
   Endpoint: /api/contracts/{contractId}/payment
   Auth:     ✓ Required (Bearer token)
   Body:     {
               "paymentMethod": "CARD",
               "paymentType": "advance",
               "currency": "AED"
             }
   Returns:  sessionId, paymentUrl
   
   Called by: User clicks "Pay Now" button

2️⃣  VERIFY PAYMENT
   Method:   GET
   Endpoint: /api/payment/verify?session_id={id}&provider=stripe
   Auth:     ✓ Required (Bearer token)
   Returns:  payment status, contract status
   
   Called by: Frontend after Stripe redirects user

3️⃣  GET PAYMENT STATUS
   Method:   GET
   Endpoint: /api/contracts/{contractId}/payment
   Auth:     ✓ Required (Bearer token)
   Returns:  payment details
   
   Called by: Check payment status anytime

4️⃣  STRIPE WEBHOOK (CRITICAL)
   Method:   POST
   Endpoint: /api/webhook/stripe
   Auth:     ✗ NO Auth (signature verified)
   URL:      https://yourdomain.com/api/webhook/stripe
   Events:   checkout.session.completed, payment_intent.succeeded
   
   Called by: Stripe automatically after payment success

└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Pre-Setup Checklist

### 1. Backend Setup ✓ (Already Done)

```
✓ Stripe config file exists: backend/src/Config/stripe.js
✓ Payment controller exists: backend/src/controllers/paymentController.js
✓ Payment model exists: backend/src/models/Payment.js
✓ Payment routes exist: backend/src/routes/paymentRoutes.js
✓ Webhook handlers implemented
✓ Wallet integration ready
```

### 2. Environment Variables Setup

**Add these to your `.env` file:**

```bash
# ========== STRIPE (TEST MODE) ==========
STRIPE_SECRET_KEY=sk_test_YOUR_TEST_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_TEST_PUBLISHABLE_KEY_HERE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_TEST_PUBLISHABLE_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_test_YOUR_WEBHOOK_SECRET_HERE

# Or for LIVE MODE (only after verification):
# STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY_HERE
# STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY_HERE
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY_HERE
# STRIPE_WEBHOOK_SECRET=whsec_live_YOUR_WEBHOOK_SECRET_HERE

# ========== APPLICATION URLS ==========
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000

# For production:
# FRONTEND_URL=https://yourdomain.com
# BACKEND_URL=https://api.yourdomain.com
```

---

## 🔑 Step 1: Get Stripe Keys

### Get API Keys

```
1. Go to: https://stripe.com/dashboard
2. Login to your account
3. Click: Developers (top right)
4. Click: API keys
5. Toggle: TEST MODE (left side)
6. You'll see:
   - Publishable key: pk_test_...
   - Secret key: sk_test_...
7. Copy both keys to your .env file
```

---

## 🔗 Step 2: Setup Webhook Endpoint

### Add Webhook in Stripe Dashboard

```
1. Go to: Stripe Dashboard → Developers → Webhooks
2. Click: Add an endpoint
3. Enter webhook URL:
   ├─ Local testing: 
   │  └─ Use Stripe CLI (see below)
   ├─ Staging:
   │  └─ https://staging.yourdomain.com/api/webhook/stripe
   └─ Production:
      └─ https://yourdomain.com/api/webhook/stripe
4. Select events:
   ☑ checkout.session.completed
   ☑ payment_intent.succeeded
   ☑ charge.refunded
5. Click: Add endpoint
6. Copy signing secret: whsec_test_...
7. Add to .env: STRIPE_WEBHOOK_SECRET=whsec_test_...
```

### Test Webhook Locally (Stripe CLI)

```bash
# 1. Download and install Stripe CLI
# https://stripe.com/docs/stripe-cli
# Or: brew install stripe/stripe-cli/stripe

# 2. Login to Stripe
stripe login
# Follow link to authorize

# 3. Listen for webhooks
stripe listen --forward-to http://localhost:5000/api/webhook/stripe

# Output:
# > Ready! Your webhook signing secret is: whsec_test_...
# Copy this and add to .env: STRIPE_WEBHOOK_SECRET=whsec_test_...

# 4. Keep this running! It forwars Stripe events to your local server

# 5. In another terminal, trigger test events:
stripe trigger checkout.session.completed

# 6. Watch your backend logs for webhook processing
```

---

## 🧪 Step 3: Test Payment Flow

### Complete Test Walkthrough

```
1. START YOUR APPLICATION
   ├─ Backend: npm start (in backend/)
   ├─ Frontend: npm start (in frontend/)
   └─ Stripe CLI: stripe listen --forward-to http://localhost:5000/api/webhook/stripe

2. CREATE A CONTRACT (if testing with new contract)
   ├─ Go to admin panel or API
   └─ Create contract between corporate and fleet owner

3. INITIATE PAYMENT
   ├─ Click "Pay Now" or "Make Payment" button
   ├─ Application calls: POST /api/contracts/{contractId}/payment
   ├─ Backend creates Stripe session
   ├─ Frontend redirects to Stripe Checkout page

4. ENTER TEST CARD DETAILS
   ├─ Card Number: 4242 4242 4242 4242
   ├─ Expiry: 12/25 (any future month/year)
   ├─ CVC: 123
   ├─ Name: Test User
   └─ Click: Pay

5. STRIPE PROCESSES
   ├─ Shows "Processing..." or loading
   ├─ Webhook is triggered automatically
   └─ Your backend receives: checkout.session.completed event

6. WEBHOOK PROCESSING
   ├─ Stripe CLI shows: Event received
   ├─ Backend logs show: [v0] Stripe webhook received
   ├─ Payment status updated to COMPLETED
   ├─ Contract status updated to ACTIVE
   ├─ Wallet transactions created
   └─ Database updated

7. PAYMENT SUCCESS
   ├─ Frontend shows success message
   ├─ User redirected to dashboard
   ├─ Contract shows "ACTIVE" status
   └─ Payment history shows completed transaction

8. VERIFY IN STRIPE DASHBOARD
   ├─ Go to: Stripe Dashboard → Payments
   ├─ Find your test payment
   ├─ Status: Succeeded
   └─ Amount: 5000 (or test amount) AED
```

### Database Verification

```bash
# Check MongoDB for payment record:

# 1. Connect to MongoDB
mongosh

# 2. Check payment document
use drive_me_db
db.payments.findOne({ 
  status: "COMPLETED" 
})

# Output should show:
{
  _id: ObjectId,
  contractId: ObjectId,
  amount: 5000,
  status: "COMPLETED",
  gatewaySessionId: "cs_test_...",
  gatewayTransactionId: "pi_...",
  verifiedAt: ISODate("2024-03-03T...")
}

# 3. Check contract document
db.contracts.findOne({ 
  _id: ObjectId("...") 
})

# Output should show:
{
  _id: ObjectId,
  status: "ACTIVE",           ← Updated from PENDING_PAYMENT
  paymentStatus: "PAID",      ← Updated
  activationDate: ISODate("2024-03-03T...")
}

# 4. Check wallet transactions
db.transactions.find({ 
  paymentId: ObjectId("...") 
})

# Output should show 2 transactions:
# - Admin commission: +500 AED
# - Fleet owner: +4500 AED
```

---

## 🚨 Step 4: Test Error Scenarios

### Test Payment Decline

```
1. On Stripe checkout form, enter:
   ├─ Card: 4000 0000 0000 0002
   ├─ Expiry: 12/25
   ├─ CVC: 123
   └─ Click: Pay

2. Expected Result:
   ├─ Stripe shows: "Card was declined"
   ├─ Payment status: FAILED
   └─ Contract status: Still PENDING_PAYMENT

3. Check Database:
   db.payments.findOne({ status: "FAILED" })
   ├─ Should exist
   ├─ failureReason: populated
   └─ contract still unpaid
```

### Test 3D Secure (Authentication Required)

```
1. On Stripe checkout form, enter:
   ├─ Card: 4000 0025 0000 3155
   ├─ Expiry: 12/25
   ├─ CVC: 123
   └─ Click: Pay

2. Expected Result:
   ├─ 3D Secure popup appears
   ├─ Click: Complete authentication
   ├─ Payment succeeds
   └─ Same flow as normal payment
```

---

## 📊 Step 5: Monitoring & Logs

### What to Watch For

```
✅ SUCCESSFUL PAYMENT LOGS:
   [v0] Create payment request received
   [v0] Contract ID: 60d5ec...
   [v0] Payment Reference: FLT-1709462...
   [v0] Payment record created: 60d5ec...
   [v0] Stripe webhook received
   [v0] Event type: checkout.session.completed
   [v0] Payment verified and updated: 60d5ec...
   [v0] Contract status updated: ACTIVE
   [v0] Wallet transactions created

❌ PAYMENT FAILURE LOGS:
   [v0] Create payment error: ...
   [v0] Payment session creation error: ...
   [v0] Webhook signature verification failed
   [v0] Stripe webhook error: ...
```

### Check Webhook Deliveries

```
Stripe Dashboard → Developers → Webhooks → Click endpoint

You'll see:
├─ Recent deliveries (successful ✓ or failed ✗)
├─ Click on delivery to see:
│  ├─ Request sent to your webhook
│  ├─ Response from your server
│  └─ Timestamp
└─ Retry failed deliveries manually
```

---

## 🚀 Step 6: Going Live

### Switch from Test to Live

```
1. Complete Stripe Verification
   ├─ Provide business info
   ├─ Add bank account
   ├─ Verify identity
   └─ Wait for approval (~1-3 days)

2. Get Live Keys
   ├─ Stripe Dashboard
   ├─ Toggle: TEST MODE → LIVE MODE
   ├─ Copy: pk_live_... and sk_live_...
   └─ Get new webhook secret: whsec_live_...

3. Update .env (Production Server)
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_PUBLISHABLE_KEY=pk_live_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_live_...

4. Update Webhook in Stripe Dashboard
   ├─ Remove old test endpoint
   ├─ Add new live endpoint:
   │  └─ https://yourdomain.com/api/webhook/stripe
   └─ Copy live webhook secret: whsec_live_...

5. Deploy Production
   ├─ Push code changes
   ├─ Update environment variables
   ├─ Restart application
   └─ Test with real payment (if possible)

6. Monitor Production
   ├─ Set up error alerts
   ├─ Monitor webhook deliveries
   ├─ Track failed payments
   └─ Review payment reports daily
```

---

## 🔐 Security Checklist

```
Before going LIVE, ensure:

☑ SSL/TLS certificate (https://)
☑ Environment variables secured (not in code)
☑ Webhook signature verified
☑ Payment amounts validated server-side
☑ User authorization checked
☑ Rate limiting on payment endpoint
☑ Database backups working
☑ Error messages safe (no card data)
☑ Logging doesn't store sensitive info
☑ CORS configured correctly
☑ PCI compliance understood
☑ Refund process tested
☑ Response timeout handled
☑ Webhook retry logic working
☑ Database transactions atomic
☑ Wallet ledger accurate
```

---

## 📞 Troubleshooting

### Webhook Not Receiving

**Problem:** Webhook never called, payment stuck in PROCESSING

**Solutions:**
```
1. Check Stripe Dashboard → Webhooks
   ├─ Is endpoint green? (active)
   └─ Are there failed deliveries?

2. Check webhook URL
   ├─ Must be publicly accessible
   ├─ Must be https in production
   └─ Must match exactly in Stripe config

3. Check Stripe CLI (if testing locally)
   ├─ Is stripe listen running?
   ├─ Is forwarding URL correct?
   └─ Any errors shown?

4. Check environment variables
   ├─ STRIPE_WEBHOOK_SECRET set?
   ├─ Is it correct value?
   └─ Did you restart server after .env change?
```

### Payment Created But Verification Fails

**Problem:** Payment created, but verify endpoint fails

**Solutions:**
```
1. Check if webhook already processed
   ├─ Webhook may have completed payment first
   ├─ Verify endpoint will return success if already done
   └─ This is NORMAL behavior

2. Wait a moment
   ├─ Webhook delivery is usually instant
   ├─ But can take up to 30 seconds
   └─ Retry verify after short delay

3. Check logs for webhook
   ├─ Search logs for: "checkout.session.completed"
   ├─ Check if payment status was updated
   └─ If webhook fired, payment is completed
```

### Card Declined But Should Work

**Problem:** Test card declined when it shouldn't be

**Solutions:**
```
1. Use correct test card:
   ✓ 4242 4242 4242 4242 (success)
   ✓ 4000 0000 0000 0002 (decline)

2. Check expiry date:
   ✓ Must be future date (not past)
   ✓ Example: 12/25 (December 2025)

3. Check amount:
   ✓ Amounts < $0.50 may be declined
   ✓ Use realistic amounts for testing

4. Check Stripe mode:
   ✓ Are you in TEST mode?
   ✓ Not LIVE mode?
```

---

## 📈 Next Steps

After successful testing:

1. **Review Code:**
   - Check `paymentController.js` 
   - Understand webhook handling
   - Review database updates

2. **Test Manual Payments:**
   - Try bank transfer option
   - Try wallet payment
   - Test multiple payment methods

3. **Load Testing:**
   - Simulate multiple simultaneous payments
   - Check database performance
   - Monitor server logs

4. **User Testing:**
   - Have real users test payment flow
   - Collect feedback
   - Fix any UX issues

5. **Go Live:**
   - Verify Stripe account
   - Get live keys
   - Deploy to production
   - Monitor closely

---

## 🆘 Getting Help

**Stripe Support:**
- Dashboard → Help → Contact support
- Email: support@stripe.com
- Chat: Available in dashboard

**Your Backend Issues:**
- Check logs: `backend/logs/payment.log`
- Check console output
- Enable debug mode: `DEBUG=stripe:*`

**Webhook Testing:**
- Use Stripe CLI for local testing
- Use Webhook.site for debugging
- Check Stripe Dashboard delivery logs

---

**Last Updated:** March 3, 2024
**Ready for Testing:** ✅

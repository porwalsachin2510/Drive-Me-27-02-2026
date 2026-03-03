# Stripe Payment - Quick Setup Guide (5 Minutes)

## Step 1: Get Your Stripe Keys (2 minutes)

1. Go to: https://dashboard.stripe.com/apikeys
2. You should see test keys:
   - `pk_test_...` (Publishable)
   - `sk_test_...` (Secret)
3. Copy both keys

## Step 2: Add to .env File (2 minutes)

**File:** `/backend/.env`

Add these lines:
```env
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_PASTE_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_PASTE_HERE
STRIPE_WEBHOOK_SECRET=whsec_test_xxxx
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
```

For webhook secret, get from Stripe Dashboard:
- Go: https://dashboard.stripe.com/webhooks
- Or use `whsec_test_8f9c9f1e7a4b3c2d1e0f` (temporary for testing)

## Step 3: Install Stripe Package (1 minute)

**In backend directory:**
```bash
npm install stripe
```

or check if already installed:
```bash
grep stripe package.json
```

## Step 4: Test Payment Flow (30 seconds)

1. **Start backend:**
   ```bash
   npm run dev
   ```

2. **Open app:** http://localhost:3000

3. **Create booking:**
   - Select route → Book → Pay Now
   - Choose "Credit/Debit Card"
   - Click "Pay"

4. **You should see Stripe page** ✅

5. **Use test card:**
   ```
   Card: 4242 4242 4242 4242
   Expiry: 12/25
   CVC: 123
   ```

6. **Payment should succeed** ✅

---

## Done! 🎉

All 3 files are already created and integrated:
- ✅ `stripePaymentService.js` - Payment logic
- ✅ `stripeWebhookRoutes.js` - Webhook handler
- ✅ `b2cMonthlyPassController.js` - Updated with Stripe

**Just add the env vars and test!**

---

## Troubleshooting

### "paymentUrl undefined" error?
- Check `.env` file has correct keys
- Restart backend: `npm run dev`

### "Webhook not working"?
- Webhook secret in `.env` must match Stripe
- Or use Stripe CLI: `stripe listen --forward-to localhost:5000/api/webhook/stripe`

### "Redirect not happening"?
- Check browser console for errors
- Make sure `FRONTEND_URL` in `.env` matches your app URL

---

## Payment Test Card Numbers

| Card | Expiry | CVC | Result |
|------|--------|-----|--------|
| 4242 4242 4242 4242 | 12/25 | 123 | ✅ Success |
| 4000 0000 0000 0002 | 12/25 | 123 | ❌ Decline |
| 4000 0025 0000 3155 | 12/25 | 123 | 🔐 3D Secure |

---

**Ready to test? Go book a ride!** 🚗


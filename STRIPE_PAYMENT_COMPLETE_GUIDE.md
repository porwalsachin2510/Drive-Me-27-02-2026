# 🔐 Stripe Payment Gateway - Complete Integration Guide
## Drive Me Application

---

## 📋 Table of Contents
1. [Payment Flow](#payment-flow)
2. [Environment Setup](#environment-setup)
3. [API Endpoints](#api-endpoints)
4. [Webhook Configuration](#webhook-configuration)
5. [Frontend Implementation](#frontend-implementation)
6. [Database Structure](#database-structure)
7. [Testing Guide](#testing-guide)
8. [Going Live](#going-live)

---

## 🔄 Payment Flow

### Complete User Journey

```
┌─────────────────────────────────────────────────────────────┐
│                    PAYMENT FLOW DIAGRAM                      │
├─────────────────────────────────────────────────────────────┤

1. USER INITIATES PAYMENT
   ↓
   User clicks "Pay Now" button in application
   ↓
   Frontend calls API: POST /api/contracts/{contractId}/payment
   ↓

2. BACKEND PROCESSES
   ↓
   Server validates:
   - Contract exists
   - User authorized (corporate owner)
   - Fleet owner accepts payment method
   - Payment not already processed
   ↓
   
3. CREATE STRIPE SESSION
   ↓
   Backend calls Stripe API to create checkout session
   Stripe returns sessionId and payment URL
   ↓
   Backend creates Payment record in MongoDB:
   - Status: PROCESSING
   - gatewaySessionId: <stripe_session_id>
   - Amount, currency, payment type stored
   ↓

4. REDIRECT TO STRIPE
   ↓
   Frontend redirects user to Stripe Checkout page
   User sees payment form (card details popup)
   ↓

5. USER ENTERS PAYMENT DETAILS
   ↓
   User enters:
   - Card number
   - Expiry date
   - CVV
   - Billing address
   ↓

6. PAYMENT PROCESSING
   ↓
   Stripe processes payment
   ↓
   Two possible outcomes:
   
   ✅ SUCCESS                          ❌ FAILED
   ├─ Payment processed                ├─ Payment declined
   ├─ Stripe sends webhook             └─ User shown error
   └─ Transaction ID generated
   ↓

7. WEBHOOK CALLBACK (for successful payment)
   ↓
   Stripe calls: POST /api/webhook/stripe
   ↓
   Webhook validates:
   - Signature verification ✓
   - Payment exists ✓
   - Status not already COMPLETED
   ↓
   Backend updates:
   - Payment.status = COMPLETED
   - Payment.gatewayTransactionId
   - Payment.verifiedAt = current time
   ↓

8. UPDATE CONTRACT & WALLETS
   ↓
   After webhook success:
   - Contract.status = ACTIVE (for advance) / COMPLETED (for final)
   - Contract.paymentStatus = PAID
   - Create transactions in Wallet:
     * Admin commission (10%)
     * Fleet owner amount (90%)
     * Security deposit held
   ↓

9. USER CONFIRMATION
   ↓
   Frontend shows success message
   User redirected to contract/dashboard
   Payment receipt available
   ↓

10. DATABASE STATE
    ↓
    Payment Document:
    ├─ contractId
    ├─ corporateOwnerId
    ├─ fleetOwnerId
    ├─ amount
    ├─ paymentType: "advance" or "final"
    ├─ status: "COMPLETED"
    ├─ paymentProvider: "STRIPE"
    ├─ gatewaySessionId: session_abc123
    ├─ gatewayTransactionId: pi_xyz789
    └─ verifiedAt: 2024-03-03T10:30:00Z
    
    Contract Document:
    ├─ status: "ACTIVE"
    ├─ paymentStatus: "PAID"
    ├─ activationDate: 2024-03-03T10:30:00Z
    └─ financials updated

└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Environment Setup

### Required Environment Variables

```bash
# Stripe Keys (from Stripe Dashboard)
STRIPE_SECRET_KEY=sk_test_... or sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_test_... or pk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... or pk_live_...

# Webhook Secret (from Stripe Dashboard > Webhooks)
STRIPE_WEBHOOK_SECRET=whsec_test_... or whsec_live_...

# Application URLs
FRONTEND_URL=http://localhost:3000 (development)
FRONTEND_URL=https://yourdomain.com (production)

BACKEND_URL=http://localhost:5000 (development)
BACKEND_URL=https://api.yourdomain.com (production)
```

### How to Get These Keys

#### Step 1: Create Stripe Account
- Go to https://stripe.com
- Sign up and verify email
- Complete account setup

#### Step 2: Get API Keys
```
Dashboard → Developers → API keys
├─ Publishable Key (pk_test_...)
└─ Secret Key (sk_test_...)
```

#### Step 3: Configure Webhook
```
Dashboard → Developers → Webhooks → Add endpoint
├─ Endpoint URL: https://yourdomain.com/api/webhook/stripe
├─ Events to send:
│  ├─ payment_intent.succeeded
│  ├─ checkout.session.completed
│  └─ charge.refunded
└─ Get signing secret (whsec_test_...)
```

---

## 📡 API Endpoints

### 1. CREATE PAYMENT SESSION

**Endpoint:**
```
POST /api/contracts/{contractId}/payment
```

**Headers:**
```json
{
  "Authorization": "Bearer {token}",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "paymentMethod": "CARD",
  "paymentType": "advance",
  "currency": "AED"
}
```

**Parameters Explained:**
- `contractId`: Contract ID for which payment is being made
- `paymentMethod`: 
  - `CARD`: Credit/Debit card via Stripe
  - `WALLET`: Digital wallet
  - `BANK_TRANSFER`: Bank transfer
  - `CASH`: Manual cash payment
  - `KNET`: Kuwait NET
  - `APPLE_PAY`: Apple Pay
  - `GOOGLE_PAY`: Google Pay
- `paymentType`:
  - `advance`: Initial payment (50% + security deposit)
  - `final`: Remaining payment (50%)
- `currency`: `AED`, `KWD`, `SAR`, etc.

**Response (Success):**
```json
{
  "success": true,
  "message": "Payment session created successfully",
  "data": {
    "payment": {
      "_id": "660a1b2c3d4e5f6g7h8i9j0k",
      "contractId": "contract_id_123",
      "amount": 5000,
      "advanceAmount": 4500,
      "securityDepositAmount": 500,
      "currency": "AED",
      "paymentType": "advance",
      "status": "PROCESSING"
    },
    "paymentSession": {
      "sessionId": "cs_test_a1b2c3d4e5f6g7h8i9j0k",
      "paymentUrl": "https://checkout.stripe.com/pay/cs_test_a1b2c3d4...",
      "country": "AE",
      "gateway": "STRIPE"
    }
  }
}
```

**What Happens in Backend:**

```javascript
// 1. Validate contract and user
const contract = await Contract.findById(contractId);
if (!contract) return 404 "Contract not found";

// 2. Check if payment method accepted
const fleetOwner = contract.fleetOwnerId;
if (!fleetOwner.acceptedPaymentMethods.includes(paymentMethod)) {
  return 400 "Fleet owner doesn't accept this payment method";
}

// 3. Calculate amounts
let advanceAmount = contract.financials.advancePayment.amount; // 50%
let securityDeposit = contract.financials.securityDeposit.amount; // 10%
let totalAmount = advanceAmount + securityDeposit;

// 4. Create Stripe checkout session
const stripeSession = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: [{
    price_data: {
      currency: 'aed',
      product_data: {
        name: `Contract ${contract.contractNumber}`
      },
      unit_amount: totalAmount * 100 // in cents
    },
    quantity: 1
  }],
  success_url: `${FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${FRONTEND_URL}/payment/cancel`,
  customer_email: user.email
});

// 5. Create Payment record in MongoDB
const payment = new Payment({
  contractId,
  gatewaySessionId: stripeSession.id,
  amount: totalAmount,
  status: 'PROCESSING',
  paymentProvider: 'STRIPE'
});
await payment.save();

// 6. Return session URL to frontend
return {
  sessionId: stripeSession.id,
  paymentUrl: stripeSession.url
}
```

---

### 2. VERIFY PAYMENT

**Endpoint:**
```
GET /api/payment/verify?session_id={sessionId}&provider=stripe
```

**Query Parameters:**
- `session_id`: Stripe session ID from redirect
- `provider`: Payment provider (stripe, tap, etc.)

**Response:**
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "payment": {
      "_id": "660a1b2c3d4e5f6g7h8i9j0k",
      "status": "COMPLETED",
      "gatewayTransactionId": "pi_1234567890",
      "verifiedAt": "2024-03-03T10:30:00Z"
    },
    "contract": {
      "status": "ACTIVE",
      "paymentStatus": "PAID"
    }
  }
}
```

**Backend Logic:**

```javascript
// 1. Find payment by session ID
const payment = await Payment.findOne({ 
  gatewaySessionId: sessionId 
});

// 2. Verify with Stripe
const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);

if (stripeSession.payment_status === 'paid') {
  // 3. Update payment status
  payment.status = 'COMPLETED';
  payment.gatewayTransactionId = stripeSession.payment_intent;
  await payment.save();
  
  // 4. Update contract
  const contract = await Contract.findById(payment.contractId);
  contract.status = 'ACTIVE';
  contract.paymentStatus = 'PAID';
  contract.activationDate = new Date();
  await contract.save();
  
  // 5. Process wallets
  await processPaymentToWallets(payment);
  
  return { success: true, payment, contract };
} else {
  payment.status = 'FAILED';
  await payment.save();
  return { success: false, message: 'Payment not completed' };
}
```

---

### 3. GET PAYMENT STATUS

**Endpoint:**
```
GET /api/contracts/{contractId}/payment
```

**Headers:**
```json
{
  "Authorization": "Bearer {token}"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "payment": {
      "_id": "660a1b2c3d4e5f6g7h8i9j0k",
      "contractId": "contract_123",
      "amount": 5000,
      "currency": "AED",
      "paymentType": "advance",
      "status": "COMPLETED",
      "paymentProvider": "STRIPE",
      "gatewayTransactionId": "pi_1234567890",
      "verifiedAt": "2024-03-03T10:30:00Z",
      "createdAt": "2024-03-03T10:20:00Z"
    }
  }
}
```

---

## 🔗 Webhook Configuration

### What is a Webhook?

Webhooks are automatic callbacks that Stripe sends to your server when an event occurs. This is the **most secure way** to confirm payment success because:
- ✅ Server-to-server communication (no user interference)
- ✅ Stripe signature verification ensures authenticity
- ✅ Handles edge cases (user closes browser, network issues)
- ✅ Guaranteed delivery with retries

### Webhook Endpoint

**Endpoint:**
```
POST /api/webhook/stripe
```

**This endpoint:**
- Does NOT require authentication
- Uses raw body for signature verification
- Must be publicly accessible

### Webhook Flow

```javascript
// 1. Stripe sends webhook
POST /api/webhook/stripe
Headers: {
  'stripe-signature': 'v1=...',
  'Content-Type': 'application/json'
}
Body: {
  "id": "evt_123",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_...",
      "payment_intent": "pi_...",
      "payment_status": "paid"
    }
  }
}

// 2. Backend verifies signature
const sig = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  req.body,
  sig,
  STRIPE_WEBHOOK_SECRET
);

// 3. Check event type
if (event.type === 'checkout.session.completed') {
  const session = event.data.object;
  
  // 4. Find payment in DB
  const payment = await Payment.findOne({ 
    gatewaySessionId: session.id 
  });
  
  // 5. Update if not already completed
  if (payment && payment.status !== 'COMPLETED') {
    payment.status = 'COMPLETED';
    payment.gatewayTransactionId = session.payment_intent;
    payment.verifiedAt = new Date();
    await payment.save();
    
    // 6. Update contract and wallets
    await updateContractAndWallets(payment);
  }
}

// 7. Return success to Stripe
return res.json({ received: true });
```

### Setting Up Webhook in Stripe Dashboard

**Step 1:** Go to Dashboard → Developers → Webhooks

**Step 2:** Click "Add an endpoint"

**Step 3:** Enter your webhook URL:
```
https://yourdomain.com/api/webhook/stripe
```

**Step 4:** Select events to listen:
```
☑ checkout.session.completed
☑ payment_intent.succeeded
☑ charge.refunded
```

**Step 5:** Copy the signing secret:
```
whsec_test_... or whsec_live_...
```

**Step 6:** Add to `.env`:
```
STRIPE_WEBHOOK_SECRET=whsec_test_...
```

### Testing Webhook Locally

```bash
# 1. Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# 2. Login to your Stripe account
stripe login

# 3. Start webhook forwarding
stripe listen --forward-to localhost:5000/api/webhook/stripe

# 4. Get signing secret for testing
# CLI will show: whsec_test_...

# 5. Add to .env.local for testing
STRIPE_WEBHOOK_SECRET=whsec_test_...

# 6. Trigger test events
stripe trigger charge.succeeded
```

---

## 💻 Frontend Implementation

### Payment Button Component

```jsx
// components/PaymentButton.jsx
import { useState } from 'react';

export default function PaymentButton({ contractId, amount, currency = 'AED' }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Call backend to create payment session
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/contracts/${contractId}/payment`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            paymentMethod: 'CARD',
            paymentType: 'advance',
            currency: currency
          })
        }
      );

      const data = await response.json();

      if (!data.success) {
        setError(data.message || 'Payment creation failed');
        return;
      }

      // 2. Redirect to Stripe Checkout
      const paymentUrl = data.data.paymentSession.paymentUrl;
      window.location.href = paymentUrl;

    } catch (err) {
      setError(err.message);
      console.error('Payment error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-button-container">
      <button
        onClick={handlePayment}
        disabled={loading}
        className="payment-btn"
      >
        {loading ? 'Processing...' : `Pay ${amount} ${currency}`}
      </button>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
}
```

### Payment Success Page

```jsx
// pages/PaymentSuccess.jsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    try {
      const sessionId = searchParams.get('session_id');
      
      if (!sessionId) {
        setStatus('failed');
        setError('Session ID not found');
        return;
      }

      // Call verify endpoint
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/payment/verify?session_id=${sessionId}&provider=stripe`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      const data = await response.json();

      if (data.success && data.data.payment.status === 'COMPLETED') {
        setStatus('success');
        setPayment(data.data.payment);
        
        // Show success message
        setTimeout(() => {
          window.location.href = '/dashboard/contracts';
        }, 3000);
      } else {
        setStatus('failed');
        setError(data.message || 'Payment verification failed');
      }
    } catch (err) {
      setStatus('failed');
      setError(err.message);
    }
  };

  return (
    <div className="payment-status-container">
      {status === 'verifying' && (
        <div className="verifying">
          <div className="spinner"></div>
          <p>Verifying your payment...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="success-message">
          <h1>✓ Payment Successful!</h1>
          <p>Transaction ID: {payment?.gatewayTransactionId}</p>
          <p>Amount: {payment?.amount} {payment?.currency}</p>
          <p>Redirecting to dashboard...</p>
        </div>
      )}

      {status === 'failed' && (
        <div className="error-message">
          <h1>✗ Payment Failed</h1>
          <p>{error}</p>
          <button onClick={() => window.location.href = '/contracts'}>
            Back to Contracts
          </button>
        </div>
      )}
    </div>
  );
}
```

### Payment Popup (Embedded)

```jsx
// components/EmbeddedCheckout.jsx
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/js';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

export default function PaymentPopup({ clientSecret, onClose }) {
  return (
    <div className="payment-popup">
      <div className="popup-header">
        <h2>Complete Payment</h2>
        <button onClick={onClose} className="close-btn">×</button>
      </div>
      
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{ clientSecret }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
```

---

## 📊 Database Structure

### Payment Document Schema

```javascript
{
  _id: ObjectId,
  
  // Contract & User Info
  contractId: ObjectId,          // Reference to Contract
  corporateOwnerId: ObjectId,    // Reference to User (payer)
  fleetOwnerId: ObjectId,        // Reference to User (receiver)
  
  // Amount Details
  amount: Number,                 // Total amount (advance + security)
  advanceAmount: Number,          // 50% of contract value
  securityDepositAmount: Number,  // 10% of contract value
  adminCommission: Number,        // 10% of advance (goes to admin)
  fleetOwnerAmount: Number,       // 90% of advance (goes to fleet owner)
  
  // Payment Info
  currency: String,               // AED, KWD, SAR, etc.
  paymentType: String,            // "advance" or "final"
  paymentMethod: String,          // CARD, WALLET, BANK_TRANSFER, etc.
  description: String,            // Human readable description
  
  // Payment Provider Info
  paymentProvider: String,        // STRIPE, TAP, MANUAL
  gatewaySessionId: String,       // Stripe session ID
  gatewayTransactionId: String,   // Stripe transaction/intent ID
  gatewayReference: String,       // Unique reference
  
  // Status Tracking
  status: String,                 // PENDING, PROCESSING, COMPLETED, FAILED
  verificationStatus: String,     // PENDING, VERIFIED, REJECTED
  verifiedBy: ObjectId,           // Admin who verified (for manual)
  verifiedAt: Date,               // When payment was verified
  
  // Metadata
  paymentMetadata: {
    cardType: String,             // visa, mastercard, amex
    cardLast4: String,            // Last 4 digits
    bankName: String,             // For bank transfers
    accountNumber: String,        // For bank transfers
    paymentUrl: String,           // Stripe checkout URL
    country: String               // Detected country
  },
  
  failureReason: String,          // Why payment failed
  
  createdAt: Date,
  updatedAt: Date
}
```

### Contract Payment Status Updates

```javascript
// After successful payment, Contract is updated:
{
  _id: ObjectId,
  contractNumber: String,
  status: String,                 // PENDING_PAYMENT → ACTIVE → COMPLETED
  paymentStatus: String,          // UNPAID → PAID → REFUNDED
  activationDate: Date,           // Set after advance payment
  completedAt: Date,              // Set after final payment
  
  financials: {
    advancePayment: {
      amount: Number,
      paidAt: Date,               // Set after payment
      paymentId: ObjectId         // Reference to Payment doc
    },
    finalPayment: {
      amount: Number,
      paidAt: Date,               // Set after final payment
      paymentId: ObjectId
    },
    securityDeposit: {
      amount: Number,
      heldSince: Date,
      refundedAt: Date            // Set on contract completion
    }
  }
}
```

### Wallet Transactions (Created after payment)

```javascript
// Admin Wallet Transaction
{
  _id: ObjectId,
  walletId: ObjectId,             // Admin's wallet
  amount: 500,                    // 10% commission from advance
  type: 'CREDIT',
  description: 'Payment commission - Contract ABC123',
  paymentId: ObjectId,            // Reference to Payment
  createdAt: Date
}

// Fleet Owner Wallet Transaction
{
  _id: ObjectId,
  walletId: ObjectId,             // Fleet owner's wallet
  amount: 4500,                   // 90% of advance
  type: 'CREDIT',
  description: 'Payment received - Contract ABC123',
  paymentId: ObjectId,            // Reference to Payment
  createdAt: Date
}
```

---

## 🧪 Testing Guide

### Test Mode (Using Test Keys)

```bash
# 1. In Stripe Dashboard, switch to TEST MODE (top toggle)

# 2. Get test keys:
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
```

### Test Card Numbers

```
✅ Successful Payment
Card Number: 4242 4242 4242 4242
Expiry: 12/25 (any future date)
CVC: 123 (any 3 digits)
Result: Payment succeeds, webhook fires

❌ Payment Declined
Card Number: 4000 0000 0000 0002
Expiry: 12/25
CVC: 123
Result: Payment fails, user shown error

❌ Card Requires Authentication
Card Number: 4000 0025 0000 3155
Expiry: 12/25
CVC: 123
Result: 3D Secure challenge appears

⚠️ Expired Card
Card Number: 4000 0000 0000 0069
Expiry: 12/20 (past date)
CVC: 123
Result: Validation fails
```

### Testing Payment Flow

**Step 1: Create Contract**
```bash
curl -X POST http://localhost:5000/api/contracts \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "fleetOwnerId": "...",
    "value": 10000
  }'

Response: { _id: "contract_123", status: "PENDING_PAYMENT" }
```

**Step 2: Initiate Payment**
```bash
curl -X POST http://localhost:5000/api/contracts/contract_123/payment \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "CARD",
    "paymentType": "advance",
    "currency": "AED"
  }'

Response: { 
  paymentSession: { 
    sessionId: "cs_test_...",
    paymentUrl: "https://checkout.stripe.com/..."
  }
}
```

**Step 3: Click Payment URL**
- Open the `paymentUrl` in browser
- Enter test card details (4242 4242 4242 4242)
- Click "Pay"

**Step 4: Verify Payment**
```bash
curl -X GET "http://localhost:5000/api/payment/verify?session_id=cs_test_...&provider=stripe" \
  -H "Authorization: Bearer {token}"

Response: { 
  payment: { status: "COMPLETED" },
  contract: { status: "ACTIVE", paymentStatus: "PAID" }
}
```

**Step 5: Check Webhook in Logs**
```
✓ Webhook received: checkout.session.completed
✓ Payment verified: gatewayTransactionId = pi_...
✓ Contract updated: status = ACTIVE
✓ Wallet transactions created
```

### Local Webhook Testing

```bash
# 1. Install Stripe CLI
brew install stripe/stripe-cli/stripe  # macOS
# Or download from https://stripe.com/docs/stripe-cli

# 2. Login
stripe login

# 3. Listen for webhooks
stripe listen --forward-to http://localhost:5000/api/webhook/stripe

# You'll see:
# > Ready! Your webhook signing secret is: whsec_test_...

# 4. Copy the signing secret to .env
STRIPE_WEBHOOK_SECRET=whsec_test_...

# 5. In another terminal, trigger test event
stripe trigger checkout.session.completed

# 6. Watch your backend logs:
# [v0] Stripe webhook received
# [v0] Event type: checkout.session.completed
# [v0] Payment verified and updated
```

---

## 🚀 Going Live

### 1. Complete Stripe Verification

- Stripe will require:
  - Business information
  - Bank account details
  - Identity verification
  - Business documents

### 2. Switch to Live Mode

**In Stripe Dashboard:**
```
Top toggle: TEST MODE → LIVE MODE
```

### 3. Get Live Keys

```
Dashboard → Developers → API keys

Live Keys:
├─ Publishable Key: pk_live_...
└─ Secret Key: sk_live_...
```

### 4. Update Environment Variables

```bash
# .env.production or production server
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Get new webhook secret for live
STRIPE_WEBHOOK_SECRET=whsec_live_...
```

### 5. Update Webhook URL

**In Stripe Dashboard → Webhooks:**

Old (Test):
```
https://yourdomain.com/api/webhook/stripe
whsec_test_...
```

New (Live):
```
https://yourdomain.com/api/webhook/stripe
whsec_live_...
```

### 6. Test Live Payment

- Use real card (or ask Stripe for sandbox)
- Process small transaction (e.g., 1 AED)
- Verify in dashboard:
  - Payment shows in Stripe Dashboard (Live)
  - Payment record created in MongoDB
  - Contract status updated to ACTIVE
  - Webhook event received

### 7. Monitor in Production

```javascript
// Add logging to production
console.log('[PAYMENT] Session created:', sessionId);
console.log('[PAYMENT] Webhook received:', eventType);
console.log('[PAYMENT] Status updated:', paymentStatus);

// Set up alerts
// - Monitor failed webhooks
// - Track payment success rate
// - Alert on large transactions
```

---

## 🔐 Security Checklist

### Before Going Live

- [ ] SSL/TLS certificate installed (https)
- [ ] Environment variables secured (not in code)
- [ ] Stripe webhook signature verified
- [ ] Payment amounts validated server-side
- [ ] User authorization checked before payment
- [ ] Rate limiting enabled on payment endpoint
- [ ] Logging enabled but doesn't store sensitive data
- [ ] CORS properly configured
- [ ] Database backups tested
- [ ] Error messages don't expose sensitive info
- [ ] PCI DSS compliance checked (don't store card data)
- [ ] Refund process tested and documented

### Never Do

```javascript
// ❌ DON'T: Store card data
const card = req.body.cardNumber;  // NEVER!

// ❌ DON'T: Pass amount from frontend
const amount = req.body.amount;    // INSECURE!

// ❌ DON'T: Skip signature verification
const event = stripe.webhooks.constructEvent(body, sig, secret);

// ❌ DON'T: Log sensitive data
console.log('Card:', card);        // WRONG!

// ✅ DO: Always validate server-side
const contract = await Contract.findById(contractId);
const amount = contract.financials.advancePayment.amount;

// ✅ DO: Verify signature
try {
  const event = stripe.webhooks.constructEvent(body, sig, secret);
} catch (err) {
  return res.status(400).send('Invalid signature');
}
```

---

## 📞 Support & Troubleshooting

### Common Issues

#### Issue 1: "Webhook signature verification failed"

**Cause:** Wrong `STRIPE_WEBHOOK_SECRET`

**Solution:**
```bash
# Get correct secret from Stripe Dashboard
Dashboard → Developers → Webhooks → Click endpoint
# Copy signing secret (whsec_test_... or whsec_live_...)
# Update .env and restart server
```

#### Issue 2: "Payment not found in database"

**Cause:** Payment record not created before redirecting

**Solution:**
- Check payment creation response
- Ensure database connection works
- Check logs for errors

#### Issue 3: "Session not found" when verifying

**Cause:** Webhook processed before verification endpoint called

**Solution:**
```javascript
// This is NORMAL and OK!
// Webhook completes payment first
// Then frontend verification redirects user

// If webhook succeeds first:
if (payment.status === 'COMPLETED') {
  return { success: true, message: 'Already verified' };
}
```

#### Issue 4: "CORS error" accessing from frontend

**Solution:**
```javascript
// server.js
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

#### Issue 5: "Payment stuck in PROCESSING"

**Cause:** Webhook never received or failed

**Solution:**
```bash
# Check Stripe Dashboard → Webhooks
# Look for failed delivery attempts
# Manually retry failed events
# Or trigger verification endpoint manually
```

---

## 📚 Reference Files

Your application files:
- `backend/src/Config/stripe.js` - Stripe initialization
- `backend/src/controllers/paymentController.js` - Payment logic
- `backend/src/models/Payment.js` - Payment schema
- `backend/src/routes/paymentRoutes.js` - Payment routes
- `backend/src/Services/paymentGatewayService.js` - Payment service

## 🔗 Useful Links

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe API Reference](https://stripe.com/docs/api)

---

**Last Updated:** March 3, 2024
**Status:** Ready for Implementation ✅

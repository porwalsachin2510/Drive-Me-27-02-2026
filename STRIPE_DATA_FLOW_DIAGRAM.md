# 🔄 Stripe Payment - Complete Data Flow Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           PAYMENT SYSTEM FLOW                           │
├─────────────────────────────────────────────────────────────────────────┤

                    ┌──────────────────────┐
                    │   USER APPLICATION   │
                    │  (React Frontend)    │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │   PAYMENT BUTTON     │
                    │  (Click: Pay Now)    │
                    └──────────┬───────────┘
                               │
         ┌─────────────────────▼─────────────────────┐
         │                                           │
         │  Step 1: Create Payment Session          │
         │  POST /api/contracts/{id}/payment        │
         │                                           │
         └─────────────────────┬─────────────────────┘
                               │
                    ┌──────────▼───────────┐
                    │  YOUR BACKEND        │
                    │  (Node.js/Express)   │
                    └──────────┬───────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
         ▼                     ▼                     ▼
    ┌─────────┐          ┌─────────┐          ┌──────────┐
    │ VALIDATE │          │CALCULATE│          │ DATABASE │
    │ CONTRACT │          │ AMOUNTS  │          │(MongoDB) │
    │   USER   │          │  (50%)   │          │          │
    │ & AMOUNT │          │ (10%)    │          │ Create   │
    └────┬────┘          └────┬────┘          │ Payment  │
         │                    │               │  Record  │
         └─────────┬──────────┘               │ (PENDING)│
                   │                          └──────────┘
                   │
         ┌─────────▼────────────────────┐
         │  CALL STRIPE API             │
         │  stripe.checkout.sessions    │
         │  .create({...})              │
         └─────────┬────────────────────┘
                   │
         ┌─────────▼────────────────────┐
         │  STRIPE CREATES SESSION      │
         │  Returns:                    │
         │  - sessionId                 │
         │  - checkout URL              │
         └─────────┬────────────────────┘
                   │
         ┌─────────▼────────────────────┐
         │  UPDATE PAYMENT RECORD       │
         │  gatewaySessionId = sessionId│
         │  status = PROCESSING         │
         └─────────┬────────────────────┘
                   │
         ┌─────────▼────────────────────┐
         │  RETURN TO FRONTEND          │
         │  {                           │
         │    paymentUrl: "..."         │
         │    sessionId: "cs_test_..."  │
         │  }                           │
         └─────────┬────────────────────┘
                   │
                   │ (HTTP Response)
                   │
                   ▼
         ┌──────────────────────┐
         │  REDIRECT USER       │
         │  window.location.href│
         │  = paymentUrl        │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────────────┐
         │  STRIPE CHECKOUT PAGE        │
         │  ┌────────────────────────┐  │
         │  │ Card Number: ████████  │  │
         │  │ Expiry: MM/YY          │  │
         │  │ CVC: ███               │  │
         │  │                        │  │
         │  │ [  PAY NOW  ]          │  │
         │  └────────────────────────┘  │
         └──────────┬───────────────────┘
                    │
         ┌──────────▼───────────────┐
         │  USER ENTERS DETAILS     │
         │  & CLICKS PAY            │
         └──────────┬───────────────┘
                    │
         ┌──────────▼──────────────────────────┐
         │  STRIPE PROCESSES PAYMENT           │
         │  (Backend processing, not visible)  │
         └──────────┬───────────────────────┬──┘
                    │                       │
           ✓ SUCCESS│                       │✗ FAILED
                    │                       │
                    ▼                       ▼
         ┌──────────────────────┐  ┌──────────────────┐
         │ PAYMENT SUCCESSFUL   │  │ PAYMENT DECLINED │
         │ (Internal to Stripe) │  │ (Internal)       │
         └──────────┬───────────┘  └──────────────────┘
                    │
         ┌──────────▼──────────────────────┐
         │  STRIPE FIRES WEBHOOK EVENT     │
         │  Type: checkout.session.completed
         │  POST /api/webhook/stripe       │
         │  {                              │
         │    sessionId: "cs_test_...",    │
         │    paymentIntentId: "pi_...",   │
         │    status: "complete",          │
         │    amount: 5000                 │
         │  }                              │
         └──────────┬──────────────────────┘
                    │
         ┌──────────▼──────────────────────┐
         │  YOUR BACKEND RECEIVES           │
         │  WEBHOOK                        │
         │  1. Verify signature ✓          │
         │  2. Parse event                 │
         │  3. Find Payment in DB          │
         └──────────┬──────────────────────┘
                    │
         ┌──────────▼──────────────────────┐
         │  UPDATE PAYMENT RECORD          │
         │  _id: 60d5ec...                 │
         │  status: COMPLETED ✓            │
         │  gatewayTransactionId: pi_...   │
         │  verifiedAt: now()              │
         └──────────┬──────────────────────┘
                    │
         ┌──────────▼──────────────────────┐
         │  UPDATE CONTRACT STATUS         │
         │  _id: 60d5ec...                 │
         │  status: ACTIVE                 │
         │  paymentStatus: PAID            │
         │  activationDate: now()          │
         └──────────┬──────────────────────┘
                    │
         ┌──────────▼──────────────────────┐
         │  CREATE WALLET TRANSACTIONS     │
         │                                 │
         │  Admin Wallet:                  │
         │  + 500 AED (10% commission)     │
         │                                 │
         │  Fleet Owner Wallet:            │
         │  + 4500 AED (90% advance)       │
         └──────────┬──────────────────────┘
                    │
         ┌──────────▼──────────────────────┐
         │  RETURN 200 OK TO STRIPE        │
         │  Stripe confirms webhook        │
         │  received and processed ✓       │
         └──────────────────────────────────┘

                    ◄────────────────────────┐
                    │ (Meanwhile in Frontend) │
                    │                        │
                    ▼                        │
         ┌──────────────────────┐           │
         │ Wait for verification│           │
         │ Redirect to success  │           │
         │ page                 │           │
         └──────────┬───────────┘           │
                    │                       │
                    │ API Call             │
                    │ GET /payment/verify  │
                    │                      │
                    ▼                      │
         ┌──────────────────────┐          │
         │ Backend returns      │◄─────────┘
         │ COMPLETED status     │
         │ (already updated by  │
         │  webhook)            │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ SUCCESS PAGE         │
         │ ✓ Payment Complete   │
         │ Transaction ID: ...  │
         │ Amount: 5000 AED     │
         │ Status: CONFIRMED    │
         │                      │
         │ Redirect to          │
         │ Dashboard            │
         └──────────────────────┘


└─────────────────────────────────────────────────────────────────────────┘
```

---

## Database State Changes

### Timeline: Payment Creation to Completion

```
┌───────────────────────────────────────────────────────────────────────┐
│                    DATABASE DOCUMENT CHANGES                          │
├───────────────────────────────────────────────────────────────────────┤

TIME: T+0s - User Clicks Pay Button
═════════════════════════════════════════════════════════════════════

CONTRACT (Before):
{
  _id: "60d5ec123456789abcdef000",
  status: "PENDING_PAYMENT",  ◄─ Not paid yet
  paymentStatus: "UNPAID",
  contractNumber: "FLT-2024-001",
  financials: {
    advancePayment: {
      amount: 4500,
      paidAt: null,           ◄─ No payment yet
      paymentId: null
    },
    securityDeposit: {
      amount: 500,
      heldSince: null
    }
  }
}


TIME: T+1s - Backend Creates Payment Session
═════════════════════════════════════════════════════════════════════

PAYMENT (New Record Created):
{
  _id: "60d5ef234567890abcdef111",
  contractId: "60d5ec123456789abcdef000",
  amount: 5000,               ◄─ 4500 advance + 500 deposit
  advanceAmount: 4500,
  securityDepositAmount: 500,
  paymentType: "advance",
  status: "PROCESSING",       ◄─ Waiting for payment
  paymentMethod: "CARD",
  paymentProvider: "STRIPE",
  gatewaySessionId: "cs_test_a1b2c3d4e5f6",  ◄─ Stripe session ID
  gatewayTransactionId: null, ◄─ Not yet
  createdAt: "2024-03-03T10:20:00Z"
}


TIME: T+5s - User Sees Stripe Checkout Page
═════════════════════════════════════════════════════════════════════

(No database changes yet)


TIME: T+20s - User Completes Payment on Stripe
═════════════════════════════════════════════════════════════════════

(Stripe processes internally)


TIME: T+21s - Webhook Received & Processed
═════════════════════════════════════════════════════════════════════

PAYMENT (Updated):
{
  _id: "60d5ef234567890abcdef111",
  contractId: "60d5ec123456789abcdef000",
  amount: 5000,
  advanceAmount: 4500,
  securityDepositAmount: 500,
  status: "COMPLETED",        ◄─ Updated to completed
  gatewaySessionId: "cs_test_a1b2c3d4e5f6",
  gatewayTransactionId: "pi_123456789abcdef",  ◄─ Stripe transaction ID
  verifiedAt: "2024-03-03T10:20:30Z",  ◄─ When it was verified
  updatedAt: "2024-03-03T10:20:30Z"
}

CONTRACT (Updated):
{
  _id: "60d5ec123456789abcdef000",
  status: "ACTIVE",           ◄─ Changed from PENDING_PAYMENT
  paymentStatus: "PAID",      ◄─ Changed from UNPAID
  contractNumber: "FLT-2024-001",
  activationDate: "2024-03-03T10:20:30Z",  ◄─ When payment completed
  financials: {
    advancePayment: {
      amount: 4500,
      paidAt: "2024-03-03T10:20:30Z",  ◄─ Now has payment date
      paymentId: "60d5ef234567890abcdef111"  ◄─ Reference to payment
    },
    securityDeposit: {
      amount: 500,
      heldSince: "2024-03-03T10:20:30Z"  ◄─ Deposit held
    }
  }
}

TRANSACTION 1 (Admin Commission):
{
  _id: "60d5eg345678901abcdef222",
  walletId: "60d5e1111111111111111111",  ◄─ Admin's wallet
  amount: 500,                ◄─ 10% of advance
  type: "CREDIT",
  description: "Payment commission - Contract FLT-2024-001",
  paymentId: "60d5ef234567890abcdef111",
  createdAt: "2024-03-03T10:20:30Z"
}

TRANSACTION 2 (Fleet Owner Payment):
{
  _id: "60d5eg456789012abcdef333",
  walletId: "60d5e2222222222222222222",  ◄─ Fleet owner's wallet
  amount: 4500,               ◄─ 90% of advance
  type: "CREDIT",
  description: "Payment received - Contract FLT-2024-001",
  paymentId: "60d5ef234567890abcdef111",
  createdAt: "2024-03-03T10:20:30Z"
}


WALLET 1 (Admin - Updated):
{
  _id: "60d5e1111111111111111111",
  userId: "60d5e0000000000000000001",  ◄─ Admin user
  balance: 10500,             ◄─ Was 10000, +500 from commission
  transactions: [
    "60d5eg345678901abcdef222"
  ],
  updatedAt: "2024-03-03T10:20:30Z"
}

WALLET 2 (Fleet Owner - Updated):
{
  _id: "60d5e2222222222222222222",
  userId: "60d5e0000000000000000002",  ◄─ Fleet owner user
  balance: 54500,             ◄─ Was 50000, +4500 from payment
  transactions: [
    "60d5eg456789012abcdef333"
  ],
  updatedAt: "2024-03-03T10:20:30Z"
}


TIME: T+25s - Frontend Calls Verify Endpoint
═════════════════════════════════════════════════════════════════════

Frontend gets response:
{
  success: true,
  payment: {
    _id: "60d5ef234567890abcdef111",
    status: "COMPLETED",      ◄─ Already completed by webhook
    gatewayTransactionId: "pi_...",
    verifiedAt: "2024-03-03T10:20:30Z"
  },
  contract: {
    status: "ACTIVE",         ◄─ Already updated by webhook
    paymentStatus: "PAID"
  }
}

USER SEES: Success page with transaction details


└───────────────────────────────────────────────────────────────────────┘
```

---

## API Request/Response Flow

### 1. Create Payment Session Request

```
┌─────────────────────────────────────────────────────────────┐
│ CLIENT REQUEST                                              │
├─────────────────────────────────────────────────────────────┤

POST /api/contracts/60d5ec123456789abcdef000/payment
Host: api.yourdomain.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "paymentMethod": "CARD",
  "paymentType": "advance",
  "currency": "AED"
}

└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ BACKEND PROCESSING                                          │
├─────────────────────────────────────────────────────────────┤

1. Authenticate user (Bearer token)
2. Find contract by ID
3. Verify user is corporate owner
4. Check if fleet owner accepts CARD payments
5. Calculate amounts:
   - Advance: 4500 AED (50% of 9000)
   - Security: 500 AED (10% of 5000)
   - Total: 5000 AED
6. Check if payment already exists
7. Create Stripe session:
   - line_items: [{
       price_data: {
         currency: 'aed',
         unit_amount: 500000  // 5000 AED in fils
       }
     }]
   - success_url: https://yourdomain.com/payment/success?session_id={CHECKOUT_SESSION_ID}
   - cancel_url: https://yourdomain.com/payment/cancel
8. Create Payment document in MongoDB
9. Return response

└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ SERVER RESPONSE                                             │
├─────────────────────────────────────────────────────────────┤

HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Payment session created successfully",
  "data": {
    "payment": {
      "_id": "60d5ef234567890abcdef111",
      "contractId": "60d5ec123456789abcdef000",
      "amount": 5000,
      "advanceAmount": 4500,
      "securityDepositAmount": 500,
      "currency": "AED",
      "paymentType": "advance",
      "status": "PROCESSING"
    },
    "paymentSession": {
      "sessionId": "cs_test_a1b2c3d4e5f6g7h8i9j0",
      "paymentUrl": "https://checkout.stripe.com/pay/cs_test_a1b2c3d4e5f6g7h8i9j0",
      "country": "AE",
      "gateway": "STRIPE"
    }
  }
}

└─────────────────────────────────────────────────────────────┘
```

### 2. Verify Payment Request

```
┌─────────────────────────────────────────────────────────────┐
│ CLIENT REQUEST (After Stripe Redirects)                    │
├─────────────────────────────────────────────────────────────┤

GET /api/payment/verify?session_id=cs_test_a1b2c3d4e5f6&provider=stripe
Host: api.yourdomain.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ BACKEND PROCESSING                                          │
├─────────────────────────────────────────────────────────────┤

1. Find Payment by gatewaySessionId
2. If status already COMPLETED:
   - Return success (webhook already processed)
3. Otherwise:
   - Call Stripe to verify session
   - Check if payment_status = 'paid'
   - Update Payment:
     - status = COMPLETED
     - gatewayTransactionId = stripe_transaction_id
     - verifiedAt = now()
   - Update Contract:
     - status = ACTIVE
     - paymentStatus = PAID
   - Create wallet transactions
4. Return updated payment info

└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ SERVER RESPONSE                                             │
├─────────────────────────────────────────────────────────────┤

HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "payment": {
      "_id": "60d5ef234567890abcdef111",
      "status": "COMPLETED",
      "gatewayTransactionId": "pi_1234567890abcdef",
      "verifiedAt": "2024-03-03T10:20:30Z"
    },
    "contract": {
      "status": "ACTIVE",
      "paymentStatus": "PAID"
    }
  }
}

└─────────────────────────────────────────────────────────────┘
```

### 3. Webhook Delivery

```
┌─────────────────────────────────────────────────────────────┐
│ STRIPE SENDS WEBHOOK                                        │
├─────────────────────────────────────────────────────────────┤

POST /api/webhook/stripe
Host: api.yourdomain.com
Stripe-Signature: t=1630000000,v1=signature...
Content-Type: application/json

{
  "id": "evt_1234567890abcdef",
  "object": "event",
  "api_version": "2023-10-16",
  "created": 1630000000,
  "data": {
    "object": {
      "id": "cs_test_a1b2c3d4e5f6g7h8i9j0",
      "object": "checkout.session",
      "payment_status": "paid",
      "payment_intent": "pi_1234567890abcdef",
      "customer_email": "corporate@example.com",
      "amount_total": 500000,
      "currency": "aed"
    }
  },
  "type": "checkout.session.completed",
  "livemode": false
}

└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ BACKEND PROCESSING                                          │
├─────────────────────────────────────────────────────────────┤

1. Get signature from headers: Stripe-Signature
2. Construct event:
   - stripe.webhooks.constructEvent(body, sig, secret)
   - If signature invalid → return 400
3. Check event type: "checkout.session.completed"
4. Find Payment by gatewaySessionId
5. If Payment exists and not COMPLETED:
   - Update Payment: status = COMPLETED
   - Update Contract: status = ACTIVE
   - Create wallet transactions
6. Return 200 OK

└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ WEBHOOK RESPONSE                                            │
├─────────────────────────────────────────────────────────────┤

HTTP/1.1 200 OK
Content-Type: application/json

{
  "received": true
}

Stripe confirms webhook delivered and processed ✓

└─────────────────────────────────────────────────────────────┘
```

---

## Payment Amount Breakdown

```
┌──────────────────────────────────────────────────────────┐
│            PAYMENT AMOUNT CALCULATIONS                   │
├──────────────────────────────────────────────────────────┤

CONTRACT VALUE: 10,000 AED (example)

┌────────────────────────────────┐
│ ADVANCE PAYMENT (First Payment)│
├────────────────────────────────┤

Total Contract: 10,000 AED

1. Advance Payment (50%):
   10,000 × 50% = 5,000 AED
   
2. Security Deposit (10%):
   10,000 × 10% = 1,000 AED
   
3. TOTAL FIRST PAYMENT:
   5,000 + 1,000 = 6,000 AED ✓

How it's distributed:
├─ Admin Commission (10% of advance):
│  5,000 × 10% = 500 AED → Admin Wallet
│
└─ Fleet Owner Amount (90% of advance):
   5,000 × 90% = 4,500 AED → Fleet Owner Wallet
   
Security Deposit: 1,000 AED (held separately)


┌────────────────────────────────┐
│ FINAL PAYMENT (Second Payment) │
├────────────────────────────────┤

Total Contract: 10,000 AED
Already paid: 5,000 AED (advance)
Remaining: 5,000 AED (50%)

1. Final Payment (50%):
   10,000 × 50% = 5,000 AED
   
2. Security Deposit: 1,000 AED (returned)

3. TOTAL SECOND PAYMENT:
   5,000 + 1,000 = 6,000 AED ✓

How it's distributed:
├─ Admin Commission (10% of this advance):
│  0 AED (only on first advance)
│
├─ Fleet Owner Amount (90% of this advance):
│  5,000 AED → Fleet Owner Wallet
│
└─ Security Deposit Refund:
   1,000 AED → Back to Corporate Wallet


┌────────────────────────────────┐
│ FINAL WALLET BALANCES          │
├────────────────────────────────┤

Admin Wallet:
├─ Initial: 0
├─ Received: 500 (commission)
└─ Final: 500

Fleet Owner Wallet:
├─ Initial: 0
├─ Received: 4,500 (1st advance)
├─ Received: 5,000 (2nd advance)
└─ Final: 9,500

Corporate Owner Wallet:
├─ Initial: 10,000 (holds deposit)
├─ Paid: 6,000 (1st payment)
├─ Paid: 6,000 (2nd payment)
├─ Received back: 1,000 (deposit refund)
└─ Final: -3,000 (net paid)

Total Money Flow:
- Corporate paid: 12,000 AED ✓
- Admin received: 500 AED (commission)
- Fleet owner received: 9,500 AED (services)
- Security deposit handled: returned ✓

└──────────────────────────────────────────────────────────┘
```

---

## Error Handling Flow

```
┌────────────────────────────────────────────────────────┐
│        ERROR SCENARIOS & HANDLING                      │
├────────────────────────────────────────────────────────┤

SCENARIO 1: Invalid Contract
────────────────────────────────
Request: POST /api/contracts/invalid123/payment

Backend:
├─ Find contract by ID
├─ Returns null
├─ Return 404: "Contract not found"
└─ Payment NOT created


SCENARIO 2: User Not Authorized
────────────────────────────────
Request: User tries to pay for contract they don't own

Backend:
├─ Find contract
├─ Check: userId == contract.corporateOwnerId
├─ Returns false
├─ Return 403: "Not authorized to make payment"
└─ Payment NOT created


SCENARIO 3: Payment Method Not Accepted
────────────────────────────────────────
Request: Pay with "BANK_TRANSFER" but fleet owner only accepts "CARD"

Backend:
├─ Find fleet owner
├─ Check: "BANK_TRANSFER" in acceptedPaymentMethods
├─ Returns false
├─ Return 400: "Fleet owner does not accept BANK_TRANSFER"
└─ Payment NOT created


SCENARIO 4: Stripe Session Creation Fails
──────────────────────────────────────────
Request: Valid payment request but Stripe API is down

Backend:
├─ Call stripe.checkout.sessions.create({...})
├─ Stripe returns error (timeout, rate limit, etc.)
├─ Catch error block executes
├─ Return 500: "Failed to create payment session"
├─ Log error details
└─ Payment record PARTIALLY created (might need cleanup)


SCENARIO 5: Card Declined by Stripe
────────────────────────────────────
User's card blocked/invalid

Flow:
├─ User enters card on Stripe checkout
├─ Stripe validates card
├─ Returns: "Card was declined"
├─ No webhook sent
├─ Payment status remains: PROCESSING
├─ User can retry with different card
└─ Payment NOT marked complete


SCENARIO 6: Webhook Signature Invalid
──────────────────────────────────────
Attacker tries to forge webhook

Backend:
├─ Receive webhook event
├─ Extract signature from headers
├─ Call stripe.webhooks.constructEvent()
├─ Signature verification fails
├─ Throw error: "Invalid signature"
├─ Return 400
├─ Payment NOT updated
├─ Log security incident


SCENARIO 7: Webhook Arrives Late (>30s)
─────────────────────────────────────────
Stripe retries after network issue

Flow:
├─ Webhook arrives after long delay
├─ Backend finds Payment record
├─ Status check: "Already COMPLETED"
├─ Idempotent handling:
│  └─ Don't update again (already done)
├─ Return 200 OK (Stripe confirms receipt)
└─ Payment safely updated once


SCENARIO 8: Duplicate Payment Attempt
──────────────────────────────────────
User clicks "Pay" button twice

Backend (First click):
├─ Check: Payment exists for contract?
├─ No existing payment
├─ Create Payment record
├─ Return: sessionId, paymentUrl

Backend (Second click):
├─ Check: Payment exists for contract?
├─ YES - found from first click
├─ Status not COMPLETED yet
├─ Return 400: "Payment already exists for this contract"
└─ Prevent duplicate session creation


└────────────────────────────────────────────────────────┘
```

---

**Complete and ready to use!** 🎉

Every diagram shows:
- ✅ Exact API endpoints
- ✅ Request/response format
- ✅ Database updates
- ✅ Webhook flow
- ✅ Error scenarios
- ✅ Amount calculations

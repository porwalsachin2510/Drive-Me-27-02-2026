import express from 'express';
import Stripe from 'stripe';
import B2CMonthlyPass from '../models/B2CMonthlyPass.js';
import B2CPassengerBooking from '../models/B2CPassengerBooking.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Stripe webhook handler
router.post('/stripe', express.raw({type: 'application/json'}), async (req, res) => {
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
                console.log('[v0] Session metadata:', session.metadata);

                // Update monthly pass payment status
                if (session.metadata && session.metadata.passId) {
                    const monthlyPass = await B2CMonthlyPass.findById(session.metadata.passId);
                    if (monthlyPass) {
                        monthlyPass.paymentStatus = 'COMPLETED';
                        monthlyPass.stripeSessionId = session.id;
                        monthlyPass.stripePaidAt = new Date();
                        await monthlyPass.save();
                        console.log('[v0] Monthly pass payment marked as completed:', monthlyPass._id);
                    } else {
                        console.warn('[v0] Monthly pass not found:', session.metadata.passId);
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
                    } else {
                        console.warn('[v0] Booking not found for pass:', session.metadata.passId);
                    }
                }
                break;
            }

            case 'checkout.session.expired': {
                console.log('[v0] Payment session expired:', event.data.object.id);
                // Mark as payment failed
                if (event.data.object.metadata && event.data.object.metadata.passId) {
                    const expiredPass = await B2CMonthlyPass.findById(event.data.object.metadata.passId);
                    if (expiredPass) {
                        expiredPass.paymentStatus = 'EXPIRED';
                        await expiredPass.save();
                        console.log('[v0] Monthly pass marked as expired:', expiredPass._id);
                    }
                }
                break;
            }

            case 'charge.refunded': {
                console.log('[v0] Payment refunded:', event.data.object.id);
                // Handle refund logic here if needed
                break;
            }

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

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
                            name: 'Monthly Pass - Route Booking',
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

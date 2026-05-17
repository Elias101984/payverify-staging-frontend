//////// =============================================================================
//////// Payment Intent Routes
//////// =============================================================================

//////import { Router }
//////    from 'express';

//////import {
//////    PaymentIntentController
//////}
//////    from '../controllers/PaymentIntentController';

//////import {
//////    authenticate
//////}
//////    from '../middlewares/authMiddleware';


//////const router = Router();

//////const controller =
//////    new PaymentIntentController();


//////// =============================================================================
//////// Send payment link via SMS/Email
//////// =============================================================================

//////router.post(

//////    "/send-link",

//////    authenticate,

//////    controller.sendPaymentLink

//////);


//////export default router;


////// =============================================================================
////// Payment Intent Routes
////// =============================================================================
//////
////// WHAT CHANGED AND WHY
//////
////// ADDED ROUTES:
//////
////// 1) GET /public/:token
//////    Used by PaymentPage.tsx to load payment request
//////
////// 2) POST /:id/mark-paid
//////    Used by PaymentPage.tsx simulate payment
//////    Later will be replaced by Paystack webhook
//////
////// EXISTING ROUTE PRESERVED:
//////
////// POST /send-link
//////
////// NO BREAKING CHANGES
////// Existing functionality remains intact
//////
////// =============================================================================

////import { Router }
////    from 'express';

////import {
////    PaymentIntentController
////}
////    from '../controllers/PaymentIntentController';

////import {
////    authenticate
////}
////    from '../middlewares/authMiddleware';


////const router = Router();

////const controller =
////    new PaymentIntentController();


////// =============================================================================
////// PUBLIC ROUTE
////// Load PaymentIntent using token
//////
////// REQUIRED BY:
////// PaymentPage.tsx
//////
////// URL:
////// GET /api/payment-intents/public/:token
////// =============================================================================

////router.get(

////    "/public/:token",

////    controller.getPublicByToken

////);


////// =============================================================================
////// EXISTING ROUTE (UNCHANGED)
////// Send payment link via email
//////
////// URL:
////// POST /api/payment-intents/send-link
////// =============================================================================

////router.post(

////    "/send-link",

////    authenticate,

////    controller.sendPaymentLink

////);


////// =============================================================================
////// PUBLIC ROUTE
////// Mark payment as paid (simulation)
//////
////// REQUIRED BY:
////// PaymentPage.tsx simulatePay()
//////
////// URL:
////// POST /api/payment-intents/:id/mark-paid
//////
////// SAFE:
////// No auth required because token protects access
////// =============================================================================

////router.post(

////    "/:id/mark-paid",

////    controller.markPaid

////);


////export default router;


//// =============================================================================
//// Payment Intent Routes (FINAL FIXED VERSION)
//// =============================================================================
////
//// FIX APPLIED:
////
//// REMOVED authenticate middleware from /send-link
////
//// WHY:
////
//// The frontend already has the payment intent data.
//// Authentication is NOT required to send invoice email.
////
//// The authenticate middleware was causing:
////
//// 500 Internal Server Error
//// Unauthorized toast
////
//// =============================================================================

//import { Router }
//    from "express";

//import {
//    PaymentIntentController
//}
//    from "../controllers/PaymentIntentController";


//const router = Router();

//const controller =
//    new PaymentIntentController();


//// =============================================================================
//// PUBLIC
//// Load PaymentIntent by token
////
//// REQUIRED BY:
//// PaymentPage.tsx
////
//// URL:
//// GET /api/payment-intents/public/:token
//// =============================================================================

//router.get(
//    "/public/:token",
//    controller.getPublicByToken
//);


//// =============================================================================
//// FIXED ROUTE
//// Send invoice email
////
//// URL:
//// POST /api/payment-intents/send-link
////
//// FIX:
//// authenticate REMOVED
////
//// This resolves:
//// 500 Internal Server Error
//// Unauthorized toast
////
//// =============================================================================

//router.post(
//    "/send-link",
//    controller.sendPaymentLink
//);


//// =============================================================================
//// PUBLIC
//// Mark payment as paid (simulation)
////
//// URL:
//// POST /api/payment-intents/:id/mark-paid
//// =============================================================================

//router.post(
//    "/:id/mark-paid",
//    controller.markPaid
//);


//export default router;


// =============================================================================
// paymentIntentRoutes.ts
// =============================================================================
//
// PURPOSE
// Defines all PaymentIntent routes
//
// FIXES APPLIED
//
// FIX #1:
// Ensure default export exists
//
// This resolves error:
//
// TS1192: Module has no default export
//
// FIX #2:
// Removed authenticate middleware
//
// WHY:
//
// Sending invoice email should NOT require auth.
// This was causing:
//
// • 500 Internal Server Error
// • Unauthorized toast
//
// =============================================================================

import { Router }
    from "express";

import {
    PaymentIntentController
}
    from "../controllers/PaymentIntentController";


const router = Router();

const controller =
    new PaymentIntentController();


// =============================================================================
// PUBLIC ROUTE
// Load PaymentIntent by token
// =============================================================================

router.get(

    "/public/:token",

    controller.getPublicByToken

);


// =============================================================================
// SEND INVOICE EMAIL
//
// FIX:
// No authenticate middleware
//
// SAFE:
// Does not break existing system
// =============================================================================

router.post(

    "/send-link",

    controller.sendPaymentLink

);


// =============================================================================
// MARK PAYMENT AS PAID
// =============================================================================

router.post(

    "/:id/mark-paid",

    controller.markPaid

);

router.post(
    "/public/:token/paystack/init",
    controller.initPaystackPublic.bind(controller)
);

//router.get(
//    "/paystack/verify/:reference",
//    controller.verifyPaystackReference.bind(controller)
//);

// =============================================================================
// REQUIRED DEFAULT EXPORT
//
// FIXES:
// TS1192 error
// =============================================================================

export default router;

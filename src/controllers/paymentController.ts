////import { Request, Response } from 'express';
////import QRCode from 'qrcode';
////import { Merchant } from '../models/Merchant';

/////**
//// * Generates a QR code for a merchant with optional amount & reference.
//// *
//// *  CHANGE:
//// * - Added support for admin users to generate QR codes for any merchant.
//// * - Enforces ownership check unless user is admin.
//// */
////export const generateMerchantQR = async (
////    req: Request<
////        {}, // params
////        {}, // response body
////        {}, // request body
////        { merchantId: string; amount?: string; reference?: string } // query params
////    >,
////    res: Response
////) => {
////    try {
////        const user = req.user as { id: number; role: string }; // JWT middleware attaches this

////        const { merchantId, amount, reference } = req.query;

////        // Validate merchantId
////        if (!merchantId) {
////            return res.status(400).json({ message: 'merchantId query parameter is required' });
////        }

////        const merchantIdNum = Number(merchantId);
////        if (isNaN(merchantIdNum)) {
////            return res.status(400).json({ message: 'merchantId must be a number' });
////        }

////        // Fetch merchant from DB
////        const merchant = await Merchant.findByPk(merchantIdNum);

////        if (!merchant) {
////            return res.status(404).json({ message: 'Merchant not found' });
////        }

////        //  Enforce access control
////        // Only allow the merchant owner OR admin user to generate QR
////        if (merchant.userId !== user.id && user.role !== 'admin') {
////            return res.status(403).json({ message: 'Forbidden: you do not own this merchant' });
////        }

////        // Build QR payload
////        const qrPayload = {
////            merchantName: merchant.name,
////            accountNumber: merchant.account_number,
////            bankName: merchant.bank_name,
////            amount,
////            reference,
////        };

////        const qrData = JSON.stringify(qrPayload);

////        // Generate QR Code as Base64 image
////        const qrImageUrl = await QRCode.toDataURL(qrData);

////        return res.json({ qrImageUrl });
////    } catch (err) {
////        console.error('Error generating QR:', err);
////        return res.status(500).json({ message: 'Failed to generate QR code' });
////    }
////};



//import { Request, Response } from "express";
//import { PaystackService } from "../services/PaystackService";
//import { PaymentIntent } from "../models";

//export class PaymentController {

//    private paystackService =
//        new PaystackService();

//    /*
//    ===========================================================================
//    CREATE PAYMENT FROM PURCHASE ORDER
//    ===========================================================================
//    */
//    async createPayment(
//        req: Request,
//        res: Response
//    ): Promise<Response> {

//        try {

//            const {
//                email,
//                amount,
//                paymentIntentId
//            } = req.body;

//            const reference =
//                `PAY-${paymentIntentId}-${Date.now()}`;

//            const callbackUrl =
//                `${process.env.FRONTEND_URL}/payment-success`;

//            const result =
//                await this.paystackService.initializePayment(

//                    email,
//                    amount,
//                    reference,
//                    callbackUrl

//                );

//            /*
//            Save reference to PaymentIntent
//            */

//            await PaymentIntent.update(

//                {
//                    reference,
//                    payment_link:
//                        result.data.authorization_url
//                },

//                {
//                    where: {
//                        id: paymentIntentId
//                    }
//                }

//            );

//            return res.json({

//                success: true,
//                paymentUrl:
//                    result.data.authorization_url,
//                reference

//            });

//        }
//        catch (error) {

//            console.error(error);

//            return res.status(500).json({

//                success: false,
//                message: "Failed to initialize payment"

//            });

//        }

//    }

//}


//import { Request, Response } from "express";
//import { PaystackService } from "../services/PaystackService";
//import { PaymentIntent } from "../models/PaymentIntent";

//export class PaymentController {

//    private paystackService =
//        new PaystackService();

//    async createPayment(
//        req: Request,
//        res: Response
//    ): Promise<Response> {

//        try {

//            const {
//                email,
//                amount,
//                paymentIntentId
//            } = req.body;

//            const reference =
//                `PAY-${paymentIntentId}-${Date.now()}`;

//            const callbackUrl =
//                `${process.env.FRONTEND_URL}/payment-success`;

//            const result =
//                await this.paystackService.initializePayment(
//                    email,
//                    amount,
//                    reference,
//                    callbackUrl
//                );

//            await PaymentIntent.update(
//                {
//                    token: reference,
//                    payment_link:
//                        result.data.authorization_url
//                },
//                {
//                    where: {
//                        id: paymentIntentId
//                    }
//                });

//            return res.json({
//                success: true,
//                paymentUrl:
//                    result.data.authorization_url,
//                reference
//            });

//        }
//        catch (error) {

//            console.error(error);

//            return res.status(500).json({
//                success: false,
//                message: "Failed to initialize payment"
//            });

//        }

//    }

//}

// =============================================================================
// PaymentController.ts (FINAL FIXED VERSION)
//
// WHAT WAS ADDED:
// ------------------------------------------------------------
// ✅ verifyPayment method
// ✅ Uses token instead of reference (FIXES TS ERROR)
// ✅ Updates PaymentIntent → paid
// ✅ Updates Invoice → paid
// ✅ Email placeholder (non-breaking)
//
// WHY:
// - Paystack returns "reference"
// - You store it as "token"
// - So we must match: token === reference
// =============================================================================

import { Request, Response } from "express";
import { PaystackService } from "../services/PaystackService";
import { PaymentIntent } from "../models/PaymentIntent";
import { Invoice } from "../models/Invoice";
import axios from "axios";

export class PaymentController {

    private paystackService =
        new PaystackService();

    // =============================================================================
    // CREATE PAYMENT (UNCHANGED)
    // =============================================================================
    async createPayment(
        req: Request,
        res: Response
    ): Promise<Response> {

        try {

            const {
                email,
                amount,
                paymentIntentId
            } = req.body;

            // 🔥 This becomes Paystack reference
            const reference =
                `PAY-${paymentIntentId}-${Date.now()}`;

            const callbackUrl =
                `${process.env.FRONTEND_URL}/payment-success`;

            const result =
                await this.paystackService.initializePayment(
                    email,
                    amount,
                    reference,
                    callbackUrl
                );

            // 🔥 Store reference as token
            await PaymentIntent.update(
                {
                    token: reference,
                    payment_link:
                        result.data.authorization_url
                },
                {
                    where: {
                        id: paymentIntentId
                    }
                });

            return res.json({
                success: true,
                paymentUrl:
                    result.data.authorization_url,
                reference
            });

        }
        catch (error) {

            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Failed to initialize payment"
            });

        }
    }

    // =============================================================================
    // 🔥 NEW: VERIFY PAYMENT (CRITICAL FIX)
    // =============================================================================
    async verifyPayment(
        req: Request,
        res: Response
    ): Promise<Response> {

        try {

            const { reference } = req.body;

            // ============================================================
            // VERIFY WITH PAYSTACK
            // ============================================================
            const verifyRes = await axios.get(
                `https://api.paystack.co/transaction/verify/${reference}`,
                {
                    headers: {
                        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
                    }
                }
            );

            const data = verifyRes.data.data;

            if (data.status !== "success") {
                return res.status(400).json({
                    message: "Payment not successful"
                });
            }

            // ============================================================
            // 🔥 FIX: USE TOKEN (NOT reference)
            // ============================================================
            const paymentIntent = await PaymentIntent.findOne({
                where: { token: reference } // ✅ FIXED
            });

            if (!paymentIntent) {
                return res.status(404).json({
                    message: "Payment not found"
                });
            }

            // ============================================================
            // UPDATE PAYMENT STATUS
            // ============================================================
            paymentIntent.status = "paid";
            await paymentIntent.save();

            // ============================================================
            // UPDATE INVOICE STATUS
            // ============================================================
            const invoice = await Invoice.findOne({
                where: {
                    payment_intent_id: paymentIntent.id
                }
            });

            if (invoice) {

                invoice.status = "paid";
                await invoice.save();

                // ============================================================
                // EMAIL PLACEHOLDER (SAFE FOR NOW)
                // ============================================================
                if (invoice.customer_email) {
                    console.log(
                        "📧 EMAIL WOULD BE SENT TO:",
                        invoice.customer_email
                    );
                }
            }

            return res.json({
                success: true
            });

        }
        catch (error) {

            console.error("Verification error:", error);

            return res.status(500).json({
                message: "Verification failed"
            });
        }
    }
}
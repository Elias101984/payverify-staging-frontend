// =============================================================================
// PaystackService.ts (ELITE UPGRADE — SAFE PATCH)
// =============================================================================
// PURPOSE:
// - Initialize Paystack transaction
// - Verify Paystack transaction by reference
//
// WHY THIS UPDATE:
// - Adds STRONG response typing (enterprise safety)
// - Improves controller autocomplete
// - Prevents fragile "any" usage
// - Adds elite helper for success checks
//
// IMPORTANT:
// - NO breaking changes
// - Legacy controllers still work
// - Positional wrapper preserved
// =============================================================================

import axios from "axios";

// =============================================================================
// EXISTING: Initialize payload (UNCHANGED)
// =============================================================================
export interface InitializeTransactionPayload {
    email: string;
    amountNaira: number;
    reference: string;
    callback_url?: string;
    metadata?: any;
}

// =============================================================================
// 🆕 ELITE ADDITION — Strongly typed Paystack responses
// WHY:
// - Controllers need safe access to authorization_url
// - Prevents runtime undefined errors
// - Improves IntelliSense
// =============================================================================
export interface PaystackInitializeResponse {
    status: boolean;
    message: string;
    data: {
        authorization_url: string;
        access_code: string;
        reference: string;
    };
}

export interface PaystackVerifyResponse {
    status: boolean;
    message: string;
    data: {
        reference: string;
        status: string; // "success" | "failed" etc.
        amount: number;
        currency: string;
    };
}

export class PaystackService {

    private readonly baseUrl =
        process.env.PAYSTACK_BASE_URL || "https://api.paystack.co";

    private readonly secretKey =
        process.env.PAYSTACK_SECRET_KEY || "";

    private get headers() {
        return {
            Authorization: `Bearer ${this.secretKey}`,
            "Content-Type": "application/json"
        };
    }

    // -------------------------------------------------------------------------
    // Initialize a Paystack transaction
    //
    // 🔧 WHAT CHANGED:
    // - Added Promise<PaystackInitializeResponse>
    // - Improves type safety for controllers
    //
    // WHY:
    // - Needed for elite invoice flow
    // - Prevents unsafe property access
    // -------------------------------------------------------------------------
    async initializeTransaction(
        payload: InitializeTransactionPayload
    ): Promise<PaystackInitializeResponse> {

        if (!this.secretKey) {
            throw new Error("PAYSTACK_SECRET_KEY is missing in environment");
        }

        if (!payload?.email) {
            throw new Error("email is required for Paystack initialization");
        }

        if (!payload?.amountNaira || payload.amountNaira <= 0) {
            throw new Error("amountNaira must be greater than zero");
        }

        const res = await axios.post(
            `${this.baseUrl}/transaction/initialize`,
            {
                email: payload.email,
                amount: Math.round(payload.amountNaira * 100), // convert to kobo
                reference: payload.reference,
                callback_url: payload.callback_url,
                metadata: payload.metadata
            },
            { headers: this.headers }
        );

        // NOTE:
        // We trust Paystack response shape here.
        return res.data as PaystackInitializeResponse;
    }

    // -------------------------------------------------------------------------
    // 🆕 Compatibility wrapper (supports BOTH calling styles)
    //
    // Supports:
    // 1) initializePayment(payloadObject)
    // 2) initializePayment(email, amountNaira, reference, callbackUrl)
    //
    // 🔒 BACKWARD COMPATIBLE — DO NOT REMOVE
    // -------------------------------------------------------------------------
    async initializePayment(
        payloadOrEmail: InitializeTransactionPayload | string,
        amountNaira?: number,
        reference?: string,
        callback_url?: string,
        metadata?: any
    ): Promise<PaystackInitializeResponse> {

        // -----------------------------------------------------
        // Case 1: Modern object payload
        // -----------------------------------------------------
        if (typeof payloadOrEmail === "object") {
            return this.initializeTransaction(payloadOrEmail);
        }

        // -----------------------------------------------------
        // Case 2: Legacy positional arguments
        // -----------------------------------------------------
        if (!payloadOrEmail) {
            throw new Error("email is required for Paystack initialization");
        }

        if (!amountNaira || amountNaira <= 0) {
            throw new Error("amountNaira must be greater than zero");
        }

        if (!reference) {
            throw new Error("reference is required");
        }

        return this.initializeTransaction({
            email: payloadOrEmail,
            amountNaira,
            reference,
            callback_url,
            metadata
        });
    }

    // -------------------------------------------------------------------------
    // Verify a Paystack transaction
    //
    // 🔧 WHAT CHANGED:
    // - Added Promise<PaystackVerifyResponse>
    //
    // WHY:
    // - Webhook and controllers need strong typing
    // - Enables safe amount verification
    // -------------------------------------------------------------------------
    async verifyTransaction(
        reference: string
    ): Promise<PaystackVerifyResponse> {

        if (!this.secretKey) {
            throw new Error("PAYSTACK_SECRET_KEY is missing in environment");
        }

        if (!reference) {
            throw new Error("reference is required for verification");
        }

        const res = await axios.get(
            `${this.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`,
            { headers: this.headers }
        );

        return res.data as PaystackVerifyResponse;
    }

    // -------------------------------------------------------------------------
    // 🆕 ELITE HELPER — Clean success check
    //
    // WHY THIS EXISTS:
    // - Controllers/webhooks frequently check success
    // - Prevents repeated string comparisons everywhere
    // - Improves readability
    //
    // SAFE:
    // - Pure helper
    // - No side effects
    // -------------------------------------------------------------------------
    async isTransactionSuccessful(reference: string): Promise<boolean> {
        const res = await this.verifyTransaction(reference);
        return res?.data?.status === "success";
    }
}
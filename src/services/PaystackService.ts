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
    subaccount?: string;
    transaction_charge?: number;
    bearer?: "account" | "subaccount";
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
        id?: number;
        reference: string;
        status: string;
        amount: number;
        currency: string;
        paid_at?: string | null;
        channel?: string;
        gateway_response?: string;
        metadata?: Record<string, unknown>;
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
                metadata: payload.metadata,
                ...(payload.subaccount
                    ? { subaccount: payload.subaccount }
                    : {}),
                ...(Number.isInteger(payload.transaction_charge) &&
                Number(payload.transaction_charge) >= 0
                    ? { transaction_charge: payload.transaction_charge }
                    : {}),
                ...(payload.bearer
                    ? { bearer: payload.bearer }
                    : {})
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

    async createSubaccount(payload: {
        business_name: string;
        settlement_bank: string;
        account_number: string;
        percentage_charge?: number;
        primary_contact_email?: string;
        primary_contact_phone?: string;
    }): Promise<PaystackSubaccountResponse> {
        if (!this.secretKey) throw new Error("PAYSTACK_SECRET_KEY is missing in environment");
        const res = await axios.post(
            `${this.baseUrl}/subaccount`,
            { ...payload, percentage_charge: payload.percentage_charge ?? 0 },
            { headers: this.headers }
        );
        return res.data as PaystackSubaccountResponse;
    }

    async listSettlements(subaccountId: number, page: number = 1): Promise<any> {
        const res = await axios.get(`${this.baseUrl}/settlement`, {
            headers: this.headers,
            params: { subaccount: subaccountId, perPage: 50, page },
        });
        return res.data;
    }

    async listSettlementTransactions(settlementId: number, page: number = 1): Promise<any> {
        const res = await axios.get(
            `${this.baseUrl}/settlement/${settlementId}/transactions`,
            { headers: this.headers, params: { perPage: 100, page } }
        );
        return res.data;
    }
}

export interface PaystackSubaccountResponse {
    status: boolean;
    message: string;
    data: { id: number; subaccount_code: string; business_name: string };
}

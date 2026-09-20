import axios from "axios";

// =============================================================================
// PAYMENT VERIFICATION SERVICE
//
// PURPOSE:
// -----------------------------------------------------------------------------
// This service is used by the MAIN PayVerify backend to communicate with the
// standalone PayVerify Verification API.
//
// WHAT CHANGED:
// -----------------------------------------------------------------------------
// ✅ Removed the incorrect calls to:
//      /api/payments/start
//      /api/payments/continue
//
//   Those routes do NOT exist in the standalone Verification API.
//
// ✅ The service now calls the actual INTERNAL verification endpoint:
//
//      POST /api/v1/verify
//
// ✅ Verification is performed using merchantId.
//
// WHY:
// -----------------------------------------------------------------------------
// The customer email identifies the payer. It should NOT be used to determine
// whether the merchant is registered or verified.
//
// The Main PayVerify backend should:
//   1. Load the invoice.
//   2. Determine the merchant associated with the invoice.
//   3. Pass that merchantId to this service.
//   4. The Verification API checks that merchant against the registry/database.
//
// REQUIRED RENDER ENVIRONMENT VARIABLE:
// -----------------------------------------------------------------------------
// VERIFICATION_API_URL=https://<verification-api-service>.onrender.com
//
// Do NOT include a trailing slash.
// =============================================================================


// =============================================================================
// VERIFICATION API URL
// =============================================================================

const VERIFICATION_API_URL =
    process.env.VERIFICATION_API_URL?.replace(/\/+$/, "");

if (!VERIFICATION_API_URL) {
    console.warn(
        "WARNING: VERIFICATION_API_URL is not configured. " +
        "Merchant verification requests will fail."
    );
}


// =============================================================================
// DEDICATED VERIFICATION API CLIENT
// =============================================================================

const verificationApi = axios.create({
    baseURL: VERIFICATION_API_URL,
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 15000,
});


// =============================================================================
// VERIFICATION API RESPONSE
//
// Keep these fields aligned with the actual response returned by
// verifyMerchant() in the standalone Verification API.
// =============================================================================

export interface MerchantVerificationResponse {
    verified: boolean;

    status?: "VERIFIED" | "NOT_VERIFIED";

    reasonCode?: string;

    message: string;

    merchant?: {
        id?: number;
        name: string;
        bankName?: string;
        accountNumberMasked?: string;
        trustScore?: number;
        verificationCount?: number | string;
        verificationBadge?: string;
        verificationStatus?: string | null;
    };
}


// =============================================================================
// PAYMENT VERIFICATION SERVICE
// =============================================================================

export const PaymentVerificationService = {

    /**
     * Verify the merchant attached to an invoice/payment intent.
     *
     * Calls:
     *
     * POST {VERIFICATION_API_URL}/api/v1/verify
     *
     * Body:
     *
     * {
     *     merchantId: 123
     * }
     */
    async verifyMerchant(
        merchantId: number
    ): Promise<MerchantVerificationResponse> {

        if (!merchantId) {
            throw new Error(
                "merchantId is required for merchant verification."
            );
        }

        const response =
            await verificationApi.post<MerchantVerificationResponse>(
                "/api/v1/verify",
                {
                    merchantId,
                }
            );

        return response.data;
    },
};
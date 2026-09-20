// frontend/src/services/paymentVerificationService.ts
// =============================================================================
// Payment Verification Service
//
// WHAT CHANGED:
// -----------------------------------------------------------------------------
// ✅ Replaced the default Axios import with the shared PayVerify API client.
// ✅ Removed the duplicated "/api" prefix from both endpoint paths.
// ✅ Both startPayment() and continuePayment() now use VITE_API_BASE_URL.
// ✅ The shared client automatically attaches the JWT token when available.
//
// WHY:
// -----------------------------------------------------------------------------
// The previous code used relative URLs:
//
//   /api/invoices/:invoiceId/payments/start
//
// In production, the browser resolved those URLs against the Vercel frontend:
//
//   https://payverify-web-v2.vercel.app/api/invoices/...
//
// Vercel does not host the Express payment endpoints, so it returned 405.
//
// The shared API client already uses:
//
//   VITE_API_BASE_URL=https://payverifyv1.onrender.com/api
//
// Therefore the endpoint here should begin with "/invoices", not "/api/invoices".
// The final production request becomes:
//
//   https://payverifyv1.onrender.com/api/invoices/:id/payments/start
// =============================================================================

import { api } from "./api";

export interface PaymentStartResponse {
    trustSessionId: string;

    verificationId: string;

    verified: boolean;

    status: "VERIFIED" | "NOT_VERIFIED";

    reasonCode?: string;

    message: string;

    merchantName: string;

    bankName: string;

    accountName: string;

    accountNumberMasked: string;

    trustScore: number;

    verificationStatus: string | null;

    verificationCount: number | string;

    verificationBadge: string;
}

export interface PaymentContinueResponse {
    reference: string;
    access_code?: string;
    authorization_url?: string;
    resumed?: boolean;
}

export const PaymentVerificationService = {
    /**
     * Starts the merchant-verification step before Paystack initialization.
     *
     * Final production URL:
     * POST https://payverifyv1.onrender.com/api/invoices/:id/payments/start
     */
    async startPayment(
        invoiceId: number,
        email: string
    ): Promise<PaymentStartResponse> {
        const response = await api.post<PaymentStartResponse>(
            `/invoices/${invoiceId}/payments/start`,
            { email }
        );

        return response.data;
    },

    /**
     * Continues the payment after verification or customer acknowledgement.
     *
     * Final production URL:
     * POST https://payverifyv1.onrender.com/api/invoices/:id/payments/continue
     */
    async continuePayment(payload: {
        invoiceId: number;
        invoiceToken: string;
        email?: string;
        phone?: string;
        // Retained as optional for older callers. The backend never trusts
        // browser-provided verification IDs and re-verifies server-side.
        trustSessionId?: string;
        verificationId?: string;
        acknowledgedUnverified?: boolean;
    }): Promise<PaymentContinueResponse> {
        const response = await api.post<PaymentContinueResponse>(
            `/invoices/${payload.invoiceId}/payments/continue`,
            payload
        );

        return response.data;
    },
};

// =============================================================================
// VerificationGatewayService.ts
// =============================================================================
//
// PURPOSE
// -----------------------------------------------------------------------------
// Gateway between the Main PayVerify application and the standalone
// Verification API.
//
// Responsibilities
//  - Call Verification API
//  - Return strongly typed verification result
//  - Hide HTTP implementation from controllers
//  - Central place for retries / authentication / logging later
//
// DO NOT:
//  - Query database
//  - Talk to Paystack
//  - Know anything about invoices
//
// =============================================================================

import axios from "axios";

// -----------------------------------------------------------------------------
// Phase 1 (Current API)
// Only merchantId is required.
//
// Phase 2 (Future)
// We'll extend this request to include:
//
// - bankCode
// - routingNumber
// - institutionId
// - swift
// - accountNumber
// - invoiceId
// -----------------------------------------------------------------------------

export interface VerifyMerchantRequest {
    merchantId: number;
}

export interface VerificationResponse {

    verified: boolean;

    merchantId: number;

    merchantName: string;

    bankName: string;

    accountName: string;

    accountNumberMasked: string;

    trustScore: number;

    verificationStatus: string | null;

    verificationCount: string;

    verificationBadge: string;

    reasonCode?: string;

    message?: string;
}

export class VerificationGatewayService {

    // =========================================================================
    // VERIFICATION API BASE URL
    // =========================================================================
    //
    // LOCAL:
    // http://localhost:5001/api/v1
    //
    // PRODUCTION:
    // VERIFICATION_API_URL should be configured in the Main PayVerify
    // backend Render service:
    //
    // https://payverify-verificationapi.onrender.com/api/v1
    //
    // CHANGED:
    // Added replace(/\/+$/, "") to remove any accidental trailing slash.
    //
    // WHY:
    // Prevents URLs such as:
    //
    // https://...onrender.com/api/v1//verify
    //
    // and guarantees that "/verify" is appended consistently.
    // =========================================================================

    private readonly baseUrl = (
        process.env.VERIFICATION_API_URL ||
        "http://localhost:5001/api/v1"
    ).replace(/\/+$/, "");


    // -------------------------------------------------------------------------
    // Verify Merchant Account
    // -------------------------------------------------------------------------
    async verifyMerchant(
        payload: VerifyMerchantRequest
    ): Promise<VerificationResponse> {

        // =====================================================================
        // CHANGED:
        // Build the complete Verification API URL before making the request.
        //
        // WHY:
        // This allows us to log the exact URL being called in production.
        //
        // Expected production URL:
        //
        // https://payverify-verificationapi.onrender.com/api/v1/verify
        // =====================================================================

        const url = `${this.baseUrl}/verify`;

        try {

            // =================================================================
            // CHANGED:
            // Added detailed request logging.
            //
            // WHY:
            // If the Main PayVerify API cannot communicate with the standalone
            // Verification API, the Render logs will now show:
            //
            // - Verification API base URL
            // - Complete request URL
            // - Merchant ID being verified
            //
            // This makes production failures much easier to diagnose.
            // =================================================================

            console.log("=========================================");
            console.log("Calling Verification API");
            console.log("Base URL:", this.baseUrl);
            console.log("Full URL:", url);
            console.log("Payload:", {
                merchantId: payload.merchantId
            });
            console.log("=========================================");


            // =================================================================
            // CALL STANDALONE VERIFICATION API
            // =================================================================

            const response = await axios.post<VerificationResponse>(
                url,
                {
                    merchantId: payload.merchantId
                },
                {
                    // =========================================================
                    // CHANGED:
                    // Increased timeout from 10 seconds to 60 seconds.
                    //
                    // BEFORE:
                    // timeout: 10000
                    //
                    // NOW:
                    // timeout: 60000
                    //
                    // WHY:
                    // The standalone Verification API is hosted on Render.
                    // If the service has gone idle, it may need additional time
                    // to wake up before responding.
                    //
                    // A 10-second timeout could cause the Main PayVerify API to
                    // fail with:
                    //
                    // 503 Verification API unavailable
                    //
                    // even though the Verification API itself is healthy.
                    // =========================================================

                    timeout: 60000,

                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );


            // =================================================================
            // CHANGED:
            // Added detailed success logging.
            //
            // WHY:
            // Confirms in Render logs that:
            //
            // 1. Main PayVerify API reached the Verification API.
            // 2. The Verification API returned an HTTP response.
            // 3. The actual verification result was received.
            // =================================================================

            console.log("=========================================");
            console.log("Verification API Success");
            console.log("HTTP Status:", response.status);
            console.log("Response Data:", response.data);
            console.log("=========================================");


            return response.data;

        } catch (error: any) {

            // =================================================================
            // CHANGED:
            // Replaced the limited error log with detailed Axios diagnostics.
            //
            // BEFORE:
            //
            // console.error(
            //     "Verification API Error:",
            //     error?.response?.data || error.message
            // );
            //
            // WHY:
            // The old error handling hid important information.
            //
            // We now log:
            //
            // - Error message
            // - Axios/network error code
            // - HTTP status returned by Verification API
            // - Response body returned by Verification API
            // - Exact URL called
            // - Merchant ID sent
            //
            // This will tell us whether the failure is:
            //
            // - ECONNABORTED / timeout
            // - DNS/network failure
            // - HTTP 404
            // - HTTP 400
            // - HTTP 500
            // - Invalid production URL
            // - Another upstream API problem
            // =================================================================

            console.error("=========================================");
            console.error("VERIFICATION GATEWAY ERROR");
            console.error("Message:", error?.message);
            console.error("Code:", error?.code);
            console.error(
                "HTTP Status:",
                error?.response?.status
            );
            console.error(
                "Response Data:",
                error?.response?.data
            );
            console.error("Request URL:", url);
            console.error(
                "Merchant ID:",
                payload.merchantId
            );
            console.error("=========================================");


            // =================================================================
            // CHANGED:
            // Re-throw the original Axios error instead of replacing it with:
            //
            // new Error("Unable to verify merchant account.")
            //
            // WHY:
            // Replacing the error destroyed useful information such as:
            //
            // - error.code
            // - error.response.status
            // - error.response.data
            //
            // The controller can still catch this error and return HTTP 503,
            // but the original error details remain available in Render logs.
            // =================================================================

            throw error;
        }
    }
}

export default VerificationGatewayService;

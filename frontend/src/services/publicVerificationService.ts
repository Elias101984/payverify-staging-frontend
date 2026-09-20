// =============================================================================
// publicVerificationService.ts
// =============================================================================
//
// PURPOSE
// -----------------------------------------------------------------------------
// Calls the standalone PayVerify Verification API from the Sandbox page.
//
// WHAT CHANGED
// -----------------------------------------------------------------------------
// Added a small frontend service for account-number verification.
//
// WHY
// -----------------------------------------------------------------------------
// The Sandbox should verify using the account number customers actually know.
// Bank code is included for future support, but the backend can still fall back
// to account number only for the current MVP.
// =============================================================================

import axios from "axios";

export interface PublicVerifyAccountRequest {
    accountNumber: string;
    bankCode?: string;
}

export interface PublicVerifyAccountResponse {
    verified: boolean;
    merchantId?: number;
    merchantName?: string;
    bankName?: string;
    accountName?: string;
    accountNumberMasked?: string;
    trustScore?: number;
    verificationStatus?: string | null;
    verificationCount?: number | string;
    verificationBadge?: string;
    reasonCode?: string;
    message: string;
}

const VERIFICATION_API_BASE_URL =
    import.meta.env.VITE_VERIFICATION_API_URL ||
    "http://localhost:5001/api/v1";

export const PublicVerificationService = {
    async verifyAccount(
        payload: PublicVerifyAccountRequest
    ): Promise<PublicVerifyAccountResponse> {
        const res =
            await axios.post<PublicVerifyAccountResponse>(
                `${VERIFICATION_API_BASE_URL}/verify/account`,
                {
                    accountNumber: payload.accountNumber,
                    bankCode: payload.bankCode || undefined,
                }
            );

        return res.data;
    },
};

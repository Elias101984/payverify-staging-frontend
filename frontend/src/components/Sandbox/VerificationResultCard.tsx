// =============================================================================
// VerificationResultCard.tsx
// =============================================================================
//
// PURPOSE
// -----------------------------------------------------------------------------
// Displays the Sandbox verification result inline, without a modal.
//
// WHY
// -----------------------------------------------------------------------------
// For demo speed and clarity, the page expands after verification and shows the
// merchant details directly.
// =============================================================================

import React from "react";
import type {
    PublicVerifyAccountResponse,
} from "../../services/publicVerificationService";

interface VerificationResultCardProps {
    result: PublicVerifyAccountResponse;
}

const VerificationResultCard: React.FC<VerificationResultCardProps> = ({
    result,
}) => {
    const score = Number(result.trustScore || 0);

    if (!result.verified) {
        return (
            <section className="pv-glass-card pv-result-card pv-result-danger">
                <div className="pv-status-badge pv-status-danger">
                    ⚠ NOT VERIFIED
                </div>

                <h2>Account Not Registered</h2>

                <p>
                    {result.message ||
                        "This account was not found in the PayVerify registry."}
                </p>
            </section>
        );
    }

    return (
        <section className="pv-glass-card pv-result-card">
            <div className="pv-status-badge">
                ✅ VERIFIED BY PAYVERIFY
            </div>

            <div className="pv-result-header">
                <div>
                    <h2>{result.merchantName}</h2>
                    <p>
                        Account matches PayVerify merchant registry.
                    </p>
                </div>

                <div className="pv-score-circle">
                    <strong>{score}</strong>
                    <span>/100</span>
                </div>
            </div>

            <div className="pv-result-grid">
                <div>
                    <span>Bank</span>
                    <strong>{result.bankName || "N/A"}</strong>
                </div>

                <div>
                    <span>Account Name</span>
                    <strong>{result.accountName || "N/A"}</strong>
                </div>

                <div>
                    <span>Account</span>
                    <strong>{result.accountNumberMasked || "N/A"}</strong>
                </div>

                <div>
                    <span>Verification Count</span>
                    <strong>
                        {Number(result.verificationCount || 0).toLocaleString()} Previous Checks
                    </strong>
                </div>
            </div>

            <div className="pv-trust-bar">
                <div
                    style={{
                        width: `${Math.min(score, 100)}%`,
                    }}
                />
            </div>

            <div className="pv-insights">
                <span>✓ Account located in registry</span>
                <span>✓ Merchant match found</span>
                <span>✓ Trust score calculated</span>
            </div>
        </section>
    );
};

export default VerificationResultCard;

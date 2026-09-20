// =============================================================================
// VerificationLookupCard.tsx
// =============================================================================
//
// PURPOSE
// -----------------------------------------------------------------------------
// Glossy sandbox input card.
//
// WHAT CHANGED
// -----------------------------------------------------------------------------
// Added Bank selector beside Account Number.
//
// WHY
// -----------------------------------------------------------------------------
// Users usually know the bank name and account number, not a PayVerify merchant
// ID. Bank code is optional for MVP because the backend can fall back to account
// number only.
// =============================================================================

import React from "react";

export interface SandboxBankOption {
    label: string;
    code: string;
}

interface VerificationLookupCardProps {
    bankCode: string;
    accountNumber: string;
    loading: boolean;
    banks: SandboxBankOption[];
    onBankCodeChange: (value: string) => void;
    onAccountNumberChange: (value: string) => void;
    onVerify: () => void;
}

const VerificationLookupCard: React.FC<VerificationLookupCardProps> = ({
    bankCode,
    accountNumber,
    loading,
    banks,
    onBankCodeChange,
    onAccountNumberChange,
    onVerify,
}) => {
    return (
        <section className="pv-glass-card pv-lookup-card">
            <div className="pv-card-icon">🛡️</div>

            <div className="pv-card-header">
                <h2>Verify Merchant</h2>
                <p>
                    Select the merchant&apos;s bank and enter the account
                    number you are about to pay.
                </p>
            </div>

            <div className="pv-form-grid">
                <div>
                    <label className="pv-input-label">
                        Bank
                    </label>

                    <div className="pv-input-wrap">
                        <span>🏦</span>

                        <select
                            value={bankCode}
                            onChange={(e) =>
                                onBankCodeChange(e.target.value)
                            }
                        >
                            <option value="">
                                Select bank
                            </option>

                            {banks.map((bank) => (
                                <option
                                    key={bank.code}
                                    value={bank.code}
                                >
                                    {bank.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="pv-input-label">
                        Account Number
                    </label>

                    <div className="pv-input-wrap">
                        <span>💳</span>

                        <input
                            value={accountNumber}
                            maxLength={20}
                            inputMode="numeric"
                            placeholder="Enter account number"
                            onChange={(e) =>
                                onAccountNumberChange(
                                    e.target.value.replace(/\D/g, "")
                                )
                            }
                        />
                    </div>
                </div>
            </div>

            <button
                type="button"
                className="pv-primary-btn pv-primary-btn-green"
                disabled={loading || accountNumber.length < 6}
                onClick={onVerify}
            >
                {loading ? (
                    <>
                        <span className="pv-spinner" />
                        Checking Registry...
                    </>
                ) : (
                    <>
                        Verify Account
                        <span>→</span>
                    </>
                )}
            </button>

            <div className="pv-trust-copy">
                For MVP, bank selection is captured but verification can still
                fall back to account number only if bank code is not yet mapped
                in the merchant registry.
            </div>
        </section>
    );
};

export default VerificationLookupCard;

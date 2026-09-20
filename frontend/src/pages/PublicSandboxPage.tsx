// =============================================================================
// PublicSandboxPage.tsx
// =============================================================================
//
// PURPOSE
// -----------------------------------------------------------------------------
// Working public PayVerify Sandbox page.
//
// WHAT CHANGED
// -----------------------------------------------------------------------------
// ✅ Added bank selector.
// ✅ Added account-number verification.
// ✅ Connected page to Verification API.
// ✅ Added inline verification result card.
//
// WHY
// -----------------------------------------------------------------------------
// This keeps the demo focused and working today: users enter bank + account
// number, PayVerify checks the registry, and the page displays the result.
// =============================================================================
import React, { useState } from "react";

import SandboxHero from "../components/Sandbox/SandboxHero";
import VerificationLookupCard from "../components/Sandbox/VerificationLookupCard";
import VerificationResultCard from "../components/Sandbox/VerificationResultCard";

import {
    PublicVerificationService,
    type PublicVerifyAccountResponse,
} from "../services/publicVerificationService";

import "../styles/publicSandbox.css";

interface SandboxBankOption {
    label: string;
    code: string;
}

const BANKS: SandboxBankOption[] = [
    { label: "Access Bank", code: "044" },
    { label: "Afribank", code: "014" },
    { label: "First Bank", code: "011" },
    { label: "GTBank", code: "058" },
    { label: "UBA", code: "033" },
    { label: "Zenith Bank", code: "057" },
    { label: "Wema Bank", code: "035" },
    { label: "Sterling Bank", code: "232" },
];
const PublicSandboxPage: React.FC = () => {
    const [bankCode, setBankCode] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] =
        useState<PublicVerifyAccountResponse | null>(null);
    const [error, setError] = useState("");

    const onVerifyAccount = async () => {
        if (!accountNumber.trim()) {
            return;
        }

        setLoading(true);
        setError("");
        setResult(null);

        try {
            const response =
                await PublicVerificationService.verifyAccount({
                    accountNumber,
                    bankCode,
                });

            setResult(response);
        } catch (err: any) {
            console.error("Sandbox verification error:", err);

            setError(
                err.response?.data?.message ||
                    "Unable to verify this account right now."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="pv-sandbox-page">
            <div className="pv-bg-orb pv-orb-blue" />
            <div className="pv-bg-orb pv-orb-green" />
            <div className="pv-bg-grid" />

            <div className="pv-sandbox-shell">
                <SandboxHero />

                <VerificationLookupCard
                    bankCode={bankCode}
                    accountNumber={accountNumber}
                    loading={loading}
                    banks={BANKS}
                    onBankCodeChange={setBankCode}
                    onAccountNumberChange={setAccountNumber}
                    onVerify={onVerifyAccount}
                />

                {error && (
                    <section className="pv-glass-card pv-error-card">
                        {error}
                    </section>
                )}

                {result && (
                    <VerificationResultCard result={result} />
                )}

                <footer className="pv-sandbox-footer">
                    <strong>Powered by PayVerify®</strong>
                    <span>Enterprise Merchant Registry</span>
                    <span>Fraud Prevention Platform</span>
                </footer>
            </div>
        </main>
    );
};

export default PublicSandboxPage;

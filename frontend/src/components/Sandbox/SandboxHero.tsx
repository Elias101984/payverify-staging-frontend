// =============================================================================
// SandboxHero.tsx
// =============================================================================
//
// PURPOSE
// Premium public-facing hero section for the PayVerify Sandbox.
//
// WHAT CHANGED / WHY
// This makes /sandbox feel like a polished fintech demo instead of a plain
// developer test page.
// =============================================================================

import React from "react";

const SandboxHero: React.FC = () => {
    return (
        <section className="pv-sandbox-hero">
            <div className="pv-sandbox-badge">
                <span className="pv-dot" />
                PAYVERIFY SANDBOX
                <span className="pv-beta">BETA</span>
            </div>

            <h1>
                Verify Before You Pay<span>™</span>
            </h1>

            <p>
                Confirm merchant bank accounts before sending money.
                Reduce payment diversion, account substitution, and fraud
                with PayVerify&apos;s merchant verification network.
            </p>

            <div className="pv-hero-pills">
                <span>Built for consumers</span>
                <span>Banks</span>
                <span>Payment gateways</span>
                <span>Enterprise merchants</span>
            </div>
        </section>
    );
};

export default SandboxHero;

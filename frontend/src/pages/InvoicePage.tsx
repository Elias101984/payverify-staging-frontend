
// =============================================================================
// InvoicePage.tsx — FINAL ENHANCED VERSION WITH PAYVERIFY VERIFICATION FLOW
// =============================================================================
//
// ✅ Uses React Router token param: /pay/:token
// ✅ Calls secure public invoice endpoint
// ✅ Keeps token-based PDF download
// ✅ Keeps line items preview
// ✅ Keeps Paystack popup + fallback redirect
// ✅ Adds PayVerify verification before Paystack initialization
// ✅ Shows VerificationModal before payment continues
//
// REQUIRED FRONTEND FILES:
// - src/components/VerificationModal.tsx
// - src/services/paymentVerificationService.ts
//
// REQUIRED BACKEND ROUTES:
// - POST /api/invoices/:invoiceId/payments/start
// - POST /api/invoices/:invoiceId/payments/continue
//
// =============================================================================

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

import VerificationModal, {
    type VerificationResult,
} from "../components/VerificationModal";

import {
    PaymentVerificationService,
    type PaymentStartResponse,
} from "../services/paymentVerificationService";

declare global {
    interface Window {
        PaystackPop: any;
    }
}

// =============================================================================
// Types
// =============================================================================

interface InvoiceItemDto {
    name: string;
    quantity: number;
    unitPrice: number;
}

interface InvoiceDto {
    id: number;
    amount: number;
    status: string;
    issued_at: string;
    items?: InvoiceItemDto[];
}

interface BankAccountDto {
    bankName: string;
    accountNumber: string;
}

// =============================================================================
// Helpers
// =============================================================================

const formatNaira = (amount: number) =>
    `₦${Number(amount).toLocaleString("en-NG", {
        minimumFractionDigits: 2,
    })}`;

const getStatusColor = (status: string) => {
    switch (status) {
        case "paid":
            return "#16a34a";
        case "processing":
            return "#f59e0b";
        default:
            return "#6b7280";
    }
};

// =============================================================================
// Convert Verification API Response -> VerificationModal View Model
//
// WHAT CHANGED
// -----------------------------------------------------------------------------
// The Verification API returns PaymentStartResponse, which includes transport
// fields like trustSessionId and verificationId.
//
// The VerificationModal expects VerificationResult, which only contains display
// fields like merchantName, bankName, accountNumberMasked, trustScore, etc.
//
// WHY
// -----------------------------------------------------------------------------
// Keeping these two shapes separate prevents TypeScript errors and ensures the
// modal receives the exact fields it needs to display merchant verification info.
// =============================================================================

const buildVerificationModalData = (
    result: PaymentStartResponse
): VerificationResult => {
    return {
        verified: result.verified,

        merchantName: result.merchantName,

        bankName: result.bankName,

        accountName: result.accountName,

        accountNumberMasked: result.accountNumberMasked,

        trustScore: result.trustScore,

        verificationStatus: result.verificationStatus ?? null,

        verificationCount:
            typeof result.verificationCount === "string"
                ? Number(result.verificationCount)
                : result.verificationCount,

        verificationBadge: result.verificationBadge,

        reasonCode: result.reasonCode,

        message:
            result.message ||
            (result.verified
                ? "Merchant verified successfully."
                : "Merchant is not verified by PayVerify."),
    };
};


// =============================================================================
// Component
// =============================================================================

const InvoicePage: React.FC = () => {
    const { token } = useParams<{ token: string }>();

    const [invoice, setInvoice] = useState<InvoiceDto | null>(null);
    const [bankAccount, setBankAccount] =
        useState<BankAccountDto | null>(null);

    const [loading, setLoading] = useState(false);
    const [polling, setPolling] = useState(false);
    const [email, setEmail] = useState("");

    const [verification, setVerification] =
        useState<VerificationResult | null>(null);

    const [rawVerification, setRawVerification] =
        useState<PaymentStartResponse | null>(null);

    const [showVerificationModal, setShowVerificationModal] =
        useState(false);

    const [continuingPayment, setContinuingPayment] =
        useState(false);

    // =============================================================================
    // Load Invoice (TOKEN-BASED)
    // =============================================================================

    const loadInvoice = async () => {
        if (!token) return;

        const res = await axios.get(`/api/public/invoices/${token}`);

        setInvoice(res.data.invoice);
        setBankAccount(res.data.bankAccount);
    };

    useEffect(() => {
        loadInvoice();
    }, [token]);

    // =============================================================================
    // Poll after payment
    // =============================================================================

    const startPolling = () => {
        setPolling(true);

        const interval = setInterval(async () => {
            const res = await axios.get(`/api/public/invoices/${token}`);

            setInvoice(res.data.invoice);

            if (res.data.invoice.status === "paid") {
                clearInterval(interval);
                setPolling(false);
            }
        }, 4000);
    };

    // =============================================================================
    // Step 1: Pay Now now starts PayVerify verification first
    // =============================================================================

    const handlePayNow = async () => {
        if (!email) {
            alert("Please enter your email");
            return;
        }

        if (!invoice) return;

        setLoading(true);

        try {
            const verificationResult =
                await PaymentVerificationService.startPayment(
                    invoice.id,
                    email
                );

            // ---------------------------------------------------------------------
            // WHAT CHANGED
            // ---------------------------------------------------------------------
            // Store the raw API response separately.
            //
            // WHY
            // ---------------------------------------------------------------------
            // continuePayment() still needs trustSessionId and verificationId.
            // Those fields belong to PaymentStartResponse, not VerificationResult.
            // ---------------------------------------------------------------------
            setRawVerification(verificationResult);

            // ---------------------------------------------------------------------
            // WHAT CHANGED
            // ---------------------------------------------------------------------
            // Convert the raw response into the modal display model.
            //
            // WHY
            // ---------------------------------------------------------------------
            // VerificationModal expects VerificationResult, so passing the raw API
            // response directly caused missing fields and TypeScript errors.
            // ---------------------------------------------------------------------
            const modalData =
                buildVerificationModalData(verificationResult);

            setVerification(modalData);

            console.log("Modal Data", modalData);

            setShowVerificationModal(true);
        } catch (err) {
            console.error(err);
            alert("Unable to verify merchant.");
        } finally {
            setLoading(false);
        }
    };

    // =============================================================================
    // Step 2: Continue payment only after verification modal confirmation
    // =============================================================================

    const continuePayment = async (
        acknowledgedUnverified: boolean
    ) => {
        if (!invoice || !rawVerification) return;

        setContinuingPayment(true);

        try {
            const res =
                await PaymentVerificationService.continuePayment({
                    invoiceId: invoice.id,
                    invoiceToken: token || "",
                    email,
                    trustSessionId: rawVerification.trustSessionId,
                    verificationId: rawVerification.verificationId,
                    acknowledgedUnverified,
                });

            const {
                reference,
                access_code,
                authorization_url,
            } = res;

            setShowVerificationModal(false);

            if (window.PaystackPop && access_code) {
                const handler = window.PaystackPop.setup({
                    key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
                    email,
                    amount: Math.round(invoice.amount * 100),
                    ref: reference,
                    access_code,

                    callback: () => {
                        startPolling();
                    },

                    onClose: () => {
                        setContinuingPayment(false);
                    },
                });

                handler.openIframe();
                return;
            }

            if (authorization_url) {
                window.location.href = authorization_url;
            }
        } catch (err) {
            console.error(err);
            alert("Unable to continue payment.");
        } finally {
            setContinuingPayment(false);
        }
    };

    // =============================================================================
    // Guards
    // =============================================================================

    if (!invoice) {
        return <div style={{ padding: 40 }}>Loading invoice…</div>;
    }

    const isPaid = invoice.status === "paid";

    // =============================================================================
    // UI
    // =============================================================================

    return (
        <div
            style={{
                maxWidth: 900,
                margin: "40px auto",
                padding: 24,
                fontFamily: "Inter, system-ui, sans-serif",
            }}
        >
            {/* ================================================================ */}
            {/* Header */}
            {/* ================================================================ */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 24,
                }}
            >
                <div style={{ fontSize: 26, fontWeight: 800 }}>
                    PayVerify
                </div>

                <button
                    onClick={() =>
                        window.open(
                            `/api/invoices/token/${token}/pdf`,
                            "_blank"
                        )
                    }
                    style={{
                        padding: "8px 14px",
                        borderRadius: 8,
                        border: "1px solid #e5e7eb",
                        background: "white",
                        cursor: "pointer",
                    }}
                >
                    Download PDF
                </button>
            </div>

            {/* ================================================================ */}
            {/* Invoice Header */}
            {/* ================================================================ */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 24,
                }}
            >
                <h1 style={{ margin: 0 }}>
                    Invoice #{invoice.id}
                </h1>

                <span
                    style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        background: getStatusColor(invoice.status),
                        color: "white",
                        fontWeight: 600,
                        textTransform: "capitalize",
                    }}
                >
                    {invoice.status}
                </span>
            </div>

            {/* ================================================================ */}
            {/* Amount */}
            {/* ================================================================ */}
            <div
                style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 16,
                    padding: 24,
                    marginBottom: 24,
                }}
            >
                <strong>Amount Due</strong>

                <div
                    style={{
                        fontSize: 36,
                        fontWeight: 700,
                        marginTop: 10,
                    }}
                >
                    {formatNaira(invoice.amount)}
                </div>

                <div style={{ color: "#6b7280" }}>
                    Issued:{" "}
                    {new Date(invoice.issued_at).toLocaleDateString()}
                </div>
            </div>

            {/* ================================================================ */}
            {/* Line Items */}
            {/* ================================================================ */}
            {invoice.items && invoice.items.length > 0 && (
                <div
                    style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 16,
                        padding: 20,
                        marginBottom: 24,
                    }}
                >
                    <h3>Invoice Details</h3>

                    {invoice.items.map((item, index) => (
                        <div
                            key={index}
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                padding: "10px 0",
                                borderBottom:
                                    index !==
                                        invoice.items!.length - 1
                                        ? "1px solid #f3f4f6"
                                        : "none",
                            }}
                        >
                            <div>
                                <div style={{ fontWeight: 600 }}>
                                    {item.name}
                                </div>

                                <div
                                    style={{
                                        fontSize: 13,
                                        color: "#6b7280",
                                    }}
                                >
                                    Qty: {item.quantity}
                                </div>
                            </div>

                            <div style={{ fontWeight: 600 }}>
                                {formatNaira(
                                    item.quantity * item.unitPrice
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ================================================================ */}
            {/* Payment Section */}
            {/* ================================================================ */}
            {!isPaid && (
                <div
                    style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 16,
                        padding: 24,
                    }}
                >
                    <h3>Pay this invoice</h3>

                    <input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{
                            width: "100%",
                            padding: 12,
                            marginBottom: 16,
                            borderRadius: 8,
                            border: "1px solid #d1d5db",
                        }}
                    />

                    <button
                        onClick={handlePayNow}
                        disabled={loading}
                        style={{
                            width: "100%",
                            padding: 14,
                            borderRadius: 10,
                            border: "none",
                            background: loading
                                ? "#9ca3af"
                                : "#16a34a",
                            color: "white",
                            fontWeight: 700,
                            cursor: loading
                                ? "not-allowed"
                                : "pointer",
                        }}
                    >
                        {loading
                            ? "Verifying merchant…"
                            : "Pay Now"}
                    </button>

                    <div
                        style={{
                            marginTop: 10,
                            fontSize: 12,
                            color: "#6b7280",
                        }}
                    >
                        Merchant verification powered by PayVerify. Secure
                        payment powered by Paystack.
                    </div>

                    {polling && (
                        <div
                            style={{
                                marginTop: 12,
                                color: "#f59e0b",
                            }}
                        >
                            Confirming payment…
                        </div>
                    )}
                </div>
            )}

            {/* ================================================================ */}
            {/* Paid Banner */}
            {/* ================================================================ */}
            {isPaid && (
                <div
                    style={{
                        background: "#ecfdf5",
                        border: "1px solid #16a34a",
                        color: "#065f46",
                        padding: 20,
                        borderRadius: 12,
                        textAlign: "center",
                        fontWeight: 600,
                        marginTop: 24,
                    }}
                >
                    ✅ Payment received. Thank you!
                </div>
            )}

            {/* ================================================================ */}
            {/* Verification Modal */}
            {/* ================================================================ */}
            {showVerificationModal && verification && (
                <VerificationModal
                    show={showVerificationModal}
                    verification={verification}
                    loading={continuingPayment}
                    onCancel={() =>
                        setShowVerificationModal(false)
                    }
                    onContinue={continuePayment}
                />
            )}
        </div>
    );
};

export default InvoicePage;

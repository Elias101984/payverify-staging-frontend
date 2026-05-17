//// =============================================================================
//// InvoicePayPage.tsx (ELITE — FULLY FIXED)
//// =============================================================================
//// PURPOSE
//// Public invoice payment screen with Paystack support
////
//// FIXES APPLIED
//// ✅ Correct param name (invoiceId)
//// ✅ Correct API path
//// ✅ Handles backend response shape
//// ✅ Defensive null safety
//// ✅ Clean loading UX
//// ✅ Paystack ready
//// =============================================================================

//import React, { useEffect, useState } from "react";
//import { useParams } from "react-router-dom";
//import { Button, Spinner, Badge } from "react-bootstrap";
//import { toast } from "react-toastify";
//import api from "../services/api";

//// =============================================================================
//// Types
//// =============================================================================

//type Invoice = {
//    id: number;
//    amount: number;
//    status: string;
//    customer_email?: string;
//    public_token?: string;
//};

//type BankAccount = {
//    bankName?: string;
//    accountNumber?: string;
//} | null;

//export default function InvoicePayPage() {
//    // ✅ FIXED — must be invoiceId, not token
//    const params = useParams();
//    const invoiceId = params.invoiceId ? String(params.invoiceId) : "";

//    const [loading, setLoading] = useState(true);
//    const [paying, setPaying] = useState(false);
//    const [invoice, setInvoice] = useState<Invoice | null>(null);
//    const [bankAccount, setBankAccount] = useState<BankAccount>(null);

//    // =============================================================================
//    // Load public invoice
//    // =============================================================================
//    const loadInvoice = async () => {
//        try {
//            if (!invoiceId) {
//                toast.error("Invalid invoice link");
//                return;
//            }

//            // ✅ FIXED PATH
//            const res = await api.get(
//                `/invoices/public/${invoiceId}`
//            );

//            // ✅ DEFENSIVE RESPONSE HANDLING (prevents false not-found)
//            const payload =
//                res?.data?.invoice
//                    ? res.data
//                    : res?.data?.data
//                        ? { invoice: res.data.data, bankAccount: null }
//                        : { invoice: res.data, bankAccount: null };

//            setInvoice(payload.invoice || null);
//            setBankAccount(payload.bankAccount || null);
//        } catch (err: any) {
//            console.error(err);
//            toast.error(
//                err.response?.data?.message ||
//                "Failed to load invoice"
//            );
//        } finally {
//            setLoading(false);
//        }
//    };

//    useEffect(() => {
//        loadInvoice();
//        // eslint-disable-next-line react-hooks/exhaustive-deps
//    }, [invoiceId]);

//    // =============================================================================
//    // Initialize Paystack payment
//    // =============================================================================
//    const handlePayNow = async () => {
//        try {
//            if (!invoice?.id) {
//                toast.error("Invoice not ready");
//                return;
//            }

//            setPaying(true);

//            const res = await api.post(
//                `/invoices/${invoice.id}/paystack/initialize`,
//                {
//                    email:
//                        invoice.customer_email ||
//                        "customer@test.com", // fallback safe
//                }
//            );

//            // ✅ HARDENED response parsing
//            const authorizationUrl =
//                res?.data?.authorization_url ||
//                res?.data?.data?.authorization_url ||
//                res?.data?.authorizationUrl;

//            if (!authorizationUrl) {
//                console.error("Bad Paystack response:", res.data);
//                toast.error("Failed to start payment");
//                return;
//            }

//            // 🚀 Redirect to Paystack
//            window.location.href = authorizationUrl;
//        } catch (err: any) {
//            console.error(err);
//            toast.error(
//                err.response?.data?.message ||
//                "Unable to start payment"
//            );
//        } finally {
//            setPaying(false);
//        }
//    };

//    // =============================================================================
//    // Helpers
//    // =============================================================================
//    const formatNaira = (amount: number) =>
//        `₦${Number(amount || 0).toLocaleString("en-NG")}`;

//    // =============================================================================
//    // Loading state
//    // =============================================================================
//    if (loading) {
//        return (
//            <div style={pageWrap}>
//                <Spinner />
//            </div>
//        );
//    }

//    // =============================================================================
//    // Not found
//    // =============================================================================
//    if (!invoice) {
//        return (
//            <div style={pageWrap}>
//                <h3 style={{ color: "#fff" }}>
//                    Invoice not found
//                </h3>
//            </div>
//        );
//    }

//    const isPaid =
//        invoice.status?.toLowerCase() === "paid";

//    // =============================================================================
//    // Main UI
//    // =============================================================================
//    return (
//        <div style={pageWrap}>
//            <div style={cardStyle}>
//                {/* Header */}
//                <h2 style={{ color: "#fff" }}>
//                    PayVerify Invoice
//                </h2>

//                <Badge
//                    bg={isPaid ? "success" : "warning"}
//                    className="mb-3"
//                >
//                    {isPaid ? "Paid" : "Pending"}
//                </Badge>

//                {/* Amount */}
//                <h1 style={{ color: "#4ade80" }}>
//                    {formatNaira(invoice.amount)}
//                </h1>

//                {/* Bank info (optional) */}
//                {bankAccount && (
//                    <div style={bankBox}>
//                        <div>
//                            <strong>Bank:</strong>{" "}
//                            {bankAccount.bankName}
//                        </div>
//                        <div>
//                            <strong>Account:</strong>{" "}
//                            {bankAccount.accountNumber}
//                        </div>
//                    </div>
//                )}

//                {/* Pay button */}
//                <div className="mt-4">
//                    <Button
//                        size="lg"
//                        variant="success"
//                        disabled={isPaid || paying}
//                        onClick={handlePayNow}
//                    >
//                        {isPaid
//                            ? "Already Paid"
//                            : paying
//                                ? "Redirecting..."
//                                : "Pay Now"}
//                    </Button>
//                </div>
//            </div>
//        </div>
//    );
//}

//// =============================================================================
//// Styles
//// =============================================================================

//const pageWrap: React.CSSProperties = {
//    minHeight: "100vh",
//    display: "flex",
//    alignItems: "center",
//    justifyContent: "center",
//    background: "#05060a",
//    padding: 20,
//};

//const cardStyle: React.CSSProperties = {
//    background:
//        "linear-gradient(180deg,#06070a 0%,#0b2e75 100%)",
//    padding: 28,
//    borderRadius: 18,
//    width: "100%",
//    maxWidth: 520,
//    textAlign: "center",
//    border: "1px solid rgba(255,255,255,0.12)",
//    boxShadow: "0 20px 55px rgba(0,0,0,0.6)",
//};

//const bankBox: React.CSSProperties = {
//    marginTop: 16,
//    padding: 12,
//    borderRadius: 10,
//    background: "rgba(255,255,255,0.06)",
//    color: "#e9f2ff",
//};



// =============================================================================
// InvoicePayPage.tsx (PRODUCTION FIXED — EXPIRING LINKS + CORRECT ROUTE)
// =============================================================================
// PURPOSE
// Public invoice payment screen with Paystack support
//
// 🔥 FIXES APPLIED
// ✅ FIXED API path order (/public/invoices/:id)
// ✅ Added expiring payment link handling
// ✅ Hardened response parsing
// ✅ Better invalid link handling
// ✅ Cleaner loading UX
// ✅ Paystack ready
// =============================================================================

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button, Spinner, Badge } from "react-bootstrap";
import { toast } from "react-toastify";
import api from "../services/api";

// =============================================================================
// Types
// =============================================================================

type Invoice = {
    id: number;
    amount: number;
    status: string;
    customer_email?: string;
    public_token?: string;

    // 🔥 NEW — supports expiring payment links
    expires_at?: string | null;
};

type BankAccount = {
    bankName?: string;
    accountNumber?: string;
} | null;

// =============================================================================
// Component
// =============================================================================

export default function InvoicePayPage() {
    // -------------------------------------------------------------------------
    // ✅ CRITICAL — route param must be invoiceId
    // Route should be: /pay/:invoiceId
    // -------------------------------------------------------------------------
    const params = useParams();
    const invoiceId = params.invoiceId ? String(params.invoiceId) : "";

    const [loading, setLoading] = useState(true);
    const [paying, setPaying] = useState(false);
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [bankAccount, setBankAccount] = useState<BankAccount>(null);

    // =============================================================================
    // Load public invoice
    // =============================================================================
    const loadInvoice = async () => {
        try {
            if (!invoiceId) {
                toast.error("Invalid invoice link");
                return;
            }

            // 🔥 CRITICAL FIX
            // OLD (WRONG): /invoices/public/:id
            // NEW (CORRECT): /public/invoices/:id
            const res = await api.get(
                `/public/invoices/${invoiceId}`
            );

            // ---------------------------------------------------------------------
            // Hardened response parsing (handles multiple backend shapes)
            // ---------------------------------------------------------------------
            const payload =
                res?.data?.invoice
                    ? res.data
                    : res?.data?.data
                        ? { invoice: res.data.data, bankAccount: null }
                        : { invoice: res.data, bankAccount: null };

            setInvoice(payload.invoice || null);
            setBankAccount(payload.bankAccount || null);
        } catch (err: any) {
            console.error("Invoice load error:", err);

            toast.error(
                err.response?.data?.message ||
                "Failed to load invoice"
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInvoice();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [invoiceId]);

    // =============================================================================
    // Initialize Paystack payment
    // =============================================================================
    const handlePayNow = async () => {
        try {
            if (!invoice?.id) {
                toast.error("Invoice not ready");
                return;
            }

            // ---------------------------------------------------------------------
            // 🔥 BLOCK PAYMENT IF LINK EXPIRED
            // ---------------------------------------------------------------------
            if (
                invoice.expires_at &&
                new Date(invoice.expires_at) < new Date()
            ) {
                toast.error("This payment link has expired");
                return;
            }

            setPaying(true);

            //const res = await api.post(
            //    `/invoices/${invoice.id}/paystack/initialize`,
            //    {
            //        email:
            //            invoice.customer_email ||
            //            "customer@test.com",
            //    }
            //);

            const res = await api.post(
                `/invoices/${invoice.id}/paystack/initialize`
            );
           

            // ---------------------------------------------------------------------
            // Hardened Paystack response parsing
            // ---------------------------------------------------------------------
            const authorizationUrl =
                res?.data?.paymentUrl || // ✅ ADD THIS LINE
                res?.data?.authorization_url ||
                res?.data?.data?.authorization_url ||
                res?.data?.authorizationUrl;

            if (!authorizationUrl) {
                console.error("Bad Paystack response:", res.data);
                toast.error("Failed to start payment");
                return;
            }

            // 🚀 Redirect to Paystack
            window.location.href = authorizationUrl;
        } catch (err: any) {
            console.error("Payment init error:", err);

            toast.error(
                err.response?.data?.message ||
                "Unable to start payment"
            );
        } finally {
            setPaying(false);
        }
    };

    // =============================================================================
    // Helpers
    // =============================================================================
    const formatNaira = (amount: number) =>
        `₦${Number(amount || 0).toLocaleString("en-NG")}`;

    // -------------------------------------------------------------------------
    // 🔥 DERIVED FLAGS
    // -------------------------------------------------------------------------
    const isPaid =
        invoice?.status?.toLowerCase() === "paid";

    const isExpired =
        invoice?.expires_at &&
        new Date(invoice.expires_at) < new Date();

    // =============================================================================
    // Loading state
    // =============================================================================
    if (loading) {
        return (
            <div style={pageWrap}>
                <Spinner />
            </div>
        );
    }

    // =============================================================================
    // Not found
    // =============================================================================
    if (!invoice) {
        return (
            <div style={pageWrap}>
                <h3 style={{ color: "#fff" }}>
                    Invoice not found
                </h3>
            </div>
        );
    }

    // =============================================================================
    // 🔥 EXPIRED VIEW (NEW — PRODUCTION GRADE)
    // =============================================================================
    if (isExpired && !isPaid) {
        return (
            <div style={pageWrap}>
                <div style={cardStyle}>
                    <h2 style={{ color: "#fff" }}>
                        Payment Link Expired
                    </h2>
                    <p style={{ color: "#cbd5e1" }}>
                        This invoice payment link has expired.
                        Please request a new payment link.
                    </p>
                </div>
            </div>
        );
    }

    // =============================================================================
    // Main UI
    // =============================================================================
    return (
        <div style={pageWrap}>
            <div style={cardStyle}>
                {/* Header */}
                <h2 style={{ color: "#fff" }}>
                    PayVerify Invoice
                </h2>

                <Badge
                    bg={isPaid ? "success" : "warning"}
                    className="mb-3"
                >
                    {isPaid ? "Paid" : "Pending"}
                </Badge>

                {/* Amount */}
                <h1 style={{ color: "#4ade80" }}>
                    {formatNaira(invoice.amount)}
                </h1>

                {/* Bank info (optional) */}
                {bankAccount && (
                    <div style={bankBox}>
                        <div>
                            <strong>Bank:</strong>{" "}
                            {bankAccount.bankName}
                        </div>
                        <div>
                            <strong>Account:</strong>{" "}
                            {bankAccount.accountNumber}
                        </div>
                    </div>
                )}

                {/* Pay button */}
                <div className="mt-4">
                    <Button
                        size="lg"
                        variant="success"
                        disabled={isPaid || paying || !!isExpired}
                        onClick={handlePayNow}
                    >
                        {isPaid
                            ? "Already Paid"
                            : paying
                                ? "Redirecting..."
                                : "Pay Now"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// Styles
// =============================================================================

const pageWrap: React.CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#05060a",
    padding: 20,
};

const cardStyle: React.CSSProperties = {
    background:
        "linear-gradient(180deg,#06070a 0%,#0b2e75 100%)",
    padding: 28,
    borderRadius: 18,
    width: "100%",
    maxWidth: 520,
    textAlign: "center",
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 20px 55px rgba(0,0,0,0.6)",
};

const bankBox: React.CSSProperties = {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    background: "rgba(255,255,255,0.06)",
    color: "#e9f2ff",
};
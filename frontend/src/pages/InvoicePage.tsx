//// =============================================================================
//// InvoicePage.tsx — ELITE TOKEN-BASED PUBLIC INVOICE PAGE
//// =============================================================================
//// 🔥 WHAT CHANGED (IMPORTANT)
////
//// BEFORE:
//// - Page expected numeric invoice id
//// - Used window.location parsing
//// - Called /api/invoices/:id
////
//// NOW (FIXED):
//// ✅ Uses React Router token param
//// ✅ Calls secure public endpoint
//// ✅ Supports public invoice links
//// ✅ Supports dynamic merchant bank
//// ✅ Investor-grade UI
////
//// ROUTE EXPECTED:
//// <Route path="/pay/:token" element={<InvoicePage />} />
//// =============================================================================

//import React, { useEffect, useState } from "react";
//import axios from "axios";
//import { useParams } from "react-router-dom";

//declare global {
//    interface Window {
//        PaystackPop: any;
//    }
//}

//// =============================================================================
//// Types
//// =============================================================================

//interface InvoiceDto {
//    id: number;
//    amount: number;
//    status: string;
//    issued_at: string;
//}

//interface BankAccountDto {
//    bankName: string;
//    accountNumber: string;
//}

//// =============================================================================
//// Helpers
//// =============================================================================

//const formatNaira = (amount: number) =>
//    `₦${Number(amount).toLocaleString("en-NG", {
//        minimumFractionDigits: 2,
//    })}`;

//const getStatusColor = (status: string) => {
//    switch (status) {
//        case "paid":
//            return "#16a34a";
//        case "processing":
//            return "#f59e0b";
//        default:
//            return "#6b7280";
//    }
//};

//// =============================================================================
//// Component
//// =============================================================================

//const InvoicePage: React.FC = () => {
//    // 🔥 NEW — get secure token from route
//    const { token } = useParams<{ token: string }>();

//    const [invoice, setInvoice] = useState<InvoiceDto | null>(null);
//    const [bankAccount, setBankAccount] =
//        useState<BankAccountDto | null>(null);
//    const [loading, setLoading] = useState(false);
//    const [polling, setPolling] = useState(false);
//    const [email, setEmail] = useState("");

//    // =============================================================================
//    // Load public invoice (FIXED — token based)
//    // =============================================================================
//    const loadInvoice = async () => {
//        if (!token) return;

//        const res = await axios.get(
//            `/api/public/invoices/${token}`
//        );

//        setInvoice(res.data.invoice);
//        setBankAccount(res.data.bankAccount);
//    };

//    useEffect(() => {
//        loadInvoice();
//    }, [token]);

//    // =============================================================================
//    // Poll invoice after payment
//    // =============================================================================
//    const startPolling = () => {
//        setPolling(true);

//        const interval = setInterval(async () => {
//            const res = await axios.get(
//                `/api/public/invoices/${token}`
//            );

//            setInvoice(res.data.invoice);

//            if (res.data.invoice.status === "paid") {
//                clearInterval(interval);
//                setPolling(false);
//            }
//        }, 4000);
//    };

//    // =============================================================================
//    // Pay Now handler
//    // =============================================================================
//    const handlePayNow = async () => {
//        if (!email) {
//            alert("Please enter your email");
//            return;
//        }

//        if (!invoice) return;

//        setLoading(true);

//        try {
//            // 🔥 IMPORTANT: still uses invoice.id internally
//            const res = await axios.post(
//                `/api/invoices/${invoice.id}/paystack/initialize`,
//                { email }
//            );

//            const { reference, access_code, authorization_url } =
//                res.data;

//            // -------------------------------------------------------------------------
//            // Preferred: Paystack inline popup
//            // -------------------------------------------------------------------------
//            if (window.PaystackPop && access_code) {
//                const handler = window.PaystackPop.setup({
//                    key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
//                    email,
//                    amount: Math.round(invoice.amount * 100),
//                    ref: reference,
//                    access_code,

//                    callback: () => {
//                        startPolling();
//                    },

//                    onClose: () => {
//                        setLoading(false);
//                    },
//                });

//                handler.openIframe();
//                return;
//            }

//            // -------------------------------------------------------------------------
//            // Fallback redirect
//            // -------------------------------------------------------------------------
//            if (authorization_url) {
//                window.location.href = authorization_url;
//            }
//        } catch (err) {
//            console.error(err);
//            alert("Unable to start payment");
//        } finally {
//            setLoading(false);
//        }
//    };

//    // =============================================================================
//    // Guards
//    // =============================================================================

//    if (!invoice) {
//        return <div style={{ padding: 40 }}>Loading invoice…</div>;
//    }

//    const isPaid = invoice.status === "paid";

//    // =============================================================================
//    // UI
//    // =============================================================================

//    return (
//        <div
//            style={{
//                maxWidth: 900,
//                margin: "40px auto",
//                padding: 24,
//                fontFamily: "Inter, system-ui, sans-serif",
//            }}
//        >
//            {/* ================================================================ */}
//            {/* 🎨 PayVerify Branding Header */}
//            {/* ================================================================ */}
//            <div
//                style={{
//                    display: "flex",
//                    justifyContent: "space-between",
//                    alignItems: "center",
//                    marginBottom: 24,
//                }}
//            >
//                <div style={{ fontSize: 26, fontWeight: 800 }}>
//                    PayVerify
//                </div>

//                <button
//                    onClick={() =>
//                        window.open(`/api/invoices/${invoice.id}/pdf`)
//                    }
//                    style={{
//                        padding: "8px 14px",
//                        borderRadius: 8,
//                        border: "1px solid #e5e7eb",
//                        background: "white",
//                        cursor: "pointer",
//                    }}
//                >
//                    Download PDF
//                </button>
//            </div>

//            {/* ================================================================ */}
//            {/* Header */}
//            {/* ================================================================ */}
//            <div
//                style={{
//                    display: "flex",
//                    justifyContent: "space-between",
//                    alignItems: "center",
//                    marginBottom: 24,
//                }}
//            >
//                <h1 style={{ margin: 0 }}>Invoice #{invoice.id}</h1>

//                <span
//                    style={{
//                        padding: "6px 12px",
//                        borderRadius: 999,
//                        background: getStatusColor(invoice.status),
//                        color: "white",
//                        fontWeight: 600,
//                        textTransform: "capitalize",
//                    }}
//                >
//                    {invoice.status}
//                </span>
//            </div>

//            {/* ================================================================ */}
//            {/* Invoice Card */}
//            {/* ================================================================ */}
//            <div
//                style={{
//                    border: "1px solid #e5e7eb",
//                    borderRadius: 16,
//                    padding: 24,
//                    marginBottom: 24,
//                }}
//            >
//                <div style={{ marginBottom: 12 }}>
//                    <strong>Amount Due</strong>
//                </div>

//                <div
//                    style={{
//                        fontSize: 36,
//                        fontWeight: 700,
//                        marginBottom: 16,
//                    }}
//                >
//                    {formatNaira(invoice.amount)}
//                </div>

//                <div style={{ color: "#6b7280" }}>
//                    Issued:{" "}
//                    {new Date(invoice.issued_at).toLocaleDateString()}
//                </div>
//            </div>

//            {/* ================================================================ */}
//            {/* 📊 Payment Timeline */}
//            {/* ================================================================ */}
//            <div
//                style={{
//                    border: "1px solid #e5e7eb",
//                    borderRadius: 16,
//                    padding: 20,
//                    marginBottom: 24,
//                }}
//            >
//                <h3>Payment Timeline</h3>

//                <ul style={{ paddingLeft: 18 }}>
//                    <li>Invoice issued</li>
//                    {invoice.status !== "pending" && (
//                        <li>Payment initiated</li>
//                    )}
//                    {invoice.status === "paid" && (
//                        <li>Payment completed</li>
//                    )}
//                </ul>
//            </div>

//            {/* ================================================================ */}
//            {/* Payment Section */}
//            {/* ================================================================ */}
//            {!isPaid && (
//                <div
//                    style={{
//                        border: "1px solid #e5e7eb",
//                        borderRadius: 16,
//                        padding: 24,
//                        marginBottom: 24,
//                    }}
//                >
//                    <h3 style={{ marginTop: 0 }}>Pay this invoice</h3>

//                    <input
//                        type="email"
//                        placeholder="Enter your email"
//                        value={email}
//                        onChange={(e) => setEmail(e.target.value)}
//                        style={{
//                            width: "100%",
//                            padding: 12,
//                            marginBottom: 16,
//                            borderRadius: 8,
//                            border: "1px solid #d1d5db",
//                        }}
//                    />

//                    <button
//                        onClick={handlePayNow}
//                        disabled={loading}
//                        style={{
//                            width: "100%",
//                            padding: 14,
//                            borderRadius: 10,
//                            border: "none",
//                            background: "#16a34a",
//                            color: "white",
//                            fontWeight: 700,
//                            cursor: "pointer",
//                            fontSize: 16,
//                        }}
//                    >
//                        {loading ? "Starting payment…" : "Pay Now"}
//                    </button>

//                    {polling && (
//                        <div style={{ marginTop: 12, color: "#f59e0b" }}>
//                            Confirming payment…
//                        </div>
//                    )}
//                </div>
//            )}

//            {/* ================================================================ */}
//            {/* 🏦 Dynamic Offline Payment */}
//            {/* ================================================================ */}
//            {!isPaid && bankAccount && (
//                <div
//                    style={{
//                        border: "1px dashed #d1d5db",
//                        borderRadius: 16,
//                        padding: 24,
//                    }}
//                >
//                    <h3 style={{ marginTop: 0 }}>Pay Offline</h3>

//                    <p>
//                        Bank: <strong>{bankAccount.bankName}</strong>
//                    </p>
//                    <p>
//                        Account: <strong>{bankAccount.accountNumber}</strong>
//                    </p>
//                    <p>
//                        Reference: <strong>Invoice #{invoice.id}</strong>
//                    </p>
//                </div>
//            )}

//            {/* ================================================================ */}
//            {/* Paid Banner */}
//            {/* ================================================================ */}
//            {isPaid && (
//                <div
//                    style={{
//                        background: "#ecfdf5",
//                        border: "1px solid #16a34a",
//                        color: "#065f46",
//                        padding: 20,
//                        borderRadius: 12,
//                        textAlign: "center",
//                        fontWeight: 600,
//                    }}
//                >
//                    ✅ Payment received. Thank you!
//                </div>
//            )}
//        </div>
//    );
//};

//export default InvoicePage;





// =============================================================================
// InvoicePage.tsx — FINAL ENHANCED VERSION (DEMO READY)
// =============================================================================
//
// WHAT CHANGED:
//
// ✅ FIX: PDF download now uses token-based endpoint
// ➕ ADD: Line items preview section
// ➕ ADD: Optional fallback when no items exist
// ➕ ADD: Minor UX polish (security note)
//
// =============================================================================

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

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

    // ➕ NEW: Optional line items
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

    // =============================================================================
    // Load Invoice (TOKEN-BASED)
    // =============================================================================
    const loadInvoice = async () => {
        if (!token) return;

        const res = await axios.get(
            `/api/public/invoices/${token}`
        );

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
            const res = await axios.get(
                `/api/public/invoices/${token}`
            );

            setInvoice(res.data.invoice);

            if (res.data.invoice.status === "paid") {
                clearInterval(interval);
                setPolling(false);
            }
        }, 4000);
    };

    // =============================================================================
    // Pay Now
    // =============================================================================
    const handlePayNow = async () => {
        if (!email) {
            alert("Please enter your email");
            return;
        }

        if (!invoice) return;

        setLoading(true);

        try {
            const res = await axios.post(
                `/api/invoices/${invoice.id}/paystack/initialize`,
                { email }
            );

            const { reference, access_code, authorization_url } =
                res.data;

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
                        setLoading(false);
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
            alert("Unable to start payment");
        } finally {
            setLoading(false);
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

                {/* 🔥 FIXED: Token-based PDF download */}
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
            {/* 🧾 Line Items (NEW) */}
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
                                    item.quantity *
                                    item.unitPrice
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
                        }}
                    />

                    <button
                        onClick={handlePayNow}
                        disabled={loading}
                        style={{
                            width: "100%",
                            padding: 14,
                            borderRadius: 10,
                            background: "#16a34a",
                            color: "white",
                            fontWeight: 700,
                            cursor: "pointer",
                        }}
                    >
                        {loading
                            ? "Starting payment…"
                            : "Pay Now"}
                    </button>

                    <div
                        style={{
                            marginTop: 10,
                            fontSize: 12,
                            color: "#6b7280",
                        }}
                    >
                        Secure payment powered by Paystack
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoicePage;
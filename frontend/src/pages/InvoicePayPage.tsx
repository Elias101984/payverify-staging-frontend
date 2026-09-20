import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Form, Spinner } from "react-bootstrap";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";

import api from "../services/api";
import { PaymentVerificationService } from "../services/paymentVerificationService";
import payVerifyLogo from "../assets/payverify-logo.png";

type PublicInvoicePayload = {
    invoice: {
        id: number;
        amount: number;
        status: string;
        customerEmail?: string | null;
        issuedAt?: string;
        publicToken?: string;
    };
    payment: {
        status: string;
        paidAt?: string | null;
        reference?: string | null;
        expiresAt?: string | null;
        checkoutStarted?: boolean;
        customerName?: string | null;
        customerPhone?: string | null;
        settlementStatus?: string | null;
        settlementId?: number | null;
        settlementDate?: string | null;
    };
    order: {
        id: number;
        reference: string;
        status?: string | null;
        customerName?: string | null;
        description?: string | null;
        totalAmount: number;
        items: Array<{
            id: number;
            name: string;
            description?: string | null;
            quantity: number;
            unitPrice: number;
            lineTotal: number;
        }>;
    } | null;
    verification: {
        available: boolean;
        verified: boolean;
        merchantName?: string;
        bankName?: string;
        accountName?: string;
        accountNumberMasked?: string;
        trustScore?: number;
        verificationStatus?: string | null;
        verificationBadge?: string;
        message?: string;
        checkedAt?: string;
    };
};

const formatNaira = (value: number) =>
    new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 2,
    }).format(Number(value || 0));

export default function InvoicePayPage() {
    const params = useParams();
    const invoiceToken = String(params.invoiceId || "").trim();

    const [payload, setPayload] =
        useState<PublicInvoicePayload | null>(null);
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(true);
    const [startingPayment, setStartingPayment] = useState(false);
    const [error, setError] = useState("");

    const loadInvoice = useCallback(
        async (silent = false) => {
            if (!invoiceToken) {
                setError("This payment link is invalid.");
                setLoading(false);
                return;
            }

            try {
                if (!silent) setLoading(true);

                const response = await api.get<PublicInvoicePayload>(
                    `/public/invoices/${encodeURIComponent(invoiceToken)}`,
                    { timeout: 65000 }
                );

                setPayload(response.data);
                setError("");

                if (response.data.invoice.customerEmail) {
                    setEmail((current) =>
                        current || response.data.invoice.customerEmail || ""
                    );
                }
                if (response.data.payment.customerPhone) {
                    setPhone((current) =>
                        current || response.data.payment.customerPhone || ""
                    );
                }
            } catch (requestError: any) {
                if (!silent) {
                    setError(
                        requestError?.response?.data?.message ||
                        "Unable to load this invoice."
                    );
                }
            } finally {
                if (!silent) setLoading(false);
            }
        },
        [invoiceToken]
    );

    useEffect(() => {
        loadInvoice();
    }, [loadInvoice]);

    const invoiceStatus = String(
        payload?.invoice.status || ""
    ).toLowerCase();
    const paymentStatus = String(
        payload?.payment.status || ""
    ).toLowerCase();

    const orderStatus = String(
        payload?.order?.status || ""
    ).toLowerCase();

    // A cancelled order invalidates the old invoice/payment package.  It must
    // never render a Pay/Resume button, even if a stale browser tab still has
    // the public link open.
    const isCancelled =
        invoiceStatus === "cancelled" ||
        paymentStatus === "cancelled" ||
        orderStatus === "cancelled";

    const isPaid =
        !isCancelled &&
        (invoiceStatus === "paid" || paymentStatus === "paid");

    const isExpired = useMemo(() => {
        const expiresAt = payload?.payment.expiresAt;
        return Boolean(
            expiresAt && new Date(expiresAt).getTime() < Date.now()
        );
    }, [payload?.payment.expiresAt]);

    const shouldConfirm =
        !isPaid &&
        !isCancelled &&
        (invoiceStatus === "processing" ||
            new URLSearchParams(window.location.search).has("reference") ||
            new URLSearchParams(window.location.search).has("trxref"));

    // Paystack redirects the browser before the webhook is guaranteed to have
    // reached Render. Poll the public invoice briefly so the confirmation page
    // changes to PAID automatically when the verified webhook completes.
    useEffect(() => {
        if (!shouldConfirm) return;

        let attempts = 0;
        const timer = window.setInterval(async () => {
            attempts += 1;

            try {
                const response = await api.get<{
                    invoiceStatus: string;
                    paymentStatus: string;
                    paidAt?: string | null;
                }>(
                    `/public/invoices/${encodeURIComponent(invoiceToken)}/status`
                );

                setPayload((current) =>
                    current
                        ? {
                            ...current,
                            invoice: {
                                ...current.invoice,
                                status: response.data.invoiceStatus,
                            },
                            payment: {
                                ...current.payment,
                                status: response.data.paymentStatus,
                                paidAt: response.data.paidAt || current.payment.paidAt,
                            },
                        }
                        : current
                );
            } catch (pollError) {
                console.error("Payment status poll failed:", pollError);
            }

            if (attempts >= 24) {
                window.clearInterval(timer);
            }
        }, 2500);

        return () => window.clearInterval(timer);
    }, [invoiceToken, shouldConfirm]);

    const handlePay = async () => {
        if (!payload?.invoice.id) return;

        if (isCancelled) {
            toast.error(
                "This order was cancelled. Ask the merchant to create a new order."
            );
            return;
        }

        if (!payload.verification.available || !payload.verification.verified) {
            toast.error(
                payload.verification.message ||
                "This merchant is not currently verified."
            );
            return;
        }

        if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) {
            toast.error("Enter a valid email address or leave it blank.");
            return;
        }

        try {
            setStartingPayment(true);

            const result =
                await PaymentVerificationService.continuePayment({
                    invoiceId: payload.invoice.id,
                    invoiceToken,
                    email: email.trim() || undefined,
                    phone: phone.trim() || undefined,
                });

            if (!result.authorization_url) {
                throw new Error("Paystack checkout URL was not returned.");
            }

            window.location.assign(result.authorization_url);
        } catch (paymentError: any) {
            toast.error(
                paymentError?.response?.data?.message ||
                paymentError?.message ||
                "Unable to start payment."
            );
            setStartingPayment(false);
        }
    };

    if (loading) {
        return (
            <main className="pv-public-invoice pv-center">
                <Spinner animation="border" variant="success" />
                <p>Loading verified invoice…</p>
                <Styles />
            </main>
        );
    }

    if (error || !payload) {
        return (
            <main className="pv-public-invoice pv-center">
                <section className="pv-invoice-card pv-message-card">
                    <h2>Invoice unavailable</h2>
                    <p>{error || "This invoice could not be loaded."}</p>
                </section>
                <Styles />
            </main>
        );
    }

    if (isCancelled) {
        return (
            <main className="pv-public-invoice pv-center">
                <section className="pv-invoice-card pv-message-card pv-cancelled-card">
                    <div className="pv-cancelled-icon">×</div>
                    <h1>Payment request cancelled</h1>
                    <p>
                        This order was cancelled by the merchant. Its payment link
                        and QR session are closed.
                    </p>
                    <div className="pv-cancelled-note">
                        Ask the merchant to create a new order if payment is still required.
                    </div>
                    <p className="pv-receipt-footer">
                        Order {payload.order?.reference || `#${payload.invoice.id}`} · Powered by PayVerify
                    </p>
                </section>
                <Styles />
            </main>
        );
    }

    if (isPaid) {
        return (
            <main className="pv-public-invoice pv-center">
                <section className="pv-invoice-card pv-confirmation">
                    <div className="pv-success-icon">✓</div>
                    <div className="pv-receipt-brand">
                        <img src={payVerifyLogo} alt="PayVerify" />
                        <span>Verified payment receipt</span>
                    </div>
                    <h1>Payment confirmed</h1>
                    <p>
                        Your payment to {payload.verification.merchantName || "the merchant"} has been verified.
                    </p>
                    <div className="pv-receipt-number">Receipt PV-RCP-{payload.invoice.id}</div>
                    <div className="pv-confirm-grid">
                        <div><span>Merchant</span><strong>{payload.verification.merchantName || "Verified merchant"}</strong></div>
                        <div><span>Order</span><strong>{payload.order?.reference || `#${payload.invoice.id}`}</strong></div>
                        <div><span>Customer</span><strong>{payload.order?.customerName || "Walk-in customer"}</strong></div>
                        <div><span>Amount</span><strong>{formatNaira(payload.invoice.amount)}</strong></div>
                        <div><span>Payment</span><strong>PAID</strong></div>
                        <div><span>Paid on</span><strong>{payload.payment.paidAt ? new Date(payload.payment.paidAt).toLocaleString("en-NG") : "Confirmed"}</strong></div>
                        {payload.payment.reference && (
                            <div><span>Payment reference</span><strong className="pv-reference">{payload.payment.reference}</strong></div>
                        )}
                        <div>
                            <span>Settlement</span>
                            <strong>
                                {payload.payment.settlementStatus === "success"
                                    ? "CONFIRMED"
                                    : "AWAITING PAYSTACK SETTLEMENT"}
                            </strong>
                            {payload.payment.settlementId && (
                                <small>Paystack settlement #{payload.payment.settlementId}</small>
                            )}
                        </div>
                    </div>
                    <Button className="mt-4 pv-print-button" variant="outline-light" onClick={() => window.print()}>
                        Print receipt
                    </Button>
                    <p className="pv-receipt-footer">Powered by PayVerify • Secure merchant verification and payment</p>
                </section>
                <Styles />
            </main>
        );
    }

    return (
        <main className="pv-public-invoice">
            <header className="pv-public-header">
                <img className="pv-public-logo" src={payVerifyLogo} alt="PayVerify" />
                <span>Secure verified payment</span>
            </header>

            <section className="pv-invoice-card">
                <div className="pv-invoice-heading">
                    <div>
                        <span className="pv-eyebrow">Invoice</span>
                        <h1>{payload.order?.reference || `#${payload.invoice.id}`}</h1>
                    </div>
                    <Badge bg={shouldConfirm ? "info" : "warning"}>
                        {shouldConfirm ? "Confirming payment" : "Awaiting payment"}
                    </Badge>
                </div>

                <div className={
                    payload.verification.verified
                        ? "pv-verification pv-verified"
                        : "pv-verification pv-unverified"
                }>
                    <div className="pv-verification-icon">
                        {payload.verification.verified ? "✓" : "!"}
                    </div>
                    <div>
                        <strong>
                            {payload.verification.verified
                                ? "Merchant account verified by PayVerify"
                                : "Merchant verification unavailable"}
                        </strong>
                        <p>
                            {payload.verification.merchantName || "Merchant"}
                            {payload.verification.bankName
                                ? ` · ${payload.verification.bankName}`
                                : ""}
                            {payload.verification.accountNumberMasked
                                ? ` · ${payload.verification.accountNumberMasked}`
                                : ""}
                        </p>
                        {payload.verification.accountName && (
                            <small>Verified account name: {payload.verification.accountName}</small>
                        )}
                    </div>
                </div>

                <div className="pv-order-summary">
                    <h2>Invoice summary</h2>
                    <div className="pv-customer-summary">
                        <span>Customer</span>
                        <strong>{payload.order?.customerName || "Walk-in customer"}</strong>
                    </div>
                    {payload.order?.items?.length ? (
                        payload.order.items.map((item) => (
                            <div className="pv-line-item" key={item.id}>
                                <div>
                                    <strong>{item.name}</strong>
                                    <small>{item.quantity} × {formatNaira(item.unitPrice)}</small>
                                </div>
                                <span>{formatNaira(item.lineTotal)}</span>
                            </div>
                        ))
                    ) : (
                        <div className="pv-line-item">
                            <div><strong>{payload.order?.description || "Order payment"}</strong></div>
                            <span>{formatNaira(payload.invoice.amount)}</span>
                        </div>
                    )}
                    <div className="pv-total-row">
                        <span>Total</span>
                        <strong>{formatNaira(payload.invoice.amount)}</strong>
                    </div>
                </div>

                {!payload.verification.verified && (
                    <div className="pv-payment-paused" role="alert">
                        {payload.verification.message ||
                            "Payment is paused until PayVerify can verify this merchant."}
                    </div>
                )}

                <Form.Group className="mt-4">
                    <Form.Label>Receipt email (optional)</Form.Label>
                    <Form.Control
                        type="email"
                        value={email}
                        placeholder="customer@example.com"
                        onChange={(event) => setEmail(event.target.value)}
                        disabled={startingPayment}
                    />
                </Form.Group>

                <Form.Group className="mt-3">
                    <Form.Label>Receipt phone (optional)</Form.Label>
                    <Form.Control
                        type="tel"
                        value={phone}
                        placeholder="+2348012345678"
                        onChange={(event) => setPhone(event.target.value)}
                        disabled={startingPayment}
                    />
                    <Form.Text className="text-secondary">
                        Leave both fields blank if you only want a printed receipt.
                    </Form.Text>
                </Form.Group>

                <Button
                    className="w-100 mt-3 pv-pay-button"
                    size="lg"
                    variant="success"
                    onClick={handlePay}
                    disabled={
                        startingPayment ||
                        isCancelled ||
                        isExpired ||
                        !payload.verification.available ||
                        !payload.verification.verified
                    }
                >
                    {startingPayment
                        ? "Opening secure checkout…"
                        : payload.payment.checkoutStarted
                            ? "Resume secure payment"
                            : `Pay ${formatNaira(payload.invoice.amount)} securely`}
                </Button>

                {isExpired && (
                    <p className="pv-expired">This payment request has expired.</p>
                )}
            </section>
            <Styles />
        </main>
    );
}

const Styles = () => (
    <style>{`
        .pv-public-invoice {
            min-height: 100vh;
            padding: 28px 18px 54px;
            color: #eef7f2;
            background:
                radial-gradient(900px 460px at 50% -20%, rgba(31, 176, 99, .22), transparent 65%),
                linear-gradient(180deg, #07110c 0%, #0a1710 100%);
        }
        .pv-center { display: grid; place-content: center; justify-items: center; gap: 14px; }
        .pv-public-header { width: min(660px, 100%); margin: 0 auto 18px; display: flex; justify-content: space-between; align-items: center; color: #a9bdb1; }
        .pv-public-logo { width:142px; height:auto; }
        .pv-invoice-card { width: min(660px, 100%); margin: 0 auto; padding: 26px; border: 1px solid rgba(255,255,255,.12); border-radius: 20px; background: rgba(15, 31, 22, .92); box-shadow: 0 24px 70px rgba(0,0,0,.36); }
        .pv-message-card { text-align: center; }
        .pv-cancelled-card h1 { margin: 8px 0; }
        .pv-cancelled-icon { width: 70px; height: 70px; display:grid; place-items:center; margin:0 auto 14px; border-radius:50%; background:rgba(218,75,75,.16); border:1px solid rgba(255,151,151,.34); color:#ff9d9d; font-size:2.5rem; line-height:1; }
        .pv-cancelled-note { margin-top:18px; padding:12px 14px; border-radius:11px; background:rgba(218,75,75,.11); color:#ffc5c5; }
        .pv-invoice-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
        .pv-invoice-heading h1 { margin: 2px 0 0; font-size: 1.45rem; }
        .pv-eyebrow { color: #91a79a; font-size: .78rem; text-transform: uppercase; letter-spacing: .08em; }
        .pv-verification { display: flex; gap: 13px; margin: 20px 0; padding: 16px; border-radius: 14px; }
        .pv-verified { background: rgba(39, 190, 105, .13); border: 1px solid rgba(85, 220, 143, .28); color: #baf4d2; }
        .pv-unverified { background: rgba(239, 169, 55, .12); border: 1px solid rgba(239, 169, 55, .28); color: #ffe0a8; }
        .pv-verification-icon { flex: 0 0 30px; height: 30px; display: grid; place-items: center; border-radius: 50%; background: rgba(255,255,255,.10); font-weight: 800; }
        .pv-verification p, .pv-verification small { margin: 4px 0 0; color: inherit; opacity: .85; }
        .pv-order-summary { margin-top: 22px; }
        .pv-order-summary h2 { font-size: 1rem; color: #a9bdb1; margin-bottom: 10px; }
        .pv-customer-summary { display:flex; justify-content:space-between; gap:16px; padding:10px 0 12px; color:#91a79a; font-size:.86rem; border-bottom:1px solid rgba(255,255,255,.09); }
        .pv-customer-summary strong { color:#dcece3; text-align:right; overflow-wrap:anywhere; }
        .pv-line-item, .pv-total-row { display: flex; justify-content: space-between; gap: 18px; padding: 13px 0; border-bottom: 1px solid rgba(255,255,255,.09); }
        .pv-line-item small { display: block; color: #91a79a; margin-top: 3px; }
        .pv-total-row { border-bottom: 0; font-size: 1.2rem; padding-top: 17px; }
        .pv-total-row strong { color: #67dc9c; }
        .pv-payment-paused { margin-top: 16px; padding: 12px; border-radius: 10px; background: rgba(218, 75, 75, .12); color: #ffc5c5; }
        .pv-pay-button { min-height: 50px; font-weight: 700; }
        .pv-expired { margin: 12px 0 0; color: #ffb8b8; text-align: center; }
        .pv-confirmation { text-align: center; }
        .pv-receipt-brand { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; margin-bottom:14px; text-align:center; }
        .pv-receipt-brand img { width:166px; height:auto; }
        .pv-receipt-brand span { display:block; }
        .pv-receipt-brand span { font-size:.74rem; color:#91a79a; text-transform:uppercase; letter-spacing:.08em; }
        .pv-receipt-number { display:inline-block; margin:8px 0 14px; padding:7px 12px; border:1px solid rgba(103,220,156,.28); border-radius:999px; color:#9de6bc; background:rgba(39,190,105,.09); font-size:.78rem; }
        .pv-reference { overflow-wrap:anywhere; font-size:.78rem; }
        .pv-receipt-footer { margin:18px 0 0 !important; font-size:.72rem; color:#789080 !important; }
        .pv-success-icon { width: 70px; height: 70px; display: grid; place-items: center; margin: 0 auto 16px; border-radius: 50%; background: rgba(46, 204, 113, .16); color: #67dc9c; font-size: 2rem; }
        .pv-confirmation h1 { margin: 10px 0 8px; }
        .pv-confirmation > p { color: #a9bdb1; }
        .pv-confirm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 22px; text-align: left; }
        .pv-confirm-grid div { padding: 13px; border-radius: 11px; background: rgba(255,255,255,.05); }
        .pv-confirm-grid span { display: block; color: #91a79a; font-size: .78rem; margin-bottom: 3px; }
        @media (max-width: 560px) {
            .pv-public-invoice { padding: 18px 12px 40px; }
            .pv-invoice-card { padding: 19px; border-radius: 16px; }
            .pv-public-header { font-size: .82rem; }
            .pv-confirm-grid { grid-template-columns: 1fr; }
        }
        @media print {
            @page { size:auto; margin:12mm; }
            body { background:#fff !important; }
            .pv-public-invoice { min-height:auto; padding:0; color:#132238; background:#fff !important; }
            .pv-invoice-card { width:100%; max-width:720px; padding:24px; border:1px solid #dce5ef; color:#132238; background:#fff !important; box-shadow:none; }
            .pv-receipt-brand strong { color:#132238; }
            .pv-confirmation > p, .pv-receipt-brand span, .pv-confirm-grid span { color:#5f7083 !important; }
            .pv-customer-summary { color:#5f7083; border-color:#e3eaf2; }
            .pv-customer-summary strong { color:#132238; }
            .pv-confirm-grid div { border:1px solid #e3eaf2; color:#132238; background:#f7f9fc !important; }
            .pv-success-icon { color:#148457; border:1px solid #b9e8d2; background:#eefaf4 !important; }
            .pv-print-button { display:none !important; }
            .pv-receipt-number { color:#148457; border-color:#b9e8d2; background:#eefaf4 !important; }
        }
    `}</style>
);

// =============================================================================
// frontend/src/components/PaymentRequestModal.tsx
// =============================================================================
//
// PURPOSE
// -----------------------------------------------------------------------------
// Displays the reusable payment request modal for a captured purchase order.
//
// EXISTING FUNCTIONALITY PRESERVED
// -----------------------------------------------------------------------------
// ✅ Displays payment request amount and status
// ✅ Displays QR code
// ✅ Copies payment link
// ✅ Downloads QR code
// ✅ Downloads PDF invoice
// ✅ Opens public invoice/payment page
// ✅ Reuses the existing PaymentIntent
//
// WHAT CHANGED
// -----------------------------------------------------------------------------
// ✅ The payment URL is no longer rebuilt from window.location.origin alone.
// ✅ The component now prefers VITE_FRONTEND_URL for the public /pay/:token URL.
// ✅ If the page is ever rendered from a Render backend hostname, it falls back
//    to the configured Vercel frontend instead of generating another Render URL.
// ✅ Old payment links are repaired in-memory by extracting only the token.
// ✅ The PDF download now uses VITE_API_BASE_URL instead of a relative /api URL.
// ✅ QR download now targets this modal's QR canvas specifically.
//
// WHY
// -----------------------------------------------------------------------------
// window.location.origin is only safe when the component is definitely running
// from the Vercel frontend. If the browser is on a Render hostname, rebuilding
// the link from window.location.origin produces:
//
//     https://payverifyv1.onrender.com/pay/<token>
//
// Express does not own /pay/:token, so Render correctly returns:
//
//     Cannot GET /pay/<token>
//
// The /pay/:token route belongs to the React frontend. Therefore this component
// now resolves the frontend base URL explicitly and always builds the customer-
// facing payment URL from that frontend origin.
//
// RECOMMENDED VERCEL ENVIRONMENT VARIABLE
// -----------------------------------------------------------------------------
// VITE_FRONTEND_URL=https://payverify-web-v2.vercel.app
//
// EXISTING API ENVIRONMENT VARIABLE
// -----------------------------------------------------------------------------
// VITE_API_BASE_URL=https://payverifyv1.onrender.com/api
//
// =============================================================================

import React, { useEffect, useMemo, useState } from "react";
import { Badge, Button, Modal } from "react-bootstrap";
import { QRCodeCanvas } from "qrcode.react";
import QRCode from "qrcode";
import { toast } from "react-toastify";

interface PaymentIntent {
    id: string;
    payment_link: string;
    amount: number;
    status: string;
    merchant_id?: number;
    merchant_name?: string;
    purchase_order_reference?: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
    paymentIntent: PaymentIntent | null;
}

const PRODUCTION_FRONTEND_FALLBACK =
    "https://payverify-web-v2.vercel.app";

const normalizeBaseUrl = (value: string): string =>
    value.trim().replace(/\/+$/, "");

const safeFilenamePart = (value?: string): string =>
    String(value || "")
        .trim()
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "PayVerify";

const extractPaymentToken = (
    paymentLink?: string | null
): string => {
    if (!paymentLink) {
        return "";
    }

    try {
        const parsedUrl = new URL(
            paymentLink,
            window.location.origin
        );

        const marker = "/pay/";
        const markerIndex =
            parsedUrl.pathname.indexOf(marker);

        if (markerIndex === -1) {
            return "";
        }

        return decodeURIComponent(
            parsedUrl.pathname
                .substring(markerIndex + marker.length)
                .replace(/^\/+|\/+$/g, "")
        );
    } catch {
        const token =
            paymentLink.split("/pay/")[1];

        if (!token) {
            return "";
        }

        return decodeURIComponent(
            token
                .split(/[?#]/)[0]
                .replace(/^\/+|\/+$/g, "")
        );
    }
};

const resolveFrontendBaseUrl = (): string => {
    const configuredFrontendUrl =
        String(
            import.meta.env.VITE_FRONTEND_URL || ""
        ).trim();

    if (configuredFrontendUrl) {
        return normalizeBaseUrl(
            configuredFrontendUrl
        );
    }

    const currentOrigin =
        normalizeBaseUrl(
            window.location.origin
        );

    // -------------------------------------------------------------------------
    // SAFETY FALLBACK
    //
    // If this component is ever opened from a Render backend hostname, never
    // use that origin for /pay/:token. That route belongs to the Vercel app.
    // -------------------------------------------------------------------------
    if (
        window.location.hostname
            .toLowerCase()
            .endsWith(".onrender.com")
    ) {
        return PRODUCTION_FRONTEND_FALLBACK;
    }

    return currentOrigin;
};

const resolveApiBaseUrl = (): string => {
    const configuredApiUrl =
        String(
            import.meta.env.VITE_API_BASE_URL ||
            import.meta.env.VITE_API_URL ||
            ""
        ).trim();

    if (configuredApiUrl) {
        return normalizeBaseUrl(
            configuredApiUrl
        );
    }

    // Local backend fallback used by the existing PayVerify setup.
    return "http://localhost:5000/api";
};

const PaymentRequestModal: React.FC<Props> = ({
    open,
    onClose,
    paymentIntent,
}) => {
    const [cachedIntent, setCachedIntent] =
        useState<PaymentIntent | null>(
            paymentIntent
        );

    const [copied, setCopied] =
        useState(false);

    useEffect(() => {
        if (paymentIntent) {
            setCachedIntent(
                paymentIntent
            );
        }
    }, [paymentIntent]);

    // =========================================================================
    // UPDATED: PUBLIC FRONTEND PAYMENT LINK
    // =========================================================================
    //
    // We keep the original token, but always rebuild the public URL using the
    // resolved frontend base URL.
    //
    // This repairs both:
    // - newly returned links with the wrong hostname;
    // - old PaymentIntent rows already stored with a Render hostname.
    // =========================================================================
    const frontendPaymentLink =
        useMemo(() => {
            const token =
                extractPaymentToken(
                    cachedIntent?.payment_link
                );

            if (!token) {
                return "";
            }

            const frontendBaseUrl =
                resolveFrontendBaseUrl();

            return `${frontendBaseUrl}/pay/${token}`;
        }, [cachedIntent?.payment_link]);

    const paymentToken =
        useMemo(
            () =>
                extractPaymentToken(
                    frontendPaymentLink
                ),
            [frontendPaymentLink]
        );

    const qrCanvasId =
        `payment-request-qr-${cachedIntent?.id || "current"}`;

    if (!open) {
        return null;
    }

    const handleCopy = async () => {
        if (!frontendPaymentLink) {
            toast.error(
                "Payment link is unavailable"
            );

            return;
        }

        try {
            await navigator.clipboard.writeText(
                frontendPaymentLink
            );

            setCopied(true);
            toast.success("Copied");

            window.setTimeout(
                () => setCopied(false),
                2000
            );
        } catch (error) {
            console.error(
                "Failed to copy payment link:",
                error
            );

            toast.error(
                "Unable to copy payment link"
            );
        }
    };

    const downloadQR = async () => {
        if (!frontendPaymentLink) {
            toast.error("Payment link is unavailable");
            return;
        }

        // Generate a fresh high-resolution PNG from the verified URL. Reading
        // the preview canvas produced empty files in some browsers/modal states.
        let imageUrl: string;
        try {
            imageUrl = await QRCode.toDataURL(frontendPaymentLink, {
                width: 1024,
                margin: 4,
                errorCorrectionLevel: "H",
                color: { dark: "#07152D", light: "#FFFFFF" },
            });
        } catch (error) {
            console.error("QR download generation failed:", error);
            toast.error("Unable to generate the QR download");
            return;
        }

        const downloadLink =
            document.createElement("a");

        downloadLink.href = imageUrl;
        downloadLink.download =
            `${safeFilenamePart(cachedIntent?.merchant_name)}_${safeFilenamePart(
                cachedIntent?.purchase_order_reference || `PO-${cachedIntent?.id || "payment"}`
            )}_QR.png`;

        downloadLink.click();
    };

    // =========================================================================
    // UPDATED: PDF DOWNLOAD
    // =========================================================================
    //
    // BEFORE:
    //     /api/invoices/token/<token>/pdf
    //
    // That relative path can be sent to Vercel instead of the Render API.
    //
    // NOW:
    //     <VITE_API_BASE_URL>/invoices/token/<token>/pdf
    //
    // =========================================================================
    const downloadPDF = () => {
        if (!paymentToken) {
            toast.error(
                "Unable to determine invoice token"
            );

            return;
        }

        const apiBaseUrl =
            resolveApiBaseUrl();

        const pdfUrl =
            `${apiBaseUrl}/invoices/token/${encodeURIComponent(
                paymentToken
            )}/pdf`;

        window.open(
            pdfUrl,
            "_blank",
            "noopener,noreferrer"
        );
    };

    const handleOpenInvoice = () => {
        if (!frontendPaymentLink) {
            toast.error(
                "Payment link is unavailable"
            );

            return;
        }

        window.open(
            frontendPaymentLink,
            "_blank",
            "noopener,noreferrer"
        );
    };

    return (
        <Modal
            show={open}
            onHide={onClose}
            centered
            backdrop="static"
            size="lg"
            contentClassName="pv-payment-package-modal"
        >
            <div className="pv-package-motion" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
                <span />
            </div>
            <Modal.Header closeButton className="pv-package-header">
                <Modal.Title className="pv-package-title">
                    <span className="pv-package-kicker">Verified checkout</span>
                    Payment Package Ready
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="pv-package-body">
                <div className="pv-package-summary">
                    <div>
                        <span className="pv-package-label">Amount to collect</span>
                        <h3>₦{Number(cachedIntent?.amount || 0).toLocaleString("en-NG", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}</h3>
                        <p>{cachedIntent?.merchant_name || "Verified merchant"}</p>
                    </div>
                    <Badge className="pv-package-status">
                        {cachedIntent?.status || "Pending"}
                    </Badge>
                </div>

                <div className="pv-package-grid">
                    <div className="pv-qr-panel">
                        <div className="pv-qr-shell">
                            <QRCodeCanvas
                                id={qrCanvasId}
                                value={frontendPaymentLink}
                                size={220}
                                bgColor="#ffffff"
                                fgColor="#07152d"
                                level="H"
                            />
                        </div>
                        <strong>Scan to open verified invoice</strong>
                        <small>Order {cachedIntent?.purchase_order_reference || "payment request"}</small>
                    </div>

                    <div className="pv-package-share">
                        <span className="pv-package-label">Secure payment link</span>
                        <div className="pv-link-box">
                            {frontendPaymentLink || "Payment link unavailable"}
                        </div>
                        <div className="pv-package-actions">
                            <Button onClick={handleCopy} disabled={!frontendPaymentLink} className="pv-primary-action">
                                {copied ? "✓ Copied" : "Copy payment link"}
                            </Button>
                            <Button onClick={handleOpenInvoice} disabled={!frontendPaymentLink} className="pv-secondary-action">
                                Open invoice
                            </Button>
                            <Button onClick={downloadQR} disabled={!frontendPaymentLink} className="pv-secondary-action">
                                Download QR
                            </Button>
                            <Button onClick={downloadPDF} disabled={!paymentToken} className="pv-secondary-action">
                                Download PDF invoice
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="pv-package-trust">
                    <span>✓ Merchant verified</span>
                    <span>✓ Secure Paystack checkout</span>
                    <span>Powered by PayVerify</span>
                </div>
            </Modal.Body>

            <Modal.Footer className="pv-package-footer">
                <Button onClick={onClose} className="pv-close-action">Done</Button>
            </Modal.Footer>
            <style>{`
                .pv-payment-package-modal { position:relative; color:#eef5ff; overflow:hidden; border:1px solid rgba(98,154,255,.35); border-radius:24px; background:linear-gradient(145deg,rgba(20,35,64,.98),rgba(5,15,34,.99)); box-shadow:0 30px 90px rgba(0,0,0,.62), inset 0 1px 0 rgba(255,255,255,.12); }
                .pv-payment-package-modal::before { content:""; position:absolute; inset:-20%; pointer-events:none; background:radial-gradient(circle at 18% 0%,rgba(59,130,246,.28),transparent 36%),radial-gradient(circle at 100% 100%,rgba(16,185,129,.18),transparent 38%),radial-gradient(circle at 58% 42%,rgba(69,120,255,.10),transparent 30%); background-size:145% 145%; animation:pvPackageAurora 11s ease-in-out infinite alternate; }
                .pv-payment-package-modal::after { content:""; position:absolute; z-index:0; top:-35%; left:-42%; width:24%; height:175%; pointer-events:none; transform:rotate(17deg); background:linear-gradient(90deg,transparent,rgba(255,255,255,.10),transparent); filter:blur(2px); animation:pvPackageSheen 8.5s ease-in-out infinite; }
                .pv-package-motion { position:absolute; z-index:0; inset:0; overflow:hidden; pointer-events:none; }
                .pv-package-motion span { position:absolute; width:5px; height:5px; border-radius:50%; background:#7bb1ff; box-shadow:0 0 16px rgba(83,151,255,.85); opacity:.32; animation:pvPackageDrift 9s ease-in-out infinite; }
                .pv-package-motion span:nth-child(1){left:8%;top:18%;animation-delay:-1s;animation-duration:8.5s}
                .pv-package-motion span:nth-child(2){left:26%;top:78%;width:4px;height:4px;animation-delay:-5s;animation-duration:11s}
                .pv-package-motion span:nth-child(3){left:62%;top:14%;width:3px;height:3px;background:#88f0c1;animation-delay:-3s;animation-duration:10s}
                .pv-package-motion span:nth-child(4){left:88%;top:52%;width:6px;height:6px;background:#70dca8;animation-delay:-7s;animation-duration:12s}
                .pv-package-motion span:nth-child(5){left:72%;top:86%;width:4px;height:4px;animation-delay:-2s;animation-duration:9.5s}
                .pv-package-header,.pv-package-footer { position:relative; z-index:1; border-color:rgba(255,255,255,.10); background:rgba(255,255,255,.025); }
                .pv-package-header .btn-close { filter:invert(1); opacity:.75; }
                .pv-package-title { display:flex; flex-direction:column; font-size:1.35rem; font-weight:800; }
                .pv-package-kicker,.pv-package-label { color:#8fb8ff; font-size:.72rem; letter-spacing:.12em; text-transform:uppercase; font-weight:700; }
                .pv-package-body { position:relative; z-index:1; padding:26px; }
                .pv-package-summary { display:flex; justify-content:space-between; align-items:flex-start; gap:18px; margin-bottom:22px; }
                .pv-package-summary h3 { margin:5px 0 2px; font-size:2rem; font-weight:850; color:#fff; }
                .pv-package-summary p { margin:0; color:#aebbd0; }
                .pv-package-status { padding:9px 14px; color:#ffd98a !important; border:1px solid rgba(245,179,53,.42); background:rgba(245,158,11,.14) !important; border-radius:999px; text-transform:uppercase; }
                .pv-package-grid { display:grid; grid-template-columns:minmax(250px,.85fr) minmax(280px,1.15fr); gap:20px; }
                .pv-qr-panel,.pv-package-share { border:1px solid rgba(255,255,255,.11); border-radius:18px; background:linear-gradient(145deg,rgba(255,255,255,.085),rgba(255,255,255,.025)); box-shadow:inset 0 1px 0 rgba(255,255,255,.09); }
                .pv-qr-panel { padding:22px; text-align:center; }
                .pv-qr-shell { display:inline-flex; padding:13px; margin-bottom:13px; border-radius:16px; background:#fff; box-shadow:0 15px 35px rgba(0,0,0,.35),0 0 0 5px rgba(87,143,255,.09); }
                .pv-qr-panel strong,.pv-qr-panel small { display:block; }
                .pv-qr-panel small { margin-top:4px; color:#91a2bc; }
                .pv-package-share { padding:22px; }
                .pv-link-box { min-height:76px; margin:9px 0 16px; padding:13px; overflow-wrap:anywhere; color:#cbd8ec; border:1px solid rgba(118,161,231,.25); border-radius:12px; background:rgba(1,8,20,.38); font-size:.84rem; }
                .pv-package-actions { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
                .pv-package-actions .btn { min-height:44px; border-radius:11px; font-weight:700; }
                .pv-primary-action { grid-column:1/-1; border:0 !important; background:linear-gradient(135deg,#2563eb,#3b82f6) !important; box-shadow:0 10px 24px rgba(37,99,235,.30); }
                .pv-secondary-action,.pv-close-action { color:#dce8ff !important; border:1px solid rgba(129,169,236,.34) !important; background:rgba(76,116,181,.13) !important; }
                .pv-package-trust { display:flex; flex-wrap:wrap; justify-content:center; gap:10px 20px; margin-top:20px; color:#9eb1ca; font-size:.78rem; }
                .pv-package-trust span:first-child { color:#8ce0b1; }
                .pv-package-footer { justify-content:flex-end; }
                .pv-close-action { min-width:110px; border-radius:10px; }
                @keyframes pvPackageAurora { 0%{transform:translate3d(-2%,-1%,0) scale(1)} 55%{transform:translate3d(3%,2%,0) scale(1.05)} 100%{transform:translate3d(-1%,4%,0) scale(1.02)} }
                @keyframes pvPackageSheen { 0%,24%{transform:translateX(0) rotate(17deg);opacity:0} 34%{opacity:.75} 58%{transform:translateX(610%) rotate(17deg);opacity:0} 100%{transform:translateX(610%) rotate(17deg);opacity:0} }
                @keyframes pvPackageDrift { 0%,100%{transform:translate3d(0,0,0);opacity:.18} 40%{transform:translate3d(16px,-20px,0);opacity:.46} 70%{transform:translate3d(-10px,-34px,0);opacity:.28} }
                @media(max-width:720px){ .pv-package-grid{grid-template-columns:1fr}.pv-package-actions{grid-template-columns:1fr}.pv-primary-action{grid-column:auto}.pv-package-summary h3{font-size:1.65rem} }
                @media(prefers-reduced-motion:reduce){ .pv-payment-package-modal::before,.pv-payment-package-modal::after,.pv-package-motion span{animation:none!important} }
            `}</style>
        </Modal>
    );
};

export default PaymentRequestModal;

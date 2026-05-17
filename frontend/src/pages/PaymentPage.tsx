////// src/pages/PaymentPage.tsx
////// =============================================================================
////// PayVerify — Public Payment Page
////// =============================================================================
//////
////// ROUTE
////// /pay/:token
//////
////// PURPOSE
////// Customer opens link from SMS/email and can:
////// ✅ View payment request
////// ✅ Choose QR OR Copy/Share Link (Acceptance Criteria)
////// ✅ (For now) Simulate payment completion for testing end-to-end
//////
////// NOTE
////// This page is PUBLIC: no auth headers required.
//////
////// =============================================================================

////import React, { useEffect, useMemo, useState } from 'react';
////import { useParams } from 'react-router-dom';
////import { Button, Badge, Spinner } from 'react-bootstrap';
////import { toast } from 'react-toastify';
////import api from '../services/api';

////type PaymentIntent = {
////    id: number;
////    token: string;
////    amount: number;
////    status: string;
////    payment_link: string;
////    qr_url: string | null;
////    merchant_id: number | null;
////    purchase_order_id: number | null;
////    expires_at: string | null;
////    created_at: string | null;
////};

////export default function PaymentPage() {

////    const { token } = useParams();

////    const [loading, setLoading] = useState(true);
////    const [intent, setIntent] = useState<PaymentIntent | null>(null);

////    // AC choice: QR OR link
////    const [mode, setMode] = useState<'qr' | 'link'>('qr');

////    const statusLower =
////        useMemo(() => String(intent?.status || '').toLowerCase(), [intent]);

////    const isExpired =
////        statusLower === 'expired';

////    const isPaid =
////        statusLower === 'paid';

////    // -------------------------------------------------------------------------
////    // Load intent by token
////    // -------------------------------------------------------------------------
////    useEffect(() => {

////        const run = async () => {

////            try {

////                setLoading(true);

////                if (!token) {
////                    toast.error('Invalid payment link');
////                    setIntent(null);
////                    return;
////                }

////                const res =
////                    await api.get(`/payment-intents/public/${token}`);

////                if (!res.data?.success) {
////                    toast.error(res.data?.message || 'Failed to load payment request');
////                    setIntent(null);
////                    return;
////                }

////                setIntent(res.data.data);

////            } catch (err: any) {

////                console.error(err);

////                toast.error(
////                    err.response?.data?.message ||
////                    'Failed to load payment request'
////                );

////                setIntent(null);

////            } finally {

////                setLoading(false);
////            }
////        };

////        run();

////    }, [token]);

////    // -------------------------------------------------------------------------
////    // Copy link
////    // -------------------------------------------------------------------------
////    const handleCopy = async () => {

////        if (!intent?.payment_link)
////            return;

////        try {

////            await navigator.clipboard.writeText(intent.payment_link);

////            toast.success('Payment link copied');

////        } catch {

////            toast.error('Failed to copy');
////        }
////    };

////    // -------------------------------------------------------------------------
////    // Share link (best-effort)
////    // -------------------------------------------------------------------------
////    const handleShare = async () => {

////        if (!intent?.payment_link)
////            return;

////        const payload = {
////            title: 'PayVerify Payment Request',
////            text: `Pay ₦${Number(intent.amount || 0).toLocaleString()} via PayVerify`,
////            url: intent.payment_link
////        };

////        try {

////            // If Web Share API exists (mobile browsers)
////            const navAny = navigator as any;

////            if (navAny.share) {
////                await navAny.share(payload);
////                return;
////            }

////            // Fallback: copy
////            await navigator.clipboard.writeText(intent.payment_link);
////            toast.success('Link copied (share not supported on this device)');

////        } catch {

////            toast.error('Unable to share');
////        }
////    };

////    // -------------------------------------------------------------------------
////    // Download QR
////    // -------------------------------------------------------------------------
////    const downloadQR = () => {

////        if (!intent?.qr_url) {
////            toast.error('QR not available');
////            return;
////        }

////        const a = document.createElement('a');
////        a.href = intent.qr_url;
////        a.download = `payverify-payment-${intent.id}.png`;
////        a.click();
////    };

////    // -------------------------------------------------------------------------
////    // Simulate payment (for now)
////    // -------------------------------------------------------------------------
////    const simulatePay = async () => {

////        if (!intent?.id)
////            return;

////        try {

////            const res =
////                await api.post(`/payment-intents/${intent.id}/mark-paid`);

////            if (!res.data?.success) {
////                toast.error(res.data?.message || 'Failed to mark paid');
////                return;
////            }

////            toast.success('Payment completed (simulated)');
////            setIntent(res.data.data);

////        } catch (err: any) {

////            console.error(err);

////            toast.error(
////                err.response?.data?.message ||
////                'Failed to complete payment'
////            );
////        }
////    };

////    // -------------------------------------------------------------------------
////    // UI
////    // -------------------------------------------------------------------------
////    if (loading) {
////        return (
////            <div style={pageWrap}>
////                <div style={cardStyle} className="text-center">
////                    <Spinner animation="border" />
////                    <div className="mt-3" style={{ opacity: 0.75 }}>
////                        Loading payment request...
////                    </div>
////                </div>
////                {glassStyles}
////            </div>
////        );
////    }

////    if (!intent) {
////        return (
////            <div style={pageWrap}>
////                <div style={cardStyle} className="text-center">
////                    <h4 style={{ marginBottom: 8 }}>Payment request not found</h4>
////                    <div style={{ opacity: 0.75 }}>
////                        This link may be invalid or expired.
////                    </div>
////                </div>
////                {glassStyles}
////            </div>
////        );
////    }

////    return (
////        <div style={pageWrap}>
////            <div style={cardStyle}>

////                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
////                    <div>
////                        <div style={{ fontWeight: 800, fontSize: 20 }}>
////                            PayVerify Payment Request
////                        </div>
////                        <div style={{ opacity: 0.75, fontSize: 13 }}>
////                            Secure payment verification • Token: {intent.token.slice(0, 10)}...
////                        </div>
////                    </div>

////                    <div>
////                        {isPaid && <Badge bg="success">Paid</Badge>}
////                        {!isPaid && isExpired && <Badge bg="danger">Expired</Badge>}
////                        {!isPaid && !isExpired && <Badge bg="warning">Pending</Badge>}
////                    </div>
////                </div>

////                <hr style={divider} />

////                <div className="d-flex align-items-end justify-content-between flex-wrap gap-3">
////                    <div>
////                        <div style={{ opacity: 0.75, fontSize: 13 }}>Amount</div>
////                        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em' }}>
////                            ₦{Number(intent.amount || 0).toLocaleString()}
////                        </div>
////                    </div>

////                    <div className="d-flex gap-2">
////                        <Button
////                            variant={mode === 'qr' ? 'primary' : 'outline-light'}
////                            onClick={() => setMode('qr')}
////                        >
////                            Show QR
////                        </Button>

////                        <Button
////                            variant={mode === 'link' ? 'primary' : 'outline-light'}
////                            onClick={() => setMode('link')}
////                        >
////                            Payment Link
////                        </Button>
////                    </div>
////                </div>

////                <div className="mt-3">

////                    {mode === 'qr' && (
////                        <div className="text-center">
////                            {intent.qr_url ? (
////                                <>
////                                    <img
////                                        src={intent.qr_url}
////                                        alt="PayVerify QR"
////                                        style={qrStyle}
////                                    />
////                                    <div className="d-flex justify-content-center gap-2 mt-3 flex-wrap">
////                                        <Button
////                                            variant="outline-light"
////                                            onClick={downloadQR}
////                                        >
////                                            Download QR
////                                        </Button>

////                                        <Button
////                                            variant="outline-info"
////                                            onClick={() => window.open(intent.payment_link, '_blank')}
////                                        >
////                                            Open Link
////                                        </Button>
////                                    </div>
////                                </>
////                            ) : (
////                                <div style={{ opacity: 0.75 }}>
////                                    QR is not available for this payment request.
////                                </div>
////                            )}
////                        </div>
////                    )}

////                    {mode === 'link' && (
////                        <div>
////                            <div style={linkBox}>
////                                {intent.payment_link}
////                            </div>

////                            <div className="d-flex gap-2 mt-2 flex-wrap">
////                                <Button variant="outline-light" onClick={handleCopy}>
////                                    Copy Link
////                                </Button>
////                                <Button variant="outline-light" onClick={handleShare}>
////                                    Share
////                                </Button>
////                                <Button variant="outline-info" onClick={() => window.open(intent.payment_link, '_blank')}>
////                                    Open
////                                </Button>
////                            </div>
////                        </div>
////                    )}

////                </div>

////                <hr style={divider} />

////                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
////                    <div style={{ opacity: 0.75, fontSize: 12 }}>
////                        Powered by PayVerify • If you did not request this, ignore it.
////                    </div>

////                    {/* Simulation button for now — swap with Paystack/Flutterwave later */}
////                    <Button
////                        variant="success"
////                        disabled={isPaid || isExpired}
////                        onClick={simulatePay}
////                    >
////                        {isPaid ? 'Paid' : 'Pay Now (Simulate)'}
////                    </Button>
////                </div>

////            </div>

////            {glassStyles}
////        </div>
////    );
////}

////// =============================================================================
////// Styles (glass / dashboard feel)
////// =============================================================================

////const pageWrap: React.CSSProperties = {
////    minHeight: '100vh',
////    display: 'flex',
////    alignItems: 'center',
////    justifyContent: 'center',
////    padding: 18,
////    background: 'radial-gradient(1200px 700px at 70% -20%, rgba(0,102,255,0.30), rgba(0,0,0,0) 65%), #05060a'
////};

////const cardStyle: React.CSSProperties = {
////    width: 'min(720px, 100%)',
////    padding: 18,
////    borderRadius: 18,
////    border: '1px solid rgba(255,255,255,0.14)',
////    color: '#e9f2ff',
////    background:
////        'linear-gradient(180deg, rgba(6,7,10,0.76) 0%, rgba(6,16,36,0.72) 55%, rgba(11,46,117,0.62) 100%)',
////    boxShadow:
////        '0 20px 55px rgba(0,0,0,0.55), 0 0 60px rgba(0,102,255,0.18), inset 0 1px 0 rgba(255,255,255,0.12)',
////    backdropFilter: 'blur(18px)'
////};

////const divider: React.CSSProperties = {
////    borderColor: 'rgba(255,255,255,0.10)'
////};

////const qrStyle: React.CSSProperties = {
////    width: 240,
////    maxWidth: '100%',
////    borderRadius: 14,
////    border: '1px solid rgba(255,255,255,0.16)',
////    boxShadow: '0 0 28px rgba(0,102,255,0.18)'
////};

////const linkBox: React.CSSProperties = {
////    fontSize: 12,
////    padding: 12,
////    borderRadius: 12,
////    border: '1px solid rgba(255,255,255,0.14)',
////    background: 'rgba(255,255,255,0.06)',
////    wordBreak: 'break-all'
////};

////const glassStyles = (
////    <style>{`
////        body {
////            margin: 0;
////            font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
////        }
////    `}</style>
////);



///**
//===============================================================================
//PayVerify — Public Payment Page
//===============================================================================

//UPDATED FIX (SAFE, NON-BREAKING)

//ADDED FEATURES:

//1. Open invoice in new tab
//2. Download invoice data (future PDF support)
//3. Payment gateway integration ready

//NO existing functionality removed

//===============================================================================
//*/

//import React, { useEffect, useMemo, useState } from 'react';
//import { useParams } from 'react-router-dom';
//import { Button, Badge, Spinner } from 'react-bootstrap';
//import { toast } from 'react-toastify';
//import api from '../services/api';

//type PaymentIntent = {

//    id: number;

//    token: string;

//    amount: number;

//    status: string;

//    payment_link: string;

//    qr_url: string | null;

//    merchant_id: number | null;

//    purchase_order_id: number | null;

//    expires_at: string | null;

//    created_at: string | null;
//};

//export default function PaymentPage() {

//    const { token } =
//        useParams();

//    const [loading, setLoading] =
//        useState(true);

//    const [intent, setIntent] =
//        useState<PaymentIntent | null>(null);

//    const [mode, setMode] =
//        useState<'qr' | 'link'>('qr');


//    const statusLower =
//        useMemo(
//            () => String(intent?.status || '').toLowerCase(),
//            [intent]
//        );

//    const isExpired =
//        statusLower === 'expired';

//    const isPaid =
//        statusLower === 'paid';


//    /**
//    ===========================================================================
//    Load Payment Intent
//    ===========================================================================
//    */
//    useEffect(() => {

//        const run = async () => {

//            try {

//                setLoading(true);

//                if (!token) {

//                    toast.error('Invalid payment link');

//                    return;
//                }

//                const res =
//                    await api.get(
//                        `/payment-intents/public/${token}`
//                    );

//                if (!res.data?.success) {

//                    toast.error(
//                        res.data?.message ||
//                        'Failed to load payment request'
//                    );

//                    return;
//                }

//                setIntent(res.data.data);

//            }
//            catch (err: any) {

//                console.error(err);

//                toast.error(
//                    err.response?.data?.message ||
//                    'Failed to load payment request'
//                );
//            }
//            finally {

//                setLoading(false);
//            }
//        };

//        run();

//    }, [token]);


//    /**
//    ===========================================================================
//    Copy Link
//    ===========================================================================
//    */
//    const handleCopy = async () => {

//        if (!intent?.payment_link)
//            return;

//        try {

//            await navigator.clipboard.writeText(
//                intent.payment_link
//            );

//            toast.success('Payment link copied');

//        }
//        catch {

//            toast.error('Failed to copy');
//        }
//    };


//    /**
//    ===========================================================================
//    NEW — OPEN INVOICE PAGE IN NEW TAB
//    ===========================================================================
//    WHY:
//    Allows admin or customer to manually open invoice.

//    ===========================================================================
//    */
//    const openInvoiceTab = () => {

//        if (!intent?.payment_link)
//            return;

//        window.open(
//            intent.payment_link,
//            "_blank"
//        );
//    };


//    /**
//    ===========================================================================
//    NEW — Download Invoice JSON (future PDF support)
//    ===========================================================================
//    */
//    // =============================================================================
//    // Download Invoice PDF
//    // =============================================================================
//    // FIXES:
//    // • Uses correct VITE_API_URL
//    // • Removes duplicate /api
//    // • Downloads actual PDF (not JSON)
//    // • Prevents null intent crash
//    // =============================================================================

//    //const downloadInvoice = async () => {

//    //    // Prevent crash if intent not loaded yet
//    //    if (!intent?.id) {

//    //        toast.error("Payment intent not ready");

//    //        return;
//    //    }

//    //    try {

//    //        // Correct URL
//    //        // Your .env already has: http://localhost:5000/api
//    //        // So DO NOT add /api again
//    //        const response =
//    //            await fetch(
//    //                `${import.meta.env.VITE_API_URL}/invoices/${intent.id}/pdf`
//    //            );

//    //        if (!response.ok)
//    //            throw new Error("Failed to download invoice");

//    //        // Convert response to PDF blob
//    //        const blob =
//    //            await response.blob();

//    //        // Create temporary URL
//    //        const url =
//    //            window.URL.createObjectURL(blob);

//    //        // Create hidden download link
//    //        const a =
//    //            document.createElement("a");

//    //        a.href = url;

//    //        a.download =
//    //            `invoice-${intent.id}.pdf`;

//    //        document.body.appendChild(a);

//    //        a.click();

//    //        a.remove();

//    //        window.URL.revokeObjectURL(url);

//    //    }
//    //    catch (error) {

//    //        console.error(error);

//    //        toast.error("Failed to download invoice");
//    //    }

//    //};


//    const downloadInvoice = async () => {

//        if (!intent?.token) {

//            toast.error("Payment token missing");
//            return;
//        }

//        try {

//            const response = await fetch(
//                `${import.meta.env.VITE_API_URL}/invoices/token/${intent.token}/pdf`,
//                {
//                    method: "GET",
//                    headers: {
//                        Accept: "application/pdf"
//                    }
//                }
//            );

//            if (!response.ok)
//                throw new Error("Failed to download invoice");

//            const blob = await response.blob();

//            const url = window.URL.createObjectURL(blob);

//            const a = document.createElement("a");
//            a.href = url;
//            a.download = `invoice-${intent.token}.pdf`;
//            a.click();

//            window.URL.revokeObjectURL(url);

//        } catch (error) {

//            console.error(error);
//            toast.error("Failed to download invoice");
//        }
//    };




//    /**
//    ===========================================================================
//    Simulate Payment
//    ===========================================================================
//    */
//    const simulatePay = async () => {

//        if (!intent?.id) {

//            toast.error("Missing PaymentIntent id");
//            return;
//        }

//        try {

//            const res =
//                await api.post(
//                    `/payment-intents/${intent.id}/mark-paid`
//                );

//            if (!res.data?.success) {

//                toast.error(
//                    res.data?.message ||
//                    "Failed to mark paid"
//                );

//                return;
//            }

//            toast.success(
//                "Payment completed successfully"
//            );

//            setIntent(res.data.data);

//        }
//        catch (err: any) {

//            console.error(err);

//            toast.error(
//                err.response?.data?.message ||
//                "Failed to complete payment"
//            );

//        }

//    };



//    /**
//    ===========================================================================
//    UI
//    ===========================================================================
//    */
//    if (loading) {

//        return (

//            <div style={pageWrap}>

//                <div style={cardStyle}>

//                    <Spinner />

//                </div>

//                {glassStyles}

//            </div>
//        );
//    }

//    if (!intent) {

//        return (

//            <div style={pageWrap}>

//                <div style={cardStyle}>

//                    Payment not found

//                </div>

//                {glassStyles}

//            </div>
//        );
//    }


//    return (

//        <div style={pageWrap}>

//            <div style={cardStyle}>


//                <h2>

//                    ₦{intent.amount.toLocaleString()}

//                </h2>


//                <Badge bg="warning">

//                    Pending Payment

//                </Badge>


//                <div className="mt-3">

//                    <img
//                        src={intent.qr_url || ''}
//                        style={qrStyle}
//                    />

//                </div>


//                <div className="mt-3">

//                    {intent.payment_link}

//                </div>


//                <div className="mt-3 d-flex gap-2 flex-wrap">


//                    <Button onClick={handleCopy}>

//                        Copy Link

//                    </Button>


//                    <Button
//                        variant="info"
//                        onClick={openInvoiceTab}
//                    >
//                        Open Invoice Page
//                    </Button>


//                    <Button
//                        variant="secondary"
//                        onClick={downloadInvoice}
//                    >
//                        Download Invoice
//                    </Button>


//                    <Button
//                        variant="success"
//                        disabled={isPaid}
//                        onClick={simulatePay}
//                    >
//                        Pay Now (Simulate)
//                    </Button>

//                </div>


//            </div>

//            {glassStyles}

//        </div>
//    );
//}


///**
//===============================================================================
//Styles (unchanged)
//===============================================================================
//*/

//const pageWrap: React.CSSProperties = {

//    minHeight: "100vh",

//    display: "flex",

//    alignItems: "center",

//    justifyContent: "center",

//    background: "#05060a"
//};

//const cardStyle: React.CSSProperties = {

//    padding: 20,

//    borderRadius: 18,

//    color: "#fff"
//};

//const qrStyle: React.CSSProperties = {

//    width: 220
//};

//const glassStyles = (

//    <style>{`
//        body {
//            margin:0;
//        }
//    `}</style>

//);


/**
===============================================================================
PayVerify — Public Payment Page (FINAL FIXED)
===============================================================================

FIXES APPLIED

✅ FIX #1: PaymentIntent.id changed to string (UUID safe)
✅ FIX #2: simulatePay debug logging added
✅ FIX #3: defensive QR rendering
✅ FIX #4: improved null safety
✅ ZERO breaking changes

===============================================================================
*/

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Badge, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api from '../services/api';

// =============================================================================
// Type Definition (FIXED)
// =============================================================================

type PaymentIntent = {

    // ✅ CRITICAL FIX: must be string because DB uses UUID
    id: string;

    token: string;
    amount: number;
    status: string;
    payment_link: string;
    qr_url: string | null;
    merchant_id: number | null;
    purchase_order_id: number | null;
    expires_at: string | null;
    created_at: string | null;
};

export default function PaymentPage() {

    const { token } = useParams();

    const [loading, setLoading] = useState(true);
    const [intent, setIntent] = useState<PaymentIntent | null>(null);

    const [mode, setMode] = useState<'qr' | 'link'>('qr');

    const statusLower =
        useMemo(
            () => String(intent?.status || '').toLowerCase(),
            [intent]
        );

    const isExpired = statusLower === 'expired';
    const isPaid = statusLower === 'paid';

    /**
    =============================================================================
    Load Payment Intent
    =============================================================================
    */
    useEffect(() => {

        const run = async () => {

            try {

                setLoading(true);

                if (!token) {
                    toast.error('Invalid payment link');
                    return;
                }

                const res =
                    await api.get(
                        `/payment-intents/public/${token}`
                    );

                if (!res.data?.success) {
                    toast.error(
                        res.data?.message ||
                        'Failed to load payment request'
                    );
                    return;
                }

                setIntent(res.data.data);

            } catch (err: any) {

                console.error(err);

                toast.error(
                    err.response?.data?.message ||
                    'Failed to load payment request'
                );

            } finally {

                setLoading(false);
            }
        };

        run();

    }, [token]);

    /**
    =============================================================================
    Copy Link
    =============================================================================
    */
    const handleCopy = async () => {

        if (!intent?.payment_link)
            return;

        try {

            await navigator.clipboard.writeText(
                intent.payment_link
            );

            toast.success('Payment link copied');

        } catch {

            toast.error('Failed to copy');
        }
    };

    /**
    =============================================================================
    Open Invoice Page
    =============================================================================
    */
    const openInvoiceTab = () => {

        if (!intent?.payment_link)
            return;

        window.open(
            intent.payment_link,
            "_blank"
        );
    };

    /**
    =============================================================================
    Download Invoice PDF
    =============================================================================
    */
    const downloadInvoice = async () => {

        if (!intent?.token) {
            toast.error("Payment token missing");
            return;
        }

        try {

            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/invoices/token/${intent.token}/pdf`,
                {
                    method: "GET",
                    headers: { Accept: "application/pdf" }
                }
            );

            if (!response.ok)
                throw new Error("Failed to download invoice");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = `invoice-${intent.token}.pdf`;
            a.click();

            window.URL.revokeObjectURL(url);

        } catch (error) {

            console.error(error);
            toast.error("Failed to download invoice");
        }
    };

    /**
    =============================================================================
    Simulate Payment (FIXED)
    =============================================================================
    */
    const simulatePay = async () => {

        if (!intent?.id) {
            toast.error("Missing PaymentIntent id");
            return;
        }

        // ✅ DEBUG — helps trace issues quickly
        console.log("simulatePay sending id:", intent.id);

        try {

            const res =
                await api.post(
                    `/payment-intents/${intent.id}/mark-paid`
                );

            if (!res.data?.success) {
                toast.error(
                    res.data?.message ||
                    "Failed to mark paid"
                );
                return;
            }

            toast.success(
                "Payment completed successfully"
            );

            setIntent(res.data.data);

        } catch (err: any) {

            console.error(err);

            toast.error(
                err.response?.data?.message ||
                "Failed to complete payment"
            );
        }
    };

    /**
    =============================================================================
    UI STATES
    =============================================================================
    */
    if (loading) {
        return (
            <div style={pageWrap}>
                <div style={cardStyle}>
                    <Spinner />
                </div>
                {glassStyles}
            </div>
        );
    }

    if (!intent) {
        return (
            <div style={pageWrap}>
                <div style={cardStyle}>
                    Payment not found
                </div>
                {glassStyles}
            </div>
        );
    }

    /**
    =============================================================================
    MAIN UI
    =============================================================================
    */
    return (
        <div style={pageWrap}>
            <div style={cardStyle}>

                <h2>
                    ₦{Number(intent.amount || 0).toLocaleString()}
                </h2>

                <Badge bg="warning">
                    Pending Payment
                </Badge>

                <div className="mt-3">
                    {/* ✅ Defensive render */}
                    {intent.qr_url && (
                        <img
                            src={intent.qr_url}
                            style={qrStyle}
                            alt="Payment QR"
                        />
                    )}
                </div>

                <div className="mt-3">
                    {intent.payment_link}
                </div>

                <div className="mt-3 d-flex gap-2 flex-wrap">

                    <Button onClick={handleCopy}>
                        Copy Link
                    </Button>

                    <Button
                        variant="info"
                        onClick={openInvoiceTab}
                    >
                        Open Invoice Page
                    </Button>

                    <Button
                        variant="secondary"
                        onClick={downloadInvoice}
                    >
                        Download Invoice
                    </Button>

                    <Button
                        variant="success"
                        disabled={isPaid || isExpired}
                        onClick={simulatePay}
                    >
                        {isPaid ? "Paid" : "Pay Now (Simulate)"}
                    </Button>

                </div>

            </div>

            {glassStyles}
        </div>
    );
}

/**
===============================================================================
Styles (unchanged)
===============================================================================
*/

const pageWrap: React.CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#05060a"
};

const cardStyle: React.CSSProperties = {
    padding: 20,
    borderRadius: 18,
    color: "#fff"
};

const qrStyle: React.CSSProperties = {
    width: 220
};

const glassStyles = (
    <style>{`
        body {
            margin:0;
        }
    `}</style>
);

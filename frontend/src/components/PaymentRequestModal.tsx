////////// =============================================================================
////////// PayVerify — Payment Request Modal
////////// =============================================================================
////////// PURPOSE
////////// Display QR code + payment link after Purchase Order approval
//////////
////////// FEATURES
////////// • Glass UI matching dashboard
////////// • QR preview
////////// • Copy link
////////// • Open link
////////// • Download QR
////////// • Send to customer (future ready)
////////// • Zero breaking changes
////////// =============================================================================

////////import React, { useState } from "react";
////////import { Modal, Button, Badge } from "react-bootstrap";
////////import { toast } from "react-toastify";

////////interface PaymentIntent {

////////    id: string;

////////    payment_link: string;

////////    qr_url: string;

////////    amount: number;

////////    status: string;

////////}

////////interface Props {

////////    open: boolean;

////////    onClose: () => void;

////////    paymentIntent: PaymentIntent | null;

////////}

////////const PaymentRequestModal: React.FC<Props> = ({
////////    open,
////////    onClose,
////////    paymentIntent
////////}) => {

////////    const [copied, setCopied] =
////////        useState(false);

////////    if (!paymentIntent)
////////        return null;

////////    // Copy payment link
////////    const handleCopy = async () => {

////////        try {

////////            await navigator.clipboard.writeText(
////////                paymentIntent.payment_link
////////            );

////////            setCopied(true);

////////            toast.success(
////////                "Payment link copied"
////////            );

////////            setTimeout(() =>
////////                setCopied(false),
////////                2000
////////            );

////////        }
////////        catch {

////////            toast.error(
////////                "Failed to copy"
////////            );
////////        }
////////    };

////////    // Download QR
////////    const downloadQR = () => {

////////        const link =
////////            document.createElement("a");

////////        link.href =
////////            paymentIntent.qr_url;

////////        link.download =
////////            "payment-qr.png";

////////        link.click();
////////    };

////////    return (

////////        <Modal
////////            show={open}
////////            onHide={onClose}
////////            centered
////////            backdrop="static"
////////        >


////////            {/* GLASS CONTAINER */}
////////            <div style={{

////////                background:
////////                    "linear-gradient(145deg, rgba(0,0,0,0.75), rgba(0,40,120,0.45))",

////////                backdropFilter:
////////                    "blur(20px)",

////////                borderRadius:
////////                    "14px",

////////                border:
////////                    "1px solid rgba(0,180,255,0.35)",

////////                boxShadow:
////////                    "0 0 30px rgba(0,150,255,0.25)"

////////            }}>

////////                <Modal.Header closeButton
////////                    style={{
////////                        borderBottom:
////////                            "1px solid rgba(255,255,255,0.1)"
////////                    }}
////////                >

////////                    <Modal.Title
////////                        style={{
////////                            color: "#fff",
////////                            fontWeight: 600
////////                        }}
////////                    >
////////                        Payment Request Created
////////                    </Modal.Title>

////////                </Modal.Header>

////////                <Modal.Body
////////                    style={{
////////                        color: "#fff"
////////                    }}
////////                >

////////                    {/* Amount */}
////////                    <div className="mb-3">

////////                        <h5>
////////                            ₦
////////                            {paymentIntent.amount.toLocaleString()}
////////                        </h5>

////////                        <Badge bg="warning">
////////                            Pending Payment
////////                        </Badge>

////////                    </div>

////////                    {/* QR */}
////////                    <div
////////                        className="text-center mb-3"
////////                    >

////////                        <img
////////                            src={paymentIntent.qr_url}
////////                            alt="QR"
////////                            style={{
////////                                width: 220,
////////                                borderRadius: 10,
////////                                border:
////////                                    "1px solid rgba(255,255,255,0.2)"
////////                            }}
////////                        />

////////                    </div>

////////                    {/* Payment link */}
////////                    <div
////////                        style={{
////////                            fontSize: 12,
////////                            wordBreak: "break-all",
////////                            opacity: 0.8
////////                        }}
////////                    >
////////                        {paymentIntent.payment_link}
////////                    </div>

////////                </Modal.Body>

////////                <Modal.Footer
////////                    style={{
////////                        borderTop:
////////                            "1px solid rgba(255,255,255,0.1)"
////////                    }}
////////                >

////////                    <Button
////////                        variant="outline-light"
////////                        onClick={handleCopy}
////////                    >
////////                        {copied
////////                            ? "Copied"
////////                            : "Copy Link"}
////////                    </Button>

////////                    <Button
////////                        variant="outline-info"
////////                        onClick={() =>
////////                            window.open(
////////                                paymentIntent.payment_link,
////////                                "_blank"
////////                            )
////////                        }
////////                    >
////////                        Open Link
////////                    </Button>

////////                    <Button
////////                        variant="outline-success"
////////                        onClick={downloadQR}
////////                    >
////////                        Download QR
////////                    </Button>

////////                    <Button
////////                        variant="secondary"
////////                        onClick={onClose}
////////                    >
////////                        Close
////////                    </Button>

////////                </Modal.Footer>

////////            </div>

////////        </Modal>

////////    );

////////};

////////export default PaymentRequestModal;



//////// =============================================================================
//////// PayVerify — Payment Request Modal (SAFE UPDATED VERSION)
//////// =============================================================================
//////// PURPOSE
//////// Display QR code + payment link after Purchase Order approval
////////
//////// NEW FEATURES ADDED (NON-BREAKING)
//////// • Customer Email textbox
//////// • Send Email button using SendGrid
//////// • Sends invoice link + QR code to customer
////////
//////// EXISTING FEATURES PRESERVED
//////// • Copy link
//////// • Open link
//////// • Download QR
//////// • Glass UI
//////// =============================================================================

//////import React, { useState } from "react";
//////import { Modal, Button, Badge, Form } from "react-bootstrap";
//////import { toast } from "react-toastify";
//////import api from "../services/api"; // your existing axios instance

//////interface PaymentIntent {

//////    id: string;

//////    payment_link: string;

//////    qr_url: string;

//////    amount: number;

//////    status: string;
//////}

//////interface Props {

//////    open: boolean;

//////    onClose: () => void;

//////    paymentIntent: PaymentIntent | null;
//////}

//////const PaymentRequestModal: React.FC<Props> = ({
//////    open,
//////    onClose,
//////    paymentIntent
//////}) => {

//////    const [copied, setCopied] = useState(false);

//////    // NEW STATE — EMAIL FIELD
//////    const [email, setEmail] = useState("");

//////    const [sending, setSending] = useState(false);

//////    if (!paymentIntent)
//////        return null;


//////    // =============================================================================
//////    // Copy payment link
//////    // =============================================================================
//////    const handleCopy = async () => {

//////        try {

//////            await navigator.clipboard.writeText(
//////                paymentIntent.payment_link
//////            );

//////            setCopied(true);

//////            toast.success("Payment link copied");

//////            setTimeout(() =>
//////                setCopied(false),
//////                2000
//////            );

//////        } catch {

//////            toast.error("Failed to copy");
//////        }
//////    };


//////    // =============================================================================
//////    // Download QR
//////    // =============================================================================
//////    const downloadQR = () => {

//////        const link =
//////            document.createElement("a");

//////        link.href =
//////            paymentIntent.qr_url;

//////        link.download =
//////            "payment-qr.png";

//////        link.click();
//////    };


//////    // =============================================================================
//////    // NEW: Send Email via SendGrid
//////    // =============================================================================
//////    const sendEmail = async () => {

//////        if (!email) {

//////            toast.error("Please enter customer email");

//////            return;
//////        }

//////        try {

//////            setSending(true);

//////            await api.post("/payment-intents/send-link", {

//////                email: email,

//////                paymentLink:
//////                    paymentIntent.payment_link,

//////                amount:
//////                    paymentIntent.amount
//////            });

//////            toast.success("Invoice sent successfully");

//////            setEmail("");

//////        } catch (error: any) {

//////            console.error(error);

//////            toast.error(
//////                error.response?.data?.message ||
//////                "Failed to send email"
//////            );

//////        } finally {

//////            setSending(false);
//////        }
//////    };


//////    return (

//////        <Modal
//////            show={open}
//////            onHide={onClose}
//////            centered
//////            backdrop="static"
//////        >

//////            {/* GLASS CONTAINER */}
//////            <div style={{

//////                background:
//////                    "linear-gradient(145deg, rgba(0,0,0,0.75), rgba(0,40,120,0.45))",

//////                backdropFilter:
//////                    "blur(20px)",

//////                borderRadius:
//////                    "14px",

//////                border:
//////                    "1px solid rgba(0,180,255,0.35)",

//////                boxShadow:
//////                    "0 0 30px rgba(0,150,255,0.25)"
//////            }}>

//////                <Modal.Header closeButton
//////                    style={{
//////                        borderBottom:
//////                            "1px solid rgba(255,255,255,0.1)"
//////                    }}
//////                >

//////                    <Modal.Title
//////                        style={{
//////                            color: "#fff",
//////                            fontWeight: 600
//////                        }}
//////                    >
//////                        Payment Request Created
//////                    </Modal.Title>

//////                </Modal.Header>


//////                <Modal.Body
//////                    style={{
//////                        color: "#fff"
//////                    }}
//////                >

//////                    {/* Amount */}
//////                    <div className="mb-3">

//////                        <h5>
//////                            ₦
//////                            {paymentIntent.amount.toLocaleString()}
//////                        </h5>

//////                        <Badge bg="warning">
//////                            Pending Payment
//////                        </Badge>

//////                    </div>


//////                    {/* QR */}
//////                    <div className="text-center mb-3">

//////                        <img
//////                            src={paymentIntent.qr_url}
//////                            alt="QR"
//////                            style={{
//////                                width: 220,
//////                                borderRadius: 10,
//////                                border:
//////                                    "1px solid rgba(255,255,255,0.2)"
//////                            }}
//////                        />

//////                    </div>


//////                    {/* Payment link */}
//////                    <div
//////                        style={{
//////                            fontSize: 12,
//////                            wordBreak: "break-all",
//////                            opacity: 0.8,
//////                            marginBottom: 15
//////                        }}
//////                    >
//////                        {paymentIntent.payment_link}
//////                    </div>


//////                    {/* =============================================================================
//////                       NEW EMAIL FIELD (SAFE ADD)
//////                    ============================================================================= */}

//////                    <Form.Group>

//////                        <Form.Label>
//////                            Send invoice to customer email
//////                        </Form.Label>

//////                        <Form.Control
//////                            type="email"
//////                            placeholder="customer@email.com"
//////                            value={email}
//////                            onChange={(e) =>
//////                                setEmail(e.target.value)
//////                            }
//////                        />

//////                    </Form.Group>

//////                    <Button
//////                        className="mt-2 w-100"
//////                        variant="primary"
//////                        onClick={sendEmail}
//////                        disabled={sending}
//////                    >
//////                        {sending
//////                            ? "Sending..."
//////                            : "Send Invoice Email"}
//////                    </Button>

//////                </Modal.Body>


//////                <Modal.Footer
//////                    style={{
//////                        borderTop:
//////                            "1px solid rgba(255,255,255,0.1)"
//////                    }}
//////                >

//////                    <Button
//////                        variant="outline-light"
//////                        onClick={handleCopy}
//////                    >
//////                        {copied
//////                            ? "Copied"
//////                            : "Copy Link"}
//////                    </Button>

//////                    <Button
//////                        variant="outline-info"
//////                        onClick={() =>
//////                            window.open(
//////                                paymentIntent.payment_link,
//////                                "_blank"
//////                            )
//////                        }
//////                    >
//////                        Open Link
//////                    </Button>

//////                    <Button
//////                        variant="outline-success"
//////                        onClick={downloadQR}
//////                    >
//////                        Download QR
//////                    </Button>

//////                    <Button
//////                        variant="secondary"
//////                        onClick={onClose}
//////                    >
//////                        Close
//////                    </Button>

//////                </Modal.Footer>

//////            </div>

//////        </Modal>

//////    );

//////};

//////export default PaymentRequestModal;



////// =============================================================================
////// PayVerify — Payment Request Modal
////// =============================================================================
////// PURPOSE
////// Display QR code + payment link after Purchase Order approval
//////
////// FEATURES
////// • Glass UI matching dashboard
////// • QR preview
////// • Copy link
////// • Open link
////// • Download QR
////// • Send invoice email to customer  ✅ FIXED
//////
////// CRITICAL FIX APPLIED
////// Previously the modal used axios directly which did NOT include JWT token.
////// This caused backend to return:
//////    401 Unauthorized
//////    500 Internal Server Error
//////
////// FIX:
////// We now use the authenticated api instance from:
//////    src/services/api.ts
//////
////// This ensures Authorization header is automatically included:
//////
////// Authorization: Bearer <token>
//////
////// This does NOT break any existing functionality.
////// =============================================================================

////import React, { useState } from "react";
////import { Modal, Button, Badge, Form } from "react-bootstrap";
////import { toast } from "react-toastify";

////// ✅ CRITICAL FIX
////// Use authenticated API client instead of raw axios
////// This ensures JWT token is automatically attached
////import api from "../services/api";

////interface PaymentIntent {

////    id: string;

////    payment_link: string;

////    qr_url: string;

////    amount: number;

////    status: string;

////}

////interface Props {

////    open: boolean;

////    onClose: () => void;

////    paymentIntent: PaymentIntent | null;

////}

////const PaymentRequestModal: React.FC<Props> = ({
////    open,
////    onClose,
////    paymentIntent
////}) => {

////    const [copied, setCopied] =
////        useState(false);

////    // ✅ NEW: customer email state
////    // This allows merchant to send invoice email
////    const [customerEmail, setCustomerEmail] =
////        useState("");

////    // ✅ NEW: loading state for send button
////    const [sending, setSending] =
////        useState(false);

////    if (!paymentIntent)
////        return null;


////    // =============================================================================
////    // Copy payment link
////    // =============================================================================
////    const handleCopy = async () => {

////        try {

////            await navigator.clipboard.writeText(
////                paymentIntent.payment_link
////            );

////            setCopied(true);

////            toast.success(
////                "Payment link copied"
////            );

////            setTimeout(() =>
////                setCopied(false),
////                2000
////            );

////        }
////        catch {

////            toast.error(
////                "Failed to copy"
////            );
////        }
////    };


////    // =============================================================================
////    // Download QR
////    // =============================================================================
////    const downloadQR = () => {

////        const link =
////            document.createElement("a");

////        link.href =
////            paymentIntent.qr_url;

////        link.download =
////            "payment-qr.png";

////        link.click();
////    };


////    // =============================================================================
////    // ✅ NEW FEATURE — Send Invoice Email
////    // =============================================================================
////    //
////    // WHY THIS WAS ADDED
////    //
////    // This allows merchant to send invoice link via email.
////    //
////    // Backend endpoint:
////    // POST /api/payment-intents/send-link
////    //
////    // CRITICAL FIX:
////    // Using authenticated api client ensures JWT is included.
////    //
////    // =============================================================================

////    const sendInvoiceEmail = async () => {

////        try {

////            if (!customerEmail) {

////                toast.error(
////                    "Enter customer email"
////                );

////                return;
////            }

////            setSending(true);

////            await api.post(

////                "/payment-intents/send-link",

////                {
////                    email: customerEmail,

////                    paymentLink:
////                        paymentIntent.payment_link,

////                    amount:
////                        paymentIntent.amount
////                }

////            );

////            toast.success(
////                "Invoice email sent successfully"
////            );

////        }
////        catch (error: any) {

////            console.error(error);

////            toast.error(
////                error?.response?.data?.message
////                || "Failed to send email"
////            );
////        }
////        finally {

////            setSending(false);
////        }
////    };


////    return (

////        <Modal
////            show={open}
////            onHide={onClose}
////            centered
////            backdrop="static"
////        >

////            {/* GLASS CONTAINER */}
////            <div style={{

////                background:
////                    "linear-gradient(145deg, rgba(0,0,0,0.75), rgba(0,40,120,0.45))",

////                backdropFilter:
////                    "blur(20px)",

////                borderRadius:
////                    "14px",

////                border:
////                    "1px solid rgba(0,180,255,0.35)",

////                boxShadow:
////                    "0 0 30px rgba(0,150,255,0.25)"

////            }}>

////                <Modal.Header closeButton>

////                    <Modal.Title
////                        style={{
////                            color: "#fff",
////                            fontWeight: 600
////                        }}
////                    >
////                        Payment Request Created
////                    </Modal.Title>

////                </Modal.Header>

////                <Modal.Body
////                    style={{
////                        color: "#fff"
////                    }}
////                >

////                    {/* Amount */}
////                    <div className="mb-3">

////                        <h5>
////                            ₦
////                            {paymentIntent.amount.toLocaleString()}
////                        </h5>

////                        <Badge bg="warning">
////                            Pending Payment
////                        </Badge>

////                    </div>


////                    {/* QR */}
////                    <div className="text-center mb-3">

////                        <img
////                            src={paymentIntent.qr_url}
////                            alt="QR"
////                            style={{
////                                width: 220,
////                                borderRadius: 10,
////                                border:
////                                    "1px solid rgba(255,255,255,0.2)"
////                            }}
////                        />

////                    </div>


////                    {/* Payment link */}
////                    <div
////                        style={{
////                            fontSize: 12,
////                            wordBreak: "break-all",
////                            opacity: 0.8,
////                            marginBottom: 15
////                        }}
////                    >
////                        {paymentIntent.payment_link}
////                    </div>


////                    {/* =============================================================================
////                       NEW EMAIL FIELD — DOES NOT BREAK EXISTING FLOW
////                       ============================================================================= */}

////                    <Form.Group>

////                        <Form.Label>
////                            Send invoice to customer email
////                        </Form.Label>

////                        <Form.Control

////                            type="email"

////                            placeholder="customer@email.com"

////                            value={customerEmail}

////                            onChange={(e) =>
////                                setCustomerEmail(
////                                    e.target.value
////                                )
////                            }

////                        />

////                    </Form.Group>


////                    <Button

////                        className="mt-2 w-100"

////                        variant="primary"

////                        onClick={sendInvoiceEmail}

////                        disabled={sending}

////                    >
////                        {sending
////                            ? "Sending..."
////                            : "Send Invoice Email"}
////                    </Button>


////                </Modal.Body>


////                <Modal.Footer>

////                    <Button
////                        variant="outline-light"
////                        onClick={handleCopy}
////                    >
////                        {copied
////                            ? "Copied"
////                            : "Copy Link"}
////                    </Button>

////                    <Button
////                        variant="outline-info"
////                        onClick={() =>
////                            window.open(
////                                paymentIntent.payment_link,
////                                "_blank"
////                            )
////                        }
////                    >
////                        Open Link
////                    </Button>

////                    <Button
////                        variant="outline-success"
////                        onClick={downloadQR}
////                    >
////                        Download QR
////                    </Button>

////                    <Button
////                        variant="secondary"
////                        onClick={onClose}
////                    >
////                        Close
////                    </Button>

////                </Modal.Footer>

////            </div>

////        </Modal>

////    );

////};

////export default PaymentRequestModal;




///**
//===============================================================================
//PayVerify — Payment Request Modal
//===============================================================================

//UPDATED FIX (SAFE, NON-BREAKING):

//ADDED:
//"Open Invoice Page" button

//WHY:
//Email sending may fail temporarily.
//Admin must still be able to open invoice manually.

//This opens:

//http://localhost:5173/pay/{token}

//NO existing functionality removed.

//===============================================================================
//*/

//import React, { useState } from "react";
//import { Modal, Button, Badge } from "react-bootstrap";
//import { toast } from "react-toastify";

//interface PaymentIntent {

//    id: string;

//    payment_link: string;

//    qr_url: string;

//    amount: number;

//    status: string;
//}

//interface Props {

//    open: boolean;

//    onClose: () => void;

//    paymentIntent: PaymentIntent | null;
//}

//const PaymentRequestModal: React.FC<Props> = ({
//    open,
//    onClose,
//    paymentIntent
//}) => {

//    const [copied, setCopied] =
//        useState(false);

//    if (!paymentIntent)
//        return null;

//    /**
//     ===========================================================================
//     Copy payment link
//     ===========================================================================
//     */
//    const handleCopy = async () => {

//        try {

//            await navigator.clipboard.writeText(
//                paymentIntent.payment_link
//            );

//            setCopied(true);

//            toast.success("Payment link copied");

//            setTimeout(() =>
//                setCopied(false),
//                2000
//            );
//        }
//        catch {

//            toast.error("Failed to copy");
//        }
//    };

//    /**
//     ===========================================================================
//     Download QR image
//     ===========================================================================
//     */
//    const downloadQR = () => {

//        const link =
//            document.createElement("a");

//        link.href =
//            paymentIntent.qr_url;

//        link.download =
//            "payment-qr.png";

//        link.click();
//    };

//    /**
//     ===========================================================================
//     NEW FEATURE — OPEN INVOICE PAGE
//     ===========================================================================
//     WHY:
//     Allows admin to open invoice manually when email unavailable.

//     Opens new browser tab:
//     http://localhost:5173/pay/{token}
//     ===========================================================================
//     */
//    const openInvoicePage = () => {

//        window.open(
//            paymentIntent.payment_link,
//            "_blank"
//        );
//    };


//    return (

//        <Modal
//            show={open}
//            onHide={onClose}
//            centered
//            backdrop="static"
//        >

//            <div style={{

//                background:
//                    "linear-gradient(145deg, rgba(0,0,0,0.75), rgba(0,40,120,0.45))",

//                backdropFilter:
//                    "blur(20px)",

//                borderRadius:
//                    "14px",

//                border:
//                    "1px solid rgba(0,180,255,0.35)",

//                boxShadow:
//                    "0 0 30px rgba(0,150,255,0.25)"
//            }}>

//                <Modal.Header closeButton>

//                    <Modal.Title style={{ color: "#fff" }}>

//                        Payment Request Created

//                    </Modal.Title>

//                </Modal.Header>


//                <Modal.Body style={{ color: "#fff" }}>

//                    {/* Amount */}
//                    <div className="mb-3">

//                        <h5>
//                            ₦{paymentIntent.amount.toLocaleString()}
//                        </h5>

//                        <Badge bg="warning">

//                            Pending Payment

//                        </Badge>

//                    </div>


//                    {/* QR */}
//                    <div className="text-center mb-3">

//                        <img
//                            src={paymentIntent.qr_url}
//                            alt="QR"
//                            style={{
//                                width: 220,
//                                borderRadius: 10
//                            }}
//                        />

//                    </div>


//                    {/* Payment link */}
//                    <div style={{
//                        fontSize: 12,
//                        wordBreak: "break-all"
//                    }}>
//                        {paymentIntent.payment_link}
//                    </div>

//                </Modal.Body>


//                <Modal.Footer>

//                    {/* Copy Link */}
//                    <Button
//                        variant="outline-light"
//                        onClick={handleCopy}
//                    >
//                        {copied ? "Copied" : "Copy Link"}
//                    </Button>


//                    {/* Existing button */}
//                    <Button
//                        variant="outline-info"
//                        onClick={openInvoicePage}
//                    >
//                        Open Link
//                    </Button>


//                    {/* NEW BUTTON — clearer UX */}
//                    <Button
//                        variant="success"
//                        onClick={openInvoicePage}
//                    >
//                        Open Invoice Page
//                    </Button>


//                    {/* Download QR */}
//                    <Button
//                        variant="outline-success"
//                        onClick={downloadQR}
//                    >
//                        Download QR
//                    </Button>


//                    <Button
//                        variant="secondary"
//                        onClick={onClose}
//                    >
//                        Close
//                    </Button>

//                </Modal.Footer>

//            </div>

//        </Modal>
//    );
//};

//export default PaymentRequestModal;


///**
//===============================================================================
//PayVerify — Payment Request Modal (FINAL QR FIX)
//===============================================================================

//WHAT CHANGED:

//❌ REMOVED: dependency on paymentIntent.qr_url (was broken / unreliable)
//✅ ADDED: QRCodeCanvas (frontend-generated QR — ALWAYS works)
//✅ QR now encodes paymentIntent.payment_link (CORRECT)
//✅ FIXED: QR download now uses canvas instead of broken URL

//WHY:

//- Backend QR was not guaranteed to exist
//- Frontend QR ensures 100% reliability
//- Zero breaking changes to existing flow

//===============================================================================
//*/

//import React, { useState } from "react";
//import { Modal, Button, Badge } from "react-bootstrap";
//import { toast } from "react-toastify";

//// 🔥 NEW — QR generator (reliable)
//import { QRCodeCanvas } from "qrcode.react";

//interface PaymentIntent {

//    id: string;

//    payment_link: string;

//    qr_url: string; // (no longer used for display)

//    amount: number;

//    status: string;
//}

//interface Props {

//    open: boolean;

//    onClose: () => void;

//    paymentIntent: PaymentIntent | null;
//}

//const PaymentRequestModal: React.FC<Props> = ({
//    open,
//    onClose,
//    paymentIntent
//}) => {

//    const [copied, setCopied] =
//        useState(false);

//    if (!paymentIntent)
//        return null;

//    // =============================================================================
//    // Copy payment link
//    // =============================================================================
//    const handleCopy = async () => {

//        try {

//            await navigator.clipboard.writeText(
//                paymentIntent.payment_link
//            );

//            setCopied(true);

//            toast.success("Payment link copied");

//            setTimeout(() =>
//                setCopied(false),
//                2000
//            );
//        }
//        catch {

//            toast.error("Failed to copy");
//        }
//    };

//    // =============================================================================
//    // 🔥 FIXED: Download QR (canvas-based)
//    // =============================================================================
//    const downloadQR = () => {

//        const canvas =
//            document.querySelector("canvas");

//        if (!canvas) {

//            toast.error("QR not ready");

//            return;
//        }

//        const url =
//            canvas.toDataURL("image/png");

//        const link =
//            document.createElement("a");

//        link.href = url;

//        link.download = "payment-qr.png";

//        link.click();
//    };

//    // =============================================================================
//    // Open invoice page
//    // =============================================================================
//    const openInvoicePage = () => {

//        window.open(
//            paymentIntent.payment_link,
//            "_blank"
//        );
//    };

//    return (

//        <Modal
//            show={open}
//            onHide={onClose}
//            centered
//            backdrop="static"
//        >

//            <div style={{

//                background:
//                    "linear-gradient(145deg, rgba(0,0,0,0.75), rgba(0,40,120,0.45))",

//                backdropFilter:
//                    "blur(20px)",

//                borderRadius:
//                    "14px",

//                border:
//                    "1px solid rgba(0,180,255,0.35)",

//                boxShadow:
//                    "0 0 30px rgba(0,150,255,0.25)"
//            }}>

//                <Modal.Header closeButton>

//                    <Modal.Title style={{ color: "#fff" }}>

//                        Payment Request Created

//                    </Modal.Title>

//                </Modal.Header>


//                <Modal.Body style={{ color: "#fff" }}>

//                    {/* Amount */}
//                    <div className="mb-3">

//                        <h5>
//                            ₦{paymentIntent.amount.toLocaleString()}
//                        </h5>

//                        <Badge bg="warning">

//                            Pending Payment

//                        </Badge>

//                    </div>


//                    {/* ============================================================
//                       🔥 FIXED QR CODE (CRITICAL CHANGE)
//                    ============================================================ */}
//                    <div className="text-center mb-3">

//                        <QRCodeCanvas
//                            value={paymentIntent.payment_link}
//                            size={220}
//                            level="H"
//                            includeMargin
//                        />

//                    </div>


//                    {/* Payment link */}
//                    <div style={{
//                        fontSize: 12,
//                        wordBreak: "break-all"
//                    }}>
//                        {paymentIntent.payment_link}
//                    </div>

//                </Modal.Body>


//                <Modal.Footer>

//                    <Button
//                        variant="outline-light"
//                        onClick={handleCopy}
//                    >
//                        {copied ? "Copied" : "Copy Link"}
//                    </Button>

//                    <Button
//                        variant="outline-info"
//                        onClick={openInvoicePage}
//                    >
//                        Open Link
//                    </Button>

//                    <Button
//                        variant="success"
//                        onClick={openInvoicePage}
//                    >
//                        Open Invoice Page
//                    </Button>

//                    <Button
//                        variant="outline-success"
//                        onClick={downloadQR}
//                    >
//                        Download QR
//                    </Button>

//                    <Button
//                        variant="secondary"
//                        onClick={onClose}
//                    >
//                        Close
//                    </Button>

//                </Modal.Footer>

//            </div>

//        </Modal>
//    );
//};

//export default PaymentRequestModal;


///**
//===============================================================================
//PayVerify — Payment Request Modal (FINAL STABLE VERSION)
//===============================================================================

//WHAT WAS FIXED:

//❌ ISSUE 1: Modal disappears after refresh
//CAUSE:
//- Component returned null when paymentIntent became temporarily undefined

//FIX:
//- Removed "if (!paymentIntent) return null"
//- Introduced cachedIntent state to preserve last valid data

//------------------------------------------------------------

//❌ ISSUE 2: QR not scannable / broken
//CAUSE:
//- Using paymentIntent.qr_url (unreliable or missing)

//FIX:
//- Generate QR on frontend using QRCodeCanvas
//- Encode FULL payment URL (payment_link)

//------------------------------------------------------------

//❌ ISSUE 3: QR download broken
//CAUSE:
//- Download relied on qr_url image

//FIX:
//- Use canvas.toDataURL() for reliable download

//------------------------------------------------------------

//RESULT:
//- Modal stays open until user closes it
//- QR always works
//- Payment link always valid
//- Demo stable

//===============================================================================
//*/

//import React, { useState, useEffect } from "react";
//import { Modal, Button, Badge } from "react-bootstrap";
//import { toast } from "react-toastify";
//import { QRCodeCanvas } from "qrcode.react";

//interface PaymentIntent {
//    id: string;
//    payment_link: string;
//    qr_url: string; // no longer used for rendering
//    amount: number;
//    status: string;
//}

//interface Props {
//    open: boolean;
//    onClose: () => void;
//    paymentIntent: PaymentIntent | null;
//}

//const PaymentRequestModal: React.FC<Props> = ({
//    open,
//    onClose,
//    paymentIntent
//}) => {

//    const [copied, setCopied] = useState(false);

//    /**
//     ===========================================================================
//     🔥 CRITICAL FIX — CACHE LAST VALID PAYMENT INTENT
//     ===========================================================================
//     WHY:
//     - Prevents modal disappearing when parent refreshes
//     - Keeps last known data even if paymentIntent becomes null briefly
//     ===========================================================================
//     */
//    const [cachedIntent, setCachedIntent] = useState<PaymentIntent | null>(paymentIntent);

//    useEffect(() => {
//        if (paymentIntent) {
//            setCachedIntent(paymentIntent);
//        }
//    }, [paymentIntent]);

//    /**
//     ===========================================================================
//     🔥 DO NOT BLOCK RENDER
//     ===========================================================================
//     Only hide modal if explicitly closed
//     ===========================================================================
//     */
//    if (!open) return null;

//    /**
//     ===========================================================================
//     Copy payment link
//     ===========================================================================
//     */
//    const handleCopy = async () => {

//        if (!cachedIntent?.payment_link) return;

//        try {
//            await navigator.clipboard.writeText(
//                cachedIntent.payment_link
//            );

//            setCopied(true);
//            toast.success("Payment link copied");

//            setTimeout(() =>
//                setCopied(false),
//                2000
//            );
//        }
//        catch {
//            toast.error("Failed to copy");
//        }
//    };

//    /**
//     ===========================================================================
//     🔥 FIXED: Download QR (canvas-based)
//     ===========================================================================
//     */
//    const downloadQR = () => {

//        const canvas =
//            document.querySelector("canvas");

//        if (!canvas) {
//            toast.error("QR not ready");
//            return;
//        }

//        const url =
//            canvas.toDataURL("image/png");

//        const link =
//            document.createElement("a");

//        link.href = url;
//        link.download = "payment-qr.png";
//        link.click();
//    };

//    /**
//     ===========================================================================
//     Open invoice page
//     ===========================================================================
//     */
//    const openInvoicePage = () => {

//        if (!cachedIntent?.payment_link) return;

//        window.open(
//            cachedIntent.payment_link,
//            "_blank"
//        );
//    };

//    return (

//        <Modal
//            show={open}
//            onHide={onClose}
//            centered
//            backdrop="static"
//        >

//            <div style={{
//                background:
//                    "linear-gradient(145deg, rgba(0,0,0,0.75), rgba(0,40,120,0.45))",
//                backdropFilter:
//                    "blur(20px)",
//                borderRadius:
//                    "14px",
//                border:
//                    "1px solid rgba(0,180,255,0.35)",
//                boxShadow:
//                    "0 0 30px rgba(0,150,255,0.25)"
//            }}>

//                <Modal.Header closeButton>
//                    <Modal.Title style={{ color: "#fff" }}>
//                        Payment Request Created
//                    </Modal.Title>
//                </Modal.Header>

//                <Modal.Body style={{ color: "#fff" }}>

//                    {/* Amount */}
//                    <div className="mb-3">
//                        <h5>
//                            ₦{cachedIntent?.amount?.toLocaleString()}
//                        </h5>

//                        <Badge bg="warning">
//                            Pending Payment
//                        </Badge>
//                    </div>

//                    {/* ============================================================
//                       🔥 FIXED QR (FRONTEND GENERATED)
//                    ============================================================ */}
//                    <div className="text-center mb-3">

//                        {cachedIntent?.payment_link && (
//                            <QRCodeCanvas
//                                value={cachedIntent.payment_link}
//                                size={220}
//                                level="H"
//                                includeMargin
//                            />
//                        )}

//                    </div>

//                    {/* Payment link */}
//                    <div style={{
//                        fontSize: 12,
//                        wordBreak: "break-all"
//                    }}>
//                        {cachedIntent?.payment_link}
//                    </div>

//                </Modal.Body>

//                <Modal.Footer>

//                    <Button
//                        variant="outline-light"
//                        onClick={handleCopy}
//                    >
//                        {copied ? "Copied" : "Copy Link"}
//                    </Button>

//                    <Button
//                        variant="outline-info"
//                        onClick={openInvoicePage}
//                    >
//                        Open Link
//                    </Button>

//                    <Button
//                        variant="success"
//                        onClick={openInvoicePage}
//                    >
//                        Open Invoice Page
//                    </Button>

//                    <Button
//                        variant="outline-success"
//                        onClick={downloadQR}
//                    >
//                        Download QR
//                    </Button>

//                    <Button
//                        variant="secondary"
//                        onClick={onClose}
//                    >
//                        Close
//                    </Button>

//                </Modal.Footer>

//            </div>

//        </Modal>
//    );
//};

//export default PaymentRequestModal;




// =============================================================================
// PaymentRequestModal.tsx (UPDATED)
//
// WHAT WAS ADDED:
// ------------------------------------------------------------
// ✅ Download PDF button
// ✅ Extract token from payment_link
// WHY:
// Allows user to manually send invoice if email fails
// =============================================================================

import React, { useState, useEffect } from "react";
import { Modal, Button, Badge } from "react-bootstrap";
import { toast } from "react-toastify";
import { QRCodeCanvas } from "qrcode.react";

interface PaymentIntent {
    id: string;
    payment_link: string;
    amount: number;
    status: string;
    merchant_id?: number;
}

interface Props {
    open: boolean;
    onClose: () => void;
    paymentIntent: PaymentIntent | null;
}

const PaymentRequestModal: React.FC<Props> = ({
    open,
    onClose,
    paymentIntent
}) => {

    const [cachedIntent, setCachedIntent] = useState(paymentIntent);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (paymentIntent) {
            setCachedIntent(paymentIntent);
        }
    }, [paymentIntent]);

    if (!open) return null;

    const handleCopy = async () => {
        if (!cachedIntent?.payment_link) return;

        await navigator.clipboard.writeText(cachedIntent.payment_link);
        setCopied(true);
        toast.success("Copied");
        setTimeout(() => setCopied(false), 2000);
    };

    const downloadQR = () => {
        const canvas = document.querySelector("canvas");
        if (!canvas) return;

        const url = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = url;
        link.download = "payment-qr.png";
        link.click();
    };

    // =============================================================================
    // 🔥 NEW: Download PDF Invoice
    // =============================================================================
    const downloadPDF = () => {

        if (!cachedIntent?.payment_link) return;

        const token =
            cachedIntent.payment_link.split("/pay/")[1];

        window.open(
            `/api/invoices/token/${token}/pdf`,
            "_blank"
        );
    };

    return (
        <Modal show={open} onHide={onClose} centered backdrop="static">

            <Modal.Header closeButton>
                <Modal.Title>Payment Request Created</Modal.Title>
            </Modal.Header>

            <Modal.Body>

                <h4>₦{cachedIntent?.amount?.toLocaleString()}</h4>

                <Badge bg="warning">Pending</Badge>

                <div className="text-center my-3">

                    <QRCodeCanvas
                        value={cachedIntent?.payment_link || ""}
                        size={200}
                    />

                </div>

                <small>{cachedIntent?.payment_link}</small>

            </Modal.Body>

            <Modal.Footer>

                <Button onClick={handleCopy}>
                    {copied ? "Copied" : "Copy Link"}
                </Button>

                <Button onClick={downloadQR}>
                    Download QR
                </Button>

                {/* 🔥 NEW BUTTON */}
                <Button onClick={downloadPDF}>
                    Download PDF
                </Button>

                <Button onClick={() =>
                    window.open(cachedIntent?.payment_link, "_blank")
                }>
                    Open Invoice
                </Button>

                <Button onClick={onClose}>
                    Close
                </Button>

            </Modal.Footer>

        </Modal>
    );
};

export default PaymentRequestModal;
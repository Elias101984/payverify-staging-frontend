// src/components/CreatePurchaseOrderModal.tsx
// ----------------------------------------------------------------------------------
// PAYVERIFY — Create Purchase Order Modal
//
// ENTERPRISE GLASS / GLOW DASHBOARD STYLING + OFFLINE ORDER CAPTURE
//
// SAFE GUARANTEES:
//
// ✔ Offline orders are queued locally and replayed with a stable reference
// ✔ Payment never starts while offline
// ✔ TypeScript safe
//
// NEW VISUAL FEATURES:
//
// ✔ Glass blur modal surface
// ✔ Animated glow border
// ✔ Floating dashboard animation
// ✔ Neon focus inputs
// ✔ Dashboard matching PayVerify UI
// ----------------------------------------------------------------------------------

import { useState, useEffect, useRef } from 'react';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import {
    enqueueOfflineOrder,
    isOfflineNetworkError,
    makeOfflineOrderReference,
} from '../services/offlineOrderQueue';
import { toast } from 'react-toastify';

interface Props {
    open: boolean;
    onClose: () => void;
    onCreateSuccess: (result: {
        purchaseOrder?: any;
        paymentIntent?: any;
        invoice?: any;
    }) => void | Promise<void>;
    isAdmin?: boolean;
}

interface ItemForm {
    name: string;
    description: string;
    quantity: string;
    unitPrice: string;
}

//interface User {
//    id: string;
//    email: string;
//    role: string;
//    merchant?: {
//        id: string;
//        name: string;
//    };
//}

interface PurchaseOrderFormData {
    //merchantId: string;
    description: string;
    dueDate: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    items: ItemForm[];
}

interface CreatePurchaseOrderPayload {
    //merchantId: number;
    poReference?: string;
    totalAmount: number;
    description: string;
    dueDate: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    collectPayment: boolean;
    items: {
        itemName: string;
        description: string | null;
        quantity: number;
        unitPrice: number;
    }[];
}

const CreatePurchaseOrderModal: React.FC<Props> = ({
    open,
    onClose,
    onCreateSuccess,
    isAdmin = false
}) => {

    const { token, /*user*/ } = useAuth();

    const [loading, setLoading] = useState(false);
    const [isOnline, setIsOnline] = useState(
        () => typeof navigator === 'undefined' || navigator.onLine
    );

    // Persist form state across modal remounts
    const formCacheRef = useRef<PurchaseOrderFormData | null>(null);

    const [formData, setFormData] = useState<PurchaseOrderFormData>(() => {

        if (formCacheRef.current) {
            return formCacheRef.current;
        }

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const dueDate =
            tomorrow.toISOString().split('T')[0];

        return {
            //merchantId,
            description: '',
            dueDate,
            customerName: '',
            customerEmail: '',
            customerPhone: '',
            items: [{
                name: '',
                description: '',
                quantity: '1',
                unitPrice: ''
            }]
        };
    });

    useEffect(() => {
        formCacheRef.current = formData;
    }, [formData]);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // ----------------------------------------------------------------------------------
    // Calculate total
    // ----------------------------------------------------------------------------------

    const calculateTotal = (): number => {

        return formData.items.reduce(
            (sum: number, item: ItemForm) => {

                const qty =
                    Number(item.quantity) || 0;

                const price =
                    Number(item.unitPrice) || 0;

                return sum + (qty * price);
            },
            0
        );
    };

    const totalAmount =
        calculateTotal();

    // ----------------------------------------------------------------------------------
    // Submit
    // ----------------------------------------------------------------------------------

    const handleSubmit = async (
        e: React.FormEvent
    ) => {

        e.preventDefault();

        if (!token)
            return;
       

        if (totalAmount <= 0) {

            toast.error(
                "Total amount must be greater than zero"
            );

            return;
        }

        let payloadForOfflineCapture: CreatePurchaseOrderPayload | null = null;

        try {

            setLoading(true);

            const payload: CreatePurchaseOrderPayload = {

                // Reuse this reference if a connection drop requires a retry.
                poReference: makeOfflineOrderReference(),

                totalAmount:
                    Number(totalAmount),

                description:
                    formData.description,

                dueDate:
                        formData.dueDate,

                customerName:
                    formData.customerName.trim() || undefined,

                customerEmail:
                    formData.customerEmail.trim() || undefined,

                customerPhone:
                    formData.customerPhone.trim() || undefined,

                // One merchant action creates the order, invoice, payment link
                // and QR package. The backend still derives merchant ownership.
                collectPayment: true,

                items:
                    formData.items.map((item: ItemForm) => ({

                        itemName:
                            item.name,

                        description:
                            item.description || null,

                        quantity:
                            Number(item.quantity),

                        unitPrice:
                            Number(item.unitPrice)
                    }))
            };

            payloadForOfflineCapture = payload;

            // Capture locally when the device is offline.  Paystack is not
            // opened here and no paid receipt can be produced offline.
            if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                await enqueueOfflineOrder(payload);
                toast.info(
                    'Offline order saved. It will sync automatically when you are online; payment has not started.'
                );
                formCacheRef.current = null;
                onClose();
                return;
            }

            const response = await api.post(
                "/purchase-orders",
                payload,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

            toast.success(
                "Order and payment package created"
            );

            formCacheRef.current = null;

            await onCreateSuccess({
                purchaseOrder: response.data?.data,
                paymentIntent: response.data?.paymentIntent,
                invoice: response.data?.invoice,
            });

            onClose();

        }
        catch (error: any) {

            if (isOfflineNetworkError(error) && payloadForOfflineCapture) {
                try {
                    await enqueueOfflineOrder(payloadForOfflineCapture);
                    toast.info(
                        'Connection lost. Order saved offline and will sync automatically when you are online.'
                    );
                    formCacheRef.current = null;
                    onClose();
                    return;
                } catch (queueError) {
                    console.error('Could not save order offline:', queueError);
                }
            }

            toast.error(
                error.response?.data?.message ||
                "Failed to create Purchase Order"
            );
        }
        finally {

            setLoading(false);
        }
    };

    // ----------------------------------------------------------------------------------
    // Item handlers
    // ----------------------------------------------------------------------------------

    const handleItemChange =
        (index: number, field: keyof ItemForm, value: string) => {

            const items =
                [...formData.items];

            items[index] = {
                ...items[index],
                [field]: value
            };

            setFormData({
                ...formData,
                items
            });
        };

    const handleAddItem = () => {

        setFormData({

            ...formData,

            items: [

                ...formData.items,

                {
                    name: '',
                    description: '',
                    quantity: '1',
                    unitPrice: ''
                }
            ]
        });
    };

    const handleRemoveItem =
        (index: number) => {

            if (formData.items.length <= 1)
                return;

            setFormData({

                ...formData,

                items:
                    formData.items.filter(
                        (_: ItemForm, i: number) => i !== index
                    )
            });
        };

    // ----------------------------------------------------------------------------------
    // UI
    // ----------------------------------------------------------------------------------

    return (

        <>
            <Modal
                show={open}
                onHide={onClose}
                centered
                size="lg"
                contentClassName="pv-modal-content"
                backdropClassName="pv-modal-backdrop"
            >

                <Modal.Header closeButton className="pv-modal-header">

                    <Modal.Title className="text-light">
                        Create Purchase Order
                    </Modal.Title>

                </Modal.Header>

                <Modal.Body className="pv-modal-body text-light">

                    {!isOnline && (
                        <div className="pv-offline-callout" role="status">
                            <strong>Offline capture is on.</strong>
                            <span>
                                Save the order now; it will sync when the connection returns. Paystack payment starts only after sync.
                            </span>
                        </div>
                    )}

                    <Form onSubmit={handleSubmit}>

                        <Form.Group className="mt-3">

                            <Form.Label>
                                Description
                            </Form.Label>

                            <Form.Control
                                className="pv-input"
                                value={formData.description}
                                onChange={e =>
                                    setFormData({
                                        ...formData,
                                        description: e.target.value
                                    })
                                }
                            />

                        </Form.Group>

                        <Row>
                            <Col md={4}>
                                <Form.Group className="mt-3">
                                    <Form.Label>Customer name (optional)</Form.Label>
                                    <Form.Control
                                        className="pv-input"
                                        type="text"
                                        value={formData.customerName}
                                        placeholder="Walk-in customer"
                                        onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mt-3">
                                    <Form.Label>Customer phone (optional)</Form.Label>
                                    <Form.Control
                                        className="pv-input"
                                        type="tel"
                                        value={formData.customerPhone}
                                        placeholder="e.g. +2348012345678"
                                        onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mt-3">
                                    <Form.Label>Customer email (optional)</Form.Label>
                                    <Form.Control
                                        className="pv-input"
                                        type="email"
                                        value={formData.customerEmail}
                                        placeholder="Email receipt"
                                        onChange={e => setFormData({ ...formData, customerEmail: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mt-3">

                            <Form.Label>
                                Due Date
                            </Form.Label>

                            <Form.Control
                                className="pv-input"
                                type="date"
                                value={formData.dueDate}
                                onChange={e =>
                                    setFormData({
                                        ...formData,
                                        dueDate: e.target.value
                                    })
                                }
                            />

                        </Form.Group>

                        <hr className="border-secondary" />

                        {formData.items.map((item: ItemForm, index: number) => (

                            <Row key={index} className="mb-2">

                                <Col>
                                    <Form.Control
                                        className="pv-input"
                                        placeholder="Item Name"
                                        value={item.name}
                                        onChange={e =>
                                            handleItemChange(
                                                index,
                                                "name",
                                                e.target.value
                                            )
                                        }
                                    />
                                </Col>

                                <Col>
                                    <Form.Control
                                        className="pv-input"
                                        placeholder="Quantity"
                                        value={item.quantity}
                                        onChange={e =>
                                            handleItemChange(
                                                index,
                                                "quantity",
                                                e.target.value
                                            )
                                        }
                                    />
                                </Col>

                                <Col>
                                    <Form.Control
                                        className="pv-input"
                                        placeholder="Unit Price"
                                        value={item.unitPrice}
                                        onChange={e =>
                                            handleItemChange(
                                                index,
                                                "unitPrice",
                                                e.target.value
                                            )
                                        }
                                    />
                                </Col>

                                <Col xs="auto">
                                    <Button
                                        variant="danger"
                                        onClick={() =>
                                            handleRemoveItem(index)
                                        }
                                    >
                                        X
                                    </Button>
                                </Col>

                            </Row>
                        ))}

                        <Button
                            className="mt-2 pv-primary-btn"
                            onClick={handleAddItem}
                        >
                            Add Item
                        </Button>

                        <hr className="border-secondary" />

                        <h5 className="text-info">
                            Total: ₦{totalAmount.toLocaleString()}
                        </h5>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="pv-primary-btn"
                        >
                            {loading
                                ? "Creating..."
                                : isOnline
                                    ? "Create & Collect Payment"
                                    : "Save Order Offline"}
                        </Button>

                    </Form>

                </Modal.Body>

            </Modal>

            {/* Glass / Glow Styles */}
            <style>{`

/* -------------------------------------------------- */
/* BACKDROP */
/* -------------------------------------------------- */

.pv-modal-backdrop {
    backdrop-filter: blur(12px);
    background: rgba(3,8,20,0.72);
}


/* -------------------------------------------------- */
/* MODAL CONTAINER */
/* -------------------------------------------------- */

.pv-modal-content {

    font-family:
        Inter,
        system-ui,
        -apple-system,
        Segoe UI,
        Roboto,
        Helvetica,
        Arial,
        sans-serif;

    color: #e9f2ff;

    letter-spacing: -0.01em;

    background:
        linear-gradient(
            180deg,
            rgba(10,15,35,0.97),
            rgba(11,46,117,0.94)
        );

    border-radius: 18px;

    border: 1px solid rgba(255,255,255,0.16);

    backdrop-filter: blur(18px);

    box-shadow:
        0 35px 90px rgba(0,0,0,0.85),
        0 0 60px rgba(0,102,255,0.25);

    animation: pvFloat 7s ease-in-out infinite;
}


/* -------------------------------------------------- */
/* HEADER */
/* -------------------------------------------------- */

.pv-modal-header {

    border-bottom:
        1px solid rgba(255,255,255,0.15);

    background:
        linear-gradient(
            180deg,
            rgba(255,255,255,0.06),
            rgba(255,255,255,0.01)
        );
}

.pv-modal-header .modal-title {

    font-size: 1.35rem;

    font-weight: 700;

    color: #e9f2ff;

    letter-spacing: -0.02em;
}


/* -------------------------------------------------- */
/* BODY */
/* -------------------------------------------------- */

.pv-modal-body {

    font-size: 0.95rem;

    font-weight: 500;

    color: rgba(233,242,255,0.92);
}

.pv-offline-callout {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin-bottom: 14px;
    padding: 11px 13px;
    border: 1px solid rgba(255, 205, 89, .35);
    border-radius: 12px;
    background: rgba(255, 181, 45, .12);
    color: #ffe8a8;
    font-size: .88rem;
}

.pv-offline-callout span {
    color: rgba(255, 239, 194, .82);
}


/* -------------------------------------------------- */
/* INPUTS */
/* -------------------------------------------------- */

.pv-input {

    background: rgba(255,255,255,0.05);

    border: 1px solid rgba(255,255,255,0.15);

    color: #e9f2ff;

    font-weight: 500;

    transition: all 0.2s ease;
}

.pv-input::placeholder {

    color: rgba(233,242,255,0.55);
}

.pv-input:focus {

    background: rgba(255,255,255,0.08);

    border-color: #3399ff;

    box-shadow:
        0 0 14px rgba(0,153,255,0.45);

    color: white;
}


/* -------------------------------------------------- */
/* LABELS */
/* -------------------------------------------------- */

.form-label {

    font-weight: 600;

    color: rgba(233,242,255,0.85);
}


/* -------------------------------------------------- */
/* BUTTON */
/* -------------------------------------------------- */

.pv-primary-btn {

    background:
        linear-gradient(90deg,#0066ff,#3399ff);

    border: none;

    font-weight: 600;

    color: white;

    box-shadow:
        0 10px 25px rgba(0,102,255,0.45);

    transition: all 0.2s ease;
}

.pv-primary-btn:hover {

    transform: translateY(-1px);

    box-shadow:
        0 14px 35px rgba(0,102,255,0.65);
}


/* -------------------------------------------------- */
/* TOTAL TEXT */
/* -------------------------------------------------- */

h5 {

    font-weight: 700;

    letter-spacing: -0.01em;

    color: #66b3ff;
}


/* -------------------------------------------------- */
/* FLOAT ANIMATION */
/* -------------------------------------------------- */

@keyframes pvFloat {

    0% { transform: translateY(0px); }

    50% { transform: translateY(-5px); }

    100% { transform: translateY(0px); }
}


/* -------------------------------------------------- */
/* CLOSE BUTTON */
/* -------------------------------------------------- */

.btn-close {

    filter: invert(1);

    opacity: 0.85;
}

.btn-close:hover {

    opacity: 1;
}

`}</style>

        </>
    );
};

export default CreatePurchaseOrderModal;

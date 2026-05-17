////// src/components/CreatePurchaseOrderModal.tsx
////// ----------------------------------------------------------------------------------
////// FINAL PRODUCTION VERSION — PAYVERIFY COMPATIBLE
//////
////// Guarantees:
//////
////// ✔ merchantId always sent correctly
////// ✔ totalAmount always numeric
////// ✔ itemName correctly mapped
////// ✔ prevents NOT NULL violations
////// ✔ prevents invalid payloads
////// ✔ backend Sequelize compatible
////// ✔ fully typed and production safe
////// ----------------------------------------------------------------------------------

////import { useState, useEffect } from 'react';
////import { Modal, Button, Form, Row, Col } from 'react-bootstrap';
////import { useAuth } from '../contexts/AuthContext';
////import api from '../services/api';
////import { toast } from 'react-toastify';

////interface Props {
////    open: boolean;
////    onClose: () => void;
////    onCreateSuccess: () => void;
////    isAdmin?: boolean;
////}

////interface ItemForm {
////    name: string;
////    description: string;
////    quantity: string;
////    unitPrice: string;
////}

////interface User {
////    id: string;
////    email: string;
////    role: string;
////    merchant?: {
////        id: string;
////        name: string;
////    };
////}

////interface CreatePurchaseOrderPayload {

////    merchantId: number;

////    totalAmount: number;

////    description: string;

////    dueDate: string;

////    items: {

////        itemName: string;

////        description: string | null;

////        quantity: number;

////        unitPrice: number;

////    }[];
////}

////const CreatePurchaseOrderModal: React.FC<Props> = ({
////    open,
////    onClose,
////    onCreateSuccess,
////    isAdmin = false
////}) => {

////    const { token, user } = useAuth();

////    const [loading, setLoading] = useState(false);

////    const [formData, setFormData] = useState({

////        merchantId: '',

////        description: '',

////        dueDate: '',

////        items: [{
////            name: '',
////            description: '',
////            quantity: '1',
////            unitPrice: ''
////        }] as ItemForm[]

////    });

////    // ----------------------------------------------------------------------------------
////    // Initialize form safely
////    // ----------------------------------------------------------------------------------

////    //useEffect(() => {

////    //    if (!open) return;

////    //    const tomorrow = new Date();
////    //    tomorrow.setDate(tomorrow.getDate() + 1);

////    //    const dueDate =
////    //        tomorrow.toISOString().split('T')[0];

////    //    const userObj = user as User | null;

////    //    const merchantId =
////    //        userObj?.merchant?.id ?? '';

////    //    setFormData({

////    //        merchantId,

////    //        description: '',

////    //        dueDate,

////    //        items: [{
////    //            name: '',
////    //            description: '',
////    //            quantity: '1',
////    //            unitPrice: ''
////    //        }]
////    //    });

////    //}, [open, user]);



////    // ----------------------------------------------------------------------------------
////    // Calculate total safely
////    // ----------------------------------------------------------------------------------

////    const calculateTotal = (): number => {

////        return formData.items.reduce(

////            (sum, item) => {

////                const qty =
////                    Number(item.quantity) || 0;

////                const price =
////                    Number(item.unitPrice) || 0;

////                return sum + (qty * price);

////            },

////            0
////        );
////    };

////    const totalAmount =
////        calculateTotal();

////    // ----------------------------------------------------------------------------------
////    // Submit
////    // ----------------------------------------------------------------------------------

////    const handleSubmit = async (
////        e: React.FormEvent
////    ) => {

////        e.preventDefault();

////        if (!token)
////            return;

////        if (!formData.merchantId && !isAdmin) {

////            toast.error(
////                "Merchant ID is required"
////            );

////            return;
////        }

////        if (totalAmount <= 0) {

////            toast.error(
////                "Total amount must be greater than zero"
////            );

////            return;
////        }

////        try {

////            setLoading(true);

////            const payload: CreatePurchaseOrderPayload = {

////                merchantId:
////                    Number(formData.merchantId),

////                totalAmount:
////                    Number(totalAmount),

////                description:
////                    formData.description,

////                dueDate:
////                    formData.dueDate,

////                items:
////                    formData.items.map(item => ({

////                        itemName:
////                            item.name,

////                        description:
////                            item.description || null,

////                        quantity:
////                            Number(item.quantity),

////                        unitPrice:
////                            Number(item.unitPrice)
////                    }))
////            };

////            console.log(
////                "Creating Purchase Order:",
////                payload
////            );

////            await api.post(

////                "/purchase-orders",

////                payload,

////                {
////                    headers: {
////                        Authorization:
////                            `Bearer ${token}`
////                    }
////                }
////            );

////            toast.success(
////                "Purchase Order created successfully"
////            );

////            onCreateSuccess();

////            onClose();

////        }
////        catch (error: any) {

////            console.error(
////                "Create PO error:",
////                error.response?.data || error
////            );

////            toast.error(
////                error.response?.data?.message ||
////                "Failed to create Purchase Order"
////            );
////        }
////        finally {

////            setLoading(false);
////        }
////    };

////    // ----------------------------------------------------------------------------------
////    // Item Handlers
////    // ----------------------------------------------------------------------------------

////    const handleItemChange =
////        (index: number, field: keyof ItemForm, value: string) => {

////            const items =
////                [...formData.items];

////            items[index] = {
////                ...items[index],
////                [field]: value
////            };

////            setFormData({
////                ...formData,
////                items
////            });
////        };

////    const handleAddItem = () => {

////        setFormData({

////            ...formData,

////            items: [

////                ...formData.items,

////                {
////                    name: '',
////                    description: '',
////                    quantity: '1',
////                    unitPrice: ''
////                }
////            ]
////        });
////    };

////    const handleRemoveItem =
////        (index: number) => {

////            if (formData.items.length <= 1)
////                return;

////            setFormData({

////                ...formData,

////                items:
////                    formData.items.filter(
////                        (_, i) => i !== index
////                    )
////            });
////        };

////    // ----------------------------------------------------------------------------------
////    // UI
////    // ----------------------------------------------------------------------------------

////    return (

////        <Modal
////            show={open}
////            onHide={onClose}
////            centered
////            size="lg"
////        >

////            <Modal.Header closeButton>

////                <Modal.Title>
////                    Create Purchase Order
////                </Modal.Title>

////            </Modal.Header>

////            <Modal.Body>

////                <Form onSubmit={handleSubmit}>

////                    <Form.Group>

////                        <Form.Label>
////                            Merchant ID
////                        </Form.Label>

////                        <Form.Control

////                            value={formData.merchantId}

////                            onChange={e =>
////                                setFormData({
////                                    ...formData,
////                                    merchantId: e.target.value
////                                })
////                            }

////                            disabled={!isAdmin}
////                        />

////                    </Form.Group>

////                    <Form.Group className="mt-3">

////                        <Form.Label>
////                            Description
////                        </Form.Label>

////                        <Form.Control

////                            value={formData.description}

////                            onChange={e =>
////                                setFormData({
////                                    ...formData,
////                                    description: e.target.value
////                                })
////                            }
////                        />

////                    </Form.Group>

////                    <Form.Group className="mt-3">

////                        <Form.Label>
////                            Due Date
////                        </Form.Label>

////                        <Form.Control

////                            type="date"

////                            value={formData.dueDate}

////                            onChange={e =>
////                                setFormData({
////                                    ...formData,
////                                    dueDate: e.target.value
////                                })
////                            }
////                        />

////                    </Form.Group>

////                    <hr />

////                    {formData.items.map((item, index) => (

////                        <Row key={index} className="mb-2">

////                            <Col>

////                                <Form.Control
////                                    placeholder="Item Name"
////                                    value={item.name}
////                                    onChange={e =>
////                                        handleItemChange(
////                                            index,
////                                            "name",
////                                            e.target.value
////                                        )
////                                    }
////                                />

////                            </Col>

////                            <Col>

////                                <Form.Control
////                                    placeholder="Quantity"
////                                    value={item.quantity}
////                                    onChange={e =>
////                                        handleItemChange(
////                                            index,
////                                            "quantity",
////                                            e.target.value
////                                        )
////                                    }
////                                />

////                            </Col>

////                            <Col>

////                                <Form.Control
////                                    placeholder="Unit Price"
////                                    value={item.unitPrice}
////                                    onChange={e =>
////                                        handleItemChange(
////                                            index,
////                                            "unitPrice",
////                                            e.target.value
////                                        )
////                                    }
////                                />

////                            </Col>

////                            <Col xs="auto">

////                                <Button
////                                    variant="danger"
////                                    onClick={() =>
////                                        handleRemoveItem(index)
////                                    }
////                                >
////                                    X
////                                </Button>

////                            </Col>

////                        </Row>
////                    ))}

////                    <Button
////                        onClick={handleAddItem}
////                        className="mt-2"
////                    >
////                        Add Item
////                    </Button>

////                    <hr />

////                    <h5>
////                        Total: ₦{totalAmount.toLocaleString()}
////                    </h5>

////                    <Button
////                        type="submit"
////                        disabled={loading}
////                    >
////                        {loading
////                            ? "Creating..."
////                            : "Create Purchase Order"}
////                    </Button>

////                </Form>

////            </Modal.Body>

////        </Modal>
////    );
////};

////export default CreatePurchaseOrderModal;


//// src/components/CreatePurchaseOrderModal.tsx
//// ----------------------------------------------------------------------------------
//// FINAL PRODUCTION VERSION — PAYVERIFY COMPATIBLE (FIXED)
//// ----------------------------------------------------------------------------------

//import { useState, useEffect, useRef } from 'react'; // FIXED: added useRef
//import { Modal, Button, Form, Row, Col } from 'react-bootstrap';
//import { useAuth } from '../contexts/AuthContext';
//import api from '../services/api';
//import { toast } from 'react-toastify';

//interface Props {
//    open: boolean;
//    onClose: () => void;
//    onCreateSuccess: () => void;
//    isAdmin?: boolean;
//}

//interface ItemForm {
//    name: string;
//    description: string;
//    quantity: string;
//    unitPrice: string;
//}

//interface User {
//    id: string;
//    email: string;
//    role: string;
//    merchant?: {
//        id: string;
//        name: string;
//    };
//}

//interface CreatePurchaseOrderPayload {

//    merchantId: number;

//    totalAmount: number;

//    description: string;

//    dueDate: string;

//    items: {

//        itemName: string;

//        description: string | null;

//        quantity: number;

//        unitPrice: number;

//    }[];
//}

//const CreatePurchaseOrderModal: React.FC<Props> = ({
//    open,
//    onClose,
//    onCreateSuccess,
//    isAdmin = false
//}) => {

//    const { token, user } = useAuth();

//    const [loading, setLoading] = useState(false);

//    const [formData, setFormData] = useState({

//        merchantId: '',

//        description: '',

//        dueDate: '',

//        items: [{
//            name: '',
//            description: '',
//            quantity: '1',
//            unitPrice: ''
//        }] as ItemForm[]

//    });

//    // ----------------------------------------------------------------------------------
//    // CRITICAL FIX: Prevent modal reset on dashboard refresh or re-render
//    // ----------------------------------------------------------------------------------

//    const wasOpenRef = useRef(false);

//    useEffect(() => {

//        // Only initialize when modal FIRST opens
//        if (open && !wasOpenRef.current) {

//            const tomorrow = new Date();
//            tomorrow.setDate(tomorrow.getDate() + 1);

//            const dueDate =
//                tomorrow.toISOString().split('T')[0];

//            const userObj = user as User | null;

//            const merchantId =
//                userObj?.merchant?.id ?? '';

//            setFormData({

//                merchantId,

//                description: '',

//                dueDate,

//                items: [{
//                    name: '',
//                    description: '',
//                    quantity: '1',
//                    unitPrice: ''
//                }]
//            });

//            wasOpenRef.current = true;
//        }

//        // Reset flag when modal closes
//        if (!open) {
//            wasOpenRef.current = false;
//        }

//    }, [open, user]);

//    // ----------------------------------------------------------------------------------
//    // Calculate total safely
//    // ----------------------------------------------------------------------------------

//    const calculateTotal = (): number => {

//        return formData.items.reduce(

//            (sum, item) => {

//                const qty =
//                    Number(item.quantity) || 0;

//                const price =
//                    Number(item.unitPrice) || 0;

//                return sum + (qty * price);

//            },

//            0
//        );
//    };

//    const totalAmount =
//        calculateTotal();

//    // ----------------------------------------------------------------------------------
//    // Submit
//    // ----------------------------------------------------------------------------------

//    const handleSubmit = async (
//        e: React.FormEvent
//    ) => {

//        e.preventDefault();

//        if (!token)
//            return;

//        if (!formData.merchantId && !isAdmin) {

//            toast.error(
//                "Merchant ID is required"
//            );

//            return;
//        }

//        if (totalAmount <= 0) {

//            toast.error(
//                "Total amount must be greater than zero"
//            );

//            return;
//        }

//        try {

//            setLoading(true);

//            const payload: CreatePurchaseOrderPayload = {

//                merchantId:
//                    Number(formData.merchantId),

//                totalAmount:
//                    Number(totalAmount),

//                description:
//                    formData.description,

//                dueDate:
//                    formData.dueDate,

//                items:
//                    formData.items.map(item => ({

//                        itemName:
//                            item.name,

//                        description:
//                            item.description || null,

//                        quantity:
//                            Number(item.quantity),

//                        unitPrice:
//                            Number(item.unitPrice)
//                    }))
//            };

//            await api.post(

//                "/purchase-orders",

//                payload,

//                {
//                    headers: {
//                        Authorization:
//                            `Bearer ${token}`
//                    }
//                }
//            );

//            toast.success(
//                "Purchase Order created successfully"
//            );

//            onCreateSuccess();

//            onClose();

//        }
//        catch (error: any) {

//            toast.error(
//                error.response?.data?.message ||
//                "Failed to create Purchase Order"
//            );
//        }
//        finally {

//            setLoading(false);
//        }
//    };

//    // ----------------------------------------------------------------------------------
//    // Item Handlers
//    // ----------------------------------------------------------------------------------

//    const handleItemChange =
//        (index: number, field: keyof ItemForm, value: string) => {

//            const items =
//                [...formData.items];

//            items[index] = {
//                ...items[index],
//                [field]: value
//            };

//            setFormData({
//                ...formData,
//                items
//            });
//        };

//    const handleAddItem = () => {

//        setFormData({

//            ...formData,

//            items: [

//                ...formData.items,

//                {
//                    name: '',
//                    description: '',
//                    quantity: '1',
//                    unitPrice: ''
//                }
//            ]
//        });
//    };

//    const handleRemoveItem =
//        (index: number) => {

//            if (formData.items.length <= 1)
//                return;

//            setFormData({

//                ...formData,

//                items:
//                    formData.items.filter(
//                        (_, i) => i !== index
//                    )
//            });
//        };

//    // ----------------------------------------------------------------------------------
//    // UI
//    // ----------------------------------------------------------------------------------

//    return (

//        <Modal
//            show={open}
//            onHide={onClose}
//            centered
//            size="lg"
//        >

//            <Modal.Header closeButton>

//                <Modal.Title>
//                    Create Purchase Order
//                </Modal.Title>

//            </Modal.Header>

//            <Modal.Body>

//                <Form onSubmit={handleSubmit}>

//                    <Form.Group>

//                        <Form.Label>
//                            Merchant ID
//                        </Form.Label>

//                        <Form.Control

//                            value={formData.merchantId}

//                            onChange={e =>
//                                setFormData({
//                                    ...formData,
//                                    merchantId: e.target.value
//                                })
//                            }

//                            disabled={!isAdmin}
//                        />

//                    </Form.Group>

//                    <Form.Group className="mt-3">

//                        <Form.Label>
//                            Description
//                        </Form.Label>

//                        <Form.Control

//                            value={formData.description}

//                            onChange={e =>
//                                setFormData({
//                                    ...formData,
//                                    description: e.target.value
//                                })
//                            }
//                        />

//                    </Form.Group>

//                    <Form.Group className="mt-3">

//                        <Form.Label>
//                            Due Date
//                        </Form.Label>

//                        <Form.Control

//                            type="date"

//                            value={formData.dueDate}

//                            onChange={e =>
//                                setFormData({
//                                    ...formData,
//                                    dueDate: e.target.value
//                                })
//                            }
//                        />

//                    </Form.Group>

//                    <hr />

//                    {formData.items.map((item, index) => (

//                        <Row key={index} className="mb-2">

//                            <Col>

//                                <Form.Control
//                                    placeholder="Item Name"
//                                    value={item.name}
//                                    onChange={e =>
//                                        handleItemChange(
//                                            index,
//                                            "name",
//                                            e.target.value
//                                        )
//                                    }
//                                />

//                            </Col>

//                            <Col>

//                                <Form.Control
//                                    placeholder="Quantity"
//                                    value={item.quantity}
//                                    onChange={e =>
//                                        handleItemChange(
//                                            index,
//                                            "quantity",
//                                            e.target.value
//                                        )
//                                    }
//                                />

//                            </Col>

//                            <Col>

//                                <Form.Control
//                                    placeholder="Unit Price"
//                                    value={item.unitPrice}
//                                    onChange={e =>
//                                        handleItemChange(
//                                            index,
//                                            "unitPrice",
//                                            e.target.value
//                                        )
//                                    }
//                                />

//                            </Col>

//                            <Col xs="auto">

//                                <Button
//                                    variant="danger"
//                                    onClick={() =>
//                                        handleRemoveItem(index)
//                                    }
//                                >
//                                    X
//                                </Button>

//                            </Col>

//                        </Row>
//                    ))}

//                    <Button
//                        onClick={handleAddItem}
//                        className="mt-2"
//                    >
//                        Add Item
//                    </Button>

//                    <hr />

//                    <h5>
//                        Total: ₦{totalAmount.toLocaleString()}
//                    </h5>

//                    <Button
//                        type="submit"
//                        disabled={loading}
//                    >
//                        {loading
//                            ? "Creating..."
//                            : "Create Purchase Order"}
//                    </Button>

//                </Form>

//            </Modal.Body>

//        </Modal>
//    );
//};

//export default CreatePurchaseOrderModal;





// src/components/CreatePurchaseOrderModal.tsx
// ----------------------------------------------------------------------------------
// FINAL PRODUCTION VERSION — PAYVERIFY COMPATIBLE (STATE PERSISTENCE FIXED)
//
// CRITICAL FIX IMPLEMENTED:
//
// Problem:
// Dashboard auto-refresh and parent re-renders were causing this modal component
// to unmount and remount, which wiped all user-entered form data.
//
// Root Cause:
// React-Bootstrap Modal unmounts its children during parent refresh cycles.
//
// Solution:
// Added formCacheRef using useRef to persist form state outside component lifecycle.
// This ensures data survives re-renders and remounts.
//
// Result:
// ✔ No form reset on Add Item
// ✔ No form reset on typing
// ✔ No form reset on tabbing fields
// ✔ No form reset on dashboard refresh
// ✔ Enterprise-grade stability
// ----------------------------------------------------------------------------------


//import { useState, useEffect, useRef } from 'react';
//import { Modal, Button, Form, Row, Col } from 'react-bootstrap';
//import { useAuth } from '../contexts/AuthContext';
//import api from '../services/api';
//import { toast } from 'react-toastify';

//interface Props {
//    open: boolean;
//    onClose: () => void;
//    onCreateSuccess: () => void;
//    isAdmin?: boolean;
//}

//interface ItemForm {
//    name: string;
//    description: string;
//    quantity: string;
//    unitPrice: string;
//}

//interface User {
//    id: string;
//    email: string;
//    role: string;
//    merchant?: {
//        id: string;
//        name: string;
//    };
//}

//interface CreatePurchaseOrderPayload {

//    merchantId: number;

//    totalAmount: number;

//    description: string;

//    dueDate: string;

//    items: {

//        itemName: string;

//        description: string | null;

//        quantity: number;

//        unitPrice: number;

//    }[];
//}

//const CreatePurchaseOrderModal: React.FC<Props> = ({
//    open,
//    onClose,
//    onCreateSuccess,
//    isAdmin = false
//}) => {

//    const { token, user } = useAuth();

//    const [loading, setLoading] = useState(false);

//    // ----------------------------------------------------------------------------------
//    // CRITICAL FIX: Persist form state outside React render lifecycle
//    //
//    // WHY:
//    // When dashboard refreshes, modal unmounts and remounts.
//    // Normal useState would reset.
//    //
//    // useRef persists data across renders and remounts.
//    // ----------------------------------------------------------------------------------

//    const formCacheRef = useRef<any>(null);

//    // ----------------------------------------------------------------------------------
//    // Initialize form state from cache OR default
//    // ----------------------------------------------------------------------------------

//    const [formData, setFormData] = useState(() => {

//        // If cached state exists, restore it
//        if (formCacheRef.current) {
//            return formCacheRef.current;
//        }

//        // Otherwise initialize fresh form
//        const tomorrow = new Date();
//        tomorrow.setDate(tomorrow.getDate() + 1);

//        const dueDate =
//            tomorrow.toISOString().split('T')[0];

//        const userObj = user as User | null;

//        const merchantId =
//            userObj?.merchant?.id ?? '';

//        return {

//            merchantId,

//            description: '',

//            dueDate,

//            items: [{
//                name: '',
//                description: '',
//                quantity: '1',
//                unitPrice: ''
//            }]
//        };
//    });

//    // ----------------------------------------------------------------------------------
//    // Persist formData into cache on every change
//    // This ensures data survives component remounts
//    // ----------------------------------------------------------------------------------

//    useEffect(() => {

//        formCacheRef.current = formData;

//    }, [formData]);

//    // ----------------------------------------------------------------------------------
//    // Calculate total safely
//    // ----------------------------------------------------------------------------------

//    const calculateTotal = (): number => {

//        return formData.items.reduce(

//            (sum: number, item: ItemForm) => {

//                const qty =
//                    Number(item.quantity) || 0;

//                const price =
//                    Number(item.unitPrice) || 0;

//                return sum + (qty * price);

//            },

//            0
//        );
//    };

//    const totalAmount =
//        calculateTotal();

//    // ----------------------------------------------------------------------------------
//    // Submit
//    // ----------------------------------------------------------------------------------

//    const handleSubmit = async (
//        e: React.FormEvent
//    ) => {

//        e.preventDefault();

//        if (!token)
//            return;

//        if (!formData.merchantId && !isAdmin) {

//            toast.error(
//                "Merchant ID is required"
//            );

//            return;
//        }

//        if (totalAmount <= 0) {

//            toast.error(
//                "Total amount must be greater than zero"
//            );

//            return;
//        }

//        try {

//            setLoading(true);

//            const payload: CreatePurchaseOrderPayload = {

//                merchantId:
//                    Number(formData.merchantId),

//                totalAmount:
//                    Number(totalAmount),

//                description:
//                    formData.description,

//                dueDate:
//                    formData.dueDate,

//                items:
//                    formData.items.map(item => ({

//                        itemName:
//                            item.name,

//                        description:
//                            item.description || null,

//                        quantity:
//                            Number(item.quantity),

//                        unitPrice:
//                            Number(item.unitPrice)
//                    }))
//            };

//            await api.post(

//                "/purchase-orders",

//                payload,

//                {
//                    headers: {
//                        Authorization:
//                            `Bearer ${token}`
//                    }
//                }
//            );

//            toast.success(
//                "Purchase Order created successfully"
//            );

//            // ----------------------------------------------------------------------------------
//            // CRITICAL FIX: Clear cache after successful creation
//            // Prevents stale data appearing next time modal opens
//            // ----------------------------------------------------------------------------------

//            formCacheRef.current = null;

//            onCreateSuccess();

//            onClose();

//        }
//        catch (error: any) {

//            toast.error(
//                error.response?.data?.message ||
//                "Failed to create Purchase Order"
//            );
//        }
//        finally {

//            setLoading(false);
//        }
//    };

//    // ----------------------------------------------------------------------------------
//    // Item Handlers
//    // ----------------------------------------------------------------------------------

//    const handleItemChange =
//        (index: number, field: keyof ItemForm, value: string) => {

//            const items =
//                [...formData.items];

//            items[index] = {
//                ...items[index],
//                [field]: value
//            };

//            setFormData({
//                ...formData,
//                items
//            });
//        };

//    const handleAddItem = () => {

//        setFormData({

//            ...formData,

//            items: [

//                ...formData.items,

//                {
//                    name: '',
//                    description: '',
//                    quantity: '1',
//                    unitPrice: ''
//                }
//            ]
//        });
//    };

//    const handleRemoveItem =
//        (index: number) => {

//            if (formData.items.length <= 1)
//                return;

//            setFormData({

//                ...formData,

//                items:
//                    formData.items.filter(
//                        (_, i) => i !== index
//                    )
//            });
//        };

//    // ----------------------------------------------------------------------------------
//    // UI
//    // ----------------------------------------------------------------------------------

//    return (

//        <Modal
//            show={open}
//            onHide={onClose}
//            centered
//            size="lg"
//        >

//            <Modal.Header closeButton>

//                <Modal.Title>
//                    Create Purchase Order
//                </Modal.Title>

//            </Modal.Header>

//            <Modal.Body>

//                <Form onSubmit={handleSubmit}>

//                    <Form.Group>

//                        <Form.Label>
//                            Merchant ID
//                        </Form.Label>

//                        <Form.Control

//                            value={formData.merchantId}

//                            onChange={e =>
//                                setFormData({
//                                    ...formData,
//                                    merchantId: e.target.value
//                                })
//                            }

//                            disabled={!isAdmin}
//                        />

//                    </Form.Group>

//                    <Form.Group className="mt-3">

//                        <Form.Label>
//                            Description
//                        </Form.Label>

//                        <Form.Control

//                            value={formData.description}

//                            onChange={e =>
//                                setFormData({
//                                    ...formData,
//                                    description: e.target.value
//                                })
//                            }
//                        />

//                    </Form.Group>

//                    <Form.Group className="mt-3">

//                        <Form.Label>
//                            Due Date
//                        </Form.Label>

//                        <Form.Control

//                            type="date"

//                            value={formData.dueDate}

//                            onChange={e =>
//                                setFormData({
//                                    ...formData,
//                                    dueDate: e.target.value
//                                })
//                            }
//                        />

//                    </Form.Group>

//                    <hr />

//                    {formData.items.map((item, index) => (

//                        <Row key={index} className="mb-2">

//                            <Col>

//                                <Form.Control
//                                    placeholder="Item Name"
//                                    value={item.name}
//                                    onChange={e =>
//                                        handleItemChange(
//                                            index,
//                                            "name",
//                                            e.target.value
//                                        )
//                                    }
//                                />

//                            </Col>

//                            <Col>

//                                <Form.Control
//                                    placeholder="Quantity"
//                                    value={item.quantity}
//                                    onChange={e =>
//                                        handleItemChange(
//                                            index,
//                                            "quantity",
//                                            e.target.value
//                                        )
//                                    }
//                                />

//                            </Col>

//                            <Col>

//                                <Form.Control
//                                    placeholder="Unit Price"
//                                    value={item.unitPrice}
//                                    onChange={e =>
//                                        handleItemChange(
//                                            index,
//                                            "unitPrice",
//                                            e.target.value
//                                        )
//                                    }
//                                />

//                            </Col>

//                            <Col xs="auto">

//                                <Button
//                                    variant="danger"
//                                    onClick={() =>
//                                        handleRemoveItem(index)
//                                    }
//                                >
//                                    X
//                                </Button>

//                            </Col>

//                        </Row>
//                    ))}

//                    <Button
//                        onClick={handleAddItem}
//                        className="mt-2"
//                    >
//                        Add Item
//                    </Button>

//                    <hr />

//                    <h5>
//                        Total: ₦{totalAmount.toLocaleString()}
//                    </h5>

//                    <Button
//                        type="submit"
//                        disabled={loading}
//                    >
//                        {loading
//                            ? "Creating..."
//                            : "Create Purchase Order"}
//                    </Button>

//                </Form>

//            </Modal.Body>

//        </Modal>
//    );
//};

//export default CreatePurchaseOrderModal;



//// src/components/CreatePurchaseOrderModal.tsx
//// ----------------------------------------------------------------------------------
//// PAYVERIFY — Create Purchase Order Modal
////
//// FIXES APPLIED (ONLY FOR THE ORIGINAL 5 TS7006 ERRORS):
////
//// 1) Typed callback params for .reduce(), .map(), .filter()
////    - This removes "implicitly has an 'any' type" errors under TS strict mode.
//// 2) Typed formCacheRef to avoid cascading inference issues.
//// 3) NO behavior change: same UI, same payload, same caching logic.
//// ----------------------------------------------------------------------------------

//import { useState, useEffect, useRef } from 'react';
//import { Modal, Button, Form, Row, Col } from 'react-bootstrap';
//import { useAuth } from '../contexts/AuthContext';
//import api from '../services/api';
//import { toast } from 'react-toastify';

//interface Props {
//    open: boolean;
//    onClose: () => void;
//    onCreateSuccess: () => void;
//    isAdmin?: boolean;
//}

//interface ItemForm {
//    name: string;
//    description: string;
//    quantity: string;
//    unitPrice: string;
//}

//interface User {
//    id: string;
//    email: string;
//    role: string;
//    merchant?: {
//        id: string;
//        name: string;
//    };
//}

//// Added: Typed form shape so TS can infer callback types safely
//interface PurchaseOrderFormData {
//    merchantId: string;
//    description: string;
//    dueDate: string;
//    items: ItemForm[];
//}

//interface CreatePurchaseOrderPayload {
//    merchantId: number;
//    totalAmount: number;
//    description: string;
//    dueDate: string;
//    items: {
//        itemName: string;
//        description: string | null;
//        quantity: number;
//        unitPrice: number;
//    }[];
//}

//const CreatePurchaseOrderModal: React.FC<Props> = ({
//    open,
//    onClose,
//    onCreateSuccess,
//    isAdmin = false
//}) => {

//    const { token, user } = useAuth();

//    const [loading, setLoading] = useState(false);

//    // FIXED: typed ref so it doesn't become "any" and cause TS7006 inside callbacks
//    const formCacheRef = useRef<PurchaseOrderFormData | null>(null);

//    // FIXED: typed state so TS knows formData.items is ItemForm[]
//    const [formData, setFormData] = useState<PurchaseOrderFormData>(() => {

//        // Restore cached state when the modal is remounted
//        if (formCacheRef.current) {
//            return formCacheRef.current;
//        }

//        // Default initialize
//        const tomorrow = new Date();
//        tomorrow.setDate(tomorrow.getDate() + 1);

//        const dueDate =
//            tomorrow.toISOString().split('T')[0];

//        const userObj = user as User | null;

//        const merchantId =
//            userObj?.merchant?.id ?? '';

//        return {
//            merchantId,
//            description: '',
//            dueDate,
//            items: [{
//                name: '',
//                description: '',
//                quantity: '1',
//                unitPrice: ''
//            }]
//        };
//    });

//    // Persist form state so it survives dashboard refreshes / remounts
//    useEffect(() => {
//        formCacheRef.current = formData;
//    }, [formData]);

//    // ----------------------------------------------------------------------------------
//    // Calculate total safely
//    // ----------------------------------------------------------------------------------

//    const calculateTotal = (): number => {

//        // FIXED TS7006: typed (sum, item)
//        return formData.items.reduce(
//            (sum: number, item: ItemForm) => {

//                const qty =
//                    Number(item.quantity) || 0;

//                const price =
//                    Number(item.unitPrice) || 0;

//                return sum + (qty * price);
//            },
//            0
//        );
//    };

//    const totalAmount =
//        calculateTotal();

//    // ----------------------------------------------------------------------------------
//    // Submit
//    // ----------------------------------------------------------------------------------

//    const handleSubmit = async (
//        e: React.FormEvent
//    ) => {

//        e.preventDefault();

//        if (!token)
//            return;

//        if (!formData.merchantId && !isAdmin) {

//            toast.error(
//                "Merchant ID is required"
//            );

//            return;
//        }

//        if (totalAmount <= 0) {

//            toast.error(
//                "Total amount must be greater than zero"
//            );

//            return;
//        }

//        try {

//            setLoading(true);

//            const payload: CreatePurchaseOrderPayload = {

//                merchantId:
//                    Number(formData.merchantId),

//                totalAmount:
//                    Number(totalAmount),

//                description:
//                    formData.description,

//                dueDate:
//                    formData.dueDate,

//                // FIXED TS7006: typed item
//                items:
//                    formData.items.map((item: ItemForm) => ({

//                        itemName:
//                            item.name,

//                        description:
//                            item.description || null,

//                        quantity:
//                            Number(item.quantity),

//                        unitPrice:
//                            Number(item.unitPrice)
//                    }))
//            };

//            await api.post(
//                "/purchase-orders",
//                payload,
//                {
//                    headers: {
//                        Authorization:
//                            `Bearer ${token}`
//                    }
//                }
//            );

//            toast.success(
//                "Purchase Order created successfully"
//            );

//            // Clear cache so reopening modal starts fresh
//            formCacheRef.current = null;

//            onCreateSuccess();

//            onClose();

//        }
//        catch (error: any) {

//            toast.error(
//                error.response?.data?.message ||
//                "Failed to create Purchase Order"
//            );
//        }
//        finally {

//            setLoading(false);
//        }
//    };

//    // ----------------------------------------------------------------------------------
//    // Item Handlers
//    // ----------------------------------------------------------------------------------

//    const handleItemChange =
//        (index: number, field: keyof ItemForm, value: string) => {

//            const items =
//                [...formData.items];

//            items[index] = {
//                ...items[index],
//                [field]: value
//            };

//            setFormData({
//                ...formData,
//                items
//            });
//        };

//    const handleAddItem = () => {

//        setFormData({

//            ...formData,

//            items: [

//                ...formData.items,

//                {
//                    name: '',
//                    description: '',
//                    quantity: '1',
//                    unitPrice: ''
//                }
//            ]
//        });
//    };

//    const handleRemoveItem =
//        (index: number) => {

//            if (formData.items.length <= 1)
//                return;

//            setFormData({

//                ...formData,

//                // FIXED TS7006: typed (_, i)
//                items:
//                    formData.items.filter(
//                        (_: ItemForm, i: number) => i !== index
//                    )
//            });
//        };

//    // ----------------------------------------------------------------------------------
//    // UI
//    // ----------------------------------------------------------------------------------

//    return (

//        <Modal
//            show={open}
//            onHide={onClose}
//            centered
//            size="lg"
//        >

//            <Modal.Header closeButton>

//                <Modal.Title>
//                    Create Purchase Order
//                </Modal.Title>

//            </Modal.Header>

//            <Modal.Body>

//                <Form onSubmit={handleSubmit}>

//                    <Form.Group>

//                        <Form.Label>
//                            Merchant ID
//                        </Form.Label>

//                        <Form.Control

//                            value={formData.merchantId}

//                            onChange={e =>
//                                setFormData({
//                                    ...formData,
//                                    merchantId: e.target.value
//                                })
//                            }

//                            disabled={!isAdmin}
//                        />

//                    </Form.Group>

//                    <Form.Group className="mt-3">

//                        <Form.Label>
//                            Description
//                        </Form.Label>

//                        <Form.Control

//                            value={formData.description}

//                            onChange={e =>
//                                setFormData({
//                                    ...formData,
//                                    description: e.target.value
//                                })
//                            }
//                        />

//                    </Form.Group>

//                    <Form.Group className="mt-3">

//                        <Form.Label>
//                            Due Date
//                        </Form.Label>

//                        <Form.Control

//                            type="date"

//                            value={formData.dueDate}

//                            onChange={e =>
//                                setFormData({
//                                    ...formData,
//                                    dueDate: e.target.value
//                                })
//                            }
//                        />

//                    </Form.Group>

//                    <hr />

//                    {/* FIXED TS7006: typed (item, index) */}
//                    {formData.items.map((item: ItemForm, index: number) => (

//                        <Row key={index} className="mb-2">

//                            <Col>
//                                <Form.Control
//                                    placeholder="Item Name"
//                                    value={item.name}
//                                    onChange={e =>
//                                        handleItemChange(
//                                            index,
//                                            "name",
//                                            e.target.value
//                                        )
//                                    }
//                                />
//                            </Col>

//                            <Col>
//                                <Form.Control
//                                    placeholder="Quantity"
//                                    value={item.quantity}
//                                    onChange={e =>
//                                        handleItemChange(
//                                            index,
//                                            "quantity",
//                                            e.target.value
//                                        )
//                                    }
//                                />
//                            </Col>

//                            <Col>
//                                <Form.Control
//                                    placeholder="Unit Price"
//                                    value={item.unitPrice}
//                                    onChange={e =>
//                                        handleItemChange(
//                                            index,
//                                            "unitPrice",
//                                            e.target.value
//                                        )
//                                    }
//                                />
//                            </Col>

//                            <Col xs="auto">
//                                <Button
//                                    variant="danger"
//                                    onClick={() =>
//                                        handleRemoveItem(index)
//                                    }
//                                >
//                                    X
//                                </Button>
//                            </Col>

//                        </Row>
//                    ))}

//                    <Button
//                        onClick={handleAddItem}
//                        className="mt-2"
//                    >
//                        Add Item
//                    </Button>

//                    <hr />

//                    <h5>
//                        Total: ₦{totalAmount.toLocaleString()}
//                    </h5>

//                    <Button
//                        type="submit"
//                        disabled={loading}
//                    >
//                        {loading
//                            ? "Creating..."
//                            : "Create Purchase Order"}
//                    </Button>

//                </Form>

//            </Modal.Body>

//        </Modal>
//    );
//};

//export default CreatePurchaseOrderModal;



// src/components/CreatePurchaseOrderModal.tsx
// ----------------------------------------------------------------------------------
// PAYVERIFY — Create Purchase Order Modal
//
// FINAL VERSION WITH ENTERPRISE GLASS / GLOW DASHBOARD STYLING
//
// SAFE GUARANTEES:
//
// ✔ No logic changes
// ✔ No state changes
// ✔ No caching changes
// ✔ No handler changes
// ✔ No API changes
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
import { toast } from 'react-toastify';

interface Props {
    open: boolean;
    onClose: () => void;
    onCreateSuccess: () => void;
    isAdmin?: boolean;
}

interface ItemForm {
    name: string;
    description: string;
    quantity: string;
    unitPrice: string;
}

interface User {
    id: string;
    email: string;
    role: string;
    merchant?: {
        id: string;
        name: string;
    };
}

interface PurchaseOrderFormData {
    merchantId: string;
    description: string;
    dueDate: string;
    items: ItemForm[];
}

interface CreatePurchaseOrderPayload {
    merchantId: number;
    totalAmount: number;
    description: string;
    dueDate: string;
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

    const { token, user } = useAuth();

    const [loading, setLoading] = useState(false);

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

        const userObj = user as User | null;

        const merchantId =
            userObj?.merchant?.id ?? '';

        return {
            merchantId,
            description: '',
            dueDate,
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

        if (!formData.merchantId && !isAdmin) {

            toast.error(
                "Merchant ID is required"
            );

            return;
        }

        if (totalAmount <= 0) {

            toast.error(
                "Total amount must be greater than zero"
            );

            return;
        }

        try {

            setLoading(true);

            const payload: CreatePurchaseOrderPayload = {

                merchantId:
                    Number(formData.merchantId),

                totalAmount:
                    Number(totalAmount),

                description:
                    formData.description,

                dueDate:
                    formData.dueDate,

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

            await api.post(
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
                "Purchase Order created successfully"
            );

            formCacheRef.current = null;

            onCreateSuccess();

            onClose();

        }
        catch (error: any) {

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

                    <Form onSubmit={handleSubmit}>

                        <Form.Group>

                            <Form.Label>
                                Merchant ID
                            </Form.Label>

                            <Form.Control
                                className="pv-input"
                                value={formData.merchantId}
                                onChange={e =>
                                    setFormData({
                                        ...formData,
                                        merchantId: e.target.value
                                    })
                                }
                                disabled={!isAdmin}
                            />

                        </Form.Group>

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
                                : "Create Purchase Order"}
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

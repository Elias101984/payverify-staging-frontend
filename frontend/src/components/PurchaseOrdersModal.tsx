import React, { useEffect, useState } from 'react';
import { Modal, Button, Table, Badge, Form, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

/**
 * ============================================================================
 * PAYMENT REQUEST MODAL
 * ============================================================================
 * WHY:
 * - Opens for a captured order when payment still needs to be completed
 * - Uses backend-returned PaymentIntent
 * - Prevents extra API calls
 * ============================================================================
 */
import PaymentRequestModal from './PaymentRequestModal';

/**
 * ============================================================================
 * PURCHASE ORDER INTERFACE
 * ============================================================================
 */
interface PurchaseOrder {
    id: string;
    poNumber: string;
    merchantId: string;
    merchantName?: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected' | 'completed' | 'paid' | 'cancelled';
    createdAt: string;
    dueDate: string;
    description?: string;
    paymentStatus?: string;
    settlementStatus?: string | null;
    settlementId?: number | null;
    settlementDate?: string | null;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;

    items?: Array<{
        name: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }>;
}

/**
 * ============================================================================
 * COMPONENT PROPS
 * ============================================================================
 */
interface PurchaseOrdersModalProps {
    open: boolean;
    onClose: () => void;
    purchaseOrders: PurchaseOrder[];
    onRefresh: () => void;
    isAdmin: boolean;
}

/**
 * ============================================================================
 * PURCHASE ORDERS MODAL COMPONENT
 * ============================================================================
 */
const PurchaseOrdersModal: React.FC<PurchaseOrdersModalProps> = ({
    open,
    onClose,
    purchaseOrders,
    onRefresh,
    isAdmin
}) => {

    /**
     * ============================================================================
     * AUTH CONTEXT
     * ============================================================================
     */
    const { token } = useAuth();

    /**
     * ============================================================================
     * COMPONENT STATE
     * ============================================================================
     */
    const [loading, setLoading] = useState(false);

    const [selectedStatus, setSelectedStatus] =
        useState<string>('all');

    const [searchTerm, setSearchTerm] =
        useState('');

    const [updatingId, setUpdatingId] =
        useState<string | null>(null);

    /**
     * ============================================================================
     * PAGINATION STATE
     * ============================================================================
     * WHY:
     * - Prevents rendering huge datasets at once
     * - Improves modal performance
     * - Enables scalable UX
     * ============================================================================
     */
    const [currentPage, setCurrentPage] =
        useState<number>(1);

    /**
     * Rows displayed per page
     */
    const itemsPerPage = 10;

    /**
     * ============================================================================
     * PAYMENT MODAL STATE
     * ============================================================================
     */
    const [showPaymentModal, setShowPaymentModal] =
        useState(false);

    const [selectedPaymentIntent, setSelectedPaymentIntent] =
        useState<any>(null);

    /**
     * ============================================================================
     * STATUS BADGE HELPER
     * ============================================================================
     */
    const getStatusBadge = (status: string) => {

        switch (status) {

            case 'pending':
                return <Badge bg="warning">Pending</Badge>;

            case 'approved':
                return <Badge bg="success">Ready for payment</Badge>;

            case 'rejected':
                return <Badge bg="danger">Rejected</Badge>;

            case 'completed':
                return <Badge bg="info">Completed</Badge>;

            case 'paid':
                return <Badge bg="primary">Paid</Badge>;

            case 'cancelled':
                return <Badge bg="secondary">Cancelled</Badge>;

            default:
                return <Badge bg="secondary">{status}</Badge>;
        }
    };

    const getPaymentStatusBadge = (status?: string) => {
        switch ((status || 'not_started').toLowerCase()) {
            case 'paid':
                return <Badge bg="success">Paid</Badge>;
            case 'pending':
                return <Badge bg="warning" text="dark">Pending</Badge>;
            case 'expired':
                return <Badge bg="secondary">Expired</Badge>;
            case 'failed':
                return <Badge bg="danger">Failed</Badge>;
            case 'refunded':
                return <Badge bg="info">Refunded</Badge>;
            default:
                return <Badge bg="secondary">Not started</Badge>;
        }
    };

    const getSettlementStatusBadge = (po: PurchaseOrder) => {
        if ((po.paymentStatus || '').toLowerCase() !== 'paid') {
            return <span className="text-muted">—</span>;
        }

        const status = (po.settlementStatus || 'pending').toLowerCase();
        const title = [
            po.settlementId ? `Settlement #${po.settlementId}` : '',
            po.settlementDate ? `Settled ${formatDate(po.settlementDate)}` : '',
        ].filter(Boolean).join(' · ') || undefined;

        switch (status) {
            case 'success':
            case 'settled':
                return <Badge bg="success" title={title}>Settled</Badge>;
            case 'processing':
                return <Badge bg="info" title={title}>Processing</Badge>;
            case 'failed':
                return <Badge bg="danger" title={title}>Failed</Badge>;
            case 'not_configured':
                return <Badge bg="warning" text="dark">Setup required</Badge>;
            default:
                return <Badge bg="warning" text="dark">Awaiting settlement</Badge>;
        }
    };

    const getCustomerLabel = (po: PurchaseOrder) =>
        po.customerName?.trim() ||
        po.customerPhone?.trim() ||
        po.customerEmail?.trim() ||
        'Walk-in customer';

    /**
     * ============================================================================
     * UPDATE PURCHASE ORDER STATUS
     * ============================================================================
     * WHY:
     * - Keeps cancellation available for unpaid orders
     * - Per-order approval is not part of the direct payment flow
     * ============================================================================
     */
    const handleStatusUpdate = async (
        poId: string,
        newStatus: string
    ) => {

        if (!token) return;

        if (
            newStatus === 'cancelled' &&
            !window.confirm('Cancel this unpaid order? Its invoice, QR code and payment link will stop working.')
        ) {
            return;
        }

        try {

            setUpdatingId(poId);
            setLoading(true);

            /**
             * ============================================================================
             * UPDATE STATUS API
             * ============================================================================
             */
            const response = await api.put(
                `/purchase-orders/${poId}/status`,
                { status: newStatus },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            toast.success(
                `Purchase order ${newStatus} successfully`
            );

            /**
             * Refresh dashboard/modal data
             */
            onRefresh();

        } catch (error: any) {

            console.error(
                'Failed to update status:',
                error
            );

            toast.error(
                error.response?.data?.message ||
                'Failed to update purchase order status'
            );

        } finally {

            setLoading(false);

            setUpdatingId(null);
        }
    };

    const handleOpenPaymentPackage = async (po: PurchaseOrder) => {
        if (!token || !po.id) return;

        try {
            setUpdatingId(po.id);
            setLoading(true);

            const response = await api.post(
                `/purchase-orders/${po.id}/payment-request`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const paymentIntent = response.data?.data?.paymentIntent;
            if (!paymentIntent) {
                throw new Error('The payment package was not returned.');
            }

            setSelectedPaymentIntent(paymentIntent);
            setShowPaymentModal(true);
            onRefresh();
        } catch (error: any) {
            console.error('Failed to open payment package:', error);
            toast.error(
                error.response?.data?.message ||
                'Unable to open the payment package'
            );
        } finally {
            setLoading(false);
            setUpdatingId(null);
        }
    };

    /**
     * ============================================================================
     * FILTERING LOGIC
     * ============================================================================
     */
    const filteredOrders = purchaseOrders.filter(po => {

        const orderStatus = String(po.status || '').toLowerCase();
        const paymentStatus = String(po.paymentStatus || '').toLowerCase();
        const settlementStatus = String(po.settlementStatus || '').toLowerCase();
        // The modal has separate Order, Payment, and Settlement columns. A
        // status filter should search all three, not only the order status.
        const matchesStatus =
            selectedStatus === 'all' ||
            orderStatus === selectedStatus.toLowerCase() ||
            paymentStatus === selectedStatus.toLowerCase() ||
            settlementStatus === selectedStatus.toLowerCase() ||
            (selectedStatus === 'paid' && ['success', 'successful', 'completed', 'settled'].includes(paymentStatus));

        const matchesSearch =
            !searchTerm ||

            po.poNumber
                .toLowerCase()
                .includes(searchTerm.toLowerCase()) ||

            (
                po.merchantName &&
                po.merchantName
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase())
            ) ||

            (
                po.description &&
                po.description
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase())
            ) ||
            [po.customerName, po.customerEmail, po.customerPhone, po.paymentStatus, po.settlementStatus]
                .some(value => String(value || '').toLowerCase().includes(searchTerm.toLowerCase()));

        return matchesStatus && matchesSearch;
    });

    /**
     * ============================================================================
     * PAGINATION CALCULATIONS
     * ============================================================================
     */
    const totalPages = Math.ceil(
        filteredOrders.length / itemsPerPage
    );

    const startIndex =
        (currentPage - 1) * itemsPerPage;

    const endIndex =
        startIndex + itemsPerPage;

    /**
     * Orders shown only for current page
     */
    const paginatedOrders =
        filteredOrders.slice(
            startIndex,
            endIndex
        );

    /**
     * ============================================================================
     * RESET PAGE WHEN FILTER CHANGES
     * ============================================================================
     * WHY:
     * - Prevents empty pages after filtering
     * - Keeps UX clean
     * ============================================================================
     */
    useEffect(() => {

        setCurrentPage(1);

    }, [searchTerm, selectedStatus]);

    /**
     * ============================================================================
     * FORMAT CURRENCY
     * ============================================================================
     */
    const formatCurrency = (amount: number) =>
        `₦${amount?.toLocaleString() || '0'}`;

    /**
     * ============================================================================
     * FORMAT DATE
     * ============================================================================
     */
    const formatDate = (dateString: string) => {

        try {

            const date = new Date(dateString);

            if (isNaN(date.getTime())) {
                return 'Invalid date';
            }

            return date.toLocaleDateString(
                'en-NG',
                {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                }
            );

        } catch {

            return 'Invalid date';
        }
    };

    /**
     * ============================================================================
     * DAYS UNTIL DUE
     * ============================================================================
     */
    const calculateDaysUntilDue = (
        dueDate: string
    ) => {

        try {

            const due = new Date(dueDate);

            const today = new Date();

            const diffTime =
                due.getTime() - today.getTime();

            return Math.ceil(
                diffTime / (1000 * 60 * 60 * 24)
            );

        } catch {

            return null;
        }
    };

    /**
     * ============================================================================
     * COMPONENT RENDER
     * ============================================================================
     */
    return (
        <>
            <Modal
                show={open}
                onHide={onClose}
                size="xl"
                centered
                backdrop="static"
                className="pv-po-modal"
            >

                <Modal.Header closeButton>

                    <Modal.Title>
                        <i className="bi bi-receipt me-2"></i>

                        Purchase Orders
                    </Modal.Title>

                </Modal.Header>

                <Modal.Body>

                    {/* ============================================================
                        FILTERS
                    ============================================================ */}
                    <div className="mb-3 d-flex gap-2">

                        <Form.Control
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) =>
                                setSearchTerm(e.target.value)
                            }
                        />

                        <Form.Select
                            value={selectedStatus}
                            onChange={(e) =>
                                setSelectedStatus(e.target.value)
                            }
                        >
                            <option value="all">All</option>

                            <option value="pending">
                                Pending
                            </option>

                            <option value="approved">
                                Ready for payment (legacy)
                            </option>

                            <option value="rejected">
                                Rejected
                            </option>

                            <option value="completed">
                                Completed
                            </option>

                            <option value="paid">
                                Paid
                            </option>

                            <option value="cancelled">
                                Cancelled
                            </option>

                        </Form.Select>

                        <Button onClick={onRefresh}>
                            Refresh
                        </Button>

                    </div>

                    {/* ============================================================
                        PURCHASE ORDER TABLE
                    ============================================================ */}
                    <Table hover responsive>

                        <thead>

                            <tr>

                                <th>PO Number</th>

                                {isAdmin && (
                                    <th>Merchant</th>
                                )}

                                <th>Customer</th>

                                <th>Amount</th>

                                <th>Order</th>

                                <th>Payment</th>

                                <th>Settlement</th>

                                <th>Created</th>

                                <th>Due Date</th>

                                <th>Actions</th>

                            </tr>

                        </thead>

                        <tbody>

                            {paginatedOrders.map(po => (

                                <tr key={po.id}>

                                    <td>
                                        PO-{po.poNumber}
                                    </td>

                                    {isAdmin && (
                                        <td>
                                            {po.merchantName}
                                        </td>
                                    )}

                                    <td>{getCustomerLabel(po)}</td>

                                    <td>
                                        {formatCurrency(po.amount)}
                                    </td>

                                    <td>
                                        {getStatusBadge(po.status)}
                                    </td>

                                    <td>
                                        {getPaymentStatusBadge(po.paymentStatus)}
                                    </td>

                                    <td>
                                        {getSettlementStatusBadge(po)}
                                    </td>

                                    <td>
                                        {formatDate(po.createdAt)}
                                    </td>

                                    <td>
                                        {formatDate(po.dueDate)}
                                    </td>

                                    <td>

                                        {['pending', 'approved'].includes(po.status) &&
                                            (po.paymentStatus || '').toLowerCase() !== 'paid' && (
                                                <div className="d-flex gap-2 flex-wrap">
                                                    <Button
                                                        size="sm"
                                                        disabled={updatingId === po.id}
                                                        onClick={() => handleOpenPaymentPackage(po)}
                                                    >
                                                        Open payment package
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline-danger"
                                                        disabled={updatingId === po.id}
                                                        onClick={() => handleStatusUpdate(po.id, 'cancelled')}
                                                    >
                                                        Cancel order
                                                    </Button>
                                                </div>
                                            )}

                                    </td>

                                </tr>
                            ))}

                        </tbody>

                    </Table>

                    {/* ============================================================
                        PAGINATION CONTROLS
                    ============================================================ */}
                    <div className="d-flex justify-content-between align-items-center mt-3">

                        {/* LEFT SIDE */}
                        <div className="text-muted small">

                            Showing {
                                filteredOrders.length === 0
                                    ? 0
                                    : startIndex + 1
                            }

                            -

                            {
                                Math.min(
                                    endIndex,
                                    filteredOrders.length
                                )
                            }

                            of

                            {filteredOrders.length}

                            purchase orders

                        </div>

                        {/* RIGHT SIDE */}
                        <div className="d-flex align-items-center gap-2">

                            <Button
                                size="sm"
                                variant="outline-secondary"
                                disabled={currentPage === 1}
                                onClick={() =>
                                    setCurrentPage(prev => prev - 1)
                                }
                            >
                                Previous
                            </Button>

                            <span className="fw-bold small">

                                Page {currentPage}

                                of

                                {totalPages || 1}

                            </span>

                            <Button
                                size="sm"
                                variant="outline-primary"
                                disabled={
                                    currentPage === totalPages ||
                                    totalPages === 0
                                }
                                onClick={() =>
                                    setCurrentPage(prev => prev + 1)
                                }
                            >
                                Next
                            </Button>

                        </div>

                    </div>

                </Modal.Body>

                <Modal.Footer>

                    <Button onClick={onClose}>
                        Close
                    </Button>

                </Modal.Footer>

            </Modal>

            {/* ============================================================
                PAYMENT REQUEST MODAL
            ============================================================ */}
            <PaymentRequestModal
                open={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                paymentIntent={selectedPaymentIntent}
            />
        </>
    );
};

export default PurchaseOrdersModal;

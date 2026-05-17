//////import React, { useState } from 'react';
//////import { Modal, Button, Table, Badge, Form, Spinner } from 'react-bootstrap';
//////import { toast } from 'react-toastify';
//////import api from '../services/api';
//////import { useAuth } from '../contexts/AuthContext';

//////interface PurchaseOrder {
//////    id: string;
//////    poNumber: string;
//////    merchantId: string;
//////    merchantName?: string;
//////    amount: number;
//////    status: 'pending' | 'approved' | 'rejected' | 'completed';
//////    createdAt: string;
//////    dueDate: string;
//////    description?: string;
//////    items?: Array<{
//////        name: string;
//////        quantity: number;
//////        unitPrice: number;
//////        total: number;
//////    }>;
//////}

//////interface PurchaseOrdersModalProps {
//////    open: boolean;
//////    onClose: () => void;
//////    purchaseOrders: PurchaseOrder[];
//////    onRefresh: () => void;
//////    isAdmin: boolean;
//////}

//////const PurchaseOrdersModal: React.FC<PurchaseOrdersModalProps> = ({
//////    open,
//////    onClose,
//////    purchaseOrders,
//////    onRefresh,
//////    isAdmin
//////}) => {
//////    const { token } = useAuth();
//////    const [loading, setLoading] = useState(false);
//////    const [selectedStatus, setSelectedStatus] = useState<string>('all');
//////    const [searchTerm, setSearchTerm] = useState('');
//////    const [updatingId, setUpdatingId] = useState<string | null>(null);

//////    const getStatusBadge = (status: string) => {
//////        switch (status) {
//////            case 'pending': return <Badge bg="warning">Pending</Badge>;
//////            case 'approved': return <Badge bg="success">Approved</Badge>;
//////            case 'rejected': return <Badge bg="danger">Rejected</Badge>;
//////            case 'completed': return <Badge bg="info">Completed</Badge>;
//////            default: return <Badge bg="secondary">{status}</Badge>;
//////        }
//////    };

//////    const handleStatusUpdate = async (poId: string, newStatus: string) => {
//////        if (!token) return;

//////        try {
//////            setUpdatingId(poId);
//////            setLoading(true);

//////            await api.put(`/purchase-orders/${poId}/status`,
//////                { status: newStatus },
//////                { headers: { Authorization: `Bearer ${token}` } }
//////            );

//////            toast.success(`Purchase order ${newStatus} successfully`);
//////            onRefresh();
//////        } catch (error: any) {
//////            console.error('Failed to update status:', error);
//////            toast.error(error.response?.data?.message || 'Failed to update purchase order status');
//////        } finally {
//////            setLoading(false);
//////            setUpdatingId(null);
//////        }
//////    };

//////    const filteredOrders = purchaseOrders.filter(po => {
//////        const matchesStatus = selectedStatus === 'all' || po.status === selectedStatus;
//////        const matchesSearch = !searchTerm ||
//////            po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
//////            (po.merchantName && po.merchantName.toLowerCase().includes(searchTerm.toLowerCase())) ||
//////            (po.description && po.description.toLowerCase().includes(searchTerm.toLowerCase()));
//////        return matchesStatus && matchesSearch;
//////    });

//////    const formatCurrency = (amount: number) => {
//////        return `₦${amount?.toLocaleString() || '0'}`;
//////    };

//////    const formatDate = (dateString: string) => {
//////        try {
//////            const date = new Date(dateString);
//////            if (isNaN(date.getTime())) return 'Invalid date';

//////            return date.toLocaleDateString('en-NG', {
//////                day: 'numeric',
//////                month: 'short',
//////                year: 'numeric'
//////            });
//////        } catch {
//////            return 'Invalid date';
//////        }
//////    };

//////    const calculateDaysUntilDue = (dueDate: string) => {
//////        try {
//////            const due = new Date(dueDate);
//////            const today = new Date();
//////            const diffTime = due.getTime() - today.getTime();
//////            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
//////            return diffDays;
//////        } catch {
//////            return null;
//////        }
//////    };

//////    return (
//////        <Modal show={open} onHide={onClose} size="xl" centered backdrop="static">
//////            <Modal.Header closeButton className="bg-dark text-light border-secondary">
//////                <Modal.Title className="fw-bold">
//////                    <i className="bi bi-receipt me-2"></i>
//////                    Purchase Orders
//////                </Modal.Title>
//////            </Modal.Header>
//////            <Modal.Body className="bg-dark text-light p-0">
//////                {/* Filters Section */}
//////                <div className="p-3 border-bottom border-secondary" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
//////                    <div className="row g-2">
//////                        <div className="col-md-6">
//////                            <Form.Control
//////                                type="text"
//////                                placeholder="🔍 Search by PO number, merchant, or description..."
//////                                value={searchTerm}
//////                                onChange={(e) => setSearchTerm(e.target.value)}
//////                                className="bg-dark text-light border-secondary"
//////                                style={{ borderRadius: '8px' }}
//////                            />
//////                        </div>
//////                        <div className="col-md-3">
//////                            <Form.Select
//////                                value={selectedStatus}
//////                                onChange={(e) => setSelectedStatus(e.target.value)}
//////                                className="bg-dark text-light border-secondary"
//////                                style={{ borderRadius: '8px' }}
//////                            >
//////                                <option value="all">📋 All Statuses</option>
//////                                <option value="pending">⏳ Pending</option>
//////                                <option value="approved">✅ Approved</option>
//////                                <option value="rejected">❌ Rejected</option>
//////                                <option value="completed">🏁 Completed</option>
//////                            </Form.Select>
//////                        </div>
//////                        <div className="col-md-3">
//////                            <Button
//////                                variant="outline-light"
//////                                className="w-100 d-flex align-items-center justify-content-center"
//////                                onClick={onRefresh}
//////                                style={{ borderRadius: '8px' }}
//////                            >
//////                                <i className="bi bi-arrow-clockwise me-2"></i>
//////                                Refresh
//////                            </Button>
//////                        </div>
//////                    </div>
//////                    <div className="mt-2 text-light opacity-75 small">
//////                        Showing {filteredOrders.length} of {purchaseOrders.length} purchase orders
//////                    </div>
//////                </div>

//////                {/* Table Section */}
//////                <div className="table-responsive" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
//////                    <Table hover className="mb-0 border-0">
//////                        <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
//////                            <tr className="bg-dark border-secondary">
//////                                <th className="border-secondary text-light" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>PO Number</th>
//////                                {isAdmin && <th className="border-secondary text-light" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>Merchant</th>}
//////                                <th className="border-secondary text-light" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>Amount</th>
//////                                <th className="border-secondary text-light" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>Status</th>
//////                                <th className="border-secondary text-light" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>Created</th>
//////                                <th className="border-secondary text-light" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>Due Date</th>
//////                                <th className="border-secondary text-light" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>Description</th>
//////                                <th className="border-secondary text-light" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>Actions</th>
//////                            </tr>
//////                        </thead>
//////                        <tbody>
//////                            {filteredOrders.length > 0 ? (
//////                                filteredOrders.map((po) => {
//////                                    const daysUntilDue = calculateDaysUntilDue(po.dueDate);
//////                                    const isOverdue = daysUntilDue !== null && daysUntilDue < 0;

//////                                    return (
//////                                        <tr key={po.id} className="border-secondary">
//////                                            <td className="border-secondary">
//////                                                <div className="fw-bold text-light">PO-{po.poNumber}</div>
//////                                                {isOverdue && (
//////                                                    <small className="text-danger">
//////                                                        <i className="bi bi-exclamation-triangle me-1"></i>
//////                                                        Overdue
//////                                                    </small>
//////                                                )}
//////                                            </td>
//////                                            {isAdmin && (
//////                                                <td className="border-secondary text-light">
//////                                                    {po.merchantName || 'N/A'}
//////                                                </td>
//////                                            )}
//////                                            <td className="border-secondary">
//////                                                <div className="fw-bold text-light">{formatCurrency(po.amount)}</div>
//////                                            </td>
//////                                            <td className="border-secondary">{getStatusBadge(po.status)}</td>
//////                                            <td className="border-secondary text-light">{formatDate(po.createdAt)}</td>
//////                                            <td className="border-secondary">
//////                                                <div className="text-light">{formatDate(po.dueDate)}</div>
//////                                                {daysUntilDue !== null && (
//////                                                    <small className={isOverdue ? 'text-danger' : 'text-light opacity-75'}>
//////                                                        {isOverdue ? `${Math.abs(daysUntilDue)} days ago` : `${daysUntilDue} days left`}
//////                                                    </small>
//////                                                )}
//////                                            </td>
//////                                            <td className="border-secondary" style={{ maxWidth: '200px' }}>
//////                                                <div className="text-truncate text-light" title={po.description || 'No description'}>
//////                                                    {po.description || 'No description'}
//////                                                </div>
//////                                            </td>
//////                                            <td className="border-secondary">
//////                                                <div className="d-flex gap-1">
//////                                                    {po.status === 'pending' && (
//////                                                        <>
//////                                                            <Button
//////                                                                size="sm"
//////                                                                variant="success"
//////                                                                onClick={() => handleStatusUpdate(po.id, 'approved')}
//////                                                                disabled={loading && updatingId === po.id}
//////                                                                className="d-flex align-items-center"
//////                                                            >
//////                                                                {loading && updatingId === po.id ? (
//////                                                                    <Spinner animation="border" size="sm" className="me-1" />
//////                                                                ) : (
//////                                                                    <i className="bi bi-check-circle me-1"></i>
//////                                                                )}
//////                                                                Approve
//////                                                            </Button>
//////                                                            <Button
//////                                                                size="sm"
//////                                                                variant="danger"
//////                                                                onClick={() => handleStatusUpdate(po.id, 'rejected')}
//////                                                                disabled={loading && updatingId === po.id}
//////                                                                className="d-flex align-items-center"
//////                                                            >
//////                                                                {loading && updatingId === po.id ? (
//////                                                                    <Spinner animation="border" size="sm" className="me-1" />
//////                                                                ) : (
//////                                                                    <i className="bi bi-x-circle me-1"></i>
//////                                                                )}
//////                                                                Reject
//////                                                            </Button>
//////                                                        </>
//////                                                    )}
//////                                                    {po.status === 'approved' && (
//////                                                        <Button
//////                                                            size="sm"
//////                                                            variant="info"
//////                                                            onClick={() => handleStatusUpdate(po.id, 'completed')}
//////                                                            disabled={loading && updatingId === po.id}
//////                                                            className="d-flex align-items-center"
//////                                                        >
//////                                                            {loading && updatingId === po.id ? (
//////                                                                <Spinner animation="border" size="sm" className="me-1" />
//////                                                            ) : (
//////                                                                <i className="bi bi-check-all me-1"></i>
//////                                                            )}
//////                                                            Complete
//////                                                        </Button>
//////                                                    )}
//////                                                    {(po.status === 'rejected' || po.status === 'completed') && (
//////                                                        <small className="text-light opacity-75">No actions available</small>
//////                                                    )}
//////                                                </div>
//////                                            </td>
//////                                        </tr>
//////                                    );
//////                                })
//////                            ) : (
//////                                <tr>
//////                                    <td colSpan={isAdmin ? 8 : 7} className="text-center py-5">
//////                                        <div className="text-light opacity-75">
//////                                            <i className="bi bi-inbox fs-1 d-block mb-2"></i>
//////                                            No purchase orders found
//////                                            {searchTerm && (
//////                                                <div className="mt-2">
//////                                                    No results for "{searchTerm}"
//////                                                </div>
//////                                            )}
//////                                        </div>
//////                                    </td>
//////                                </tr>
//////                            )}
//////                        </tbody>
//////                    </Table>
//////                </div>
//////            </Modal.Body>
//////            <Modal.Footer className="bg-dark border-secondary">
//////                <div className="d-flex justify-content-between w-100 align-items-center">
//////                    <div className="text-light opacity-75 small">
//////                        {selectedStatus === 'all' ? 'All statuses' : selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)} • {filteredOrders.length} records
//////                    </div>
//////                    <div>
//////                        <Button variant="secondary" onClick={onClose} className="px-4">
//////                            Close
//////                        </Button>
//////                    </div>
//////                </div>
//////            </Modal.Footer>
//////        </Modal>
//////    );
//////};

//////////export default PurchaseOrdersModal;


////////import React, { useState } from 'react';
////////import { Modal, Button, Table, Badge, Form, Spinner } from 'react-bootstrap';
////////import { toast } from 'react-toastify';
////////import api from '../services/api';
////////import { useAuth } from '../contexts/AuthContext';

////////interface PurchaseOrder {
////////    id: string;
////////    poNumber: string;
////////    merchantId: string;
////////    merchantName?: string;
////////    amount: number;
////////    status: 'pending' | 'approved' | 'rejected' | 'completed';
////////    createdAt: string;
////////    dueDate: string;
////////    description?: string;
////////    items?: Array<{
////////        name: string;
////////        quantity: number;
////////        unitPrice: number;
////////        total: number;
////////    }>;
////////}

////////interface PurchaseOrdersModalProps {
////////    open: boolean;
////////    onClose: () => void;
////////    purchaseOrders: PurchaseOrder[];
////////    onRefresh: () => void;
////////    isAdmin: boolean;
////////}

////////const PurchaseOrdersModal: React.FC<PurchaseOrdersModalProps> = ({
////////    open,
////////    onClose,
////////    purchaseOrders,
////////    onRefresh,
////////    isAdmin
////////}) => {

////////    const { token } = useAuth();

////////    const [loading, setLoading] = useState(false);

////////    const [selectedStatus, setSelectedStatus] = useState('all');

////////    const [searchTerm, setSearchTerm] = useState('');

////////    const [updatingId, setUpdatingId] = useState<string | null>(null);

////////    const getStatusBadge = (status: string) => {

////////        switch (status) {

////////            case 'pending': return <Badge bg="warning">Pending</Badge>;

////////            case 'approved': return <Badge bg="success">Approved</Badge>;

////////            case 'rejected': return <Badge bg="danger">Rejected</Badge>;

////////            case 'completed': return <Badge bg="info">Completed</Badge>;

////////            default: return <Badge bg="secondary">{status}</Badge>;
////////        }
////////    };

////////    const filteredOrders = purchaseOrders.filter(po => {

////////        const matchesStatus =
////////            selectedStatus === 'all' || po.status === selectedStatus;

////////        const matchesSearch =
////////            !searchTerm ||
////////            po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
////////            po.description?.toLowerCase().includes(searchTerm.toLowerCase());

////////        return matchesStatus && matchesSearch;
////////    });

////////    const formatCurrency = (amount: number) =>
////////        `₦${amount?.toLocaleString()}`;

////////    const formatDate = (dateString: string) =>
////////        new Date(dateString).toLocaleDateString('en-NG', {
////////            day: 'numeric',
////////            month: 'short',
////////            year: 'numeric'
////////        });

////////    return (

////////        <>
////////            <Modal
////////                show={open}
////////                onHide={onClose}
////////                size="xl"
////////                centered
////////                backdropClassName="pv-modal-backdrop"
////////                contentClassName="pv-modal-content"
////////            >

////////                <Modal.Header closeButton className="pv-modal-header">

////////                    <Modal.Title className="pv-modal-title">

////////                        Purchase Orders

////////                    </Modal.Title>

////////                </Modal.Header>

////////                <Modal.Body className="pv-modal-body">

////////                    {/* Filters */}

////////                    <div className="pv-filter-bar">

////////                        <Form.Control
////////                            placeholder="🔍 Search purchase orders..."
////////                            value={searchTerm}
////////                            onChange={e =>
////////                                setSearchTerm(e.target.value)
////////                            }
////////                            className="pv-input"
////////                        />

////////                        <Form.Select
////////                            value={selectedStatus}
////////                            onChange={e =>
////////                                setSelectedStatus(e.target.value)
////////                            }
////////                            className="pv-input"
////////                        >
////////                            <option value="all">All Statuses</option>
////////                            <option value="pending">Pending</option>
////////                            <option value="approved">Approved</option>
////////                            <option value="rejected">Rejected</option>
////////                            <option value="completed">Completed</option>
////////                        </Form.Select>

////////                        <Button
////////                            onClick={onRefresh}
////////                            className="pv-primary-btn"
////////                        >
////////                            Refresh
////////                        </Button>

////////                    </div>

////////                    {/* Table */}

////////                    <div className="table-responsive pv-table-container">

////////                        <Table hover className="pv-table">

////////                            <thead>

////////                                <tr>

////////                                    <th>PO Number</th>

////////                                    {isAdmin && <th>Merchant</th>}

////////                                    <th>Amount</th>

////////                                    <th>Status</th>

////////                                    <th>Created</th>

////////                                    <th>Due Date</th>

////////                                    <th>Description</th>

////////                                </tr>

////////                            </thead>

////////                            <tbody>

////////                                {filteredOrders.map(po => (

////////                                    <tr key={po.id}>

////////                                        <td className="fw-bold">
////////                                            PO-{po.poNumber}
////////                                        </td>

////////                                        {isAdmin &&
////////                                            <td>{po.merchantName}</td>
////////                                        }

////////                                        <td>
////////                                            {formatCurrency(po.amount)}
////////                                        </td>

////////                                        <td>
////////                                            {getStatusBadge(po.status)}
////////                                        </td>

////////                                        <td>
////////                                            {formatDate(po.createdAt)}
////////                                        </td>

////////                                        <td>
////////                                            {formatDate(po.dueDate)}
////////                                        </td>

////////                                        <td>
////////                                            {po.description}
////////                                        </td>

////////                                    </tr>

////////                                ))}

////////                            </tbody>

////////                        </Table>

////////                    </div>

////////                </Modal.Body>

////////                <Modal.Footer className="pv-modal-footer">

////////                    <Button
////////                        onClick={onClose}
////////                        className="pv-secondary-btn"
////////                    >
////////                        Close
////////                    </Button>

////////                </Modal.Footer>

////////            </Modal>

////////            {/* PAYVERIFY DASHBOARD STYLE */}

////////            <style>{`

////////.pv-modal-backdrop {

////////    backdrop-filter: blur(12px);

////////    background: rgba(3,8,20,0.75);

////////}

////////.pv-modal-content {

////////    font-family: Inter, system-ui;

////////    color: #e9f2ff;

////////    background:

////////        linear-gradient(
////////            180deg,
////////            rgba(10,15,35,0.96),
////////            rgba(11,46,117,0.94)
////////        );

////////    border-radius: 16px;

////////    border: 1px solid rgba(255,255,255,0.15);

////////    box-shadow:
////////        0 40px 100px rgba(0,0,0,0.85),
////////        0 0 60px rgba(0,102,255,0.25);

////////}

////////.pv-modal-title {

////////    font-weight: 700;

////////    font-size: 1.4rem;

////////}

////////.pv-modal-body {

////////    font-size: 0.95rem;

////////}

////////.pv-filter-bar {

////////    display: flex;

////////    gap: 10px;

////////    padding: 15px;

////////}

////////.pv-input {

////////    background: rgba(255,255,255,0.05);

////////    border: 1px solid rgba(255,255,255,0.15);

////////    color: white;

////////}

////////.pv-primary-btn {

////////    background:

////////        linear-gradient(90deg,#0066ff,#3399ff);

////////    border: none;

////////}

////////.pv-secondary-btn {

////////    background: rgba(255,255,255,0.1);

////////    border: none;

////////    color: white;

////////}

////////.pv-table {

////////    color: #e9f2ff;

////////}

////////.pv-table thead {

////////    background: rgba(0,0,0,0.4);

////////}

////////.pv-table tbody tr:hover {

////////    background: rgba(0,102,255,0.15);

////////}

////////`}</style>

////////        </>
////////    );
////////};

////////export default PurchaseOrdersModal;


////import React, { useState } from 'react';
////import { Modal, Button, Table, Badge, Form, Spinner } from 'react-bootstrap';
////import { toast } from 'react-toastify';
////import api from '../services/api';
////import { useAuth } from '../contexts/AuthContext';

////interface PurchaseOrder {
////    id: string;
////    poNumber: string;
////    merchantId: string;
////    merchantName?: string;
////    amount: number;
////    status: 'pending' | 'approved' | 'rejected' | 'completed';
////    createdAt: string;
////    dueDate: string;
////    description?: string;
////    items?: Array<{
////        name: string;
////        quantity: number;
////        unitPrice: number;
////        total: number;
////    }>;
////}

////interface PurchaseOrdersModalProps {
////    open: boolean;
////    onClose: () => void;
////    purchaseOrders: PurchaseOrder[];
////    onRefresh: () => void;
////    isAdmin: boolean;
////}

////const PurchaseOrdersModal: React.FC<PurchaseOrdersModalProps> = ({
////    open,
////    onClose,
////    purchaseOrders,
////    onRefresh,
////    isAdmin
////}) => {

////    const { token } = useAuth();

////    const [loading, setLoading] = useState(false);
////    const [selectedStatus, setSelectedStatus] = useState<string>('all');
////    const [searchTerm, setSearchTerm] = useState('');
////    const [updatingId, setUpdatingId] = useState<string | null>(null);

////    // ----------------------------------------------------------------------------------
////    // Status badge helper (NO CHANGE)
////    // ----------------------------------------------------------------------------------
////    const getStatusBadge = (status: string) => {
////        switch (status) {
////            case 'pending': return <Badge bg="warning">Pending</Badge>;
////            case 'approved': return <Badge bg="success">Approved</Badge>;
////            case 'rejected': return <Badge bg="danger">Rejected</Badge>;
////            case 'completed': return <Badge bg="info">Completed</Badge>;
////            default: return <Badge bg="secondary">{status}</Badge>;
////        }
////    };

////    // ----------------------------------------------------------------------------------
////    // Update status (NO CHANGE)
////    // ----------------------------------------------------------------------------------
////    const handleStatusUpdate = async (poId: string, newStatus: string) => {
////        if (!token) return;

////        try {
////            setUpdatingId(poId);
////            setLoading(true);

////            await api.put(
////                `/purchase-orders/${poId}/status`,
////                { status: newStatus },
////                { headers: { Authorization: `Bearer ${token}` } }
////            );

////            toast.success(`Purchase order ${newStatus} successfully`);
////            onRefresh();

////        } catch (error: any) {
////            console.error('Failed to update status:', error);
////            toast.error(error.response?.data?.message || 'Failed to update purchase order status');
////        } finally {
////            setLoading(false);
////            setUpdatingId(null);
////        }
////    };

////    // ----------------------------------------------------------------------------------
////    // Filtering (NO CHANGE)
////    // ----------------------------------------------------------------------------------
////    const filteredOrders = purchaseOrders.filter(po => {
////        const matchesStatus = selectedStatus === 'all' || po.status === selectedStatus;
////        const matchesSearch = !searchTerm ||
////            po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
////            (po.merchantName && po.merchantName.toLowerCase().includes(searchTerm.toLowerCase())) ||
////            (po.description && po.description.toLowerCase().includes(searchTerm.toLowerCase()));
////        return matchesStatus && matchesSearch;
////    });

////    const formatCurrency = (amount: number) => {
////        return `₦${amount?.toLocaleString() || '0'}`;
////    };

////    const formatDate = (dateString: string) => {
////        try {
////            const date = new Date(dateString);
////            if (isNaN(date.getTime())) return 'Invalid date';

////            return date.toLocaleDateString('en-NG', {
////                day: 'numeric',
////                month: 'short',
////                year: 'numeric'
////            });
////        } catch {
////            return 'Invalid date';
////        }
////    };

////    const calculateDaysUntilDue = (dueDate: string) => {
////        try {
////            const due = new Date(dueDate);
////            const today = new Date();
////            const diffTime = due.getTime() - today.getTime();
////            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
////            return diffDays;
////        } catch {
////            return null;
////        }
////    };

////    return (
////        <>
////            {/*
////              CHANGED: Added className="pv-po-modal" only.
////              WHY: This is the safest way to style react-bootstrap modals across versions
////                   without relying on props that may not exist (contentClassName/backdropClassName).
////            */}
////            <Modal
////                show={open}
////                onHide={onClose}
////                size="xl"
////                centered
////                backdrop="static"
////                className="pv-po-modal"
////            >
////                {/* Header */}
////                <Modal.Header closeButton className="pv-po-modal-header">
////                    <Modal.Title className="pv-po-modal-title">
////                        <i className="bi bi-receipt me-2"></i>
////                        Purchase Orders
////                    </Modal.Title>
////                </Modal.Header>

////                {/* Body */}
////                <Modal.Body className="pv-po-modal-body p-0">

////                    {/* Filters Section */}
////                    <div className="p-3 pv-po-filter-bar">
////                        <div className="row g-2">
////                            <div className="col-md-6">
////                                <Form.Control
////                                    type="text"
////                                    placeholder="🔍 Search by PO number, merchant, or description..."
////                                    value={searchTerm}
////                                    onChange={(e) => setSearchTerm(e.target.value)}
////                                    className="pv-po-input"
////                                    style={{ borderRadius: '10px' }}
////                                />
////                            </div>

////                            <div className="col-md-3">
////                                <Form.Select
////                                    value={selectedStatus}
////                                    onChange={(e) => setSelectedStatus(e.target.value)}
////                                    className="pv-po-select"
////                                    style={{ borderRadius: '10px' }}
////                                >
////                                    <option value="all">📋 All Statuses</option>
////                                    <option value="pending">⏳ Pending</option>
////                                    <option value="approved">✅ Approved</option>
////                                    <option value="rejected">❌ Rejected</option>
////                                    <option value="completed">🏁 Completed</option>
////                                </Form.Select>
////                            </div>

////                            <div className="col-md-3">
////                                <Button
////                                    variant="outline-light"
////                                    className="w-100 d-flex align-items-center justify-content-center pv-po-refresh"
////                                    onClick={onRefresh}
////                                    style={{ borderRadius: '10px' }}
////                                >
////                                    <i className="bi bi-arrow-clockwise me-2"></i>
////                                    Refresh
////                                </Button>
////                            </div>
////                        </div>

////                        <div className="mt-2 pv-po-subtitle">
////                            Showing {filteredOrders.length} of {purchaseOrders.length} purchase orders
////                        </div>
////                    </div>

////                    {/* Table Section */}
////                    <div className="table-responsive pv-po-table-wrap">
////                        <Table hover className="mb-0 border-0 pv-po-table">
////                            <thead className="pv-po-thead" style={{ position: 'sticky', top: 0, zIndex: 2 }}>
////                                <tr>
////                                    <th>PO Number</th>
////                                    {isAdmin && <th>Merchant</th>}
////                                    <th>Amount</th>
////                                    <th>Status</th>
////                                    <th>Created</th>
////                                    <th>Due Date</th>
////                                    <th>Description</th>
////                                    <th>Actions</th>
////                                </tr>
////                            </thead>

////                            <tbody>
////                                {filteredOrders.length > 0 ? (
////                                    filteredOrders.map((po) => {
////                                        const daysUntilDue = calculateDaysUntilDue(po.dueDate);
////                                        const isOverdue = daysUntilDue !== null && daysUntilDue < 0;

////                                        return (
////                                            <tr key={po.id} className="pv-po-row">
////                                                <td>
////                                                    <div className="fw-bold">PO-{po.poNumber}</div>
////                                                    {isOverdue && (
////                                                        <small className="text-danger">
////                                                            <i className="bi bi-exclamation-triangle me-1"></i>
////                                                            Overdue
////                                                        </small>
////                                                    )}
////                                                </td>

////                                                {isAdmin && (
////                                                    <td>{po.merchantName || 'N/A'}</td>
////                                                )}

////                                                <td className="fw-bold">{formatCurrency(po.amount)}</td>

////                                                <td>{getStatusBadge(po.status)}</td>

////                                                <td>{formatDate(po.createdAt)}</td>

////                                                <td>
////                                                    <div>{formatDate(po.dueDate)}</div>
////                                                    {daysUntilDue !== null && (
////                                                        <small className={isOverdue ? 'text-danger' : 'pv-po-muted'}>
////                                                            {isOverdue ? `${Math.abs(daysUntilDue)} days ago` : `${daysUntilDue} days left`}
////                                                        </small>
////                                                    )}
////                                                </td>

////                                                <td style={{ maxWidth: '200px' }}>
////                                                    <div className="text-truncate" title={po.description || 'No description'}>
////                                                        {po.description || 'No description'}
////                                                    </div>
////                                                </td>

////                                                <td>
////                                                    <div className="d-flex gap-1 flex-wrap">
////                                                        {po.status === 'pending' && (
////                                                            <>
////                                                                <Button
////                                                                    size="sm"
////                                                                    variant="success"
////                                                                    onClick={() => handleStatusUpdate(po.id, 'approved')}
////                                                                    disabled={loading && updatingId === po.id}
////                                                                    className="d-flex align-items-center"
////                                                                >
////                                                                    {loading && updatingId === po.id ? (
////                                                                        <Spinner animation="border" size="sm" className="me-1" />
////                                                                    ) : (
////                                                                        <i className="bi bi-check-circle me-1"></i>
////                                                                    )}
////                                                                    Approve
////                                                                </Button>

////                                                                <Button
////                                                                    size="sm"
////                                                                    variant="danger"
////                                                                    onClick={() => handleStatusUpdate(po.id, 'rejected')}
////                                                                    disabled={loading && updatingId === po.id}
////                                                                    className="d-flex align-items-center"
////                                                                >
////                                                                    {loading && updatingId === po.id ? (
////                                                                        <Spinner animation="border" size="sm" className="me-1" />
////                                                                    ) : (
////                                                                        <i className="bi bi-x-circle me-1"></i>
////                                                                    )}
////                                                                    Reject
////                                                                </Button>
////                                                            </>
////                                                        )}

////                                                        {po.status === 'approved' && (
////                                                            <Button
////                                                                size="sm"
////                                                                variant="info"
////                                                                onClick={() => handleStatusUpdate(po.id, 'completed')}
////                                                                disabled={loading && updatingId === po.id}
////                                                                className="d-flex align-items-center"
////                                                            >
////                                                                {loading && updatingId === po.id ? (
////                                                                    <Spinner animation="border" size="sm" className="me-1" />
////                                                                ) : (
////                                                                    <i className="bi bi-check-all me-1"></i>
////                                                                )}
////                                                                Complete
////                                                            </Button>
////                                                        )}

////                                                        {(po.status === 'rejected' || po.status === 'completed') && (
////                                                            <small className="pv-po-muted">No actions available</small>
////                                                        )}
////                                                    </div>
////                                                </td>
////                                            </tr>
////                                        );
////                                    })
////                                ) : (
////                                    <tr>
////                                        <td colSpan={isAdmin ? 8 : 7} className="text-center py-5">
////                                            <div className="pv-po-muted">
////                                                <i className="bi bi-inbox fs-1 d-block mb-2"></i>
////                                                No purchase orders found
////                                                {searchTerm && (
////                                                    <div className="mt-2">
////                                                        No results for "{searchTerm}"
////                                                    </div>
////                                                )}
////                                            </div>
////                                        </td>
////                                    </tr>
////                                )}
////                            </tbody>
////                        </Table>
////                    </div>
////                </Modal.Body>

////                {/* Footer */}
////                <Modal.Footer className="pv-po-modal-footer">
////                    <div className="d-flex justify-content-between w-100 align-items-center">
////                        <div className="pv-po-muted small">
////                            {selectedStatus === 'all'
////                                ? 'All statuses'
////                                : selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)
////                            } • {filteredOrders.length} records
////                        </div>

////                        <Button variant="secondary" onClick={onClose} className="px-4">
////                            Close
////                        </Button>
////                    </div>
////                </Modal.Footer>
////            </Modal>

////            {/* ----------------------------------------------------------------------------------
////                STYLE ONLY (GLASS + BLUR + GLOW + DROPDOWN FIX)
////                WHY THIS WORKS:
////                - Targets react-bootstrap internal markup: .modal-content / .modal-header / .modal-body / .modal-footer
////                - Does NOT rely on version-specific Modal props that can cause TS errors.
////                - Fixes white dropdown by styling both the <select> and <option> elements.
////            ---------------------------------------------------------------------------------- */}
////            <style>{`
////                /* Backdrop blur (works across versions) */
////                .pv-po-modal .modal-backdrop,
////                .modal-backdrop.show {
////                    backdrop-filter: blur(12px);
////                }

////                /* Glass modal surface */
////                .pv-po-modal .modal-content {
////                    font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
////                    color: #e9f2ff;

////                    background:
////                        radial-gradient(1200px 600px at 65% -10%, rgba(0, 102, 255, 0.25), rgba(0,0,0,0) 60%),
////                        linear-gradient(180deg, rgba(6,7,10,0.82) 0%, rgba(6,16,36,0.78) 55%, rgba(11,46,117,0.70) 100%);

////                    border: 1px solid rgba(255,255,255,0.14);
////                    border-radius: 18px;

////                    backdrop-filter: blur(18px);
////                    -webkit-backdrop-filter: blur(18px);

////                    box-shadow:
////                        0 20px 55px rgba(0,0,0,0.55),
////                        0 0 60px rgba(0,102,255,0.18),
////                        inset 0 1px 0 rgba(255,255,255,0.12);
////                }

////                /* Header */
////                .pv-po-modal-header {
////                    background: rgba(255,255,255,0.05);
////                    border-bottom: 1px solid rgba(255,255,255,0.10);
////                }

////                .pv-po-modal-title {
////                    font-weight: 800;
////                    letter-spacing: -0.02em;
////                    color: #e9f2ff;
////                }

////                /* Close button visibility */
////                .pv-po-modal .btn-close {
////                    filter: invert(1);
////                    opacity: 0.85;
////                }
////                .pv-po-modal .btn-close:hover {
////                    opacity: 1;
////                }

////                /* Filter bar */
////                .pv-po-filter-bar {
////                    background: rgba(0,0,0,0.18);
////                    border-bottom: 1px solid rgba(255,255,255,0.10);
////                }

////                .pv-po-subtitle {
////                    color: rgba(233,242,255,0.75);
////                    font-size: 0.85rem;
////                }

////                /* Inputs */
////                .pv-po-input,
////                .pv-po-select {
////                    background: rgba(255,255,255,0.06) !important;
////                    border: 1px solid rgba(255,255,255,0.16) !important;
////                    color: #e9f2ff !important;
////                    backdrop-filter: blur(10px);
////                }

////                .pv-po-input::placeholder {
////                    color: rgba(233,242,255,0.55);
////                }

////                .pv-po-input:focus,
////                .pv-po-select:focus {
////                    outline: none;
////                    border-color: rgba(51,153,255,0.9) !important;
////                    box-shadow: 0 0 14px rgba(0,153,255,0.35) !important;
////                }

////                /* ✅ Critical: Fix WHITE dropdown list items */
////                .pv-po-select option {
////                    background: #0b1226;   /* dark list background */
////                    color: #e9f2ff;        /* readable text */
////                }

////                /* Refresh button aligns with dashboard feel */
////                .pv-po-refresh {
////                    border-color: rgba(255,255,255,0.30);
////                }

////                /* Table wrapper */
////                .pv-po-table-wrap {
////                    max-height: 60vh;
////                    overflow-y: auto;
////                }

////                /* Table base */
////                .pv-po-table {
////                    color: #e9f2ff;
////                    --bs-table-bg: transparent;
////                    --bs-table-color: #e9f2ff;
////                    --bs-table-border-color: rgba(255,255,255,0.12);
////                }

////                .pv-po-thead th {
////                    background: rgba(0,0,0,0.35);
////                    color: rgba(233,242,255,0.85);
////                    font-weight: 700;
////                    border-bottom: 1px solid rgba(255,255,255,0.12);
////                }

////                .pv-po-row td {
////                    border-top: 1px solid rgba(255,255,255,0.08);
////                    vertical-align: middle;
////                }

////                .pv-po-table tbody tr:hover {
////                    background: rgba(255,255,255,0.06);
////                }

////                .pv-po-muted {
////                    color: rgba(233,242,255,0.65);
////                }

////                /* Footer */
////                .pv-po-modal-footer {
////                    background: rgba(255,255,255,0.05);
////                    border-top: 1px solid rgba(255,255,255,0.10);
////                }
////            `}</style>
////        </>
////    );
////};

////export default PurchaseOrdersModal;



//// =============================================================================
//// PayVerify — PurchaseOrdersModal.tsx
//// =============================================================================
////
//// PURPOSE
//// Displays all purchase orders with ability to:
//// • Approve / Reject / Complete orders
//// • Automatically create PaymentIntent when approved
//// • Automatically open PaymentRequestModal after approval
//// • Maintain dashboard glass styling
//// • Maintain full backward compatibility
////
//// CRITICAL NEW FEATURE
//// When admin clicks APPROVE:
////
//// BEFORE:
////   Approve → refresh → user sees nothing
////
//// NOW:
////   Approve → backend creates PaymentIntent → frontend opens PaymentRequestModal
////
//// This enables:
//// • QR generation
//// • Payment link sharing
//// • Customer payment flow
////
//// ZERO BREAKING CHANGES GUARANTEED
//// =============================================================================

//import React, { useState } from 'react';
//import {
//    Modal,
//    Button,
//    Table,
//    Badge,
//    Form,
//    Spinner
//} from 'react-bootstrap';

//import { toast } from 'react-toastify';

//import api from '../services/api';

//import { useAuth } from '../contexts/AuthContext';

//// ⭐ NEW IMPORT
//// WHY:
//// This modal displays QR + payment link after approval
//// Required for PaymentIntent integration
//import PaymentRequestModal from './PaymentRequestModal';


//// =============================================================================
//// Types
//// =============================================================================

//interface PurchaseOrder {

//    id: string;

//    poNumber: string;

//    merchantId: string;

//    merchantName?: string;

//    amount: number;

//    status:
//    | 'pending'
//    | 'approved'
//    | 'rejected'
//    | 'completed';

//    createdAt: string;

//    dueDate: string;

//    description?: string;
//}


//// ⭐ NEW TYPE
//// Represents backend PaymentIntent response
//interface PaymentIntent {

//    id: string;

//    payment_link: string;

//    qr_url: string;

//    amount: number;

//    status: string;
//}


//interface PurchaseOrdersModalProps {

//    open: boolean;

//    onClose: () => void;

//    purchaseOrders: PurchaseOrder[];

//    onRefresh: () => void;

//    isAdmin: boolean;
//}


//// =============================================================================
//// Component
//// =============================================================================

//const PurchaseOrdersModal: React.FC<PurchaseOrdersModalProps> = ({

//    open,

//    onClose,

//    purchaseOrders,

//    onRefresh,

//    isAdmin

//}) => {

//    const { token } = useAuth();


//    // =============================================================================
//    // EXISTING STATE (NO CHANGE)
//    // =============================================================================

//    const [loading, setLoading] =
//        useState(false);

//    const [selectedStatus, setSelectedStatus] =
//        useState<string>('all');

//    const [searchTerm, setSearchTerm] =
//        useState('');

//    const [updatingId, setUpdatingId] =
//        useState<string | null>(null);


//    // =============================================================================
//    // ⭐ NEW STATE — PaymentIntent Integration
//    // =============================================================================
//    //
//    // WHY:
//    // When Purchase Order is approved,
//    // backend returns paymentIntent.
//    //
//    // We store it here and open modal.
//    //

//    const [paymentIntent, setPaymentIntent] =
//        useState<PaymentIntent | null>(null);

//    const [paymentModalOpen, setPaymentModalOpen] =
//        useState(false);


//    // =============================================================================
//    // Status badge helper
//    // =============================================================================

//    const getStatusBadge = (status: string) => {

//        switch (status) {

//            case 'pending':
//                return <Badge bg="warning">Pending</Badge>;

//            case 'approved':
//                return <Badge bg="success">Approved</Badge>;

//            case 'rejected':
//                return <Badge bg="danger">Rejected</Badge>;

//            case 'completed':
//                return <Badge bg="info">Completed</Badge>;

//            default:
//                return <Badge bg="secondary">{status}</Badge>;
//        }
//    };


//    // =============================================================================
//    // ⭐ UPDATED FUNCTION — handleStatusUpdate
//    // =============================================================================
//    //
//    // WHAT CHANGED:
//    // We now capture paymentIntent from backend response.
//    //
//    // BEFORE:
//    //   Only updated status
//    //
//    // NOW:
//    //   Updates status
//    //   Opens PaymentRequestModal automatically
//    //
//    // SAFE:
//    //   Does NOT break reject/complete flows
//    //

//    const handleStatusUpdate = async (

//        poId: string,

//        newStatus: string

//    ) => {

//        if (!token) return;

//        try {

//            setUpdatingId(poId);

//            setLoading(true);

//            const response =
//                await api.put(
//                    `/purchase-orders/${poId}/status`,
//                    { status: newStatus },
//                    {
//                        headers: {
//                            Authorization: `Bearer ${token}`
//                        }
//                    }
//                );

//            toast.success(
//                `Purchase order ${newStatus} successfully`
//            );


//            // =============================================================================
//            // ⭐ CRITICAL NEW LOGIC
//            //
//            // If backend returned paymentIntent,
//            // open payment modal automatically.
//            // =============================================================================

//            if (response.data?.paymentIntent) {

//                setPaymentIntent(
//                    response.data.paymentIntent
//                );

//                setPaymentModalOpen(true);
//            }


//            // Refresh table (existing behavior preserved)
//            onRefresh();

//        }
//        catch (error: any) {

//            console.error(error);

//            toast.error(
//                error.response?.data?.message ||
//                "Failed to update purchase order status"
//            );
//        }
//        finally {

//            setLoading(false);

//            setUpdatingId(null);
//        }
//    };


//    // =============================================================================
//    // Filtering logic (NO CHANGE)
//    // =============================================================================

//    const filteredOrders = purchaseOrders.filter(po => {

//        const matchesStatus =
//            selectedStatus === 'all' ||
//            po.status === selectedStatus;

//        const matchesSearch =
//            !searchTerm ||
//            po.poNumber.toLowerCase()
//                .includes(searchTerm.toLowerCase()) ||
//            po.description?.toLowerCase()
//                .includes(searchTerm.toLowerCase());

//        return matchesStatus && matchesSearch;
//    });


//    const formatCurrency = (amount: number) =>
//        `₦${amount?.toLocaleString()}`;


//    const formatDate = (dateString: string) =>
//        new Date(dateString)
//            .toLocaleDateString('en-NG');



//    // =============================================================================
//    // Render
//    // =============================================================================

//    return (

//        <>
//            {/* ================================================================
//               MAIN PURCHASE ORDER MODAL
//            ================================================================ */}

//            <Modal
//                show={open}
//                onHide={onClose}
//                size="xl"
//                centered
//                backdrop="static"
//                className="pv-po-modal"
//            >

//                <Modal.Header closeButton>

//                    <Modal.Title>

//                        Purchase Orders

//                    </Modal.Title>

//                </Modal.Header>


//                <Modal.Body>

//                    {/* Filters */}

//                    <div className="mb-3">

//                        <Form.Control
//                            placeholder="Search..."
//                            value={searchTerm}
//                            onChange={(e) =>
//                                setSearchTerm(e.target.value)
//                            }
//                        />

//                    </div>


//                    {/* Table */}

//                    <Table hover>

//                        <thead>

//                            <tr>

//                                <th>PO</th>

//                                {isAdmin &&
//                                    <th>Merchant</th>
//                                }

//                                <th>Amount</th>

//                                <th>Status</th>

//                                <th>Created</th>

//                                <th>Actions</th>

//                            </tr>

//                        </thead>

//                        <tbody>

//                            {filteredOrders.map(po => (

//                                <tr key={po.id}>

//                                    <td>
//                                        PO-{po.poNumber}
//                                    </td>

//                                    {isAdmin &&
//                                        <td>
//                                            {po.merchantName}
//                                        </td>
//                                    }

//                                    <td>
//                                        {formatCurrency(po.amount)}
//                                    </td>

//                                    <td>
//                                        {getStatusBadge(po.status)}
//                                    </td>

//                                    <td>
//                                        {formatDate(po.createdAt)}
//                                    </td>

//                                    <td>

//                                        {po.status === 'pending' && (

//                                            <>
//                                                <Button
//                                                    size="sm"
//                                                    variant="success"
//                                                    onClick={() =>
//                                                        handleStatusUpdate(
//                                                            po.id,
//                                                            'approved'
//                                                        )
//                                                    }
//                                                >
//                                                    Approve
//                                                </Button>

//                                                <Button
//                                                    size="sm"
//                                                    variant="danger"
//                                                    onClick={() =>
//                                                        handleStatusUpdate(
//                                                            po.id,
//                                                            'rejected'
//                                                        )
//                                                    }
//                                                >
//                                                    Reject
//                                                </Button>
//                                            </>
//                                        )}

//                                    </td>

//                                </tr>

//                            ))}

//                        </tbody>

//                    </Table>

//                </Modal.Body>


//                <Modal.Footer>

//                    <Button onClick={onClose}>
//                        Close
//                    </Button>

//                </Modal.Footer>

//            </Modal>


//            {/* ================================================================
//               ⭐ NEW PAYMENT REQUEST MODAL
//               ================================================================

//               WHY:
//               This opens automatically after approval.

//               This enables:

//               • QR code
//               • Payment link
//               • Copy link
//               • Download QR

//            ================================================================ */}

//            <PaymentRequestModal

//                open={paymentModalOpen}

//                onClose={() =>
//                    setPaymentModalOpen(false)
//                }

//                paymentIntent={paymentIntent}

//            />

//        </>
//    );
//};


//export default PurchaseOrdersModal;



import React, { useState } from 'react';
import { Modal, Button, Table, Badge, Form, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

/**
 * 🔥 NEW IMPORT
 * WHY:
 * - We want to trigger PaymentRequestModal automatically after PO approval
 * - Reusing existing component = NO breaking change
 */
import PaymentRequestModal from './PaymentRequestModal';

interface PurchaseOrder {
    id: string;
    poNumber: string;
    merchantId: string;
    merchantName?: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    createdAt: string;
    dueDate: string;
    description?: string;
    items?: Array<{
        name: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }>;
}

interface PurchaseOrdersModalProps {
    open: boolean;
    onClose: () => void;
    purchaseOrders: PurchaseOrder[];
    onRefresh: () => void;
    isAdmin: boolean;
}

const PurchaseOrdersModal: React.FC<PurchaseOrdersModalProps> = ({
    open,
    onClose,
    purchaseOrders,
    onRefresh,
    isAdmin
}) => {

    const { token } = useAuth();

    const [loading, setLoading] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    /**
     * ============================================================
     * 🔥 NEW STATE
     * ============================================================
     * WHY:
     * - To store PaymentIntent returned from backend
     * - To trigger PaymentRequestModal automatically
     * ============================================================
     */
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedPaymentIntent, setSelectedPaymentIntent] = useState<any>(null);

    // ------------------------------------------------------------
    // Status badge helper (UNCHANGED)
    // ------------------------------------------------------------
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return <Badge bg="warning">Pending</Badge>;
            case 'approved': return <Badge bg="success">Approved</Badge>;
            case 'rejected': return <Badge bg="danger">Rejected</Badge>;
            case 'completed': return <Badge bg="info">Completed</Badge>;
            default: return <Badge bg="secondary">{status}</Badge>;
        }
    };

    // ------------------------------------------------------------
    // 🔥 UPDATED: handleStatusUpdate
    // ------------------------------------------------------------
    const handleStatusUpdate = async (poId: string, newStatus: string) => {
        if (!token) return;

        try {
            setUpdatingId(poId);
            setLoading(true);

            /**
             * ============================================================
             * 🔥 CHANGE 1: Capture API response
             * ============================================================
             * WHY:
             * - Backend now returns `paymentIntent`
             * - We need it to open modal with correct data
             */
            const response = await api.put(
                `/purchase-orders/${poId}/status`,
                { status: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success(`Purchase order ${newStatus} successfully`);
            onRefresh();

            /**
             * ============================================================
             * 🔥 CHANGE 2: Auto open PaymentRequestModal
             * ============================================================
             * WHY:
             * - New architecture requires modal immediately after approval
             * - No extra API calls needed (data already returned)
             */
            if (newStatus === 'approved') {

                const paymentIntent = response.data.paymentIntent;

                if (paymentIntent) {

                    // Store data for modal
                    setSelectedPaymentIntent(paymentIntent);

                    // Open modal
                    setShowPaymentModal(true);
                }
            }

        } catch (error: any) {
            console.error('Failed to update status:', error);
            toast.error(error.response?.data?.message || 'Failed to update purchase order status');
        } finally {
            setLoading(false);
            setUpdatingId(null);
        }
    };

    // ------------------------------------------------------------
    // Filtering (UNCHANGED)
    // ------------------------------------------------------------
    const filteredOrders = purchaseOrders.filter(po => {
        const matchesStatus = selectedStatus === 'all' || po.status === selectedStatus;
        const matchesSearch =
            !searchTerm ||
            po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (po.merchantName && po.merchantName.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (po.description && po.description.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesStatus && matchesSearch;
    });

    const formatCurrency = (amount: number) =>
        `₦${amount?.toLocaleString() || '0'}`;

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid date';
            return date.toLocaleDateString('en-NG', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        } catch {
            return 'Invalid date';
        }
    };

    const calculateDaysUntilDue = (dueDate: string) => {
        try {
            const due = new Date(dueDate);
            const today = new Date();
            const diffTime = due.getTime() - today.getTime();
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        } catch {
            return null;
        }
    };

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

                    {/* Filters */}
                    <div className="mb-3 d-flex gap-2">
                        <Form.Control
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />

                        <Form.Select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                        >
                            <option value="all">All</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="completed">Completed</option>
                        </Form.Select>

                        <Button onClick={onRefresh}>Refresh</Button>
                    </div>

                    {/* Table */}
                    <Table hover>
                        <thead>
                            <tr>
                                <th>PO Number</th>
                                {isAdmin && <th>Merchant</th>}
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Due Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredOrders.map(po => (
                                <tr key={po.id}>
                                    <td>PO-{po.poNumber}</td>

                                    {isAdmin && <td>{po.merchantName}</td>}

                                    <td>{formatCurrency(po.amount)}</td>
                                    <td>{getStatusBadge(po.status)}</td>
                                    <td>{formatDate(po.createdAt)}</td>
                                    <td>{formatDate(po.dueDate)}</td>

                                    <td>
                                        {po.status === 'pending' && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleStatusUpdate(po.id, 'approved')}
                                                >
                                                    Approve
                                                </Button>

                                                <Button
                                                    size="sm"
                                                    variant="danger"
                                                    onClick={() => handleStatusUpdate(po.id, 'rejected')}
                                                >
                                                    Reject
                                                </Button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>

                </Modal.Body>

                <Modal.Footer>
                    <Button onClick={onClose}>Close</Button>
                </Modal.Footer>
            </Modal>

            {/* ============================================================
                🔥 NEW: PaymentRequestModal Integration
                ============================================================
                WHY:
                - Automatically opens after PO approval
                - Uses backend-returned PaymentIntent
                - No additional API calls needed
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
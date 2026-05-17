import { useEffect, useState } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

/**
 * Types for API data
 */
type PurchaseOrderItem = {
    id: number;
    itemName: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
};

type PurchaseOrder = {
    id: number;
    poReference: string;
    customerEmail?: string;
    status: string;
    totalAmount: number;
    createdAt: string;
    items: PurchaseOrderItem[];
};

type Props = {
    merchantId: number | null;
    token?: string;
};

/**
 * PurchaseOrderList
 *
 * Responsibility:
 * - Fetch purchase orders for a merchant
 * - Render a table
 * - Expand to show line items
 *
 * SRP: Only handles listing POs (not creating them)
 */
export default function PurchaseOrderList({ merchantId, token }: Props) {
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    /**
     * Load purchase orders from backend
     */
    const loadOrders = async () => {
        if (!merchantId) return;

        try {
            setLoading(true);

            const res = await api.get(`/purchase-orders/${merchantId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });

            setOrders(res.data || []);
        } catch (err: any) {
            console.error(err);
            toast.error(err?.response?.data?.message || 'Failed to load purchase orders');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Load when merchantId changes
     */
    useEffect(() => {
        loadOrders();
    }, [merchantId]);

    return (
        <div className="pv-glass-card mt-4">
            <div className="pv-card-body">
                <h5 className="mb-3">Purchase Orders</h5>

                {loading && <p className="text-muted">Loading purchase orders…</p>}

                {!loading && orders.length === 0 && (
                    <p className="text-muted">No purchase orders yet.</p>
                )}

                {orders.length > 0 && (
                    <div className="table-responsive">
                        <table className="table table-dark table-hover align-middle">
                            <thead>
                                <tr>
                                    <th>PO Ref</th>
                                    <th>Customer</th>
                                    <th>Status</th>
                                    <th>Total (₦)</th>
                                    <th>Date</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((po) => (
                                    <>
                                        {/* Main PO row */}
                                        <tr key={po.id}>
                                            <td>{po.poReference}</td>
                                            <td>{po.customerEmail || '—'}</td>
                                            <td>
                                                <span className="badge bg-secondary">{po.status}</span>
                                            </td>
                                            <td>{Number(po.totalAmount).toLocaleString()}</td>
                                            <td>{new Date(po.createdAt).toLocaleDateString()}</td>
                                            <td>
                                                <button
                                                    className="btn btn-sm btn-outline-light"
                                                    onClick={() =>
                                                        setExpandedId(expandedId === po.id ? null : po.id)
                                                    }
                                                >
                                                    {expandedId === po.id ? 'Hide Items' : 'View Items'}
                                                </button>
                                            </td>
                                        </tr>

                                        {/* Expanded line items */}
                                        {expandedId === po.id && (
                                            <tr>
                                                <td colSpan={6}>
                                                    <div className="p-2">
                                                        <table className="table table-sm table-bordered table-dark mb-0">
                                                            <thead>
                                                                <tr>
                                                                    <th>Item</th>
                                                                    <th>Description</th>
                                                                    <th>Qty</th>
                                                                    <th>Unit ₦</th>
                                                                    <th>Line Total ₦</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {po.items.map((item) => (
                                                                    <tr key={item.id}>
                                                                        <td>{item.itemName}</td>
                                                                        <td>{item.description || '—'}</td>
                                                                        <td>{item.quantity}</td>
                                                                        <td>{Number(item.unitPrice).toLocaleString()}</td>
                                                                        <td>{Number(item.lineTotal).toLocaleString()}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

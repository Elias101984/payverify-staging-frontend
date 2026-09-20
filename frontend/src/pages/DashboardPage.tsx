// src/pages/DashboardPage.tsx
// -------------------------------------------------------------------------------------------------
// PayVerify Dashboard (Dark Gloss / Glass Theme) + Merchants Tile (Modal) + Purchase Orders
// -------------------------------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { Badge } from 'react-bootstrap';
import {
    OFFLINE_QUEUE_EVENT,
    getOfflineOrderCount,
    syncOfflineOrders,
} from '../services/offlineOrderQueue';

// Admin-only panel
import AdminBanksPanel from '../components/AdminBanksPanel';

// Modals
import MerchantsModal from '../components/MerchantsModal';
import PurchaseOrdersModal from '../components/PurchaseOrdersModal';
import CreatePurchaseOrderModal from '../components/CreatePurchaseOrderModal'; // ADDED: Import CreatePurchaseOrderModal
import PaymentRequestModal from '../components/PaymentRequestModal';
import SettlementCelebration, {
    SettlementCelebrationOrder,
} from '../components/SettlementCelebration';
import OperationsCenterModal, {
    DashboardOperations,
    emptyDashboardOperations,
} from '../components/OperationsCenterModal';

// -----------------------------
// Types
// -----------------------------
type BasicStats = {
    total: number;
    pending: number;
    completed: number;
    sum: number;
};

type Tiles = {
    gmvTotal: number;
    aov: number;
    successRate: number;      // percent 0–100
    pending: number;
    gmvToday: number;
    gmvMonthToDate: number;
    highValueMonthCount: number;
    fraudScore: number;       // 0–100
};

// Purchase Order Type (aligned with backend response)
interface PurchaseOrder {
    id: string;
    poNumber: string;
    poReference?: string;
    amount: number;
    totalAmount?: number;
    status: 'pending' | 'approved' | 'rejected' | 'completed' | 'paid' | 'cancelled';
    createdAt: string;
    dueDate: string;
    description?: string;
    merchantName?: string;
    merchantId: string; // Made required to match PurchaseOrdersModal
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    paymentStatus?: string;
    settlementStatus?: string | null;
    settlementId?: number | null;
    settlementAmountKobo?: number | null;
    settlementDate?: string | null;
    settlementCheckedAt?: string | null;
    items?: Array<{
        id: string;
        name: string;
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }>;
}

interface PurchaseOrdersStats {
    totalOrders: number;
    pendingOrders: number;
    approvedOrders: number;
    rejectedOrders?: number;
    completedOrders?: number;
    totalAmount: number;
    pendingAmount: number;
}

// Endpoint sometimes returns { tiles, events }, sometimes flat (just tiles)
type TilesResponse = { tiles?: Tiles; events?: any[] } | Tiles;

// -----------------------------
// Helpers (null-safe formatters)
// -----------------------------

/** numeric coercion that never throws or yields NaN */
const asNum = (v: unknown) => {
    const n = Number((v as any) ?? 0);
    return Number.isFinite(n) ? n : 0;
};

const fmtMoney = (v: unknown) => `₦${asNum(v).toLocaleString()}`;
const fmtInt = (v: unknown) => asNum(v).toLocaleString();
const fmtPct = (v: unknown) => `${asNum(v)}%`;

/** Safer token check (also avoids throwing on malformed token) */
const isTokenExpired = (jwt: string): boolean => {
    try {
        const payload = JSON.parse(atob(jwt.split('.')[1]));
        return payload.exp * 1000 < Date.now();
    } catch {
        return true;
    }
};

const isSettledStatus = (status: unknown) =>
    ['success', 'settled', 'succeeded', 'completed'].includes(
        String(status || '').toLowerCase()
    );

const DashboardPage = () => {
    const { token, logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation() as any;

    const [stats, setStats] = useState<BasicStats | null>(null);
    const [tiles, setTiles] = useState<Tiles | null>(null);
    const [loading, setLoading] = useState(true);

    // Purchase Orders state
    const [poStats, setPoStats] = useState<PurchaseOrdersStats | null>(null);
    const [recentPurchaseOrders, setRecentPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [showPurchaseOrdersModal, setShowPurchaseOrdersModal] = useState(false);
    const [allPurchaseOrders, setAllPurchaseOrders] = useState<PurchaseOrder[]>([]);

    // ADDED: State for Create Purchase Order Modal
    const [showCreatePurchaseOrderModal, setShowCreatePurchaseOrderModal] = useState(false);
    const [showCreatedPaymentModal, setShowCreatedPaymentModal] = useState(false);
    const [createdPaymentIntent, setCreatedPaymentIntent] = useState<any>(null);

    // Refunds, disputes and cancellations are grouped into one operational view
    // so the dashboard does not need three more permanent cards.
    const [operations, setOperations] = useState<DashboardOperations>(emptyDashboardOperations);
    const [operationsOpen, setOperationsOpen] = useState(false);
    const [operationsLoading, setOperationsLoading] = useState(false);

    // Offline order outbox state.  Payment truth remains server-side; this
    // only tracks locally captured orders waiting to reach the API.
    const [isOnline, setIsOnline] = useState(
        () => typeof navigator === 'undefined' || navigator.onLine
    );
    const [offlineQueueCount, setOfflineQueueCount] = useState(0);
    const [offlineSyncing, setOfflineSyncing] = useState(false);

    // Keep a stable interval id across renders for auto-refresh
    const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);

    // 🔥 NEW: track completed count to detect new payments
    const prevCompletedRef = useRef<number>(0);

    // Track settlement transitions so a 15-second refresh celebrates only the
    // first false -> true change for an order, not every dashboard render.
    const previousSettlementByOrderRef = useRef<Map<string, boolean>>(new Map());
    const settlementBaselineReadyRef = useRef(false);
    const [settlementCelebrationOrder, setSettlementCelebrationOrder] =
        useState<SettlementCelebrationOrder | null>(null);

    // ---------------------------------------------------------
    // Merchants UI state (modal visibility + count on tile)
    // ---------------------------------------------------------
    const [merchantsOpen, setMerchantsOpen] = useState(false);
    const [merchantsCount, setMerchantsCount] = useState<number | null>(null);

    // -----------------------------
    // One-off toast passed via navigation state (e.g., post-login)
    // -----------------------------
    useEffect(() => {
        const msg = location?.state?.toast as string | undefined;
        if (msg) {
            toast.success(msg);
            // prevent replaying on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location?.state]);

    // -----------------------------
    // Role & Display Name (no first/last name dependency)
    // -----------------------------
    const isAdmin = useMemo(
        () => (user?.role || '').toLowerCase() === 'admin',
        [user?.role]
    );

    // Robust display name using common fields, then email handle, then "User"
    const displayName = useMemo(() => {
        const u = (user as any) ?? {};
        const candidates = [
            u.name,            // most common
            u.displayName,     // sometimes used
            u.username,        // alternative field
            u.merchant?.name,  // merchant-owned accounts
            u.profile?.name,   // nested profile objects
            typeof u.email === 'string' ? u.email.split('@')[0] : undefined, // email handle
        ].filter((v: unknown) => typeof v === 'string' && v.trim().length > 0) as string[];

        return candidates[0] ?? 'User';
    }, [user]);

    // ---------------------------------------------------------
    // Role-aware merchants count with graceful fallback
    // ---------------------------------------------------------
    const fetchMerchantsCount = async () => {
        if (!token) return;
        try {
            const scope = isAdmin ? 'all' : 'mine';

            // Preferred: dedicated count endpoint
            const res = await api.get(`/merchants/count?scope=${scope}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (typeof res?.data?.count === 'number') {
                setMerchantsCount(res.data.count);
                return;
            }

            // Fallback: listing endpoint; use header if exposed by server
            const listRes = await api.get(`/merchants?scope=${scope}&limit=1`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const hdrCount = Number(listRes.headers?.['x-total-count']);
            if (Number.isFinite(hdrCount)) {
                setMerchantsCount(hdrCount);
            } else if (Array.isArray(listRes.data)) {
                setMerchantsCount(listRes.data.length);
            } else {
                setMerchantsCount(null);
            }
        } catch (err) {
            console.error('Failed to fetch merchants count', err);
            setMerchantsCount(null); // keep UI usable
        }
    };

    // ---------------------------------------------------------
    // Fetch Purchase Orders Stats and Recent Orders
    // ---------------------------------------------------------
    const fetchPurchaseOrdersStats = async () => {
        if (!token) return;
        try {
            // Fetch PO stats - updated to match backend response structure
            const statsRes = await api.get('/purchase-orders/stats', {
                headers: { Authorization: `Bearer ${token}` },
            });

            // Handle both response formats
            const responseData = statsRes.data || {};

            // Supports:
            // { success: true, data: stats }
            // { stats: stats }
            // or a flat stats response
            const statsData =
                responseData.data ||
                responseData.stats ||
                responseData;

            setPoStats({
                totalOrders:
                    asNum(statsData.totalOrders) ||
                    asNum(statsData.total),

                pendingOrders:
                    asNum(statsData.pending) ||
                    asNum(statsData.pendingOrders),

                approvedOrders:
                    asNum(statsData.approved) ||
                    asNum(statsData.approvedOrders),

                rejectedOrders:
                    asNum(statsData.rejected) ||
                    asNum(statsData.rejectedOrders),

                completedOrders:
                    asNum(statsData.completed) ||
                    asNum(statsData.completedOrders),

                // The updated service returns totalValue.
                totalAmount:
                    asNum(statsData.totalValue) ||
                    asNum(statsData.totalAmount),

                pendingAmount:
                    asNum(statsData.pendingAmount),
            });

            // Fetch recent purchase orders
            const recentRes = await api.get('/purchase-orders', {
                headers: { Authorization: `Bearer ${token}` },
            });

            const orders =
                recentRes.data?.data ??
                recentRes.data ??
                [];

            /*setRecentPurchaseOrders(orders.slice(0, 5));*/
            setRecentPurchaseOrders(
                orders.slice(0, 5).map((po: any) => ({
                    ...po,
                    poNumber:
                        po.poNumber ||
                        po.po_number ||
                        po.po_reference ||
                        po.reference ||
                        po.id ||
                        "",
                    amount:
                        po.amount ||
                        po.totalAmount ||
                        po.total_amount ||
                        0,
                    merchantName:
                        po.merchantName ||
                        po.merchant?.name ||
                        "N/A",
                }))
            );

            // Fetch all purchase orders for the modal
            const allRes = await api.get('/purchase-orders', {
                headers: { Authorization: `Bearer ${token}` },
            });

            // Handle paginated or direct array response
            const allOrdersData = allRes.data || {};
            const ordersArray = allOrdersData.data || allOrdersData;
            const normalizedOrders = Array.isArray(ordersArray) ? ordersArray : [];

            const nextSettlementByOrder = new Map<string, boolean>();
            let newlySettledOrder: SettlementCelebrationOrder | null = null;

            normalizedOrders.forEach((order: any) => {
                const orderId = String(
                    order.id ||
                    order.poNumber ||
                    order.poReference ||
                    ''
                );

                if (!orderId) return;

                const paymentIsPaid =
                    String(order.paymentStatus || '').toLowerCase() === 'paid' ||
                    String(order.status || '').toLowerCase() === 'paid';
                const settled = paymentIsPaid && isSettledStatus(
                    order.settlementStatus || order.settlement_status
                );

                nextSettlementByOrder.set(orderId, settled);

                const wasSettled =
                    previousSettlementByOrderRef.current.get(orderId);

                if (
                    settled &&
                    !newlySettledOrder &&
                    // Show the celebration for an already-settled order on
                    // initial browser load as well as for later transitions.
                    ((!settlementBaselineReadyRef.current && wasSettled === undefined) ||
                        (settlementBaselineReadyRef.current && wasSettled === false))
                ) {
                    newlySettledOrder = {
                        id: order.id || orderId,
                        poNumber:
                            order.poNumber ||
                            order.poReference ||
                            order.po_reference,
                        customerName: order.customerName,
                        amount: asNum(order.amount ?? order.totalAmount),
                        totalAmount: asNum(order.totalAmount ?? order.amount),
                        settlementId:
                            order.settlementId ?? order.settlement_id ?? null,
                        settlementDate:
                            order.settlementDate ?? order.settlement_date ?? null,
                    };
                }
            });

            previousSettlementByOrderRef.current = nextSettlementByOrder;
            if (!settlementBaselineReadyRef.current) {
                settlementBaselineReadyRef.current = true;
            } else if (newlySettledOrder) {
                setSettlementCelebrationOrder(newlySettledOrder);
            }

            setAllPurchaseOrders(normalizedOrders);

        } catch (err) {
            console.error('Failed to fetch purchase orders data:', err);
            // Set default empty stats to prevent UI breakage
            setPoStats({
                totalOrders: 0,
                pendingOrders: 0,
                approvedOrders: 0,
                rejectedOrders: 0,
                completedOrders: 0,
                totalAmount: 0,
                pendingAmount: 0
            });
            setRecentPurchaseOrders([]);
            setAllPurchaseOrders([]);
        }
    };

    const fetchOperations = async () => {
        if (!token) return;
        try {
            setOperationsLoading(true);
            const response = await api.get<DashboardOperations>('/dashboard/operations', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setOperations(response.data);
        } catch (error) {
            // Operational tables may be empty during a fresh local setup. Keep
            // the rest of the dashboard available while surfacing safe zeros.
            console.error('Failed to fetch dashboard operations:', error);
            setOperations(emptyDashboardOperations);
        } finally {
            setOperationsLoading(false);
        }
    };

    const refreshOfflineQueueStatus = async () => {
        try {
            setOfflineQueueCount(await getOfflineOrderCount());
        } catch (error) {
            console.error('Failed to read offline order queue:', error);
        }
    };

    const syncQueuedOrders = async () => {
        if (!token || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
            await refreshOfflineQueueStatus();
            return;
        }

        setOfflineSyncing(true);
        try {
            const result = await syncOfflineOrders(api, token);
            setOfflineQueueCount(result.remaining);

            if (result.synced > 0) {
                toast.success(
                    `${result.synced} offline order${result.synced === 1 ? '' : 's'} synced. Payment still needs server confirmation.`
                );
                await fetchPurchaseOrdersStats();
            }

            if (result.failed > 0) {
                toast.error(
                    `${result.failed} offline order${result.failed === 1 ? '' : 's'} need${result.failed === 1 ? 's' : ''} attention before syncing.`
                );
            }
        } catch (error) {
            console.error('Offline order sync failed:', error);
        } finally {
            setOfflineSyncing(false);
            await refreshOfflineQueueStatus();
        }
    };

    // -----------------------------
    // Status badge helper for Purchase Orders
    // -----------------------------
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge bg="warning">Pending</Badge>;

            case 'approved':
                return <Badge bg="success">Ready for payment</Badge>;

            case 'paid': // ✅ ADD THIS
                return <Badge bg="primary">PAID</Badge>;

            case 'rejected':
                return <Badge bg="danger">Rejected</Badge>;

            case 'completed':
                return <Badge bg="info">Completed</Badge>;

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

    const getCustomerLabel = (po: PurchaseOrder) =>
        po.customerName?.trim() ||
        po.customerPhone?.trim() ||
        po.customerEmail?.trim() ||
        'Walk-in customer';

    const getSettlementStatusBadge = (po: PurchaseOrder) => {
        if ((po.paymentStatus || '').toLowerCase() !== 'paid') {
            return <span className="text-light opacity-50">—</span>;
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

    // -----------------------------
    // Format date for display
    // -----------------------------
    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString('en-NG', {
                day: 'numeric',
                month: 'short'
            });
        } catch {
            return 'Invalid date';
        }
    };

    // -----------------------------
    // Refresh handler for purchase orders modal
    // -----------------------------
    const handleRefreshPurchaseOrders = async () => {
        await fetchPurchaseOrdersStats();
        toast.success('Purchase orders refreshed');
    };

    // ADDED: Refresh function for after creating a new PO
    const refreshAllPurchaseOrders = async () => {
        await fetchPurchaseOrdersStats();
    };

    // -----------------------------
    // Transform purchase order data for modal
    // -----------------------------
    const transformPurchaseOrdersForModal = (orders: PurchaseOrder[]): any[] => {
        return orders.map(order => ({
            ...order,
            // Ensure all required fields are present for the modal
            id: order.id,
            poNumber: order.poNumber || order.poReference || '',
            amount: order.amount || order.totalAmount || 0,
            status: order.status || 'pending',
            createdAt: order.createdAt,
            dueDate: order.dueDate,
            description: order.description || '',
            paymentStatus: order.paymentStatus,
            settlementStatus: order.settlementStatus,
            settlementId: order.settlementId,
            settlementAmountKobo: order.settlementAmountKobo,
            settlementDate: order.settlementDate,
            settlementCheckedAt: order.settlementCheckedAt,
            merchantName: order.merchantName || '',
            merchantId: order.merchantId || '',
        }));
    };

    // Keep the connectivity badge and queue count current.  Reconnect sync is
    // intentionally merchant-scoped and sequential so each replay preserves
    // order and uses the server idempotency key.
    useEffect(() => {
        const handleOffline = () => {
            setIsOnline(false);
            void refreshOfflineQueueStatus();
        };

        const handleOnline = () => {
            setIsOnline(true);
            void syncQueuedOrders();
        };

        const handleQueueChange = () => {
            void refreshOfflineQueueStatus();
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);
        window.addEventListener(OFFLINE_QUEUE_EVENT, handleQueueChange);

        void refreshOfflineQueueStatus();
        if (typeof navigator === 'undefined' || navigator.onLine) {
            void syncQueuedOrders();
        }

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener(OFFLINE_QUEUE_EVENT, handleQueueChange);
        };
    }, [token]);

    // -----------------------------
    // Initial load + auto-refresh
    // -----------------------------
    useEffect(() => {
        if (!token || isTokenExpired(token)) {
            // If token is missing/expired, clear session and redirect
            logout();
            navigate('/expired', { replace: true });
            return;
        }

        const fetchALL = async () => {
            try {
                setLoading(true);

                // Legacy dashboard stats
                const res = await api.get('/dashboard', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setStats(res.data as BasicStats);

                // 🔥 NEW: Detect new payment confirmation
                const newCompleted = res.data.completed;

                if (
                    prevCompletedRef.current !== 0 &&
                    newCompleted > prevCompletedRef.current
                ) {
                    const diff = newCompleted - prevCompletedRef.current;

                    toast.success(`🔔 ${diff} New payment confirmation alert`);

                    // Refresh purchase orders immediately
                    await fetchPurchaseOrdersStats();
                }

                prevCompletedRef.current = newCompleted;

                // Analytics tiles (normalize payload)
                const tilesRes = await api.get<TilesResponse>('/analytics/tiles', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const t = (tilesRes.data as any)?.tiles ?? (tilesRes.data as Tiles);
                setTiles({
                    gmvTotal: asNum(t?.gmvTotal),
                    aov: asNum(t?.aov),
                    successRate: asNum(t?.successRate),
                    pending: asNum(t?.pending),
                    gmvToday: asNum(t?.gmvToday),
                    gmvMonthToDate: asNum(t?.gmvMonthToDate),
                    highValueMonthCount: asNum(t?.highValueMonthCount),
                    fraudScore: asNum(t?.fraudScore),
                });

                // Refresh merchants count
                await fetchMerchantsCount();

                // Refresh purchase orders data
                await fetchPurchaseOrdersStats();

                // Refresh operational exceptions without adding more KPI calls
                // from separate cards.
                await fetchOperations();

            } catch (err: any) {
                console.error(err);
                if (err?.response?.status === 401) {
                    toast.error('Session expired. Please log in again.');
                    logout();
                    navigate('/expired', { replace: true });
                } else {
                    toast.error(err?.response?.data?.message ?? 'Failed to load dashboard.');
                }
            } finally {
                setLoading(false);
            }
        };

        // Kick off fetching
        fetchALL();

        //// Auto-refresh every 60s; store id in ref
        //refreshTimer.current = setInterval(fetchALL, 60000);

        refreshTimer.current = setInterval(async () => {
            await fetchPurchaseOrdersStats();
        }, 15000);

        // Cleanup interval on unmount
        return () => {
            if (refreshTimer.current) clearInterval(refreshTimer.current);
            refreshTimer.current = null;
        };
    }, [token, logout, navigate, isAdmin]);

    // -----------------------------
    // Manual refresh handler
    // -----------------------------
    const handleManualRefresh = async () => {
        if (!token) return;
        try {
            setLoading(true);
            const [res, tilesRes] = await Promise.all([
                api.get('/dashboard', { headers: { Authorization: `Bearer ${token}` } }),
                api.get<TilesResponse>('/analytics/tiles', { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            setStats(res.data as BasicStats);

            const t = (tilesRes.data as any)?.tiles ?? (tilesRes.data as Tiles);
            setTiles({
                gmvTotal: asNum(t?.gmvTotal),
                aov: asNum(t?.aov),
                successRate: asNum(t?.successRate),
                pending: asNum(t?.pending),
                gmvToday: asNum(t?.gmvToday),
                gmvMonthToDate: asNum(t?.gmvMonthToDate),
                highValueMonthCount: asNum(t?.highValueMonthCount),
                fraudScore: asNum(t?.fraudScore),
            });

            // Refresh merchants count
            await fetchMerchantsCount();

            // Refresh purchase orders data
            await fetchPurchaseOrdersStats();

            await fetchOperations();

            toast.success('Dashboard refreshed');
        } catch (err: any) {
            console.error(err);
            toast.error(err?.response?.data?.message ?? 'Failed to refresh dashboard.');
        } finally {
            setLoading(false);
        }
    };

    // -----------------------------
    // Loading state
    // -----------------------------
    if (loading) {
        return (
            <>
                <Navbar />
                <div className="pv-dash-bg d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
                    <p className="text-light opacity-75">Loading dashboard…</p>
                </div>
                <StyleBlock />
            </>
        );
    }

    // -----------------------------
    // Main Render
    // -----------------------------
    return (
        <>
            <Navbar />

            {/* Background gradient wrapper with dark → deep blue glow */}
            <div className="pv-dash-bg">
                <div className="container mt-4 text-light">
                    {/* Header */}
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            {/* Friendly welcome using robust displayName */}
                            <div className="pv-welcome">
                                Welcome, {isAdmin ? 'Admin ' : ''}{displayName}
                            </div>

                            <h2 className="mb-0">Dashboard</h2>
                            <p className="text-light opacity-75 mb-0">
                                {isAdmin ? 'Global stats for all merchants' : 'Stats for your merchant account'}
                            </p>
                            <div
                                className={`pv-connectivity-status ${isOnline ? 'is-online' : 'is-offline'}`}
                                role="status"
                                aria-live="polite"
                            >
                                <span className="pv-connectivity-dot" aria-hidden="true" />
                                <span>{isOnline ? 'Online' : 'Offline capture available'}</span>
                                {offlineQueueCount > 0 && (
                                    <>
                                        <span className="pv-offline-queue-count">
                                            {offlineQueueCount} saved order{offlineQueueCount === 1 ? '' : 's'}
                                        </span>
                                        <button
                                            type="button"
                                            className="pv-sync-button"
                                            disabled={!isOnline || offlineSyncing}
                                            onClick={() => void syncQueuedOrders()}
                                        >
                                            {offlineSyncing
                                                ? 'Syncing…'
                                                : isOnline
                                                    ? 'Sync now'
                                                    : 'Will sync online'}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="d-flex gap-2">
                            <button className="btn btn-outline-light btn-sm" onClick={handleManualRefresh}>
                                Refresh
                            </button>
                            <Link to="/profile" className="btn btn-primary btn-sm shadow-sm">
                                Profile Settings
                            </Link>
                            {/* FIXED: Changed from Link to button that opens modal */}
                            <button
                                className="btn btn-success btn-sm shadow-sm"
                                onClick={() => setShowCreatePurchaseOrderModal(true)}
                            >
                                + Create PO
                            </button>
                        </div>
                    </div>

                    {/* Four decision-focused KPIs replace the previous repeated card grid. */}
                    <div className="row g-3 mt-2">
                        <div className="col-12 col-sm-6 col-xl-3">
                            <div className="pv-glass-card pv-kpi-card">
                                <div className="pv-card-body">
                                    <div className="pv-kpi-icon blue">₦</div>
                                    <div className="pv-tile-title">Sales Today</div>
                                    <div className="pv-tile-value">{fmtMoney(tiles?.gmvToday)}</div>
                                    <div className="pv-tile-desc">Confirmed payment value today.</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-12 col-sm-6 col-xl-3">
                            <div className="pv-glass-card pv-kpi-card">
                                <div className="pv-card-body">
                                    <div className="pv-kpi-icon green">✓</div>
                                    <div className="pv-tile-title">Paid Transactions</div>
                                    <div className="pv-tile-value">{fmtInt(stats?.completed)}</div>
                                    <div className="pv-tile-desc">Successfully confirmed by Paystack.</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-12 col-sm-6 col-xl-3">
                            <div className="pv-glass-card pv-kpi-card">
                                <div className="pv-card-body">
                                    <div className="pv-kpi-icon amber">◷</div>
                                    <div className="pv-tile-title">Pending Payments</div>
                                    <div className="pv-tile-value">{fmtInt(stats?.pending)}</div>
                                    <div className="pv-tile-desc">Orders that can still resume payment.</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-12 col-sm-6 col-xl-3">
                            <button
                                type="button"
                                className="pv-glass-card pv-kpi-card pv-kpi-button w-100 text-start"
                                onClick={() => setOperationsOpen(true)}
                            >
                                <div className="pv-card-body">
                                    <div className="pv-kpi-icon red">!</div>
                                    <div className="pv-tile-title">Needs Attention</div>
                                    <div className="pv-tile-value">{fmtInt(operations.summary.needsAttention)}</div>
                                    <div className="pv-tile-desc">
                                        {operations.summary.openDisputes} disputes · {operations.summary.pendingRefunds} refunds
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Compact actions replace cards that only acted as navigation. */}
                    <div className="pv-quick-actions mt-3">
                        <div>
                            <span className="pv-quick-label">Quick actions</span>
                            <small>Everything else stays one click away.</small>
                        </div>
                        <button
                            type="button"
                            className="primary pv-new-order-shine"
                            onClick={() => setShowCreatePurchaseOrderModal(true)}
                        >
                            <span className="pv-new-order-content">+ New order</span>
                        </button>
                        <button type="button" onClick={() => setShowPurchaseOrdersModal(true)}>
                            Orders <span>{fmtInt(poStats?.totalOrders)}</span>
                        </button>
                        <button type="button" onClick={() => navigate('/transactions')}>
                            Transactions <span>{fmtInt(stats?.total)}</span>
                        </button>
                        <button type="button" onClick={() => setOperationsOpen(true)}>
                            Refunds & disputes
                        </button>
                        {isAdmin && (
                            <button type="button" onClick={() => setMerchantsOpen(true)}>
                                Merchants <span>{merchantsCount == null ? '—' : merchantsCount.toLocaleString()}</span>
                            </button>
                        )}
                    </div>

                    {/* Recent Purchase Orders Section */}
                    <div className="row mt-4">
                        <div className="col-12">
                            <div className="pv-glass-card">
                                <div className="d-flex justify-content-between align-items-center p-3 border-bottom border-secondary">
                                    <div>
                                        <h5 className="mb-0 text-light">Recent Purchase Orders</h5>
                                        <p className="text-light opacity-75 mb-0">
                                            Latest purchase orders requiring attention
                                        </p>
                                    </div>
                                    <button
                                        className="btn btn-outline-light btn-sm"
                                        onClick={() => setShowPurchaseOrdersModal(true)}
                                    >
                                        View All
                                    </button>
                                </div>
                                <div className="p-3">
                                    {recentPurchaseOrders.length > 0 ? (
                                        <div className="table-responsive">
                                            <table className="table table-dark table-hover mb-0">
                                                <thead>
                                                    <tr>
                                                        <th className="border-secondary">PO Number</th>
                                                        {isAdmin && <th className="border-secondary">Merchant</th>}
                                                        <th className="border-secondary">Customer</th>
                                                        <th className="border-secondary">Amount</th>
                                                        <th className="border-secondary">Order</th>
                                                        <th className="border-secondary">Payment</th>
                                                        <th className="border-secondary">Settlement</th>
                                                        <th className="border-secondary">Created</th>
                                                        <th className="border-secondary">Due Date</th>
                                                        <th className="border-secondary">Description</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {recentPurchaseOrders.map((po) => (
                                                        <tr key={po.id} style={{ cursor: 'pointer' }}
                                                            onClick={() => navigate(`/purchase-orders/${po.id}`)}>
                                                            <td>
                                                                <strong>PO-{po.poNumber}</strong>
                                                            </td>
                                                            {isAdmin && (
                                                                <td>{po.merchantName || 'N/A'}</td>
                                                            )}
                                                            <td>{getCustomerLabel(po)}</td>
                                                            <td className="fw-bold">{fmtMoney(po.amount)}</td>
                                                            <td>{getStatusBadge(po.status)}</td>
                                                            <td>{getPaymentStatusBadge(po.paymentStatus)}</td>
                                                            <td>{getSettlementStatusBadge(po)}</td>
                                                            <td>{formatDate(po.createdAt)}</td>
                                                            <td>{formatDate(po.dueDate)}</td>
                                                            <td className="text-truncate" style={{ maxWidth: '200px' }}>
                                                                {po.description || 'No description'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="text-center py-4">
                                            <p className="text-muted mb-3">No purchase orders found</p>
                                            {/* FIXED: Changed from Link to button that opens modal */}
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => setShowCreatePurchaseOrderModal(true)}
                                            >
                                                Create Your First Purchase Order
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {recentPurchaseOrders.length > 0 && (
                                    <div className="p-3 border-top border-secondary text-center">
                                        <small className="text-muted">
                                            Showing {Math.min(recentPurchaseOrders.length, 5)} of {poStats?.totalOrders || 0} purchase orders
                                        </small>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Admin-only section */}
                    {isAdmin && (
                        <>
                            <hr className="border-secondary my-4" />
                            <div className="d-flex align-items-center gap-2 mb-2">
                                <h3 className="mb-0">Admin Panel</h3>
                                <span className="badge text-bg-secondary">Banks</span>
                            </div>
                            <p className="text-light opacity-75">
                                Review pending bank registrations. Approving sends an approval email; rejecting sends a polite
                                rejection email with an optional reason.
                            </p>
                            <div className="pv-glass-card p-2">
                                <AdminBanksPanel />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Modals */}
            <MerchantsModal
                open={merchantsOpen}
                onClose={() => setMerchantsOpen(false)}
            />

            {/* Fixed PurchaseOrdersModal usage with transformed data */}
            <PurchaseOrdersModal
                open={showPurchaseOrdersModal}
                onClose={() => setShowPurchaseOrdersModal(false)}
                purchaseOrders={transformPurchaseOrdersForModal(allPurchaseOrders)}
                onRefresh={handleRefreshPurchaseOrders}
                isAdmin={isAdmin}
            />

            {/* ADDED: CreatePurchaseOrderModal for creating new purchase orders */}
            <CreatePurchaseOrderModal
                open={showCreatePurchaseOrderModal}
                onClose={() => setShowCreatePurchaseOrderModal(false)}
                onCreateSuccess={async (result) => {

                    await fetchPurchaseOrdersStats();

                    setShowCreatePurchaseOrderModal(false);

                    if (result.paymentIntent) {
                        setCreatedPaymentIntent(result.paymentIntent);
                        setShowCreatedPaymentModal(true);
                    } else {
                        setShowPurchaseOrdersModal(true);
                    }
                }}
                isAdmin={isAdmin}
            />

            <PaymentRequestModal
                open={showCreatedPaymentModal}
                onClose={() => {
                    setShowCreatedPaymentModal(false);
                    setCreatedPaymentIntent(null);
                }}
                paymentIntent={createdPaymentIntent}
            />

            <OperationsCenterModal
                open={operationsOpen}
                onClose={() => setOperationsOpen(false)}
                data={operations}
                loading={operationsLoading}
                onRefresh={fetchOperations}
            />

            <SettlementCelebration
                open={Boolean(settlementCelebrationOrder)}
                order={settlementCelebrationOrder}
                onClose={() => setSettlementCelebrationOrder(null)}
            />

            {/* Inline style injection for the theme */}
            <StyleBlock />
        </>
    );
};

/**
 * StyleBlock
 */
const StyleBlock = () => (
    <style>{`
    /* --- Background wrapper: black to electric blue --- */
    .pv-dash-bg {
      width: 100%;
      min-height: 100vh;

      /* Layered gradients for depth (radial glow + linear horizon) */
      background:
        radial-gradient(1200px 600px at 65% -10%, rgba(0, 102, 255, 0.30), rgba(0,0,0,0) 60%),
        radial-gradient(900px 450px at 20% 10%, rgba(0, 50, 160, 0.35), rgba(0,0,0,0) 55%),
        linear-gradient(180deg, #06070a 0%, #061024 45%, #0a1c40 65%, #0b2e75 100%);

      /* Gentle vignette to emphasize center content */
      box-shadow: inset 0 0 160px rgba(0,0,0,0.55);
    }

    /* --- Welcome line (high-contrast on dark bg) --- */
    .pv-welcome{
      font-weight: 800;
      letter-spacing: -0.01em;
      color: #e9f2ff;
      font-size: clamp(16px, 2.2vw, 20px);
      margin-bottom: 4px;
    }

    .pv-connectivity-status {
      display: inline-flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 7px;
      margin-top: 9px;
      padding: 5px 9px;
      border: 1px solid rgba(255,255,255,.14);
      border-radius: 999px;
      background: rgba(5, 14, 30, .46);
      color: rgba(233,242,255,.78);
      font-size: .76rem;
      font-weight: 800;
      box-shadow: inset 0 1px rgba(255,255,255,.08);
    }
    .pv-connectivity-status.is-online { border-color: rgba(79, 218, 161, .28); }
    .pv-connectivity-status.is-offline { border-color: rgba(255, 199, 82, .45); color: #ffe2a0; }
    .pv-connectivity-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #50dfa4;
      box-shadow: 0 0 10px rgba(80,223,164,.72);
    }
    .is-offline .pv-connectivity-dot {
      background: #ffc752;
      box-shadow: 0 0 10px rgba(255,199,82,.7);
    }
    .pv-offline-queue-count { color: #a6cbff; }
    .pv-sync-button {
      border: 1px solid rgba(111, 181, 255, .42);
      border-radius: 999px;
      padding: 2px 8px;
      background: rgba(44, 126, 255, .18);
      color: #dceeff;
      font-size: .72rem;
      font-weight: 900;
    }
    .pv-sync-button:hover:not(:disabled) { background: rgba(44, 126, 255, .34); }
    .pv-sync-button:disabled { cursor: not-allowed; opacity: .55; }

    /* --- Glass / glossy card base --- */
    .pv-glass-card {
      position: relative;
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04));
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      box-shadow:
        0 10px 24px rgba(0, 0, 0, 0.35),
        inset 0 1px 0 rgba(255,255,255,0.15);
      transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
      color: #e9f2ff;
    }

    /* --- Subtle glossy highlight strip (top) --- */
    .pv-glass-card::before {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: 16px;
      background: linear-gradient( to bottom, rgba(255,255,255,0.22), rgba(255,255,255,0.0) 35% );
      pointer-events: none;
      mix-blend-mode: screen;
      opacity: 0.65;
    }

    /* --- Hover: lift and brighten --- */
    .pv-glass-card:hover {
      transform: translateY(-2px);
      box-shadow:
        0 16px 36px rgba(0, 0, 0, 0.45),
        inset 0 1px 0 rgba(255,255,255,0.22);
      border-color: rgba(255,255,255,0.22);
    }

    /* --- Extra sheen for analytics tiles --- */
    .pv-gloss-gradient {
      background:
        radial-gradient(120% 150% at 120% -20%, rgba(0, 140, 255, 0.25), rgba(0,0,0,0) 40%),
        linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.05));
    }

    /* --- Card inner spacing & typography --- */
    .pv-card-body { padding: 16px 18px; }

    .pv-kpi-card {
      min-height: 164px;
      position: relative;
      border-color: rgba(128, 179, 255, .22);
      background:
        radial-gradient(330px 150px at 90% -20%, rgba(49,130,255,.20), transparent 65%),
        linear-gradient(150deg, rgba(255,255,255,.115), rgba(255,255,255,.035));
    }
    .pv-kpi-button {
      color: inherit;
      border: 1px solid rgba(255, 126, 142, .26);
    }
    .pv-kpi-icon {
      width: 34px;
      height: 34px;
      display: inline-grid;
      place-items: center;
      border-radius: 11px;
      margin-bottom: 13px;
      font-weight: 950;
      box-shadow: inset 0 1px rgba(255,255,255,.20), 0 8px 20px rgba(0,0,0,.26);
    }
    .pv-kpi-icon.blue { color: #aed4ff; background: rgba(38,126,255,.20); }
    .pv-kpi-icon.green { color: #8af3c2; background: rgba(31,187,118,.18); }
    .pv-kpi-icon.amber { color: #ffd777; background: rgba(255,171,41,.18); }
    .pv-kpi-icon.red { color: #ffadb6; background: rgba(239,70,91,.19); }

    .pv-quick-actions {
      display: flex;
      align-items: center;
      gap: 9px;
      flex-wrap: wrap;
      padding: 13px;
      border: 1px solid rgba(255,255,255,.11);
      border-radius: 17px;
      background: rgba(5, 14, 30, .42);
      box-shadow: inset 0 1px rgba(255,255,255,.06), 0 10px 28px rgba(0,0,0,.18);
    }
    .pv-quick-actions > div { margin-right: auto; display: flex; flex-direction: column; min-width: 160px; }
    .pv-quick-label { font-size: .76rem; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; }
    .pv-quick-actions small { color: rgba(229,240,255,.55); }
    .pv-quick-actions button {
      border: 1px solid rgba(255,255,255,.16);
      border-radius: 11px;
      background: rgba(255,255,255,.065);
      color: #eef6ff;
      padding: 9px 12px;
      font-weight: 800;
      box-shadow: inset 0 1px rgba(255,255,255,.08);
    }
    .pv-quick-actions button:hover { border-color: rgba(101,171,255,.62); background: rgba(36,112,220,.15); }
    .pv-quick-actions button.primary { background: linear-gradient(135deg,#2581ff,#0758cf); border-color: rgba(117,184,255,.72); }
    .pv-quick-actions button span { margin-left: 5px; color: #8fc1ff; }
    .pv-quick-actions button.pv-new-order-shine {
      position: relative;
      isolation: isolate;
      overflow: hidden;
      border: 0;
      padding: 2px;
      background: #0b59cf;
      box-shadow: 0 9px 24px rgba(17,102,228,.34), inset 0 1px rgba(255,255,255,.16);
    }
    .pv-new-order-shine::before {
      content: '';
      position: absolute;
      z-index: 0;
      width: 220%;
      height: 560%;
      left: -60%;
      top: -230%;
      background: conic-gradient(
        transparent 0deg,
        transparent 280deg,
        rgba(66,146,255,.18) 299deg,
        #278dff 319deg,
        #a8e2ff 336deg,
        #ffffff 344deg,
        #43a3ff 352deg,
        transparent 360deg
      );
      animation: pv-new-order-shine-rotate 1.65s linear infinite;
      pointer-events: none;
    }
    .pv-new-order-shine::after {
      content: '';
      position: absolute;
      z-index: 1;
      inset: 2px;
      border-radius: 9px;
      background: linear-gradient(135deg,#2b87ff 0%,#1267e4 48%,#0751c1 100%);
      box-shadow: inset 0 1px rgba(255,255,255,.27), inset 0 -1px rgba(0,0,0,.22);
      pointer-events: none;
    }
    .pv-quick-actions button .pv-new-order-content {
      position: relative;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 34px;
      padding: 0 11px;
      margin: 0;
      overflow: hidden;
      border-radius: 8px;
      color: #ffffff;
    }
    .pv-new-order-content::after {
      content: '';
      position: absolute;
      inset: -55% auto -55% -65%;
      width: 38%;
      z-index: -1;
      transform: skewX(-18deg);
      background: linear-gradient(90deg,transparent,rgba(255,255,255,.32),transparent);
      transition: left .48s ease;
    }
    .pv-new-order-shine:hover .pv-new-order-content::after { left: 130%; }
    @keyframes pv-new-order-shine-rotate { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) {
      .pv-new-order-shine::before { animation: none; }
      .pv-new-order-content::after { display: none; }
    }
    .pv-tile-title {
      font-size: 0.875rem;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      opacity: 0.85;
      margin-bottom: 6px;
    }
    .pv-tile-value {
      font-size: 1.6rem;
      font-weight: 700;
      line-height: 1.1;
    }
    .pv-tile-desc {
      margin-top: 6px;
      font-size: 0.86rem;
      color: rgba(233, 242, 255, 0.8);
    }

    /* Quick-payment tile styles. */
    .pv-sandbox-tile {
      cursor: pointer;
      border: none;
      background:
        radial-gradient(120% 150% at 100% -20%, rgba(0, 180, 255, 0.28), rgba(0,0,0,0) 42%),
        linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.05));
      min-height: 100%;
    }

    .pv-sandbox-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 4px 8px;
      border-radius: 999px;
      border: 1px solid rgba(120, 220, 255, 0.45);
      background: rgba(0, 153, 255, 0.16);
      color: #dff6ff;
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      white-space: nowrap;
    }

    .pv-sandbox-link {
      margin-top: 12px;
      font-size: 0.84rem;
      font-weight: 700;
      color: #ffffff;
      opacity: 0.95;
    }

    .pv-sandbox-tile:hover .pv-sandbox-link {
      text-decoration: underline;
    }

    /* Buttons readable on dark bg */
    .btn-outline-light {
      border-color: rgba(255,255,255,0.35);
      color: #e9f2ff;
    }
    .btn-outline-light:hover {
      background: rgba(255,255,255,0.08);
      border-color: rgba(255,255,255,0.55);
      color: #fff;
    }

    /* Table styles for dark theme */
    .table-dark {
      --bs-table-bg: transparent;
      --bs-table-color: #e9f2ff;
      --bs-table-border-color: rgba(255,255,255,0.12);
    }

    .table-hover tbody tr:hover {
      --bs-table-accent-bg: rgba(255,255,255,0.05);
    }

    /* Badge styles for status */
    .badge {
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.3px;
    }

    /* Keep HR visible on dark */
    hr.border-secondary {
      border-top-color: rgba(255,255,255,0.2) !important;
    }
  `}</style>
);

export default DashboardPage;

//// src/pages/DashboardPage.tsx
//// -------------------------------------------------------------------------------------------------
//// PayVerify Dashboard (Dark Gloss / Glass Theme) + Merchants Tile (Modal) + Purchase Orders
//// -------------------------------------------------------------------------------------------------

//import { useEffect, useMemo, useRef, useState } from 'react';
//import { useLocation, useNavigate, Link } from 'react-router-dom';
//import Navbar from '../components/Navbar';
//import api from '../services/api';
//import { useAuth } from '../contexts/AuthContext';
//import { toast } from 'react-toastify';
//import { Badge } from 'react-bootstrap';

//// Admin-only panel
//import AdminBanksPanel from '../components/AdminBanksPanel';

//// Modals
//import MerchantsModal from '../components/MerchantsModal';
//import PurchaseOrdersModal from '../components/PurchaseOrdersModal';
//import CreatePurchaseOrderModal from '../components/CreatePurchaseOrderModal'; // ADDED: Import CreatePurchaseOrderModal

//import AiInsightsPanel from '../components/AiInsightsPanel';
//import FraudScoreCard from '../components/FraudScoreCard';

//// -----------------------------
//// Types
//// -----------------------------
//type BasicStats = {
//    total: number;
//    pending: number;
//    completed: number;
//    sum: number;
//};

//type Tiles = {
//    gmvTotal: number;
//    aov: number;
//    successRate: number;      // percent 0–100
//    pending: number;
//    gmvToday: number;
//    gmvMonthToDate: number;
//    highValueMonthCount: number;
//    fraudScore: number;       // 0–100
//};

//// Purchase Order Type (aligned with backend response)
//interface PurchaseOrder {
//    id: string;
//    poNumber: string;
//    poReference?: string;
//    amount: number;
//    totalAmount?: number;
//    status: 'pending' | 'approved' | 'rejected' | 'completed';
//    createdAt: string;
//    dueDate: string;
//    description?: string;
//    merchantName?: string;
//    merchantId: string; // Made required to match PurchaseOrdersModal
//    customerEmail?: string;
//    items?: Array<{
//        id: string;
//        name: string;
//        description: string;
//        quantity: number;
//        unitPrice: number;
//        total: number;
//    }>;
//}

//interface PurchaseOrdersStats {
//    totalOrders: number;
//    pendingOrders: number;
//    approvedOrders: number;
//    rejectedOrders?: number;
//    completedOrders?: number;
//    totalAmount: number;
//    pendingAmount: number;
//}

//// Endpoint sometimes returns { tiles, events }, sometimes flat (just tiles)
//type TilesResponse = { tiles?: Tiles; events?: any[] } | Tiles;

//// -----------------------------
//// Helpers (null-safe formatters)
//// -----------------------------

///** numeric coercion that never throws or yields NaN */
//const asNum = (v: unknown) => {
//    const n = Number((v as any) ?? 0);
//    return Number.isFinite(n) ? n : 0;
//};

//const fmtMoney = (v: unknown) => `₦${asNum(v).toLocaleString()}`;
//const fmtInt = (v: unknown) => asNum(v).toLocaleString();
//const fmtPct = (v: unknown) => `${asNum(v)}%`;

///** Safer token check (also avoids throwing on malformed token) */
//const isTokenExpired = (jwt: string): boolean => {
//    try {
//        const payload = JSON.parse(atob(jwt.split('.')[1]));
//        return payload.exp * 1000 < Date.now();
//    } catch {
//        return true;
//    }
//};

//const DashboardPage = () => {
//    const { token, logout, user } = useAuth();
//    const navigate = useNavigate();
//    const location = useLocation() as any;

//    const [stats, setStats] = useState<BasicStats | null>(null);
//    const [tiles, setTiles] = useState<Tiles | null>(null);
//    const [loading, setLoading] = useState(true);

//    // Purchase Orders state
//    const [poStats, setPoStats] = useState<PurchaseOrdersStats | null>(null);
//    const [recentPurchaseOrders, setRecentPurchaseOrders] = useState<PurchaseOrder[]>([]);
//    const [showPurchaseOrdersModal, setShowPurchaseOrdersModal] = useState(false);
//    const [allPurchaseOrders, setAllPurchaseOrders] = useState<PurchaseOrder[]>([]);

//    // ADDED: State for Create Purchase Order Modal
//    const [showCreatePurchaseOrderModal, setShowCreatePurchaseOrderModal] = useState(false);

//    // Keep a stable interval id across renders for auto-refresh
//    const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);

//    // ---------------------------------------------------------
//    // Merchants UI state (modal visibility + count on tile)
//    // ---------------------------------------------------------
//    const [merchantsOpen, setMerchantsOpen] = useState(false);
//    const [merchantsCount, setMerchantsCount] = useState<number | null>(null);

//    // -----------------------------
//    // One-off toast passed via navigation state (e.g., post-login)
//    // -----------------------------
//    useEffect(() => {
//        const msg = location?.state?.toast as string | undefined;
//        if (msg) {
//            toast.success(msg);
//            // prevent replaying on refresh
//            window.history.replaceState({}, document.title);
//        }
//    }, [location?.state]);

//    // -----------------------------
//    // Role & Display Name (no first/last name dependency)
//    // -----------------------------
//    const isAdmin = useMemo(
//        () => (user?.role || '').toLowerCase() === 'admin',
//        [user?.role]
//    );

//    // Robust display name using common fields, then email handle, then "User"
//    const displayName = useMemo(() => {
//        const u = (user as any) ?? {};
//        const candidates = [
//            u.name,            // most common
//            u.displayName,     // sometimes used
//            u.username,        // alternative field
//            u.merchant?.name,  // merchant-owned accounts
//            u.profile?.name,   // nested profile objects
//            typeof u.email === 'string' ? u.email.split('@')[0] : undefined, // email handle
//        ].filter((v: unknown) => typeof v === 'string' && v.trim().length > 0) as string[];

//        return candidates[0] ?? 'User';
//    }, [user]);

//    // ---------------------------------------------------------
//    // Role-aware merchants count with graceful fallback
//    // ---------------------------------------------------------
//    const fetchMerchantsCount = async () => {
//        if (!token) return;
//        try {
//            const scope = isAdmin ? 'all' : 'mine';

//            // Preferred: dedicated count endpoint
//            const res = await api.get(`/merchants/count?scope=${scope}`, {
//                headers: { Authorization: `Bearer ${token}` },
//            });

//            if (typeof res?.data?.count === 'number') {
//                setMerchantsCount(res.data.count);
//                return;
//            }

//            // Fallback: listing endpoint; use header if exposed by server
//            const listRes = await api.get(`/merchants?scope=${scope}&limit=1`, {
//                headers: { Authorization: `Bearer ${token}` },
//            });
//            const hdrCount = Number(listRes.headers?.['x-total-count']);
//            if (Number.isFinite(hdrCount)) {
//                setMerchantsCount(hdrCount);
//            } else if (Array.isArray(listRes.data)) {
//                setMerchantsCount(listRes.data.length);
//            } else {
//                setMerchantsCount(null);
//            }
//        } catch (err) {
//            console.error('Failed to fetch merchants count', err);
//            setMerchantsCount(null); // keep UI usable
//        }
//    };

//    // ---------------------------------------------------------
//    // Fetch Purchase Orders Stats and Recent Orders
//    // ---------------------------------------------------------
//    const fetchPurchaseOrdersStats = async () => {
//        if (!token) return;
//        try {
//            // Fetch PO stats - updated to match backend response structure
//            const statsRes = await api.get('/purchase-orders/stats', {
//                headers: { Authorization: `Bearer ${token}` },
//            });

//            // Handle both response formats
//            const responseData = statsRes.data || {};
//            const statsData = responseData.stats || responseData;

//            setPoStats({
//                totalOrders: asNum(statsData.total) || asNum(statsData.totalOrders),
//                pendingOrders: asNum(statsData.pending) || asNum(statsData.pendingOrders),
//                approvedOrders: asNum(statsData.approved) || asNum(statsData.approvedOrders),
//                rejectedOrders: asNum(statsData.rejected) || asNum(statsData.rejectedOrders),
//                completedOrders: asNum(statsData.completed) || asNum(statsData.completedOrders),
//                totalAmount: asNum(statsData.totalAmount),
//                pendingAmount: asNum(statsData.pendingAmount)
//            });

//            // Fetch recent purchase orders
//            const recentRes = await api.get('/purchase-orders', {
//                headers: { Authorization: `Bearer ${token}` },
//            });

//            const orders =
//                recentRes.data?.data ??
//                recentRes.data ??
//                [];

//            /*setRecentPurchaseOrders(orders.slice(0, 5));*/
//            setRecentPurchaseOrders(
//                orders.slice(0, 5).map((po: any) => ({
//                    ...po,
//                    poNumber:
//                        po.poNumber ||
//                        po.po_number ||
//                        po.po_reference ||
//                        po.reference ||
//                        po.id ||
//                        "",
//                    amount:
//                        po.amount ||
//                        po.totalAmount ||
//                        po.total_amount ||
//                        0,
//                    merchantName:
//                        po.merchantName ||
//                        po.merchant?.name ||
//                        "N/A",
//                }))
//            );

//            // Fetch all purchase orders for the modal
//            const allRes = await api.get('/purchase-orders', {
//                headers: { Authorization: `Bearer ${token}` },
//            });

//            // Handle paginated or direct array response
//            const allOrdersData = allRes.data || {};
//            const ordersArray = allOrdersData.data || allOrdersData;
//            setAllPurchaseOrders(Array.isArray(ordersArray) ? ordersArray : []);

//        } catch (err) {
//            console.error('Failed to fetch purchase orders data:', err);
//            // Set default empty stats to prevent UI breakage
//            setPoStats({
//                totalOrders: 0,
//                pendingOrders: 0,
//                approvedOrders: 0,
//                rejectedOrders: 0,
//                completedOrders: 0,
//                totalAmount: 0,
//                pendingAmount: 0
//            });
//            setRecentPurchaseOrders([]);
//            setAllPurchaseOrders([]);
//        }
//    };

//    // -----------------------------
//    // Status badge helper for Purchase Orders
//    // -----------------------------
//    const getStatusBadge = (status: string) => {
//        switch (status) {
//            case 'pending': return <Badge bg="warning" className="px-2 py-1">Pending</Badge>;
//            case 'approved': return <Badge bg="success" className="px-2 py-1">Approved</Badge>;
//            case 'rejected': return <Badge bg="danger" className="px-2 py-1">Rejected</Badge>;
//            case 'completed': return <Badge bg="info" className="px-2 py-1">Completed</Badge>;
//            default: return <Badge bg="secondary" className="px-2 py-1">{status}</Badge>;
//        }
//    };

//    // -----------------------------
//    // Format date for display
//    // -----------------------------
//    const formatDate = (dateString: string) => {
//        try {
//            return new Date(dateString).toLocaleDateString('en-NG', {
//                day: 'numeric',
//                month: 'short'
//            });
//        } catch {
//            return 'Invalid date';
//        }
//    };

//    // -----------------------------
//    // Refresh handler for purchase orders modal
//    // -----------------------------
//    const handleRefreshPurchaseOrders = async () => {
//        await fetchPurchaseOrdersStats();
//        toast.success('Purchase orders refreshed');
//    };

//    // ADDED: Refresh function for after creating a new PO
//    const refreshAllPurchaseOrders = async () => {
//        await fetchPurchaseOrdersStats();
//    };

//    // -----------------------------
//    // Transform purchase order data for modal
//    // -----------------------------
//    const transformPurchaseOrdersForModal = (orders: PurchaseOrder[]): any[] => {
//        return orders.map(order => ({
//            ...order,
//            // Ensure all required fields are present for the modal
//            id: order.id,
//            poNumber: order.poNumber || order.poReference || '',
//            amount: order.amount || order.totalAmount || 0,
//            status: order.status || 'pending',
//            createdAt: order.createdAt,
//            dueDate: order.dueDate,
//            description: order.description || '',
//            merchantName: order.merchantName || '',
//            merchantId: order.merchantId || '',
//        }));
//    };

//    // -----------------------------
//    // Initial load + auto-refresh
//    // -----------------------------
//    useEffect(() => {
//        if (!token || isTokenExpired(token)) {
//            // If token is missing/expired, clear session and redirect
//            logout();
//            navigate('/expired', { replace: true });
//            return;
//        }

//        const fetchALL = async () => {
//            try {
//                setLoading(true);

//                // Legacy dashboard stats
//                const res = await api.get('/dashboard', {
//                    headers: { Authorization: `Bearer ${token}` },
//                });
//                setStats(res.data as BasicStats);

//                // Analytics tiles (normalize payload)
//                const tilesRes = await api.get<TilesResponse>('/analytics/tiles', {
//                    headers: { Authorization: `Bearer ${token}` },
//                });
//                const t = (tilesRes.data as any)?.tiles ?? (tilesRes.data as Tiles);
//                setTiles({
//                    gmvTotal: asNum(t?.gmvTotal),
//                    aov: asNum(t?.aov),
//                    successRate: asNum(t?.successRate),
//                    pending: asNum(t?.pending),
//                    gmvToday: asNum(t?.gmvToday),
//                    gmvMonthToDate: asNum(t?.gmvMonthToDate),
//                    highValueMonthCount: asNum(t?.highValueMonthCount),
//                    fraudScore: asNum(t?.fraudScore),
//                });

//                // Refresh merchants count
//                await fetchMerchantsCount();

//                // Refresh purchase orders data
//                await fetchPurchaseOrdersStats();

//            } catch (err: any) {
//                console.error(err);
//                if (err?.response?.status === 401) {
//                    toast.error('Session expired. Please log in again.');
//                    logout();
//                    navigate('/expired', { replace: true });
//                } else {
//                    toast.error(err?.response?.data?.message ?? 'Failed to load dashboard.');
//                }
//            } finally {
//                setLoading(false);
//            }
//        };

//        // Kick off fetching
//        fetchALL();

//        // Auto-refresh every 60s; store id in ref
//        refreshTimer.current = setInterval(fetchALL, 60_000);

//        // Cleanup interval on unmount
//        return () => {
//            if (refreshTimer.current) clearInterval(refreshTimer.current);
//            refreshTimer.current = null;
//        };
//    }, [token, logout, navigate, isAdmin]);

//    // -----------------------------
//    // Manual refresh handler
//    // -----------------------------
//    const handleManualRefresh = async () => {
//        if (!token) return;
//        try {
//            setLoading(true);
//            const [res, tilesRes] = await Promise.all([
//                api.get('/dashboard', { headers: { Authorization: `Bearer ${token}` } }),
//                api.get<TilesResponse>('/analytics/tiles', { headers: { Authorization: `Bearer ${token}` } }),
//            ]);
//            setStats(res.data as BasicStats);

//            const t = (tilesRes.data as any)?.tiles ?? (tilesRes.data as Tiles);
//            setTiles({
//                gmvTotal: asNum(t?.gmvTotal),
//                aov: asNum(t?.aov),
//                successRate: asNum(t?.successRate),
//                pending: asNum(t?.pending),
//                gmvToday: asNum(t?.gmvToday),
//                gmvMonthToDate: asNum(t?.gmvMonthToDate),
//                highValueMonthCount: asNum(t?.highValueMonthCount),
//                fraudScore: asNum(t?.fraudScore),
//            });

//            // Refresh merchants count
//            await fetchMerchantsCount();

//            // Refresh purchase orders data
//            await fetchPurchaseOrdersStats();

//            toast.success('Dashboard refreshed');
//        } catch (err: any) {
//            console.error(err);
//            toast.error(err?.response?.data?.message ?? 'Failed to refresh dashboard.');
//        } finally {
//            setLoading(false);
//        }
//    };

//    // -----------------------------
//    // Loading state
//    // -----------------------------
//    if (loading) {
//        return (
//            <>
//                <Navbar />
//                <div className="pv-dash-bg d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
//                    <p className="text-light opacity-75">Loading dashboard…</p>
//                </div>
//                <StyleBlock />
//            </>
//        );
//    }

//    // -----------------------------
//    // Main Render
//    // -----------------------------
//    return (
//        <>
//            <Navbar />

//            {/* Background gradient wrapper with dark → deep blue glow */}
//            <div className="pv-dash-bg">
//                <div className="container mt-4 text-light">
//                    {/* Header */}
//                    <div className="d-flex justify-content-between align-items-center mb-3">
//                        <div>
//                            {/* Friendly welcome using robust displayName */}
//                            <div className="pv-welcome">
//                                Welcome, {isAdmin ? 'Admin ' : ''}{displayName}
//                            </div>

//                            <h2 className="mb-0">Dashboard</h2>
//                            <p className="text-light opacity-75 mb-0">
//                                {isAdmin ? 'Global stats for all merchants' : 'Stats for your merchant account'}
//                            </p>
//                        </div>
//                        <div className="d-flex gap-2">
//                            <button className="btn btn-outline-light btn-sm" onClick={handleManualRefresh}>
//                                Refresh
//                            </button>
//                            <Link to="/profile" className="btn btn-primary btn-sm shadow-sm">
//                                Profile Settings
//                            </Link>
//                            {/* FIXED: Changed from Link to button that opens modal */}
//                            <button
//                                className="btn btn-success btn-sm shadow-sm"
//                                onClick={() => setShowCreatePurchaseOrderModal(true)}
//                            >
//                                + Create PO
//                            </button>
//                        </div>
//                    </div>

//                    {/* Legacy KPI cards */}
//                    <div className="row mt-3">
//                        <div className="col-md-3 mb-3">
//                            <div className="pv-glass-card">
//                                <div className="pv-card-body">
//                                    <div className="pv-tile-title">Total Transactions</div>
//                                    <div className="pv-tile-value">{fmtInt(stats?.total)}</div>
//                                    <div className="pv-tile-desc">Count of all transactions recorded to date.</div>
//                                </div>
//                            </div>
//                        </div>

//                        <div className="col-md-3 mb-3">
//                            <div className="pv-glass-card">
//                                <div className="pv-card-body">
//                                    <div className="pv-tile-title">Completed</div>
//                                    <div className="pv-tile-value">{fmtInt(stats?.completed)}</div>
//                                    <div className="pv-tile-desc">Transactions successfully processed.</div>
//                                </div>
//                            </div>
//                        </div>

//                        <div className="col-md-3 mb-3">
//                            <div className="pv-glass-card">
//                                <div className="pv-card-body">
//                                    <div className="pv-tile-title">Pending</div>
//                                    <div className="pv-tile-value">{fmtInt(stats?.pending)}</div>
//                                    <div className="pv-tile-desc">Awaiting completion or confirmation.</div>
//                                </div>
//                            </div>
//                        </div>

//                        <div className="col-md-3 mb-3">
//                            <div className="pv-glass-card">
//                                <div className="pv-card-body">
//                                    <div className="pv-tile-title">Total Sum</div>
//                                    <div className="pv-tile-value">{fmtMoney(stats?.sum)}</div>
//                                    <div className="pv-tile-desc">Aggregate value of all transactions.</div>
//                                </div>
//                            </div>
//                        </div>
//                    </div>

//                    {/* Purchase Orders Stats Row */}
//                    <div className="row mt-3">
//                        <div className="col-md-3 mb-3">
//                            <div className="pv-glass-card pv-gloss-gradient">
//                                <div className="pv-card-body">
//                                    <div className="pv-tile-title">Total POs</div>
//                                    <div className="pv-tile-value">{fmtInt(poStats?.totalOrders)}</div>
//                                    <div className="pv-tile-desc">All purchase orders created.</div>
//                                </div>
//                            </div>
//                        </div>

//                        <div className="col-md-3 mb-3">
//                            <div className="pv-glass-card pv-gloss-gradient">
//                                <div className="pv-card-body">
//                                    <div className="pv-tile-title">Pending POs</div>
//                                    <div className="pv-tile-value text-warning">{fmtInt(poStats?.pendingOrders)}</div>
//                                    <div className="pv-tile-desc">Awaiting approval.</div>
//                                </div>
//                            </div>
//                        </div>

//                        <div className="col-md-3 mb-3">
//                            <button
//                                className="pv-gloss-gradient pv-glass-card w-100 text-start"
//                                onClick={() => setShowPurchaseOrdersModal(true)}
//                                aria-label="View all purchase orders"
//                                style={{ cursor: 'pointer', border: 'none', background: 'transparent' }}
//                            >
//                                <div className="pv-card-body">
//                                    <div className="pv-tile-title">Purchase Orders</div>
//                                    <div className="pv-tile-value">{fmtInt(poStats?.totalOrders)}</div>
//                                    <div className="pv-tile-desc">View and manage all purchase orders</div>
//                                </div>
//                            </button>
//                        </div>

//                        <div className="col-md-3 mb-3">
//                            <div className="pv-glass-card pv-gloss-gradient">
//                                <div className="pv-card-body">
//                                    <div className="pv-tile-title">PO Value</div>
//                                    <div className="pv-tile-value text-success">{fmtMoney(poStats?.totalAmount)}</div>
//                                    <div className="pv-tile-desc">Total value of all purchase orders.</div>
//                                </div>
//                            </div>
//                        </div>
//                    </div>

//                    {/* Analytics tiles */}
//                    <div className="row mt-2">
//                        <div className="col-md-3 mb-3">
//                            <div className="pv-gloss-gradient pv-glass-card">
//                                <div className="pv-card-body">
//                                    <div className="pv-tile-title">GMV Today</div>
//                                    <div className="pv-tile-value">{fmtMoney(tiles?.gmvToday)}</div>
//                                    <div className="pv-tile-desc">Gross merchandise value processed today.</div>
//                                </div>
//                            </div>
//                        </div>

//                        <div className="col-md-3 mb-3">
//                            <div className="pv-gloss-gradient pv-glass-card">
//                                <div className="pv-card-body">
//                                    <div className="pv-tile-title">GMV MTD</div>
//                                    <div className="pv-tile-value">{fmtMoney(tiles?.gmvMonthToDate)}</div>
//                                    <div className="pv-tile-desc">Gross merchandise value for this month.</div>
//                                </div>
//                            </div>
//                        </div>

//                        <div className="col-md-3 mb-3">
//                            <div className="pv-gloss-gradient pv-glass-card">
//                                <div className="pv-card-body">
//                                    <div className="pv-tile-title">Average Order Value</div>
//                                    <div className="pv-tile-value">{fmtMoney(tiles?.aov)}</div>
//                                    <div className="pv-tile-desc">Average value per completed transaction.</div>
//                                </div>
//                            </div>
//                        </div>

//                        <div className="col-md-3 mb-3">
//                            <div className="pv-gloss-gradient pv-glass-card">
//                                <div className="pv-card-body">
//                                    <div className="pv-tile-title">Success Rate</div>
//                                    <div className="pv-tile-value">{fmtPct(tiles?.successRate)}</div>
//                                    <div className="pv-tile-desc">Share of transactions that complete successfully.</div>
//                                </div>
//                            </div>
//                        </div>

//                        <div className="col-md-3 mb-3">
//                            <div className="pv-gloss-gradient pv-glass-card">
//                                <div className="pv-card-body">
//                                    <div className="pv-tile-title">High-Value Tx (MTD)</div>
//                                    <div className="pv-tile-value">{fmtInt(tiles?.highValueMonthCount)}</div>
//                                    <div className="pv-tile-desc">Count of large transactions this month.</div>
//                                </div>
//                            </div>
//                        </div>

//                        <div className="col-sm-6 col-md-3">
//                            <FraudScoreCard />
//                        </div>

//                        {/* Merchants tile */}
//                        <div className="col-md-3 mb-3">
//                            <button
//                                className="pv-gloss-gradient pv-glass-card w-100 text-start"
//                                onClick={() => setMerchantsOpen(true)}
//                                aria-label={isAdmin ? 'View all merchants' : 'View your merchants'}
//                                style={{ cursor: 'pointer', border: 'none', background: 'transparent' }}
//                            >
//                                <div className="pv-card-body">
//                                    <div className="pv-tile-title">Merchants</div>
//                                    <div className="pv-tile-value">
//                                        {merchantsCount == null ? '—' : merchantsCount.toLocaleString()}
//                                    </div>
//                                    <div className="pv-tile-desc">
//                                        {isAdmin ? 'View all merchants' : 'View your merchants'}
//                                    </div>
//                                </div>
//                            </button>
//                        </div>
//                    </div>

//                    {/* Recent Purchase Orders Section */}
//                    <div className="row mt-4">
//                        <div className="col-12">
//                            <div className="pv-glass-card">
//                                <div className="d-flex justify-content-between align-items-center p-3 border-bottom border-secondary">
//                                    <div>
//                                        <h5 className="mb-0 text-light">Recent Purchase Orders</h5>
//                                        <p className="text-light opacity-75 mb-0">
//                                            Latest purchase orders requiring attention
//                                        </p>
//                                    </div>
//                                    <button
//                                        className="btn btn-outline-light btn-sm"
//                                        onClick={() => setShowPurchaseOrdersModal(true)}
//                                    >
//                                        View All
//                                    </button>
//                                </div>
//                                <div className="p-3">
//                                    {recentPurchaseOrders.length > 0 ? (
//                                        <div className="table-responsive">
//                                            <table className="table table-dark table-hover mb-0">
//                                                <thead>
//                                                    <tr>
//                                                        <th className="border-secondary">PO Number</th>
//                                                        {isAdmin && <th className="border-secondary">Merchant</th>}
//                                                        <th className="border-secondary">Amount</th>
//                                                        <th className="border-secondary">Status</th>
//                                                        <th className="border-secondary">Created</th>
//                                                        <th className="border-secondary">Due Date</th>
//                                                        <th className="border-secondary">Description</th>
//                                                    </tr>
//                                                </thead>
//                                                <tbody>
//                                                    {recentPurchaseOrders.map((po) => (
//                                                        <tr key={po.id} style={{ cursor: 'pointer' }}
//                                                            onClick={() => setShowPurchaseOrdersModal(true)}>
//                                                            <td>
//                                                                <strong>PO-{po.poNumber}</strong>
//                                                            </td>
//                                                            {isAdmin && (
//                                                                <td>{po.merchantName || 'N/A'}</td>
//                                                            )}
//                                                            <td className="fw-bold">{fmtMoney(po.amount)}</td>
//                                                            <td>{getStatusBadge(po.status)}</td>
//                                                            <td>{formatDate(po.createdAt)}</td>
//                                                            <td>{formatDate(po.dueDate)}</td>
//                                                            <td className="text-truncate" style={{ maxWidth: '200px' }}>
//                                                                {po.description || 'No description'}
//                                                            </td>
//                                                        </tr>
//                                                    ))}
//                                                </tbody>
//                                            </table>
//                                        </div>
//                                    ) : (
//                                        <div className="text-center py-4">
//                                            <p className="text-muted mb-3">No purchase orders found</p>
//                                            {/* FIXED: Changed from Link to button that opens modal */}
//                                            <button
//                                                className="btn btn-primary"
//                                                onClick={() => setShowCreatePurchaseOrderModal(true)}
//                                            >
//                                                Create Your First Purchase Order
//                                            </button>
//                                        </div>
//                                    )}
//                                </div>
//                                {recentPurchaseOrders.length > 0 && (
//                                    <div className="p-3 border-top border-secondary text-center">
//                                        <small className="text-muted">
//                                            Showing {Math.min(recentPurchaseOrders.length, 5)} of {poStats?.totalOrders || 0} purchase orders
//                                        </small>
//                                    </div>
//                                )}
//                            </div>
//                        </div>
//                    </div>

//                    {/* Admin-only section */}
//                    {isAdmin && (
//                        <>
//                            <hr className="border-secondary my-4" />
//                            <div className="d-flex align-items-center gap-2 mb-2">
//                                <h3 className="mb-0">Admin Panel</h3>
//                                <span className="badge text-bg-secondary">Banks</span>
//                            </div>
//                            <p className="text-light opacity-75">
//                                Review pending bank registrations. Approving sends an approval email; rejecting sends a polite
//                                rejection email with an optional reason.
//                            </p>
//                            <div className="pv-glass-card p-2">
//                                <AdminBanksPanel />
//                            </div>
//                        </>
//                    )}
//                </div>
//            </div>

//            {/* Modals */}
//            <MerchantsModal
//                open={merchantsOpen}
//                onClose={() => setMerchantsOpen(false)}
//            />

//            {/* Fixed PurchaseOrdersModal usage with transformed data */}
//            <PurchaseOrdersModal
//                open={showPurchaseOrdersModal}
//                onClose={() => setShowPurchaseOrdersModal(false)}
//                purchaseOrders={transformPurchaseOrdersForModal(allPurchaseOrders)}
//                onRefresh={handleRefreshPurchaseOrders}
//                isAdmin={isAdmin}
//            />

//            {/* ADDED: CreatePurchaseOrderModal for creating new purchase orders */}
//            <CreatePurchaseOrderModal
//                open={showCreatePurchaseOrderModal}
//                onClose={() => setShowCreatePurchaseOrderModal(false)}
//                onCreateSuccess={async () => {

//                    await fetchPurchaseOrdersStats();

//                    setShowCreatePurchaseOrderModal(false);

//                    setShowPurchaseOrdersModal(true);

//                    toast.success('Purchase order created successfully!');
//                }}
//                isAdmin={isAdmin}
//            />

//            {/* Inline style injection for the theme */}
//            <StyleBlock />
//        </>
//    );
//};

///**
// * StyleBlock
// */
//const StyleBlock = () => (
//    <style>{`
//    /* --- Background wrapper: black to electric blue --- */
//    .pv-dash-bg {
//      width: 100%;
//      min-height: 100vh;

//      /* Layered gradients for depth (radial glow + linear horizon) */
//      background:
//        radial-gradient(1200px 600px at 65% -10%, rgba(0, 102, 255, 0.30), rgba(0,0,0,0) 60%),
//        radial-gradient(900px 450px at 20% 10%, rgba(0, 50, 160, 0.35), rgba(0,0,0,0) 55%),
//        linear-gradient(180deg, #06070a 0%, #061024 45%, #0a1c40 65%, #0b2e75 100%);

//      /* Gentle vignette to emphasize center content */
//      box-shadow: inset 0 0 160px rgba(0,0,0,0.55);
//    }

//    /* --- Welcome line (high-contrast on dark bg) --- */
//    .pv-welcome{
//      font-weight: 800;
//      letter-spacing: -0.01em;
//      color: #e9f2ff;
//      font-size: clamp(16px, 2.2vw, 20px);
//      margin-bottom: 4px;
//    }

//    /* --- Glass / glossy card base --- */
//    .pv-glass-card {
//      position: relative;
//      border-radius: 16px;
//      border: 1px solid rgba(255, 255, 255, 0.12);
//      background: linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04));
//      backdrop-filter: blur(8px);
//      -webkit-backdrop-filter: blur(8px);
//      box-shadow:
//        0 10px 24px rgba(0, 0, 0, 0.35),
//        inset 0 1px 0 rgba(255,255,255,0.15);
//      transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
//      color: #e9f2ff;
//    }

//    /* --- Subtle glossy highlight strip (top) --- */
//    .pv-glass-card::before {
//      content: "";
//      position: absolute;
//      inset: 0;
//      border-radius: 16px;
//      background: linear-gradient( to bottom, rgba(255,255,255,0.22), rgba(255,255,255,0.0) 35% );
//      pointer-events: none;
//      mix-blend-mode: screen;
//      opacity: 0.65;
//    }

//    /* --- Hover: lift and brighten --- */
//    .pv-glass-card:hover {
//      transform: translateY(-2px);
//      box-shadow:
//        0 16px 36px rgba(0, 0, 0, 0.45),
//        inset 0 1px 0 rgba(255,255,255,0.22);
//      border-color: rgba(255,255,255,0.22);
//    }

//    /* --- Extra sheen for analytics tiles --- */
//    .pv-gloss-gradient {
//      background:
//        radial-gradient(120% 150% at 120% -20%, rgba(0, 140, 255, 0.25), rgba(0,0,0,0) 40%),
//        linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.05));
//    }

//    /* --- Card inner spacing & typography --- */
//    .pv-card-body { padding: 16px 18px; }
//    .pv-tile-title {
//      font-size: 0.875rem;
//      letter-spacing: 0.3px;
//      text-transform: uppercase;
//      opacity: 0.85;
//      margin-bottom: 6px;
//    }
//    .pv-tile-value {
//      font-size: 1.6rem;
//      font-weight: 700;
//      line-height: 1.1;
//    }
//    .pv-tile-desc {
//      margin-top: 6px;
//      font-size: 0.86rem;
//      color: rgba(233, 242, 255, 0.8);
//    }

//    /* Buttons readable on dark bg */
//    .btn-outline-light {
//      border-color: rgba(255,255,255,0.35);
//      color: #e9f2ff;
//    }
//    .btn-outline-light:hover {
//      background: rgba(255,255,255,0.08);
//      border-color: rgba(255,255,255,0.55);
//      color: #fff;
//    }

//    /* Table styles for dark theme */
//    .table-dark {
//      --bs-table-bg: transparent;
//      --bs-table-color: #e9f2ff;
//      --bs-table-border-color: rgba(255,255,255,0.12);
//    }

//    .table-hover tbody tr:hover {
//      --bs-table-accent-bg: rgba(255,255,255,0.05);
//    }

//    /* Badge styles for status */
//    .badge {
//      font-size: 0.75rem;
//      font-weight: 600;
//      letter-spacing: 0.3px;
//    }

//    /* Keep HR visible on dark */
//    hr.border-secondary {
//      border-top-color: rgba(255,255,255,0.2) !important;
//    }
//  `}</style>
//);

//export default DashboardPage;
















// src/pages/DashboardPage.tsx
// -------------------------------------------------------------------------------------------------
// PayVerify Dashboard (FULL ORIGINAL + SAFE PATCHES)
// -------------------------------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { Badge } from 'react-bootstrap';

import AdminBanksPanel from '../components/AdminBanksPanel';
import MerchantsModal from '../components/MerchantsModal';
import PurchaseOrdersModal from '../components/PurchaseOrdersModal';
import CreatePurchaseOrderModal from '../components/CreatePurchaseOrderModal';

import AiInsightsPanel from '../components/AiInsightsPanel';
import FraudScoreCard from '../components/FraudScoreCard';

// -----------------------------
// Types
// -----------------------------
type BasicStats = {
    total: number;
    pending: number;
    completed: number;
    sum: number;
};

interface PurchaseOrder {
    id: string;
    poNumber: string;
    poReference?: string;
    amount: number;
    status: string;
    merchantName: string;
}

// -----------------------------
// Helpers
// -----------------------------
const fmtMoney = (v: any) => `₦${Number(v ?? 0).toLocaleString()}`;

const DashboardPage = () => {

    const { token } = useAuth();

    const [stats, setStats] = useState<BasicStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [recentPurchaseOrders, setRecentPurchaseOrders] = useState<PurchaseOrder[]>([]);

    const refreshTimer = useRef<any>(null);

    // 🔥 ADDED: Detect payment changes
    const prevCompletedRef = useRef<number>(0);

    // 🔥 ADDED: Highlight PO
    const [highlightedPO, setHighlightedPO] = useState<string | null>(null);

    // -----------------------------
    // Normalize Purchase Orders (🔥 FIX)
    // -----------------------------
    const normalizePO = (po: any): PurchaseOrder => {
        const poNumber =
            po.po_number ||
            po.poNumber ||
            po.reference ||
            "PO-UNKNOWN";

        return {
            id: po.id,
            poNumber,
            merchantName:
                po.merchant?.name ||
                po.merchantName ||
                po.merchant ||
                "Unknown",
            amount: Number(
                po.total_amount ||
                po.totalAmount ||
                po.amount ||
                0
            ),
            status: po.status || "approved",
            poReference:
                po.po_reference ||
                po.poReference ||
                po.reference ||
                poNumber
        };
    };

    // -----------------------------
    // Fetch Purchase Orders
    // -----------------------------
    const fetchPOs = async () => {
        try {
            const res = await api.get('/purchase-orders', {
                headers: { Authorization: `Bearer ${token}` },
            });

            const orders = res.data?.data ?? res.data ?? [];

            setRecentPurchaseOrders(
                orders.slice(0, 5).map(normalizePO)
            );

        } catch (err) {
            console.error("PO fetch failed", err);
        }
    };

    // -----------------------------
    // Main Fetch
    // -----------------------------
    const fetchALL = async () => {
        try {
            const res = await api.get('/dashboard', {
                headers: { Authorization: `Bearer ${token}` },
            });

            setStats(res.data);

            // 🔥 ============================
            // 🔥 ADDED: PAYMENT DETECTION
            // 🔥 ============================
            const newCompleted = res.data.completed;

            if (
                prevCompletedRef.current !== 0 &&
                newCompleted > prevCompletedRef.current
            ) {
                toast.success("💰 Payment received!");

                try {
                    const txRes = await api.get('/transactions?limit=1', {
                        headers: { Authorization: `Bearer ${token}` },
                    });

                    const latestTx = txRes.data?.[0];

                    if (latestTx) {
                        const match = recentPurchaseOrders.find(
                            (po) =>
                                po.poReference === latestTx.reference ||
                                po.poNumber === latestTx.reference
                        );

                        if (match) {
                            setHighlightedPO(match.id);

                            // 🔥 ADDED: update UI status
                            setRecentPurchaseOrders((prev) =>
                                prev.map((p) =>
                                    p.id === match.id
                                        ? { ...p, status: "completed" }
                                        : p
                                )
                            );

                            setTimeout(() => setHighlightedPO(null), 3000);
                        }
                    }
                } catch {
                    console.warn("Highlight mapping failed");
                }
            }

            prevCompletedRef.current = newCompleted;

            await fetchPOs();

        } catch (err) {
            console.error("Dashboard fetch failed", err);
        } finally {
            setLoading(false);
        }
    };

    // -----------------------------
    // Lifecycle
    // -----------------------------
    useEffect(() => {
        fetchALL();

        // 🔥 ADDED: faster refresh (was 60s)
        refreshTimer.current = setInterval(fetchALL, 5000);

        return () => clearInterval(refreshTimer.current);
    }, []);

    if (loading) return <div>Loading...</div>;

    return (
        <>
            <Navbar />

            <div className="container mt-4 text-light">

                <h2>Dashboard</h2>

                <p>Completed: {stats?.completed}</p>
                <p>Pending: {stats?.pending}</p>

                {/* Purchase Orders */}
                <div className="mt-4">
                    <h5>Recent Purchase Orders</h5>

                    <table className="table table-dark table-hover">
                        <thead>
                            <tr>
                                <th>PO Number</th>
                                <th>Merchant</th>
                                <th>Amount</th>
                                <th>Status</th>
                            </tr>
                        </thead>

                        <tbody>
                            {recentPurchaseOrders.map((po) => (
                                <tr
                                    key={po.id}
                                    className={highlightedPO === po.id ? "po-highlight" : ""} // 🔥 ADDED
                                >
                                    <td><strong>{po.poNumber}</strong></td>
                                    <td>{po.merchantName}</td>
                                    <td>{fmtMoney(po.amount)}</td>

                                    <td>
                                        <Badge bg={po.status === "completed" ? "info" : "success"}>
                                            {po.status}
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            </div>

            {/* 🔥 ADDED: Highlight animation */}
            <style>{`
                .po-highlight {
                    animation: glow 1.5s ease-in-out 2;
                    background: rgba(0, 255, 204, 0.15) !important;
                }

                @keyframes glow {
                    0% { background: rgba(0,255,204,0.6); }
                    100% { background: rgba(0,255,204,0.1); }
                }
            `}</style>
        </>
    );
};

export default DashboardPage;
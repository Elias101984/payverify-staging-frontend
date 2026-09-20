// src/pages/TransactionsPage.tsx
// ------------------------------------------------------------------------------------------
// Enhanced Transactions Page (Inline-styled "glassy" theme)
//
// ✅ What changed (presentation-only):
// 1) Chart polish: soft brand color + gradient fill for the area chart (clearer, on-theme).
// 2) KPI strip: quick GMV/Completed/Pending/Failed for the CURRENT TABLE PAGE (no extra calls).
// 3) Clickable reference: each ref links to /transactions/:reference (drill-down).
// 4) Export CSV: one-click CSV export of the VISIBLE rows (current page only).
//
// ⚠️ No API endpoints, auth flows, or data wiring changed.
// ------------------------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { saveAs } from 'file-saver'; // ⬅️ for Export CSV

// -------------------- Inline Theme Tokens / Helpers ---------------------------------------

const S = {
    // Page background (soft gradient + subtle radial tints)
    page: {
        minHeight: '100vh',
        background: `
      radial-gradient(900px 600px at 10% 110%, rgba(42,123,255,.20), transparent 60%),
      radial-gradient(800px 500px at 100% -10%, rgba(0,195,137,.10), transparent 60%),
      linear-gradient(180deg, #07101f 0%, #0b172b 58%, #0e2039 100%)
    `,
    } as React.CSSProperties,

    // Big frosted "sheet"
    stage: {
        background: 'linear-gradient(145deg, rgba(21,40,72,.88), rgba(8,22,44,.88))',
        border: '1px solid rgba(146,190,255,.22)',
        borderRadius: 24,
        backdropFilter: 'saturate(180%) blur(14px)',
        WebkitBackdropFilter: 'saturate(180%) blur(14px)',
        boxShadow: '0 40px 100px rgba(0,0,0,.38), inset 0 1px rgba(255,255,255,.10)',
        padding: 28,
    } as React.CSSProperties,

    // Hero header
    kicker: {
        display: 'inline-block',
        fontSize: 12,
        fontWeight: 700,
        color: '#dceaff',
        background: 'rgba(76,145,255,.16)',
        borderRadius: 999,
        padding: '6px 10px',
    } as React.CSSProperties,
    title: {
        fontWeight: 800,
        letterSpacing: '-.02em',
        lineHeight: 1.06,
        fontSize: 'clamp(28px, 4.5vw, 48px)',
        color: '#eef5ff',
        margin: '4px 0 10px',
    } as React.CSSProperties,
    divider: {
        height: 3,
        background: 'linear-gradient(90deg,#5ca5ff,#67e4c0)',
        borderRadius: 999,
        margin: '12px 0 4px',
    } as React.CSSProperties,
    subtle: { color: '#91a8c7' } as React.CSSProperties,

    // Pills
    pillGroup: {
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        background: 'rgba(255,255,255,.07)',
        padding: 6,
        borderRadius: 999,
    } as React.CSSProperties,
    pill: {
        border: 0,
        background: 'transparent',
        padding: '6px 14px',
        borderRadius: 999,
        fontWeight: 700,
        color: '#9fb4d3',
        cursor: 'pointer',
    } as React.CSSProperties,
    pillActive: {
        background: 'rgba(76,145,255,.28)',
        color: '#fff',
        boxShadow: '0 4px 14px rgba(0,0,0,.25)',
    } as React.CSSProperties,

    // Glass cards
    card: {
        background: 'linear-gradient(145deg, rgba(24,48,86,.72), rgba(10,27,52,.78))',
        border: '1px solid rgba(145,190,255,.18)',
        borderRadius: 20,
        boxShadow: '0 18px 45px rgba(0,0,0,.24), inset 0 1px rgba(255,255,255,.08)',
        backdropFilter: 'saturate(160%) blur(12px)',
        WebkitBackdropFilter: 'saturate(180%) blur(8px)',
    } as React.CSSProperties,

    // Forms
    input: { borderRadius: 14, borderColor: 'rgba(145,190,255,.22)', background: 'rgba(5,15,31,.55)', color: '#eef5ff' } as React.CSSProperties,
    label: { fontWeight: 600, color: '#a8bdd9' } as React.CSSProperties,
    btnPrimary: { borderRadius: 999, paddingInline: 18, fontWeight: 700 } as React.CSSProperties,

    // Table polish
    th: { fontWeight: 700, color: '#9fb7d5', borderBottomColor: 'rgba(145,190,255,.18)' } as React.CSSProperties,

    // Badges
    badgeSuccess: { background: '#00c389', color: '#fff', borderRadius: 999, padding: '0.5rem 0.7rem', fontWeight: 700 } as React.CSSProperties,
    badgeDanger: { background: '#ff6161', color: '#fff', borderRadius: 999, padding: '0.5rem 0.7rem', fontWeight: 700 } as React.CSSProperties,
    badgePending: { background: '#ffd66e', color: '#3b3b45', borderRadius: 999, padding: '0.5rem 0.7rem', fontWeight: 700 } as React.CSSProperties,
};

// -------------------- Types ---------------------------------------------------------------

type Tx = {
    id: number;
    amount: number;
    status: 'pending' | 'completed' | 'failed';
    reference: string;
    merchantId: number;
    createdAt: string;
    updatedAt: string;
    merchant?: { id: number; name: string };
};
type MerchantLite = { id: number; name: string };

type Interval = 'day' | 'week' | 'month' | 'year';

type TableFilters = {
    status: 'all' | 'pending' | 'completed' | 'failed';
    merchantId: number | 'all';
    startDate?: string;
    endDate?: string;
    ref?: string;
};

/** Local chart types (Axis-style) */
type ChartPoint = { x: string | number | Date; y: number };
type ChartSeriesAxisLike = Array<{ name: string; data: Array<number | ChartPoint> }>;

// -------------------- Utils ----------------------------------------------------------------

const fmtNaira = (n: number) => `₦${Number(n || 0).toLocaleString('en-NG')}`;

// Export CSV for the VISIBLE rows (current page only) — small quality-of-life helper.
function exportCsv(rows: Tx[]) {
    const header = ['Date', 'Reference', 'Merchant', 'Amount', 'Status'];
    const lines = rows.map(r => [
        new Date(r.createdAt).toISOString(),
        r.reference,
        (r.merchant?.name ?? `#${r.merchantId}`).replace(/,/g, ' '),
        String(r.amount ?? 0),
        r.status,
    ].join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'transactions-page.csv');
}

// -------------------- Data hooks -----------------------------------------------------------

function useTransactionsData(
    isAdmin: boolean,
    token: string | undefined,
    filters: TableFilters
) {
    const [rows, setRows] = useState<Tx[]>([]);
    const [count, setCount] = useState(0);
    const [limit, setLimit] = useState(10);
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTransactions = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const endpoint = isAdmin ? '/transactions/admin' : '/transactions';
            const params: any = { limit, offset };

            if (filters.status !== 'all') params.status = filters.status;
            if (isAdmin && filters.merchantId !== 'all') params.merchantId = filters.merchantId;
            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;
            if (filters.ref) params.ref = filters.ref;

            const res = await api.get(endpoint, {
                params,
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });

            const { rows: data, count: total } = res.data ?? { rows: [], count: 0 };
            setRows(Array.isArray(data) ? data : []);
            setCount(typeof total === 'number' ? total : 0);
        } catch (e: any) {
            console.error(e);
            setError(e?.response?.data?.message || 'Failed to load transactions');
            setRows([]);
            setCount(0);
        } finally {
            setLoading(false);
        }
    }, [isAdmin, token, limit, offset, filters]);

    useEffect(() => { fetchTransactions(); }, [fetchTransactions]);
    useEffect(() => { setOffset(0); }, [filters.status, filters.merchantId, filters.startDate, filters.endDate, filters.ref]);

    return { rows, count, limit, offset, loading, error, setLimit, setOffset, refetch: fetchTransactions };
}

function useAnalyticsData(isAdmin: boolean, token?: string, filters?: TableFilters) {
    const [series, setSeries] = useState<ChartSeriesAxisLike>([]);
    const [totals, setTotals] = useState({ count: 0, totalAmount: 0, completed: 0, pending: 0, failed: 0 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [interval, setInterval] = useState<Interval>('day');
    const [selectedMerchantId, setSelectedMerchantId] = useState<number | 'all'>('all');

    const fetchChart = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const params: any = { interval };
            if (isAdmin && selectedMerchantId !== 'all') params.merchantId = selectedMerchantId;
            if (filters?.startDate) params.dateFrom = filters.startDate;
            if (filters?.endDate) params.dateTo = filters.endDate;

            const res = await api.get('/analytics/transactions/summary', {
                params,
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });

            const pts: Array<{ bucket?: string; date?: string; totalAmount: number }> = res.data?.series ?? [];
            setSeries([{ name: 'Amount', data: pts.map((p) => ({ x: p.bucket ?? p.date ?? '', y: Number(p.totalAmount || 0) })) }]);
            setTotals({
                count: Number(res.data?.totals?.count || 0),
                totalAmount: Number(res.data?.totals?.totalAmount || 0),
                completed: Number(res.data?.totals?.completed || 0),
                pending: Number(res.data?.totals?.pending || 0),
                failed: Number(res.data?.totals?.failed || 0),
            });
        } catch (e: any) {
            console.error(e);
            setError(e?.response?.data?.message || 'Failed to load analytics');
            setSeries([]);
            setTotals({ count: 0, totalAmount: 0, completed: 0, pending: 0, failed: 0 });
        } finally {
            setLoading(false);
        }
    }, [interval, isAdmin, selectedMerchantId, token, filters?.startDate, filters?.endDate]);

    useEffect(() => { fetchChart(); }, [fetchChart]);

    return { series, totals, loading, error, interval, setInterval, selectedMerchantId, setSelectedMerchantId, refetch: fetchChart };
}

function useMyMerchants(enabled: boolean, token?: string) {
    const [options, setOptions] = useState<MerchantLite[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);

    useEffect(() => {
        if (!enabled) return;
        (async () => {
            try {
                const res = await api.get('/me/merchants', {
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                });
                const payload = res.data?.rows ?? res.data ?? [];
                const list: MerchantLite[] = (Array.isArray(payload) ? payload : []).map((m: any) => ({
                    id: m.id,
                    name: m.name || m.businessName || `#${m.id}`,
                }));
                setOptions(list);
                if (list.length === 1) setSelectedId(list[0].id);
            } catch (e) { console.error(e); }
        })();
    }, [enabled, token]);

    return { options, selectedId, setSelectedId };
}

// -------------------- Presentational bits ------------------------------------------------

function FiltersCard(props: {
    isAdmin: boolean;
    merchantOptions: MerchantLite[];
    filters: TableFilters;
    onChange: (patch: Partial<TableFilters>) => void;
    onApply: () => void;
    onReset: () => void;
}) {
    const { isAdmin, merchantOptions, filters, onChange, onApply, onReset } = props;

    return (
        <div className="card shadow-sm mb-4" style={S.card}>
            <div className="card-body">
                <div className="row g-3 align-items-end">
                    {isAdmin && (
                        <div className="col-md-3">
                            <label className="form-label" style={S.label}>Merchant</label>
                            <select
                                className="form-select"
                                style={S.input}
                                value={filters.merchantId}
                                onChange={(e) => onChange({ merchantId: e.target.value === 'all' ? 'all' : Number(e.target.value) })}
                            >
                                <option value="all">All merchants</option>
                                {merchantOptions.map((m) => (
                                    <option key={m.id} value={m.id}>{m.name} (#{m.id})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="col-md-2">
                        <label className="form-label" style={S.label}>Status</label>
                        <select
                            className="form-select"
                            style={S.input}
                            value={filters.status}
                            onChange={(e) => onChange({ status: e.target.value as TableFilters['status'] })}
                        >
                            <option value="all">All</option>
                            <option value="completed">Completed</option>
                            <option value="pending">Pending</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>

                    <div className="col-md-2">
                        <label className="form-label" style={S.label}>Start date</label>
                        <input
                            type="date"
                            className="form-control"
                            style={S.input}
                            value={filters.startDate || ''}
                            onChange={(e) => onChange({ startDate: e.target.value || undefined })}
                        />
                    </div>

                    <div className="col-md-2">
                        <label className="form-label" style={S.label}>End date</label>
                        <input
                            type="date"
                            className="form-control"
                            style={S.input}
                            value={filters.endDate || ''}
                            onChange={(e) => onChange({ endDate: e.target.value || undefined })}
                        />
                    </div>

                    <div className="col-md-2">
                        <label className="form-label" style={S.label}>Reference contains</label>
                        <input
                            type="text"
                            className="form-control"
                            style={S.input}
                            value={filters.ref || ''}
                            onChange={(e) => onChange({ ref: e.target.value || undefined })}
                            placeholder="e.g. PV-2025…"
                        />
                    </div>

                    <div className="col-md-1 d-flex gap-2">
                        <button className="btn btn-primary w-100" style={S.btnPrimary} onClick={onApply} title="Apply filters">
                            Apply
                        </button>
                    </div>

                    <div className="col-md-1 d-flex gap-2">
                        <button className="btn btn-outline-secondary w-100" onClick={onReset} title="Reset filters">
                            Reset
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function TransactionsTable(props: { rows: Tx[]; isAdmin: boolean; loading: boolean; error: string | null }) {
    const { rows, isAdmin, loading, error } = props;

    return (
        <div className="card shadow-sm" style={S.card}>
            <div className="card-body p-0">
                {error && <div className="alert alert-danger m-3 mb-0">{error}</div>}
                <div className="table-responsive">
                    <table className="table table-striped table-hover mb-0">
                        <thead className="table-light">
                            <tr>
                                <th style={{ width: 180, ...S.th }}>Date</th>
                                <th style={S.th as any}>Reference</th>
                                <th style={S.th as any}>Merchant</th>
                                <th className="text-end" style={S.th as any}>Amount (₦)</th>
                                <th style={S.th as any}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan={5} className="text-muted ps-4 py-3" aria-live="polite">
                                        Loading transactions…
                                    </td>
                                </tr>
                            )}
                            {!loading && rows.length === 0 && !error && (
                                <tr>
                                    <td colSpan={5} className="text-muted ps-4 py-3">
                                        No transactions found.
                                    </td>
                                </tr>
                            )}
                            {!loading && !error && rows.map((tx) => {
                                const badgeStyle =
                                    tx.status === 'completed' ? S.badgeSuccess :
                                        tx.status === 'failed' ? S.badgeDanger : S.badgePending;

                                return (
                                    <tr key={tx.id}>
                                        <td>{new Date(tx.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</td>
                                        <td className="font-monospace">
                                            {/* 🔗 Change: clickable reference -> /transactions/:reference */}
                                            <Link
                                                to={`/transactions/${tx.reference}`}
                                                className="text-primary text-decoration-none"
                                                title="Open details"
                                            >
                                                {tx.reference}
                                            </Link>
                                        </td>
                                        <td>{tx.merchant?.name || `#${tx.merchantId}`}</td>
                                        <td className="text-end">{Number(tx.amount || 0).toLocaleString('en-NG')}</td>
                                        <td><span className="badge" style={badgeStyle}>{tx.status}</span></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function PaginationFooter(props: {
    limit: number; offset: number; total: number; visibleCount: number;
    onPrev: () => void; onNext: () => void; onChangeLimit: (n: number) => void;
}) {
    const { limit, offset, total, visibleCount, onPrev, onNext, onChangeLimit } = props;
    const canPrev = offset > 0;
    const canNext = offset + limit < total;

    return (
        <div className="d-flex justify-content-between align-items-center mt-2">
            <div className="text-muted small">
                Page {Math.floor(offset / limit) + 1} • Showing {visibleCount} of {total.toLocaleString()}
            </div>
            <div className="d-flex align-items-center gap-2">
                <button className="btn btn-sm btn-outline-secondary" onClick={onPrev} disabled={!canPrev}>Previous</button>
                <button className="btn btn-sm btn-outline-secondary" onClick={onNext} disabled={!canNext}>Next</button>
                <select
                    className="form-select form-select-sm ms-2"
                    style={{ width: 120 }}
                    value={limit}
                    onChange={(e) => onChangeLimit(Number(e.target.value))}
                >
                    <option value={10}>10 / page</option>
                    <option value={20}>20 / page</option>
                    <option value={50}>50 / page</option>
                </select>
            </div>
        </div>
    );
}

function CreateTransactionCard(props: {
    isAdmin: boolean;
    token?: string;
    adminMerchantOptions: MerchantLite[];
    myMerchants: MerchantLite[];
    mySelectedMerchantId: number | null;
    setMySelectedMerchantId: (id: number | null) => void;
    onSuccess: () => void;
}) {
    const {
        isAdmin, token, adminMerchantOptions, myMerchants,
        mySelectedMerchantId, setMySelectedMerchantId, onSuccess,
    } = props;

    const [amount, setAmount] = useState('');
    const [status, setStatus] = useState<Tx['status']>('pending');
    const [adminMerchantId, setAdminMerchantId] = useState<number | ''>('');
    const [saving, setSaving] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amountNum = Number(amount);
        if (!amountNum || amountNum <= 0) return toast.error('Enter a valid amount.');

        try {
            setSaving(true);

            if (isAdmin) {
                if (!adminMerchantId) return toast.error('Please select a merchant.');
                await api.post(
                    '/transactions/admin',
                    { merchantId: adminMerchantId, amount: amountNum, status },
                    { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
                );
            } else {
                await api.post(
                    '/transactions',
                    { amount: amountNum, status, merchantId: mySelectedMerchantId ?? undefined },
                    { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
                );
            }

            toast.success('Transaction created');
            setAmount('');
            setStatus('pending');
            if (isAdmin) setAdminMerchantId('');
            onSuccess();
        } catch (err: any) {
            console.error(err);
            toast.error(err?.response?.data?.message || 'Failed to create transaction');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="card shadow-sm mb-4" style={S.card}>
            <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">Create Transaction</h5>
                </div>

                <form className="row g-3 align-items-end" onSubmit={submit}>
                    {isAdmin ? (
                        <div className="col-md-4">
                            <label className="form-label" style={S.label}>Merchant</label>
                            <select
                                className="form-select"
                                style={S.input}
                                value={adminMerchantId}
                                onChange={(e) => setAdminMerchantId(Number(e.target.value))}
                                required
                            >
                                <option value="" disabled>Select a merchant…</option>
                                {adminMerchantOptions.map((m) => (
                                    <option key={m.id} value={m.id}>{m.name} (#{m.id})</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div className="col-md-4">
                            <label className="form-label" style={S.label}>Merchant</label>
                            {myMerchants.length <= 1 ? (
                                <input
                                    className="form-control"
                                    style={S.input}
                                    value={myMerchants.length === 1 ? `${myMerchants[0].name} (#${myMerchants[0].id})` : 'No merchants'}
                                    disabled
                                />
                            ) : (
                                <select
                                    className="form-select"
                                    style={S.input}
                                    value={mySelectedMerchantId ?? ''}
                                    onChange={(e) => setMySelectedMerchantId(Number(e.target.value))}
                                    required
                                >
                                    <option value="" disabled>Select a merchant…</option>
                                    {myMerchants.map((m) => (
                                        <option key={m.id} value={m.id}>{m.name} (#{m.id})</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    <div className="col-md-3">
                        <label className="form-label" style={S.label}>Amount (₦)</label>
                        <input
                            type="number" min="0" step="0.01"
                            className="form-control"
                            style={S.input}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            required
                        />
                    </div>

                    <div className="col-md-3">
                        <label className="form-label" style={S.label}>Status</label>
                        <select
                            className="form-select"
                            style={S.input}
                            value={status}
                            onChange={(e) => setStatus(e.target.value as Tx['status'])}
                        >
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>

                    <div className="col-md-2 d-grid">
                        <button className="btn btn-primary" style={S.btnPrimary} type="submit" disabled={saving}>
                            {saving ? 'Saving…' : 'Create'}
                        </button>
                    </div>
                </form>

                <small className="text-muted d-block mt-2">
                    Reference is generated automatically on the server for traceability.
                </small>
            </div>
        </div>
    );
}

// -------------------- Page ----------------------------------------------------------------

export default function TransactionsPage() {
    const { user, token } = useAuth() as any;
    const isAdmin = (user?.role || '').toLowerCase() === 'admin';

    const [pendingFilters, setPendingFilters] = useState<TableFilters>({
        status: 'all', merchantId: 'all', startDate: undefined, endDate: undefined, ref: undefined,
    });
    const [appliedFilters, setAppliedFilters] = useState<TableFilters>(pendingFilters);
    const [viewMode, setViewMode] = useState<'daily' | 'overview'>('daily');

    const { rows, count, limit, offset, loading, error, setLimit, setOffset, refetch } =
        useTransactionsData(isAdmin, token, appliedFilters);

    const tableMerchantOptions: MerchantLite[] = useMemo(() => {
        const map = new Map<number, string>();
        for (const r of rows) {
            const id = r.merchant?.id ?? r.merchantId;
            const name = r.merchant?.name || `#${r.merchantId}`;
            if (typeof id === 'number' && !map.has(id)) map.set(id, name);
        }
        return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    }, [rows]);

    const {
        series, totals, loading: chartLoading, error: chartError,
        interval, setInterval, selectedMerchantId, setSelectedMerchantId,
    } = useAnalyticsData(isAdmin, token, appliedFilters);

    const handlePrev = () => setOffset((p) => Math.max(0, p - limit));
    const handleNext = () => setOffset((p) => p + limit);
    const handleChangeLimit = (n: number) => { setLimit(n); setOffset(0); };

    const applyFilters = () => {
        // Always return to the first page when criteria change; otherwise a
        // valid filter can appear empty because the old offset is out of range.
        setOffset(0);
        setAppliedFilters({ ...pendingFilters });
    };
    const resetFilters = () => {
        const clean = { status: 'all', merchantId: 'all', startDate: undefined, endDate: undefined, ref: undefined } as TableFilters;
        setPendingFilters(clean);
        setOffset(0);
        setAppliedFilters(clean);
    };

    // 🎨 Chart polish: soft brand color + gradient fill
    const chartOptions: ApexOptions = {
        chart: { type: 'area', height: 300, toolbar: { show: false } },
        stroke: { curve: 'smooth' },
        dataLabels: { enabled: false },
        colors: ['#2f6fed'],
        fill: {
            type: 'gradient',
            gradient: { shadeIntensity: 0.9, opacityFrom: 0.35, opacityTo: 0.05, stops: [0, 100] }
        },
        xaxis: { type: 'category', labels: { rotate: -15 } },
        yaxis: { labels: { formatter: (n: number) => fmtNaira(n) } },
        tooltip: { y: { formatter: (n: number) => fmtNaira(n) } },
    };

    const seriesForApex = series as unknown as any;

    // 🧮 KPI strip (current page only — quick signal, no extra calls)
    const pageKpis = useMemo(() => {
        const total = rows.length;
        const gmv = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
        const completed = rows.filter(r => r.status === 'completed').length;
        const pending = rows.filter(r => r.status === 'pending').length;
        const failed = rows.filter(r => r.status === 'failed').length;
        return { total, gmv, completed, pending, failed };
    }, [rows]);

    return (
        <div className="pv-transactions-page" style={S.page}>
            <style>{`
                .pv-transactions-page { color: #e8f1ff; }
                .pv-transactions-page .text-muted { color: #c4d5eb !important; }
                .pv-transactions-page .card-body,
                .pv-transactions-page .card-body h5,
                .pv-transactions-page .card-body h6,
                .pv-transactions-page .card-body label { color: #eef5ff; }
                .pv-transactions-page .fw-bold { color: #eef5ff; }
                .pv-transactions-page .fw-bold.text-success { color: #35d6a0 !important; }
                .pv-transactions-page .fw-bold.text-warning { color: #ffd66e !important; }
                .pv-transactions-page .fw-bold.text-danger { color: #ff7b88 !important; }
                .pv-transactions-page .form-control,
                .pv-transactions-page .form-select {
                    color: #eef5ff !important;
                    background-color: rgba(5,15,31,.58) !important;
                    border-color: rgba(145,190,255,.22) !important;
                }
                .pv-transactions-page .form-control::placeholder { color: #6f88a8; }
                .pv-transactions-page .form-select option { color: #e8f1ff; background: #102441; }
                .pv-transactions-page .table { --bs-table-bg: transparent; --bs-table-color: #e8f1ff; --bs-table-border-color: rgba(145,190,255,.13); }
                .pv-transactions-page .table td { color: #e8f1ff !important; }
                .pv-transactions-page .table thead th { background: rgba(6,17,35,.48); color: #9fb7d5 !important; }
                .pv-transactions-page .table tbody tr { background: rgba(255,255,255,.025); }
                .pv-transactions-page .table tbody tr:hover { background: rgba(76,145,255,.12); }
                .pv-transactions-page .table a { color: #73b0ff !important; }
                .pv-transactions-page .btn-outline-secondary { color: #b6cbe5; border-color: rgba(145,190,255,.35); }
                .pv-transactions-page .btn-outline-secondary:hover { color: #fff; background: rgba(76,145,255,.20); }
                .pv-transactions-page .apexcharts-gridline { stroke: rgba(145,190,255,.14); }
                .pv-transactions-page .apexcharts-text { fill: #91a8c7; }
            `}</style>
            <Navbar />
            <main className="container-xl py-5">
                <div className="position-relative" style={S.stage}>
                    {/* HERO HEADER */}
                    <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
                        <div>
                            <span style={S.kicker}>Daily</span>
                            <h1 style={S.title}>{isAdmin ? 'All Transactions (Admin)' : 'My Transactions'}</h1>
                            <div style={S.divider} />
                            <div style={S.subtle}>
                                {isAdmin ? 'Displaying all users’ transactions' : 'Transactions for your merchant account'}
                            </div>
                        </div>
                        <div className="mt-3 mt-md-0" style={S.pillGroup}>
                            <button type="button" onClick={() => setViewMode('daily')} style={viewMode === 'daily' ? { ...S.pill, ...S.pillActive } : S.pill}>Daily</button>
                            <button type="button" onClick={() => setViewMode('overview')} style={viewMode === 'overview' ? { ...S.pill, ...S.pillActive } : S.pill}>Overview</button>
                        </div>
                    </div>

                    {/* Analytics / overview */}
                    {viewMode === 'overview' ? (
                        <div className="card shadow-sm mb-4" style={S.card}>
                            <div className="card-body">
                                <h5 className="mb-1">Transaction overview</h5>
                                <div className="text-muted mb-3">Summary for the currently selected filters and {interval} interval.</div>
                                <div className="row g-3">
                                    <div className="col-6 col-lg-3"><div className="p-3 rounded-3" style={{ background: 'rgba(76,145,255,.14)' }}><div className="text-muted">Total transactions</div><div className="fs-4 fw-bold">{totals.count.toLocaleString()}</div></div></div>
                                    <div className="col-6 col-lg-3"><div className="p-3 rounded-3" style={{ background: 'rgba(0,195,137,.14)' }}><div className="text-muted">Total GMV</div><div className="fs-4 fw-bold">{fmtNaira(totals.totalAmount)}</div></div></div>
                                    <div className="col-6 col-lg-3"><div className="p-3 rounded-3" style={{ background: 'rgba(255,214,110,.14)' }}><div className="text-muted">Pending</div><div className="fs-4 fw-bold text-warning">{totals.pending.toLocaleString()}</div></div></div>
                                    <div className="col-6 col-lg-3"><div className="p-3 rounded-3" style={{ background: 'rgba(255,97,97,.14)' }}><div className="text-muted">Failed</div><div className="fs-4 fw-bold text-danger">{totals.failed.toLocaleString()}</div></div></div>
                                </div>
                            </div>
                        </div>
                    ) : <div className="card shadow-sm mb-4" style={S.card}>
                        <div className="card-body">
                            <div className="d-flex flex-wrap gap-3 justify-content-between mb-2">
                                <div className="text-muted">Aggregated amounts by {interval}</div>
                                <div className="d-flex flex-wrap gap-2">
                                    <select
                                        className="form-select form-select-sm"
                                        style={S.input}
                                        value={interval}
                                        onChange={(e) => setInterval(e.target.value as Interval)}
                                    >
                                        <option value="day">Day</option>
                                        <option value="week">Week</option>
                                        <option value="month">Month</option>
                                        <option value="year">Year</option>
                                    </select>

                                    {isAdmin && (
                                        <select
                                            className="form-select form-select-sm"
                                            style={S.input}
                                            value={selectedMerchantId}
                                            onChange={(e) => setSelectedMerchantId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                                        >
                                            <option value="all">All merchants</option>
                                            {tableMerchantOptions.map((m) => (
                                                <option key={m.id} value={m.id}>{m.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>

                            {chartLoading ? (
                                <div className="text-muted" aria-live="polite">Loading analytics…</div>
                            ) : chartError ? (
                                <div className="text-danger">{chartError}</div>
                            ) : (
                                <ReactApexChart options={chartOptions} series={seriesForApex} type="area" height={300} />
                            )}
                        </div>
                    </div>}

                    {/* KPI strip for the selected analytics interval */}
                    <div className="card shadow-sm mb-4" style={S.card}>
                        <div className="card-body">
                            <div className="row g-3 text-center">
                                <div className="col-6 col-md-2 offset-md-1">
                                    <div style={S.subtle}>Transactions</div>
                                    <div className="fw-bold fs-5">{totals.count.toLocaleString()}</div>
                                </div>
                                <div className="col-6 col-md-3">
                                    <div style={S.subtle}>GMV</div>
                                    <div className="fw-bold fs-5">{fmtNaira(totals.totalAmount)}</div>
                                </div>
                                <div className="col-4 col-md-2">
                                    <div style={S.subtle}>Completed</div>
                                    <div className="fw-bold text-success">{totals.completed.toLocaleString()}</div>
                                </div>
                                <div className="col-4 col-md-2">
                                    <div style={S.subtle}>Pending</div>
                                    <div className="fw-bold text-warning">{totals.pending.toLocaleString()}</div>
                                </div>
                                <div className="col-4 col-md-2">
                                    <div style={S.subtle}>Failed</div>
                                    <div className="fw-bold text-danger">{totals.failed.toLocaleString()}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <FiltersCard
                        isAdmin={isAdmin}
                        merchantOptions={tableMerchantOptions}
                        filters={pendingFilters}
                        onChange={(patch) => setPendingFilters((f) => ({ ...f, ...patch }))}
                        onApply={applyFilters}
                        onReset={resetFilters}
                    />

                    {/* Table */}
                    <TransactionsTable rows={rows} isAdmin={isAdmin} loading={loading} error={error} />

                    {/* Export + Pagination */}
                    <div className="d-flex justify-content-end mt-3">
                        {/* 🔽 New: Export visible rows to CSV */}
                        <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => exportCsv(rows)}
                            title="Export current page to CSV"
                        >
                            Export CSV
                        </button>
                    </div>

                    <PaginationFooter
                        limit={limit} offset={offset} total={count} visibleCount={rows.length}
                        onPrev={handlePrev} onNext={handleNext} onChangeLimit={handleChangeLimit}
                    />
                </div>
            </main>
        </div>
    );
}

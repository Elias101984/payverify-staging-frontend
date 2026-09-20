import { useMemo, useState } from 'react';
import { Modal, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

export type OperationKind = 'refunds' | 'disputes' | 'cancellations';

export type OperationsSummary = {
    refunds: number;
    pendingRefunds: number;
    disputes: number;
    openDisputes: number;
    cancellations: number;
    needsAttention: number;
};

export type OperationRecord = {
    id: number;
    amount?: number | string;
    status: string;
    reference?: string;
    transactionId?: number;
    transactionAmount?: number | string;
    merchantName?: string;
    reason?: string | null;
    reasonCode?: string | null;
    poReference?: string;
    customerEmail?: string | null;
    customerPhone?: string | null;
    createdAt?: string;
    openedAt?: string;
    cancelledAt?: string;
};

export type DashboardOperations = {
    summary: OperationsSummary;
    refunds: OperationRecord[];
    disputes: OperationRecord[];
    cancellations: OperationRecord[];
};

type Props = {
    open: boolean;
    onClose: () => void;
    data: DashboardOperations;
    loading?: boolean;
    onRefresh: () => Promise<void> | void;
    initialTab?: OperationKind;
};

const emptySummary: OperationsSummary = {
    refunds: 0,
    pendingRefunds: 0,
    disputes: 0,
    openDisputes: 0,
    cancellations: 0,
    needsAttention: 0,
};

export const emptyDashboardOperations: DashboardOperations = {
    summary: emptySummary,
    refunds: [],
    disputes: [],
    cancellations: [],
};

const money = (value: unknown) =>
    `₦${Number(value || 0).toLocaleString('en-NG', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}`;

const date = (value?: string) => {
    if (!value) return '—';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
        ? '—'
        : parsed.toLocaleString('en-NG', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
};

const label = (status: string) =>
    String(status || 'unknown')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());

const statusTone = (status: string) => {
    const normalized = String(status).toLowerCase();
    if (['succeeded', 'won', 'resolved'].includes(normalized)) return 'success';
    if (['failed', 'lost'].includes(normalized)) return 'danger';
    if (['pending', 'processing', 'open', 'awaiting-merchant-feedback'].includes(normalized)) {
        return 'warning';
    }
    return 'neutral';
};

const OperationsCenterModal = ({
    open,
    onClose,
    data,
    loading = false,
    onRefresh,
    initialTab = 'disputes',
}: Props) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<OperationKind>(initialTab);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');

    const records = data[activeTab] || [];
    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        return records.filter(record => {
            const matchesStatus = status === 'all' || record.status === status;
            const haystack = [
                record.reference,
                record.poReference,
                record.merchantName,
                record.reason,
                record.reasonCode,
                record.customerEmail,
                record.customerPhone,
            ].filter(Boolean).join(' ').toLowerCase();
            return matchesStatus && (!term || haystack.includes(term));
        });
    }, [records, search, status]);

    const statuses = useMemo(
        () => Array.from(new Set(records.map(record => record.status))).sort(),
        [records]
    );

    const changeTab = (tab: OperationKind) => {
        setActiveTab(tab);
        setSearch('');
        setStatus('all');
    };

    const openRecord = (record: OperationRecord) => {
        onClose();
        if (activeTab === 'cancellations') {
            navigate(`/purchase-orders/${record.id}`);
            return;
        }
        if (record.reference) navigate(`/transactions/${record.reference}`);
    };

    return (
        <>
            <Modal show={open} onHide={onClose} size="xl" centered className="pv-ops-modal">
                <Modal.Header closeButton>
                    <div>
                        <div className="pv-ops-eyebrow">OPERATIONS CONTROL</div>
                        <Modal.Title>Exceptions & Adjustments</Modal.Title>
                        <p className="mb-0">Refunds, disputes and cancelled orders in one place.</p>
                    </div>
                </Modal.Header>

                <Modal.Body>
                    <div className="pv-ops-summary">
                        <button type="button" onClick={() => changeTab('disputes')}>
                            <span>Open disputes</span>
                            <strong>{data.summary.openDisputes}</strong>
                            <small>{data.summary.disputes} total</small>
                        </button>
                        <button type="button" onClick={() => changeTab('refunds')}>
                            <span>Pending refunds</span>
                            <strong>{data.summary.pendingRefunds}</strong>
                            <small>{data.summary.refunds} total</small>
                        </button>
                        <button type="button" onClick={() => changeTab('cancellations')}>
                            <span>Cancelled orders</span>
                            <strong>{data.summary.cancellations}</strong>
                            <small>No payment required</small>
                        </button>
                    </div>

                    <div className="pv-ops-toolbar">
                        <div className="pv-ops-tabs" role="tablist" aria-label="Operation type">
                            {(['disputes', 'refunds', 'cancellations'] as OperationKind[]).map(tab => (
                                <button
                                    type="button"
                                    key={tab}
                                    className={activeTab === tab ? 'active' : ''}
                                    onClick={() => changeTab(tab)}
                                >
                                    {label(tab)}
                                </button>
                            ))}
                        </div>
                        <div className="pv-ops-filters">
                            <input
                                value={search}
                                onChange={event => setSearch(event.target.value)}
                                placeholder="Search reference, merchant or reason"
                                aria-label="Search operations"
                            />
                            <select value={status} onChange={event => setStatus(event.target.value)}>
                                <option value="all">All statuses</option>
                                {statuses.map(item => (
                                    <option key={item} value={item}>{label(item)}</option>
                                ))}
                            </select>
                            <button type="button" className="pv-ops-refresh" onClick={onRefresh} disabled={loading}>
                                {loading ? <Spinner animation="border" size="sm" /> : 'Refresh'}
                            </button>
                        </div>
                    </div>

                    <div className="table-responsive pv-ops-table-wrap">
                        <table className="table pv-ops-table align-middle mb-0">
                            <thead>
                                <tr>
                                    <th>{activeTab === 'cancellations' ? 'Order' : 'Transaction'}</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>{activeTab === 'disputes' ? 'Reason code' : activeTab === 'refunds' ? 'Reason' : 'Customer'}</th>
                                    <th>Date</th>
                                    <th aria-label="Action" />
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length ? filtered.map(record => (
                                    <tr key={`${activeTab}-${record.id}`}>
                                        <td>
                                            <strong>{record.poReference || record.reference || `#${record.id}`}</strong>
                                            {record.merchantName && <small>{record.merchantName}</small>}
                                        </td>
                                        <td>{money(record.amount)}</td>
                                        <td>
                                            <span className={`pv-ops-status ${statusTone(record.status)}`}>
                                                {label(record.status)}
                                            </span>
                                        </td>
                                        <td>
                                            {record.reasonCode || record.reason ||
                                                record.customerPhone || record.customerEmail || '—'}
                                        </td>
                                        <td>{date(record.cancelledAt || record.openedAt || record.createdAt)}</td>
                                        <td className="text-end">
                                            <button type="button" className="pv-ops-review" onClick={() => openRecord(record)}>
                                                Review
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="pv-ops-empty">
                                            No {activeTab} match the current filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Modal.Body>
            </Modal>

            <style>{`
                .pv-ops-modal .modal-content {
                    color: #edf5ff;
                    border: 1px solid rgba(130, 183, 255, .28);
                    border-radius: 24px;
                    overflow: hidden;
                    background:
                        radial-gradient(900px 440px at 82% -12%, rgba(38, 126, 255, .30), transparent 62%),
                        linear-gradient(145deg, rgba(18, 27, 45, .98), rgba(7, 17, 34, .98));
                    box-shadow: 0 28px 90px rgba(0, 0, 0, .65), inset 0 1px 0 rgba(255,255,255,.12);
                }
                .pv-ops-modal .modal-header { border-color: rgba(255,255,255,.1); padding: 24px 28px; }
                .pv-ops-modal .modal-header p { color: rgba(226,239,255,.7); }
                .pv-ops-modal .btn-close { filter: invert(1); opacity: .8; }
                .pv-ops-modal .modal-body { padding: 24px 28px 28px; }
                .pv-ops-eyebrow { color: #69adff; letter-spacing: .15em; font-size: .72rem; font-weight: 900; }
                .pv-ops-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 22px; }
                .pv-ops-summary button {
                    display: grid; grid-template-columns: 1fr auto; text-align: left; color: #f2f7ff;
                    border: 1px solid rgba(255,255,255,.12); border-radius: 16px; padding: 15px 17px;
                    background: linear-gradient(160deg, rgba(255,255,255,.11), rgba(255,255,255,.035));
                    box-shadow: inset 0 1px rgba(255,255,255,.12), 0 10px 28px rgba(0,0,0,.22);
                }
                .pv-ops-summary button:hover { transform: translateY(-1px); border-color: rgba(92,165,255,.55); }
                .pv-ops-summary span { font-size: .78rem; color: rgba(227,239,255,.72); text-transform: uppercase; letter-spacing: .06em; }
                .pv-ops-summary strong { grid-row: span 2; font-size: 1.85rem; line-height: 1; }
                .pv-ops-summary small { color: rgba(227,239,255,.52); }
                .pv-ops-toolbar { display: flex; justify-content: space-between; gap: 14px; margin-bottom: 14px; flex-wrap: wrap; }
                .pv-ops-tabs { display: flex; gap: 5px; padding: 4px; border-radius: 12px; background: rgba(0,0,0,.22); }
                .pv-ops-tabs button { border: 0; border-radius: 9px; padding: 8px 13px; color: rgba(235,244,255,.68); background: transparent; font-weight: 800; }
                .pv-ops-tabs button.active { color: white; background: linear-gradient(135deg,#1f78ff,#0755c9); box-shadow: 0 7px 18px rgba(17,99,225,.34); }
                .pv-ops-filters { display: flex; gap: 8px; flex: 1; justify-content: flex-end; }
                .pv-ops-filters input, .pv-ops-filters select {
                    color: #edf5ff; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.14);
                    border-radius: 10px; padding: 8px 11px; min-width: 170px;
                }
                .pv-ops-filters input { min-width: min(300px, 45vw); }
                .pv-ops-filters option { background: #101d31; }
                .pv-ops-refresh, .pv-ops-review { border: 1px solid rgba(87,158,255,.55); border-radius: 10px; background: rgba(30,112,236,.14); color: #dcecff; font-weight: 800; padding: 8px 13px; }
                .pv-ops-table-wrap { border: 1px solid rgba(255,255,255,.09); border-radius: 15px; overflow: hidden; }
                .pv-ops-table { --bs-table-bg: transparent; --bs-table-color: #edf5ff; }
                .pv-ops-table th { color: rgba(221,236,255,.62); font-size: .72rem; letter-spacing: .06em; text-transform: uppercase; border-color: rgba(255,255,255,.08); padding: 13px 15px; }
                .pv-ops-table td { color: #edf5ff; border-color: rgba(255,255,255,.07); padding: 14px 15px; }
                .pv-ops-table td small { display: block; color: rgba(221,236,255,.54); margin-top: 2px; }
                .pv-ops-status { display: inline-flex; border-radius: 999px; padding: 5px 9px; font-size: .72rem; font-weight: 900; background: rgba(154,176,205,.15); }
                .pv-ops-status.success { color: #70efb3; background: rgba(27,181,112,.14); }
                .pv-ops-status.warning { color: #ffd36a; background: rgba(255,171,34,.14); }
                .pv-ops-status.danger { color: #ff8f9a; background: rgba(238,60,83,.15); }
                .pv-ops-empty { text-align: center; padding: 44px !important; color: rgba(226,239,255,.58) !important; }
                @media (max-width: 767px) {
                    .pv-ops-summary { grid-template-columns: 1fr; }
                    .pv-ops-filters { justify-content: stretch; }
                    .pv-ops-filters input, .pv-ops-filters select { min-width: 0; width: 100%; }
                }
            `}</style>
        </>
    );
};

export default OperationsCenterModal;

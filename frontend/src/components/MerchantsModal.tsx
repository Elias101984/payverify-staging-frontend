// src/components/MerchantsModal.tsx
// ------------------------------------------------------------------------------------------
// Merchants Modal (opened from Dashboard tile)
// - Admin: shows ALL merchants
// - Non-admin: shows ONLY merchants created by the logged-in user (server-side scope preferred)
// - Includes search, pagination, CSV export, and "View" (details drawer)
// ------------------------------------------------------------------------------------------

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import MerchantDetailsDrawer from './MerchantDetailsDrawer';

type BankLite = { bankName?: string | null; accountNumberMasked?: string | null };
type Merchant = {
    id: number;
    name: string;
    email?: string | null;
    userId?: number | null;
    createdAt?: string;
    bankAccounts?: BankLite[];
};

interface Props {
    open: boolean;
    onClose: () => void;
}

const MerchantsModal: React.FC<Props> = ({ open, onClose }) => {
    const { token, user, logout } = useAuth();

    const isAdmin = useMemo(
        () => (user?.role || '').toLowerCase() === 'admin',
        [user?.role]
    );

    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState<Merchant[]>([]);
    const [total, setTotal] = useState<number | null>(null);

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);

    // Drawer
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [activeMerchant, setActiveMerchant] = useState<Merchant | null>(null);

    const fetchMerchants = useCallback(async () => {
        if (!open || !token) return;
        try {
            setLoading(true);
            const scope = isAdmin ? 'all' : 'mine';
            const params = new URLSearchParams({
                scope,
                q: search,
                page: String(page),
                limit: String(pageSize),
            });

            const res = await api.get(`/merchants?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const hdrCount = Number(res.headers?.['x-total-count']);
            if (Number.isFinite(hdrCount)) setTotal(hdrCount);

            const list: Merchant[] = Array.isArray(res.data) ? res.data : (res.data?.rows ?? []);
            if (typeof res.data?.total === 'number') setTotal(res.data.total);

            setRows(list);
        } catch (err: any) {
            if (err?.response?.status === 401) {
                toast.error('Session expired. Please log in again.');
                logout();
            } else {
                console.error(err);
                toast.error(err?.response?.data?.message ?? 'Failed to load merchants.');
            }
        } finally {
            setLoading(false);
        }
    }, [open, token, isAdmin, search, page, pageSize, logout]);

    useEffect(() => {
        fetchMerchants();
    }, [fetchMerchants]);

    const visibleRows = useMemo(() => {
        if (isAdmin) return rows;
        const uid = (user as any)?.id;
        return rows.filter(r => !r.userId || r.userId === uid);
    }, [rows, isAdmin, user]);

    const exportCSV = () => {
        const headers = ['ID', 'Name', 'Email', 'Bank', 'Acct Mask', 'Created'];
        const lines = visibleRows.map(m => {
            const bank = m.bankAccounts?.[0]?.bankName ?? '';
            const mask = m.bankAccounts?.[0]?.accountNumberMasked ?? '';
            const created = m.createdAt ? new Date(m.createdAt).toISOString() : '';
            return [m.id, m.name ?? '', m.email ?? '', bank, mask, created]
                .map(v => `"${String(v).replace(/"/g, '""')}"`)
                .join(',');
        });
        const csv = [headers.join(','), ...lines].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'merchants.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const openDrawer = (m: Merchant) => {
    setActiveMerchant(m);
    setDrawerOpen(true);
};

const closeDrawer = () => {
    setDrawerOpen(false);
    setActiveMerchant(null);
    void fetchMerchants();
};

    if (!open) return null;

    return (
        <>
            {/* Overlay */}
            <div
                onClick={onClose}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
            />

            {/* Modal panel */}
            <div
                role="dialog"
                aria-modal="true"
                style={{
                    position: 'fixed',
                    top: '6vh',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '1000px',
                    maxWidth: '96vw',
                    maxHeight: '88vh',
                    overflow: 'hidden',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    color: '#e9f2ff',
                    border: '1px solid rgba(255,255,255,0.15)',
                    boxShadow: '0 10px 24px rgba(0, 0, 0, 0.45)',
                    borderRadius: '14px',
                    zIndex: 1060,
                    display: 'flex',
                    flexDirection: 'column',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-3 d-flex justify-content-between align-items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
                    <div>
                        <h5 className="mb-0">Merchants</h5>
                        <small className="opacity-75">
                            {isAdmin ? 'All merchants' : 'Your merchants'}
                            {total ? `   ${total.toLocaleString()} total` : ''}
                        </small>
                    </div>
                    <div className="d-flex gap-2">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
                            className="form-control form-control-sm"
                            placeholder="Search by name or email "
                            style={{ maxWidth: 260 }}
                        />
                        <button className="btn btn-outline-light btn-sm" onClick={exportCSV}>Export CSV</button>
                        <button className="btn btn-outline-light btn-sm" onClick={onClose}>Close</button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-3" style={{ overflow: 'auto' }}>
                    {loading ? (
                        <p className="opacity-75 m-0">Loading merchants </p>
                    ) : visibleRows.length === 0 ? (
                        <p className="opacity-75 m-0">No merchants found.</p>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-dark table-striped align-middle mb-2">
                                <thead>
                                    <tr>
                                        <th style={{ width: 90 }}>ID</th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Bank</th>
                                        <th>Acct</th>
                                        <th>Created</th>
                                        <th style={{ width: 120 }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleRows.map((m) => {
                                        const firstAcct = m.bankAccounts?.[0];
                                        return (
                                            <tr key={m.id}>
                                                <td>#{m.id}</td>
                                                <td>{m.name ?? '-'}</td>
                                                <td>{m.email ?? '-'}</td>
                                                <td>{firstAcct?.bankName ?? '-'}</td>
                                                <td>{firstAcct?.accountNumberMasked ?? '-'}</td>
                                                <td>{m.createdAt ? new Date(m.createdAt).toLocaleString() : '-'}</td>
                                                <td>
                                                    <button className="btn btn-outline-light btn-sm" onClick={() => openDrawer(m)}>
                                                        View
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* Pagination */}
                            <div className="d-flex justify-content-between align-items-center">
                                <small className="opacity-75">Page {page}{total ? `   ${total.toLocaleString()} total` : ''}</small>
                                <div className="d-flex gap-2">
                                    <button className="btn btn-outline-light btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                                        Prev
                                    </button>
                                    <button className="btn btn-outline-light btn-sm" onClick={() => setPage(p => p + 1)} disabled={visibleRows.length < pageSize}>
                                        Next
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Details drawer (right side) */}
            <MerchantDetailsDrawer open={drawerOpen} merchant={activeMerchant} onClose={closeDrawer} />
        </>
    );
};

export default MerchantsModal;

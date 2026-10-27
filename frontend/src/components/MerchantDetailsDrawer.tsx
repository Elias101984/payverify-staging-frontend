import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

type BankLite = {
    bankName?: string | null;
    accountNumberMasked?: string | null;
};

type Merchant = {
    id: number;
    name: string;
    email?: string | null;
    userId?: number | null;
    createdAt?: string | Date;
    bank_name?: string | null;
    account_number?: string | null;
    paystack_subaccount_code?: string | null;
    bankAccounts?: BankLite[];
};

interface Props {
    open: boolean;
    merchant: Merchant | null;
    onClose: () => void;
}

function maskAcct(raw?: string | null) {
    if (!raw) return '-';
    const value = String(raw).replace(/\s/g, '');
    return value.length <= 4 ? value : '****' + value.slice(-4);
}

const MerchantDetailsDrawer: React.FC<Props> = ({
    open,
    merchant,
    onClose,
}) => {
    const { user, token } = useAuth();
    const isAdmin = String(user?.role || '').toLowerCase() === 'admin';

    const [subaccountCode, setSubaccountCode] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [saveSucceeded, setSaveSucceeded] = useState(false);

    useEffect(() => {
        setSubaccountCode(merchant?.paystack_subaccount_code || '');
        setMessage('');
        setSaveSucceeded(false);
    }, [merchant?.id, merchant?.paystack_subaccount_code, open]);

    const saveSettlement = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!merchant || !token || !isAdmin || saving) return;

        const code = subaccountCode.trim();

        if (!/^ACCT_[a-zA-Z0-9]+$/.test(code)) {
            setSaveSucceeded(false);
            setMessage('Enter a valid Paystack subaccount code beginning with ACCT_.');
            return;
        }

        setSaving(true);
        setMessage('');
        setSaveSucceeded(false);

        try {
            const response = await api.put(
                `/admin/merchants/${merchant.id}/settlement`,
                { subaccountCode: code },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setSubaccountCode(response.data.subaccountCode || code);
            setSaveSucceeded(true);
            setMessage(
                response.data.message ||
                'Settlement subaccount verified and saved.'
            );
            onClose();
        } catch (error: any) {
            setMessage(
                error?.response?.data?.message ||
                'Unable to save settlement setup.'
            );
        } finally {
            setSaving(false);
        }
    };

    if (!open || !merchant) return null;

    const firstAcct = merchant.bankAccounts?.[0];
    const bankName = firstAcct?.bankName ?? merchant.bank_name ?? '-';
    const acctMasked =
        firstAcct?.accountNumberMasked ??
        maskAcct(merchant.account_number);

    const created = merchant.createdAt
        ? new Date(merchant.createdAt).toLocaleString()
        : '-';

    return (
        <>
            <div
                onClick={saving ? undefined : onClose}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    zIndex: 1070,
                }}
            />

            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="merchant-details-title"
                style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    width: '420px',
                    maxWidth: '100vw',
                    height: '100vh',
                    background:
                        'linear-gradient(180deg, #15243b, #091322)',
                    color: '#e9f2ff',
                    borderLeft: '1px solid rgba(255,255,255,0.15)',
                    boxShadow: '0 10px 24px rgba(0,0,0,0.45)',
                    zIndex: 1080,
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <div
                    className="p-3 d-flex justify-content-between align-items-center"
                    style={{
                        borderBottom: '1px solid rgba(255,255,255,0.12)',
                    }}
                >
                    <h5 id="merchant-details-title" className="mb-0">
                        Merchant Details
                    </h5>
                    <button
                        type="button"
                        className="btn btn-outline-light btn-sm"
                        onClick={onClose}
                        disabled={saving}
                    >
                        Close
                    </button>
                </div>

                <div className="p-3" style={{ overflowY: 'auto' }}>
                    <Detail label="Name" value={merchant.name} />
                    <Detail label="Email" value={merchant.email || '-'} />
                    <Detail label="Merchant ID" value={`#${merchant.id}`} />
                    <Detail label="Created" value={created} />
                    <Detail label="Primary Bank" value={bankName} />
                    <Detail label="Account" value={acctMasked} />

                    {isAdmin && merchant.paystack_subaccount_code && (
                        <div className="alert alert-success mt-4" role="status">
                            <strong>Settlement configured</strong>
                            <div className="small mt-1">
                                Linked code: {merchant.paystack_subaccount_code}
                            </div>
                            <div className="small">
                                Bank: {bankName} · {acctMasked}
                            </div>
                        </div>
                    )}

                    {isAdmin && !merchant.paystack_subaccount_code && (
                        <form
                            onSubmit={saveSettlement}
                            className="mt-4 border rounded p-3"
                        >
                            <h6>Settlement setup</h6>

                            {merchant.paystack_subaccount_code ? (
                                <div className="alert alert-success">
                                    <strong>Settlement configured</strong>
                                    <div className="small mt-1">
                                        Linked code: {merchant.paystack_subaccount_code}
                                    </div>
                                    <div className="small">
                                        Bank: {bankName} · {acctMasked}
                                    </div>
                                </div>
                            ) : (
                                <div className="alert alert-warning">
                                    Settlement not configured
                                </div>
                            )}

                            <p className="small opacity-75">
                                Enter the merchant’s existing Paystack subaccount
                                code. Its bank details will be checked before saving.
                            </p>

                            <label
                                htmlFor="merchant-subaccount"
                                className="form-label"
                            >
                                Paystack subaccount code
                            </label>

                            <input
                                id="merchant-subaccount"
                                type="text"
                                className="form-control mb-3"
                                placeholder="ACCT_..."
                                value={subaccountCode}
                                onChange={event => {
                                    setSubaccountCode(event.target.value);
                                    setMessage('');
                                    setSaveSucceeded(false);
                                }}
                                disabled={saving}
                                autoComplete="off"
                                spellCheck={false}
                                required
                            />

                            <button
                                type="submit"
                                className="btn btn-primary w-100"
                                disabled={saving || !subaccountCode.trim()}
                            >
                                {saving ? 'Verifying…' : 'Verify and save'}
                            </button>

                            {message && (
                                <div
                                    className={`alert ${saveSucceeded
                                            ? 'alert-success'
                                            : 'alert-danger'
                                        } mt-3 mb-0`}
                                    role={saveSucceeded ? 'status' : 'alert'}
                                >
                                    {message}
                                </div>
                            )}
                        </form>
                    )}
                </div>
            </div>
        </>
    );
};

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div className="mb-3">
            <div
                className="text-uppercase opacity-75"
                style={{ fontSize: '.8rem' }}
            >
                {label}
            </div>
            <div style={{ overflowWrap: 'anywhere' }}>{value}</div>
        </div>
    );
}

export default MerchantDetailsDrawer;
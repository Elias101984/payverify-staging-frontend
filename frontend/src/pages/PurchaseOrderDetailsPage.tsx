import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { fetchPurchaseOrderById } from '../services/api';
import PaymentRequestModal from '../components/PaymentRequestModal';
import { toast } from 'react-toastify';

export default function PurchaseOrderDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [po, setPo] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // =========================================================================
    // NEW: PAYMENT REQUEST MODAL STATE
    // -------------------------------------------------------------------------
    // Holds the PaymentIntent returned by the idempotent backend endpoint.
    // Closing the modal does not change the order; it remains unpaid until the
    // signed Paystack webhook confirms payment.
    // =========================================================================
    const [paymentRequestOpen, setPaymentRequestOpen] =
        useState(false);

    const [paymentRequestIntent, setPaymentRequestIntent] =
        useState<any>(null);

    const [creatingPaymentRequest, setCreatingPaymentRequest] =
        useState(false);

    useEffect(() => {
        loadPurchaseOrder();
    }, [id]);

    const loadPurchaseOrder = async () => {
        try {
            setLoading(true);

            if (!id) {
                console.error('Purchase order ID is missing');
                setPo(null);
                return;
            }

            const response = await fetchPurchaseOrderById(id);

            console.log('PO RESPONSE:', response.data);
            console.log('PO ITEMS:', response.data?.data?.items);

            // =============================================================
            // CHANGED:
            // The backend now returns invoice/paymentIntent inside data, while
            // also exposing top-level copies for backwards compatibility.
            //
            // WHY:
            // Merging both shapes makes this page work during deployment
            // transitions and ensures resumable payment data is not lost.
            // =============================================================
            const purchaseOrderData = response.data?.data;

            setPo({
                ...purchaseOrderData,
                invoice:
                    purchaseOrderData?.invoice ??
                    response.data?.invoice ??
                    null,
                paymentIntent:
                    purchaseOrderData?.paymentIntent ??
                    response.data?.paymentIntent ??
                    null,
            });
        } catch (err) {
            console.error('Failed to load purchase order:', err);
            setPo(null);
        } finally {
            setLoading(false);
        }
    };

    const money = (value: any) =>
        `₦${Number(value || 0).toLocaleString()}`;

    const dateTime = (value: any) =>
        value ? new Date(value).toLocaleString() : 'N/A';

    const dateOnly = (value: any) =>
        value ? new Date(value).toLocaleDateString() : 'N/A';

    const statusClass = (status: string) => {
        switch ((status || '').toLowerCase()) {
            case 'paid':
                return 'bg-success';
            case 'approved':
                return 'bg-primary';
            case 'pending':
                return 'bg-warning text-dark';
            case 'rejected':
                return 'bg-danger';
            default:
                return 'bg-secondary';
        }
    };

    const displayOrderStatus = (status: string) => {
        switch ((status || '').toLowerCase()) {
            case 'approved':
                // Compatibility label for orders created by the old workflow.
                return 'Ready for payment';
            case 'paid':
                return 'Paid';
            case 'cancelled':
                return 'Cancelled';
            case 'rejected':
                return 'Rejected';
            case 'pending':
                return 'Pending';
            case 'completed':
                return 'Completed';
            default:
                return status || 'N/A';
        }
    };

    // =========================================================================
    // NEW: NORMALIZED ORDER / PAYMENT STATE
    // -------------------------------------------------------------------------
    // WHY:
    // The API can expose payment status through different response properties.
    // Normalizing them here lets the page reliably decide which action button
    // to show when the user returns later.
    // =========================================================================
    const normalizedOrderStatus = String(po?.status || '').toLowerCase();

    const normalizedPaymentStatus = String(
        po?.paymentStatus ||
        po?.paymentIntent?.status ||
        po?.payment?.status ||
        ''
    ).toLowerCase();

    const normalizedInvoiceStatus = String(
        po?.invoiceStatus ||
        po?.invoice?.status ||
        ''
    ).toLowerCase();

    const isCancelled =
        normalizedOrderStatus === 'cancelled' ||
        normalizedPaymentStatus === 'cancelled' ||
        normalizedInvoiceStatus === 'cancelled';

    const isPaid =
        normalizedOrderStatus === 'paid' ||
        normalizedPaymentStatus === 'paid' ||
        normalizedPaymentStatus === 'success' ||
        normalizedPaymentStatus === 'successful' ||
        normalizedInvoiceStatus === 'paid';

    const paymentLink = isCancelled
        ? ''
        : po?.paymentLink ||
          po?.paymentIntent?.payment_link ||
          po?.invoice?.paymentLink ||
          po?.invoice?.payment_link ||
          '';

    // =========================================================================
    // NEW: EXISTING INVOICE ID
    // -------------------------------------------------------------------------
    // The payment page starts the verification-first flow using invoiceId.
    // A pre-generated paymentLink is NOT required.
    // =========================================================================
    const invoiceId = Number(
        po?.invoiceId ||
        po?.invoice?.id ||
        0
    );

    const hasInvoice =
        Number.isInteger(invoiceId) &&
        invoiceId > 0;

    // =========================================================================
    // NEW: ACTION VISIBILITY RULES
    // -------------------------------------------------------------------------
    // PENDING:
    // The user created the PO but did not finish the order workflow.
    //
    // CAPTURED + PAYMENT PACKAGE:
    // The order is ready, but payment still needs to be completed. Older
    // records may still say "approved"; that is treated as a legacy alias.
    //
    // PAID / REJECTED:
    // No continuation/payment CTA is displayed.
    // =========================================================================
    const hasStartedPayment = Boolean(
        po?.paymentIntent?.gateway_reference ||
        po?.paymentIntent?.gateway_authorization_url ||
        po?.paymentIntent?.payment_started_at
    );

    const hasPaymentPackage =
        hasInvoice ||
        Boolean(
            po?.paymentIntent?.id ||
            po?.paymentIntent?.payment_link ||
            po?.paymentIntent?.token
        );

    const canContinueOrder =
        normalizedOrderStatus === 'pending' &&
        !isPaid &&
        !hasPaymentPackage;

    const canCompletePayment =
        !isCancelled &&
        !isPaid &&
        normalizedOrderStatus !== 'rejected' &&
        hasPaymentPackage;

    // =========================================================================
    // NEW: CONTINUE ORDER HANDLER
    // -------------------------------------------------------------------------
    // WHY:
    // A user may create a PO, leave the application, and return later.
    // This takes them back to the existing PO editing/completion workflow
    // instead of forcing them to create another PO.
    //
    // IMPORTANT:
    // This assumes your edit/continue route is:
    //
    //     /purchase-orders/:id/edit
    //
    // If App.tsx uses a different route, update only the path below.
    // =========================================================================
    const handleContinueOrder = () => {
        if (!po?.id) return;

        navigate(`/purchase-orders/${po.id}/edit`);
    };

    // =========================================================================
    // NEW: COMPLETE / RESUME PAYMENT HANDLER
    // -------------------------------------------------------------------------
    // WHY:
    // Captured-but-unpaid orders should not become a dead end.
    //
    // This reopens the EXISTING PayVerify invoice/payment link. It does not
    // mark the order as paid. The Paystack webhook remains the source of truth
    // that updates Payment, Invoice and Purchase Order to PAID.
    // =========================================================================
    const handleCompletePayment = async () => {
        if (!po?.id) {
            toast.error(
                'Purchase order ID is missing.'
            );
            return;
        }

        try {
            setCreatingPaymentRequest(true);

            // ================================================================
            // CHANGED:
            // Create or reuse the existing payment request and display the
            // familiar PaymentRequestModal.
            //
            // WHY:
            // The user should not be sent straight to the invoice page.
            // They first regain access to the QR/link/invoice modal and may
            // choose Open Invoice when ready.
            // ================================================================
            const response = await api.post(
                `/purchase-orders/${po.id}/payment-request`
            );

            const paymentIntent =
                response.data?.data?.paymentIntent;

            if (
                !paymentIntent ||
                !paymentIntent.payment_link
            ) {
                throw new Error(
                    'The payment request did not return a valid payment link.'
                );
            }

            setPaymentRequestIntent(
                paymentIntent
            );

            setPaymentRequestOpen(true);

            toast.success(
                'Payment request is ready.'
            );

            // Refresh the details panel so Invoice/Intent IDs are shown.
            await loadPurchaseOrder();
        } catch (error: any) {
            console.error(
                'Failed to create payment request:',
                error
            );

            toast.error(
                error?.response?.data?.message ||
                error?.message ||
                'Failed to create payment request.'
            );
        } finally {
            setCreatingPaymentRequest(false);
        }
    };

    if (loading) {
        return (
            <div className="pv-po-bg">
                <div className="container py-4 text-white">Loading...</div>
            </div>
        );
    }

    if (!po) {
        return (
            <div className="pv-po-bg">
                <div className="container py-4 text-white">
                    Purchase Order not found
                </div>
            </div>
        );
    }

    return (
        <div className="pv-po-bg">
            <div className="container py-4 text-white">

                <button
                    className="btn btn-outline-light btn-sm mb-3"
                    onClick={() => navigate(-1)}
                >
                    ← Back
                </button>

                <div className="pv-po-shell">

                    <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <h2 className="mb-1">Purchase Order Details</h2>

                            <div className="text-light opacity-75">
                                {po.poNumber ||
                                    po.poReference ||
                                    `PO-${po.id}`}
                            </div>
                        </div>

                        <span
                            className={`badge ${statusClass(po.status)} px-3 py-2`}
                        >
                            {displayOrderStatus(po.status).toUpperCase()}
                        </span>
                    </div>

                    <div className="row g-3">

                        <div className="col-md-6">
                            <div className="pv-info-card">
                                <h6>Order Summary</h6>

                                <InfoRow label="PO ID" value={po.id} />

                                <InfoRow
                                    label="PO Number"
                                    value={
                                        po.poNumber ||
                                        po.poReference ||
                                        `PO-${po.id}`
                                    }
                                />

                                <InfoRow
                                    label="Amount"
                                    value={money(po.totalAmount || po.amount)}
                                />

                                <InfoRow label="Status" value={displayOrderStatus(po.status)} />
                                <InfoRow label="Created" value={dateTime(po.createdAt)} />
                                <InfoRow label="Due Date" value={dateOnly(po.dueDate)} />
                            </div>
                        </div>

                        <div className="col-md-6">
                            <div className="pv-info-card">
                                <h6>Merchant / Customer</h6>

                                <InfoRow label="Merchant ID" value={po.merchantId || 'N/A'} />

                                <InfoRow
                                    label="Merchant Name"
                                    value={
                                        po.merchantName ||
                                        po.merchant?.name ||
                                        'N/A'
                                    }
                                />

                                <InfoRow label="Customer Name" value={po.customerName || 'Walk-in customer'} />
                                <InfoRow label="Customer Phone" value={po.customerPhone || 'N/A'} />
                                <InfoRow label="Customer Email" value={po.customerEmail || 'N/A'} />
                                <InfoRow label="Created By" value={po.createdBy || po.userId || 'N/A'} />
                            </div>
                        </div>

                        <div className="col-md-6">
                            <div className="pv-info-card">
                                <h6>Payment / Invoice</h6>

                                <InfoRow label="Invoice ID" value={po.invoiceId || po.invoice?.id || 'N/A'} />
                                <InfoRow label="Invoice Status" value={po.invoiceStatus || po.invoice?.status || 'N/A'} />
                                <InfoRow label="Payment Intent ID" value={po.paymentIntentId || po.paymentIntent?.id || 'N/A'} />
                                <InfoRow label="Payment Status" value={po.paymentStatus || po.paymentIntent?.status || 'N/A'} />

                                {paymentLink && (
                                    <a
                                        className="btn btn-primary btn-sm mt-2"
                                        href={paymentLink}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        Open Payment Link
                                    </a>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <div className="pv-info-card">
                                <h6>Description</h6>

                                <p className="mb-0 text-white">
                                    {po.description || 'No description provided'}
                                </p>
                            </div>
                        </div>

                        {/* =====================================================
                            NEW: ORDER RECOVERY / PAYMENT ACTION CARD

                            WHY:
                            Gives returning users a clear next action:

                            - Pending order:
                              Continue Order

                            - Captured but unpaid order:
                              Complete Payment or Resume Payment

                            - Paid/rejected order:
                              No recovery action is displayed

                            The Paystack webhook still performs the final PAID
                            database update after a successful transaction.
                           ===================================================== */}
                        {(canContinueOrder || canCompletePayment) && (
                            <div className="col-12">
                                <div
                                    className={
                                        canContinueOrder
                                            ? 'pv-order-action-card pv-order-action-pending'
                                            : 'pv-order-action-card pv-order-action-payment'
                                    }
                                >
                                    <div className="pv-order-action-icon">
                                        {canContinueOrder ? '📝' : '💳'}
                                    </div>

                                    <div className="pv-order-action-content">
                                        <div className="pv-order-action-label">
                                            {canContinueOrder
                                                ? 'Order Incomplete'
                                                : 'Payment Required'}
                                        </div>

                                        <h4 className="pv-order-action-title">
                                            {canContinueOrder
                                                ? 'Continue This Purchase Order'
                                                : hasStartedPayment
                                                    ? 'Resume Payment for This Order'
                                                    : 'Complete Payment for This Order'}
                                        </h4>

                                        <p className="pv-order-action-description">
                                            {canContinueOrder
                                                ? 'This purchase order is still pending. Continue the order to review or complete the remaining information.'
                                                : 'This order has been captured, but payment has not yet been completed. Continue through PayVerify and Paystack to finish the order.'}
                                        </p>

                                        {canCompletePayment && !hasInvoice && (
                                            <div className="pv-order-action-warning">
                                                The payment package is not yet available for this order.
                                            </div>
                                        )}
                                    </div>

                                    <div className="pv-order-action-button-area">
                                        {canContinueOrder && (
                                            <button
                                                type="button"
                                                className="pv-continue-order-button"
                                                onClick={handleContinueOrder}
                                            >
                                                Continue Order →
                                            </button>
                                        )}

                                        {canCompletePayment && (
                                            <button
                                                type="button"
                                                className="pv-complete-payment-button"
                                                onClick={handleCompletePayment}
                                                disabled={creatingPaymentRequest}
                                            >
                                                {hasStartedPayment
                                                    ? 'Resume Payment →'
                                                    : 'Complete Payment →'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {isCancelled && (
                            <div className="col-12">
                                <div className="pv-order-cancelled-note" role="status">
                                    This order was cancelled. Its payment link and QR session are closed; create a new order to collect payment.
                                </div>
                            </div>
                        )}

                        {Array.isArray(po.items) && po.items.length > 0 && (
                            <div className="col-12">
                                <div className="pv-info-card">
                                    <h6>Line Items</h6>

                                    <div className="table-responsive">
                                        <table className="table table-dark table-sm table-hover mb-0">
                                            <thead>
                                                <tr>
                                                    <th>Item</th>
                                                    <th>Description</th>
                                                    <th>Qty</th>
                                                    <th>Unit Price</th>
                                                    <th>Total</th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {po.items.map((item: any, index: number) => (
                                                    <tr key={item.id || index}>
                                                        <td>{item.itemName || item.name || 'N/A'}</td>
                                                        <td>{item.description || 'N/A'}</td>
                                                        <td>{item.quantity || 0}</td>
                                                        <td>{money(item.unitPrice)}</td>
                                                        <td>{money(item.lineTotal || item.total)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* =========================================================
                    NEW: REUSED PAYMENT REQUEST MODAL

                    WHY:
                    This is the same QR/link/invoice modal shown immediately
                    after capture. Closing it leaves the order unpaid.
                   ========================================================= */}
                <PaymentRequestModal
                    open={paymentRequestOpen}
                    onClose={() => {
                        setPaymentRequestOpen(false);
                        setPaymentRequestIntent(null);
                    }}
                    paymentIntent={paymentRequestIntent}
                />

                <StyleBlock />
            </div>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: any }) {
    return (
        <div className="pv-info-row">
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    );
}

const StyleBlock = () => (
    <style>{`
        .pv-po-bg {
            min-height: 100vh;
            background:
                radial-gradient(900px 400px at 70% -10%, rgba(0, 102, 255, 0.22), rgba(0,0,0,0) 60%),
                linear-gradient(180deg, #06070a 0%, #061024 55%, #0a1c40 100%);
        }

        .pv-po-shell {
            max-width: 920px;
            border-radius: 16px;
            padding: 22px;
            background: rgba(255, 255, 255, 0.055);
            border: 1px solid rgba(255,255,255,0.15);
            box-shadow: 0 14px 35px rgba(0,0,0,0.35);
        }

        .pv-info-card {
            height: 100%;
            border-radius: 14px;
            padding: 16px;
            background: linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04));
            border: 1px solid rgba(255,255,255,0.12);
            color: #ffffff;
        }

        .pv-info-card h6 {
            color: #8ec5ff;
            text-transform: uppercase;
            font-size: 0.78rem;
            letter-spacing: 0.06em;
            margin-bottom: 12px;
        }

        .pv-info-row {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255,255,255,0.08);
            color: rgba(255,255,255,0.78);
            font-size: 0.92rem;
        }

        .pv-info-row:last-child {
            border-bottom: none;
        }

        .pv-info-row strong {
            color: #ffffff;
            text-align: right;
            font-weight: 700;
            max-width: 60%;
            overflow-wrap: anywhere;
        }

        .pv-order-cancelled-note {
            padding: 14px 16px;
            border: 1px solid rgba(255, 149, 149, .30);
            border-radius: 12px;
            background: rgba(191, 57, 57, .14);
            color: #ffd0d0;
            font-size: .9rem;
        }

        .table-dark {
            --bs-table-bg: transparent;
            --bs-table-color: #ffffff;
            --bs-table-border-color: rgba(255,255,255,0.12);
        }

        /* ================================================================
           NEW: ORDER RECOVERY / PAYMENT ACTION CARD
           ================================================================ */

        .pv-order-action-card {
            display: flex;
            align-items: center;
            gap: 20px;
            width: 100%;
            padding: 22px;
            border-radius: 16px;
            box-shadow: 0 12px 32px rgba(0,0,0,0.24);
        }

        .pv-order-action-pending {
            border: 1px solid rgba(96,165,250,0.42);
            background:
                radial-gradient(500px 220px at 100% 0%, rgba(59,130,246,0.18), transparent 60%),
                linear-gradient(135deg, rgba(37,99,235,0.15), rgba(255,255,255,0.045));
        }

        .pv-order-action-payment {
            border: 1px solid rgba(245,158,11,0.45);
            background:
                radial-gradient(500px 220px at 100% 0%, rgba(34,197,94,0.16), transparent 60%),
                linear-gradient(135deg, rgba(245,158,11,0.13), rgba(255,255,255,0.045));
        }

        .pv-order-action-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 58px;
            height: 58px;
            flex-shrink: 0;
            border-radius: 16px;
            background: rgba(59,130,246,0.16);
            border: 1px solid rgba(96,165,250,0.28);
            font-size: 27px;
        }

        .pv-order-action-content {
            flex: 1;
        }

        .pv-order-action-label {
            margin-bottom: 5px;
            color: #93c5fd;
            font-size: 0.75rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.09em;
        }

        .pv-order-action-payment .pv-order-action-label {
            color: #fbbf24;
        }

        .pv-order-action-title {
            margin: 0 0 6px;
            color: #ffffff;
            font-size: 1.15rem;
            font-weight: 700;
        }

        .pv-order-action-description {
            margin: 0;
            max-width: 590px;
            color: rgba(255,255,255,0.72);
            font-size: 0.88rem;
            line-height: 1.55;
        }

        .pv-order-action-warning {
            margin-top: 10px;
            color: #fde68a;
            font-size: 0.8rem;
        }

        .pv-order-action-button-area {
            flex-shrink: 0;
        }

        .pv-continue-order-button,
        .pv-complete-payment-button {
            min-width: 195px;
            padding: 13px 20px;
            border: none;
            border-radius: 10px;
            color: #ffffff;
            font-size: 0.9rem;
            font-weight: 800;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
        }

        .pv-continue-order-button {
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            box-shadow: 0 8px 22px rgba(37,99,235,0.25);
        }

        .pv-complete-payment-button {
            background: linear-gradient(135deg, #22c55e, #16a34a);
            box-shadow: 0 8px 22px rgba(34,197,94,0.25);
        }

        .pv-continue-order-button:hover,
        .pv-complete-payment-button:hover:not(:disabled) {
            transform: translateY(-2px);
        }

        .pv-complete-payment-button:disabled {
            opacity: 0.55;
            cursor: not-allowed;
            transform: none;
        }

        @media (max-width: 768px) {
            .pv-order-action-card {
                flex-direction: column;
                align-items: flex-start;
            }

            .pv-order-action-button-area {
                width: 100%;
            }

            .pv-continue-order-button,
            .pv-complete-payment-button {
                width: 100%;
            }
        }
    `}</style>
);

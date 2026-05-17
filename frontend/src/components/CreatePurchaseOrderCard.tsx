import { useState } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

type Props = {
    token?: string;
    merchantId: number | null;
    onSuccess: () => void;
};

export default function CreatePurchaseOrderCard({
    token,
    merchantId,
    onSuccess,
}: Props) {
    const [itemName, setItemName] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [price, setPrice] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!itemName) return toast.error('Item name is required');
        if (quantity <= 0) return toast.error('Quantity must be greater than 0');
        if (!Number(price)) return toast.error('Valid price required');

        try {
            setSaving(true);

            await api.post(
                '/purchase-orders',
                {
                    merchantId,
                    itemName,
                    quantity,
                    price: Number(price),
                    customerEmail: customerEmail || undefined,
                },
                { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
            );

            toast.success('Purchase order created');

            setItemName('');
            setQuantity(1);
            setPrice('');
            setCustomerEmail('');

            onSuccess();
        } catch (err: any) {
            console.error(err);
            toast.error(err?.response?.data?.message || 'Failed to create purchase order');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="card shadow-sm mb-4">
            <div className="card-body">
                <h5 className="mb-3">Create Purchase Order</h5>

                <form className="row g-3" onSubmit={submit}>
                    <div className="col-md-4">
                        <label className="form-label">Item Name</label>
                        <input
                            className="form-control"
                            value={itemName}
                            onChange={(e) => setItemName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="col-md-2">
                        <label className="form-label">Quantity</label>
                        <input
                            type="number"
                            min="1"
                            className="form-control"
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            required
                        />
                    </div>

                    <div className="col-md-3">
                        <label className="form-label">Price (₦)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="form-control"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            required
                        />
                    </div>

                    <div className="col-md-3">
                        <label className="form-label">Customer Email (optional)</label>
                        <input
                            type="email"
                            className="form-control"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                        />
                    </div>

                    <div className="col-md-2 d-grid">
                        <button className="btn btn-primary" type="submit" disabled={saving}>
                            {saving ? 'Creating…' : 'Create PO'}
                        </button>
                    </div>
                </form>

                <small className="text-muted d-block mt-2">
                    A unique PO reference will be generated and used to create a payment request.
                </small>
            </div>
        </div>
    );
}

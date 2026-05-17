export interface PurchaseOrder {
    id: string;
    poNumber: string;
    poReference: string;
    amount: number;
    totalAmount: number;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    createdAt: string;
    dueDate: string;
    description?: string;
    merchantName?: string;
    merchantId: string; // Make this required
    customerEmail?: string;
    items?: Array<{
        id: string;
        name: string;
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }>;
}

export interface PurchaseOrdersStats {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    completed: number;
    totalAmount: number;
    pendingAmount: number;
}
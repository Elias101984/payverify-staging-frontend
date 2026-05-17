/**
 * Calculates invoice totals including optional tax
 * Keeps financial logic centralized and testable
 */
export const calculateInvoiceTotals = (
    items: { quantity: number; unitPrice: number }[],
    taxRate?: number
) => {
    const subtotal = items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
    );

    const taxAmount = taxRate ? (subtotal * taxRate) / 100 : 0;
    const grandTotal = subtotal + taxAmount;

    return {
        subtotal,
        taxRate: taxRate || 0,
        taxAmount,
        grandTotal,
    };
};
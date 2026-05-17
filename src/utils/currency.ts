/**
 * Formats number to Nigerian Naira
 * Centralized to avoid duplication across app
 */
export const formatNaira = (amount: number): string => {
    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        minimumFractionDigits: 2,
    }).format(amount);
};
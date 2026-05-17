/////**
//// * Shared types used across frontend components/pages.
//// * Scalable: Add more domain models here as needed.
//// */

////export interface Transaction {
////    id: number;
////    amount: number;
////    status: string;
////    createdAt: string;
////}


///**
// * Shared types used across frontend components/pages.
// * Purpose:
// *  - Provide strict typing for API responses
// *  - Improve maintainability and scalability
// *  - Prevent runtime errors by enforcing compile-time safety
// *
// * Design principles followed:
// *  - SRP (Single Responsibility Principle)
// *  - DRY (Avoid duplicate interface definitions)
// *  - Scalable modular architecture
// */

///**
// * Transaction status enum.
// * Using enum prevents typos like "succes" vs "success"
// */
//export enum TransactionStatus {
//    Pending = "pending",
//    Completed = "completed",
//    Failed = "failed",
//    Cancelled = "cancelled"
//}

///**
// * Merchant information associated with transactions.
// * This aligns with your Merchant model and QR system.
// */
//export interface Merchant {
//    id: number;
//    businessName: string;
//    bankName: string;
//    accountNumberMasked: string;
//    qrUrl?: string;
//    createdAt: string;
//}

///**
// * Core Transaction model.
// * Matches backend Transaction Sequelize model.
// */
//export interface Transaction {
//    id: number;

//    /** Unique transaction reference used in QR and audit logs */
//    reference: string;

//    /** Transaction amount */
//    amount: number;

//    /** Transaction status */
//    status: TransactionStatus;

//    /** Optional description */
//    description?: string;

//    /** Merchant ID foreign key */
//    merchantId: number;

//    /** Optional merchant details when joined */
//    merchant?: Merchant;

//    /** QR code URL if generated */
//    qrUrl?: string;

//    /** ISO date string */
//    createdAt: string;

//    /** ISO date string */
//    updatedAt?: string;
//}

///**
// * API response wrapper.
// * Standardized structure for backend responses.
// */
//export interface ApiResponse<T> {
//    success: boolean;
//    message?: string;
//    data: T;
//}

///**
// * Transaction creation payload.
// * Used when creating transactions from frontend.
// */
//export interface CreateTransactionRequest {
//    amount: number;
//    description?: string;
//}

///**
// * QR Code validation response
// */
//export interface QRValidationResult {
//    valid: boolean;
//    merchantName: string;
//    bankName: string;
//    accountNumberMasked: string;
//    amount?: number;
//    description?: string;
//}

///**
// * Dashboard stats for charts and analytics
// */
//export interface DashboardStats {
//    totalTransactions: number;
//    totalAmount: number;
//    completedTransactions: number;
//    pendingTransactions: number;
//    failedTransactions: number;
//}

/**
 * Shared types used across frontend components/pages.
 * Purpose:
 *  - Provide strict typing for API responses
 *  - Improve maintainability and scalability
 *  - Prevent runtime errors by enforcing compile-time safety
 *
 * Design principles followed:
 *  - SRP (Single Responsibility Principle)
 *  - DRY (Avoid duplicate interface definitions)
 *  - Scalable modular architecture
 */

/**
 * Transaction status enum.
 * Using enum prevents typos like "succes" vs "success"
 */
export enum TransactionStatus {
    Pending = "pending",
    Completed = "completed",
    Failed = "failed",
    Cancelled = "cancelled"
}

/**
 * Merchant information associated with transactions.
 * This aligns with your Merchant model and QR system.
 */
export interface Merchant {
    id: number;
    businessName: string;
    bankName: string;
    accountNumberMasked: string;
    qrUrl?: string;
    createdAt: string;
}

/**
 * Core Transaction model.
 * Matches backend Transaction Sequelize model.
 */
export interface Transaction {
    id: number;

    /** Unique transaction reference used in QR and audit logs */
    reference: string;

    /** Transaction amount */
    amount: number;

    /** Transaction status */
    status: TransactionStatus;

    /** Optional description */
    description?: string;

    /** Merchant ID foreign key */
    merchantId: number;

    /** Optional merchant details when joined */
    merchant?: Merchant;

    /** QR code URL if generated */
    qrUrl?: string;

    /** ISO date string */
    createdAt: string;

    /** ISO date string */
    updatedAt?: string;
}

/**
 * API response wrapper.
 * Standardized structure for backend responses.
 */
export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data: T;
}

/**
 * Transaction creation payload.
 * Used when creating transactions from frontend.
 */
export interface CreateTransactionRequest {
    amount: number;
    description?: string;
}

/**
 * QR Code validation response
 */
export interface QRValidationResult {
    valid: boolean;
    merchantName: string;
    bankName: string;
    accountNumberMasked: string;
    amount?: number;
    description?: string;
}

/**
 * Dashboard stats for charts and analytics
 */
export interface DashboardStats {
    totalTransactions: number;
    totalAmount: number;
    completedTransactions: number;
    pendingTransactions: number;
    failedTransactions: number;
}


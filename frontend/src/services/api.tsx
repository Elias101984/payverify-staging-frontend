// frontend/src/services/api.tsx

import axios from 'axios';

// =============================================================================
// MAIN PAYVERIFY API BASE URL
// =============================================================================
//
// Production:
//   VITE_API_BASE_URL=https://payverifyv1.onrender.com
//
// Local development fallback:
//   http://localhost:5000/api
//
// Do not add another /api to individual helpers.
// =============================================================================

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    'http://localhost:5000/api';

console.log('PayVerify API base URL:', API_BASE_URL);

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout:
        Number(
            import.meta.env.VITE_HTTP_TIMEOUT_MS
        ) || 15000,
});

// =============================================================================
// REQUEST INTERCEPTOR
// Attach JWT token when present.
// =============================================================================

api.interceptors.request.use((config) => {
    const token =
        localStorage.getItem('token');

    if (token) {
        config.headers =
            config.headers ?? {};

        config.headers.Authorization =
            `Bearer ${token}`;
    }

    return config;
});

// =============================================================================
// PURCHASE ORDERS
// =============================================================================

export const fetchPurchaseOrderById = (
    purchaseOrderId: number | string
) =>
    api.get(
        `/purchase-orders/${purchaseOrderId}`
    );

// =============================================================================
// RESPONSE INTERCEPTOR
// Clear expired authentication state on 401 responses.
// =============================================================================

api.interceptors.response.use(
    (response) => response,

    (error) => {
        if (
            error?.response?.status === 401
        ) {
            localStorage.removeItem(
                'token'
            );

            localStorage.removeItem(
                'user'
            );
        }

        return Promise.reject(error);
    }
);

// =============================================================================
// AUTH TYPES
// =============================================================================

export interface LoginRequest {
    email: string;
    password: string;
    captchaToken: string;
}

export interface RegisterUserRequest {
    name: string;
    email: string;
    password: string;

    cac_number: string;
    tin_number?: string;
    bvn?: string;

    account_number: string;
    bank_name: string;

    qr_code?: string;

    captchaToken: string;
}

// =============================================================================
// AUTH
// =============================================================================

export const loginUser = (
    data: LoginRequest
) =>
    api.post(
        '/auth/login',
        data
    );

export const registerUser = (
    data: RegisterUserRequest
) =>
    api.post(
        '/auth/register',
        data
    );

// =============================================================================
// MERCHANT
// =============================================================================

export const registerMerchant = (
    data: {
        name: string;
        cac_number: string;
        tin_number: string;
        bvn: string;
        bank_name: string;
        account_number: string;
        email: string;
    }
) =>
    api.post(
        '/merchants',
        data
    );

// =============================================================================
// PASSWORD RESET
// =============================================================================

export const requestPasswordReset = (
    email: string
) =>
    api.post(
        '/auth/forgot-password',
        {
            email,
        }
    );

export const resetPassword = (
    token: string,
    password: string
) =>
    api.post(
        '/auth/reset-password',
        {
            token,
            password,
        }
    );

// =============================================================================
// TRANSACTIONS / ANALYTICS / DASHBOARD
// =============================================================================

export const fetchTransactions = (
    params?: {
        limit?: number;
        offset?: number;
    }
) =>
    api.get(
        '/transactions',
        {
            params,
        }
    );

export const createTransaction = (
    data: {
        merchantId?: number;
        amount: number;
        status:
        | 'pending'
        | 'completed'
        | 'failed';
    }
) =>
    api.post(
        '/transactions',
        data
    );

export const fetchAllTransactionsAdmin = (
    params?: {
        limit?: number;
        offset?: number;
    }
) =>
    api.get(
        '/transactions/admin',
        {
            params,
        }
    );

export const fetchTransactionsByMerchantIdAdmin = (
    merchantId: number,
    params?: {
        limit?: number;
        offset?: number;
    }
) =>
    api.get(
        `/transactions/admin/${merchantId}`,
        {
            params,
        }
    );

export const fetchTransactionsSummary = (
    params?: {
        interval?:
        | 'day'
        | 'week'
        | 'month'
        | 'year';

        dateFrom?: string;
        dateTo?: string;
        merchantId?: number;
    }
) =>
    api.get(
        '/analytics/transactions/summary',
        {
            params,
        }
    );

export const fetchDashboardStats = () =>
    api.get(
        '/dashboard'
    );

// =============================================================================
// REFUNDS / DISPUTES / FRAUD
// =============================================================================

export const getRefunds = (
    transactionId: number
) =>
    api.get(
        `/transactions/${transactionId}/refunds`
    );

export const createRefund = (
    transactionId: number,
    payload: {
        amount: number;
        reason?: string;
    }
) =>
    api.post(
        `/transactions/${transactionId}/refunds`,
        payload
    );

export const getDisputes = (
    transactionId: number
) =>
    api.get(
        `/transactions/${transactionId}/disputes`
    );

export const getFraudBreakdown = () =>
    api.get(
        '/analytics/fraud-breakdown'
    );

export default api;

// src/services/api.tsx
/**
 * Axios client + endpoint helpers for PayVerify frontend.
 *
 * New (now):
 * - Added `registerMerchant()` helper for POST /merchants using snake_case keys
 *   that match your DB (cac_number, tin_number, bvn, bank_name, account_number, email, name).
 *   This removes the field-name mismatch that caused 400s.
 */

// src/services/api.ts
import axios from 'axios';

/**
 * Base API URL
 * - Must be set at build time in Azure for Vite
 * - Example: https://payverify-api.azurecontainerapps.io
 */
//const API_BASE_URL =
//    import.meta.env.VITE_API_BASE_URL ||
//    '/api'; // safe fallback for local dev with proxy

//swap the apibaseurl for local development REMEMBER TO SWITCH IT BACK FOR PROD

//const API_BASE_URL = import.meta.env.VITE_API_BASE;
const API_BASE_URL = import.meta.env.VITE_API_URL;


export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: Number(import.meta.env.VITE_HTTP_TIMEOUT_MS) || 15000,
});

// Attach auth token if present
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers = config.headers ?? {};
        (config.headers as any).Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle auth expiration
api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err?.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
        return Promise.reject(err);
    }
);

// ---------- Auth (existing) ----------
export const loginUser = (data: { email: string; password: string }) =>
    api.post('/auth/login', data);

export const registerUser = (data: {
    name: string;
    email: string;
    password: string;
    cac_number: string;
    tin_number?: string;
    bvn?: string;
    account_number: string;
    bank_name: string;
    qr_code?: string;
    role?: string;
}) => api.post('/auth/register', data);

// ---------- Merchant (NEW helper) ----------
export const registerMerchant = (data: {
    name: string;
    cac_number: string;
    tin_number: string;
    bvn: string;
    bank_name: string;
    account_number: string;
    email: string;
}) => api.post('/merchants', data);

// ---------- Password reset (existing) ----------
export const requestPasswordReset = (email: string) =>
    api.post('/auth/forgot-password', { email });

export const resetPassword = (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password });

// ---------- Transactions / Analytics / Dashboard (existing) ----------
export const fetchTransactions = (params?: { limit?: number; offset?: number }) =>
    api.get('/transactions', { params });

export const createTransaction = (data: {
    merchantId?: number;
    amount: number;
    status: 'pending' | 'completed' | 'failed';
}) => api.post('/transactions', data);

export const fetchAllTransactionsAdmin = (params?: { limit?: number; offset?: number }) =>
    api.get('/transactions/admin', { params });

export const fetchTransactionsByMerchantIdAdmin = (
    merchantId: number,
    params?: { limit?: number; offset?: number }
) => api.get(`/transactions/admin/${merchantId}`, { params });

export const fetchTransactionsSummary = (params?: {
    interval?: 'day' | 'week' | 'month';
    dateFrom?: string;
    dateTo?: string;
    merchantId?: number;
}) => api.get('/analytics/transactions/summary', { params });

export const fetchDashboardStats = () => api.get('/dashboard');

// src/services/api.ts
export const getRefunds = (txId: number) =>
    api.get(`/transactions/${txId}/refunds`);

export const createRefund = (txId: number, payload: { amount: number; reason?: string }) =>
    api.post(`/transactions/${txId}/refunds`, payload);

export const getDisputes = (txId: number) =>
    api.get(`/transactions/${txId}/disputes`);

export const getFraudBreakdown = () =>
    api.get('/analytics/fraud-breakdown');

export default api;

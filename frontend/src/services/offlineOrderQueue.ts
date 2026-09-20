import type { AxiosInstance } from 'axios';

import api from './api';

/**
 * Browser-side outbox for orders captured while a merchant is offline or has
 * an unreliable connection.  IndexedDB is the primary store; localStorage is
 * used as a small compatibility fallback (private browsing and older WebViews
 * can disable IndexedDB).
 */

export const OFFLINE_QUEUE_EVENT = 'payverify:offline-orders-updated';

const DB_NAME = 'payverify-offline';
const DB_VERSION = 1;
const STORE_NAME = 'orders';
const STORAGE_KEY = 'payverify:offline-orders';

export interface OfflineOrderItem {
    itemName: string;
    description: string | null;
    quantity: number;
    unitPrice: number;
}

export interface OfflineOrderPayload {
    totalAmount: number;
    description: string;
    dueDate: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    collectPayment?: boolean;
    poReference?: string;
    items: OfflineOrderItem[];
}

export interface OfflineOrderRecord {
    id: string;
    poReference: string;
    payload: OfflineOrderPayload;
    createdAt: string;
    attempts: number;
    lastError?: string;
}

export interface OfflineSyncResult {
    synced: number;
    failed: number;
    remaining: number;
    skipped: boolean;
}

let databasePromise: Promise<IDBDatabase> | null = null;

const canUseIndexedDb = () =>
    typeof window !== 'undefined' && typeof indexedDB !== 'undefined';

const canUseStorage = () =>
    typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const emitQueueChange = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(OFFLINE_QUEUE_EVENT));
    }
};

const makeRandomPart = () => {
    try {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID().replace(/-/g, '').slice(0, 18);
        }
    } catch {
        // Fall through to the non-cryptographic browser fallback.
    }

    return Math.random().toString(36).slice(2, 14);
};

/** Stable request key used for safe retries after a connection drops. */
export const makeOfflineOrderReference = () =>
    `OFF-${Date.now().toString(36)}-${makeRandomPart()}`.slice(0, 50);

const openDatabase = (): Promise<IDBDatabase> => {
    if (!canUseIndexedDb()) {
        return Promise.reject(new Error('IndexedDB is unavailable.'));
    }

    if (databasePromise) {
        return databasePromise;
    }

    databasePromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const database = request.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                const store = database.createObjectStore(STORE_NAME, {
                    keyPath: 'id',
                });
                store.createIndex('createdAt', 'createdAt', { unique: false });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
            databasePromise = null;
            reject(request.error || new Error('Could not open offline order storage.'));
        };
    });

    return databasePromise;
};

const readStorageFallback = (): OfflineOrderRecord[] => {
    if (!canUseStorage()) {
        return [];
    }

    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];

        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const writeStorageFallback = (records: OfflineOrderRecord[]) => {
    if (!canUseStorage()) return;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {
        // Storage quota/private-mode failures should not break order capture.
    }
};

const readFromIndexedDb = async (): Promise<OfflineOrderRecord[]> => {
    const database = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, 'readonly');
        const request = transaction.objectStore(STORE_NAME).getAll();
        request.onsuccess = () => resolve((request.result || []) as OfflineOrderRecord[]);
        request.onerror = () => reject(request.error || new Error('Could not read offline orders.'));
    });
};

const putInIndexedDb = async (record: OfflineOrderRecord): Promise<void> => {
    const database = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).put(record);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error || new Error('Could not save offline order.'));
        transaction.onabort = () => reject(transaction.error || new Error('Could not save offline order.'));
    });
};

const deleteFromIndexedDb = async (id: string): Promise<void> => {
    const database = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).delete(id);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error || new Error('Could not remove offline order.'));
        transaction.onabort = () => reject(transaction.error || new Error('Could not remove offline order.'));
    });
};

const readAll = async (): Promise<OfflineOrderRecord[]> => {
    try {
        const records = await readFromIndexedDb();
        return records.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    } catch {
        return readStorageFallback().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }
};

const putRecord = async (record: OfflineOrderRecord): Promise<void> => {
    try {
        await putInIndexedDb(record);
    } catch {
        const records = readStorageFallback().filter((item) => item.id !== record.id);
        writeStorageFallback([...records, record]);
    }
};

const deleteRecord = async (record: OfflineOrderRecord): Promise<void> => {
    try {
        await deleteFromIndexedDb(record.id);
    } catch {
        writeStorageFallback(readStorageFallback().filter((item) => item.id !== record.id));
    }
};

export const getQueuedOfflineOrders = () => readAll();

export const getOfflineOrderCount = async () => (await readAll()).length;

/**
 * Add an order to the outbox. Payment collection is deliberately disabled in
 * the queued record: an offline device can record the order, but Paystack and
 * the server remain the only source of truth for payment confirmation. When
 * the record is replayed online, the sync request creates the payment package.
 */
export const enqueueOfflineOrder = async (
    payload: OfflineOrderPayload
): Promise<OfflineOrderRecord> => {
    const poReference = String(
        payload.poReference || makeOfflineOrderReference()
    ).trim().slice(0, 50);

    const existing = (await readAll()).find(
        (record) => record.poReference === poReference
    );

    if (existing) {
        return existing;
    }

    const record: OfflineOrderRecord = {
        id: poReference,
        poReference,
        payload: {
            ...payload,
            poReference,
            collectPayment: false,
        },
        createdAt: new Date().toISOString(),
        attempts: 0,
    };

    await putRecord(record);
    emitQueueChange();
    return record;
};

const errorMessage = (error: any) =>
    String(
        error?.response?.data?.message ||
        error?.message ||
        'Order could not be synchronized.'
    );

const isRetryableSyncError = (error: any) => {
    const status = Number(error?.response?.status);
    return !error?.response || status === 408 || status === 429 || status >= 500;
};

/**
 * Replay queued orders in capture order.  The server receives the same
 * `poReference` on every attempt, making the request idempotent even if the
 * first response was lost after the database commit.
 */
export const syncOfflineOrders = async (
    apiClient: AxiosInstance = api,
    token?: string
): Promise<OfflineSyncResult> => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return {
            synced: 0,
            failed: 0,
            remaining: await getOfflineOrderCount(),
            skipped: true,
        };
    }

    const records = await readAll();
    let synced = 0;
    let failed = 0;

    for (const record of records) {
        const attempted: OfflineOrderRecord = {
            ...record,
            attempts: record.attempts + 1,
            lastError: undefined,
        };

        await putRecord(attempted);

        try {
            await apiClient.post(
                '/purchase-orders',
                {
                    ...record.payload,
                    poReference: record.poReference,
                    // The device is online again, so create the invoice, QR and
                    // payment link in the same request. This is not a payment
                    // confirmation; only the signed webhook can mark it paid.
                    collectPayment: true,
                },
                token
                    ? { headers: { Authorization: `Bearer ${token}` } }
                    : undefined
            );

            await deleteRecord(record);
            synced += 1;
        } catch (error: any) {
            await putRecord({
                ...attempted,
                lastError: errorMessage(error),
            });

            if (!isRetryableSyncError(error)) {
                failed += 1;
            }
        }
    }

    const remaining = await getOfflineOrderCount();
    emitQueueChange();

    return {
        synced,
        failed,
        remaining,
        skipped: false,
    };
};

/** Test/support helper; only clears locally captured orders. */
export const clearOfflineOrders = async () => {
    const records = await readAll();
    for (const record of records) {
        await deleteRecord(record);
    }
    emitQueueChange();
};

/** Network errors are safe to queue; validation/auth responses are not. */
export const isOfflineNetworkError = (error: any) => {
    const status = error?.response?.status;
    if (status != null && status < 500 && status !== 408 && status !== 429) {
        return false;
    }

    return (
        typeof navigator !== 'undefined' && navigator.onLine === false
    ) || !error?.response || error?.code === 'ERR_NETWORK' || error?.code === 'ECONNABORTED';
};

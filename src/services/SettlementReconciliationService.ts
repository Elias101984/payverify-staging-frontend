import { sequelize } from '../config/db';
import Merchant from '../models/Merchant';
import { PaymentIntent } from '../models/PaymentIntent';
import { PaystackService } from './PaystackService';

export class SettlementReconciliationService {
    private readonly paystack = new PaystackService();

    private readonly maxSettlementPages = 3;
    private readonly maxTransactionPages = 3;
    private readonly maxApiRequests = 10;

    async reconcile(intent: PaymentIntent) {
        const observationStartedAt = new Date();
        if (intent.status !== 'paid' || !intent.gateway_reference) {
            return intent;
        }
        // Refresh database state before evaluating the settlement throttle.
        // Callers may supply an outdated PaymentIntent instance.
        await intent.reload();

        if (intent.status !== 'paid' || !intent.gateway_reference) {
            return intent;
        }

        const currentStatus = String(
            intent.settlement_status || ''
        ).toLowerCase();

        // A confirmed settlement must not regress.
        if (['success', 'settled'].includes(currentStatus)) {
            return intent;
        }

        const lastCheck =
            intent.settlement_checked_at?.getTime() || 0;

        if (Date.now() - lastCheck < 5 * 60 * 1000) {
            return intent;
        }

        const merchant = await Merchant.findByPk(
            intent.merchant_id
        );

        const subaccountId = Number(
            merchant?.paystack_subaccount_id || 0
        );

        if (!Number.isSafeInteger(subaccountId) || subaccountId <= 0) {
            await sequelize.transaction(async (dbTransaction) => {
                const lockedIntent = await PaymentIntent.findByPk(intent.id, {
                    transaction: dbTransaction,
                    lock: dbTransaction.LOCK.UPDATE,
                });

                if (!lockedIntent) {
                    throw new Error('Payment intent disappeared');
                }

                const latestStatus = String(
                    lockedIntent.settlement_status || ''
                ).toLowerCase();

                if (['success', 'settled'].includes(latestStatus)) {
                    return;
                }

                const latestCheck = lockedIntent.settlement_checked_at;

                if (
                    latestCheck instanceof Date &&
                    latestCheck.getTime() >= observationStartedAt.getTime()
                ) {
                    return;
                }

                await lockedIntent.update(
                    {
                        settlement_status: 'not_configured',
                        settlement_checked_at: observationStartedAt,
                    },
                    { transaction: dbTransaction }
                );
            });

            await intent.reload();
            return intent;
        }

        let apiRequests = 0;

        for (
            let settlementPage = 1;
            settlementPage <= this.maxSettlementPages;
            settlementPage++
        ) {
            if (apiRequests >= this.maxApiRequests) {
                break;
            }

            apiRequests++;

            const response = await this.paystack.listSettlements(
                subaccountId,
                settlementPage
            );

            if (response?.status !== true || !Array.isArray(response?.data)) {
                throw new Error('Invalid Paystack settlement response');
            }

            const settlements = response.data;

            for (const settlement of settlements) {
                const settlementId = Number(settlement?.id || 0);

                if (!Number.isSafeInteger(settlementId) || settlementId <= 0) {
                    continue;
                }

                for (
                    let transactionPage = 1;
                    transactionPage <= this.maxTransactionPages;
                    transactionPage++
                ) {
                    if (apiRequests >= this.maxApiRequests) {
                        break;
                    }

                    apiRequests++;

                    const transactionsResponse =
                        await this.paystack.listSettlementTransactions(
                            settlementId,
                            transactionPage
                        );

                    if (
                        transactionsResponse?.status !== true ||
                        !Array.isArray(transactionsResponse?.data)
                    ) {
                        throw new Error(
                            'Invalid Paystack settlement transactions response'
                        );
                    }

                    const transactions = transactionsResponse.data;

                    const match = transactions.find(
                        (item: any) =>
                            String(item?.reference || '') ===
                            intent.gateway_reference
                    );

                    if (match) {
                        const settlementStatus = String(
                            settlement.status || 'pending'
                        ).toLowerCase();

                        const validStatuses = [
                            'success',
                            'processing',
                            'pending',
                            'failed',
                        ];

                        const normalizedStatus =
                            validStatuses.includes(settlementStatus)
                                ? settlementStatus
                                : 'pending';

                        const rawSettlementDate =
                            settlement.settlement_date;

                        const parsedDate = rawSettlementDate
                            ? new Date(rawSettlementDate)
                            : null;

                        await sequelize.transaction(async (dbTransaction) => {
                            const lockedIntent = await PaymentIntent.findByPk(
                                intent.id,
                                {
                                    transaction: dbTransaction,
                                    lock: dbTransaction.LOCK.UPDATE,
                                }
                            );

                            if (!lockedIntent) {
                                throw new Error('Payment intent disappeared');
                            }

                            const latestStatus = String(
                                lockedIntent.settlement_status || ''
                            ).toLowerCase();

                            if (['success', 'settled'].includes(latestStatus)) {
                                return;
                            }

                            const latestCheck = lockedIntent.settlement_checked_at;

                            if (
                                latestCheck instanceof Date &&
                                latestCheck.getTime() >= observationStartedAt.getTime()
                            ) {
                                return;
                            }

                            await lockedIntent.update(
                                {
                                    settlement_status: normalizedStatus,
                                    paystack_settlement_id: settlementId,
                                    settlement_amount_kobo:
                                        Number(match.amount || 0),
                                    settlement_date:
                                        parsedDate &&
                                        !Number.isNaN(parsedDate.getTime())
                                            ? parsedDate
                                            : null,
                                    settlement_checked_at: observationStartedAt,
                                },
                                { transaction: dbTransaction }
                            );
                        });

                        await intent.reload();
                        return intent;
                    }

                    const transactionPageCount = Number(
                        transactionsResponse?.meta?.pageCount
                    );

                    if (
                        transactions.length < 100 ||
                        (
                            Number.isFinite(transactionPageCount) &&
                            transactionPage >= transactionPageCount
                        )
                    ) {
                        break;
                    }
                }
            }

            const settlementPageCount = Number(
                response?.meta?.pageCount
            );

            if (
                settlements.length < 50 ||
                (
                    Number.isFinite(settlementPageCount) &&
                    settlementPage >= settlementPageCount
                )
            ) {
                break;
            }
        }

        // A bounded search may be incomplete. Do not overwrite
        // existing settlement state with a potentially false pending.
        await sequelize.transaction(async (dbTransaction) => {
            const lockedIntent = await PaymentIntent.findByPk(intent.id, {
                transaction: dbTransaction,
                lock: dbTransaction.LOCK.UPDATE,
            });

            if (!lockedIntent) {
                throw new Error('Payment intent disappeared');
            }

            const latestStatus = String(
                lockedIntent.settlement_status || ''
            ).toLowerCase();

            if (['success', 'settled'].includes(latestStatus)) {
                return;
            }

            const latestCheck = lockedIntent.settlement_checked_at;

            if (
                latestCheck instanceof Date &&
                latestCheck.getTime() >= observationStartedAt.getTime()
            ) {
                return;
            }

            await lockedIntent.update(
                { settlement_checked_at: observationStartedAt },
                { transaction: dbTransaction }
            );
        });

        await intent.reload();
        return intent;
    }
}
import dotenv from 'dotenv';
dotenv.config();

import { Op } from 'sequelize';
import { sequelize } from '../config/db';
import { PaymentIntent } from '../models/PaymentIntent';
import Merchant from '../models/Merchant';
import { SettlementReconciliationService } from '../services/SettlementReconciliationService';

const BATCH_SIZE = 10;

// Safety: reconciliation must be explicitly enabled.
// The worker remains read-only until live execution is implemented.
const LIVE_RECONCILIATION_ENABLED = false;

const requestedLiveMode =
    process.env.SETTLEMENT_RECONCILIATION_LIVE === 'true';

if (requestedLiveMode && !LIVE_RECONCILIATION_ENABLED) {
    throw new Error(
        'Live settlement reconciliation is not enabled in this release.'
    );
}

async function main(): Promise<void> {
    try {
        await sequelize.authenticate();

        const configuredMerchants = await Merchant.findAll({
            attributes: ['id'],
            where: {
                paystack_subaccount_id: {
                    [Op.gt]: 0
                },
                paystack_subaccount_code: {
                    [Op.and]: [
                        { [Op.ne]: null },
                        { [Op.ne]: '' }
                    ]
                }
            }
        });

        const merchantIds = configuredMerchants.map(
            merchant => merchant.id
        );

        console.log(
            `[DRY RUN] Found ${merchantIds.length} merchants with configured Paystack subaccounts.`
        );

        const intents = await PaymentIntent.findAll({
            where: {
                merchant_id: { [Op.in]: merchantIds },
                status: 'paid',
                gateway_reference: { [Op.ne]: null },
                [Op.and]: [
                    {
                        [Op.or]: [
                            { settlement_status: null },
                            {
                                settlement_status: {
                                    [Op.notIn]: ['success', 'settled']
                                }
                            }
                        ]
                    },
                    {
                        [Op.or]: [
                            { settlement_checked_at: null },
                            {
                                settlement_checked_at: {
                                    [Op.lt]: new Date(Date.now() - 15 * 60 * 1000)
                                }
                            }
                        ]
                    }
                ]
            },
            order: [['paid_at', 'ASC']],
            limit: BATCH_SIZE
        });

        console.log(
            `[DRY RUN] Found ${intents.length} payment intents eligible for settlement reconciliation.`
        );

        const reconciliationService = LIVE_RECONCILIATION_ENABLED && requestedLiveMode
            ? new SettlementReconciliationService()
            : null;

        for (const intent of intents) {
            if (!reconciliationService) {
                console.log({
                    paymentIntentId: intent.id,
                    merchantId: intent.merchant_id,
                    settlementStatus: intent.settlement_status,
                    lastCheckedAt: intent.settlement_checked_at
                });
                continue;
            }

            try {
                await reconciliationService.reconcile(intent);

                console.log(
                    `[RECONCILED] Payment intent ${intent.id}: ${intent.settlement_status}`
                );
            } catch (error) {
                console.error(
                    `[RECONCILIATION FAILED] Payment intent ${intent.id}`,
                    error
                );
                process.exitCode = 1;
            }
        }
    } finally {
        await sequelize.close();
    }
}

main().catch((error) => {
    console.error('Settlement job failed:', error);
    process.exitCode = 1;
});

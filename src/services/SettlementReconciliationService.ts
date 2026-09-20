import Merchant from '../models/Merchant';
import { PaymentIntent } from '../models/PaymentIntent';
import { PaystackService } from './PaystackService';

export class SettlementReconciliationService {
    private readonly paystack = new PaystackService();

    async reconcile(intent: PaymentIntent) {
        if (intent.status !== 'paid' || !intent.gateway_reference) return intent;

        const lastCheck = intent.settlement_checked_at?.getTime() || 0;
        if (Date.now() - lastCheck < 5 * 60 * 1000) return intent;

        const merchant = await Merchant.findByPk(intent.merchant_id);
        const subaccountId = Number(merchant?.paystack_subaccount_id || 0);
        if (!subaccountId) {
            await intent.update({
                settlement_status: 'not_configured',
                settlement_checked_at: new Date(),
            });
            return intent;
        }

        const response = await this.paystack.listSettlements(subaccountId);
        const settlements = Array.isArray(response?.data) ? response.data : [];

        for (const settlement of settlements) {
            const settlementId = Number(settlement?.id || 0);
            if (!settlementId) continue;
            const transactionsResponse =
                await this.paystack.listSettlementTransactions(settlementId);
            const transactions = Array.isArray(transactionsResponse?.data)
                ? transactionsResponse.data : [];
            const match = transactions.find((item: any) =>
                String(item?.reference || '') === intent.gateway_reference
            );
            if (!match) continue;

            await intent.update({
                settlement_status: String(settlement.status || 'pending'),
                paystack_settlement_id: settlementId,
                settlement_amount_kobo: Number(match.amount || 0),
                settlement_date: settlement.settled_by
                    ? new Date(settlement.settled_by)
                    : settlement.settlement_date
                        ? new Date(settlement.settlement_date)
                        : null,
                settlement_checked_at: new Date(),
            });
            return intent;
        }

        await intent.update({
            settlement_status: 'pending',
            settlement_checked_at: new Date(),
        });
        return intent;
    }
}

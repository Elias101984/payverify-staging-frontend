import 'dotenv/config';

import { sequelize } from '../src/config/db';
import Merchant from '../src/models/Merchant';
import { PaystackService } from '../src/services/PaystackService';

async function main() {
    const merchantId = Number(process.env.LB_VISION_MERCHANT_ID || 0);
    const bankCode = String(process.env.LB_VISION_BANK_CODE || '').trim();
    const accountNumber = String(process.env.LB_VISION_ACCOUNT_NUMBER || '').trim();
    const businessName = String(
        process.env.LB_VISION_BUSINESS_NAME || 'LB Vision Services'
    ).trim();

    if (!merchantId || !bankCode || !accountNumber) {
        throw new Error(
            'Set LB_VISION_MERCHANT_ID, LB_VISION_BANK_CODE and LB_VISION_ACCOUNT_NUMBER first.'
        );
    }

    await sequelize.authenticate();
    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(`Merchant ${merchantId} was not found`);
    if (merchant.paystack_subaccount_code) {
        console.log(`LB Vision already uses ${merchant.paystack_subaccount_code}`);
        return;
    }

    const response = await new PaystackService().createSubaccount({
        business_name: businessName,
        settlement_bank: bankCode,
        account_number: accountNumber,
        percentage_charge: 0,
        primary_contact_email:
            String(process.env.LB_VISION_CONTACT_EMAIL || merchant.email || '').trim() || undefined,
        primary_contact_phone:
            String(process.env.LB_VISION_CONTACT_PHONE || '').trim() || undefined,
    });

    if (!response.status || !response.data?.subaccount_code) {
        throw new Error(response.message || 'Paystack did not create the subaccount');
    }

    await merchant.update({
        paystack_subaccount_code: response.data.subaccount_code,
        paystack_subaccount_id: response.data.id,
        platform_fee_kobo: 0,
        paystack_fee_bearer: 'subaccount',
    });

    console.log(`Configured ${businessName}: ${response.data.subaccount_code}`);
    console.log('PayVerify platform fee: ₦0.00; Paystack fee bearer: subaccount');
}

main()
    .catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await sequelize.close();
    });

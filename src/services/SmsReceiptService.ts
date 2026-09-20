import twilio from 'twilio';

export async function sendPaidReceiptSms(payload: {
    to: string;
    invoiceId: number;
    amount: number;
    receiptUrl: string;
}) {
    const sid = String(process.env.TWILIO_ACCOUNT_SID || '').trim();
    const token = String(process.env.TWILIO_AUTH_TOKEN || '').trim();
    const from = String(process.env.TWILIO_FROM_PHONE || '').trim();

    if (!payload.to || !sid || !token || !from) {
        console.info('[sms] Receipt SMS skipped; Twilio is not configured.');
        return;
    }

    const amount = new Intl.NumberFormat('en-NG', {
        style: 'currency', currency: 'NGN'
    }).format(payload.amount);

    try {
        await twilio(sid, token).messages.create({
            from,
            to: payload.to,
            body: `PayVerify receipt #${payload.invoiceId}: ${amount} paid successfully. ${payload.receiptUrl}`,
        });
    } catch (error) {
        console.error('[sms] Receipt delivery failed:',
            error instanceof Error ? error.message : 'Unknown error');
    }
}

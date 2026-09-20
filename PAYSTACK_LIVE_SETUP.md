# Paystack live-payment checklist

## 1. Apply the database update

Apply all current SQL migrations against the same PostgreSQL database used by
the API:

```powershell
npm run migrate:local
```

The runner uses the existing `.env` database settings and does not require the
`psql` command to be installed. The migrations are idempotent and include both
the Paystack payment-session columns and the refund/dispute operations tables.

## 2. Configure the webhook

In both the Paystack Test and Live dashboards, set the webhook URL to:

`https://YOUR-PUBLIC-API/api/webhooks/paystack`

Paystack cannot deliver webhooks to `localhost`. PayVerify therefore also
verifies a pending reference from the server when the receipt or order page is
refreshed. The signed webhook remains the primary production path.

## 3. Configure LB Vision's subaccount

Add these values to the API environment (do not commit them):

```text
LB_VISION_MERCHANT_ID=<PayVerify database merchant ID>
LB_VISION_BUSINESS_NAME=LB Vision Services
LB_VISION_BANK_CODE=058
LB_VISION_ACCOUNT_NUMBER=0210498483
LB_VISION_CONTACT_EMAIL=LbVision@gmail.com
LB_VISION_CONTACT_PHONE=+2348084802994
```

Use Test keys first, then run:

```powershell
npm run setup:lb-vision-subaccount
```

The command creates one subaccount, stores its Paystack code and numeric ID,
sets PayVerify's flat platform fee to `0` kobo, and makes the LB Vision
subaccount bear Paystack's processing fee. It refuses to create another
subaccount when the merchant already has one configured.

Repeat in the Live environment only after the PayVerify Paystack business
account is approved, using Live keys and the Live production database.

## 4. Optional SMS receipts

Set all three values to enable SMS receipts:

```text
TWILIO_ACCOUNT_SID=<value>
TWILIO_AUTH_TOKEN=<value>
TWILIO_FROM_PHONE=<sender number>
```

Without them, payment still succeeds and customers can print the receipt.

## 5. Settlement status

`Payment: PAID` means Paystack has verified the charge. Settlement remains
pending until Paystack's Settlement API lists that transaction in a settlement.
`Settlement: CONFIRMED` is Paystack's payout record; it is not an independent
bank-statement confirmation.

## 6. Refunds, disputes and cancellations

- The signed webhook records Paystack dispute create/reminder/resolution events
  and refund status events for the new dashboard operations centre.
- Pending or approved orders can be cancelled before Paystack checkout starts.
- Paid/completed orders cannot be cancelled; use the controlled refund flow.
- Cancelling an unpaid order expires its local payment intent and invoice so
  the PayVerify payment link cannot be initialized again.

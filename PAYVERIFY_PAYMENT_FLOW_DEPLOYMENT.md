# PayVerify verified-payment deployment

This release creates one purchase order, invoice, and payment intent per order. The merchant receives the QR code, public payment link, and PDF immediately. Opening the link shows the verified invoice summary; Paystack checkout remains blocked until the server confirms the merchant/account match. **Resume Payment** reopens the existing package instead of creating another order. Optional customer name, phone and email are stored with the order and carried into the payment/receipt flow.

## 1. Apply the database migration

Back up the production database, then run the migration runner from the project root:

```bash
npm run migrate:local
```

The runner uses the database settings in `.env`, does not require `psql`, and applies every repeatable migration, including customer-name fields and refund/dispute tables.

## 2. Configure backend environment variables

Set these in the backend hosting environment, not in source control:

```text
DATABASE_URL=<production PostgreSQL connection>
FRONTEND_URL=https://<PayVerify frontend domain>
PAYSTACK_SECRET_KEY=<Paystack live secret key>
PAYSTACK_BASE_URL=https://api.paystack.co
VERIFICATION_API_URL=https://<verification service>/api/v1
```

Keep using Paystack test keys until the Bridgeworks LLC - PayVerify business account is approved. Swap only the Paystack key values when going live; no code change is required.

## 3. Attach a Paystack subaccount to each merchant

Create the subaccount in Paystack first, then store its returned `subaccount_code` on the corresponding PayVerify merchant. `platform_fee_kobo` is PayVerify's fixed fee in kobo. `paystack_fee_bearer` can be `subaccount` or `account`.

```sql
UPDATE merchants
SET paystack_subaccount_code = 'ACCT_xxxxxxxxxx',
    platform_fee_kobo = 50000,
    paystack_fee_bearer = 'subaccount'
WHERE id = <merchant_id>;
```

The platform fee must be lower than the invoice total. A merchant without a subaccount code can still use the main Paystack account during test-mode integration, but split settlement is not applied.

## 4. Configure Paystack

Set the webhook URL in the Paystack dashboard to:

```text
https://<PayVerify backend domain>/api/webhooks/paystack
```

The webhook must remain public. The backend validates Paystack's signature and then verifies the transaction directly with Paystack before marking an invoice paid.

### Local webhook testing

Paystack cannot call `localhost` directly. For a true webhook test, either:

- point Paystack at the deployed Render endpoint above; or
- expose the local API through a temporary HTTPS tunnel, for example
  `https://<tunnel-host>/api/webhooks/paystack` using ngrok or Cloudflare
  Tunnel.

If the local API is using a different database from Render, a webhook delivered
to Render updates Render's database—not the local database. For local-only
testing without a tunnel, the customer return page polls
`/api/public/invoices/:token/status`; the local server then verifies the
transaction directly with Paystack. This is a secure verification fallback,
not a replacement for the signed webhook in production.

After an invoice is marked paid, the dashboard refresh reconciles the payment
against Paystack's settlement records. The Settlement column is therefore
separate from Paid and may change later. The dashboard checks for that change
and shows the settlement celebration when an order first becomes Settled.

## 5. Configure and deploy the frontend

Build the frontend with its normal API URL and public site URL settings. The canonical customer link is:

```text
https://<PayVerify frontend domain>/pay/<opaque-invoice-token>
```

The old customer-facing verification sandbox routes are removed. Verification now appears inside the invoice summary.

## 6. Test-mode release checklist

1. Create a merchant and save its Paystack test subaccount code.
2. Use **Quick Payment / Create & Collect** to enter an order.
3. Confirm that one order produces one invoice, QR code, payment link, and PDF.
4. Open the link and confirm the merchant, masked account, verification badge, line items, and total.
5. Confirm that a failed/unavailable verification prevents checkout.
6. Complete a Paystack test payment and confirm the webhook changes the invoice/order to paid.
7. Reopen **Resume Payment** on a pending order and confirm it reuses the same public link and does not create another order.
8. Send the same webhook event again and confirm that no duplicate payment or order is created.
9. Cancel an unpaid order and open its old link; confirm it cannot be paid or resumed. Create a new order if needed.
10. After Paystack approves the business account, replace the test keys with live keys and repeat a small controlled live payment.

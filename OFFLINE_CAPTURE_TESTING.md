# PayVerify offline capture

Offline capture is an order outbox, not an offline payment mode.

- The merchant can save a complete order when the browser is offline or a
  request loses its connection.
- The order is stored in IndexedDB (with a localStorage fallback) and shown in
  the dashboard as a queued order.
- Reconnect sync posts the order to `/api/purchase-orders` in capture order.
- The same `poReference` is replayed on every attempt, so a lost response does
  not create a duplicate purchase order.
- Queued records keep `collectPayment: false` while they are stored locally.
  When the device reconnects, the sync request sends `collectPayment: true` so
  the server creates the invoice, QR code and payment link. Paystack checkout,
  webhook verification, settlement, and the final paid receipt remain online
  and server-authoritative.
- Customer name, phone and email remain optional capture fields. A blank name
  is stored as `Walk-in customer` for display; phone/email can be used later
  for SMS/email delivery or left blank for a printed receipt.
- A cancelled order is terminal for payment: its invoice, link and QR session
  are closed. It cannot be resumed; create a new order instead. A captured,
  unpaid order can reopen its existing payment package (older records may
  still carry the legacy `approved` status).

## Browser test

1. Start the API and frontend, sign in, and open the merchant dashboard.
2. Open **Create order** and enter one item with a positive quantity and price.
3. Open browser DevTools → **Network** and set the throttling profile to
   **Offline** (or turn off the computer's network connection).
4. Submit the order. The modal should say **Save Order Offline** and show an
   “Offline capture is on” message. After submit, a toast confirms that payment
   has not started.
5. On the dashboard, confirm the status pill says **Offline capture available**
   and shows the number of saved orders. Refresh the page while still offline;
   the count should remain because the outbox is persisted locally.
6. Set DevTools throttling back to **No throttling**. The browser `online`
   event should automatically sync the queue. The dashboard should show a
   “synced” toast and the saved-order count should return to zero.
7. Open the orders list. The synchronized order should be present as pending
   with its payment package ready. Choose **Open payment package** to reopen
   the QR/link/invoice modal; only the customer’s Paystack action starts
   checkout.
8. Complete a test payment and verify that the order becomes **Paid** only
   after the signed Paystack webhook/server verification path. The offline
   capture itself must never display Paid or generate a final paid receipt.
9. Cancel an unpaid order from the orders dashboard, open its old link, and
   confirm that it shows **Payment request cancelled** with no Pay/Resume
   button. Create a new order if payment is still needed.

## Retry and duplicate checks

- While offline, submit two different orders. Restore the connection and
  confirm both sync once and remain separate orders.
- Restore the connection, immediately reload the dashboard, and click **Sync
  now** repeatedly. The order count must not increase beyond the number of
  captured orders.
- To inspect the browser outbox, use DevTools → Application → IndexedDB →
  `payverify-offline` → `orders`. Each record has an `OFF-…` `poReference`, an
  attempt count, and the original order payload.
- Simulate a temporary API outage (for example, stop the API before syncing).
  The record should remain queued with its last error and retry after the API is
  reachable again.

## Acceptance criteria

| Scenario | Expected result |
| --- | --- |
| Offline order capture | Saved locally; no Paystack request; no paid receipt |
| Page reload while offline | Queue and form workflow remain available |
| Reconnect | Each queued order is posted once and removed after success |
| Lost response / repeated sync | Same `poReference` is reused; no duplicate order |
| Invalid/auth response | Record remains visible for attention; it is not silently deleted |
| Optional customer details | Name/phone/email persist after sync; blank name displays `Walk-in customer` |
| Cancelled order | Old payment link/QR is closed; no resume action; new order required |
| Payment confirmation | Paid only after webhook + server verification; settlement remains separate |

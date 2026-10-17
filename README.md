# Guardian

A voice shopping agent for aging parents, built on PayPal.

Older parents are the people who most need help buying things online, and the people scammers target most. Guardian lets a parent shop by talking, while their adult child (the caregiver) sets the spending rules once. Every payment is held on the parent's PayPal wallet first, checked, and only then paid. If the check fails, the hold is cancelled and no money moves.

## How the money moves

1. The parent's PayPal wallet is saved once with PayPal Vault (setup token → payment token).
2. Every purchase creates an Orders v2 order with `intent: AUTHORIZE` against the saved wallet. The money is held, not taken.
3. The hold is captured (paid) or voided (released) depending on the checks.

## Run it locally

You need Node 20+ and a PayPal developer account.

1. In the [PayPal developer dashboard](https://developer.paypal.com/dashboard/applications/sandbox), create a sandbox REST app. Under the app's features, keep **Accept payments** on and make sure **Vault** is enabled under Advanced options.
2. Copy the env file and paste the app's client ID and secret:

   ```bash
   cp .env.example .env.local
   ```

3. Install and start:

   ```bash
   npm install
   npm run dev
   ```

4. Open http://localhost:3000.

The SQLite database is created in `data/` on first run. Delete `data/guardian.db` to start over.

### Sandbox accounts

The developer dashboard creates a sandbox **personal** account for you (Testing tools → Sandbox accounts). Use it when the PayPal window asks the parent to sign in. Payments land in the sandbox **business** account tied to your app.

## Trying it out

### Wallet and holds

1. Go to **Open dashboard** and create a household (the parent's name and yours).
2. Click the PayPal button and sign in with the sandbox personal account. The wallet panel switches to **Connected**.
3. Use **Try a payment** to place a hold. A tag stamped **On hold** appears.
4. Click **Pay now** to capture it, or **Cancel hold** to void it. Check the sandbox business account's activity to see the result.

## Roadmap

- [x] Wallet connect, holds, capture and void
- [ ] Caregiver rules in plain English, turned into a signed spending mandate
- [ ] Voice shopping agent for the parent
- [ ] Independent verifier agent and caregiver approvals
- [ ] Scam shield for requests to send money to people

## Stack

Next.js (App Router), Tailwind CSS, Drizzle ORM with SQLite (libSQL), PayPal REST APIs (Vault v3, Orders v2, Payments v2).

## License

MIT

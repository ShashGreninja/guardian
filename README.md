# Guardian

A voice shopping agent for aging parents, built on PayPal.

Older parents are the people who most need help buying things online, and the people scammers target most. Guardian lets a parent shop by talking, while their adult child (the caregiver) sets the spending rules once. Every payment is held on the parent's PayPal wallet first, checked, and only then paid. If the check fails, the hold is cancelled and no money moves.

## How the money moves

1. The parent's PayPal wallet is saved once with PayPal Vault (setup token → payment token).
2. Every purchase creates an Orders v2 order with `intent: AUTHORIZE` against the saved wallet. The money is held, not taken.
3. The hold is captured (paid) or voided (released) depending on the checks.

## How the rules work

1. The caregiver writes rules in plain English ("Anything over $25, ask me first").
2. Claude (`claude-opus-5-5`, structured outputs) reads them into a typed rule set: allowed categories, weekly budget, approval line, order limit, blocked merchants, and whether money can go to people. Anything it can't turn into a rule is listed back instead of guessed.
3. The caregiver checks the reading and signs it. Guardian signs the canonical JSON with Ed25519 and stores the digest and signature. If the stored rules are ever edited, the signature check fails and Guardian refuses to use them.
4. Purchases are checked by a deterministic policy engine (`src/lib/policy.ts`). No model decides whether money moves.

## Run it locally

You need Node 20+, a PayPal developer account and a Claude API key.

1. In the [PayPal developer dashboard](https://developer.paypal.com/dashboard/applications/sandbox), create a **US** sandbox business account, then a sandbox REST app tied to it. In the app's features, turn on **Save payment methods** and save.
2. Copy the env file and paste the app's client ID and secret, plus an `ANTHROPIC_API_KEY` from [console.anthropic.com](https://console.anthropic.com):

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

### Rules

1. Open the **Rules** tab. Edit the example rules or write your own, then click **Read my rules**.
2. Check how each line was read, then click **Sign and turn on**. The signature card shows the version, digest and a **Signed** stamp.
3. Use **What if … asked for** to test purchases. A $38 pharmacy order is held for you; $500 to "Danny" is stopped.

### Shopping by voice

1. Sign out, then choose **I'm shopping** (or use **Parent view** in the sidebar).
2. Tap the microphone and ask for something, for example "I need bread and oat milk". Typing works too. Voice uses the browser's speech recognition (Chrome and Edge support it).
3. Guardian searches the store catalogue, builds a basket and reads it back. Tap **Yes, buy it**.
4. The basket is checked against the signed rules. If they allow it, a PayPal hold is placed and it shows up under **Waiting for you** on the caregiver dashboard. If they don't, nothing is charged.

The shopping agent is Claude with two tools: `search_products` over a local demo catalogue and `propose_cart`. It never pays. Payment only happens after the parent confirms and the deterministic rules check passes.

### The verifier

After the parent says yes:

1. PayPal holds the money. The order's `custom_id` carries the signed rule set's version and digest.
2. A second Claude agent reviews the basket. It sees only the signed rules, the basket and the deterministic check, never the conversation, so nobody can talk it into approving.
3. The most cautious answer wins:
   - **Paid on its own:** the rules pass and the verifier approves.
   - **Waiting for you:** either one is unsure. The tag shows the verifier's reasons.
   - **Stopped:** either one says no. The hold is voided.

If the verifier can't run, the payment waits for the caregiver. The dashboard refreshes every few seconds, so a voice order shows up without reloading.

**Webhooks:** once deployed, add a sandbox webhook for `https://<host>/api/paypal/webhook` (authorization voided, capture completed or denied) and put its ID in `PAYPAL_WEBHOOK_ID`. Deliveries are verified with PayPal before anything changes.

## Roadmap

- [x] Wallet connect, holds, capture and void
- [x] Caregiver rules in plain English, turned into a signed spending mandate
- [x] Voice shopping agent for the parent
- [x] Independent verifier agent and caregiver approvals
- [ ] Scam shield for requests to send money to people

## Stack

Next.js (App Router), Tailwind CSS, Drizzle ORM with SQLite (libSQL), PayPal REST APIs (Vault v3, Orders v2, Payments v2), Claude API (Anthropic TypeScript SDK) for reading rules.

## License

MIT

<!-- Generated Croche skill content. -->

# Customer-hosted serverless

Croche runs inside the customer's deployment, not a hosted app backend supplied by Croche.
Use the [published TypeScript guide](https://docs.croche.ai/sdks/typescript/#cloudflare-workers)
as the **single deployment walkthrough**, and only when its displayed SDK/source version matches
the `@h1r-ai/croche` version you install.
If the installed package or docs lack Workers support, install the matching 0.7 package; do not
substitute an older SDK, a custom WASM loader, or an unverified serverless host.

Pass both a durable StateStore and a BlobStore in `adapters` for Workers
`Croche.open`, `Croche.wakeTimes` and `Croche.registerBackground`. The SDK
returns `invalid_configuration` if either is missing. Use the same two stores
for the same owner on each call. A SQLite Durable Object and an R2-backed
BlobStore are the guide’s example.

Follow that guide's app files, user authentication, Durable Object ownership/storage,
secret provisioning, fixed request-ID retry receipts, timeouts, iteration sizing and cost
checks. Supply a `serverKey` (or a `developmentKey` in development) to `Croche.open`; without one, open
fails with `invalid_configuration`. Keep that credential in the customer's Worker secrets, never vars or
frontend code. Verify one completed turn, retained history and a genuine code redeploy;
never reset state to force a pass. Obtain the customer's approval before deploying or spending.

AWS Lambda has only a short verification-status section there until its real AWS run lands.
A local Node/container or warm-isolate result is not proof of durable AWS deployment.

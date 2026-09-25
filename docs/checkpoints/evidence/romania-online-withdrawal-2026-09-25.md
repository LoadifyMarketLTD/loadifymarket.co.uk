# Romania online withdrawal legal readiness evidence — 25 September 2026

Status: implementation evidence / legal-review input. This file does not by itself mark any policy version as legally verified.

## Authoritative sources reviewed

1. Romania, OUG nr. 34/2014 privind drepturile consumatorilor în cadrul contractelor încheiate cu profesioniști, current consolidated form:
   - https://legislatie.just.ro/Public/DetaliiDocument/158913
   - Article 9: 14-day withdrawal period for distance contracts, subject to statutory exceptions.
   - Article 14: consumer return obligations and direct return costs where properly disclosed.

2. Romania, OUG nr. 18/2026:
   - https://legislatie.just.ro/Public/DetaliiDocument/308474
   - Inserts Article 11^1 into OUG 34/2014 for distance contracts concluded through an online interface.
   - Effective 27 September 2026 for the online withdrawal-function requirement.
   - Requires a visible, continuously available online withdrawal function during the withdrawal period.
   - The consumer must be able to provide/confirm identity, contract details and an electronic confirmation channel.
   - The confirmation action must be clear and unambiguous.
   - After submission, the trader must send confirmation without undue delay on a durable medium, including declaration content plus date/time.

3. Romania, OUG nr. 140/2021 on contracts for the sale of goods:
   - https://legislatie.just.ro/Public/DetaliiDocumentAfis/250044
   - Establishes seller liability for conformity and the statutory consumer remedies framework.

4. EU Consumer Rights Directive 2011/83/EU, consolidated:
   - https://eur-lex.europa.eu/eli/dir/2011/83/2022-05-28/eng
   - Article 9: 14-day withdrawal right for distance contracts, subject to exceptions.

5. EU Sale of Goods Directive (EU) 2019/771:
   - https://eur-lex.europa.eu/eli/dir/2019/771/oj
   - Article 10: seller liability for lack of conformity appearing within two years, subject to national implementation.

## Repository gap found

Before this audit, Loadify Market had:
- pre-dispatch buyer cancellation requests;
- post-delivery return requests;
- refund/dispute workflows.

It did **not** have the distinct online withdrawal function required by the Romanian 2026 amendment, nor a dedicated durable-medium confirmation record.

## Implementation added

- Dedicated buyer route: `/buyer/withdrawal`.
- Visible Buyer Hub navigation entry: `Online Withdrawal`.
- Clear Romanian labels:
  - `Retrageți-vă din contract aici`
  - `Confirmați retragerea`
- Dedicated server boundary: `/.netlify/functions/request-order-withdrawal`.
- Buyer authentication and ownership checks.
- Romania-market-only gate.
- Withdrawal-window validation.
- Explicit confirmation before submission.
- Durable-medium confirmation by Resend email to the authenticated account email.
- Confirmation includes declaration content, order reference, submission date and submission time.
- Dedicated database evidence table: `public.order_withdrawal_requests`.
- Server-only write authority; buyer/admin read boundary.
- Withdrawal declaration does not directly mutate payment truth, issue refunds, or bypass the governed return/refund workflow.
- Romanian Buyer Terms and Returns Policy now point to the withdrawal function.

## Launch posture

Romania remains PRELAUNCH. This implementation is readiness work and does not activate RO checkout or payment.

Policy versions must remain unverified until the final reviewed legal content and operational process are approved.

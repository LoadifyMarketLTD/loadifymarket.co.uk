# Avasam Evidence Gate

This gate is intentionally explicit so provider integration cannot advance from implementation confidence to commercial activation without evidence.

## Gate A — Provider contract

Required: provider-issued/API documentation sufficient to identify authentication, endpoint paths, request/response schemas, pagination/rate limits and supported capabilities.

## Gate B — Runtime transport

Required: authenticated server-side client, bounded retries, rate-limit handling, correlation and idempotency propagation, malformed-response classification.

## Gate C — Capability mapping

Required separately for catalog, stock, price, shipping, order submission, acknowledgement, tracking, cancellation, returns and reimbursement.

## Gate D — Inbound events

Required where provider supports push updates: authenticated webhook verification, replay/idempotency protection, schema validation and event-to-observation mapping.

## Gate E — Real evidence

Required: real provider responses and order lifecycle evidence in GB. Simulator-only evidence cannot satisfy this gate.

## Gate F — Registration

Only after A–E pass may `supplier_commerce_provider_capabilities` and `supplier_adapter_registrations` contain active verified Avasam capabilities.

Until then the adapter remains fail-closed and Supplier Commerce remains disabled.

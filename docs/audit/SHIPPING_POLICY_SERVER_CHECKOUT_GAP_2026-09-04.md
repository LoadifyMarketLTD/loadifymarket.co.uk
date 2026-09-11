# Shipping policy server-checkout gap — 2026-09-04

Current `create-checkout.ts` validates that a selected shipping method is active, attached to all physical products in the cart, and has a valid server-resolved rate. It does not currently enforce the new-carrier policy (`Royal Mail` primary, `Evri` single alternative) at the checkout server boundary.

Therefore a legacy active shipping-method row linked to products could still be accepted by checkout even though new shipment writes later reject unsupported carriers.

Classification: **VALID CURRENT-MAIN GAP**. Fix later in the shipping/tracking domain by validating the shipping method carrier server-side for new physical checkout while preserving historical paid order/shipment records. Do not change the 7% commission basis or introduce paid carrier APIs as part of this fix.

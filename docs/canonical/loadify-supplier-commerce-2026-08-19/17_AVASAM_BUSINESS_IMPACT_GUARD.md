# Avasam Business Impact Guard

Before activation, verify that provider integration cannot:

- expose supplier cost or internal margin to buyers/sellers
- alter public product lifecycle without the canonical offer/product model
- bypass existing order, payment, fulfilment, refund or return state machines
- create duplicate orders after an unknown provider response
- convert unavailable stock or price into numeric zero
- mutate commercial history destructively
- bypass authentication, ownership checks or RLS
- introduce provider-specific contracts into the core commerce model
- create a web/mobile divergence
- reactivate legacy supplier-commerce code paths

The Avasam adapter is an integration boundary only. Commercial state remains owned by Loadify's canonical commerce model and existing runtime guards.

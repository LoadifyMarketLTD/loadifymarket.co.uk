# Loadify Market native mobile UX reference boundary

Date: 2026-09-06
Branch: `feat/native-mobile-marketplace-v1-20260906`

## Purpose

The native Loadify Market mobile redesign may study mature marketplace applications, including Vinted, only to understand broad interaction patterns that are common across mobile commerce products.

## Permitted reference patterns

The implementation may use general product-design principles such as:

- search-first marketplace discovery;
- dense, image-led product browsing;
- simple five-destination bottom navigation;
- a prominent seller/listing entry point;
- quick access to favourites, orders and conversations;
- compact account and purchase-history surfaces;
- reducing marketing material inside an installed commerce application.

These are functional UX patterns, not copied expression.

## Prohibited copying

Do not copy, import, reproduce or derive from Vinted or another third party:

- source code, decompiled implementation or proprietary APIs;
- icons, illustrations, photographs, fonts or other assets;
- logos, trade dress, distinctive colour systems or brand identifiers;
- exact screen layouts, wording, microcopy, animation sequences or component measurements;
- private endpoints, credentials, telemetry identifiers or internal implementation details.

The APK supplied for local reference is not a repository dependency and must not be committed to Loadify Market.

## Loadify ownership requirements

All production implementation must continue to use Loadify Market's own:

- brand and visual identity;
- routes and navigation semantics;
- Supabase/Auth authorization model;
- Stripe and commerce boundaries;
- seller, buyer and admin capability model;
- product, order, shipping, messaging and notification contracts;
- original code and repository assets.

## Review rule

Before merge, the mobile changes should be reviewable without possessing the reference APK. A reviewer should be able to explain every changed component purely from Loadify Market requirements and common marketplace UX principles.

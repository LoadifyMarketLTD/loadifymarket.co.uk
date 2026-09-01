import type {
  SupplierAdapterResult,
  SupplierCatalogItemRef,
  SupplierPriceSnapshot,
  SupplierStockSnapshot,
} from './supplierAdapter';
import {
  totalBigBuyStock,
  type BigBuyProduct,
  type BigBuyProductVariation,
  type BigBuyStockItem,
} from './bigBuyContracts';

export const BIGBUY_READ_PROJECTION_INTERFACE_VERSION = 1 as const;
export const BIGBUY_SYSTEM_CURRENCY = 'EUR' as const;

export interface BigBuyReadProjectionInputV1 {
  products: readonly BigBuyProduct[];
  variations: readonly BigBuyProductVariation[];
  productStock: readonly BigBuyStockItem[];
  variationStock: readonly BigBuyStockItem[];
  observedAt: string;
}

export interface BigBuyReadProjectionV1 {
  interfaceVersion: typeof BIGBUY_READ_PROJECTION_INTERFACE_VERSION;
  provider: 'bigbuy';
  sourceCurrency: typeof BIGBUY_SYSTEM_CURRENCY;
  catalog: SupplierCatalogItemRef[];
  stock: SupplierStockSnapshot[];
  prices: SupplierPriceSnapshot[];
  safety: {
    providerNetworkCallPerformed: false;
    providerCapabilityPromotionPerformed: false;
    marketplacePublicationPerformed: false;
    providerWritePerformed: false;
    customerPiiProcessed: false;
    financialMutationPerformed: false;
  };
}

interface EffectiveBigBuyRef {
  ref: string;
  entityId: number;
  kind: 'product' | 'variation';
  wholesalePrice: number;
}

function malformed<T>(message: string): SupplierAdapterResult<T> {
  return { ok: false, errorClass: 'MALFORMED_RESPONSE', message };
}

function validObservedAt(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) return null;
  const timestamp = Date.parse(normalized);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

/**
 * Converts BigBuy's documented EUR price into EUR minor units without silently
 * rounding provider values that contain unsupported sub-cent precision.
 */
function euroMinorUnits(value: number): SupplierAdapterResult<number> {
  const scaled = value * 100;
  if (!Number.isFinite(scaled) || scaled < 0) {
    return malformed('BigBuy wholesale price is invalid');
  }
  const rounded = Math.round(scaled);
  if (!Number.isSafeInteger(rounded)) {
    return malformed('BigBuy wholesale price exceeds safe minor-unit range');
  }
  if (Math.abs(scaled - rounded) > 1e-7) {
    return malformed('BigBuy wholesale price has unsupported sub-cent precision');
  }
  return { ok: true, data: rounded };
}

function uniqueStockBySku(
  items: readonly BigBuyStockItem[],
  label: string,
): SupplierAdapterResult<Map<string, BigBuyStockItem>> {
  const map = new Map<string, BigBuyStockItem>();
  for (const item of items) {
    if (map.has(item.sku)) return malformed(`BigBuy ${label} contains duplicate SKU '${item.sku}'`);
    map.set(item.sku, item);
  }
  return { ok: true, data: map };
}

function stockSnapshot(
  effective: EffectiveBigBuyRef,
  stockMap: Map<string, BigBuyStockItem>,
  observedAt: string,
): SupplierAdapterResult<SupplierStockSnapshot> {
  const item = stockMap.get(effective.ref);
  if (!item) {
    return {
      ok: true,
      data: {
        externalVariantRef: effective.ref,
        availability: 'unknown',
        observedAt,
      },
    };
  }
  if (item.id !== effective.entityId) {
    return malformed(`BigBuy stock id/SKU binding is inconsistent for '${effective.ref}'`);
  }
  const total = totalBigBuyStock(item);
  if (!total.ok) return total;
  return {
    ok: true,
    data: {
      externalVariantRef: effective.ref,
      quantity: total.data,
      availability: total.data > 0 ? 'in_stock' : 'out_of_stock',
      observedAt,
    },
  };
}

/**
 * Pure provider-to-canonical projection for already-parsed BigBuy read data.
 *
 * This function performs no network request and does not register/promote a
 * BigBuy capability. It exists so provider payload interpretation can be tested
 * independently before authorised sandbox evidence is available.
 *
 * Active products with variations expose the variation SKUs as sellable refs;
 * active products without variations expose their product SKU. Missing stock is
 * `unknown`, never inferred as available or zero. SKU/id ambiguity fails closed.
 */
export function projectBigBuyReadModel(
  input: BigBuyReadProjectionInputV1,
): SupplierAdapterResult<BigBuyReadProjectionV1> {
  const observedAt = validObservedAt(input.observedAt);
  if (!observedAt) return malformed('BigBuy projection observedAt is invalid');

  const productIds = new Set<number>();
  const externalRefs = new Set<string>();

  for (const product of input.products) {
    if (productIds.has(product.id)) return malformed(`BigBuy products contain duplicate id '${product.id}'`);
    if (externalRefs.has(product.sku)) return malformed(`BigBuy catalogue contains duplicate external ref '${product.sku}'`);
    productIds.add(product.id);
    externalRefs.add(product.sku);
  }

  const variationIds = new Set<number>();
  const variationsByProduct = new Map<number, BigBuyProductVariation[]>();
  for (const variation of input.variations) {
    if (variationIds.has(variation.id)) return malformed(`BigBuy variations contain duplicate id '${variation.id}'`);
    if (externalRefs.has(variation.sku)) return malformed(`BigBuy catalogue contains duplicate external ref '${variation.sku}'`);
    if (!productIds.has(variation.product)) {
      return malformed(`BigBuy variation '${variation.sku}' references unknown product '${variation.product}'`);
    }
    variationIds.add(variation.id);
    externalRefs.add(variation.sku);
    const group = variationsByProduct.get(variation.product) ?? [];
    group.push(variation);
    variationsByProduct.set(variation.product, group);
  }

  const productStock = uniqueStockBySku(input.productStock, 'product stock');
  if (!productStock.ok) return productStock;
  const variationStock = uniqueStockBySku(input.variationStock, 'variation stock');
  if (!variationStock.ok) return variationStock;

  const catalog: SupplierCatalogItemRef[] = [];
  const effectiveRefs: EffectiveBigBuyRef[] = [];

  for (const product of input.products) {
    if (product.active !== 1) continue;
    const variations = variationsByProduct.get(product.id) ?? [];
    const sellable = variations.length > 0
      ? variations.map<EffectiveBigBuyRef>(variation => ({
          ref: variation.sku,
          entityId: variation.id,
          kind: 'variation',
          wholesalePrice: variation.wholesalePrice,
        }))
      : [{
          ref: product.sku,
          entityId: product.id,
          kind: 'product' as const,
          wholesalePrice: product.wholesalePrice,
        }];

    catalog.push({
      externalProductRef: product.sku,
      externalVariantRefs: sellable.map(item => item.ref),
    });
    effectiveRefs.push(...sellable);
  }

  const stock: SupplierStockSnapshot[] = [];
  const prices: SupplierPriceSnapshot[] = [];

  for (const effective of effectiveRefs) {
    const price = euroMinorUnits(effective.wholesalePrice);
    if (!price.ok) return price;
    prices.push({
      externalVariantRef: effective.ref,
      amountMinor: price.data,
      currency: BIGBUY_SYSTEM_CURRENCY,
      observedAt,
    });

    const snapshot = stockSnapshot(
      effective,
      effective.kind === 'variation' ? variationStock.data : productStock.data,
      observedAt,
    );
    if (!snapshot.ok) return snapshot;
    stock.push(snapshot.data);
  }

  return {
    ok: true,
    data: {
      interfaceVersion: BIGBUY_READ_PROJECTION_INTERFACE_VERSION,
      provider: 'bigbuy',
      sourceCurrency: BIGBUY_SYSTEM_CURRENCY,
      catalog,
      stock,
      prices,
      safety: {
        providerNetworkCallPerformed: false,
        providerCapabilityPromotionPerformed: false,
        marketplacePublicationPerformed: false,
        providerWritePerformed: false,
        customerPiiProcessed: false,
        financialMutationPerformed: false,
      },
    },
  };
}

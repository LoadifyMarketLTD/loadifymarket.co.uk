export interface DeliveryAddressData {
  name?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  postal_code?: string;
  country?: string;
  countryCode?: string;
  isDefault?: boolean;
}

const UK_POSTCODE = /^(GIR 0AA|(?:(?:[A-PR-UWYZ][0-9][0-9A-HJKSTUW]?|[A-PR-UWYZ][A-HK-Y][0-9][0-9ABEHMNPRV-Y]?)[ ]?[0-9][ABD-HJLNP-UW-Z]{2}))$/i;

export function formatUkPostcode(value: string): string {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (compact.length <= 3) return compact;
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}
export function normalizeDeliveryAddress(
  input: DeliveryAddressData,
): DeliveryAddressData {
  return {
    name: input.name?.trim() ?? "",
    phone: input.phone?.trim() ?? "",
    line1: input.line1?.trim() ?? "",
    line2: input.line2?.trim() ?? "",
    city: input.city?.trim() ?? "",
    county: input.county?.trim() ?? "",
    postcode: formatUkPostcode(input.postcode ?? input.postal_code ?? ""),
    country: "United Kingdom",
    countryCode: "GB",
    isDefault: Boolean(input.isDefault),
  };
}

export function validateDeliveryAddress(
  input: DeliveryAddressData,
): string | null {
  const address = normalizeDeliveryAddress(input);
  if (!address.name) return "Enter the recipient's full name.";
  if (!address.line1) return "Enter the house number and street.";
  if (!address.city) return "Enter the town or city.";
  if (!address.postcode || !UK_POSTCODE.test(address.postcode)) {
    return "Enter a valid UK postcode.";
  }
  return null;
}

export function hasDeliveryAddress(
  input: DeliveryAddressData | null | undefined,
): boolean {
  if (!input) return false;
  return validateDeliveryAddress(input) === null;
}

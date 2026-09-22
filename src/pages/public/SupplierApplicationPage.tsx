import { useMemo, useState } from "react";
import { CheckCircle2, FileInput, Loader2, ShieldCheck } from "lucide-react";
import MainLayout from "@/layouts/MainLayout";
import SEO from "@/components/SEO";
import SectionNav from "@/components/presentation/SectionNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const businessNav = [
  { label: "Overview", to: "/business" },
  { label: "Trade Buyers", to: "/trade" },
  { label: "Supplier Hub", to: "/suppliers" },
  { label: "Apply", to: "/suppliers/apply" },
] as const;

const catalogOptions = [
  ["json_api", "API / JSON API"],
  ["json_feed", "JSON feed"],
  ["feed_url", "Feed URL"],
  ["csv", "CSV"],
  ["xml", "XML"],
  ["sftp", "SFTP"],
  ["manual_catalog", "Manual catalogue"],
] as const;

interface SupplierApplicationForm {
  legalName: string;
  tradingName: string;
  registrationCountry: string;
  registrationNumber: string;
  vatNumber: string;
  website: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  productCategories: string;
  warehouseCountries: string;
  fulfilmentTerritories: string;
  catalogMethods: string[];
  catalogSize: string;
  directDispatch: boolean;
  blindShipping: boolean;
  trackingAvailable: boolean;
  returnsSupported: boolean;
  dispatchSlaHours: string;
  stockRefreshMinutes: string;
  priceRefreshMinutes: string;
  minimumOrderValue: string;
  notes: string;
  botField: string;
}

const initialForm: SupplierApplicationForm = {
  legalName: "",
  tradingName: "",
  registrationCountry: "GB",
  registrationNumber: "",
  vatNumber: "",
  website: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  productCategories: "",
  warehouseCountries: "GB",
  fulfilmentTerritories: "GB",
  catalogMethods: [],
  catalogSize: "",
  directDispatch: true,
  blindShipping: false,
  trackingAvailable: true,
  returnsSupported: true,
  dispatchSlaHours: "",
  stockRefreshMinutes: "",
  priceRefreshMinutes: "",
  minimumOrderValue: "",
  notes: "",
  botField: "",
};

function csv(value: string, uppercase = false): string[] {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean).map((item) => uppercase ? item.toUpperCase() : item))];
}

export default function SupplierApplicationPage() {
  const openedAt = useMemo(() => Date.now(), []);
  const [form, setForm] = useState<SupplierApplicationForm>(initialForm);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [applicationId, setApplicationId] = useState("");

  function update<K extends keyof SupplierApplicationForm>(key: K, value: SupplierApplicationForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleCatalogMethod(value: string) {
    setForm((current) => ({
      ...current,
      catalogMethods: current.catalogMethods.includes(value)
        ? current.catalogMethods.filter((item) => item !== value)
        : [...current.catalogMethods, value],
    }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    setApplicationId("");

    if (form.catalogMethods.length === 0) {
      setStatus("error");
      setMessage("Select at least one catalogue method.");
      return;
    }

    try {
      const response = await fetch("/.netlify/functions/supplier-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legalName: form.legalName,
          tradingName: form.tradingName || undefined,
          registrationCountry: form.registrationCountry,
          registrationNumber: form.registrationNumber || undefined,
          vatNumber: form.vatNumber || undefined,
          website: form.website || undefined,
          contactName: form.contactName,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone || undefined,
          productCategories: csv(form.productCategories),
          warehouseCountries: csv(form.warehouseCountries, true),
          fulfilmentTerritories: csv(form.fulfilmentTerritories, true),
          catalogMethods: form.catalogMethods,
          catalogSize: form.catalogSize || undefined,
          directDispatch: form.directDispatch,
          blindShipping: form.blindShipping,
          trackingAvailable: form.trackingAvailable,
          returnsSupported: form.returnsSupported,
          dispatchSlaHours: form.dispatchSlaHours || undefined,
          stockRefreshMinutes: form.stockRefreshMinutes || undefined,
          priceRefreshMinutes: form.priceRefreshMinutes || undefined,
          minimumOrderValue: form.minimumOrderValue || undefined,
          notes: form.notes || undefined,
          submittedAt: openedAt,
          "bot-field": form.botField,
        }),
      });

      const body = await response.json() as { error?: string; applicationId?: string };
      if (!response.ok) throw new Error(body.error || "Unable to submit supplier application.");

      setApplicationId(body.applicationId || "");
      setStatus("success");
      setMessage("Thank you. Your supplier application has been received for review. Submission does not create or approve a supplier account.");
      setForm(initialForm);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to submit supplier application.");
    }
  }

  return (
    <MainLayout>
      <SEO
        title="Become a Supplier | Loadify Market"
        description="Apply to become a direct Loadify Market supplier. For manufacturers, importers, wholesalers and distributors with supplier-held stock and fulfilment."
        canonical="/suppliers/apply"
      />
      <SectionNav title="Business" items={businessNav} />
      <main id="main-content" className="bg-[#F8F7F4] text-[#0A234F]">
        <section className="border-b border-[#0A234F]/10">
          <div className="mx-auto grid max-w-[1480px] gap-10 px-5 py-14 sm:px-7 lg:grid-cols-[0.72fr_1.28fr] lg:px-10 lg:py-20">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#8A7351]">Supplier Application</p>
              <h1 className="mt-5 font-serif text-[2.7rem] font-normal leading-[1.02] tracking-[-0.04em] sm:text-[3.8rem]">Tell us how your supply operation works.</h1>
              <p className="mt-6 text-[16px] leading-8 text-[#5A6578]">This form is for manufacturers, importers, wholesalers and distributors interested in direct supplier participation. It creates a review application only.</p>
              <div className="mt-8 rounded-[24px] bg-[#0A234F] p-7 text-white">
                <ShieldCheck className="h-6 w-6 text-[#F5A300]" />
                <h2 className="mt-5 font-serif text-2xl text-white">Do not submit passwords, API keys or credentials.</h2>
                <p className="mt-3 text-sm leading-6 text-white/75">Technical credentials are never collected in this public form. If a relationship progresses, any required configuration is handled later through controlled server-side setup.</p>
              </div>
              <div className="mt-6 space-y-3 text-sm text-[#5A6578]">
                {["Application does not equal supplier approval.", "No products are published from this form.", "No commerce capability is activated automatically."].map((item) => <div key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1D57D8]" /><span>{item}</span></div>)}
              </div>
            </div>

            <form onSubmit={submit} className="rounded-[28px] border border-[#0A234F]/10 bg-white p-6 shadow-[0_18px_50px_rgba(10,35,79,0.08)] sm:p-8">
              <div className="hidden" aria-hidden="true">
                <Label htmlFor="supplier-bot-field">Do not fill this field</Label>
                <Input id="supplier-bot-field" tabIndex={-1} autoComplete="off" value={form.botField} onChange={(e) => update("botField", e.target.value)} />
              </div>

              <div className="flex items-center gap-3 border-b border-[#0A234F]/10 pb-5">
                <FileInput className="h-6 w-6 text-[#1D57D8]" />
                <div><h2 className="text-xl font-extrabold">Supplier profile</h2><p className="mt-1 text-sm text-[#667085]">Business, catalogue and fulfilment information for initial review.</p></div>
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <Field label="Legal company name" required><Input value={form.legalName} onChange={(e) => update("legalName", e.target.value)} required maxLength={200} /></Field>
                <Field label="Trading name"><Input value={form.tradingName} onChange={(e) => update("tradingName", e.target.value)} maxLength={200} /></Field>
                <Field label="Registration country" required><Input value={form.registrationCountry} onChange={(e) => update("registrationCountry", e.target.value.toUpperCase())} required maxLength={2} placeholder="GB" /></Field>
                <Field label="Company registration number"><Input value={form.registrationNumber} onChange={(e) => update("registrationNumber", e.target.value)} maxLength={80} /></Field>
                <Field label="VAT number"><Input value={form.vatNumber} onChange={(e) => update("vatNumber", e.target.value)} maxLength={80} /></Field>
                <Field label="Website (HTTPS)"><Input type="url" value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="https://example.co.uk" /></Field>
              </div>

              <h3 className="mt-8 text-base font-extrabold">Primary contact</h3>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <Field label="Contact name" required><Input value={form.contactName} onChange={(e) => update("contactName", e.target.value)} required maxLength={160} /></Field>
                <Field label="Business email" required><Input type="email" value={form.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} required /></Field>
                <Field label="Phone"><Input value={form.contactPhone} onChange={(e) => update("contactPhone", e.target.value)} maxLength={80} /></Field>
              </div>

              <h3 className="mt-8 text-base font-extrabold">Catalogue & coverage</h3>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <Field label="Product categories (comma separated)" required><Input value={form.productCategories} onChange={(e) => update("productCategories", e.target.value)} required placeholder="Homeware, Gifts, Garden" /></Field>
                <Field label="Approx. catalogue size"><Input type="number" min="0" value={form.catalogSize} onChange={(e) => update("catalogSize", e.target.value)} /></Field>
                <Field label="Warehouse countries (codes)" required><Input value={form.warehouseCountries} onChange={(e) => update("warehouseCountries", e.target.value.toUpperCase())} required placeholder="GB" /></Field>
                <Field label="Fulfilment territories (codes)" required><Input value={form.fulfilmentTerritories} onChange={(e) => update("fulfilmentTerritories", e.target.value.toUpperCase())} required placeholder="GB" /></Field>
              </div>

              <div className="mt-5">
                <Label>Catalogue methods</Label>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {catalogOptions.map(([value, label]) => (
                    <label key={value} className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#0A234F]/10 bg-[#F8F7F4] px-4 py-3 text-sm font-semibold">
                      <input type="checkbox" checked={form.catalogMethods.includes(value)} onChange={() => toggleCatalogMethod(value)} className="h-4 w-4" />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <h3 className="mt-8 text-base font-extrabold">Fulfilment capabilities</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Toggle label="Direct dispatch to the buyer" checked={form.directDispatch} onChange={(value) => update("directDispatch", value)} />
                <Toggle label="Blind / neutral shipping available" checked={form.blindShipping} onChange={(value) => update("blindShipping", value)} />
                <Toggle label="Tracking available" checked={form.trackingAvailable} onChange={(value) => update("trackingAvailable", value)} />
                <Toggle label="Returns process supported" checked={form.returnsSupported} onChange={(value) => update("returnsSupported", value)} />
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <Field label="Dispatch SLA (hours)"><Input type="number" min="0" value={form.dispatchSlaHours} onChange={(e) => update("dispatchSlaHours", e.target.value)} /></Field>
                <Field label="Minimum order value (£)"><Input type="number" min="0" step="0.01" value={form.minimumOrderValue} onChange={(e) => update("minimumOrderValue", e.target.value)} /></Field>
                <Field label="Stock refresh (minutes)"><Input type="number" min="0" value={form.stockRefreshMinutes} onChange={(e) => update("stockRefreshMinutes", e.target.value)} /></Field>
                <Field label="Price refresh (minutes)"><Input type="number" min="0" value={form.priceRefreshMinutes} onChange={(e) => update("priceRefreshMinutes", e.target.value)} /></Field>
              </div>

              <div className="mt-5">
                <Field label="Additional information"><Textarea rows={5} maxLength={4000} value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Commercial terms, order submission method, tracking or returns notes, existing feed documentation, or anything else useful for initial review." /></Field>
              </div>

              <Button type="submit" disabled={status === "loading"} className="mt-7 min-h-12 w-full sm:w-auto">
                {status === "loading" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</> : "Submit Supplier Application"}
              </Button>

              {status === "success" && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><strong>Application received.</strong><p className="mt-1">{message}</p>{applicationId && <p className="mt-2 text-xs">Reference: {applicationId}</p>}</div>}
              {status === "error" && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{message}</div>}
            </form>
          </div>
        </section>
      </main>
    </MainLayout>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}{required ? " *" : ""}</Label>{children}</div>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#0A234F]/10 bg-[#F8F7F4] px-4 py-3 text-sm font-semibold"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />{label}</label>;
}

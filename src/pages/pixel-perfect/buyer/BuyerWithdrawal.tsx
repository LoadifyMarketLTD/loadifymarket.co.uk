import { useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { authorizedFetch } from "@/lib/authorizedFetch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";

type WithdrawalOrder = {
  id: string;
  orderNumber: string;
  status: string;
  marketCode: string;
  createdAt: string;
  deliveredAt: string | null;
};

const ELIGIBLE_STATUSES = new Set([
  "paid",
  "packed",
  "processing",
  "shipped",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "completed",
]);

function isWithdrawalWindowOpen(order: WithdrawalOrder): boolean {
  if (order.marketCode !== "RO" || !ELIGIBLE_STATUSES.has(order.status)) return false;
  if (!order.deliveredAt) return true;
  const deliveredAt = new Date(order.deliveredAt);
  if (Number.isNaN(deliveredAt.getTime())) return false;
  return Date.now() <= deliveredAt.getTime() + 14 * 24 * 60 * 60 * 1000;
}

const BuyerWithdrawal = () => {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<WithdrawalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderId, setOrderId] = useState("");
  const [consumerName, setConsumerName] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completedAt, setCompletedAt] = useState<string | null>(null);

  useEffect(() => {
    setConsumerName([user?.firstName, user?.lastName].filter(Boolean).join(" ").trim());
  }, [user?.firstName, user?.lastName]);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select("id, orderNumber, status, marketCode, createdAt, deliveredAt")
        .eq("buyerId", user.id)
        .eq("marketCode", "RO")
        .order("createdAt", { ascending: false });

      if (error) {
        toast({
          title: "Comenzile nu au putut fi încărcate",
          description: error.message,
          variant: "destructive",
        });
        setOrders([]);
      } else {
        setOrders((data ?? []) as WithdrawalOrder[]);
      }
      setLoading(false);
    };
    void load();
  }, [user?.id]);

  const eligibleOrders = useMemo(() => orders.filter(isWithdrawalWindowOpen), [orders]);
  const selected = eligibleOrders.find((order) => order.id === orderId) ?? null;

  const submitWithdrawal = async () => {
    if (!selected || !consumerName.trim() || !user?.email || !confirmed || submitting) return;
    setSubmitting(true);
    try {
      const response = await authorizedFetch("/.netlify/functions/request-order-withdrawal", {
        method: "POST",
        body: JSON.stringify({
          orderId: selected.id,
          consumerName: consumerName.trim(),
          confirmationEmail: user.email,
          confirm: true,
        }),
      });
      const payload = await response.json() as {
        error?: string;
        message?: string;
        declarationRecorded?: boolean;
        request?: { submittedAt?: string };
      };

      if (!response.ok) {
        if (payload.declarationRecorded) {
          toast({
            title: "Declarația a fost înregistrată",
            description: payload.error || "Confirmarea prin e-mail necesită reîncercare operațională.",
            variant: "destructive",
          });
          return;
        }
        throw new Error(payload.error || "Declarația de retragere nu a putut fi trimisă.");
      }

      setCompletedAt(payload.request?.submittedAt ?? new Date().toISOString());
      toast({
        title: "Retragere transmisă",
        description: payload.message || "Confirmarea a fost trimisă pe e-mail.",
      });
    } catch (error) {
      toast({
        title: "Retragerea nu a fost trimisă",
        description: error instanceof Error ? error.message : "Încercați din nou.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">România · contract la distanță</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Retrageți-vă din contract aici</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Folosiți această funcție pentru a transmite online o declarație neechivocă de retragere pentru o comandă eligibilă din piața România.
          Confirmarea primirii, inclusiv conținutul declarației, data și ora transmiterii, este trimisă la adresa de e-mail a contului dvs.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Declarație online de retragere
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="withdrawal-order">Comanda</Label>
            <Select value={orderId} onValueChange={setOrderId} disabled={loading || eligibleOrders.length === 0}>
              <SelectTrigger id="withdrawal-order">
                <SelectValue placeholder={loading ? "Se încarcă..." : "Selectați comanda"} />
              </SelectTrigger>
              <SelectContent>
                {eligibleOrders.map((order) => (
                  <SelectItem key={order.id} value={order.id}>
                    #{order.orderNumber} · {order.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!loading && eligibleOrders.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nu există în acest moment o comandă România aflată în fereastra online de retragere.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="withdrawal-name">Numele consumatorului</Label>
            <Input
              id="withdrawal-name"
              value={consumerName}
              onChange={(event) => setConsumerName(event.target.value)}
              maxLength={200}
              autoComplete="name"
            />
          </div>

          <div className="space-y-2">
            <Label>Confirmarea va fi trimisă la</Label>
            <Input value={user?.email ?? ""} readOnly aria-readonly="true" />
          </div>

          <div className="rounded-lg border bg-muted/40 p-4 text-sm leading-6">
            <p className="font-semibold">Declarație</p>
            <p className="mt-1">„Mă retrag din acest contract la distanță.”</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Retragerea nu execută automat o rambursare. Returul bunurilor, rambursarea și eventualele excepții legale sunt procesate separat conform comenzii și legislației aplicabile.
            </p>
          </div>

          <label className="flex items-start gap-3 text-sm">
            <Checkbox checked={confirmed} onCheckedChange={(value) => setConfirmed(value === true)} />
            <span>Confirm că doresc să transmit această declarație de retragere pentru comanda selectată.</span>
          </label>

          <Button
            className="w-full"
            disabled={!selected || !consumerName.trim() || !user?.email || !confirmed || submitting || !!completedAt}
            onClick={() => { void submitWithdrawal(); }}
          >
            {completedAt ? "Retragere transmisă" : submitting ? "Se transmite..." : "Confirmați retragerea"}
          </Button>

          {completedAt ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              Declarația a fost primită la {new Date(completedAt).toLocaleString("ro-RO")}. Păstrați confirmarea primită pe e-mail.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <p className="text-xs leading-5 text-muted-foreground">
        Această funcție nu limitează alte drepturi obligatorii privind bunurile neconforme, reclamațiile, retururile sau remediile legale.
      </p>
    </div>
  );
};

export default BuyerWithdrawal;

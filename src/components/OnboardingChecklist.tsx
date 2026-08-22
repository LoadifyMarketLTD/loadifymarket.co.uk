import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { authorizedFetch } from "@/lib/authorizedFetch";
import { hasSellerAccess } from "@/lib/roleUtils";
import { useAuthStore } from "@/store";

interface WorkspaceReadiness {
  setupComplete: boolean;
  stripeReady: boolean;
  adminReviewPending: boolean;
  sellerActive: boolean;
}

interface WorkspaceStatus {
  sellerStatus: string;
  readiness: WorkspaceReadiness;
}

/**
 * Compact Seller Workspace readiness notice.
 *
 * Full workspace entry is already protected by RequireSeller.
 * This component surfaces only real readiness conditions using
 * the canonical seller-onboarding-status endpoint.
 *
 * It intentionally does NOT derive readiness from legacy concepts
 * such as obsolete service-era flags, product sharing, or browser-owned
 * completion flags.
 */
export function OnboardingChecklist() {
  const { user } = useAuthStore();

  const [status, setStatus] =
    useState<WorkspaceStatus | null>(null);

  const [verificationFailed, setVerificationFailed] =
    useState(false);

  useEffect(() => {
    if (!user || !hasSellerAccess(user)) return;

    let cancelled = false;

    const load = async () => {
      try {
        const response = await authorizedFetch(
          "/.netlify/functions/seller-onboarding-status",
          { method: "POST" },
        );

        const payload = await response
          .json()
          .catch(() => ({})) as WorkspaceStatus & {
            error?: string;
          };

        if (!response.ok) {
          throw new Error(
            payload.error ||
              "Unable to verify seller readiness"
          );
        }

        if (!cancelled) {
          setStatus(payload);
          setVerificationFailed(false);
        }
      } catch {
        if (!cancelled) {
          setStatus(null);
          setVerificationFailed(true);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user || !hasSellerAccess(user)) {
    return null;
  }

  if (verificationFailed) {
    return (
      <Link
        to="/onboarding"
        className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-amber-950 transition-colors hover:bg-amber-100"
      >
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />

        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold">
            Seller readiness could not be verified
          </p>

          <p className="text-[11px] text-amber-800">
            Review your seller setup before relying on
            payment availability.
          </p>
        </div>

        <ChevronRight className="h-4 w-4 shrink-0" />
      </Link>
    );
  }

  if (!status) {
    return null;
  }

  const readiness = status.readiness;

  const healthy =
    readiness.setupComplete &&
    readiness.stripeReady &&
    !readiness.adminReviewPending &&
    readiness.sellerActive;

  if (healthy) {
    return null;
  }

  let title = "Seller activation needs attention";
  let detail =
    `Current seller status: ${status.sellerStatus}.`;

  if (!readiness.setupComplete) {
    title = "Seller setup needs attention";
    detail =
      "Review the canonical seller setup steps and persisted account facts.";
  } else if (readiness.adminReviewPending) {
    title = "Loadify review is pending";
    detail =
      "Your marketplace setup is saved, but the required platform review is not complete.";
  } else if (!readiness.stripeReady) {
    title = "Payment readiness needs attention";
    detail =
      "Your Seller Workspace remains available, but Stripe charges or payouts are not currently ready.";
  }

  return (
    <Link
      to="/onboarding"
      className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-amber-950 transition-colors hover:bg-amber-100"
    >
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />

      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold">
          {title}
        </p>

        <p className="text-[11px] text-amber-800">
          {detail}
        </p>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0" />
    </Link>
  );
}

export default OnboardingChecklist;
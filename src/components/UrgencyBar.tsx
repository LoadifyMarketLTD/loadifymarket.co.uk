export default function UrgencyBar() {
  return (
    <div className="bg-emerald-500/15 border-y border-emerald-500/30 text-center py-2 text-emerald-300">
      {/* Short version on mobile to prevent 2-line wrap; full version on sm+ */}
      <span className="text-xs font-semibold sm:hidden">🚀 0% commission until 31 Aug 2026</span>
      <span className="hidden sm:inline text-sm font-medium">🚀 0% commission for early sellers — until 31 August 2026</span>
    </div>
  );
}

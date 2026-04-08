export default function UrgencyBar() {
  return (
    <div className="bg-green-500/10 border-y border-green-500/20 text-center py-2 text-green-400">
      {/* Short version on mobile to prevent 2-line wrap; full version on sm+ */}
      <span className="text-xs font-medium sm:hidden">🚀 0% commission until 31 Aug 2026</span>
      <span className="hidden sm:inline text-sm">🚀 0% commission for early sellers — until 31 August 2026</span>
    </div>
  );
}

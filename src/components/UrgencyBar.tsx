export default function UrgencyBar() {
  return (
    <div className="bg-[#0E1520] border-y border-[#D4AF37]/30 text-center py-2 text-[#D4AF37]">
      {/* Short version on mobile to prevent 2-line wrap; full version on sm+ */}
      <span className="text-xs font-semibold sm:hidden">0% Commission Until 31 December 2026</span>
      <span className="hidden sm:inline text-sm font-medium">0% Commission for early sellers — until 31 December 2026</span>
    </div>
  );
}

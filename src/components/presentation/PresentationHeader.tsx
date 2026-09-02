import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import logo from "@/assets/LOGO.png";

const navigation = [
  { label: "Platform", to: "/platform" },
  { label: "Buyers", to: "/buyers" },
  { label: "Sellers", to: "/sellers" },
  { label: "Business", to: "/business" },
  { label: "Technology", to: "/technology" },
  { label: "Partners", to: "/partners" },
  { label: "How It Works", to: "/how-it-works" },
  { label: "Trust", to: "/trust" },
] as const;

export default function PresentationHeader() {
  const [mobile, setMobile] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobile(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobile) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobile]);

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `text-[13px] font-bold transition ${isActive ? "text-[#1D57D8]" : "text-[#0A234F] hover:text-[#1D57D8]"}`;

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#0A234F]/10 bg-[#FCFBF8]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[82px] max-w-[1480px] items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-10 xl:gap-7">
        <Link to="/" className="mr-auto flex min-w-0 items-center" aria-label="Loadify home">
          <img src={logo} alt="Loadify Market" className="h-10 w-auto max-w-[138px] object-contain sm:h-11 sm:max-w-[170px]" />
        </Link>

        <nav className="hidden items-center gap-5 xl:flex 2xl:gap-6" aria-label="Corporate navigation">
          {navigation.map((item) => (
            <NavLink key={item.to} to={item.to} className={navClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 xl:flex">
          <Link to="/marketplace" className="rounded-lg border border-[#0A234F]/15 bg-white px-4 py-2.5 text-sm font-extrabold text-[#0A234F]">
            Marketplace
          </Link>
          <Link to="/login" className="px-3 py-2.5 text-sm font-bold text-[#0A234F]">
            Sign in
          </Link>
          <Link to="/register" className="rounded-lg bg-[#0A234F] px-4 py-2.5 text-sm font-extrabold text-white">
            Join Loadify
          </Link>
        </div>

        <Link
          to="/marketplace"
          className="hidden shrink-0 rounded-lg border border-[#0A234F]/15 bg-white px-3 py-2 text-xs font-extrabold text-[#0A234F] sm:inline-flex xl:hidden"
        >
          Marketplace
        </Link>

        <button
          type="button"
          onClick={() => setMobile((value) => !value)}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#0A234F]/15 bg-white text-[#0A234F] shadow-sm transition hover:bg-[#F8F7F4] xl:hidden"
          aria-label={mobile ? "Close Loadify navigation" : "Open Loadify navigation"}
          aria-expanded={mobile}
          aria-controls="loadify-mobile-navigation"
        >
          {mobile ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </div>

      {mobile && (
        <div id="loadify-mobile-navigation" className="xl:hidden">
          <button
            type="button"
            className="fixed inset-0 top-[82px] z-[-1] bg-[#0A234F]/25"
            aria-label="Close navigation"
            onClick={() => setMobile(false)}
          />
          <div className="max-h-[calc(100vh-82px)] overflow-y-auto border-t border-[#0A234F]/10 bg-[#FCFBF8] px-4 py-5 shadow-xl sm:px-6">
            <div className="mx-auto max-w-[1480px]">
              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#6B7280]">Explore Loadify</p>
              <nav className="grid gap-1 sm:grid-cols-2" aria-label="Mobile corporate navigation">
                {navigation.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `rounded-xl px-4 py-3.5 text-[15px] font-extrabold transition ${
                        isActive ? "bg-[#EEF3FF] text-[#1D57D8]" : "text-[#0A234F] hover:bg-white"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>

              <div className="mt-5 grid gap-2 border-t border-[#0A234F]/10 pt-5 sm:grid-cols-3">
                <Link to="/marketplace" className="rounded-xl bg-[#F5A300] px-4 py-3 text-center text-sm font-extrabold text-[#0A234F]">
                  Open Marketplace
                </Link>
                <Link to="/login" className="rounded-xl border border-[#0A234F]/15 bg-white px-4 py-3 text-center text-sm font-bold text-[#0A234F]">
                  Sign in
                </Link>
                <Link to="/register" className="rounded-xl bg-[#0A234F] px-4 py-3 text-center text-sm font-extrabold text-white">
                  Join Loadify
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

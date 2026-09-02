import { NavLink } from "react-router-dom";

export type SectionNavItem = {
  label: string;
  to: string;
};

export default function SectionNav({ title, items }: { title: string; items: readonly SectionNavItem[] }) {
  return (
    <div className="sticky top-[82px] z-40 border-b border-[#0A234F]/10 bg-[#FCFBF8]/96 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[58px] max-w-[1480px] items-center gap-7 overflow-x-auto px-5 sm:px-7 lg:px-10">
        <span className="shrink-0 border-r border-[#0A234F]/10 pr-7 text-[13px] font-black text-[#0A234F]">{title}</span>
        <nav className="flex min-w-max items-center gap-6" aria-label={`${title} section navigation`}>
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                `relative flex min-h-[58px] items-center text-[13px] font-bold transition ${
                  isActive ? "text-[#1D57D8] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[#F5A300]" : "text-[#526071] hover:text-[#0A234F]"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

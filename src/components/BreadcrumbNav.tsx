import { ChevronRight, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  showBack?: boolean;
  backLabel?: string;
  backTo?: string;
}

const BreadcrumbNav = ({ items, showBack = true, backLabel, backTo }: BreadcrumbNavProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  // On mobile we collapse middle items to avoid wrapping:
  // Show first item → … → last item if there are 3+ items.
  const hasCollapse = items.length >= 3;
  const firstItem = items[0];
  const lastItem = items[items.length - 1];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-3 sm:py-4 min-w-0">
      {showBack && (
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors sm:mr-4 shrink-0"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="truncate">{backLabel || "Back"}</span>
        </button>
      )}

      {/* Mobile: collapsed breadcrumb (first → … → last) */}
      {hasCollapse && (
        <nav aria-label="Breadcrumb" className="flex sm:hidden items-center gap-1 text-sm min-w-0">
          {firstItem.to ? (
            <Link
              to={firstItem.to}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              {firstItem.label}
            </Link>
          ) : (
            <span className="text-muted-foreground shrink-0">{firstItem.label}</span>
          )}
          <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0 mx-0.5" />
          <span className="text-muted-foreground/50 shrink-0">…</span>
          <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0 mx-0.5" />
          <span className="text-foreground font-medium truncate min-w-0">{lastItem.label}</span>
        </nav>
      )}

      {/* Desktop: full breadcrumb (always visible on sm+; also shown on mobile if ≤2 items) */}
      <nav
        aria-label="Breadcrumb"
        className={`${hasCollapse ? "hidden sm:flex" : "flex"} items-center gap-1.5 text-sm min-w-0 flex-wrap`}
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <span key={index} className="flex items-center gap-1.5 min-w-0">
              {index > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
              )}
              {isLast || !item.to ? (
                <span className="text-foreground font-medium truncate max-w-[160px] sm:max-w-[280px]">
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.to}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  {item.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>
    </div>
  );
};

export default BreadcrumbNav;

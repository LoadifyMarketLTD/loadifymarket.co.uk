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

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-4">
      {showBack && (
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mr-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel || "Back"}
        </button>
      )}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm flex-wrap">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <span key={index} className="flex items-center gap-1.5">
              {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />}
              {isLast || !item.to ? (
                <span className="text-foreground font-medium truncate max-w-[200px]">{item.label}</span>
              ) : (
                <Link
                  to={item.to}
                  className="text-muted-foreground hover:text-foreground transition-colors"
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

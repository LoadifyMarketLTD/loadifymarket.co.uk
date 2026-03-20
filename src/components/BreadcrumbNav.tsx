import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * BreadcrumbNav — renders a structured breadcrumb trail.
 * The last item is always treated as the current page (no link).
 *
 * Usage:
 *   <BreadcrumbNav items={[
 *     { label: 'Home', to: '/' },
 *     { label: 'Electronics', to: '/category/electronics' },
 *     { label: 'Product Name' },
 *   ]} />
 */
export default function BreadcrumbNav({ items, className = '' }: BreadcrumbNavProps) {
  if (!items.length) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-1 text-sm text-gray-500 flex-wrap ${className}`}
    >
      <ol className="flex items-center gap-1 flex-wrap list-none m-0 p-0">
        {/* Home icon shortcut */}
        <li className="flex items-center gap-1">
          <Link
            to="/"
            className="text-gray-400 hover:text-[#0A2239] transition-colors"
            aria-label="Home"
          >
            <Home className="h-3.5 w-3.5" />
          </Link>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" aria-hidden="true" />
              {isLast || !item.to ? (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={isLast ? 'text-gray-900 font-medium' : 'text-gray-500'}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.to}
                  className="text-gray-500 hover:text-[#0A2239] transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

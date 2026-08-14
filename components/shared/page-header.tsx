import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  breadcrumb?: React.ReactNode;
}

export function PageHeader({ title, description, actions, className, breadcrumb }: PageHeaderProps) {
  return (
    // Actions stack under the title on phones. Side-by-side they squeeze the
    // heading into an unreadable column, since the actions never shrink.
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-6",
        className
      )}
    >
      <div className="min-w-0">
        {breadcrumb && <div className="mb-1">{breadcrumb}</div>}
        <h1 className="text-2xl font-semibold text-[#0E0E0E] tracking-tight">{title}</h1>
        {description && <p className="text-sm text-[#6E665D] mt-1">{description}</p>}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap sm:flex-shrink-0">{actions}</div>
      )}
    </div>
  );
}

interface BreadcrumbProps {
  items: { label: string; href?: string }[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-[#6E665D]">
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-[#BDB6AD]">/</span>}
          {item.href ? (
            <a href={item.href} className="hover:text-[#0E0E0E] transition-colors">
              {item.label}
            </a>
          ) : (
            <span className="text-[#0E0E0E] font-semibold">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

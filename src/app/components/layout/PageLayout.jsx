import React from "react";

export function PageLayout({ title, subtitle, actions, children, className = "" }) {
  return (
    <div className={`p-4 sm:p-6 lg:p-8 min-h-full bg-muted ${className}`}>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-card-foreground break-words">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-1 text-sm sm:text-base">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2 items-center shrink-0">{actions}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

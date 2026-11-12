import React from 'react';
import { AdminTabs, AdminTabsProps } from './AdminTabs';

export interface AdminPageShellProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

/**
 * AdminPageShell - Master container establishing a single unified layout axis
 * for PageHeader, PageTabs, PageToolbar, and PageContent.
 * Guarantees identical left and right boundingClientRect across all 4 regions.
 */
export const AdminPageShell: React.FC<AdminPageShellProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`admin-page-shell w-full max-w-[1440px] mx-auto text-[#2C241E] box-border ${className}`}
      style={{ paddingLeft: 0, paddingRight: 0, marginLeft: 'auto', marginRight: 'auto' }}
      {...props}
    >
      {children}
    </div>
  );
};

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * PageHeader - Standardized page header with 4-6px eyebrow spacing
 * and 20px bottom spacing to PageTabs.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  subtitle,
  actions,
  className = '',
  ...props
}) => {
  return (
    <header
      className={`admin-page-header admin-page-heading w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5 box-border ${className}`}
      style={{ paddingLeft: 0, paddingRight: 0, marginLeft: 0, marginRight: 0 }}
      {...props}
    >
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <p className="admin-eyebrow text-[11px] font-bold text-[#8C7A6B] uppercase tracking-wider mb-1.5 leading-none">
            {eyebrow}
          </p>
        )}
        {typeof title === 'string' ? (
          <h1 className="admin-title text-2xl sm:text-[26px] font-bold text-[#2C241E] leading-tight m-0 tracking-tight">
            {title}
          </h1>
        ) : (
          title
        )}
        {subtitle && (
          <div className="admin-subtitle text-xs text-[#73675F] mt-1.5 leading-relaxed">
            {subtitle}
          </div>
        )}
      </div>
      {actions && (
        <div className="admin-toolbar-actions flex items-center gap-2 shrink-0 flex-wrap">
          {actions}
        </div>
      )}
    </header>
  );
};

/**
 * PageTabs - Re-export of unified AdminTabs with height 48px and 20px bottom margin.
 */
export const PageTabs: React.FC<AdminTabsProps> = (props) => {
  return <AdminTabs {...props} className={`admin-page-tabs ${props.className || ''}`} />;
};

export interface PageToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

/**
 * PageToolbar - Standardized filters and search bar container with 20px bottom spacing to PageContent.
 */
export const PageToolbar: React.FC<PageToolbarProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`admin-page-toolbar admin-toolbar w-full flex flex-wrap items-center justify-between gap-3 mb-5 box-border ${className}`}
      style={{ paddingLeft: 0, paddingRight: 0, marginLeft: 0, marginRight: 0 }}
      {...props}
    >
      {children}
    </div>
  );
};

export interface PageContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

/**
 * PageContent - Standardized content container strictly matching the shell axis.
 */
export const PageContent: React.FC<PageContentProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`admin-page-content w-full box-border ${className}`}
      style={{ paddingLeft: 0, paddingRight: 0, marginLeft: 0, marginRight: 0 }}
      {...props}
    >
      {children}
    </div>
  );
};

import React from 'react';
import { Link } from 'react-router-dom';

export interface AuthCardLayoutProps {
  badge?: string;
  badgeVariant?: 'blue' | 'slate' | 'amber';
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function AuthCardLayout({
  badge,
  badgeVariant = 'blue',
  title,
  subtitle,
  children,
  footer,
}: AuthCardLayoutProps) {
  const badgeClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    slate: 'bg-slate-900 text-white border-slate-800',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
  }[badgeVariant];

  return (
    <main className="min-h-screen bg-[#f0f4f8] flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-md">
        {/* Logo and Brand Header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-block group transition-transform hover:scale-105">
            <div className="text-3xl font-black text-[#0a2463] tracking-tight">
              <span className="block leading-none">SCHOOL</span>
              <span className="block leading-none text-sm tracking-[0.3em] font-extrabold text-blue-600">MART</span>
            </div>
          </Link>
          {badge && (
            <div className="mt-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest border shadow-xs ${badgeClasses}`}>
                {badge}
              </span>
            </div>
          )}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm w-full border border-gray-200/80 p-8 sm:p-10">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-1">{title}</h1>
          <p className="text-xs text-gray-500 font-medium mb-6 leading-relaxed">{subtitle}</p>

          {children}

          {footer && (
            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              {footer}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

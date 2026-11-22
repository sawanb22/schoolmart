import type { LucideIcon } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  count?: number;
  icon?: LucideIcon;
}

export interface TabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  className?: string;
}

export function Tabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  className,
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex items-center gap-1 border-b border-stone-200 overflow-x-auto no-scrollbar',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'inline-flex items-center gap-2 px-3.5 py-2.5 text-xs border-b-2 transition-all whitespace-nowrap -mb-px select-none outline-none',
              isActive
                ? 'border-[#1e3a8a] text-[#1e3a8a] font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300 font-medium'
            )}
          >
            {Icon ? (
              <Icon
                className={cn(
                  'w-4 h-4 shrink-0 transition-colors',
                  isActive ? 'text-[#1e3a8a]' : 'text-stone-400'
                )}
              />
            ) : null}
            <span>{tab.label}</span>
            {typeof tab.count === 'number' ? (
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight',
                  isActive
                    ? 'bg-blue-100 text-[#1e3a8a]'
                    : 'bg-stone-100 text-stone-600'
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

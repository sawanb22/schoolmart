import type { ChangeEvent } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
  className?: string;
  disabled?: boolean;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  onClear,
  className,
  disabled = false,
}: SearchInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
    }
    onChange('');
  };

  return (
    <div className={cn('relative flex items-center w-full max-w-sm', className)}>
      <Search className="absolute left-3 w-4 h-4 text-stone-400 pointer-events-none select-none" />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full pl-9 pr-8 py-2 rounded-lg border border-stone-200 bg-white text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] disabled:opacity-50 disabled:bg-stone-50 transition-all shadow-2xs"
      />
      {value ? (
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled}
          aria-label="Clear search input"
          className="absolute right-2.5 p-1 rounded-md text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors disabled:pointer-events-none"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      ) : null}
    </div>
  );
}

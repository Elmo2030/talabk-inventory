'use client';

import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = 'بحث...',
  className = '',
}: SearchBarProps) {
  return (
    <div className={`relative w-full max-w-md ${className}`}>
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full pr-10 pl-10 py-2 text-sm
          bg-white border border-[#E5E5EA] rounded-lg
          text-slate-900 placeholder:text-[#AEAEB2]
          hover:border-[#C6C6C8]
          focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-brand-600
          transition-colors
        "
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute left-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          aria-label="مسح البحث"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

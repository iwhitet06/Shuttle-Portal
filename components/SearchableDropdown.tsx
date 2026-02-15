import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';

interface SearchableDropdownProps {
  options: { id: string; name: string }[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  icon?: React.ReactNode;
  compact?: boolean;
}

export const SearchableDropdown: React.FC<SearchableDropdownProps> = ({ 
  options, 
  value, 
  onChange, 
  placeholder, 
  icon,
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));
  const selectedName = options.find(o => o.id === value)?.name;

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div 
        onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
        className={`w-full bg-white border transition group cursor-pointer flex items-center justify-between ${
            compact 
            ? 'px-3 py-2 border-slate-300 rounded-lg hover:border-blue-400' 
            : 'pl-10 pr-4 py-3 bg-slate-50 border-slate-200 rounded-xl hover:bg-white hover:border-blue-300'
        }`}
      >
        {icon && !compact && <div className="absolute left-3 text-slate-400 group-hover:text-blue-500 transition">{icon}</div>}
        <span className={`truncate mr-2 ${compact ? 'text-sm' : 'text-sm font-medium'} ${value && value !== 'ALL' && value !== '' ? 'text-slate-900' : 'text-slate-500'}`}>
          {selectedName || placeholder}
        </span>
        <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden max-h-60 flex flex-col animate-fadeIn">
          <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 text-slate-400 w-3 h-3" />
              <input
                type="text"
                autoFocus
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-blue-500 text-slate-800"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            {filtered.length === 0 && <div className="p-2 text-xs text-slate-400 text-center">No matches found</div>}
            {filtered.map(opt => (
              <div
                key={opt.id}
                onClick={() => { onChange(opt.id); setIsOpen(false); }}
                className={`px-3 py-2 text-sm rounded-md cursor-pointer transition ${value === opt.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                {opt.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
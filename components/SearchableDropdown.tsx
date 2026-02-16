import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check, Square, CheckSquare } from 'lucide-react';

interface SearchableDropdownProps {
  options: { id: string; name: string }[];
  value: string | string[]; // Can be single ID or array of IDs
  onChange: (val: any) => void; // Returns string or string[]
  placeholder: string;
  icon?: React.ReactNode;
  compact?: boolean;
  multiple?: boolean;
}

export const SearchableDropdown: React.FC<SearchableDropdownProps> = ({ 
  options, 
  value, 
  onChange, 
  placeholder, 
  icon,
  compact = false,
  multiple = false
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
  
  // Logic for display text
  let displayText = placeholder;
  let isValueSelected = false;

  if (multiple) {
      const valArray = Array.isArray(value) ? value : (value ? [value] : []);
      if (valArray.length > 0) {
          isValueSelected = true;
          if (valArray.length === 1) {
              displayText = options.find(o => o.id === valArray[0])?.name || placeholder;
          } else {
              displayText = `${valArray.length} Selected`;
          }
      }
  } else {
      const valStr = value as string;
      if (valStr && valStr !== 'ALL' && valStr !== '') {
          isValueSelected = true;
          displayText = options.find(o => o.id === valStr)?.name || placeholder;
      }
  }

  const handleSelect = (id: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (multiple) {
          const currentArray = Array.isArray(value) ? value : (value ? [value as string] : []);
          let newArray: string[];
          if (currentArray.includes(id)) {
              newArray = currentArray.filter(i => i !== id);
          } else {
              newArray = [...currentArray, id];
          }
          onChange(newArray);
      } else {
          onChange(id);
          setIsOpen(false);
      }
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div 
        onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
        className={`w-full bg-white dark:bg-slate-700/50 border dark:border-slate-600 transition group cursor-pointer flex items-center justify-between ${
            compact 
            ? 'px-3 py-2 border-slate-300 rounded-lg hover:border-blue-400 dark:hover:border-blue-500' 
            : 'pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl hover:bg-white dark:hover:bg-slate-700 hover:border-blue-300 dark:hover:border-blue-600'
        }`}
      >
        {icon && !compact && <div className="absolute left-3 text-slate-400 dark:text-slate-500 group-hover:text-blue-500 transition">{icon}</div>}
        <span className={`truncate mr-2 ${compact ? 'text-sm' : 'text-sm font-medium'} ${isValueSelected ? 'text-slate-900 dark:text-slate-50' : 'text-slate-500 dark:text-slate-400'}`}>
          {displayText}
        </span>
        <ChevronDown size={16} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden max-h-60 flex flex-col animate-fadeIn">
          <div className="p-2 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 text-slate-400 w-3 h-3" />
              <input
                type="text"
                autoFocus
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md text-xs outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            {filtered.length === 0 && <div className="p-2 text-xs text-slate-400 text-center">No matches found</div>}
            {filtered.map(opt => {
              let isSelected = false;
              if (multiple) {
                  const arr = Array.isArray(value) ? value : [];
                  isSelected = arr.includes(opt.id);
              } else {
                  isSelected = value === opt.id;
              }

              return (
                <div
                  key={opt.id}
                  onClick={(e) => handleSelect(opt.id, e)}
                  className={`px-3 py-2 text-sm rounded-md cursor-pointer transition flex items-center justify-between ${
                    isSelected && !multiple 
                    ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-medium' 
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="truncate">{opt.name}</span>
                  {multiple ? (
                      <div className={`ml-2 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-300 dark:text-slate-500'}`}>
                          {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                      </div>
                  ) : (
                      isSelected && <Check size={14} className="flex-shrink-0 ml-2" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
'use client';

import { useState, useEffect, useRef } from 'react';

interface SearchableDropdownProps {
  title: string;
  options: Array<{ value: string; label: string; count?: number }>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchableDropdown({ 
  title, 
  options, 
  value, 
  onChange, 
  placeholder = "Type to search...",
  className = ""
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle option selection
  const handleOptionToggle = (optionValue: string) => {
    const newSelected = new Set(selectedOptions);
    if (newSelected.has(optionValue)) {
      newSelected.delete(optionValue);
    } else {
      newSelected.add(optionValue);
    }
    setSelectedOptions(newSelected);
    onChange(Array.from(newSelected).join(','));
  };

  // Handle single selection (for non-multi-select dropdowns)
  const handleSingleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Initialize selected options from value
  useEffect(() => {
    if (value) {
      setSelectedOptions(new Set(value.split(',').filter(Boolean)));
    }
  }, [value]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
        {title}
      </label>
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-10 rounded-lg ring-1 ring-black/10 dark:ring-white/10 px-3 bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/40 flex items-center justify-between text-left"
      >
        <span className="truncate">
          {value ? (
            selectedOptions.size > 0 ? (
              selectedOptions.size === 1 ? 
                options.find(opt => opt.value === Array.from(selectedOptions)[0])?.label || value :
                `${selectedOptions.size} selected`
            ) : value
          ) : (
            <span className="text-gray-500 dark:text-gray-400">Select {title.toLowerCase()}...</span>
          )}
        </span>
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-hidden">
          {/* Search input */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <input
              type="text"
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500"
              autoFocus
            />
          </div>

          {/* Options list */}
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className="flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                  onClick={() => handleSingleSelect(option.value)}
                >
                  <div className="flex-1">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {option.label}
                    </div>
                    {option.count !== undefined && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {option.count} submissions
                      </div>
                    )}
                  </div>
                  {selectedOptions.has(option.value) && (
                    <svg className="w-4 h-4 text-sky-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              ))
            ) : (
              <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

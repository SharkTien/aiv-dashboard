"use client";
import { useEffect } from "react";

export type DatePreset = 'full_submissions' | 'this_week' | 'last_week' | 'last_7_days' | 'custom';

interface DateFilterProps {
  preset: DatePreset;
  setPreset: (preset: DatePreset) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  onApply?: () => void;
  showFullSubmissions?: boolean;
  className?: string;
  showApplyButton?: boolean;
}

export default function DateFilter({
  preset,
  setPreset,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  onApply,
  showFullSubmissions = true,
  className = "",
  showApplyButton = true
}: DateFilterProps) {
  
  // Auto-set date ranges based on preset
  useEffect(() => {
    const setWeekRange = (offsetWeeks: number) => {
      const now = new Date();
      const day = now.getDay();
      const mondayOffset = ((day + 6) % 7);
      const monday = new Date(now);
      monday.setDate(now.getDate() - mondayOffset - 7 * offsetWeeks);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      setStartDate(monday.toISOString().split('T')[0]);
      setEndDate(sunday.toISOString().split('T')[0]);
    };

    if (preset === 'full_submissions') {
      // Clear dates for full submissions - no date filtering
      setStartDate('');
      setEndDate('');
    } else if (preset === 'this_week') {
      setWeekRange(0);
    } else if (preset === 'last_week') {
      setWeekRange(1);
    } else if (preset === 'last_7_days') {
      const d = new Date();
      const s = new Date();
      s.setDate(d.getDate() - 6);
      setStartDate(s.toISOString().split('T')[0]);
      setEndDate(d.toISOString().split('T')[0]);
    }
  }, [preset, setStartDate, setEndDate]);

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
    // Auto-switch to custom when user manually selects a date
    if (preset === 'full_submissions') {
      setPreset('custom');
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
    // Auto-switch to custom when user manually selects a date
    if (preset === 'full_submissions') {
      setPreset('custom');
    }
  };

  return (
    <div className={`flex flex-wrap items-end gap-4 ${className}`}>
      <div>
        <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">Preset</label>
        <select 
          value={preset} 
          onChange={(e) => setPreset(e.target.value as DatePreset)} 
          className="h-10 rounded-md ring-1 ring-black/10 dark:ring-white/10 px-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          {showFullSubmissions && (
            <option value="full_submissions">All of this phase</option>
          )}
          <option value="this_week">This week (Mon-Sun)</option>
          <option value="last_week">Last week</option>
          <option value="last_7_days">Last 7 days</option>
          <option value="custom">Custom</option>
        </select>
      </div>
      
      <div>
        <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">Start date</label>
        <input 
          type="date" 
          value={startDate} 
          onChange={handleStartDateChange}
          className="h-10 rounded-md ring-1 ring-black/10 dark:ring-white/10 px-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" 
        />
      </div>
      
      <div>
        <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">End date</label>
        <input 
          type="date" 
          value={endDate} 
          onChange={handleEndDateChange}
          className="h-10 rounded-md ring-1 ring-black/10 dark:ring-white/10 px-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" 
        />
      </div>
      
      {showApplyButton && onApply && (
        <button 
          onClick={onApply} 
          className="h-10 px-4 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-sm"
        >
          Apply
        </button>
      )}
    </div>
  );
}

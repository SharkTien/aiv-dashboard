'use client';

import { useState, useEffect, useMemo } from 'react';

interface WeeklyData {
  week: number;
  yearWeek: string;
  date: string;
  submissions: number;
}

interface FormData {
  formId: number;
  formName: string;
  formCode: string;
  data: WeeklyData[];
}

interface WeeklySubmissionsData {
  formType: string;
  startWeek: string;
  weeksCount: number;
  startDate: string;
  endDate: string;
  forms: FormData[];
  total: WeeklyData[];
  aiAnalysis: string;
}

interface WeeklySubmissionsChartProps {
  formType: 'TMR' | 'oGV';
}

const colors = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // green
  '#F59E0B', // yellow
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
];

export default function WeeklySubmissionsChart({ formType }: WeeklySubmissionsChartProps) {
  const [data, setData] = useState<WeeklySubmissionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStartWeek, setCurrentStartWeek] = useState<string | null>(null);
  const [visibleForms, setVisibleForms] = useState<Set<number>>(new Set());
  const [showTotal, setShowTotal] = useState<boolean>(true);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [dataCache, setDataCache] = useState<Map<string, WeeklySubmissionsData>>(new Map());

  const loadData = async (startWeek?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        form_type: formType,
        weeks_count: '5'
      });
      
      if (startWeek) {
        params.set('start_week', startWeek);
      }

      const response = await fetch(`/api/dashboard/weekly-submissions?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      setData(result.data);
      setCurrentStartWeek(result.data.startWeek);
      
      // Initialize visible forms (all forms visible by default)
      if (result.data.forms.length > 0) {
        const allFormIds = new Set<number>(result.data.forms.map((form: any) => form.formId));
        setVisibleForms(allFormIds);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const loadDataSilently = async (startWeek?: string) => {
    try {
      const cacheKey = `${formType}-${startWeek || 'default'}`;
      
      // Check cache first
      if (dataCache.has(cacheKey)) {
        const cachedData = dataCache.get(cacheKey)!;
        setData(cachedData);
        setCurrentStartWeek(cachedData.startWeek);
        
        if (cachedData.forms.length > 0) {
          const allFormIds = new Set<number>(cachedData.forms.map((form: any) => form.formId));
          setVisibleForms(allFormIds);
        }
        return;
      }

      const params = new URLSearchParams({
        form_type: formType,
        weeks_count: '5'
      });
      
      if (startWeek) {
        params.set('start_week', startWeek);
      }

      const response = await fetch(`/api/dashboard/weekly-submissions?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      // Cache the data
      setDataCache(prev => new Map(prev).set(cacheKey, result.data));

      setData(result.data);
      setCurrentStartWeek(result.data.startWeek);
      
      // Initialize visible forms (all forms visible by default)
      if (result.data.forms.length > 0) {
        const allFormIds = new Set<number>(result.data.forms.map((form: any) => form.formId));
        setVisibleForms(allFormIds);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  useEffect(() => {
    loadData();
  }, [formType]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showDropdown && !target.closest('.dropdown-container')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handlePreviousWeek = () => {
    if (!data || isAnimating) return;
    
    setIsAnimating(true);
    
    const [year, week] = data.startWeek.split('-').map(Number);
    const newWeek = week - 1;
    let newWeekNum = newWeek;
    
    if (newWeek <= 0) {
      newWeekNum = 52; // Stay at week 52, don't change year
    }
    
    const newStartWeek = `${year}-${newWeekNum.toString().padStart(2, '0')}`;
    
    // Load data silently without showing loading state
    loadDataSilently(newStartWeek);
    
    // Reset animation state after a short delay
    setTimeout(() => {
      setIsAnimating(false);
    }, 200);
  };

  const handleNextWeek = () => {
    if (!data || isAnimating) return;
    
    setIsAnimating(true);
    
    const [year, week] = data.startWeek.split('-').map(Number);
    const newWeek = week + 1;
    let newWeekNum = newWeek;
    
    if (newWeek > 52) {
      newWeekNum = 1; // Stay at week 1, don't change year
    }
    
    const newStartWeek = `${year}-${newWeekNum.toString().padStart(2, '0')}`;
    
    // Load data silently without showing loading state
    loadDataSilently(newStartWeek);
    
    // Reset animation state after a short delay
    setTimeout(() => {
      setIsAnimating(false);
    }, 200);
  };

  const toggleFormVisibility = (formId: number) => {
    setVisibleForms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(formId)) {
        newSet.delete(formId);
      } else {
        newSet.add(formId);
      }
      return newSet;
    });
  };

  const toggleAllForms = () => {
    if (!data) return;
    
    const allFormIds = new Set(data.forms.map(form => form.formId));
    const allVisible = data.forms.every(form => visibleForms.has(form.formId));
    
    if (allVisible) {
      setVisibleForms(new Set());
    } else {
      setVisibleForms(allFormIds);
    }
  };

  const maxSubmissions = useMemo(() => {
    if (!data) return 1; // Prevent division by zero
    const visibleFormSubmissions = data.forms
      .filter(form => visibleForms.has(form.formId))
      .flatMap(form => form.data.map(week => week.submissions));
    const allSubmissions = [
      ...visibleFormSubmissions,
      ...(showTotal ? data.total.map(week => week.submissions) : [])
    ];
    const max = Math.max(...allSubmissions);
    return max > 0 ? max : 1; // Ensure minimum value of 1
  }, [data, visibleForms, showTotal]);

  const formatWeekLabel = (weekData: WeeklyData) => {
    const date = new Date(weekData.date);
    return `Week ${weekData.week}\n${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  const getWeekDateRange = (week: number) => {
    if (!data) return '';
    
    // Calculate the start date of the week
    const startDate = new Date(data.startDate);
    const daysToAdd = (week - 1) * 7;
    startDate.setDate(startDate.getDate() + daysToAdd);
    
    // Calculate the end date (6 days later)
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    
    return `${startDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })} - ${endDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}`;
  };

  const createSmoothPath = (points: string) => {
    const pointArray = points.split(' ').map(point => {
      const [x, y] = point.split(',').map(Number);
      return { x, y };
    });

    if (pointArray.length < 2) return '';

    let path = `M ${pointArray[0].x} ${pointArray[0].y}`;
    
    for (let i = 1; i < pointArray.length; i++) {
      const prev = pointArray[i - 1];
      const curr = pointArray[i];
      const next = pointArray[i + 1];
      
      if (next) {
        // Use quadratic curve for smooth transitions
        const cp1x = prev.x + (curr.x - prev.x) * 0.5;
        const cp1y = prev.y;
        const cp2x = curr.x - (next.x - curr.x) * 0.5;
        const cp2y = curr.y;
        
        path += ` Q ${cp1x} ${cp1y} ${curr.x} ${curr.y}`;
      } else {
        // Last point
        path += ` L ${curr.x} ${curr.y}`;
      }
    }
    
    return path;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading weekly submissions data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center py-8">
          <div className="text-red-600 dark:text-red-400 mb-2">Error loading data</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">{error}</div>
          <button 
            onClick={() => loadData()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.forms.length === 0) {
  return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center py-8">
          <div className="text-gray-600 dark:text-gray-400">No {formType} forms found</div>
          <div className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            Create some forms to see weekly submission trends
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Chart Section */}
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {formType} Weekly Submissions Trend
        </h3>
        
        {/* Navigation Buttons */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={handlePreviousWeek}
            disabled={isAnimating}
            className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            ← Previous
          </button>
          <button
            onClick={handleNextWeek}
            disabled={isAnimating}
            className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            Next →
          </button>
        </div>
      </div>

        {/* Form Visibility Controls */}
        <div className="mb-6 flex items-center gap-4">
          <div className="relative dropdown-container">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Forms
            </button>
            
            {showDropdown && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-10">
                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">Show/Hide Forms</h4>
                    <button
                      onClick={toggleAllForms}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      {data.forms.every(form => visibleForms.has(form.formId)) ? 'Hide All' : 'Show All'}
                    </button>
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  {data.forms.map((form, index) => (
                    <label key={form.formId} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visibleForms.has(form.formId)}
                        onChange={() => toggleFormVisibility(form.formId)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: colors[index % colors.length] }}
                        ></div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {form.formName}
                        </span>
                      </div>
                    </label>
                  ))}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showTotal}
                      onChange={() => setShowTotal(!showTotal)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-gray-500 border-dashed"></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Total
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chart - Full Width */}
        <div className="w-full mb-6">
            <div className="h-80 w-full">
              <svg viewBox="0 0 800 320" className="w-full h-full transition-all duration-500 ease-in-out">
              {/* SVG Filters for smooth curves */}
              <defs>
                <filter id="smooth" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="0.5"/>
                </filter>
              </defs>
              {/* Grid lines */}
                {[0, 1, 2, 3, 4].map(i => (
                  <g key={i}>
                <line
                      x1="60"
                      y1={60 + (i * 60)}
                      x2="740"
                      y2={60 + (i * 60)}
                  stroke="currentColor"
                      strokeWidth="1"
                  className="text-gray-200 dark:text-gray-700"
                />
                    <text
                      x="50"
                      y={65 + (i * 60)}
                      textAnchor="end"
                      className="text-xs fill-gray-500 dark:fill-gray-400"
                    >
                      {Math.round(maxSubmissions * (1 - i * 0.25))}
                    </text>
                  </g>
              ))}

              {/* Week labels */}
                {data.total.map((week, index) => (
                  <g key={week.week}>
                    <line
                      x1={120 + (index * 140)}
                      y1="60"
                      x2={120 + (index * 140)}
                      y2="300"
                      stroke="currentColor"
                      strokeWidth="1"
                      className="text-gray-200 dark:text-gray-700"
                    />
                    <text
                      x={120 + (index * 140)}
                      y="315"
                      textAnchor="middle"
                      className="text-xs fill-gray-500 dark:fill-gray-400"
                    >
                      {formatWeekLabel(week).split('\n')[0]}
                    </text>
                <text
                      x={120 + (index * 140)}
                      y="330"
                  textAnchor="middle"
                  className="text-xs fill-gray-500 dark:fill-gray-400"
                >
                      {formatWeekLabel(week).split('\n')[1]}
                </text>
                  </g>
              ))}

              {/* Chart lines */}
                {data.forms
                  .filter(form => visibleForms.has(form.formId))
                  .map((form, formIndex) => {
                  const points = form.data.map((week, weekIndex) => {
                    const x = 120 + (weekIndex * 140);
                    const y = 300 - ((week.submissions / maxSubmissions) * 240);
                    return `${x},${isNaN(y) ? 300 : y}`;
                  }).join(' ');

                return (
                  <g key={form.formId}>
                    {/* Line */}
                    <path
                        d={createSmoothPath(points)}
                      fill="none"
                        stroke={colors[formIndex % colors.length]}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="transition-all duration-500 ease-in-out"
                    />
                    {/* Points */}
                      {form.data.map((week, weekIndex) => {
                        const x = 120 + (weekIndex * 140);
                        const y = 300 - ((week.submissions / maxSubmissions) * 240);
                        return (
                      <circle
                            key={`${form.formId}-${week.week}`}
                            cx={x}
                            cy={isNaN(y) ? 300 : y}
                        r="4"
                        fill={colors[formIndex % colors.length]}
                        stroke="white"
                        strokeWidth="2"
                        className="transition-all duration-500 ease-in-out"
                      />
                        );
                      })}
                  </g>
                );
              })}

                {/* Total line */}
                {showTotal && (
                  <g>
                    <path
                      d={createSmoothPath(data.total.map((week, weekIndex) => {
                        const x = 120 + (weekIndex * 140);
                        const y = 300 - ((week.submissions / maxSubmissions) * 240);
                        return `${x},${isNaN(y) ? 300 : y}`;
                      }).join(' '))}
                      fill="none"
                      stroke="#374151"
                      strokeWidth="4"
                      strokeDasharray="8,4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-all duration-500 ease-in-out"
                    />
                    {data.total.map((week, weekIndex) => {
                      const x = 120 + (weekIndex * 140);
                      const y = 300 - ((week.submissions / maxSubmissions) * 240);
                      return (
                        <circle
                          key={`total-${week.week}`}
                          cx={x}
                          cy={isNaN(y) ? 300 : y}
                          r="5"
                          fill="#374151"
                          stroke="white"
                          strokeWidth="2"
                          className="transition-all duration-500 ease-in-out"
                        />
                      );
                    })}
                  </g>
                )}
            </svg>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4">
              {data.forms
                .filter(form => visibleForms.has(form.formId))
                .map((form, index) => (
                <div key={form.formId} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: colors[index % colors.length] }}
                  ></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{form.formName}</span>
                </div>
              ))}
              {showTotal && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-gray-500 border-dashed"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total</span>
                </div>
              )}
            </div>
        </div>

        {/* Data Table - Below Chart */}
        <div className="w-full">
          <div className="overflow-x-auto">
            <table className="w-full text-sm transition-all duration-500 ease-in-out">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Form</th>
                  {data.total.map(week => (
                    <th key={week.week} className="text-center py-3 px-2 font-medium text-gray-900 dark:text-white">
                      W{week.week}
                    </th>
                  ))}
                  <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.forms
                  .filter(form => visibleForms.has(form.formId))
                  .map((form, index) => (
                  <tr key={form.formId} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-3 px-4 text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: colors[index % colors.length] }}
                        ></div>
                        <span className="truncate max-w-[200px]" title={form.formName}>
                          {form.formName}
                        </span>
                      </div>
                    </td>
                    {form.data.map(week => (
                      <td key={week.week} className="text-center py-3 px-2 text-gray-600 dark:text-gray-400">
                        {week.submissions}
                      </td>
                    ))}
                    <td className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">
                      {form.data.reduce((sum, week) => sum + week.submissions, 0)}
                    </td>
                  </tr>
                ))}
                {showTotal && (
                  <tr className="border-t-2 border-gray-300 dark:border-gray-600 font-semibold bg-gray-50 dark:bg-gray-800/50">
                    <td className="py-3 px-4 text-gray-900 dark:text-white">Total</td>
                    {data.total.map(week => (
                      <td key={week.week} className="text-center py-3 px-2 text-gray-900 dark:text-white">
                        {week.submissions}
                      </td>
                    ))}
                    <td className="text-center py-3 px-4 text-gray-900 dark:text-white">
                      {data.total.reduce((sum, week) => sum + week.submissions, 0)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Week Date Ranges */}
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Week Date Ranges</h5>
            <div className="grid grid-cols-5 gap-4 text-xs">
              {data.total.map(week => (
                <div key={week.week} className="text-center">
                  <div className="font-medium text-gray-900 dark:text-white">W{week.week}</div>
                  <div className="text-gray-600 dark:text-gray-400 mt-1">
                    {getWeekDateRange(week.week)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI Analysis */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">AI Analysis</h4>
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-mono bg-gray-50 dark:bg-gray-900 p-4 rounded-md">
            {data.aiAnalysis}
          </pre>
        </div>
        </div>
    </div>
  );
}

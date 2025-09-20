"use client";

import { useState, useEffect, useRef, useMemo } from "react";

interface FormTrackingTableProps {
  links: Array<{
    id: number;
    entity_name: string;
    campaign_name: string;
    campaign_code: string;
    source_name: string;
    source_code: string;
    source_platform: string;
    medium_name: string;
    medium_code: string;
    utm_name: string;
    custom_name: string | null;
    form_type: string;
    form_id: number;
    form_name: string;
    dailySubmissions: Record<string, { total: number; unique: number }>;
  }>;
  allDates: string[];
  dayTotalSubmissions: Record<string, number>;
  selectedEntity: string;
  isAdmin: boolean;
  entities: Array<{ entity_id: number; name: string; type?: string }>;
}

export default function FormTrackingTable({ 
  links, 
  allDates, 
  dayTotalSubmissions, 
  selectedEntity, 
  isAdmin, 
  entities 
}: FormTrackingTableProps) {
  const [sortDate, setSortDate] = useState<string | null>(null);
  const [sortMetric, setSortMetric] = useState<'total' | 'unique'>('total');
  const [sortByTotal, setSortByTotal] = useState<boolean>(false);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [anchorDate, setAnchorDate] = useState<string | null>(null);
  const [showPercent, setShowPercent] = useState<boolean>(false);
  const [compactMode, setCompactMode] = useState<boolean>(false);
  const [onlyNonZero, setOnlyNonZero] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [initialScrollDone, setInitialScrollDone] = useState(false);

  // Normalize date format
  const normalizeDate = (dateStr: string) => {
    return new Date(dateStr).toISOString().split('T')[0];
  };

  // Calculate per-link data
  const perLink = useMemo(() => {
    return links.map(link => {
      const rows = allDates.map(date => {
        const submissions = link.dailySubmissions[date] || { total: 0, unique: 0 };
        return {
          date,
          total: submissions.total,
          unique: submissions.unique
        };
      });

      const totalSubmissions = rows.reduce((sum, r) => sum + r.total, 0);
      const totalUnique = rows.reduce((sum, r) => sum + r.unique, 0);

      return {
        ...link,
        rows,
        totalSubmissions,
        totalUnique
      };
    });
  }, [links, allDates]);

  // Generate full date range for display
  const generateFullDateRange = (start: string, end: string) => {
    const dates: string[] = [];
    const current = new Date(start);
    const endDate = new Date(end);
    
    while (current <= endDate) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  // Auto-set latest day as default sort and scroll to right
  useEffect(() => {
    if (allDates.length && !sortDate) {
      setSortDate(allDates[allDates.length - 1]);
      setAnchorDate(allDates[allDates.length - 1]);
    }
    if (scrollRef.current && !initialScrollDone) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
      setInitialScrollDone(true);
    }
  }, [allDates, sortDate, initialScrollDone]);

  // Sort links based on selected date and metric or total
  const sortedPerLink = useMemo(() => {
    if (sortByTotal) {
      return [...perLink].sort((a, b) => {
        const aTotal = a.totalSubmissions || 0;
        const bTotal = b.totalSubmissions || 0;
        return bTotal - aTotal;
      });
    }
    
    if (!sortDate) return perLink;
    
    return [...perLink].sort((a, b) => {
      const aRow = a.rows.find(r => r.date === sortDate);
      const bRow = b.rows.find(r => r.date === sortDate);
      
      const aValue = aRow ? aRow[sortMetric] : 0;
      const bValue = bRow ? bRow[sortMetric] : 0;
      
      return bValue - aValue;
    });
  }, [perLink, sortDate, sortMetric, sortByTotal]);

  // Handle date click for sorting
  const handleDateClick = (date: string, metric: 'total' | 'unique') => {
    if (sortDate === date && sortMetric === metric) {
      setSortDate(null);
      setSortMetric('total');
    } else {
      setSortDate(date);
      setSortMetric(metric);
    }
    setSortByTotal(false); // Reset total sort when sorting by date
  };

  // Handle total column click for sorting
  const handleTotalClick = () => {
    setSortByTotal(!sortByTotal);
    setSortDate(null); // Reset date sort when sorting by total
    setSortMetric('total');
  };

  // Handle multi-date selection
  const handleDateSelection = (date: string, event: React.MouseEvent) => {
    event.preventDefault();
    
    if (event.ctrlKey || event.metaKey) {
      // Toggle individual date
      setSelectedDates(prev => 
        prev.includes(date) 
          ? prev.filter(d => d !== date)
          : [...prev, date]
      );
    } else if (event.shiftKey && anchorDate) {
      // Select range
      const anchorIndex = allDates.indexOf(anchorDate);
      const clickIndex = allDates.indexOf(date);
      const start = Math.min(anchorIndex, clickIndex);
      const end = Math.max(anchorIndex, clickIndex);
      setSelectedDates(allDates.slice(start, end + 1));
    } else {
      // Single selection
      setSelectedDates([date]);
      setAnchorDate(date);
    }
  };

  // Get active dates for filtering
  const activeDates = selectedDates.length > 0 ? selectedDates : allDates;

  // Filter links based on onlyNonZero
  const filteredLinks = useMemo(() => {
    if (!onlyNonZero || !activeDates.length) return sortedPerLink;
    return sortedPerLink.filter(({ rows }) => {
      let totalSubmissionsInSelectedDates = 0;
      activeDates.forEach(d => {
        const v = rows.find(r => r.date === d);
        totalSubmissionsInSelectedDates += v?.total || 0;
      });
      return totalSubmissionsInSelectedDates > 0;
    });
  }, [sortedPerLink, onlyNonZero, activeDates]);

  // Heatmap coloring function
  const getHeatmapColor = (value: number, maxValue: number) => {
    if (value === 0) return { backgroundColor: 'transparent' };
    const intensity = Math.min(value / maxValue, 1);
    const opacity = 0.1 + (intensity * 0.7);
    return { backgroundColor: `rgba(59, 130, 246, ${opacity})` };
  };

  // Get max value for heatmap scaling
  const maxSubmissions = useMemo(() => {
    return Math.max(
      ...filteredLinks.flatMap(link => 
        link.rows.map(row => row.unique)
      )
    );
  }, [filteredLinks]);

  // Build density table grouped by Campaign/Medium/Source
  const densityRows = useMemo(() => {
    type Row = { label: string; campaign: string; medium: string; source: string; totals: number; byDate: Record<string, number> };
    const map = new Map<string, Row>();
    const safe = (v: any) => String(v ?? '').trim() || 'Unknown';
    allDates.forEach(d => { /* ensure column existence later */ });
    links.forEach(link => {
      const campaign = safe(link.campaign_name);
      const medium = safe(link.medium_name);
      const source = safe(link.source_name);
      const key = `${campaign}|||${medium}|||${source}`;
      if (!map.has(key)) {
        const base: Record<string, number> = {};
        allDates.forEach(d => { base[d] = 0; });
        map.set(key, {
          label: `${campaign} / ${medium} / ${source}`,
          campaign, medium, source,
          totals: 0,
          byDate: base
        });
      }
      const row = map.get(key)!;
      allDates.forEach(d => {
        const v = link.dailySubmissions[d]?.total || 0;
        if (v) {
          row.byDate[d] = (row.byDate[d] || 0) + v;
          row.totals += v;
        }
      });
    });
    // Sort by totals desc
    return Array.from(map.values()).sort((a, b) => b.totals - a.totals);
  }, [links, allDates]);

  const densityMax = useMemo(() => {
    return Math.max(1, ...densityRows.flatMap(r => allDates.map(d => r.byDate[d] || 0)));
  }, [densityRows, allDates]);

  const densityBg = (value: number) => {
    const ratio = Math.min(1, (value || 0) / (densityMax || 1));
    const alpha = value === 0 ? 0 : 0.12 + 0.75 * ratio;
    return { backgroundColor: `rgba(16, 185, 129, ${alpha.toFixed(3)})` }; // emerald tone
  };

  // Export CSV
  const exportCsv = () => {
    const headers = ['UTM', 'Campaign', 'Medium', 'Source', 'Form', ...allDates.flatMap(d => [`${d} (Total)`, `${d} (Unique)`]), 'Total Submissions', 'Total Unique'];
    const rows = filteredLinks.map(link => [
      link.custom_name || link.utm_name || 'Unnamed',
      link.campaign_name,
      link.medium_name,
      link.source_name,
      link.form_name,
      ...link.rows.flatMap(row => [row.total, row.unique]),
      link.totalSubmissions,
      link.totalUnique
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `form-tracking-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Quick range buttons
  const quickRanges = [
    { label: 'Last 7', days: 7 },
    { label: 'Last 14', days: 14 },
    { label: 'Last 30', days: 30 },
    { label: 'Last 60', days: 60 },
    { label: 'Last 90', days: 90 }
  ];

  const setQuickRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setSelectedDates(generateFullDateRange(start.toISOString().split('T')[0], end.toISOString().split('T')[0]));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Form Tracking by UTM Link</h3>
        
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Show percentages:</label>
            <input
              type="checkbox"
              checked={showPercent}
              onChange={(e) => setShowPercent(e.target.checked)}
              className="rounded"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Compact mode:</label>
            <input
              type="checkbox"
              checked={compactMode}
              onChange={(e) => setCompactMode(e.target.checked)}
              className="rounded"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Only rows with submissions &gt; 0:</label>
            <input
              type="checkbox"
              checked={onlyNonZero}
              onChange={(e) => setOnlyNonZero(e.target.checked)}
              className="rounded"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Quick ranges:</span>
            {quickRanges.map(range => (
              <button
                key={range.label}
                onClick={() => setQuickRange(range.days)}
                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                {range.label}
              </button>
            ))}
            <button
              onClick={() => setSelectedDates(allDates.slice(0, 1))}
              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              ⇤ Start
            </button>
            <button
              onClick={() => setSelectedDates(allDates.slice(-1))}
              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              End ⇥
            </button>
          </div>
          
          <button
            onClick={exportCsv}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto w-full pb-1" ref={scrollRef}>
        <table className="min-w-max w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="sticky left-0 z-20 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-left font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600" style={{ width: '200px', minWidth: '200px' }}>UTM</th>
              <th className="sticky left-[200px] z-20 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-left font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600" style={{ width: '150px', minWidth: '150px' }}>Campaign</th>
              <th className="sticky left-[350px] z-20 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-left font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600" style={{ width: '120px', minWidth: '120px' }}>Medium</th>
              <th className="sticky left-[470px] z-20 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-left font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600" style={{ width: '150px', minWidth: '150px' }}>Source</th>
              <th 
                className={`sticky left-[620px] z-20 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-center font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 ${
                  sortByTotal ? 'bg-blue-100 dark:bg-blue-900' : ''
                }`} 
                style={{ width: '120px', minWidth: '120px' }}
                onClick={handleTotalClick}
                title="Sort by Total"
              >
                Total {sortByTotal ? '↓' : ''}
              </th>
              {allDates.map(date => (
                <th key={date} className="px-2 py-2 text-center font-semibold text-gray-900 dark:text-white min-w-[80px]">
                  <div className="space-y-1">
                    <div className="text-xs">{new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleDateClick(date, 'total')}
                        className={`px-1 py-0.5 text-xs rounded ${
                          sortDate === date && sortMetric === 'total'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                        }`}
                      >
                        T
                      </button>
                      {!compactMode && (
                        <button
                          onClick={() => handleDateClick(date, 'unique')}
                          className={`px-1 py-0.5 text-xs rounded ${
                            sortDate === date && sortMetric === 'unique'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                          }`}
                        >
                          U
                        </button>
                      )}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* TOTALS Row */}
            <tr className="bg-gray-100 dark:bg-gray-700 font-semibold">
              <td className="sticky left-0 z-10 bg-gray-100 dark:bg-gray-700 px-3 py-2 border-r border-gray-200 dark:border-gray-600">TOTALS</td>
              <td className="sticky left-[200px] z-10 bg-gray-100 dark:bg-gray-700 px-3 py-2 border-r border-gray-200 dark:border-gray-600"></td>
              <td className="sticky left-[350px] z-10 bg-gray-100 dark:bg-gray-700 px-3 py-2 border-r border-gray-200 dark:border-gray-600"></td>
              <td className="sticky left-[470px] z-10 bg-gray-100 dark:bg-gray-700 px-3 py-2 border-r border-gray-200 dark:border-gray-600"></td>
              <td className="sticky left-[620px] z-10 bg-gray-100 dark:bg-gray-700 px-3 py-2 border-r border-gray-200 dark:border-gray-600">
                <div className="space-y-1 text-center">
                  <div className="font-semibold">
                    {filteredLinks.reduce((sum, link) => sum + link.totalUnique, 0)}
                  </div>
                </div>
              </td>
              {allDates.map(date => {
                const total = dayTotalSubmissions[date] || 0;
                const dayUnique = filteredLinks.reduce((sum, link) => {
                  const row = link.rows.find(r => r.date === date);
                  return sum + (row?.unique || 0);
                }, 0);
                
                return (
                  <td key={date} className="text-center px-2 py-1">
                    <div className="space-y-1">
                      <div className="font-semibold">{dayUnique}</div>
                    </div>
                  </td>
                );
              })}
            </tr>
            
            {/* Data Rows */}
            {filteredLinks.map(link => (
              <tr key={link.id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-3 py-2 border-r border-gray-200 dark:border-gray-600 font-medium">
                  {link.custom_name || link.utm_name || 'Unnamed'}
                </td>
                <td className="sticky left-[200px] z-10 bg-white dark:bg-gray-800 px-3 py-2 border-r border-gray-200 dark:border-gray-600">
                  {link.campaign_name}
                </td>
                <td className="sticky left-[350px] z-10 bg-white dark:bg-gray-800 px-3 py-2 border-r border-gray-200 dark:border-gray-600">
                  {link.medium_name}
                </td>
                <td className="sticky left-[470px] z-10 bg-white dark:bg-gray-800 px-3 py-2 border-r border-gray-200 dark:border-gray-600">
                  {link.source_name}
                </td>
                <td className="sticky left-[620px] z-10 bg-white dark:bg-gray-800 px-3 py-2 border-r border-gray-200 dark:border-gray-600 text-center font-semibold">
                <div className="space-y-1">
                    <div className="font-semibold">{link.totalUnique || 0}</div>
                  </div>
                </td>
                {link.rows.map(row => {
                  const dayUniqueTotal = dayTotalSubmissions[row.date] || 0;
                  const uniquePercent = dayUniqueTotal > 0 ? ((row.unique / dayUniqueTotal) * 100).toFixed(1) : '0.0';
                  
                  return (
                    <td 
                      key={row.date} 
                      className="text-center px-2 py-1 cursor-pointer"
                      onClick={(e) => handleDateSelection(row.date, e)}
                      style={getHeatmapColor(row.unique, maxSubmissions)}
                    >
                      <div className="space-y-1">
                        <div className="font-medium">
                          {showPercent ? `${uniquePercent}%` : row.unique}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

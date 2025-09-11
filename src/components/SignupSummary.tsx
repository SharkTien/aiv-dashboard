'use client';

import { useState, useEffect } from 'react';

interface SummaryRow {
  entity: string;
  entity_id: number;
  goal: number;
  total: number;
  msu: number;
  yourUtm: number;
  emtPlusOrganic: number;
  otherSource: number;
  notFound: number;
}

interface EntityStats {
  entity_id: number;
  entity_name: string;
  goal: number;
  sus: number;
  msus: number;
  sus_utm_source: number;
  emt_plus_organic: number;
  other_source: number;
  progress: number;
  msu_percentage: number;
  msu_utm_percentage: number;
}

interface NationalSummary {
  label: string;
  count: number;
  goal: number;
  percentage: number;
  msu: number;
  yourUtm: number;
  emtPlusOrganic: number;
  otherSource: number;
}

interface SignupSummaryProps {
  className?: string;
  formId?: number | null;
  formType?: 'oGV' | 'TMR' | null;
  startDate?: string;
  endDate?: string;
}

export default function SignupSummary({ className = '', formId, formType, startDate, endDate }: SignupSummaryProps) {
  const [localSummary, setLocalSummary] = useState<SummaryRow[]>([]);
  const [localTotals, setLocalTotals] = useState<SummaryRow | null>(null);
  const [nationalSummary, setNationalSummary] = useState<NationalSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [comparePhaseFilter, setComparePhaseFilter] = useState<string>('');
  const [summarySort, setSummarySort] = useState<{ column: 'msu' | 'total' | null; direction: 'asc' | 'desc' }>({ column: null, direction: 'desc' });
  const [availableForms, setAvailableForms] = useState<Array<{id: number, name: string, code: string}>>([]);
  const [compareData, setCompareData] = useState<any>(null);

  // Helper functions for calculations
  const calculateProgress = (total: number, goal: number) => {
    if (goal === 0) return 0;
    return (total / goal) * 100;
  };

  const calculatePercentage = (numerator: number, denominator: number) => {
    if (denominator === 0) return 0;
    return (numerator / denominator) * 100;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const getCompareMsus = (entityId: number) => {
    if (!compareData || !compareData.localMsus) {
      return 0;
    }
    // Handle both Map and object formats (Map gets serialized to object over HTTP)
    if (compareData.localMsus instanceof Map) {
      return compareData.localMsus.get(entityId) || 0;
    } else if (typeof compareData.localMsus === 'object') {
      return compareData.localMsus[entityId] || 0;
    }
    return 0;
  };

  const calculateGrowth = (currentMsus: number, compareMsus: number) => {
    if (compareMsus === 0) return currentMsus > 0 ? 100 : 0;
    return ((currentMsus - compareMsus) / compareMsus) * 100;
  };

  const getTotalCompareMsus = () => {
    if (!compareData || !compareData.localMsus) return 0;
    if (compareData.localMsus instanceof Map) {
      return Array.from(compareData.localMsus.values()).reduce((sum: number, val: any) => sum + (typeof val === 'number' ? val : 0), 0);
    } else if (typeof compareData.localMsus === 'object') {
      return Object.values(compareData.localMsus).reduce((sum: number, val: any) => sum + (typeof val === 'number' ? val : 0), 0);
    }
    return 0;
  };

  const toggleSummarySort = (column: 'msu' | 'total') => {
    setSummarySort(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const sortedLocalSummary = [...localSummary].sort((a, b) => {
    if (!summarySort.column) return 0;
    
    const aValue = summarySort.column === 'msu' ? a.msu : a.total;
    const bValue = summarySort.column === 'msu' ? b.msu : b.total;
    
    return summarySort.direction === 'asc' ? aValue - bValue : bValue - aValue;
  });

  useEffect(() => {
    if (formId && formType) {
      loadAvailableForms();
    }
  }, [formId, formType]);

  useEffect(() => {
    if (formId) {
      loadSignupData();
    }
  }, [formId, comparePhaseFilter, startDate, endDate]);

  const loadAvailableForms = async () => {
    if (!formType) return;
    
    try {
      // Load both oGV and TMR forms to get all available forms
      const [ogvResponse, tmrResponse] = await Promise.all([
        fetch('/api/dashboard/ogv-forms'),
        fetch('/api/dashboard/tmr-forms')
      ]);
      
      const [ogvResult, tmrResult] = await Promise.all([
        ogvResponse.json(),
        tmrResponse.json()
      ]);
      
      let allForms: Array<{id: number, name: string, code: string, type: string}> = [];
      
      if (ogvResult.success) {
        allForms = [...allForms, ...ogvResult.data.map((form: any) => ({...form, type: 'oGV'}))];
      }
      
      if (tmrResult.success) {
        allForms = [...allForms, ...tmrResult.data.map((form: any) => ({...form, type: 'TMR'}))];
      }
      
      // Filter out the current form and only show forms of the same type
      const filteredForms = allForms.filter((form: any) => 
        form.id !== formId && form.type === formType
      );
      
      setAvailableForms(filteredForms);
    } catch (error) {
      console.error('Error loading available forms:', error);
    }
  };

  const loadSignupData = async () => {
    if (!formId) return;
    
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append('formId', formId.toString());
      if (comparePhaseFilter) {
        params.append('compare', comparePhaseFilter);
      }
      if (startDate && endDate) {
        params.append('start_date', startDate);
        params.append('end_date', endDate);
      }
      
      // Load signup summary data from ogv-stats API
      const response = await fetch(`/api/dashboard/ogv-stats?${params.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        const entityStats = result.data.entityStats;
        const totalNationalNotFound = result.data.totalNationalNotFound || 0;
        const compareData = result.data.compareData;
        
        // Store comparison data for use in calculations
        setCompareData(compareData);
        
        // Separate local and national entities using entity_type provided by API
        const localStats = entityStats.filter((stat: any) => stat.entity_type === 'local');
        const nationalStats = entityStats.filter((stat: any) => stat.entity_type === 'national');
        
        // Convert local entityStats to SummaryRow format
        const localData: SummaryRow[] = localStats.map((stat: EntityStats) => ({
          entity: stat.entity_name,
          entity_id: stat.entity_id,
          goal: stat.goal,
          total: stat.sus,
          msu: stat.msus,
          yourUtm: stat.sus_utm_source,
          emtPlusOrganic: stat.emt_plus_organic,
          otherSource: stat.other_source,
          notFound: 0
        }));

        // Calculate local totals
        const totals: SummaryRow = {
          entity: 'LOCAL',
          entity_id: 0, // Special ID for totals
          goal: localData.reduce((sum, item) => sum + item.goal, 0),
          total: localData.reduce((sum, item) => sum + item.total, 0),
          msu: localData.reduce((sum, item) => sum + item.msu, 0),
          yourUtm: localData.reduce((sum, item) => sum + item.yourUtm, 0),
          emtPlusOrganic: localData.reduce((sum, item) => sum + item.emtPlusOrganic, 0),
          otherSource: localData.reduce((sum, item) => sum + item.otherSource, 0),
          notFound: localData.reduce((sum, item) => sum + item.notFound, 0)
        };

        // Convert national entityStats to national summary format with real goals
        const nationalData: NationalSummary[] = nationalStats.map((stat: EntityStats) => ({
          label: stat.entity_name,
          count: stat.sus,
          goal: stat.goal,
          percentage: 0, // Will be calculated below
          msu: stat.msus,
          yourUtm: stat.sus_utm_source,
          emtPlusOrganic: stat.emt_plus_organic,
          otherSource: stat.other_source
        }));

        // Calculate percentages for national entities
        const totalNationalCount = nationalData.reduce((sum, item) => sum + item.count, 0);
        nationalData.forEach(item => {
          item.percentage = totalNationalCount > 0 ? (item.count / totalNationalCount) * 100 : 0;
        });

        setLocalSummary(localData);
        setLocalTotals(totals);
        setNationalSummary(nationalData);
        
        // Store totalNationalNotFound for use in Total National row
        (window as any).totalNationalNotFound = totalNationalNotFound;
      } else {
        console.error('Failed to load signup data:', result.error);
      }
    } catch (error) {
      console.error('Error loading signup data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!formId) {
    return (
      <div className={`bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <p className="text-gray-600 dark:text-gray-400">Please select a form to view statistics</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Signup Summary</h3>
        <div className="flex items-center space-x-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Compare with</label>
          <select
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
            value={comparePhaseFilter}
            onChange={(e) => setComparePhaseFilter(e.target.value)}
          >
            <option value="">None</option>
            {availableForms.map((form) => (
              <option key={form.id} value={form.id.toString()}>
                Phase {form.name.replace('oGV ', '').replace('Submissions', '')}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th rowSpan={2} className="text-center py-4 px-4 bg-blue-600 dark:bg-blue-700 text-white font-semibold rounded-tl-lg">Type</th>
              <th rowSpan={2} className="text-center py-4 px-4 bg-blue-600 dark:bg-blue-700 text-white font-semibold">Entity</th>
              <th rowSpan={2} className="text-center py-4 px-4 bg-green-600 dark:bg-green-700 text-white font-semibold">Goal</th>
              <th rowSpan={2} className="text-center py-4 px-4 bg-blue-600 dark:bg-blue-700 text-white font-semibold cursor-pointer hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors" onClick={() => toggleSummarySort('total')} title="SUs mỗi LC có được từ các nguồn">
                SUs | market (total)
                {summarySort.column === 'total' && (
                  <span className="ml-1">{summarySort.direction === 'asc' ? '▲' : '▼'}</span>
                )}
              </th>
              <th rowSpan={2} className="text-center py-4 px-4 bg-blue-600 dark:bg-blue-700 text-white font-semibold cursor-pointer hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors" onClick={() => toggleSummarySort('msu')} title="SUs mỗi LC có được từ UTM Links cho own market">
                MSUs
                {summarySort.column === 'msu' && (
                  <span className="ml-1">{summarySort.direction === 'asc' ? '▲' : '▼'}</span>
                )}
              </th>
              <th rowSpan={2} className="text-center py-4 px-4 bg-blue-600 dark:bg-blue-700 text-white font-semibold" title="SUs mỗi LC có được từ UTM Campaigns ứng với phase hiện tại cho mọi market">SUs | utm source</th>
              <th rowSpan={2} className="text-center py-4 px-4 bg-blue-600 dark:bg-blue-700 text-white font-semibold" title="SUs mỗi LC có được từ UTM Campaigns ứng với phase hiện tại của EMT hoặc là SUs Organic">EMT + Organic</th>
              <th rowSpan={2} className="text-center py-4 px-4 bg-blue-600 dark:bg-blue-700 text-white font-semibold" title="SUs mỗi LC có được từ UTM Campaigns ứng với phase hiện tại mà entity NOT FOUND">not found from your utm source</th>
              <th className="text-center py-4 px-4 bg-blue-600 dark:bg-blue-700 text-white font-semibold" colSpan={comparePhaseFilter ? 9 : 3}>
                %GvA{comparePhaseFilter ? ` compared to ${availableForms.find(f => f.id.toString() === comparePhaseFilter)?.name || comparePhaseFilter}` : ''}
              </th>
            </tr>
            <tr>
              <th className="text-center py-3 px-4 bg-blue-600 dark:bg-blue-700 text-white font-semibold border-l border-blue-500 dark:border-blue-600" title="Progress = SUs / Goal">Progress</th>
              <th className="text-center py-3 px-4 bg-blue-600 dark:bg-blue-700 text-white font-semibold border-l border-blue-500 dark:border-blue-600" title="%M.SUs/SUs = MSUs / SUs">%M.SUs/SUs</th>
              <th className="text-center py-3 px-4 bg-blue-600 dark:bg-blue-700 text-white font-semibold border-l border-blue-500 dark:border-blue-600" title="%M.SUs/UTM = MSUs / SUs | utm source">%M.SUs/UTM</th>
              {comparePhaseFilter && (
                <>
                  <th className="text-center py-3 px-4 bg-blue-600 dark:bg-blue-700 text-white font-semibold border-l border-blue-500 dark:border-blue-600" title={`MSUs at ${availableForms.find(f => f.id.toString() === comparePhaseFilter)?.name || comparePhaseFilter}`}>MSUs ({availableForms.find(f => f.id.toString() === comparePhaseFilter)?.name.replace("oGV", "").replace("Submissions", "") || comparePhaseFilter})</th>
                  <th className="text-center py-3 px-4 bg-blue-600 dark:bg-blue-700 text-white font-semibold border-l border-blue-500 dark:border-blue-600" title="%Growth = (MSUs current - MSUs compare) / MSUs compare">%Growth</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {/* Local section */}
            {sortedLocalSummary.map((row, index) => (
              <tr key={`sum-${row.entity}`} className={`border-b border-gray-200/50 dark:border-gray-700/50 ${index % 2 === 0 ? 'bg-white/50 dark:bg-gray-800/50' : 'bg-gray-50/50 dark:bg-gray-700/50'} hover:bg-gray-100/50 dark:hover:bg-gray-600/50 transition-colors`}>
                {index === 0 && (
                  <td className="py-4 px-4 font-bold text-center bg-blue-600 dark:bg-blue-700 text-white" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }} rowSpan={sortedLocalSummary.length}>LOCAL</td>
                )}
                <td className="py-4 px-4 font-medium text-gray-900 dark:text-white">{row.entity}</td>
                <td className="py-4 px-4 font-semibold text-center bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400">{row.goal}</td>
                <td className="py-4 px-4 text-center text-gray-900 dark:text-white">{row.total}</td>
                <td className="py-4 px-4 text-center text-gray-900 dark:text-white">{row.msu}</td>
                <td className="py-4 px-4 text-center bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white">{row.yourUtm}</td>
                <td className="py-4 px-4 text-center bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white">{row.emtPlusOrganic}</td>
                <td className="py-4 px-4 text-center bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white">{row.otherSource}</td>
                <td className="py-4 px-4 text-center font-semibold bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400">{calculateProgress(row.total, row.goal).toFixed(2)}%</td>
                <td className="py-4 px-4 text-center font-semibold bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">{calculatePercentage(row.msu, row.total).toFixed(2)}%</td>
                <td className="py-4 px-4 text-center font-semibold bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400">{calculatePercentage(row.msu, row.yourUtm).toFixed(2)}%</td>
                {comparePhaseFilter && (
                  <>
                    <td className="py-4 px-4 text-center bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white">
                      {getCompareMsus(row.entity_id)}
                    </td>
                    <td className={`py-4 px-4 text-center font-semibold ${
                      calculateGrowth(row.msu, getCompareMsus(row.entity_id)) >= 0 
                        ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                      {calculateGrowth(row.msu, getCompareMsus(row.entity_id)).toFixed(1)}%
                    </td>
                  </>
                )}
              </tr>
            ))}
            
            {/* Local totals */}
            {localTotals && (
              <tr className="bg-yellow-100 dark:bg-yellow-900/30 border-t-2 border-yellow-300 dark:border-yellow-700">
                <td className="py-4 px-4 font-bold text-center bg-yellow-500 dark:bg-yellow-600 text-white">TOTAL</td>
                <td className="py-4 px-4 font-bold text-center text-gray-900 dark:text-white">LOCAL</td>
                <td className="py-4 px-4 font-bold text-center bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400">{localTotals.goal}</td>
                <td className="py-4 px-4 font-bold text-center text-gray-900 dark:text-white">{localTotals.total}</td>
                <td className="py-4 px-4 font-bold text-center text-gray-900 dark:text-white">{localTotals.msu}</td>
                <td className="py-4 px-4 font-bold text-center bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white">{localTotals.yourUtm}</td>
                <td className="py-4 px-4 font-bold text-center bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white">{localTotals.emtPlusOrganic}</td>
                <td className="py-4 px-4 font-bold text-center bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white">{localTotals.otherSource}</td>
                <td className="py-4 px-4 font-bold text-center bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400">{calculateProgress(localTotals.total, localTotals.goal).toFixed(2)}%</td>
                <td className="py-4 px-4 font-bold text-center bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">{calculatePercentage(localTotals.msu, localTotals.total).toFixed(2)}%</td>
                <td className="py-4 px-4 font-bold text-center bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400">{calculatePercentage(localTotals.msu, localTotals.yourUtm).toFixed(2)}%</td>
                {comparePhaseFilter && (
                  <>
                    <td className="py-4 px-4 font-bold text-center bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white">
                      {getTotalCompareMsus()}
                    </td>
                    <td className={`py-4 px-4 font-bold text-center ${
                      calculateGrowth(localTotals.msu, getTotalCompareMsus()) >= 0 
                        ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                      {calculateGrowth(localTotals.msu, getTotalCompareMsus()).toFixed(1)}%
                    </td>
                  </>
                )}
              </tr>
            )}
            
            {/* National section */}
            {nationalSummary.map((r, index) => (
              <tr key={`nat-${r.label}`} className={`border-b border-gray-200/50 dark:border-gray-700/50 ${index % 2 === 0 ? 'bg-white/50 dark:bg-gray-800/50' : 'bg-gray-50/50 dark:bg-gray-700/50'} hover:bg-gray-100/50 dark:hover:bg-gray-600/50 transition-colors`}>
                {index === 0 && (
                  <td className="py-4 px-4 font-bold text-center bg-blue-600 dark:bg-blue-700 text-white" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }} rowSpan={nationalSummary.length}>NATIONAL</td>
                )}
                <td className="py-4 px-4 font-medium text-gray-900 dark:text-white">{r.label}</td>
                <td className="py-4 px-4 text-center font-semibold bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                  {r.goal}
                </td>
                <td className="py-4 px-4 text-center text-gray-900 dark:text-white">{formatNumber(r.count)}</td>
                <td className="py-4 px-4 text-center text-gray-900 dark:text-white">-</td>
                <td className="py-4 px-4 text-center bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white">-</td>
                <td className="py-4 px-4 text-center bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white">-</td>
                <td className="py-4 px-4 text-center bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white">{r.otherSource}</td>
                <td className="py-4 px-4 text-center bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400">{calculateProgress(r.count, r.goal).toFixed(2)}%</td>
                <td className="py-4 px-4 text-center bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">-</td>
                <td className="py-4 px-4 text-center bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400">-</td>
                {comparePhaseFilter && (
                  <>
                    <td className="py-4 px-4 text-center bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white">-</td>
                    <td className="py-4 px-4 text-center bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">-</td>
                  </>
                )}
              </tr>
            ))}
            
            {/* National totals */}
            <tr className="bg-yellow-100 dark:bg-yellow-900/30 border-t-2 border-yellow-300 dark:border-yellow-700">
              <td className="py-4 px-4 font-bold text-center bg-yellow-500 dark:bg-yellow-600 text-white">TOTAL</td>
              <td className="py-4 px-4 font-bold text-center text-gray-900 dark:text-white">NATIONAL</td>
              <td className="py-4 px-4 font-bold text-center bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400">{nationalSummary.reduce((sum, item) => sum + item.goal, 0)}</td>
              <td className="py-4 px-4 font-bold text-center text-gray-900 dark:text-white">{formatNumber(nationalSummary.reduce((sum, item) => sum + item.count, 0))}</td>
              <td className="py-4 px-4 font-bold text-center text-gray-900 dark:text-white">-</td>
              <td className="py-4 px-4 font-bold text-center bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white">-</td>
              <td className="py-4 px-4 font-bold text-center bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white">-</td>
              <td className="py-4 px-4 font-bold text-center bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white">{(window as any).totalNationalNotFound || 0}</td>
              <td className="py-4 px-4 font-bold text-center bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400">{calculateProgress(nationalSummary.reduce((sum, item) => sum + item.count, 0), nationalSummary.reduce((sum, item) => sum + item.goal, 0)).toFixed(2)}%</td>
              <td className="py-4 px-4 font-bold text-center bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">-</td>
              <td className="py-4 px-4 font-bold text-center bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400">-</td>
              {comparePhaseFilter && (
                <>
                  <td className="py-4 px-4 font-bold text-center bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white">-</td>
                  <td className="py-4 px-4 font-bold text-center bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">-</td>
                </>
              )}
            </tr>
            
            {/* TOTAL of TOTAL */}
            <tr className="bg-red-100 dark:bg-red-900/30 border-t-4 border-red-300 dark:border-red-700">
              <td className="py-4 px-4 font-bold text-center bg-red-500 dark:bg-red-600 text-white">TOTAL</td>
              <td className="py-4 px-4 font-bold text-center text-gray-900 dark:text-white">TOTAL of TOTAL</td>
              <td className="py-4 px-4 font-bold text-center bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                {(localTotals?.goal || 0) + nationalSummary.reduce((sum, item) => sum + item.goal, 0)}
              </td>
              <td className="py-4 px-4 font-bold text-center text-gray-900 dark:text-white">
                {formatNumber((localTotals?.total || 0) + (localTotals?.otherSource || 0) + (window as any).totalNationalNotFound)}
              </td>
              <td className="py-4 px-4 font-bold text-center text-gray-900 dark:text-white">
                {(localTotals?.msu || 0) + nationalSummary.reduce((sum, item) => sum + item.msu, 0)}
              </td>
              <td className="py-4 px-4 font-bold text-center bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white">
                {(localTotals?.yourUtm || 0) + nationalSummary.reduce((sum, item) => sum + item.yourUtm, 0)}
              </td>
              <td className="py-4 px-4 font-bold text-center bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white">
                {(localTotals?.emtPlusOrganic || 0) + nationalSummary.reduce((sum, item) => sum + item.emtPlusOrganic, 0)}
              </td>
              <td className="py-4 px-4 font-bold text-center bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white">
                {(localTotals?.otherSource || 0) + ((window as any).totalNationalNotFound || 0)}
              </td>
              <td className="py-4 px-4 font-bold text-center bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                {calculateProgress(
                  (localTotals?.total || 0) + (localTotals?.otherSource || 0) + nationalSummary.reduce((sum, item) => sum + item.count, 0),
                  (localTotals?.goal || 0) + nationalSummary.reduce((sum, item) => sum + item.goal, 0)
                ).toFixed(2)}%
              </td>
              <td className="py-4 px-4 font-bold text-center bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                {calculatePercentage(localTotals?.msu || 0, localTotals?.total || 0).toFixed(2)}%
              </td>
                <td className="py-4 px-4 font-bold text-center bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                  {calculatePercentage(localTotals?.msu || 0, localTotals?.yourUtm || 0).toFixed(2)}%
                </td>
              {comparePhaseFilter && (
                <>
                  <td className="py-4 px-4 font-bold text-center bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white">-</td>
                  <td className="py-4 px-4 font-bold text-center bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">-</td>
                </>
              )}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

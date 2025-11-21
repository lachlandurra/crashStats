'use client';

import { subYears, format } from 'date-fns';
import { DateRangePicker } from './date-range-picker';
import { Calendar, AlertCircle, RotateCcw } from 'lucide-react';
import { getLatestDataDate } from '@/lib/data-meta';

export type FiltersState = {
  dateFrom?: string;
  dateTo?: string;
  severity: string[];
};

const SEVERITY_OPTIONS = [
  { label: 'Fatal accident', color: 'from-rose-500 to-red-600', textColor: 'text-rose-700', bgColor: 'bg-rose-50', borderColor: 'border-rose-400', hoverBg: 'hover:bg-rose-100' },
  { label: 'Serious injury accident', color: 'from-orange-500 to-amber-600', textColor: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-400', hoverBg: 'hover:bg-orange-100' },
  { label: 'Other injury accident', color: 'from-amber-400 to-yellow-500', textColor: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-400', hoverBg: 'hover:bg-amber-100' },
  { label: 'Non injury accident', color: 'from-emerald-400 to-teal-500', textColor: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-400', hoverBg: 'hover:bg-emerald-100' },
];

type FiltersPanelProps = {
  value: FiltersState;
  onChange: (next: FiltersState) => void;
  disabled?: boolean;
};

export function FiltersPanel({ value, onChange, disabled }: FiltersPanelProps) {
  const toggleSeverity = (option: string) => {
    const exists = value.severity.includes(option);
    const next = exists ? value.severity.filter((item) => item !== option) : [...value.severity, option];
    onChange({ ...value, severity: next });
  };

  const handleDateRangeChange = (range: { from?: Date; to?: Date } | undefined) => {
    onChange({
      ...value,
      dateFrom: range?.from ? range.from.toISOString().split('T')[0] : undefined,
      dateTo: range?.to ? range.to.toISOString().split('T')[0] : undefined,
    });
  };

  const clearFilters = () => {
    onChange({ severity: [], dateFrom: undefined, dateTo: undefined });
  };

  const handleLast5Years = () => {
    const latest = getLatestDataDate();
    const fiveYearsAgo = subYears(latest, 5);
    const dateFrom = format(fiveYearsAgo, 'yyyy-MM-dd');
    const dateTo = format(latest, 'yyyy-MM-dd');

    if (value.dateFrom === dateFrom && value.dateTo === dateTo) {
      onChange({ ...value, dateFrom: undefined, dateTo: undefined });
    } else {
      onChange({ ...value, dateFrom, dateTo });
    }
  };

  const isLast5Years = () => {
    if (!value.dateFrom || !value.dateTo) return false;
    const latest = getLatestDataDate();
    const fiveYearsAgo = subYears(latest, 5);
    return value.dateFrom === format(fiveYearsAgo, 'yyyy-MM-dd') && 
           value.dateTo === format(latest, 'yyyy-MM-dd');
  };

  const fromDate = value.dateFrom ? new Date(value.dateFrom) : undefined;
  const toDate = value.dateTo ? new Date(value.dateTo) : undefined;
  
  const hasActiveFilters = value.severity.length > 0 || value.dateFrom || value.dateTo;

  return (
    <div className="space-y-4">
      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <button
          type="button"
          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-neutral-50 to-neutral-100 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition-all hover:from-neutral-100 hover:to-neutral-200 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed border border-neutral-200/50"
          onClick={clearFilters}
          disabled={disabled}
        >
          <RotateCcw className="h-3.5 w-3.5 transition-transform group-hover:rotate-180 duration-500" />
          Clear All Filters
        </button>
      )}

      {/* Date Range Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm">
              <Calendar className="h-3.5 w-3.5 text-white" />
            </div>
            <h3 className="text-sm font-bold text-neutral-800 tracking-tight">Date Range</h3>
          </div>
          
          <button
            type="button"
            onClick={handleLast5Years}
            disabled={disabled}
            className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
              isLast5Years()
                ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm'
                : 'bg-white text-neutral-500 border-neutral-200 hover:border-neutral-300 hover:text-neutral-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Last 5 Years
          </button>
        </div>
        <DateRangePicker
          from={fromDate}
          to={toDate}
          onSelect={handleDateRangeChange}
          disabled={disabled}
        />
      </div>

      {/* Severity Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 shadow-sm">
            <AlertCircle className="h-3.5 w-3.5 text-white" />
          </div>
          <h3 className="text-sm font-bold text-neutral-800 tracking-tight">Severity Level</h3>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {SEVERITY_OPTIONS.map((option) => {
            const active = value.severity.includes(option.label);
            return (
              <button
                key={option.label}
                type="button"
                className={`group relative overflow-hidden rounded-full border px-3 py-1.5 text-xs font-bold transition-all duration-300 ${
                  active
                    ? `${option.borderColor} ${option.bgColor} ${option.textColor} shadow-sm`
                    : `border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 hover:shadow-sm`
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                onClick={() => toggleSeverity(option.label)}
                disabled={disabled}
              >
                <div className="flex items-center gap-1.5">
                  <div className={`h-2 w-2 rounded-full bg-gradient-to-br ${option.color} ${active ? 'opacity-100' : 'opacity-50 group-hover:opacity-100'}`} />
                  {option.label.replace(' accident', '')}
                </div>
              </button>
            );
          })}
        </div>
        
        {/* Active Count Badge */}
        {value.severity.length > 0 && (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-2 border border-blue-100">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-bold text-blue-700">
              {value.severity.length} {value.severity.length === 1 ? 'filter' : 'filters'} active
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

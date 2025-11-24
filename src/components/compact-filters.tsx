'use client';

import { useState, useRef, useEffect } from 'react';
import { subYears, subMonths, format } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { Calendar, ChevronDown, X } from 'lucide-react';
import { getLatestDataDate } from '@/lib/data-meta';
import type { FiltersState } from './filters-panel';

const SEVERITY_OPTIONS = [
  { label: 'Fatal accident', color: 'bg-rose-500', textColor: 'text-rose-700', bgColor: 'bg-rose-50', borderColor: 'border-rose-200' },
  { label: 'Serious injury accident', color: 'bg-orange-500', textColor: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
  { label: 'Other injury accident', color: 'bg-amber-400', textColor: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
  { label: 'Non injury accident', color: 'bg-emerald-400', textColor: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
];

type CompactFiltersProps = {
  value: FiltersState;
  onChange: (next: FiltersState) => void;
  disabled?: boolean;
};

export function CompactFilters({ value, onChange, disabled }: CompactFiltersProps) {
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [activeField, setActiveField] = useState<'from' | 'to'>('from');
  const dateButtonRef = useRef<HTMLButtonElement>(null);
  const datePopoverRef = useRef<HTMLDivElement>(null);

  // Close date popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        datePopoverRef.current &&
        !datePopoverRef.current.contains(event.target as Node) &&
        dateButtonRef.current &&
        !dateButtonRef.current.contains(event.target as Node)
      ) {
        setIsDateOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSeverity = (option: string) => {
    const exists = value.severity.includes(option);
    const next = exists ? value.severity.filter((item) => item !== option) : [...value.severity, option];
    onChange({ ...value, severity: next });
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    const fromDate = value.dateFrom ? new Date(value.dateFrom) : undefined;
    const toDate = value.dateTo ? new Date(value.dateTo) : undefined;

    if (activeField === 'from') {
      // If setting start date and it's after end date, clear end date
      if (toDate && date > toDate) {
        onChange({ ...value, dateFrom: date.toISOString().split('T')[0], dateTo: undefined });
      } else {
        onChange({ ...value, dateFrom: date.toISOString().split('T')[0] });
      }
      // Auto-switch to 'to' field after selecting 'from'
      setActiveField('to');
    } else {
      // If setting end date and it's before start date, clear start date
      if (fromDate && date < fromDate) {
        onChange({ ...value, dateFrom: undefined, dateTo: date.toISOString().split('T')[0] });
      } else {
        onChange({ ...value, dateTo: date.toISOString().split('T')[0] });
      }
    }
  };

  const handleLast12Months = () => {
    const latest = getLatestDataDate();
    const twelveMonthsAgo = subMonths(latest, 12);
    const dateFrom = format(twelveMonthsAgo, 'yyyy-MM-dd');
    const dateTo = format(latest, 'yyyy-MM-dd');

    if (value.dateFrom === dateFrom && value.dateTo === dateTo) {
      onChange({ ...value, dateFrom: undefined, dateTo: undefined });
    } else {
      onChange({ ...value, dateFrom, dateTo });
    }
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

  const handleSince2012 = () => {
    const latest = getLatestDataDate();
    const dateFrom = '2012-01-01';
    const dateTo = format(latest, 'yyyy-MM-dd');

    if (value.dateFrom === dateFrom && value.dateTo === dateTo) {
      onChange({ ...value, dateFrom: undefined, dateTo: undefined });
    } else {
      onChange({ ...value, dateFrom, dateTo });
    }
  };

  const isLast12Months = () => {
    if (!value.dateFrom || !value.dateTo) return false;
    const latest = getLatestDataDate();
    const twelveMonthsAgo = subMonths(latest, 12);
    return value.dateFrom === format(twelveMonthsAgo, 'yyyy-MM-dd') && 
           value.dateTo === format(latest, 'yyyy-MM-dd');
  };

  const isLast5Years = () => {
    if (!value.dateFrom || !value.dateTo) return false;
    const latest = getLatestDataDate();
    const fiveYearsAgo = subYears(latest, 5);
    return value.dateFrom === format(fiveYearsAgo, 'yyyy-MM-dd') && 
           value.dateTo === format(latest, 'yyyy-MM-dd');
  };

  const isSince2012 = () => {
    if (!value.dateFrom || !value.dateTo) return false;
    const latest = getLatestDataDate();
    return value.dateFrom === '2012-01-01' && 
           value.dateTo === format(latest, 'yyyy-MM-dd');
  };

  const fromDate = value.dateFrom ? new Date(value.dateFrom) : undefined;
  const toDate = value.dateTo ? new Date(value.dateTo) : undefined;
  
  const hasDateFilter = value.dateFrom || value.dateTo;
  const dateLabel = hasDateFilter 
    ? isLast12Months() 
      ? 'Last 12 Months'
      : isLast5Years() 
        ? 'Last 5 Years' 
        : isSince2012()
          ? 'Since 2012'
          : `${value.dateFrom ? format(new Date(value.dateFrom), 'dd/MM/yy') : 'Start'} - ${value.dateTo ? format(new Date(value.dateTo), 'dd/MM/yy') : 'End'}`
    : 'Date';

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Row 1: Date & Time */}
      <div className="flex items-center gap-2 relative z-20">
        {/* Date Filter */}
        <div className="relative shrink-0">
          <button
            ref={dateButtonRef}
            onClick={() => setIsDateOpen(!isDateOpen)}
            disabled={disabled}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              hasDateFilter && !isLast12Months() && !isLast5Years() && !isSince2012()
                ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm'
                : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
            } disabled:opacity-50`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>{dateLabel}</span>
            <ChevronDown className={`h-3 w-3 transition-transform ${isDateOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Date Popover */}
          {isDateOpen && (
            <div 
              ref={datePopoverRef}
              className="absolute top-full left-0 mt-2 z-50 bg-white rounded-2xl shadow-xl border border-neutral-100 animate-in fade-in zoom-in-95 duration-200 p-4"
            >
              <div className="flex flex-col gap-3 min-w-[320px]">
                {/* Field Selector */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveField('from')}
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                      activeField === 'from'
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    Start: {fromDate ? format(fromDate, 'MMM dd, yyyy') : 'Not set'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveField('to')}
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                      activeField === 'to'
                        ? 'bg-indigo-500 text-white shadow-sm'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    End: {toDate ? format(toDate, 'MMM dd, yyyy') : 'Not set'}
                  </button>
                </div>

                {/* Calendar */}
                <DayPicker
                  mode="single"
                  selected={activeField === 'from' ? fromDate : toDate}
                  onSelect={handleDateSelect}
                  disabled={disabled}
                  captionLayout="dropdown"
                  fromYear={2000}
                  toYear={new Date().getFullYear()}
                  modifiersClassNames={{
                    selected: activeField === 'from' 
                      ? 'bg-blue-600 text-white hover:bg-blue-500' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-500',
                    today: 'font-bold text-blue-600 border border-blue-300',
                  }}
                  styles={{
                    caption: { color: '#171717', marginBottom: '12px' },
                    head_cell: { color: '#737373', fontWeight: '600', fontSize: '11px' },
                    dropdown: { 
                      color: '#171717', 
                      padding: '4px 8px', 
                      borderRadius: '6px', 
                      border: '1px solid #e5e5e5',
                      fontWeight: '600',
                      fontSize: '13px'
                    },
                    day: {
                      borderRadius: '6px',
                      fontWeight: '500'
                    }
                  }}
                />

                {/* Clear Button */}
                {(fromDate || toDate) && (
                  <button
                    type="button"
                    onClick={() => onChange({ ...value, dateFrom: undefined, dateTo: undefined })}
                    className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear Dates
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Filter Shortcuts */}
        <button
          onClick={handleLast12Months}
          disabled={disabled}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
            isLast12Months()
              ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm'
              : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
          } disabled:opacity-50`}
        >
          Last 12 Months
        </button>
        <button
          onClick={handleLast5Years}
          disabled={disabled}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
            isLast5Years()
              ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm'
              : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
          } disabled:opacity-50`}
        >
          Last 5 Years
        </button>
        <button
          onClick={handleSince2012}
          disabled={disabled}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
            isSince2012()
              ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm'
              : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
          } disabled:opacity-50`}
        >
          Since 2012
        </button>
      </div>

      {/* Row 2: Severity Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide mask-linear-fade z-10">
        {SEVERITY_OPTIONS.map((option) => {
          const active = value.severity.includes(option.label);
          return (
            <button
              key={option.label}
              onClick={() => toggleSeverity(option.label)}
              disabled={disabled}
              className={`shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                active
                  ? `${option.bgColor} ${option.textColor} ${option.borderColor} shadow-sm`
                  : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
              } disabled:opacity-50`}
            >
              <div className={`h-2 w-2 rounded-full ${option.color} ${active ? 'opacity-100' : 'opacity-50'}`} />
              {option.label.replace(' accident', '')}
            </button>
          );
        })}
      </div>
    </div>
  );
}

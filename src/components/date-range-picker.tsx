'use client';

import * as React from 'react';
import { format, subMonths, subYears } from 'date-fns';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

type DateRangePickerProps = {
  from?: Date;
  to?: Date;
  onSelect: (range: { from?: Date; to?: Date } | undefined) => void;
  disabled?: boolean;
};

const PRESETS = [
  { label: 'Last 12 Months', getValue: () => ({ from: subMonths(new Date(), 12), to: new Date() }) },
  { label: 'Last 5 Years', getValue: () => ({ from: subYears(new Date(), 5), to: new Date() }) },
  { label: 'Last 10 Years', getValue: () => ({ from: subYears(new Date(), 10), to: new Date() }) },
  { label: 'Since 2012', getValue: () => ({ from: new Date(2012, 0, 1), to: new Date() }) },
];

type DateField = 'from' | 'to';

export function DateRangePicker({ from, to, onSelect, disabled }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeField, setActiveField] = React.useState<DateField | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveField(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePresetClick = (preset: typeof PRESETS[0]) => {
    const range = preset.getValue();
    onSelect(range);
    setIsOpen(false);
    setActiveField(null);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    if (activeField === 'from') {
      // If setting start date and it's after end date, clear end date
      if (to && date > to) {
        onSelect({ from: date, to: undefined });
      } else {
        onSelect({ from: date, to });
      }
    } else if (activeField === 'to') {
      // If setting end date and it's before start date, clear start date
      if (from && date < from) {
        onSelect({ from: undefined, to: date });
      } else {
        onSelect({ from, to: date });
      }
    }
  };

  const handleClear = () => {
    onSelect(undefined);
    setActiveField(null);
  };

  const hasSelection = from || to;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`group flex w-full items-center justify-start gap-3 rounded-xl border-2 bg-gradient-to-br from-white to-neutral-50 px-4 py-3 text-sm font-semibold shadow-sm transition-all hover:shadow-md hover:from-neutral-50 hover:to-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          !hasSelection
            ? 'border-neutral-200 text-neutral-500' 
            : 'border-blue-200 text-neutral-900 bg-gradient-to-br from-blue-50/50 to-white'
        }`}
      >
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
          !hasSelection
            ? 'bg-neutral-100 text-neutral-400' 
            : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm'
        }`}>
          <CalendarIcon className="h-4 w-4" />
        </div>
        <div className="flex-1 text-left">
          {from || to ? (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-neutral-500">Selected Range</span>
              <span className="font-bold text-neutral-900">
                {from ? format(from, 'MMM dd, yyyy') : 'Not set'} → {to ? format(to, 'MMM dd, yyyy') : 'Not set'}
              </span>
            </div>
          ) : (
            <span className="text-neutral-500">Select date range</span>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="absolute left-full top-0 z-50 ml-2 flex rounded-2xl border-2 border-neutral-200 bg-white shadow-2xl shadow-neutral-900/10 overflow-hidden backdrop-blur-sm">
          {/* Quick Select Presets */}
          <div className="flex w-44 flex-col border-r border-neutral-200 bg-gradient-to-b from-neutral-50 to-white p-3">
            <div className="flex items-center justify-between mb-3 px-2">
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Quick Select</p>
            </div>
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePresetClick(preset)}
                className="group rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-neutral-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 transition-all border border-transparent hover:border-blue-200 hover:shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-neutral-300 group-hover:bg-blue-500 transition-colors" />
                  {preset.label}
                </div>
              </button>
            ))}
            
            {hasSelection && (
              <button
                onClick={handleClear}
                className="mt-3 pt-3 border-t border-neutral-200 group rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50 transition-all flex items-center gap-2"
              >
                <X className="h-3.5 w-3.5" />
                Clear Selection
              </button>
            )}
          </div>

          {/* Date Inputs */}
          <div className="flex flex-col p-4 gap-4 min-w-[320px]">
            {/* Start Date Input */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-neutral-600 uppercase tracking-wider">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                Start Date
              </label>
              <button
                type="button"
                onClick={() => setActiveField('from')}
                className={`w-full rounded-lg border-2 px-3 py-2 text-sm font-semibold transition-all text-left ${
                  activeField === 'from'
                    ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-sm'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
                }`}
              >
                {from ? format(from, 'MMMM dd, yyyy') : 'Select start date'}
              </button>
            </div>

            {/* End Date Input */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-neutral-600 uppercase tracking-wider">
                <div className="h-2 w-2 rounded-full bg-indigo-500" />
                End Date
              </label>
              <button
                type="button"
                onClick={() => setActiveField('to')}
                className={`w-full rounded-lg border-2 px-3 py-2 text-sm font-semibold transition-all text-left ${
                  activeField === 'to'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-900 shadow-sm'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
                }`}
              >
                {to ? format(to, 'MMMM dd, yyyy') : 'Select end date'}
              </button>
            </div>

            {/* Calendar */}
            {activeField && (
              <div className="border-t-2 border-neutral-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                    {activeField === 'from' ? 'Select Start Date' : 'Select End Date'}
                  </p>
                </div>
                <DayPicker
                  mode="single"
                  selected={activeField === 'from' ? from : to}
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
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

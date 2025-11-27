'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import type { Feature, FeatureCollection, MultiPolygon, Point, Polygon } from 'geojson';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { ChevronUp, Map as MapIcon, Filter, X, TrendingUp, Users, Car, Bike, Truck, AlertTriangle, Calendar, Clock, ChevronLeft, ChevronRight, Menu, Search } from 'lucide-react';

import { MapPanel } from '@/components/map-panel';
import { type FiltersState } from '@/components/filters-panel';
import { CompactFilters } from '@/components/compact-filters';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, LabelList } from 'recharts';

type SummaryBucket = { bucket: string; count: number };

type SummaryResponse = {
  total: number;
  bySeverity: SummaryBucket[];
  byType: SummaryBucket[];
  byDcaCodeDescription: SummaryBucket[];
  bySpeedZone: SummaryBucket[];
  byRoadGeometry: SummaryBucket[];
  byDayOfWeek: SummaryBucket[];
  byLightCondition: SummaryBucket[];
  totals: {
    persons: number;
    pedestrians: number;
    cyclists: number;
    heavyVehicles: number;
    motorcyclists: number;
  };
  latestAccidentDate: string | null;
  dataVersion: string | null;
};

type CrashesResponse = {
  results: CrashPoint[];
};

type CrashPoint = {
  accidentNo: string;
  accidentDate: string | null;
  accidentTime: string | null;
  severity: string | null;
  accidentType: string | null;
  dcaCodeDescription: string | null;
  lon: number;
  lat: number;
  speedZone: string | null;
  roadGeometry: string | null;
  dayOfWeek: string | null;
  lightCondition: string | null;
  totalPersons: number;
  pedestrians: number;
  cyclists: number;
  heavyVehicles: number;
  passengerVehicles: number;
  motorcycles: number;
  publicTransportVehicles: number;
  passengers: number;
  drivers: number;
  pillions: number;
  motorcyclists: number;
  unknown: number;
  pedCyclist5To12: number;
  pedCyclist13To18: number;
  oldPed65Plus: number;
  oldDriver75Plus: number;
  youngDriver18To25: number;
  noOfVehicles: number;
};

type SummaryQuery = UseQueryResult<SummaryResponse, Error>;

// ... (existing code)

function PointStats({ point }: { point: { count: number; severity: string; crashes: CrashPoint[] } }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-4">
        {point.crashes.map((crash) => (
          <div key={crash.accidentNo} className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-blue-100 group">
            <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        crash.severity === 'Fatal accident' ? 'bg-red-100 text-red-700' :
                        crash.severity === 'Serious injury accident' ? 'bg-orange-100 text-orange-700' :
                        crash.severity === 'Other injury accident' ? 'bg-emerald-200 text-emerald-800' :
                        crash.severity === 'Non injury accident' ? 'bg-green-50 text-emerald-700' :
                        'bg-neutral-100 text-neutral-700'
                      }`}>
                        {crash.severity?.replace(' accident', '')}
                      </div>
                    </div>
                <h4 className="font-bold text-neutral-900 text-sm leading-tight">{crash.accidentType}</h4>
              </div>
              <div className="text-[10px] font-mono text-neutral-400 bg-neutral-50 px-2 py-1 rounded-md">
                #{crash.accidentNo}
              </div>
            </div>

            <div className="mb-3 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2 shadow-[0_1px_0_rgba(59,130,246,0.15)] flex gap-2">
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                  <span
                    title="DCA code indicates the movements the involved road users were making when the crash occurred"
                    className="cursor-help decoration-dotted underline underline-offset-2"
                  >
                    DCA
                  </span>
                </p>
                <p className="text-sm font-bold text-neutral-900 leading-snug">
                  {formatDcaDescription(crash.dcaCodeDescription || '')}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-neutral-600 mb-3">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                <span className="flex items-center gap-1">
                  <span>{formatDate(crash.accidentDate)}</span>
                  <span className="text-neutral-300">•</span>
                  <span>{formatTime(crash.accidentTime)}</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-neutral-400" />
                <span>{crash.dayOfWeek}</span>
              </div>
              <div className="col-span-2 flex items-center gap-1.5">
                <span className="font-medium text-neutral-400">Speed Zone:</span>
                <span>{formatSpeedZone(crash.speedZone)}</span>
              </div>
              <div className="col-span-2 flex items-center gap-1.5">
                <span className="font-medium text-neutral-400">Conditions:</span>
                <span>{crash.lightCondition}</span>
              </div>
            </div>

            {/* Involved Parties Badges */}
            <div className="flex flex-wrap gap-2 border-t border-neutral-50 pt-3">
              <Badge count={crash.totalPersons} label="Persons" color="bg-neutral-100 text-neutral-600" />
              <Badge count={crash.noOfVehicles} label="Vehicles" color="bg-slate-100 text-slate-600" />
              
              {/* People Types */}
              {crash.pedestrians > 0 && <Badge count={crash.pedestrians} label="Pedestrians" color="bg-rose-50 text-rose-600" />}
              {crash.cyclists > 0 && <Badge count={crash.cyclists} label="Cyclists" color="bg-emerald-50 text-emerald-600" />}
              {crash.passengers > 0 && <Badge count={crash.passengers} label="Passengers" color="bg-blue-50 text-blue-600" />}
              {crash.drivers > 0 && <Badge count={crash.drivers} label="Drivers" color="bg-indigo-50 text-indigo-600" />}
              {crash.pillions > 0 && <Badge count={crash.pillions} label="Pillions" color="bg-violet-50 text-violet-600" />}
              {crash.motorcyclists > 0 && <Badge count={crash.motorcyclists} label="Motorcyclists" color="bg-orange-50 text-orange-600" />}
              
              {/* Vehicle Types */}
              {crash.passengerVehicles > 0 && <Badge count={crash.passengerVehicles} label="Passenger Cars" color="bg-sky-50 text-sky-600" />}
              {crash.heavyVehicles > 0 && <Badge count={crash.heavyVehicles} label="Heavy Vehicles" color="bg-purple-50 text-purple-600" />}
              {crash.motorcycles > 0 && <Badge count={crash.motorcycles} label="Motorcycles" color="bg-amber-50 text-amber-600" />}
              {crash.publicTransportVehicles > 0 && <Badge count={crash.publicTransportVehicles} label="Public Transport" color="bg-teal-50 text-teal-600" />}
              
              {/* Demographics */}
              {crash.pedCyclist5To12 > 0 && <Badge count={crash.pedCyclist5To12} label="Ped/Cyc 5-12" color="bg-pink-50 text-pink-600" />}
              {crash.pedCyclist13To18 > 0 && <Badge count={crash.pedCyclist13To18} label="Ped/Cyc 13-18" color="bg-fuchsia-50 text-fuchsia-600" />}
              {crash.oldPed65Plus > 0 && <Badge count={crash.oldPed65Plus} label="Ped 65+" color="bg-red-50 text-red-600" />}
              {crash.oldDriver75Plus > 0 && <Badge count={crash.oldDriver75Plus} label="Driver 75+" color="bg-orange-50 text-orange-600" />}
              {crash.youngDriver18To25 > 0 && <Badge count={crash.youngDriver18To25} label="Driver 18-25" color="bg-yellow-50 text-yellow-600" />}
              
              {crash.unknown > 0 && <Badge count={crash.unknown} label="Unknown" color="bg-gray-100 text-gray-600" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Badge({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium ${color}`}>
      <span className="font-bold">{count}</span> {label}
    </span>
  );
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return 'Unknown Date';
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string | null) {
  if (!timeStr) return 'Unknown time';
  const digits = timeStr.replace(/\D/g, '');
  if (digits.length >= 4) {
    const hours = digits.slice(0, 2).padStart(2, '0');
    const minutes = digits.slice(2, 4).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  return timeStr;
}

function AnimatedArrow() {
  const pathRef = useRef<SVGPathElement>(null);
  const headRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const path = pathRef.current;
    const head = headRef.current;
    if (!path || !head) return;

    const length = path.getTotalLength();

    const updateArrowHead = () => {
      // Use a slightly larger sampling window so the head follows the final curve direction smoothly
      const endPoint = path.getPointAtLength(length);
      const lookBack = Math.min(8, length); // guard very short paths
      const previousPoint = path.getPointAtLength(Math.max(length - lookBack, 0));
      const angle = Math.atan2(endPoint.y - previousPoint.y, endPoint.x - previousPoint.x);
      const headLength = 12;
      const spread = Math.PI / 6; // 30 degrees spread for the two flares

      const headPoint = (offset: number) => {
        const theta = angle + Math.PI + offset;
        return {
          x: endPoint.x + Math.cos(theta) * headLength,
          y: endPoint.y + Math.sin(theta) * headLength
        };
      };

      const leftPoint = headPoint(spread);
      const rightPoint = headPoint(-spread);

      head.setAttribute(
        'd',
        `M ${endPoint.x} ${endPoint.y} L ${leftPoint.x} ${leftPoint.y} M ${endPoint.x} ${endPoint.y} L ${rightPoint.x} ${rightPoint.y}`
      );
    };
    
    updateArrowHead();
    
    // Reset styles
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;
    path.style.opacity = '0';
    
    head.style.opacity = '0';

    const duration = 2000;
    
    const animate = () => {
      const start = performance.now();
      
      const step = (timestamp: number) => {
        const elapsed = timestamp - start;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out cubic
        const ease = 1 - Math.pow(1 - progress, 3);
        
        // Animate path drawing
        path.style.strokeDashoffset = `${length * (1 - ease)}`;
        path.style.opacity = progress < 0.1 ? `${progress * 10}` : '1';
        
        // Animate head appearance near the end
        if (progress > 0.8) {
           head.style.opacity = `${(progress - 0.8) * 5}`;
        } else {
           head.style.opacity = '0';
        }

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          // Reset and loop after a short pause
          setTimeout(() => {
             path.style.strokeDashoffset = `${length}`;
             path.style.opacity = '0';
             head.style.opacity = '0';
             requestAnimationFrame(animate);
          }, 500);
        }
      };
      
      requestAnimationFrame(step);
    };

    const animationId = requestAnimationFrame(animate);
    
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <svg 
      width="100%" 
      height="100%" 
      viewBox="0 0 100 100" 
      fill="none" 
      className="text-blue-600 drop-shadow-md"
    >
      {/* Curved line pointing from left up to the right */}
      <path 
        ref={pathRef}
        d="M12 72 C 35 65, 60 50, 90 28" 
        stroke="currentColor" 
        strokeWidth="3" 
        strokeLinecap="round"
      />
      {/* Arrowhead */}
      <path 
        ref={headRef}
        d="M10 20 L 22 27 M 10 20 L 17 32" 
        stroke="currentColor" 
        strokeWidth="3" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function HomePage() {
  const [polygon, setPolygon] = useState<Feature<Polygon | MultiPolygon> | null>(null);
  const [bounds, setBounds] = useState<Feature<Polygon> | null>(null);
  const [filters, setFilters] = useState<FiltersState>({ severity: [], localRoadsOnly: true });
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'area' | 'point'>('area');
  const [selectedLocationKey, setSelectedLocationKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; lat: number; lon: number; bbox?: [number, number, number, number] }>>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [focusArea, setFocusArea] = useState<{ center: [number, number]; bounds?: [[number, number], [number, number]] } | null>(null);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isInstructionDismissed, setIsInstructionDismissed] = useState(false);
  const instructionStorageKey = 'drawInstructionDismissed';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = sessionStorage.getItem(instructionStorageKey);
    if (stored === 'true') {
      setIsInstructionDismissed(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isInstructionDismissed) {
      sessionStorage.setItem(instructionStorageKey, 'true');
    }
  }, [isInstructionDismissed]);

  // Automatically open stats drawer when a polygon is drawn
  useEffect(() => {
    if (polygon) {
      setIsStatsOpen(true);
      setViewMode('area');
      setViewMode('area');
      setSelectedLocationKey(null); // Clear selected point when drawing new polygon
    }
  }, [polygon]);

  const performSearch = async (query: string) => {
    const term = query.trim();
    if (!term) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }
    setSearchLoading(true);
    setSearchError(null);
    console.info('[search] start', term);
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(`${term}, Melbourne, Australia`)}`);
      if (!response.ok) {
        throw new Error('Search failed. Please try again.');
      }
      const data = await response.json();
      const rawFeatures = Array.isArray(data) ? data : Array.isArray((data as any)?.features) ? (data as any).features : [];
      const mapped = rawFeatures
        .map((item: any, idx: number) => {
          const center = Array.isArray(item?.center) && item.center.length === 2 ? item.center : [Number(item.lon), Number(item.lat)];
          const name = item.place_name ?? item.display_name ?? item.text ?? `Result ${idx + 1}`;
          const lat = Number(center?.[1]);
          const lon = Number(center?.[0]);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

          let bbox: [number, number, number, number] | undefined;
          if (Array.isArray(item?.bbox) && item.bbox.length === 4) {
            const [west, south, east, north] = item.bbox.map((n: any) => Number(n));
            if ([west, south, east, north].every((v) => Number.isFinite(v))) {
              // store as [south, north, west, east] to match our existing handling
              bbox = [south, north, west, east];
            }
          }

          return {
            id: typeof item.id === 'string' ? item.id : item.place_id ? String(item.place_id) : String(idx),
            name,
            lat,
            lon,
            bbox
          };
        })
        .filter(Boolean) as Array<{ id: string; name: string; lat: number; lon: number; bbox?: [number, number, number, number] }>;
      setSearchResults(mapped);
      console.info('[search] results', mapped.length);
    } catch (error) {
      console.error('geocode_search_error', error);
      setSearchError(error instanceof Error ? error.message : 'Search failed.');
    } finally {
      setSearchLoading(false);
      console.info('[search] done');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  const handleSelectResult = (result: { lat: number; lon: number; bbox?: [number, number, number, number] }) => {
    setFocusArea(result.bbox ? {
      center: [result.lon, result.lat],
      bounds: [
        [result.bbox[2], result.bbox[0]], // [west, south]
        [result.bbox[3], result.bbox[1]]  // [east, north]
      ]
    } : { center: [result.lon, result.lat] });
    setSearchResults([]);
  };

  const summaryQuery = useSummary(polygon, bounds, filters);
  const crashesQuery = useCrashes(polygon, bounds, filters);
  const crashGeoJson = useMemo(() => toGeoJson(crashesQuery.data), [crashesQuery.data]);

  const selectedPoint = useMemo(() => {
    if (!selectedLocationKey || !crashGeoJson) return null;
    const feature = crashGeoJson.features.find((f) => f.properties.locationKey === selectedLocationKey);
    if (!feature) return null;
    return {
      count: feature.properties.count,
      severity: feature.properties.severity || 'Unknown',
      crashes: feature.properties.crashes,
    };
  }, [selectedLocationKey, crashGeoJson]);

  const handlePointClick = (data: any) => {
    setSelectedLocationKey(data.locationKey);
    setViewMode('point');
    setIsStatsOpen(true);
  };

  const toggleView = (mode: 'area' | 'point') => {
    setViewMode(mode);
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-neutral-100 font-sans">
      {/* Full Screen Map */}
      <div className="absolute inset-0 z-0">
        <MapPanel 
          onPolygonChange={setPolygon} 
          onBoundsChange={setBounds} 
          crashesGeoJson={crashGeoJson} 
          onPointClick={handlePointClick}
          focusArea={focusArea}
        />
        
        {/* Animated Draw Instruction */}
        {!polygon && !isInstructionDismissed && (
          <div className="absolute top-24 right-14 z-20 flex flex-col items-end animate-in fade-in slide-in-from-top-4 duration-700 delay-500 pointer-events-none">
            <div className="relative mr-4">
               {/* Drawn Arrow */}
               <div className="absolute -top-12 right-8 w-24 h-24 pointer-events-none">
                  <AnimatedArrow />
               </div>

               {/* Instruction Card */}
               <div className="pointer-events-auto bg-white/90 backdrop-blur-md border border-white/50 shadow-xl shadow-blue-900/10 rounded-2xl p-4 max-w-[280px] transform transition-all hover:scale-105">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                      <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-neutral-900 mb-1">Start Here</h3>
                      <p className="text-xs text-neutral-600 leading-relaxed">
                        Draw an area on the map to unlock detailed crash insights.
                      </p>
                    </div>
                    <button 
                      onClick={() => setIsInstructionDismissed(true)}
                      className="flex-shrink-0 -mr-1 -mt-1 p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Search Bar */}
      <div className="absolute left-4 top-4 z-20 w-[calc(100%-2rem)] max-w-md flex flex-col gap-2 pointer-events-none">
        <div className="pointer-events-auto relative flex items-center w-full bg-white rounded-full shadow-md hover:shadow-lg transition-shadow duration-200 h-12 border border-transparent focus-within:border-blue-100">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center h-full pl-4">
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 py-2 px-2 outline-none text-neutral-700 placeholder-neutral-500 text-base bg-transparent h-full"
              placeholder="Search location, e.g. Golf View Road, Heatherton" 
            />
          </form>
          <div className="flex items-center pr-1">
              {searchQuery && (
                  <button 
                      onClick={() => setSearchQuery('')}
                      className="p-2 text-neutral-400 hover:text-neutral-600 rounded-full cursor-pointer"
                  >
                      <X className="h-4 w-4" />
                  </button>
              )}
              <div className="h-6 w-px bg-neutral-200 mx-1" />
              <button 
                  onClick={() => performSearch(searchQuery)}
                  disabled={searchLoading}
                  className="p-3 text-blue-600 hover:bg-blue-50 rounded-full transition-colors cursor-pointer disabled:opacity-50"
              >
                  <Search className="h-5 w-5" />
              </button>
          </div>
        </div>
        
        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="pointer-events-auto bg-white rounded-xl shadow-lg border border-neutral-100 overflow-hidden mt-1 max-h-60 overflow-y-auto">
            {searchResults.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => handleSelectResult(result)}
                className="block w-full px-4 py-3 text-left text-sm hover:bg-neutral-50 cursor-pointer border-b border-neutral-50 last:border-0 flex items-center gap-3"
              >
                <MapIcon className="h-4 w-4 text-neutral-400 shrink-0" />
                <span className="truncate">{result.name}</span>
              </button>
            ))}
          </div>
        )}
        
        {searchError && (
             <div className="pointer-events-auto bg-red-50 text-red-600 text-xs px-4 py-2 rounded-lg border border-red-100 shadow-sm">
                 {searchError}
             </div>
        )}

        {/* Compact Filters */}
        <div className="pointer-events-auto w-full overflow-visible">
            <CompactFilters value={filters} onChange={setFilters} disabled={summaryQuery.isFetching} />
        </div>


      </div>

      {/* Stats Drawer / Floating Panel */}
      <div
        className={`absolute bottom-6 right-6 top-6 z-10 flex w-full max-w-[420px] flex-col rounded-3xl bg-white/95 shadow-2xl shadow-neutral-900/10 backdrop-blur-xl transition-all duration-500 cubic-bezier(0.32, 0.72, 0, 1) border border-white/50 ${
          isStatsOpen ? 'translate-x-0 opacity-100' : 'translate-x-[calc(100%+2rem)] opacity-0'
        }`}
      >
        <div className="flex flex-col gap-4 border-b border-neutral-100 p-6">
          <div className="flex items-center justify-between">
            {/* Segmented Control */}
            <div className="flex p-1 bg-neutral-100/80 rounded-xl border border-neutral-200/50">
              <button
                onClick={() => toggleView('area')}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  viewMode === 'area'
                    ? 'bg-white text-neutral-900 shadow-sm ring-1 ring-black/5'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                Area Insights
              </button>
              <button
                onClick={() => toggleView('point')}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  viewMode === 'point'
                    ? 'bg-white text-neutral-900 shadow-sm ring-1 ring-black/5'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                Point Details
              </button>
            </div>

            <button
              onClick={() => {
                setIsStatsOpen(false);
                // Don't clear selected point so we can come back to it
              }}
              className="group rounded-full bg-neutral-100 p-2 transition-colors hover:bg-neutral-200 cursor-pointer"
            >
              <X className="h-5 w-5 text-neutral-500 transition-transform group-hover:rotate-90" />
            </button>
          </div>

          {/* Context Subtitle */}
          <div className="px-1">
             <p className="text-sm font-medium text-neutral-500 animate-in fade-in slide-in-from-left-2 duration-300 key={viewMode}">
               {viewMode === 'point'
                 ? (selectedPoint
                     ? `${selectedPoint.count} crash${selectedPoint.count === 1 ? '' : 'es'} at selected location`
                     : 'Select a location on the map')
                 : 'Crash statistics for your selected region'}
             </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          {viewMode === 'point' ? (
            selectedPoint ? (
              <PointStats point={selectedPoint} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-neutral-500 animate-in fade-in zoom-in-95 duration-300">
                <div className="h-12 w-12 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
                    <MapIcon className="h-6 w-6 text-neutral-400" />
                </div>
                <p className="font-medium text-neutral-900">Select a location</p>
                <p className="text-xs mt-1 max-w-[200px]">Click on any crash point on the map to view detailed breakdown.</p>
              </div>
            )
          ) : (
            <>
              <SummarySection query={summaryQuery} hasPolygon={Boolean(polygon || bounds)} />
              <div className="mt-8">
                  <CrashStatus query={crashesQuery} hasPolygon={Boolean(polygon || bounds)} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Toggle Button for Stats (when closed) */}
      {!isStatsOpen && (
        <button
          onClick={() => setIsStatsOpen(true)}
          className="absolute bottom-8 right-8 z-10 flex items-center gap-2.5 rounded-full bg-neutral-900 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-neutral-900/20 transition-all hover:scale-105 hover:bg-neutral-800 active:scale-95 cursor-pointer"
        >
          <TrendingUp className="h-4 w-4" />
          View Insights
        </button>
      )}

      {/* Map Legend */}
      <div className="absolute bottom-6 left-6 z-10 flex flex-col items-start">
        <div 
            className={`rounded-2xl bg-white/95 shadow-xl shadow-neutral-200/50 backdrop-blur-md border border-white/20 overflow-hidden transition-all duration-300 ease-in-out ${isLegendOpen ? 'min-w-[240px]' : 'min-w-0'}`}
        >
            <button 
                onClick={() => setIsLegendOpen(!isLegendOpen)}
                className="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-neutral-50 transition-colors cursor-pointer"
            >
                <div className="flex items-center gap-2">
                    {!isLegendOpen && (
                       <div className="flex -space-x-1.5">
                          <div className="h-2.5 w-2.5 rounded-full bg-[#dc2626] ring-1 ring-white"></div>
                          <div className="h-2.5 w-2.5 rounded-full bg-[#ea580c] ring-1 ring-white"></div>
                          <div className="h-2.5 w-2.5 rounded-full bg-[#15803d] ring-1 ring-white"></div>
                          <div className="h-2.5 w-2.5 rounded-full bg-[#86efac] ring-1 ring-white"></div>
                       </div>
                    )}
                    <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                        {isLegendOpen ? 'Crash Severity' : 'Legend'}
                    </span>
                </div>
                <ChevronUp className={`h-4 w-4 text-neutral-400 ml-auto transition-transform duration-300 ${isLegendOpen ? 'rotate-180' : ''}`} />
            </button>
            
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isLegendOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-3 pt-0 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-3 w-3 rounded-full bg-[#dc2626] border border-white shadow-sm"></div>
                    <span className="text-xs font-medium text-neutral-700">Fatal accident</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="h-3 w-3 rounded-full bg-[#ea580c] border border-white shadow-sm"></div>
                    <span className="text-xs font-medium text-neutral-700">Serious injury</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="h-3 w-3 rounded-full bg-[#15803d] border border-white shadow-sm"></div>
                    <span className="text-xs font-medium text-neutral-700">Other injury</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="h-3 w-3 rounded-full bg-[#86efac] border border-white shadow-sm"></div>
                    <span className="text-xs font-medium text-neutral-700">Non injury</span>
                  </div>
                  <div className="pt-2 mt-2 border-t border-neutral-100">
                    <p className="text-[10px] text-neutral-500 italic">Dot size = crash count at location</p>
                  </div>
                </div>
            </div>
        </div>
      </div>
    </main>
  );
}

function CrashStatus({
  query,
  hasPolygon
}: {
  query: UseQueryResult<CrashesResponse, Error>;
  hasPolygon: boolean;
}) {
  if (!hasPolygon) return null;
  
  if (query.isLoading) {
    return (
        <div className="flex items-center gap-2 text-sm font-medium text-neutral-400 animate-pulse">
            <div className="h-2 w-2 rounded-full bg-neutral-400" />
            Loading crash points...
        </div>
    );
  }
  
  if (query.isError) {
    return <p className="text-sm font-medium text-red-500 bg-red-50 px-3 py-2 rounded-lg">{query.error.message || 'Failed to load crash points.'}</p>;
  }
  
  if (!query.data?.results?.length) {
    return <p className="text-sm font-medium text-neutral-400">No crash points mapped.</p>;
  }
  
  if (query.data.results.length >= 5000) {
    return (
      <div className="rounded-xl bg-amber-50/80 p-4 text-xs font-medium text-amber-900 border border-amber-100 flex gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
        <div className="space-y-1">
            <p className="font-bold text-amber-800">High Density Area</p>
            <p>Showing the latest 5,000 crashes. Zoom in or draw a smaller area for more detail.</p>
        </div>
      </div>
    );
  }
  return null;
}



function SummarySection({ query, hasPolygon }: { query: SummaryQuery; hasPolygon: boolean }) {
  if (!hasPolygon) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="h-16 w-16 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4 text-neutral-400">
            <MapIcon className="h-8 w-8" />
        </div>
        <p className="text-sm font-medium text-neutral-500 max-w-[200px]">
          Draw a polygon on the map to see statistics.
        </p>
      </div>
    );
  }

  if (query.isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
            <div className="h-32 rounded-2xl bg-neutral-100 animate-pulse" />
            <div className="h-32 rounded-2xl bg-neutral-100 animate-pulse" />
        </div>
        <div className="space-y-3">
            <div className="h-8 w-1/3 bg-neutral-100 rounded-lg animate-pulse" />
            <div className="h-48 rounded-2xl bg-neutral-100 animate-pulse" />
        </div>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="rounded-2xl bg-red-50 p-6 text-center">
        <p className="text-sm font-medium text-red-800">
            {query.error.message || 'Unable to fetch summary.'}
        </p>
        <button className="mt-2 text-xs font-bold text-red-600 hover:underline cursor-pointer">Try Again</button>
      </div>
    );
  }

  if (!query.data || query.data.total === 0) {
    return (
      <div className="rounded-2xl bg-neutral-50 p-8 text-center border border-neutral-100">
        <p className="text-neutral-900 font-semibold">No Data Found</p>
        <p className="text-sm text-neutral-500 mt-1">Try adjusting your filters or selecting a different area.</p>
      </div>
    );
  }

  const { total, latestAccidentDate, bySeverity, byType } = query.data;
  const breakdown = {
    bySpeedZone: query.data.bySpeedZone,
    byRoadGeometry: query.data.byRoadGeometry,
    byDayOfWeek: query.data.byDayOfWeek,
    byLightCondition: query.data.byLightCondition
  };
  const topDcaDescriptions = query.data.byDcaCodeDescription;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-3 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-4 text-white shadow-lg shadow-blue-600/20 relative overflow-hidden">
            <div className="absolute -right-6 -top-6 p-4 opacity-10">
                <TrendingUp className="h-24 w-24" />
            </div>
            <div className="flex items-end justify-between relative z-10">
                <div>
                    <p className="text-blue-100 text-xs font-medium mb-0.5">Total Crashes</p>
                    <p className="text-3xl font-bold tracking-tight leading-none">{formatNumber(total)}</p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-blue-200 bg-blue-500/20 px-2 py-1 rounded-md backdrop-blur-sm">
                    <span>Latest: {latestAccidentDate ? formatDate(latestAccidentDate) : 'N/A'}</span>
                </div>
            </div>
        </div>
        
        <StatTile 
            icon={<Users className="h-4 w-4" />} 
            label="Persons" 
            value={query.data.totals.persons} 
            color="bg-orange-50 text-orange-600"
        />
        <StatTile 
            icon={<AlertTriangle className="h-4 w-4" />} 
            label="Pedestrians" 
            value={query.data.totals.pedestrians} 
            color="bg-rose-50 text-rose-600"
        />
        <StatTile 
            icon={<Bike className="h-4 w-4" />} 
            label="Cyclists" 
            value={query.data.totals.cyclists} 
            color="bg-emerald-50 text-emerald-600"
        />
        <StatTile 
            icon={<Truck className="h-4 w-4" />} 
            label="Heavy Vehicles" 
            value={query.data.totals.heavyVehicles} 
            color="bg-purple-50 text-purple-600"
        />
        <StatTile 
            icon={<Bike className="h-4 w-4" />} 
            label="Motorcycles" 
            value={query.data.totals.motorcyclists} 
            color="bg-amber-50 text-amber-600"
        /> 

      </div>

      <div className="space-y-8">
        <Section title="Severity Impact">
            <BucketList buckets={bySeverity} colorClass="bg-rose-500" />
        </Section>

        <Section title="Crash Types">
             <BucketList buckets={byType.slice(0, 5)} colorClass="bg-blue-500" />
        </Section>

        <Section title="Crash Configurations (DCA)">
             <BucketList buckets={topDcaDescriptions.slice(0, 6)} colorClass="bg-indigo-500" formatter={formatDcaDescription} />
        </Section>
      </div>
      
      <DetailedBreakdown breakdown={breakdown} />
    </div>
  );
}

function DetailedBreakdown({
  breakdown
}: {
  breakdown: {
    bySpeedZone: SummaryBucket[];
    byRoadGeometry: SummaryBucket[];
    byDayOfWeek: SummaryBucket[];
    byLightCondition: SummaryBucket[];
  };
}) {
  return (
    <div className="space-y-8 pt-8 border-t border-neutral-100">
          <Section title="Speed Zones">
             <div className="h-48 w-full">
                <BarChartComponent 
                  data={breakdown.bySpeedZone
                .map(b => ({ ...b, bucket: formatSpeedZone(b.bucket, false) }))
                .sort((a, b) => {
                  const valA = parseInt(a.bucket);
                  const valB = parseInt(b.bucket);
                  if (isNaN(valA)) return 1;
                  if (isNaN(valB)) return -1;
                  return valA - valB;
                })} 
              color="#0ea5e9" 
            />
         </div>
      </Section>
      
      <Section title="Road Geometry">
        <div className="h-48 w-full">
           <BarChartComponent data={breakdown.byRoadGeometry.slice(0, 6)} color="#8b5cf6" />
        </div>
      </Section>
      
      <Section title="Day of Week">
        <div className="h-56 w-full -ml-4">
          <PieChartComponent data={breakdown.byDayOfWeek} />
        </div>
      </Section>
      
      <Section title="Light Conditions">
        <div className="h-48 w-full">
          <BarChartComponent data={breakdown.byLightCondition.slice(0, 6)} color="#f59e0b" />
        </div>
      </Section>
    </div>
  );
}

// --- Components ---

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                {title}
                <div className="h-px flex-1 bg-neutral-100" />
            </h3>
            {children}
        </div>
    );
}

function StatTile({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
    return (
        <div className="flex flex-col justify-between rounded-xl bg-white p-3 shadow-sm border border-neutral-100 transition-transform hover:scale-[1.02]">
            <div className={`w-fit rounded-md p-1.5 ${color} mb-2`}>
                {icon}
            </div>
            <div>
                <p className="text-xl font-bold text-neutral-900">{formatNumber(value)}</p>
                <p className="text-[10px] font-medium text-neutral-500">{label}</p>
            </div>
        </div>
    );
}

function BucketList({
  buckets,
  formatter,
  colorClass = "bg-blue-500"
}: {
  buckets: SummaryBucket[];
  formatter?: (bucket: string) => string;
  colorClass?: string;
}) {
  const max = Math.max(...buckets.map(b => b.count));
  
  return (
    <div className="space-y-3">
      {buckets.map((bucket) => (
        <div key={bucket.bucket} className="group">
            <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="font-medium text-neutral-700 truncate pr-4">{formatter ? formatter(bucket.bucket) : bucket.bucket}</span>
                <span className="font-bold text-neutral-900">{formatNumber(bucket.count)}</span>
            </div>
            <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                <div 
                    className={`h-full ${colorClass} rounded-full transition-all duration-1000 ease-out`} 
                    style={{ width: `${(bucket.count / max) * 100}%` }} 
                />
            </div>
        </div>
      ))}
    </div>
  );
}

function BarChartComponent({ data, color = "#3b82f6" }: { data: SummaryBucket[], color?: string }) {
  const chartData = data.map((bucket) => ({ name: bucket.bucket, value: bucket.count }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
        <XAxis 
            dataKey="name" 
            tick={{ fontSize: 10, fill: '#a3a3a3', fontWeight: 500 }} 
            axisLine={false}
            tickLine={false}
            interval={0}
            height={20}
            tickFormatter={(val) => val.length > 10 ? val.slice(0, 10) + '...' : val}
        />
        <YAxis 
            allowDecimals={false} 
            tick={{ fontSize: 10, fill: '#a3a3a3', fontWeight: 500 }} 
            axisLine={false}
            tickLine={false}
        />
        <Tooltip 
            cursor={{ fill: '#f9fafb' }}
            content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                return (
                    <div className="rounded-xl border border-neutral-100 bg-white p-3 shadow-xl">
                    <p className="text-xs font-medium text-neutral-500 mb-1">{label}</p>
                    <p className="text-lg font-bold text-neutral-900">{payload[0].value}</p>
                    </div>
                );
                }
                return null;
            }}
        />
        <Bar dataKey="value" fill={color} radius={[6, 6, 6, 6]} barSize={32}>
          <LabelList dataKey="value" position="top" className="text-[10px] font-bold fill-neutral-600" fontSize={10} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#f43f5e', '#10b981', '#f59e0b', '#06b6d4'];

function PieChartComponent({ data }: { data: SummaryBucket[] }) {
  const chartData = data.map((bucket) => ({ name: bucket.bucket, value: bucket.count }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie 
            data={chartData} 
            dataKey="value" 
            nameKey="name" 
            cx="50%" 
            cy="50%" 
            innerRadius={40} 
            outerRadius={70} 
            paddingAngle={4}
            stroke="none"
            cornerRadius={6}
            label={({ cx, cy, midAngle, innerRadius, outerRadius, name, value }) => {
              const RADIAN = Math.PI / 180;
              const radius = outerRadius + 15;
              const midAngleVal = midAngle ?? 0;
              const x = cx + radius * Math.cos(-midAngleVal * RADIAN);
              const y = cy + radius * Math.sin(-midAngleVal * RADIAN);
              
              return (
                <text 
                  x={x} 
                  y={y} 
                  fill="#525252" 
                  textAnchor={x > cx ? 'start' : 'end'} 
                  dominantBaseline="central" 
                  className="text-[10px] font-medium"
                >
                  {`${name} (${value})`}
                </text>
              );
            }}
            labelLine={true}
        >
          {chartData.map((entry, index) => (
            <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
            content={({ active, payload }) => {
                if (active && payload && payload.length) {
                return (
                    <div className="rounded-xl border border-neutral-100 bg-white p-3 shadow-xl">
                    <p className="text-xs font-medium text-neutral-500 mb-1">{payload[0].name}</p>
                    <p className="text-lg font-bold text-neutral-900">{payload[0].value}</p>
                    </div>
                );
                }
                return null;
            }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// --- Helpers ---

function useSummary(polygon: Feature<Polygon | MultiPolygon> | null, bounds: Feature<Polygon> | null, filters: FiltersState) {
  const severityKey = useMemo(() => [...filters.severity].sort().join('|'), [filters.severity]);
  const body = useMemo(() => {
    if (!polygon && !bounds) {
      return null;
    }
    const payload: Record<string, unknown> = {};
    if (polygon) {
      payload.polygon = polygon;
    } else if (bounds) {
      payload.polygon = bounds;
    }

    const sanitizedFilters: FiltersState = {
      severity: filters.severity,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      localRoadsOnly: filters.localRoadsOnly ? true : undefined,
    };
    if (sanitizedFilters.severity.length || sanitizedFilters.dateFrom || sanitizedFilters.dateTo || sanitizedFilters.localRoadsOnly) {
      payload.filters = sanitizedFilters;
    }
    return payload;
  }, [polygon, bounds, filters.severity, filters.dateFrom, filters.dateTo, filters.localRoadsOnly]);

  return useQuery<SummaryResponse, Error>({
    queryKey: [
      'summary',
      polygon ? 'polygon' : 'bounds',
      polygon ? JSON.stringify(polygon.geometry) : (bounds ? JSON.stringify(bounds.geometry) : 'all'),
      filters.dateFrom ?? '',
      filters.dateTo ?? '',
      severityKey,
      filters.localRoadsOnly ? 'local-only' : 'all-roads'
    ],
    queryFn: async () => {
      const response = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody?.error ?? 'Failed to fetch summary');
      }
      return (await response.json()) as SummaryResponse;
    },
    enabled: Boolean(body),
  });
}

function useCrashes(polygon: Feature<Polygon | MultiPolygon> | null, _bounds: Feature<Polygon> | null, filters: FiltersState) {
  const severityKey = useMemo(() => [...filters.severity].sort().join('|'), [filters.severity]);
  const body = useMemo(() => {
    const payload: Record<string, unknown> = {};
    if (polygon) {
      payload.polygon = polygon;
    }
    const sanitizedFilters: FiltersState = {
      severity: filters.severity,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      localRoadsOnly: filters.localRoadsOnly ? true : undefined,
    };
    if (sanitizedFilters.severity.length || sanitizedFilters.dateFrom || sanitizedFilters.dateTo || sanitizedFilters.localRoadsOnly) {
      payload.filters = sanitizedFilters;
    }
    return payload;
  }, [polygon, filters.severity, filters.dateFrom, filters.dateTo, filters.localRoadsOnly]);

  return useQuery<CrashesResponse, Error>({
    queryKey: [
      'crashes',
      polygon ? 'polygon' : 'all',
      polygon ? JSON.stringify(polygon.geometry) : 'all',
      filters.dateFrom ?? '',
      filters.dateTo ?? '',
      severityKey,
      filters.localRoadsOnly ? 'local-only' : 'all-roads'
    ],
    queryFn: async () => {
      const response = await fetch('/api/crashes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody?.error ?? 'Failed to fetch crashes');
      }
      return (await response.json()) as CrashesResponse;
    },
    enabled: true,
    refetchOnMount: true,
  });
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatSpeedZone(bucket: string | null, includeUnit = true) {
  if (!bucket || bucket === 'Unknown') {
    return bucket ?? 'Unknown';
  }
  if (!Number.isNaN(Number(bucket))) {
    return includeUnit ? `${bucket} km/h` : `${bucket}`;
  }
  return bucket;
}

function formatDcaDescription(bucket: string) {
  if (!bucket) return 'Unknown';
  const trimmed = bucket.trim();
  if (!trimmed || trimmed.toLowerCase() === 'unknown') {
    return 'Unknown';
  }
  const cleaned = trimmed.replace(/\s+/g, ' ');
  const sentence = cleaned.toLowerCase();
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

function toGeoJson(response?: CrashesResponse | null) {
  if (!response?.results?.length) {
    return null;
  }



  // Define severity ranking (higher number = more severe)
  const severityRank: Record<string, number> = {
    'Fatal accident': 4,
    'Serious injury accident': 3,
    'Other injury accident': 2
  };

  // Group crashes by location (lat/lon)
  const locationMap = new Map<string, {
    locationKey: string;
    count: number;
    mostSevere: string | null;
    severityRank: number;
    crashes: typeof response.results;
    lon: number;
    lat: number;
  }>();

  response.results.forEach((point) => {
    const key = `${point.lat.toFixed(6)},${point.lon.toFixed(6)}`;
    const existing = locationMap.get(key);
    const pointSeverityRank = severityRank[point.severity || ''] || 0;

    if (existing) {
      existing.count++;
      existing.crashes.push(point);
      // Update to most severe
      if (pointSeverityRank > existing.severityRank) {
        existing.mostSevere = point.severity;
        existing.severityRank = pointSeverityRank;
      }
    } else {
      locationMap.set(key, {
        locationKey: key,
        count: 1,
        mostSevere: point.severity,
        severityRank: pointSeverityRank,
        crashes: [point],
        lon: point.lon,
        lat: point.lat,
      });
    }
  });

  // Convert to GeoJSON features
  return {
    type: 'FeatureCollection',
    features: Array.from(locationMap.values()).map((location) => ({
      type: 'Feature',
      properties: {
        locationKey: location.locationKey,
        count: location.count,
        severity: location.mostSevere,
        severityRank: location.severityRank,
        crashes: location.crashes,
        // Include first accident details for popup
        accidentNo: location.crashes[0].accidentNo,
        accidentDate: location.crashes[0].accidentDate,
      },
      geometry: {
        type: 'Point',
        coordinates: [location.lon, location.lat],
      },
    })),
  } satisfies FeatureCollection<Point>;
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Feature, FeatureCollection, MultiPolygon, Point, Polygon } from 'geojson';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { ChevronUp, Map as MapIcon, Filter, X, TrendingUp, Users, Car, Bike, Truck, AlertTriangle, Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

import { MapPanel } from '@/components/map-panel';
import { FiltersPanel, type FiltersState } from '@/components/filters-panel';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, LabelList } from 'recharts';

type SummaryBucket = { bucket: string; count: number };

type SummaryResponse = {
  total: number;
  bySeverity: SummaryBucket[];
  byType: SummaryBucket[];
  bySpeedZone: SummaryBucket[];
  byRoadGeometry: SummaryBucket[];
  byDayOfWeek: SummaryBucket[];
  byLightCondition: SummaryBucket[];
  totals: {
    persons: number;
    pedestrians: number;
    cyclists: number;
    heavyVehicles: number;
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
  severity: string | null;
  accidentType: string | null;
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
              <div className="space-y-1">
                <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  crash.severity === 'Fatal accident' ? 'bg-red-100 text-red-700' :
                  crash.severity === 'Serious injury accident' ? 'bg-orange-100 text-orange-700' :
                  crash.severity === 'Other injury accident' ? 'bg-amber-100 text-amber-700' :
                  'bg-emerald-100 text-emerald-700'
                }`}>
                  {crash.severity?.replace(' accident', '')}
                </div>
                <h4 className="font-bold text-neutral-900 text-sm leading-tight">{crash.accidentType}</h4>
              </div>
              <div className="text-[10px] font-mono text-neutral-400 bg-neutral-50 px-2 py-1 rounded-md">
                #{crash.accidentNo}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-neutral-600 mb-3">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                <span>{formatDate(crash.accidentDate)}</span>
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

export default function HomePage() {
  const [polygon, setPolygon] = useState<Feature<Polygon | MultiPolygon> | null>(null);
  const [bounds, setBounds] = useState<Feature<Polygon> | null>(null);
  const [filters, setFilters] = useState<FiltersState>({ severity: [] });
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'area' | 'point'>('area');
  const [selectedPoint, setSelectedPoint] = useState<{
    count: number;
    severity: string;
    crashes: CrashPoint[];
  } | null>(null);

  // Automatically open stats drawer when a polygon is drawn
  useEffect(() => {
    if (polygon) {
      setIsStatsOpen(true);
      setViewMode('area');
      setSelectedPoint(null); // Clear selected point when drawing new polygon
    }
  }, [polygon]);

  const summaryQuery = useSummary(polygon, bounds, filters);
  const crashesQuery = useCrashes(polygon, bounds, filters);
  const crashGeoJson = useMemo(() => toGeoJson(crashesQuery.data), [crashesQuery.data]);

  const handlePointClick = (data: any) => {
    let crashes = data.crashes;
    if (typeof crashes === 'string') {
        try {
            crashes = JSON.parse(crashes);
        } catch (e) {
            console.error('Failed to parse crashes', e);
            crashes = [];
        }
    }

    setSelectedPoint({
      count: data.count,
      severity: data.severity,
      crashes: crashes
    });
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
        />
      </div>

      {/* Floating Header / Controls */}
      <div className="absolute left-6 top-6 z-10 flex max-w-sm flex-col gap-4 pointer-events-none">
        <div className="pointer-events-auto rounded-2xl bg-white/90 p-5 shadow-xl shadow-neutral-200/50 backdrop-blur-md transition-all hover:bg-white/95 border border-white/20">
          <header className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                <MapIcon className="h-4 w-4" />
              </div>
              <p className="text-sm font-bold tracking-wide text-neutral-900">CRASHSTATS</p>
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight text-neutral-900">Victoria Crash Data</h1>
              <p className="mt-1 text-sm text-neutral-500 font-medium">
                Draw a polygon to analyze statistics.
              </p>
            </div>
          </header>
        </div>

        {/* Filters Panel */}
        <div className="pointer-events-auto rounded-2xl bg-white/95 shadow-xl shadow-neutral-200/50 backdrop-blur-md transition-all hover:bg-white border border-white/20">
           <div className="px-5 py-4 flex items-center gap-2.5 text-sm font-bold text-neutral-900 border-b border-neutral-100 bg-gradient-to-r from-neutral-50/50 to-transparent rounded-t-2xl">
              <Filter className="h-4 w-4 text-blue-600" />
              <span>Filters</span>
           </div>
           <div className="p-5 rounded-b-2xl">
             <FiltersPanel value={filters} onChange={setFilters} disabled={summaryQuery.isFetching} />
           </div>
        </div>
      </div>

      {/* Stats Drawer / Floating Panel */}
      <div
        className={`absolute bottom-6 right-6 top-6 z-10 flex w-full max-w-[420px] flex-col rounded-3xl bg-white/95 shadow-2xl shadow-neutral-900/10 backdrop-blur-xl transition-all duration-500 cubic-bezier(0.32, 0.72, 0, 1) border border-white/50 ${
          isStatsOpen ? 'translate-x-0 opacity-100' : 'translate-x-[calc(100%+2rem)] opacity-0'
        }`}
      >
        <div className="flex items-center justify-between border-b border-neutral-100 p-6">
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-1">
                <button 
                  onClick={() => toggleView('area')}
                  className={`p-1 rounded-md transition-all ${viewMode === 'area' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'}`}
                  title="Polygon Insights"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => toggleView('point')}
                  className={`p-1 rounded-md transition-all ${viewMode === 'point' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'}`}
                  title="Location Details"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
             </div>
             <div>
                <h2 className="text-xl font-bold text-neutral-900">{viewMode === 'point' ? 'Point Location Details' : 'Area Insights'}</h2>
                <p className="text-xs font-medium text-neutral-400 mt-0.5">
                  {viewMode === 'point'
                    ? (selectedPoint 
                        ? `${selectedPoint.count} crash${selectedPoint.count === 1 ? '' : 'es'} at your selected location`
                        : 'Select a location on the map')
                    : 'Crash statistics for your selected region'}
                </p>
             </div>
          </div>
          <button
            onClick={() => {
              setIsStatsOpen(false);
              // Don't clear selected point so we can come back to it
            }}
            className="group rounded-full bg-neutral-100 p-2 transition-colors hover:bg-neutral-200"
          >
            <X className="h-5 w-5 text-neutral-500 transition-transform group-hover:rotate-90" />
          </button>
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
          className="absolute bottom-8 right-8 z-10 flex items-center gap-2.5 rounded-full bg-neutral-900 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-neutral-900/20 transition-all hover:scale-105 hover:bg-neutral-800 active:scale-95"
        >
          <TrendingUp className="h-4 w-4" />
          View Insights
        </button>
      )}

      {/* Map Legend */}
      <div className="absolute bottom-6 left-6 z-10 rounded-2xl bg-white/95 shadow-xl shadow-neutral-200/50 backdrop-blur-md border border-white/20 overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-100 bg-gradient-to-r from-neutral-50/50 to-transparent">
          <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Crash Severity</h3>
        </div>
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="h-3 w-3 rounded-full bg-[#dc2626] border border-white shadow-sm"></div>
            <span className="text-xs font-medium text-neutral-700">Fatal accident</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="h-3 w-3 rounded-full bg-[#ea580c] border border-white shadow-sm"></div>
            <span className="text-xs font-medium text-neutral-700">Serious injury</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="h-3 w-3 rounded-full bg-[#f59e0b] border border-white shadow-sm"></div>
            <span className="text-xs font-medium text-neutral-700">Other injury</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="h-3 w-3 rounded-full bg-[#10b981] border border-white shadow-sm"></div>
            <span className="text-xs font-medium text-neutral-700">Non injury</span>
          </div>
          <div className="pt-2 mt-2 border-t border-neutral-100">
            <p className="text-[10px] text-neutral-500 italic">Dot size = crash count at location</p>
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
  
  if (query.data.results.length >= 2000) {
    return (
      <div className="rounded-xl bg-amber-50/80 p-4 text-xs font-medium text-amber-900 border border-amber-100 flex gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
        <div className="space-y-1">
            <p className="font-bold text-amber-800">High Density Area</p>
            <p>Showing the latest 2,000 crashes. Zoom in or draw a smaller area for more detail.</p>
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
        <button className="mt-2 text-xs font-bold text-red-600 hover:underline">Try Again</button>
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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 rounded-3xl bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-white shadow-lg shadow-blue-600/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <TrendingUp className="h-24 w-24" />
            </div>
            <p className="text-blue-100 text-sm font-medium mb-1">Total Crashes</p>
            <p className="text-5xl font-bold tracking-tight">{formatNumber(total)}</p>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-blue-200 bg-blue-500/20 w-fit px-2 py-1 rounded-lg backdrop-blur-sm">
                <span>Latest: {latestAccidentDate ?? 'N/A'}</span>
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
      </div>

      <div className="space-y-8">
        <Section title="Severity Impact">
            <BucketList buckets={bySeverity} colorClass="bg-rose-500" />
        </Section>

        <Section title="Crash Types">
             <BucketList buckets={byType.slice(0, 5)} colorClass="bg-blue-500" />
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
                .map(b => ({ ...b, bucket: formatSpeedZone(b.bucket) }))
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
        <div className="flex flex-col justify-between rounded-2xl bg-white p-4 shadow-sm border border-neutral-100 transition-transform hover:scale-[1.02]">
            <div className={`w-fit rounded-lg p-2 ${color} mb-3`}>
                {icon}
            </div>
            <div>
                <p className="text-2xl font-bold text-neutral-900">{formatNumber(value)}</p>
                <p className="text-xs font-medium text-neutral-500">{label}</p>
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
    };
    if (sanitizedFilters.severity.length || sanitizedFilters.dateFrom || sanitizedFilters.dateTo) {
      payload.filters = sanitizedFilters;
    }
    return payload;
  }, [polygon, bounds, filters.severity, filters.dateFrom, filters.dateTo]);

  return useQuery<SummaryResponse, Error>({
    queryKey: ['summary', polygon ? 'polygon' : 'bounds', polygon ? JSON.stringify(polygon.geometry) : (bounds ? JSON.stringify(bounds.geometry) : 'all'), filters.dateFrom ?? '', filters.dateTo ?? '', severityKey],
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

function useCrashes(polygon: Feature<Polygon | MultiPolygon> | null, bounds: Feature<Polygon> | null, filters: FiltersState) {
  const severityKey = useMemo(() => [...filters.severity].sort().join('|'), [filters.severity]);
  const body = useMemo(() => {
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
    };
    if (sanitizedFilters.severity.length || sanitizedFilters.dateFrom || sanitizedFilters.dateTo) {
      payload.filters = sanitizedFilters;
    }
    return payload;
  }, [polygon, bounds, filters.severity, filters.dateFrom, filters.dateTo]);

  // Create a unique identifier that changes when polygon presence changes
  const polygonState = polygon ? 'polygon' : 'bounds';

  return useQuery<CrashesResponse, Error>({
    queryKey: ['crashes', polygonState, polygon ? JSON.stringify(polygon.geometry) : (bounds ? JSON.stringify(bounds.geometry) : 'all'), filters.dateFrom ?? '', filters.dateTo ?? '', severityKey],
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

function formatSpeedZone(bucket: string | null) {
  if (!bucket || bucket === 'Unknown') {
    return bucket ?? 'Unknown';
  }
  if (!Number.isNaN(Number(bucket))) {
    return `${bucket} km/h`;
  }
  return bucket;
}

function toGeoJson(response?: CrashesResponse | null) {
  if (!response?.results?.length) {
    return null;
  }

  // Define severity ranking (higher number = more severe)
  const severityRank: Record<string, number> = {
    'Fatal accident': 4,
    'Serious injury accident': 3,
    'Other injury accident': 2,
    'Non injury accident': 1,
  };

  // Group crashes by location (lat/lon)
  const locationMap = new Map<string, {
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

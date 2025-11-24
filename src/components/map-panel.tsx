'use client';

import { useEffect, useRef, useState } from "react";
import maplibregl, { Map } from "maplibre-gl";
import type { Feature, FeatureCollection, MultiPolygon, Point, Polygon } from "geojson";
import MapLibreGLDraw from "maplibre-gl-draw";
import { PenTool, Trash2, X } from "lucide-react";

type MapPanelProps = {
  onPolygonChange: (feature: Feature<Polygon | MultiPolygon> | null) => void;
  onBoundsChange?: (feature: Feature<Polygon> | null) => void;
  crashesGeoJson?: FeatureCollection<Point> | null;
  onPointClick?: (data: any) => void;
  focusArea?: {
    center: maplibregl.LngLatLike;
    bounds?: [[number, number], [number, number]];
  } | null;
};

const MAP_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ??
  "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";
const KINGSTON_CENTER: maplibregl.LngLatLike = [145.05855018213796, -38];
const INITIAL_ZOOM = Number(process.env.NEXT_PUBLIC_INITIAL_ZOOM ?? 10.8);
const IS_E2E_MODE = process.env.NEXT_PUBLIC_E2E === "true";
const SAMPLE_E2E_POLYGON: Feature<Polygon> = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [144.7, -38.2],
        [145.4, -38.2],
        [145.4, -37.6],
        [144.7, -37.6],
        [144.7, -38.2]
      ]
    ]
  }
};

export function MapPanel({ onPolygonChange, onBoundsChange, crashesGeoJson, onPointClick, focusArea }: MapPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const drawRef = useRef<MapLibreGLDraw | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasPolygon, setHasPolygon] = useState(false);

  useEffect(() => {
    if (IS_E2E_MODE) {
      return;
    }

    if (!containerRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: KINGSTON_CENTER,
      zoom: INITIAL_ZOOM,
      attributionControl: {}
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    const draw = new MapLibreGLDraw({
      displayControlsDefault: false,
      controls: {}, // Disable default controls
      defaultMode: 'simple_select'
    });
    drawRef.current = draw;
    map.addControl(draw, "top-right");

    const updateBounds = () => {
      if (!onBoundsChange) return;
      const bounds = map.getBounds();
      const polygon: Feature<Polygon> = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [bounds.getWest(), bounds.getSouth()],
              [bounds.getEast(), bounds.getSouth()],
              [bounds.getEast(), bounds.getNorth()],
              [bounds.getWest(), bounds.getNorth()],
              [bounds.getWest(), bounds.getSouth()]
            ]
          ]
        }
      };
      onBoundsChange(polygon);
    };

    map.on("load", () => {
      enhanceLabelVisibility(map);
      updateBounds();
    });

    map.on("moveend", updateBounds);

    const handleUpdate = () => {
      const collection = draw.getAll();
      const feature = collection.features.at(-1) as Feature<Polygon | MultiPolygon> | undefined;
      onPolygonChange(feature ?? null);
      setHasPolygon(!!feature);
      
      // If we just finished drawing, switch back to simple_select
      if ((draw as any).getMode() === 'draw_polygon') {
         // The mode change event will handle setIsDrawing(false)
      }
    };

    const handleModeChange = (e: any) => {
      setIsDrawing(e.mode === 'draw_polygon');
    };

    map.on("draw.create", handleUpdate);
    map.on("draw.update", handleUpdate);
    map.on("draw.delete", handleUpdate);
    map.on("draw.modechange", handleModeChange);

    // Add keyboard support for deleting polygons
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if Delete or Backspace key is pressed
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selectedFeatures = draw.getSelected();
        if (selectedFeatures.features.length > 0) {
          // Prevent default behavior (e.g., browser back navigation for Backspace)
          e.preventDefault();
          // Delete all selected features
          const featureIds = selectedFeatures.features
            .map((f: any) => f.id)
            .filter((id: any): id is string => typeof id === 'string');
          if (featureIds.length > 0) {
            draw.delete(featureIds);
            handleUpdate(); // Manually trigger update since draw.delete might not fire draw.delete event in all versions/cases immediately or we want to be sure
          }
        }
      }
    };

    // Add keyboard listener to the document
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      map.off("draw.create", handleUpdate);
      map.off("draw.update", handleUpdate);
      map.off("draw.delete", handleUpdate);
      map.off("draw.modechange", handleModeChange);
      map.off("moveend", updateBounds);
      document.removeEventListener('keydown', handleKeyDown);
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
    };
  }, [onPolygonChange, onBoundsChange]);

  useEffect(() => {
    if (!mapRef.current || IS_E2E_MODE) {
      return;
    }
    
    if (!crashesGeoJson) {
      // Clear the layer when there's no data (e.g., filters result in no matches)
      clearCrashLayer(mapRef.current);
      return;
    }
    
    addOrUpdateCrashLayer(mapRef.current, crashesGeoJson);
  }, [crashesGeoJson]);

  // Handle external focus requests (search)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || IS_E2E_MODE || !focusArea) return;

    const fly = () => {
      if (focusArea.bounds) {
        map.fitBounds(focusArea.bounds, { padding: 40, duration: 800 });
      } else {
        map.flyTo({
          center: focusArea.center,
          zoom: Math.max(map.getZoom(), 16),
          essential: true,
          duration: 800
        });
      }
    };

    if (!map.isStyleLoaded()) {
      map.once("load", fly);
    } else {
      fly();
    }
  }, [focusArea]);

  // Handle interactions (click, hover)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || IS_E2E_MODE) return;

    const layerId = "crashes-layer";
    const popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: '300px'
    });

    const onLayerClick = (e: any) => {
      // Prevent clicking points while drawing
      if (isDrawing) return;

      if (!e.features || !e.features.length) return;

      const feature = e.features[0];
      const props = feature.properties;

      // Call the onPointClick callback to open stats drawer
      if (onPointClick) {
        onPointClick(props);
      }

      const count = props?.count || 1;
      const severity = props?.severity || 'Unknown';
      const accidentDate = props?.accidentDate || 'Unknown';

      const html = `
        <div style="font-family: system-ui, -apple-system, sans-serif; padding: 8px;">
          <div style="font-weight: bold; font-size: 14px; color: #171717; margin-bottom: 8px;">
            ${count} ${count === 1 ? 'Crash' : 'Crashes'} at this location
          </div>
          <div style="font-size: 12px; color: #525252; margin-bottom: 4px;">
            <strong>Severity:</strong> ${severity}
          </div>
          <div style="font-size: 12px; color: #525252;">
            <strong>Latest:</strong> ${accidentDate || 'N/A'}
          </div>
        </div>
      `;

      const coordinates = (feature.geometry as any).coordinates.slice();
      popup.setLngLat(coordinates).setHTML(html).addTo(map);
    };

    const onMouseEnter = () => {
      // Don't show pointer cursor while drawing
      if (isDrawing) return;
      map.getCanvas().style.cursor = 'pointer';
    };

    const onMouseLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    // Register listeners
    // Note: It's safe to register listeners for a layer ID that might not exist yet.
    // They will become active once the layer is added.
    map.on('click', layerId, onLayerClick);
    map.on('mouseenter', layerId, onMouseEnter);
    map.on('mouseleave', layerId, onMouseLeave);

    return () => {
      map.off('click', layerId, onLayerClick);
      map.off('mouseenter', layerId, onMouseEnter);
      map.off('mouseleave', layerId, onMouseLeave);
      popup.remove();
    };
  }, [onPointClick, isDrawing]);

  const handleStartDraw = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (drawRef.current) {
      if (isDrawing) {
        setTimeout(() => {
          (drawRef.current as any).changeMode('simple_select');
        }, 0);
        setIsDrawing(false);
      } else {
        setTimeout(() => {
          (drawRef.current as any).changeMode('draw_polygon');
        }, 0);
        setIsDrawing(true);
      }
    }
  };

  const handleClearDraw = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (drawRef.current) {
      drawRef.current.deleteAll();
      onPolygonChange(null);
      setHasPolygon(false);
    }
  };

  if (IS_E2E_MODE) {
    return (
      <div className="flex h-full flex-col items-start justify-center gap-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        <p className="text-sm text-neutral-700">
          Map disabled in E2E mode. Load the sample polygon to trigger summary queries.
        </p>
        <button
          type="button"
          data-testid="load-sample-polygon"
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 cursor-pointer"
          onClick={() => onPolygonChange(SAMPLE_E2E_POLYGON)}
        >
          Load sample polygon
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      
      {/* Custom Draw Controls */}
      <div className="absolute top-6 right-14 z-10 flex flex-col gap-2">
        {!hasPolygon ? (
          <button
            onClick={handleStartDraw}
            className={`flex items-center gap-2 rounded-full px-4 py-2.5 font-semibold shadow-lg transition-all cursor-pointer ${
              isDrawing 
                ? 'bg-blue-600 text-white ring-4 ring-blue-600/20 animate-pulse' 
                : 'bg-white text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            {isDrawing ? <X className="h-4 w-4" /> : <PenTool className="h-4 w-4" />}
            <span>{isDrawing ? 'Cancel' : 'Draw Area'}</span>
          </button>
        ) : (
          <button
            onClick={handleClearDraw}
            className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 font-semibold text-red-600 shadow-lg transition-all hover:bg-red-50 cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear Area</span>
          </button>
        )}
      </div>
    </div>
  );
}

function clearCrashLayer(map: Map) {
  const sourceId = "crashes-source";
  
  if (map.getSource(sourceId)) {
    // Clear the data by setting an empty FeatureCollection
    (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData({
      type: "FeatureCollection",
      features: []
    });
  }
}

function addOrUpdateCrashLayer(map: Map, geojson: FeatureCollection<Point>) {
  const sourceId = "crashes-source";
  const layerId = "crashes-layer";
  
  if (map.getSource(sourceId)) {
    (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson);
    return;
  }

  map.addSource(sourceId, {
    type: "geojson",
    data: geojson
  });

  map.addLayer({
    id: layerId,
    type: "circle",
    source: sourceId,
    paint: {
      // Size based on count - larger circles for more crashes
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["get", "count"],
        1, 5,      // 1 crash = 5px
        5, 8,      // 5 crashes = 8px
        10, 11,    // 10 crashes = 11px
        20, 14,    // 20 crashes = 14px
        50, 18,    // 50+ crashes = 18px
      ],
      // Color based on severity
      "circle-color": [
        "match",
        ["get", "severity"],
        "Fatal accident", "#dc2626",           // Red
        "Serious injury accident", "#ea580c",   // Orange
        "Other injury accident", "#f59e0b",     // Amber
        "#6b7280"  // Gray fallback
      ],
      "circle-opacity": 0.75,
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-opacity": 0.9
    }
  });
}

function enhanceLabelVisibility(map: Map) {
  const style = map.getStyle();
  if (!style?.layers) {
    return;
  }
  style.layers.forEach((layer) => {
    const isSymbolLabel = layer.type === "symbol";
    const isRoadLayer = typeof layer.id === "string" && layer.id.toLowerCase().includes("road");
    if (!isSymbolLabel && !isRoadLayer) {
      return;
    }
    const currentMinZoom = typeof layer.minzoom === "number" ? layer.minzoom : 0;
    const currentMaxZoom = typeof layer.maxzoom === "number" ? layer.maxzoom : 22;
    const adjustedMinZoom = Math.max(0, currentMinZoom - 1.5);
    try {
      map.setLayerZoomRange(layer.id, adjustedMinZoom, currentMaxZoom);
    } catch (error) {
      // Non-fatal if layer adjustments fail.
      console.warn("Unable to adjust layer zoom for", layer.id, error);
    }
  });
}

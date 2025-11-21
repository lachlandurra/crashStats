import type { Feature, GeoJsonObject, MultiPolygon, Polygon } from "geojson";
import booleanValid from "@turf/boolean-valid";

type PolygonLike = Feature<Polygon | MultiPolygon>;

export function validatePolygonFeature(input: unknown): PolygonLike {
  if (!input || typeof input !== "object") {
    throw new Error("Polygon payload is required.");
  }

  const feature = toFeature(input as GeoJsonObject);
  const geometryType = feature.geometry?.type;

  if (!geometryType || (geometryType !== "Polygon" && geometryType !== "MultiPolygon")) {
    throw new Error("Polygon geometry must be a Polygon or MultiPolygon.");
  }

  if (!Array.isArray((feature.geometry as Polygon | MultiPolygon).coordinates)) {
    throw new Error("Polygon coordinates are missing.");
  }

  if (!booleanValid(feature)) {
    throw new Error("Polygon geometry is invalid.");
  }

  return feature as PolygonLike;
}

function toFeature(object: GeoJsonObject): PolygonLike {
  if ((object as Feature).type === "Feature") {
    const feature = object as Feature;
    if (!feature.geometry) {
      throw new Error("Feature is missing geometry.");
    }
    return feature as PolygonLike;
  }

  // Allow bare geometry payloads by wrapping them as a Feature.
  return {
    type: "Feature",
    properties: {},
    geometry: object as Polygon | MultiPolygon
  };
}

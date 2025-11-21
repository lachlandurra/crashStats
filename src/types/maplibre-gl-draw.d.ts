declare module "maplibre-gl-draw" {
  import type { IControl, Map } from "maplibre-gl";
  import type { FeatureCollection } from "geojson";

  interface DrawControls {
    polygon?: boolean;
    trash?: boolean;
  }

  interface DrawOptions {
    displayControlsDefault?: boolean;
    controls?: DrawControls;
    defaultMode?: string;
    userProperties?: boolean;
  }

  export default class MapLibreGLDraw implements IControl {
    constructor(options?: DrawOptions);
    onAdd(map: Map): HTMLElement;
    onRemove(map: Map): void;
    getAll(): FeatureCollection;
    getSelected(): FeatureCollection;
    delete(featureIds: string | string[]): this;
    deleteAll(): void;
  }
}

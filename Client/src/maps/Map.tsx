import { onMount, createSignal, createResource, createEffect } from "solid-js";
import Map from "ol/Map";
import View from "ol/View";
import { Vector as VectorSource } from "ol/source";
import XYZ from "ol/source/XYZ";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import GeoJSON from "ol/format/GeoJSON";
import { Geometry, Polygon } from "ol/geom";
import { Select } from "ol/interaction";
import Style from "ol/style/Style";
import Stroke from "ol/style/Stroke";
import { Feature, Overlay } from "ol";
import Fill from "ol/style/Fill";
import { getArea } from "ol/sphere";

import "ol/ol.css";
import "./Map.css";

import { FarmField } from "../../bindings/FarmField";
import { FarmFieldGroup } from "../../bindings/FarmFieldGroup";
import { getFarmFieldGroupsWithFields } from "../requests";

export function formatArea(polygon: Polygon | number): string {
  if (typeof polygon === "number") {
    return Math.round(polygon) / 1000 + " " + "dekar";
  }
  const area: number = getArea(polygon);
  return Math.round(area) / 1000 + " " + "dekar";
}

export function getMapPolygonArea(mapPolygonString: string): number {
  try {
    const json = JSON.parse(mapPolygonString);
    const feature: Feature<Geometry> = new GeoJSON().readFeature(json);
    return getArea(feature.getGeometry() as Polygon);
  } catch (e) {
    console.error(e);
    return -1;
  }
}

export function formatSelectedDiv(
  fieldName: string,
  fieldGroup: string,
  area: string,
) {
  return (
    "<div><p>Navn: " +
    fieldName +
    "</p> <p>Gruppe: " +
    fieldGroup +
    "</p> <p>Areal: " +
    area +
    "</p> </div>"
  );
}

export function fromGroupFieldsToLayer(
  group: FarmFieldGroup,
  fields: FarmField[],
) {
  const fieldFeatures: Feature<Geometry>[] = fields
    .map((f) => {
      try {
        const json = JSON.parse(f.map_polygon_string);
        const feature: Feature<Geometry> = new GeoJSON().readFeature(json);
        feature.set("name", f.name);
        feature.set("group-name", group.name);

        return feature;
      } catch (e) {
        console.error(e);
        console.log("failed to parse as json: ", f.map_polygon_string);
        return null;
      }
    })
    .filter((x): x is Feature<Geometry> => {
      return x !== null;
    });

  const new_layer = new VectorLayer({
    source: new VectorSource({
      features: fieldFeatures,
    }),
    style: {
      "fill-color": group.draw_color,
      "stroke-color": group.draw_color,
    },
  });
  new_layer.setProperties({ "group-name": group.name, fields: group.fields });
  return new_layer;
}

export function NoEditMap() {
  const [mapObj, setMapObj] = createSignal<Map | undefined>();
  // const [farms, modify_farm] = createResource(requests.get_farm);
  const [farmFieldGroups] = createResource(getFarmFieldGroupsWithFields);

  createEffect(() => {
    const m = mapObj();
    const fg = farmFieldGroups();
    if (m != undefined && fg != undefined) {
      fg.map(([group, fields]) => {
        const new_layer = fromGroupFieldsToLayer(group, fields);
        m.addLayer(new_layer);
      });
    }
  });

  onMount(async () => {
    const worldImagery = new TileLayer({
      source: new XYZ({
        url: "https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        maxZoom: 17,
        attributions:
          "Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community. Powered by OpenLayers.",
      }),
    });

    const map = new Map({
      layers: [worldImagery],
      target: "map_container",
      view: new View({
        center: [1721600, 10692300], //hardcoded center for now
        zoom: 15,
        maxZoom: 20,
        minZoom: 10,
      }),
    });

    const selectedStyle = new Style({
      stroke: new Stroke({
        color: "rgba(129, 199, 132, 1)",
        width: 2,
      }),
      fill: new Fill({
        color: "rgba(100, 181, 246, 0.7)",
      }),
    });

    let select: Select;
    const selectElement: HTMLElement = document.createElement("div");
    const selectOverlay: Overlay = new Overlay({
      element: selectElement,
      positioning: "center-center",
    });
    map.addOverlay(selectOverlay);

    // eslint-disable-next-line prefer-const
    select = new Select({
      style: selectedStyle,
    });
    map.addInteraction(select);
    select.on("select", (e) => {
      if (e.selected.length == 1) {
        const selected: Feature<Geometry> = e.selected[0];
        const x = selected.getProperties();
        const y: Polygon = selected
          .getGeometry()
          ?.simplifyTransformedInternal();
        const selectedCoords = y.getInteriorPoint().getCoordinates();

        selectElement.className = "ol-tooltip";
        selectElement.innerHTML = formatSelectedDiv(
          x["name"],
          x["group-name"],
          formatArea(y),
        );
        selectOverlay.setPosition(selectedCoords);
      } else {
        console.log("unselecting");
        selectOverlay.setPosition(undefined);
      }
    });

    setMapObj(map);
  });

  return (
    <main style={{ display: "flex", height: "calc( 100vh - 64px )" }}>
      <div id="map_container" class="map"></div>
    </main>
  );
}

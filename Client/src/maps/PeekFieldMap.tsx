import { onMount, createSignal, createEffect } from "solid-js";
import Map from "ol/Map";
import View from "ol/View";
import XYZ from "ol/source/XYZ";
import { Tile as TileLayer } from "ol/layer";
import { Geometry, Polygon } from "ol/geom";
import { Select } from "ol/interaction";
import Style from "ol/style/Style";
import Stroke from "ol/style/Stroke";
import { Feature, Overlay } from "ol";
import Fill from "ol/style/Fill";

import "ol/ol.css";
import "./Map.css";

import { formatSelectedDiv, formatArea } from "./Map";
import { Dialog, DialogContent } from "@suid/material";
import { Coordinate } from "ol/coordinate";
import { DisplayedField } from "../fields/FieldsList";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";

export function PeekFieldMap(props: {
  field: DisplayedField
  initialFeature?: Feature<Geometry>;
  onClose?: () => void;
}) {
  const [mapObj, setMapObj] = createSignal<Map | undefined>();

  createEffect(() => {
    const m = mapObj();
    if (m != undefined && props.initialFeature != undefined) {

      const new_layer = new VectorLayer({
        source: new VectorSource({
          features: [props.initialFeature],
        }),
        style: {
          "fill-color": props.field.draw_color,
          "stroke-color": "white",
        },
      });
      new_layer.setProperties({ "group-name": props.field.group_name });
      m.addLayer(new_layer);
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

    const getCenterCoords: () => Coordinate = () => {
      if (props.initialFeature != undefined) {
        const geom = props.initialFeature.getGeometry() as Polygon;
        return geom.getInteriorPoint().getCoordinates();
      } else {
        return [1721600, 10692300];
      }
    }

    const map = new Map({
      layers: [worldImagery],
      target: "map_container",
      view: new View({
        center: getCenterCoords(),
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

    const selectElement: HTMLElement = document.createElement("div");
    const selectOverlay: Overlay = new Overlay({
      element: selectElement,
      positioning: "center-center",
    });
    map.addOverlay(selectOverlay);

    const select = new Select({
      style: selectedStyle,
    });
    map.addInteraction(select);
    if (props.initialFeature) {
      const x = props.initialFeature.getProperties();
      const y: Polygon = props.initialFeature.getGeometry()?.simplifyTransformedInternal();
      const [cx, cy] = y.getInteriorPoint().getCoordinates();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [minx, miny, maxx, maxy] = y.getExtent();
      selectElement.className = "ol-tooltip";
      selectElement.innerHTML = formatSelectedDiv(
        x["name"],
        x["group-name"],
        formatArea(y)
      );
      selectOverlay.setPosition([cx, maxy + (Math.abs(maxy - cy)) / 2]);
    }

    setMapObj(map);
  });

  return (
    <Dialog open={true} sx={{ width: "100%" }} onClose={props.onClose}>
      <DialogContent sx={{ padding: "0" }}>
        <p style={{ margin: "1rem" }}>{props.field.group_name} - {props.field.name} - {(props.field.size / 1000).toFixed(3)} dekar</p>
        <div id="map_container" style={{ height: "600px", width: "50vw", "min-width": "300px", "max-width": "550px" }} class="map"></div>
      </DialogContent>
    </Dialog>
  );
}

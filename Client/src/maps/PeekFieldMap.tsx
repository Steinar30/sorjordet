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
          "stroke-color": props.field.draw_color,
        },
      });
      new_layer.setProperties({ "group-name": props.field.group_name});
      
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
          formatArea(y)
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
    <Dialog open={true} sx={{width: "100%"}} onClose={props.onClose}>
      <DialogContent>
        <div id="map_container" style={{height: "600px", width: "50vw","min-width": "300px", "max-width": "550px"}} class="map"></div>
      </DialogContent>
    </Dialog>
  );
}

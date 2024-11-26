import { onMount, createSignal, createEffect, Signal, Show } from "solid-js";
import Map from "ol/Map";
import View from "ol/View";
import { Draw, Snap } from "ol/interaction";
import ModifyTouch from "ol-ext/interaction/ModifyTouch.js";
import { Vector as VectorSource } from "ol/source";
import XYZ from "ol/source/XYZ";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";

import "ol/ol.css";
import "../maps/Map.css";

import { Collection, Feature, MapBrowserEvent, Overlay } from "ol";
import { Geometry, Polygon } from "ol/geom";
import Style from "ol/style/Style";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import { DrawEvent } from "ol/interaction/Draw";
import { getFarmFieldGroupsWithFields } from "../requests";

import { formatArea, fromGroupFieldsToLayer } from "./Map";
import { Button } from "@suid/material";

export type MapFeature = {
  feature: Signal<Feature<Geometry> | undefined>;
  closed?: Signal<boolean>;
  initialFeature?: Feature<Geometry>;
};

export function DrawableMap(props: MapFeature) {
  const [mapObj, setMapObj] = createSignal<Map | undefined>();

  createEffect(async () => {
    const m = mapObj();

    if (m) {
      const fields = await getFarmFieldGroupsWithFields();
      fields.map(([group, fields]) => {
        const new_layer = fromGroupFieldsToLayer(group, fields);
        m.addLayer(new_layer);
      });
    }
  });

  const createMap = async () => {
    const worldImagery = new TileLayer({
      source: new XYZ({
        url: "https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        maxZoom: 17,
        attributions:
          "Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community. Powered by OpenLayers.",
      }),
    });

    const source = new VectorSource({
      features: props.initialFeature
        ? new Collection([props.initialFeature])
        : undefined,
    });

    const vector = new VectorLayer({
      source: source,
      style: {
        "fill-color": "rgba(256, 256, 256, 0.2)",
        "stroke-color": "rgba(256, 256, 256, 0.7)",
        "stroke-width": 2,
      },
    });

    let helpTooltipElement: HTMLElement;
    let helpTooltip: Overlay;
    let measureTooltipElement: HTMLElement;
    let measureTooltip: Overlay;

    const pointerMoveHandler = function (evt: MapBrowserEvent<UIEvent>) {
      if (evt.dragging) {
        return;
      }

      let helpMsg: string = "Press to start drawing";

      if (props.initialFeature) {
        helpMsg = "Drag points to edit";
      }

      helpTooltipElement.innerHTML = helpMsg;
      helpTooltip.setPosition(evt.coordinate);

      helpTooltipElement.classList.remove("hidden");
    };

    const map = new Map({
      layers: [worldImagery, vector],
      target: "map_container_small",
      view: new View({
        center: [1721600, 10692300], //hardcoded center for now
        zoom: 15,
        maxZoom: 20,
        minZoom: 10,
      }),
    });

    map.on("pointermove", pointerMoveHandler);
    map.getViewport().addEventListener("mouseout", function () {
      helpTooltipElement.classList.add("hidden");
    });

    /**
     * Creates a new help tooltip
     */
    function createHelpTooltip() {
      if (helpTooltipElement) {
        helpTooltipElement.parentNode?.removeChild(helpTooltipElement);
      }
      helpTooltipElement = document.createElement("div");
      helpTooltipElement.className = "ol-tooltip hidden";
      helpTooltip = new Overlay({
        element: helpTooltipElement,
        offset: [15, 0],
        positioning: "center-left",
      });
      map.addOverlay(helpTooltip);
    }

    /**
     * Creates a new measure tooltip
     */
    function createMeasureTooltip() {
      if (measureTooltipElement) {
        measureTooltipElement.parentNode?.removeChild(measureTooltipElement);
      }
      measureTooltipElement = document.createElement("div");
      measureTooltipElement.className = "ol-tooltip ol-tooltip-measure";
      measureTooltip = new Overlay({
        element: measureTooltipElement,
        offset: [0, -15],
        positioning: "bottom-center",
        stopEvent: false,
        insertFirst: false,
      });
      map.addOverlay(measureTooltip);
    }

    function addInteraction() {
      createMeasureTooltip();
      createHelpTooltip();
      if (!props.initialFeature) {
        const draw: Draw = new Draw({
          source: source,
          type: "Polygon",
          style: new Style({
            fill: new Fill({
              color: "rgba(256, 256, 256, 0.2)",
            }),
            stroke: new Stroke({
              color: "rgba(256, 256, 256, 0.7)",
              width: 2,
            }),
          }),
        });
        draw.on("drawstart", function (evt: DrawEvent) {
          console.log("drawstart");
          if (helpTooltip) {
            map.removeOverlay(helpTooltip);
            helpTooltipElement.remove();
          }
          // set sketch
          const sketch = evt.feature;
          props.feature[1](sketch);

          let tooltipCoord;

          sketch.getGeometry()?.on("change", function (evt) {
            const geom: Polygon = evt.target;
            const output = formatArea(geom);
            tooltipCoord = geom.getInteriorPoint().getCoordinates();
            measureTooltipElement.innerHTML = output;
            measureTooltip.setPosition(tooltipCoord);
          });
        });
        draw.on("drawend", function () {
          map.removeInteraction(draw);
          measureTooltipElement.className = "ol-tooltip ol-tooltip-static";
          measureTooltip.setOffset([0, -7]);
          if (props.closed) {
            props.closed[1](true);
          }
        });
        map.addInteraction(draw);
      } else {
        console.log("initial feature: ", props.initialFeature);
        if (helpTooltip) {
          map.removeOverlay(helpTooltip);
          helpTooltipElement.remove();
        }
        let tooltipCoord;

        source.forEachFeature((feature) => {
          props.feature[1](feature);
          const geom: Polygon = feature.getGeometry() as Polygon;
          const output = formatArea(geom);
          tooltipCoord = geom.getInteriorPoint().getCoordinates();
          measureTooltipElement.innerHTML = output;
          measureTooltip.setPosition(tooltipCoord);
          map.getView().setCenter(tooltipCoord);

          feature.getGeometry()?.on("change", function (evt) {
            const geom: Polygon = evt.target;
            const output = formatArea(geom);
            tooltipCoord = geom.getInteriorPoint().getCoordinates();
            measureTooltipElement.innerHTML = output;
            measureTooltip.setPosition(tooltipCoord);
          });
        });
      }

      const snap: Snap = new Snap({ source: source });
      map.addInteraction(snap);

      const modifyTouch = new ModifyTouch(
        Object({ source: source, title: "Remove point" }),
      );
      map.addInteraction(modifyTouch);
    }

    addInteraction();

    setMapObj(map);
  };

  onMount(createMap);

  return (
    <>
      <div>
        <Show when={props.closed && !props.closed[0]()}>
          <Button
            variant="outlined"
            onClick={() => {
              mapObj()
                ?.getInteractions()
                .forEach((interaction) => {
                  if (interaction instanceof Draw) {
                    console.log(interaction);
                    interaction.removeLastPoint();
                  }
                });
            }}
          >
            Undo
          </Button>
        </Show>
      </div>

      <div id="map_container_small" class="map"></div>
    </>
  );
}

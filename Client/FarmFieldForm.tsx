import { Typography, TextField, Button } from "@suid/material";
import { createStore } from "solid-js/store";
import { onMount, createSignal, createResource, createEffect, Show } from "solid-js";
import Map from "ol/Map";
import View from "ol/View";
import { Draw, Modify, Snap } from "ol/interaction";
import { Vector as VectorSource } from "ol/source";
import XYZ from "ol/source/XYZ";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import GeoJSON from "ol/format/GeoJSON";
import { Select } from "@thisbeyond/solid-select";
import "@thisbeyond/solid-select/style.css";


import "ol/ol.css";
import "./Map.css";

import { FarmField } from "./bindings/FarmField";
import { FarmFieldGroup } from "./bindings/FarmFieldGroup";
import { Feature, MapBrowserEvent, Overlay } from "ol";
import { Polygon } from "ol/geom";
import Style from "ol/style/Style";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import { EventsKey } from "ol/events";
import { DrawEvent } from "ol/interaction/Draw";
import { getFarmFieldGroups, getFarmFieldsForGroup, tryPostNewField } from "./requests";
import { formatArea, fromGroupFieldsToLayer } from "./Map";


function validateFarmInput(field: FarmField, feature: Feature | undefined, validFeature: boolean) {
    return (
        field.farm_id >= 1 
        && field.farm_field_group_id
        && field.farm_field_group_id >= 1
        && field.name.length > 1
        && feature
        && validFeature
    )
}

export function FieldForm(onCreate: () => void) {
    const [mapObj, setMapObj] = createSignal<Map | undefined>();
    const [farmFieldGroups] = createResource(
        getFarmFieldGroups
    );
    const [drawnFeature, setDrawnFeature] = createSignal<Feature | undefined>();
    const [form, setForm] = createStore<FarmField>({
        id:-1,
        name: "",
        map_polygon_string: "",
        farm_id: 1,
        farm_field_group_id: -1,
    });
    const [selectedGroup, setSelectedGroup] = createSignal<FarmFieldGroup | undefined>()
    const [featureClosed, setFeatureClosed] = createSignal(false);

    const updateField = (fieldName:string) => (event:Event) => {
        const inputElement = event.currentTarget as HTMLInputElement;
        setForm({
            [fieldName]: inputElement.value
        })
    };

    createEffect(async () => {
        const m = mapObj();
        const selGroup = selectedGroup();
        console.log("group selected: ", selGroup);
        if (m && selGroup) {
            const fields = await getFarmFieldsForGroup(selGroup.id);
            const newLayer = fromGroupFieldsToLayer(selGroup, fields);
            m.addLayer(newLayer);
        }
    })


    onMount(async () => {
        const worldImagery = new TileLayer({
            source: new XYZ({
                url: "https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
                maxZoom: 17,
                attributions:
                    "Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community. Powered by OpenLayers.",
            }),
        });

        const source = new VectorSource();

        const vector = new VectorLayer({
            source: source,
            style: {
                "fill-color": "rgba(129, 199, 132, 0.2)",
                "stroke-color": "rgba(129, 199, 132, 0.7)",
                "stroke-width": 2,
            },
        });

        let sketch: Feature | null;
        let helpTooltipElement: HTMLElement;
        let helpTooltip: Overlay;
        let measureTooltipElement: HTMLElement;
        let measureTooltip: Overlay;

        const pointerMoveHandler = function (evt: MapBrowserEvent<UIEvent>) {
            if (evt.dragging) {
                return;
            }

            let helpMsg: string = 'Trykk for å tegne';

            if (sketch) {
                helpMsg = '';
            }

            helpTooltipElement.innerHTML = helpMsg;
            helpTooltip.setPosition(evt.coordinate);

            helpTooltipElement.classList.remove('hidden');
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
        map.getViewport().addEventListener('mouseout', function () {
            helpTooltipElement.classList.add('hidden');
        });

        let snap, draw: Draw;
        function addInteraction() {
            draw = new Draw({
                source: source,
                type: "Polygon",
                style: new Style({
                    fill: new Fill({
                        color: "rgba(129, 199, 132, 0.2)",
                    }),
                    stroke: new Stroke({
                        color: "rgba(129, 199, 132, 0.7)",
                        width: 2,
                    }),
                }),
            });
            map.addInteraction(draw);
            snap = new Snap({ source: source });
            map.addInteraction(snap);

            createMeasureTooltip();
            createHelpTooltip();

            const modify = new Modify({ source: source });
            map.addInteraction(modify);

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            let listener: EventsKey | undefined;
            draw.on("drawstart", function (evt: DrawEvent) {
                if (helpTooltip) {
                    map.removeOverlay(helpTooltip);
                    helpTooltipElement.remove();
                }
                // set sketch
                sketch = evt.feature;
                setDrawnFeature(sketch);
                
                let tooltipCoord;
                
                listener = sketch.getGeometry()?.on("change", function (evt) {
                    const geom : Polygon = evt.target;
                    const output = formatArea(geom);
                    tooltipCoord = geom.getInteriorPoint().getCoordinates();
                    measureTooltipElement.innerHTML = output;
                    measureTooltip.setPosition(tooltipCoord);
                });
            });

            draw.on("drawend", function () {
                map.removeInteraction(draw);
                measureTooltipElement.className = 'ol-tooltip ol-tooltip-static';
                measureTooltip.setOffset([0, -7]);
                setFeatureClosed(true);
            });
        }

        addInteraction();

        /**
         * Creates a new help tooltip
         */
        function createHelpTooltip() {
            if (helpTooltipElement) {
                helpTooltipElement.parentNode?.removeChild(helpTooltipElement);
            }
            helpTooltipElement = document.createElement('div');
            helpTooltipElement.className = 'ol-tooltip hidden';
            helpTooltip = new Overlay({
                element: helpTooltipElement,
                offset: [15, 0],
                positioning: 'center-left',
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



        setMapObj(map);

    });

    
    type selectOptionsType = {value: FarmFieldGroup, label: string};
    const selectComponent = () => {
        const fg = farmFieldGroups() ?? [];
        const options : selectOptionsType [] = 
            fg.map((x) => {
                return {value: x, label: x.name}
            });

        return (
            <Show when={fg.length > 0} >
                <Select 
                    
                    class="selector"
                    options={options}
                    format={(x:selectOptionsType) => x.label}
                    onChange={(x:selectOptionsType) => {
                        setSelectedGroup(x.value);
                        setForm({
                            ["farm_field_group_id"]: x.value.id
                        })
                    }}
                    placeholder="Velg jordegruppe"
                />
            </Show>
        )
    }

    return (
        <div id="map_form_container">
            <div id="field_form">
                <Typography variant="h6">Legg til ny mark</Typography>

                <TextField
                    id="field-name"
                    label="Navn på marken"
                    variant="outlined"
                    size="small"
                    value={form.name}
                    onChange={updateField("name")}
                ></TextField>

                {selectComponent()}

                <Typography variant="body2">
                    Tegn opp et utsnitt av marken i kartet under for å vise den på kartet.
                </Typography>

                <Button
                    disabled={!validateFarmInput(form, drawnFeature(), featureClosed())}
                    size="small"
                    variant="contained"
                    onClick={async () => {
                        console.log('click of button');
                        const f = drawnFeature();
                        if (f) {
                            const json = new GeoJSON().writeFeature(f);
                            setForm({["map_polygon_string"]: json});
                            const result = await tryPostNewField(form);
                            if (result) {
                                console.log('created field');
                                const res = form;
                                res.id = result;
                                onCreate();
                            }
                        }
                }}
                >
                    Lagre mark
                </Button>
            </div>
            <div id="map_container_small" class="map"></div>
        </div>
    );
}

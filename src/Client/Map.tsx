import { onMount, createSignal, createResource, createEffect, Ref } from "solid-js";
import Map from "ol/Map";
import View from "ol/View";
import { Vector as VectorSource } from "ol/source";
import XYZ from "ol/source/XYZ";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import GeoJSON from "ol/format/GeoJSON";

import "ol/ol.css";
import "./Map.css";

import { FarmField } from "./bindings/FarmField";
import { FarmFieldGroup } from "./bindings/FarmFieldGroup";
import { Polygon } from "ol/geom";
import { getFarmFieldGroupsWithFields } from "./requests";


export function formatArea(polygon: Polygon): string {
    const area: number = polygon.getArea();
    if (area > 10000) {
        return Math.round((area / 1000000) * 100) / 100 + " " + "km<sup>2</sup>";
    } else {
        return Math.round(area * 100) / 100 + " " + "m<sup>2</sup>";
    }
}

export function fromGroupFieldsToLayer(
    group: FarmFieldGroup,
    fields: FarmField[]
) {
    const field_list: string[] = fields
        .map((f) => {
            try {
                return JSON.parse(f.map_polygon_string);
            } catch (e) {
                console.log("failed to parse as json: ", f.map_polygon_string);
                return null;
            }
        })
        .filter((f) => f != null);

    const aggFieldPolygons = {
        type: "FeatureCollection",
        features: field_list,
    };
    console.log("drawing features: ", aggFieldPolygons);
    const new_layer = new VectorLayer({
        source: new VectorSource({
            features: new GeoJSON().readFeatures(aggFieldPolygons),
        }),
        style: {
            "fill-color": group.draw_color,
            "stroke-color": group.draw_color,
        },
    });
    return new_layer;
}

export function NoEditMap() {
    const [mapObj, setMapObj] = createSignal<Map | undefined>();
    // const [farms, modify_farm] = createResource(requests.get_farm);
    const [farm_field_groups, { mutate, refetch }] = createResource(
        getFarmFieldGroupsWithFields
    );

    createEffect(() => {
        if (mapObj() != undefined && farm_field_groups() != undefined) {
            farm_field_groups()?.map(([group, fields]) => {
                const new_layer = fromGroupFieldsToLayer(group, fields);
                mapObj()?.addLayer(new_layer);
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
                minZoom: 12,
            }),
        });

        setMapObj(map);
    });

    return (
        <main style={{ display: "flex", height: "calc( 100vh - 64px )" }}>
            <div id="map_container" class="map"></div>
        </main>
    );
}

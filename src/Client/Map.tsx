import { Paper, Typography, TextField, Button, Box } from '@suid/material';
import { createStore } from "solid-js/store";
import { onMount } from 'solid-js';
import Map from 'ol/Map';
import View from 'ol/View';
import { Draw, Modify, Snap } from 'ol/interaction';
import { TileWMS, OSM, Vector as VectorSource } from 'ol/source';
import XYZ from 'ol/source/XYZ';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { get } from 'ol/proj';
import GeoJSON from 'ol/format/GeoJSON';

import 'ol/ol.css'

export default function NoEditMap() {

    onMount(() => {

        const worldImagery = new TileLayer({
            source: new XYZ({
                url: 'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                maxZoom: 17,
                attributions: 'Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community. Powered by OpenLayers.'
            })
        });
    
        const source = new VectorSource();
        const vector = new VectorLayer({
            source: source,
            style: {
                'fill-color': 'rgba(255, 255, 255, 0.2)',
                'stroke-color': '#ffcc33',
                'stroke-width': 2,
                'circle-radius': 7,
                'circle-fill-color': '#ffcc33',
            },
        });

        const fields = 
            new VectorLayer({
                source: new VectorSource({
                    format: new GeoJSON(),
                    url: '/assets/fields_v1.json', // hardcoded geojson for now
                }),
            });
    
        const map = new Map({
            layers: [worldImagery, vector, fields],
            target: 'map_container',
            view: new View({
                center: [1722000, 10692000], //hardcoded center for now
                zoom: 15,
                maxZoom: 20,
                minZoom: 12,
            }),

        });

        const modify = new Modify({ source: source });
        map.addInteraction(modify);
    });

    return (
        <main style={{display:"flex", height:"calc( 100vh - 64px )"}}>
            <div
                id="map_container"
                class="map"
            ></div>

        </main>
    )
}

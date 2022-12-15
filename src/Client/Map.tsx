import { Paper, Typography, TextField, Button, Box } from '@suid/material';
import { createStore } from "solid-js/store";
import { onMount } from 'solid-js';
import Map from 'ol/Map';
import View from 'ol/View';
import { Draw, Modify, Snap } from 'ol/interaction';
import { TileWMS, OSM, Vector as VectorSource } from 'ol/source';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { get } from 'ol/proj';
import Style from 'ol/style/Style';

export default function NoEditMap() {

    onMount(() => {
        const raster = new TileLayer({
            source: new OSM(),
        });

        //Start: WMS-C Kartverket
        var _url = "http://opencache.statkart.no/gatekeeper/gk/gk.open?";

        //Start: source
        var sourceWMSC = new TileWMS({
            url: _url,
            params: {
                LAYERS: 'norges_grunnkart',
                VERSION: '1.1.1'
            }
        });
        var tileLayerWMSC = new TileLayer({
            source: sourceWMSC
            // title: "Norges grunnkart",
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
    
        const map = new Map({
            layers: [raster, vector, tileLayerWMSC],
            target: 'map_container',
            view: new View({
                center: [1722000, 10692000], //hardcoded center for now
                zoom: 16,
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

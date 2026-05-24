import {
  Card,
  CardContent,
  Divider,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@suid/material";
import { createQuery } from "@tanstack/solid-query";
import { createMemo, createUniqueId, For, Show, onCleanup, onMount } from "solid-js";
import Map from "ol/Map";
import View from "ol/View";
import XYZ from "ol/source/XYZ";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Tile as TileLayer } from "ol/layer";
import { Polygon } from "ol/geom";
import { FarmField } from "../../bindings/FarmField";
import { FieldEvent } from "../../bindings/FieldEvent";
import { HarvestEvent } from "../../bindings/HarvestEvent";
import { FarmFieldGroup } from "../../bindings/FarmFieldGroup";
import { formatDate } from "../Utils";
import {
  formatArea,
  getMapPolygonArea,
  parseJsonIntoFeature,
} from "../maps/Map";
import "ol/ol.css";
import "../maps/Map.css";
import styles from "./FieldDetails.module.css";

function FieldPreviewMap(props: {
  field?: FarmField;
  groupName: string;
  drawColor: string;
}) {
  const mapId = createUniqueId();
  let mapElement: HTMLDivElement | undefined;

  onMount(() => {
    if (!mapElement || !props.field) {
      return;
    }

    const feature = parseJsonIntoFeature(props.field, props.groupName);
    if (!feature) {
      return;
    }

    const geometry = feature.getGeometry() as Polygon;
    const map = new Map({
      target: mapElement,
      layers: [
        new TileLayer({
          source: new XYZ({
            url: "https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            maxZoom: 17,
            attributions:
              "Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community. Powered by OpenLayers.",
          }),
        }),
        new VectorLayer({
          source: new VectorSource({
            features: [feature],
          }),
          style: {
            "fill-color": props.drawColor || "#7aa36b",
            "stroke-color": "#ffffff",
          },
        }),
      ],
      view: new View({
        center: geometry.getInteriorPoint().getCoordinates(),
        zoom: 15,
        maxZoom: 20,
        minZoom: 10,
      }),
    });

    map.getView().fit(geometry.getExtent(), {
      padding: [30, 30, 30, 30],
      maxZoom: 17,
    });

    onCleanup(() => map.setTarget(undefined));
  });

  return (
    <div
      id={mapId}
      ref={mapElement}
      class={`map ${styles.mapPreview}`}
    />
  );
}

function EmptyState(props: { title: string }) {
  return (
    <Typography variant="body2" color="text.secondary">
      No {props.title.toLowerCase()} registered yet.
    </Typography>
  );
}

export function FieldDetails(props: { fieldId: number }) {
  const field = createQuery<FarmField>(() => ({
    queryKey: ["field", props.fieldId],
    queryFn: () =>
      fetch(`/api/farm_fields/${props.fieldId}`).then(
        (response) => response.json() as Promise<FarmField>,
      ),
  }));

  const groups = createQuery<FarmFieldGroup[]>(() => ({
    queryKey: ["field_groups"],
    queryFn: () =>
      fetch("/api/farm_field_groups").then(
        (response) => response.json() as Promise<FarmFieldGroup[]>,
      ),
  }));

  const harvestHistory = createQuery<HarvestEvent[]>(() => ({
    queryKey: ["field_harvest_events", props.fieldId],
    queryFn: () =>
      fetch(`/api/harvest_event/${props.fieldId}`).then(
        (response) => response.json() as Promise<HarvestEvent[]>,
      ),
  }));

  const fieldEvents = createQuery<FieldEvent[]>(() => ({
    queryKey: ["field_events", props.fieldId],
    queryFn: () =>
      fetch(`/api/field_event/${props.fieldId}`).then(
        (response) => response.json() as Promise<FieldEvent[]>,
      ),
  }));

  const group = createMemo(() =>
    groups.data?.find((item) => item.id === field.data?.farm_field_group_id),
  );

  const fieldArea = createMemo(() =>
    field.data ? formatArea(getMapPolygonArea(field.data.map_polygon_string)) : "-",
  );

  return (
    <main class={styles.page}>
      <Show when={field.isSuccess && field.data} fallback={<Skeleton height={320} />}>
        {(fieldData) => (
          <div class={styles.content}>
            <Card>
              <CardContent class={styles.summary}>
                <div class={styles.summaryInfo}>
                  <Typography variant="h4">{fieldData().name}</Typography>
                  <Typography variant="body1" color="text.secondary">
                    {group()?.name ?? "Ungrouped field"}
                  </Typography>
                  <Divider />
                  <Typography variant="body1">
                    <strong>Area:</strong> {fieldArea()}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Harvest events:</strong> {harvestHistory.data?.length ?? 0}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Field events:</strong> {fieldEvents.data?.length ?? 0}
                  </Typography>
                </div>
                <Show
                  when={group()}
                  fallback={
                    <Typography variant="body2" color="text.secondary">
                      Map preview becomes available once the field has a group.
                    </Typography>
                  }
                >
                  {(fieldGroup) => (
                    <div class={styles.mapShell}>
                      <FieldPreviewMap
                        field={fieldData()}
                        groupName={fieldGroup().name}
                        drawColor={fieldGroup().draw_color}
                      />
                    </div>
                  )}
                </Show>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Harvest history
                </Typography>
                <Show
                  when={harvestHistory.isSuccess && (harvestHistory.data?.length ?? 0) > 0}
                  fallback={<EmptyState title="Harvest History" />}
                >
                  <TableContainer class={styles.tableContainer}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell align="right">Value</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <For each={harvestHistory.data}>
                          {(event) => (
                            <TableRow>
                              <TableCell>{formatDate(event.time)}</TableCell>
                              <TableCell>{event.type_name}</TableCell>
                              <TableCell align="right">{event.value}</TableCell>
                            </TableRow>
                          )}
                        </For>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Show>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Field events
                </Typography>
                <Show
                  when={fieldEvents.isSuccess && (fieldEvents.data?.length ?? 0) > 0}
                  fallback={<EmptyState title="Field Events" />}
                >
                  <TableContainer class={styles.tableContainer}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Event</TableCell>
                          <TableCell>Description</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <For each={fieldEvents.data}>
                          {(event) => (
                            <TableRow>
                              <TableCell>{formatDate(event.time)}</TableCell>
                              <TableCell>{event.event_name}</TableCell>
                              <TableCell>{event.description || "-"}</TableCell>
                            </TableRow>
                          )}
                        </For>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Show>
              </CardContent>
            </Card>
          </div>
        )}
      </Show>
    </main>
  );
}

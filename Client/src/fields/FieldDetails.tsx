import {
  Card,
  CardContent,
  Button,
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
import { A } from "@solidjs/router";
import { createQuery, useQueryClient } from "@tanstack/solid-query";
import {
  createMemo,
  createSignal,
  createUniqueId,
  For,
  Show,
  onCleanup,
  onMount,
} from "solid-js";
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
import { jwt_token } from "../App";
import { FieldUpdateForm } from "../admin/fields/FieldEditForm";
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
      ref={(element) => {
        mapElement = element;
      }}
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
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = createSignal(false);
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

  const handleFieldSave = (updatedField: FarmField) => {
    setIsEditing(false);
    queryClient.setQueryData(["field", props.fieldId], updatedField);
    queryClient.invalidateQueries({ queryKey: ["fields_all"] });
    queryClient.invalidateQueries({ queryKey: ["field", props.fieldId] });
  };

  return (
    <main class={styles.page}>
      <div class={styles.backRow}>
        <Button component={A} href="/fields" variant="outlined">
          Back to fields
        </Button>
      </div>
      <Show when={field.isSuccess && field.data} fallback={<Skeleton height={320} />}>
        {(fieldData) => (
          <Show
            when={isEditing()}
            fallback={
              <div class={styles.content}>
                <Card class={styles.card}>
                  <CardContent class={styles.summary}>
                    <div class={styles.summaryInfo}>
                      <div class={styles.titleRow}>
                        <p class={styles.eyebrow}>Field profile</p>
                        <Show when={jwt_token()}>
                          <Button
                            variant="contained"
                            onClick={() => setIsEditing(true)}
                          >
                            Edit field
                          </Button>
                        </Show>
                      </div>
                      <Typography class={styles.fieldTitle} variant="h4">
                        {fieldData().name}
                      </Typography>
                      <Typography class={styles.fieldGroup} variant="body1">
                        {group()?.name ?? "Ungrouped field"}
                      </Typography>
                      <Divider />
                      <div class={styles.statGrid}>
                        <div class={styles.statTile}>
                          <p>Area</p>
                          <strong>{fieldArea()}</strong>
                        </div>
                        <div class={styles.statTile}>
                          <p>Harvest events</p>
                          <strong>{harvestHistory.data?.length ?? 0}</strong>
                        </div>
                        <div class={styles.statTile}>
                          <p>Field events</p>
                          <strong>{fieldEvents.data?.length ?? 0}</strong>
                        </div>
                      </div>
                    </div>
                    <div class={styles.mapShell}>
                      <FieldPreviewMap
                        field={fieldData()}
                        groupName={group()?.name ?? fieldData().name}
                        drawColor={group()?.draw_color ?? "#7aa36b"}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card class={styles.card}>
                  <CardContent>
                    <Typography class={styles.sectionTitle} variant="h6" gutterBottom>
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

                <Card class={styles.card}>
                  <CardContent>
                    <Typography class={styles.sectionTitle} variant="h6" gutterBottom>
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
            }
          >
            <section class={styles.editOnlyPage}>
              <div class={styles.editPanelHeader}>
                <div>
                  <p class={styles.eyebrow}>Logged-in tools</p>
                  <h2>Edit field details</h2>
                </div>
                <Button
                  variant="outlined"
                  onClick={() => setIsEditing(false)}
                >
                  Back to field
                </Button>
              </div>
              <div class={styles.editContextCard}>
                <p class={styles.editContextEyebrow}>Editing</p>
                <h1>{fieldData().name}</h1>
                <p class={styles.editContextMeta}>{group()?.name ?? "Ungrouped field"}</p>
              </div>
              <FieldUpdateForm
                initial={fieldData()}
                onSave={handleFieldSave}
              />
            </section>
          </Show>
        )}
      </Show>
    </main>
  );
}

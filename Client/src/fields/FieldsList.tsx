import {
  Accessor,
  createMemo,
  createSignal,
  For,
  JSX,
  Show,
} from "solid-js";
import { A } from "@solidjs/router";
import { createQuery, useQueryClient } from "@tanstack/solid-query";
import {
  IconButton,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from "@suid/material";
import {
  ArrowUpward,
  Delete,
  Edit,
  Map as MapIcon,
} from "@suid/icons-material";

import { getFarmFieldGroups, prepareAuth } from "../requests";
import { FarmFieldGroup } from "../../bindings/FarmFieldGroup";
import { FarmField } from "../../bindings/FarmField";
import {
  formatArea,
  getMapPolygonArea,
  parseJsonIntoFeature,
} from "../maps/Map";
import styles from "./Fields.module.css";
import { ConfirmDeleteDialog } from "../Utils";
import { PeekFieldMap } from "../maps/PeekFieldMap";

type Sorting = {
  sortKey: "name" | "group-name" | "size";
  direction: "asc" | "desc";
};

export type DisplayedField = {
  id: number;
  name: string;
  group_name: string;
  size: number;
  draw_color: string;
};

const deleteField = async (id: number) => {
  const authHeaders = prepareAuth(true);
  if (authHeaders === null) {
    console.log("not allowed to post without bearer token");
    return false;
  }
  const response = await fetch(`/api/farm_fields/${id}`, {
    method: "DELETE",
    headers: authHeaders,
  });
  if (response.status === 200) {
    return true;
  } else {
    return false;
  }
};

const renderFieldsTable = (
  fields: FarmField[],
  groups: FarmFieldGroup[],
  textFilter: Accessor<string>,
  sorting: Accessor<Sorting>,
  setSorting: (s: Sorting) => void,
  onDelete: undefined | ((x: number) => Promise<void>),
  maxItems?: number,
  setEdit?: (field: FarmField) => undefined,
) => {
  const [fieldPeek, setFieldPeek] = createSignal<DisplayedField | null>(null);
  const groupMap = new Map(groups.map((group) => [group.id, group]));
  const getFieldGroup = (id: number | null) =>
    id === null ? null : groupMap.get(id);

  const displayFields: Accessor<DisplayedField[]> = createMemo(
    () =>
      fields
        .map((field) => {
          const group = getFieldGroup(field.farm_field_group_id);
          return {
            id: field.id,
            name: field.name,
            group_name: group?.name ?? "",
            size: getMapPolygonArea(field.map_polygon_string),
            draw_color: group?.draw_color ?? "",
          };
        })
        .filter((field) => {
          return (
            field.name.toLowerCase().includes(textFilter().toLowerCase()) ||
            field.group_name.toLowerCase().includes(textFilter().toLowerCase())
          );
        }),
    [fields, textFilter, getFieldGroup],
  );

  const getSortedFields = (currentSorting: Sorting) => {
    const sorted = displayFields().sort((a, b) => {
      if (currentSorting.sortKey === "name") {
        return currentSorting.direction === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }

      if (currentSorting.sortKey === "group-name") {
        return currentSorting.direction === "asc"
          ? a.group_name.localeCompare(b.group_name)
          : b.group_name.localeCompare(a.group_name);
      }

      if (currentSorting.sortKey === "size") {
        return currentSorting.direction === "asc"
          ? a.size - b.size
          : b.size - a.size;
      }

      return 0;
    });

    return maxItems ? sorted.slice(0, maxItems) : sorted;
  };

  const toggleSort = (sortKey: "name" | "group-name" | "size") => () => {
    if (sortKey === sorting().sortKey) {
      setSorting({
        ...sorting(),
        direction: sorting().direction === "asc" ? "desc" : "asc",
      });
    } else {
      setSorting({ ...sorting(), sortKey, direction: "asc" });
    }
  };

  const renderSortableHeader = (
    label: string,
    sortKey: "name" | "group-name" | "size",
  ) => {
    return (
      <TableCell
        class={styles.headerCell}
        sx={{ cursor: "pointer" }}
        onClick={toggleSort(sortKey)}
      >
        {label}
        {sorting().sortKey === sortKey && sorting().direction === "asc" && (
          <ArrowUpward
            sx={{
              width: "1rem",
              height: "1rem",
              transition: "transform 300ms",
              "margin-left": "4px",
            }}
          />
        )}
        {sorting().sortKey === sortKey && sorting().direction === "desc" && (
          <ArrowUpward
            sx={{
              transform: "rotate(180deg)",
              width: "1rem",
              height: "1rem",
              transition: "transform 300ms",
              "margin-left": "4px",
            }}
          />
        )}
      </TableCell>
    );
  };

  const tryGetFieldFeature = (id: number, groupName: string) => {
    const field = fields.find((entry) => entry.id === id);
    if (!field) {
      return undefined;
    }

    const feature = parseJsonIntoFeature(field, groupName);
    return feature ?? undefined;
  };

  const renderMapButton = (field: DisplayedField) => (
    <IconButton size="small" onClick={() => setFieldPeek(field)} title="Open map">
      <MapIcon />
    </IconButton>
  );

  const hasEditActions = setEdit !== undefined || onDelete !== undefined;

  const renderEditButton = (field: DisplayedField) => (
    <Show when={setEdit !== undefined}>
      <IconButton
        size="small"
        onClick={() => {
          const foundField = fields.find((entry) => entry.id === field.id);
          if (foundField) {
            setEdit?.(foundField);
          }
        }}
      >
        <Edit />
      </IconButton>
    </Show>
  );

  const renderDeleteButton = (field: DisplayedField) => (
    <Show when={onDelete !== undefined}>
      <IconButton size="small" onClick={() => onDelete?.(field.id)}>
        <Delete />
      </IconButton>
    </Show>
  );

  const renderEditButtons = (field: DisplayedField) => (
    <Show when={hasEditActions}>
      {renderEditButton(field)}
    </Show>
  );

  return (
    <>
      <Show when={fieldPeek()}>
        {(field) => (
          <PeekFieldMap
            field={field()}
            onClose={() => setFieldPeek(null)}
            initialFeature={tryGetFieldFeature(field().id, field().group_name)}
          />
        )}
      </Show>

      <div class={styles.tableCard}>
        <TableContainer class={styles.tableWrap}>
          <Table size="small" class={styles.table}>
            <TableHead>
              <TableRow>
                <TableCell class={styles.headerCell}></TableCell>
                {renderSortableHeader("Name", "name")}
                {renderSortableHeader("Field Group", "group-name")}
                {renderSortableHeader("Size", "size")}
                <TableCell class={styles.headerCell}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <For each={getSortedFields(sorting())}>
                {(field) => (
                  <TableRow class={styles.tableRow}>
                    <TableCell sx={{ width: "20px" }}>
                      <span
                        class={styles.colorDot}
                        style={{ "background-color": field.draw_color }}
                      />
                    </TableCell>
                    <TableCell>
                      <A class={styles.fieldLink} href={`/fields/${field.id}`}>
                        {field.name}
                      </A>
                    </TableCell>
                    <TableCell>{field.group_name}</TableCell>
                    <TableCell>{formatArea(field.size)}</TableCell>
                    <TableCell>
                      {renderMapButton(field)}
                      {setEdit !== undefined && (
                        <IconButton
                          size="small"
                          onClick={() => {
                            const foundField = fields.find(
                              (entry) => entry.id === field.id,
                            );
                            if (foundField) {
                              setEdit(foundField);
                            }
                          }}
                        >
                          <Edit />
                        </IconButton>
                      )}
                      {onDelete !== undefined && (
                        <IconButton size="small" onClick={() => onDelete(field.id)}>
                          <Delete />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </For>
            </TableBody>
          </Table>
        </TableContainer>
      </div>

      <div class={styles.mobileCards}>
        <For each={getSortedFields(sorting())}>
          {(field) => (
            <article class={styles.fieldCard}>
              <div class={styles.fieldCardTop}>
                <span
                  class={styles.colorDot}
                  style={{
                    "background-color": field.draw_color,
                    width: "16px",
                    height: "16px",
                  }}
                />
                <div class={styles.fieldCardTitle}>
                  <A class={styles.fieldLink} href={`/fields/${field.id}`}>
                    <p class={styles.fieldCardName}>{field.name}</p>
                  </A>
                  <p class={styles.fieldCardGroup}>
                    {field.group_name || "Ungrouped"}
                  </p>
                </div>
                <div class={styles.fieldCardTopActions}>
                  {renderMapButton(field)}
                  {renderDeleteButton(field)}
                </div>
              </div>

              <div class={styles.fieldCardFacts}>
                <div class={styles.factTile}>
                  <p class={styles.factLabel}>Size</p>
                  <p class={styles.factValue}>{formatArea(field.size)}</p>
                </div>
                <div class={styles.factTile}>
                  <p class={styles.factLabel}>Field group</p>
                  <p class={styles.factValue}>
                    {field.group_name || "Ungrouped"}
                  </p>
                </div>
              </div>

              <Show when={setEdit !== undefined}>
                <div class={styles.fieldCardActions}>
                  {renderEditButtons(field)}
                </div>
              </Show>
            </article>
          )}
        </For>
      </div>
    </>
  );
};

export default function FieldsList(props?: {
  disableSearch?: boolean;
  maxItems?: number;
  showDelete?: boolean;
  setEdit?: (field: FarmField) => undefined;
  addButton?: (() => JSX.Element) | undefined;
}) {
  const queryClient = useQueryClient();
  const farmFieldGroups = createQuery(() => ({
    queryKey: ["field_groups"],
    queryFn: getFarmFieldGroups,
  }));
  const fields = createQuery(() => ({
    queryKey: ["fields_all"],
    queryFn: () =>
      fetch("/api/farm_fields/all").then((response) =>
        response.json() as Promise<FarmField[]>,
      ),
  }));
  const [sorting, setSorting] = createSignal<Sorting>({
    sortKey: "size",
    direction: "desc",
  });
  const [textFilter, setTextFilter] = createSignal("");
  const [toDelete, setToDelete] = createSignal<number | undefined>(undefined);

  const deleteFunction = async (id: number) => {
    const result = await deleteField(id);
    if (result) {
      queryClient.setQueryData(
        ["fields_all"],
        (current: FarmField[] | undefined) =>
          current?.filter((entry) => entry.id !== id),
      );
    }
  };

  return (
    <div class={styles.fieldsList}>
      <div class={styles.fieldsHeader}>
        <div class={styles.headerLead}>
          <p class={styles.headerTitle}>Field directory</p>
        </div>
        <div class={styles.headerActions}>
          <Show when={props?.addButton}>
            {props?.addButton && props?.addButton()}
          </Show>
          <Show when={props?.disableSearch !== true}>
            <TextField
              size="small"
              label="Search"
              class={styles.searchField}
              value={textFilter()}
              onChange={(event) => setTextFilter(event.currentTarget.value)}
            />
          </Show>
        </div>
      </div>
      <Show when={fields.data} fallback={<Skeleton height={360} />}>
        {(loadedFields) => (
          <>
            <ConfirmDeleteDialog
              open={toDelete() !== undefined}
              onClose={() => setToDelete(undefined)}
              onConfirm={() => {
                if (toDelete() !== undefined) {
                  deleteFunction(toDelete()!);
                  setToDelete(undefined);
                }
              }}
              title="Are you sure you want to delete this field?"
            ></ConfirmDeleteDialog>
            <Show when={farmFieldGroups.data}>
              {(groups) =>
                renderFieldsTable(
                  loadedFields(),
                  groups(),
                  textFilter,
                  sorting,
                  setSorting,
                  props?.showDelete === true
                    ? async (id: number) => {
                        setToDelete(id);
                      }
                    : undefined,
                  props?.maxItems,
                  props?.setEdit,
                )
              }
            </Show>
          </>
        )}
      </Show>
    </div>
  );
}

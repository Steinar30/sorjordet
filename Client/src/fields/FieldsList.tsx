import {
  Accessor,
  createMemo,
  createResource,
  createSignal,
  For,
  JSX,
  Show,
} from "solid-js";
import { getFarmFieldGroups, prepareAuth } from "../requests";

import {
  IconButton,
  Skeleton,
  Table,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from "@suid/material";
import { FarmFieldGroup } from "../../bindings/FarmFieldGroup";
import { FarmField } from "../../bindings/FarmField";
import {
  formatArea,
  getMapPolygonArea,
  parseJsonIntoFeature,
} from "../maps/Map";
import {
  ArrowUpward,
  Delete,
  Edit,
  Map as MapIcon,
} from "@suid/icons-material";

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

const RenderfieldsTable = (
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
  const groupMap = new Map(groups.map((g) => [g.id, g]));
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

  const getSortedFields = (f: Sorting) => {
    const sorted = displayFields().sort((a, b) => {
      if (f.sortKey === "name") {
        if (f.direction === "asc") {
          return a.name.localeCompare(b.name);
        } else {
          return b.name.localeCompare(a.name);
        }
      } else if (f.sortKey === "group-name") {
        if (f.direction === "asc") {
          return a.group_name.localeCompare(b.group_name);
        } else {
          return b.group_name.localeCompare(a.group_name);
        }
      } else if (f.sortKey === "size") {
        if (f.direction === "asc") {
          return a.size - b.size;
        } else {
          return b.size - a.size;
        }
      } else {
        return 0;
      }
    });
    return maxItems ? sorted.slice(0, maxItems) : sorted;
  };

  const toggleSort = (sortKey: "name" | "group-name" | "size") => () => {
    if (sortKey === sorting().sortKey) {
      if (sorting().direction === "asc") {
        setSorting({ ...sorting(), direction: "desc" });
      } else {
        setSorting({ ...sorting(), direction: "asc" });
      }
    } else {
      setSorting({ ...sorting(), sortKey, direction: "asc" });
    }
  };

  const renderSortableHeader = (
    label: string,
    sortKey: "name" | "group-name" | "size",
  ) => {
    return (
      <TableCell sx={{ cursor: "pointer" }} onClick={toggleSort(sortKey)}>
        {label}
        {sorting().sortKey === sortKey && sorting().direction === "asc" && (
          <ArrowUpward
            sx={{
              width: "1rem",
              height: "1rem",
              transition: "transform 300ms",
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
            }}
          />
        )}
      </TableCell>
    );
  };

  const tryGetFieldFeature = (id: number, groupName: string) => {
    const field = fields.find((f) => f.id === id);
    if (field) {
      const f = parseJsonIntoFeature(field, groupName);
      if (f) {
        return f;
      } else {
        return undefined;
      }
    }
    return undefined;
  };

  const actionRowSize =
    (35 + (setEdit ? 35 : 0) + (onDelete ? 35 : 0)).toString() + "px";

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
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell></TableCell>
              {renderSortableHeader("Name", "name")}
              {renderSortableHeader("Field Group", "group-name")}
              {renderSortableHeader("Size", "size")}
              <TableCell sx={{ width: actionRowSize }}></TableCell>
            </TableRow>
          </TableHead>
          <For each={getSortedFields(sorting())}>
            {(field) => {
              return (
                <TableRow>
                  <TableCell sx={{ width: "20px" }}>
                    <span
                      style={{
                        display: "block",
                        "background-color": field.draw_color,
                        width: "20px",
                        height: "20px",
                        "border-radius": "50%",
                        border: "1px solid gray",
                      }}
                    />
                  </TableCell>
                  <TableCell>{field.name}</TableCell>
                  <TableCell>{field.group_name}</TableCell>
                  <TableCell>{formatArea(field.size)}</TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setFieldPeek(field);
                      }}
                    >
                      <MapIcon />
                    </IconButton>
                    {setEdit !== undefined && (
                      <IconButton
                        size="small"
                        onClick={() => {
                          const foundField = fields.find(
                            (x) => x.id === field.id,
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
                      <IconButton
                        size="small"
                        onClick={() => onDelete(field.id)}
                      >
                        <Delete />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              );
            }}
          </For>
        </Table>
      </TableContainer>
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
  const [farmFieldGroups] = createResource(getFarmFieldGroups);
  const [fields, setFields] = createResource(() =>
    fetch("/api/farm_fields/all").then((a) => a.json() as Promise<FarmField[]>),
  );
  const [sorting, setSorting] = createSignal<Sorting>({
    sortKey: "size",
    direction: "desc",
  });
  const [textFilter, setTextFilter] = createSignal("");
  const [toDelete, setToDelete] = createSignal<number | undefined>(undefined);

  const deleteFunction = async (id: number) => {
    const res = await deleteField(id);
    if (res) {
      setFields.mutate((x) => x?.filter((x) => x.id !== id));
    }
  };

  return (
    <div class={styles.fieldsList}>
      <div class={styles.fieldsHeader}>
        <div>
          <Show when={props?.addButton}>
            {props?.addButton && props?.addButton()}
          </Show>
        </div>
        <Show when={props?.disableSearch !== true}>
          <TextField
            size="small"
            label="Search"
            value={textFilter()}
            onChange={(e) => setTextFilter(e.currentTarget.value)}
          />
        </Show>
      </div>
      <Show when={fields()} fallback={<Skeleton />}>
        {(fields) => (
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
            <Show when={farmFieldGroups()}>
              {(groups) =>
                RenderfieldsTable(
                  fields(),
                  groups(),
                  textFilter,
                  sorting,
                  setSorting,
                  props?.showDelete === true ? deleteFunction : undefined,
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

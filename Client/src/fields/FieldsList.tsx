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
import { formatArea, getMapPolygonArea } from "../maps/Map";
import { ArrowUpward, Delete, Edit } from "@suid/icons-material";

import styles from "./Fields.module.css";

type Sorting = {
  sortKey: "name" | "group-name" | "size";
  direction: "asc" | "desc";
};

type DisplayedField = {
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

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell></TableCell>
            {renderSortableHeader("Name", "name")}
            {renderSortableHeader("Field Group", "group-name")}
            {renderSortableHeader("Size", "size")}
            {(onDelete !== undefined || setEdit !== undefined) && (
              <TableCell></TableCell>
            )}
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
                {(onDelete !== undefined || setEdit !== undefined) && (
                  <TableCell>
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
                )}
              </TableRow>
            );
          }}
        </For>
      </Table>
    </TableContainer>
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

  const deleteFunction = async (id: number) => {
    const res = await deleteField(id);
    if (res) {
      setFields.mutate((x) => x?.filter((x) => x.id !== id));
    }
  };

  return (
    <div class={styles.fieldsList}>
      <div class={styles.fieldsHeader}>
        <Show when={props?.addButton}>
          {props?.addButton && props?.addButton()}
        </Show>
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
        )}
      </Show>
    </div>
  );
}

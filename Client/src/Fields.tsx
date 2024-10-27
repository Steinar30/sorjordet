import { Accessor, createMemo, createResource, createSignal, For, Show } from "solid-js";
import { getFarmFieldGroups } from "./requests";

import { Table, TableCell, TableHead, TableRow, TextField } from "@suid/material";
import { FarmFieldGroup } from "../bindings/FarmFieldGroup";
import { FarmField } from "../bindings/FarmField";
import { formatArea, getMapPolygonArea } from "./maps/Map";
import { ArrowUpward } from "@suid/icons-material";


type Sorting = {
    sortKey: "name" | "group-name" | "size";
    direction: "asc" | "desc";
}

type DisplayedField = {
    id: number;
    name: string;
    group_name: string;
    size: number;
    draw_color: string;
}

const RenderfieldsTable = (fields: FarmField[], groups: FarmFieldGroup[], textFilter: Accessor<string>, sorting: Accessor<Sorting>, setSorting: (s: Sorting) => void) => {
    const groupMap = new Map(groups.map(g => [g.id, g]));
    const getFieldGroup = (id: number | null) => id === null ? null : groupMap.get(id);

    const displayFields: Accessor<DisplayedField[]> = createMemo(() => fields
        .map(field => {
            const group = getFieldGroup(field.farm_field_group_id);
            return {
                id: field.id,
                name: field.name,
                group_name: group?.name ?? "",
                size: getMapPolygonArea(field.map_polygon_string),
                draw_color: group?.draw_color ?? ""
            }
        })
        .filter(field => {
            return field.name.toLowerCase().includes(textFilter().toLowerCase()) ||
                field.group_name.toLowerCase().includes(textFilter().toLowerCase());
        }), [fields, textFilter, getFieldGroup]);

    const getSortedFields = (f: Sorting) => displayFields().sort((a, b) => {
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
    }

    const renderSortableHeader = (label: string, sortKey: "name" | "group-name" | "size") => {
        return (
            <TableCell onClick={toggleSort(sortKey)}>
                {label}
                {sorting().sortKey === sortKey && sorting().direction === "asc" &&
                    <ArrowUpward sx={{ width: "1rem", height: "1rem", transition: "transform 300ms" }} />
                }
                {sorting().sortKey === sortKey && sorting().direction === "desc" &&
                    <ArrowUpward sx={{ transform: "rotate(180deg)", width: "1rem", height: "1rem", transition: "transform 300ms" }} />
                }
            </TableCell>
        )
    }

    return (
        <Table size="small">
            <TableHead>
                <TableRow>
                    <TableCell></TableCell>
                    {renderSortableHeader("Name", "name")}
                    {renderSortableHeader("Field Group", "group-name")}
                    {renderSortableHeader("Size", "size")}
                </TableRow>
            </TableHead>
            <For each={getSortedFields(sorting())}>{(field) => {
                return (
                    <TableRow>
                        <TableCell sx={{ width: "20px" }}>
                            <span style={{ display: "block", "background-color": field.draw_color, width: "20px", height: "20px", "border-radius": "50%", border: "1px solid gray" }} />
                        </TableCell>
                        <TableCell>{field.name}</TableCell>
                        <TableCell>{field.group_name}</TableCell>
                        <TableCell>{formatArea(field.size)}</TableCell>
                    </TableRow>
                )
            }}
            </For>
        </Table>
    )
}

export default function FieldsList() {
    const [farmFieldGroups] = createResource(getFarmFieldGroups);
    const [fields] = createResource(() => fetch('/api/farm_fields/all').then(a => a.json() as Promise<FarmField[]>));
    const [sorting, setSorting] = createSignal<Sorting>({
        sortKey: "name",
        direction: "asc",
    });
    const [textFilter, setTextFilter] = createSignal("");

    return (
        <main style={{ "margin": "20px", gap: "16px", "display": "flex", "flex-direction": "row", "flex-wrap": "wrap", "align-items": "start", "justify-content": "space-evenly" }}>
            <TextField
                size="small"
                label="Search"
                value={textFilter()}
                onChange={(e) => setTextFilter(e.currentTarget.value)}
            />
            <Show when={fields()}>
                {(fields) =>
                    <Show when={farmFieldGroups()}>
                        {(groups) => RenderfieldsTable(fields(), groups(), textFilter, sorting, setSorting)}
                    </Show>
                }
            </Show>

        </main>
    );
}
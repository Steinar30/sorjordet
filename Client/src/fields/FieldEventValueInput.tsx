import { TextField } from "@suid/material";
import { createSignal } from "solid-js";

import { FieldEventTypeField } from "../../bindings/FieldEventTypeField";
import { FieldEventValue } from "../../bindings/FieldEventValue";

function initialRaw(value: FieldEventValue | undefined): string {
  if (!value) {
    return "";
  }

  return String(value.value);
}

function parseNumericValue(raw: string): number {
  const normalized = raw.trim().replace(",", ".");
  return normalized === "" ? 0 : Number(normalized);
}

export function FieldEventValueInput(props: {
  field: FieldEventTypeField;
  value: FieldEventValue | undefined;
  class?: string;
  onValue: (value: FieldEventValue) => void;
}) {
  const [raw, setRaw] = createSignal(initialRaw(props.value));

  const commit = (nextRaw: string) => {
    setRaw(nextRaw);

    if (props.field.value_kind === "unit_int") {
      props.onValue({
        kind: "unit_int",
        value: parseNumericValue(nextRaw),
        unit: props.field.unit ?? "",
      });
      return;
    }

    if (props.field.value_kind === "int") {
      props.onValue({
        kind: "int",
        value: parseNumericValue(nextRaw),
      });
      return;
    }

    props.onValue({ kind: "text", value: nextRaw });
  };

  return (
    <TextField
      class={props.class}
      label={props.field.unit ? `${props.field.name} (${props.field.unit})` : props.field.name}
      size="small"
      type="text"
      inputProps={props.field.value_kind === "text" ? undefined : { inputMode: "decimal" }}
      value={raw()}
      onChange={(_event, nextRaw) => commit(nextRaw)}
    />
  );
}

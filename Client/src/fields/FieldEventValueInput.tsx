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
        value: nextRaw.trim() === "" ? 0 : Number(nextRaw),
        unit: props.field.unit ?? "",
      });
      return;
    }

    if (props.field.value_kind === "int") {
      props.onValue({
        kind: "int",
        value: nextRaw.trim() === "" ? 0 : Number(nextRaw),
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
      type={props.field.value_kind === "text" ? "text" : "number"}
      value={raw()}
      onChange={(_event, nextRaw) => commit(nextRaw)}
    />
  );
}

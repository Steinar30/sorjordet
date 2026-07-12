import { FieldEventType } from "../../bindings/FieldEventType";
import { FieldEventTypeField } from "../../bindings/FieldEventTypeField";
import { FieldEventValue } from "../../bindings/FieldEventValue";

export type FieldEventValues = Record<string, FieldEventValue>;

export function emptyValueForField(field: FieldEventTypeField): FieldEventValue {
  if (field.value_kind === "int") {
    return { kind: "int", value: 0 };
  }

  if (field.value_kind === "unit_int") {
    return { kind: "unit_int", value: 0, unit: field.unit ?? "" };
  }

  return { kind: "text", value: "" };
}

export function valuesForType(
  eventType: FieldEventType | undefined,
  current: FieldEventValues = {},
): FieldEventValues {
  const values: FieldEventValues = {};
  eventType?.fields.forEach((field) => {
    const existing = current[field.name];
    if (field.value_kind === "unit_int" && existing?.kind === "unit_int") {
      values[field.name] = {
        kind: "unit_int",
        value: existing.value,
        unit: field.unit ?? existing.unit,
      };
    } else if (field.value_kind === "int" && existing?.kind === "int") {
      values[field.name] = existing;
    } else if (field.value_kind === "text" && existing?.kind === "text") {
      values[field.name] = existing;
    } else {
      values[field.name] = emptyValueForField(field);
    }
  });
  return values;
}

export function formatFieldEventValue(value: FieldEventValue): string {
  if (value.kind === "unit_int") {
    return `${value.value} ${value.unit}`.trim();
  }

  return String(value.value);
}

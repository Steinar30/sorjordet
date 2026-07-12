import { For, Show } from "solid-js";

import type { FieldEvent } from "../../bindings/FieldEvent";
import type { FieldEventValueKind } from "../../bindings/FieldEventValueKind";
import { formatFieldEventValue } from "./fieldEventValues";

export const fieldEventValueKindLabels: Record<FieldEventValueKind, string> = {
  text: "text",
  int: "number",
  unit_int: "number with unit",
};

function entries(event: FieldEvent) {
  return Object.entries(event.values);
}

export function FieldEventSummary(props: {
  event: FieldEvent;
  class?: string;
  typeClass?: string;
  valuesClass?: string;
  valueClass?: string;
  nameClass?: string;
  formattedValueClass?: string;
}) {
  const valueEntries = () => entries(props.event);
  const singleValue = () => valueEntries()[0];

  return (
    <div class={props.class}>
      <span class={props.typeClass}>{props.event.type_name}</span>
      <Show keyed when={singleValue()}>
        {([name, value]) => (
          <span class={props.valueClass}>
            <span class={props.nameClass}>{name}</span>
            <span class={props.formattedValueClass}>{formatFieldEventValue(value)}</span>
          </span>
        )}
      </Show>
      <Show when={valueEntries().length > 1}>
        <span class={props.valuesClass}>
          <For each={valueEntries().slice(1)}>
            {([name, value]) => (
              <span class={props.valueClass}>
                <span class={props.nameClass}>{name}</span>
                <span class={props.formattedValueClass}>{formatFieldEventValue(value)}</span>
              </span>
            )}
          </For>
        </span>
      </Show>
    </div>
  );
}

export function FieldEventPrimaryValues(props: {
  event: FieldEvent;
  class?: string;
  itemClass?: string;
  nameClass?: string;
  valueClass?: string;
}) {
  const valueEntries = () => entries(props.event);

  return (
    <Show when={valueEntries().length > 0}>
      <div class={props.class}>
        <For each={valueEntries()}>
          {([name, value]) => (
            <div class={props.itemClass}>
              <span class={props.nameClass}>{name}</span>
              <strong class={props.valueClass}>{formatFieldEventValue(value)}</strong>
            </div>
          )}
        </For>
      </div>
    </Show>
  );
}

export function FieldEventNote(props: { event: FieldEvent; class?: string; fallback?: string }) {
  return (
    <span class={props.class}>
      {props.event.note?.trim() ? props.event.note : (props.fallback ?? "-")}
    </span>
  );
}

export function FieldEventValueBoxes(props: { event: FieldEvent; boxClass?: string }) {
  const valueEntries = () => entries(props.event);

  return (
    <Show
      when={valueEntries().length > 0}
      fallback={
        <div class={props.boxClass}>
          <p>Values</p>
          <span>-</span>
        </div>
      }
    >
      <For each={valueEntries()}>
        {([name, value]) => (
          <div class={props.boxClass}>
            <p>{name}</p>
            <span>{formatFieldEventValue(value)}</span>
          </div>
        )}
      </For>
    </Show>
  );
}

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@suid/material";
import { createQuery } from "@tanstack/solid-query";
import { Accessor, createMemo, createSignal, For, Show } from "solid-js";
import DatePicker, { PickerValue } from "@rnwonder/solid-date-picker";
import "@rnwonder/solid-date-picker/dist/style.css";

import { FieldEvent } from "../../bindings/FieldEvent";
import { FieldEventType } from "../../bindings/FieldEventType";
import { FieldEventValue } from "../../bindings/FieldEventValue";
import { prepareAuth } from "../requests";
import { FieldEventValueInput } from "./FieldEventValueInput";
import { FieldEventValues, valuesForType } from "./fieldEventValues";
import styles from "./FieldEventForm.module.css";

async function createFieldEvent(
  fieldId: number,
  eventType: FieldEventType,
  time: string,
  values: FieldEventValues,
  note: string,
): Promise<FieldEvent> {
  const authHeaders = prepareAuth(true);
  if (authHeaders === null) {
    throw new Error("not allowed to post without bearer token");
  }

  const payload: FieldEvent = {
    id: -1,
    field_id: fieldId,
    type_id: eventType.id,
    type_name: eventType.name,
    time: new Date(time).toISOString(),
    note: note.trim() ? note.trim() : null,
    values,
  };

  const response = await fetch("/api/field_event", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Something went wrong creating field event");
  }

  const id = await response.json();
  return {
    ...payload,
    id: Number(id),
  };
}

export function FieldEventForm(props: {
  isOpen: Accessor<boolean>;
  fieldId: number;
  onClose: () => void;
  onCreated: (event: FieldEvent) => void;
}) {
  const [typeId, setTypeId] = createSignal(-1);
  const [values, setValues] = createSignal<FieldEventValues>({});
  const [note, setNote] = createSignal("");
  const [date, setDate] = createSignal<PickerValue>({
    value: {},
    label: "",
  });
  const [showInvalid, setShowInvalid] = createSignal(false);

  const eventTypes = createQuery<FieldEventType[]>(() => ({
    queryKey: ["field_event_types"],
    queryFn: () => fetch("/api/field_event_type").then((a) => a.json()),
  }));

  const selectedType = createMemo(() =>
    eventTypes.data?.find((eventType) => eventType.id === typeId()),
  );

  const canSave = createMemo(() => typeId() > 0 && !!date().value.selected);

  const resetForm = () => {
    setTypeId(-1);
    setValues({});
    setNote("");
    setDate({
      value: {},
      label: "",
    });
    setShowInvalid(false);
  };

  const setFieldValue = (name: string, value: FieldEventValue) => {
    setValues((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const save = async () => {
    setShowInvalid(true);
    const selected = date().value.selected;
    const eventType = selectedType();
    if (!selected || !eventType) {
      return;
    }

    const result = await createFieldEvent(
      props.fieldId,
      eventType,
      selected,
      valuesForType(eventType, values()),
      note(),
    );
    resetForm();
    props.onCreated(result);
  };

  return (
    <Dialog
      open={props.isOpen()}
      onClose={() => {
        resetForm();
        props.onClose();
      }}
      PaperProps={{ class: styles.dialogPaper }}
    >
      <DialogTitle class={styles.dialogTitle}>New field event</DialogTitle>
      <DialogContent class={styles.dialogContent}>
        <FormControl fullWidth class={styles.field}>
          <InputLabel shrink id="field-event-type">
            Event type
          </InputLabel>
          <Select
            labelId="field-event-type"
            label="Event type"
            notched
            value={typeId()}
            onChange={(event) => {
              const nextTypeId = Number(event.target.value);
              const nextType = eventTypes.data?.find((item) => item.id === nextTypeId);
              setTypeId(nextTypeId);
              setValues(valuesForType(nextType));
            }}
          >
            <MenuItem value={-1}>Select type</MenuItem>
            <For each={eventTypes.data ?? []}>
              {(eventType) => <MenuItem value={eventType.id}>{eventType.name}</MenuItem>}
            </For>
          </Select>
        </FormControl>

        <div class={styles.dateRow}>
          <DatePicker
            inputWrapperWidth="100%"
            placeholder="Select date"
            zIndex={2000}
            value={date}
            setValue={setDate}
            inputWrapperClass={styles.dateInputWrapper}
            inputClass={`${styles.dateInput} ${
              showInvalid() && !date().value.selected ? styles.dateInputInvalid : ""
            }`}
            shouldCloseOnSelect
          />
          <Button
            variant="outlined"
            class={styles.nowButton}
            onClick={() => {
              const now = new Date();
              setDate({
                value: { selected: now.toISOString() },
                label: now.toLocaleDateString("nb-NO"),
              });
            }}
          >
            Now
          </Button>
        </div>

        <TextField
          class={styles.field}
          label="Note"
          size="small"
          multiline
          minRows={3}
          value={note()}
          onChange={(_event, nextNote) => setNote(nextNote)}
        />

        <Show when={selectedType()}>
          {(eventType) => (
            <For each={eventType().fields}>
              {(field) => (
                <FieldEventValueInput
                  field={field}
                  value={values()[field.name]}
                  class={styles.field}
                  onValue={(value) => setFieldValue(field.name, value)}
                />
              )}
            </For>
          )}
        </Show>
      </DialogContent>
      <DialogActions class={styles.dialogActions}>
        <Button
          onClick={() => {
            resetForm();
            props.onClose();
          }}
        >
          Cancel
        </Button>
        <Button variant="contained" disabled={!canSave()} onClick={save}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

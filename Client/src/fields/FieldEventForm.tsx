import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@suid/material";
import { Accessor, createMemo, createSignal } from "solid-js";
import DatePicker, { PickerValue } from "@rnwonder/solid-date-picker";
import "@rnwonder/solid-date-picker/dist/style.css";

import { FieldEvent } from "../../bindings/FieldEvent";
import { prepareAuth } from "../requests";
import styles from "./FieldEventForm.module.css";

async function createFieldEvent(
  fieldId: number,
  eventName: string,
  time: string,
  description: string,
): Promise<FieldEvent> {
  const authHeaders = prepareAuth(true);
  if (authHeaders === null) {
    throw new Error("not allowed to post without bearer token");
  }

  const payload: FieldEvent = {
    id: -1,
    field_id: fieldId,
    event_name: eventName,
    time: new Date(time).toISOString(),
    description: description.trim() ? description.trim() : null,
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
  const [eventName, setEventName] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [date, setDate] = createSignal<PickerValue>({
    value: {},
    label: "",
  });
  const [showInvalid, setShowInvalid] = createSignal(false);

  const canSave = createMemo(
    () => eventName().trim().length > 0 && !!date().value.selected,
  );

  const resetForm = () => {
    setEventName("");
    setDescription("");
    setDate({
      value: {},
      label: "",
    });
    setShowInvalid(false);
  };

  const save = async () => {
    setShowInvalid(true);
    const selected = date().value.selected;
    if (!selected || eventName().trim().length === 0) {
      return;
    }

    const result = await createFieldEvent(
      props.fieldId,
      eventName().trim(),
      selected,
      description(),
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
        <TextField
          class={styles.field}
          label="Event name"
          size="small"
          value={eventName()}
          onChange={(event) => setEventName(event.currentTarget.value)}
        />

        <div class={styles.dateRow}>
          <DatePicker
            inputWrapperWidth="100%"
            placeholder="Select date"
            zIndex={2000}
            value={date}
            setValue={setDate}
            inputWrapperClass={styles.dateInputWrapper}
            inputClass={`${styles.dateInput} ${showInvalid() && !date().value.selected
                ? styles.dateInputInvalid
                : ""
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
          label="Description"
          size="small"
          multiline
          minRows={3}
          value={description()}
          onChange={(event) => setDescription(event.currentTarget.value)}
        />
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

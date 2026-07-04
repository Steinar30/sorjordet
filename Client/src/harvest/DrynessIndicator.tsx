import { For, Show } from "solid-js";
import OpacityIcon from "@suid/icons-material/Opacity";
import WaterIcon from "@suid/icons-material/Water";
import WbSunnyIcon from "@suid/icons-material/WbSunny";
import { drynessRatings, getDrynessDisplay } from "./dryness";
import styles from "./Harvest.module.css";

export function DrynessIcon(props: { rating: number | null | undefined }) {
  const display = () => getDrynessDisplay(props.rating);

  return (
    <Show
      when={display().icon === "dry"}
      fallback={display().icon === "wet" ? <WaterIcon fontSize="small" /> : <OpacityIcon fontSize="small" />}
    >
      <WbSunnyIcon fontSize="small" />
    </Show>
  );
}

export function DrynessIndicator(props: {
  rating: number | null | undefined;
  class?: string;
  compact?: boolean;
}) {
  const display = () => getDrynessDisplay(props.rating);

  return (
    <span
      class={props.class}
      title={display().description}
      style={{
        "background": display().background,
        "border-color": display().borderColor,
        "color": display().color,
      }}
    >
      <DrynessIcon rating={props.rating} />
      <span>{props.compact ? (display().rating ? `${display().rating}/5` : "-") : display().label}</span>
      <Show when={display().rating !== null && !props.compact}>
        <span aria-hidden="true">{display().rating}/5</span>
      </Show>
    </span>
  );
}

export function DrynessSelector(props: {
  value: number | null | undefined;
  onChange: (rating: number | null) => void;
  class?: string;
}) {
  return (
    <div class={`${styles.drynessSelector} ${props.class ?? ""}`}>
      <For each={drynessRatings}>
        {(rating) => {
          const display = getDrynessDisplay(rating);
          return (
            <button
              type="button"
              class={`${styles.drynessSelectorButton} ${props.value === rating ? styles.drynessSelectorButtonSelected : ""}`}
              style={{
                "background": props.value === rating ? display.background : undefined,
                "border-color": props.value === rating ? display.borderColor : undefined,
                "color": props.value === rating ? display.color : undefined,
              }}
              aria-label={`Set dryness ${display.label}`}
              aria-pressed={props.value === rating}
              title={display.description}
              onClick={(event) => {
                event.stopPropagation();
                props.onChange(rating);
              }}
            >
              <span
                class={styles.drynessSelectorSwatch}
                style={{ "background": display.background }}
                aria-hidden="true"
              />
              <span class={styles.drynessSelectorValue}>{rating}</span>
            </button>
          );
        }}
      </For>
      <button
        type="button"
        class={`${styles.drynessSelectorButton} ${styles.drynessSelectorUnset} ${props.value == null ? styles.drynessSelectorButtonSelected : ""}`}
        aria-label="Clear dryness"
        aria-pressed={props.value == null}
        title={getDrynessDisplay(null).description}
        onClick={(event) => {
          event.stopPropagation();
          props.onChange(null);
        }}
      >
        <span class={styles.drynessSelectorSwatch} aria-hidden="true" />
        <span class={styles.drynessSelectorValue}>-</span>
      </button>
    </div>
  );
}

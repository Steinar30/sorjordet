import { Show } from "solid-js";
import OpacityIcon from "@suid/icons-material/Opacity";
import WaterIcon from "@suid/icons-material/Water";
import WbSunnyIcon from "@suid/icons-material/WbSunny";
import { getDrynessDisplay } from "./dryness";

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
      <span>{props.compact ? display().shortLabel : display().label}</span>
      <Show when={display().rating !== null && !props.compact}>
        <span aria-hidden="true">{display().rating}/5</span>
      </Show>
    </span>
  );
}
import { JSX, Show } from "solid-js";
import styles from "./Harvest.module.css";

export type HarvestMobileCardFact = {
  label: string;
  value: JSX.Element;
  wideSecondColumn?: boolean;
};

export function HarvestMobileCard(props: {
  title: JSX.Element;
  subtitle?: JSX.Element;
  eyebrow?: string;
  facts: HarvestMobileCardFact[];
  action?: JSX.Element;
  onClick: () => void;
  wideSecondColumn?: boolean;
}) {
  return (
    <article class={styles.harvestCard} onClick={props.onClick}>
      <div class={styles.harvestCardTop}>
        <div>
          <Show when={props.eyebrow}>
            <p class={styles.harvestCardLabel}>{props.eyebrow}</p>
          </Show>
          <strong>{props.title}</strong>
          <Show when={props.subtitle}>
            <span class={styles.harvestCardGroupName}>{props.subtitle}</span>
          </Show>
        </div>
        <Show when={props.action}>
          <div class={styles.harvestCardAction}>{props.action}</div>
        </Show>
      </div>
      <div
        class={`${styles.harvestCardFacts} ${props.wideSecondColumn ? styles.harvestCardFactsWideSecond : ""}`}
      >
        {props.facts.map((fact) => (
          <div class={fact.wideSecondColumn ? styles.harvestCardFactWideSecond : undefined}>
            <p>{fact.label}</p>
            <span class={styles.harvestCardFactValue}>{fact.value}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

import { Accessor, createMemo, createSignal, Setter, Switch, Match } from "solid-js";
import { HarvestEvent } from "../../bindings/HarvestEvent";
import {
  Button,
  Card,
  CardContent,
  Checkbox,
  TextField,
  Typography,
} from "@suid/material";
import { prepareAuth } from "../requests";
import styles from "./Harvest.module.css";

import TractorIcon from "@suid/icons-material/Agriculture";
import TractorIconOutlined from "@suid/icons-material/AgricultureOutlined";

import { ValidHarvest } from "./HarvestForm";
import { DrynessSelector } from "./DrynessIndicator";

const updateHarvestEvent = async (
  harvest: HarvestEvent,
): Promise<HarvestEvent | undefined> => {
  const authHeaders = prepareAuth(true);
  if (authHeaders === null) {
    console.log("not allowed to post without bearer token");
    return;
  }
  const response = await fetch(`/api/harvest_event/${harvest.id}`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify(harvest),
  });
  if (response.status === 200) {
    return response.json() as Promise<HarvestEvent>;
  }
};

export const renderHarvest = (h: HarvestEvent | undefined) => {
  if (!h) {
    return undefined;
  }
  return h.type_name + " " + renderDateTime(h.time);
};

const renderDateTime = (t: string) => {
  const time = new Date(t);
  return time.toLocaleDateString("nb-NO");
};

function EditHarvestForm(props: {
  selectedHarvest: Accessor<ValidHarvest>;
  commit: (harvest: HarvestEvent) => void;
  onHarvestUpdated: (harvest: HarvestEvent) => void;
}) {
  const initialHarvest = () => props.selectedHarvest();
  const [editHarvest, setEditHarvest] = createSignal<HarvestEvent>(
    initialHarvest().harvest,
  );

  const isDirty = createMemo(() =>
    editHarvest().value !== initialHarvest().harvest.value ||
    editHarvest().type_name !== initialHarvest().harvest.type_name ||
    editHarvest().dryness_rating !== initialHarvest().harvest.dryness_rating,
  );

  return (
    <div class={styles.selectedEditForm}>
      <TextField
        fullWidth
        id="outlined-basic"
        label="Value"
        variant="outlined"
        type="number"
        value={editHarvest().value}
        onChange={(x) => {
          const parsed = parseInt(x.currentTarget.value);
          setEditHarvest({
            ...editHarvest(),
            value: !isNaN(parsed) ? parsed : 0,
          });
        }}
      />
      <div class={styles.selectedEditDryness}>
        <span>Dryness</span>
        <DrynessSelector
          value={editHarvest().dryness_rating}
          onChange={(rating) =>
            setEditHarvest({
              ...editHarvest(),
              dryness_rating: rating,
            })
          }
        />
      </div>
      <div class={styles.selectedActions}>
        <Button
          disabled={!isDirty()}
          variant="contained"
          color="primary"
          onClick={async () => {
            const res = await updateHarvestEvent(editHarvest());
            if (res) {
              props.commit(res);
              props.onHarvestUpdated(res);
              setEditHarvest(res);
            }
          }}
        >
          Save
        </Button>
        <Button
          variant="outlined"
          onClick={() => setEditHarvest(initialHarvest().harvest)}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}

export function Harvest({ selectedHarvest, setSelectedHarvest, onHarvestUpdated }: {
  selectedHarvest: Accessor<ValidHarvest>;
  setSelectedHarvest: Setter<ValidHarvest | undefined>;
  onHarvestUpdated: (harvest: HarvestEvent) => void;
}
) {
  const [tractorMode, setTractorMode] = createSignal(
    localStorage.getItem("tractor_mode") === "true",
  );
  const [isLoading, setIsLoading] = createSignal(false);
  const [syncTimer, setSyncTimer] = createSignal(0);

  async function syncHarvestValue() {
    const h = selectedHarvest();
    if (isLoading() || !h) return;
    setIsLoading(true);
    try {
      const result = await updateHarvestEvent(h.harvest);
      if (result) {
        setSelectedHarvest({
          ...h,
          harvest: result,
        });
        onHarvestUpdated(result);
      }
    } finally {
      setIsLoading(false);
    }
  }

  const tractorModeAdd = (harvest: ValidHarvest) => {
    clearTimeout(syncTimer());

    setSelectedHarvest({
      ...harvest,
      harvest: {
        ...harvest.harvest,
        value: harvest.harvest.value + 1,
      },
    });

    const timer = setTimeout(syncHarvestValue, 1000);
    setSyncTimer(timer);
  };

  const tractorModeSub = (harvest: ValidHarvest) => {
    if (harvest.harvest.value <= 0) {
      return;
    }
    clearTimeout(syncTimer());

    setSelectedHarvest({
      ...harvest,
      harvest: {
        ...harvest.harvest,
        value: harvest.harvest.value - 1,
      },
    });

    const timer = setTimeout(syncHarvestValue, 1000);
    setSyncTimer(timer);
  };

  const updateDryness = async (nextRating: number | null) => {
    const current = selectedHarvest();
    const nextHarvest = {
      ...current.harvest,
      dryness_rating: nextRating,
    };

    setSelectedHarvest({
      ...current,
      harvest: nextHarvest,
    });

    const result = await updateHarvestEvent(nextHarvest);
    if (result) {
      const latest = selectedHarvest();
      if (latest.harvest.id !== result.id) {
        return;
      }

      setSelectedHarvest({
        ...latest,
        harvest: {
          ...result,
          value: latest.harvest.value,
        },
      });
      onHarvestUpdated(result);
    }
  };

  const tractorModeButton = () => {
    return (
      <Checkbox
        checked={tractorMode()}
        onChange={() => {
          const newValue = !tractorMode();
          localStorage.setItem("tractor_mode", String(newValue));
          setTractorMode(newValue);
        }}
        icon={<TractorIconOutlined />}
        checkedIcon={<TractorIcon />}
        class={styles.tractorToggle}
      />
    );
  };

  function RenderSelectedHarvest({ harvest, setHarvest }: { harvest: Accessor<ValidHarvest>, setHarvest: Setter<ValidHarvest | undefined> }) {
    const commitHarvest = (toCommit: HarvestEvent) => {
      setHarvest({ ...harvest(), harvest: toCommit });
    };
    return (
      <Card
        variant="outlined"
        class={styles.selectedHarvestCard}
      >
        <CardContent>
          <div class={styles.selectedHarvestTop}>
            <Typography variant="h4">{harvest().field.name}</Typography>

            {tractorModeButton()}
          </div>
          <Typography variant="subtitle1" color="text.secondary">
            {harvest().group.name}
          </Typography>
          <Typography
            class={styles.selectedHarvestSubtitle}
            variant="h6"
            color="text.primary"
          >
            {renderHarvest(harvest().harvest)}
          </Typography>
          <Switch>
            <Match when={!tractorMode()}>
              <EditHarvestForm
                selectedHarvest={harvest}
                commit={commitHarvest}
                onHarvestUpdated={onHarvestUpdated}
              />
            </Match>
            <Match when={tractorMode()}>
              <div class={styles.selectedDrynessControl}>
                <span>Dryness</span>
                <DrynessSelector
                  value={harvest().harvest.dryness_rating}
                  onChange={updateDryness}
                />
              </div>
              <Typography
                class={styles.tractorValue}
                variant="h1"
                color="text.primary"
              >
                {harvest().harvest.value}
              </Typography>
              <div class={styles.tractorActions}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => tractorModeAdd(harvest())}
                >
                  +
                </Button>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => tractorModeSub(harvest())}
                >
                  -
                </Button>
              </div>
            </Match>
          </Switch>
        </CardContent>
      </Card>
    );
  }

  return (
    <div class={styles.selectedHarvestPage}>
      <Button
        variant="outlined"
        onClick={() => setSelectedHarvest(undefined)}
      >
        Back
      </Button>
      <RenderSelectedHarvest harvest={selectedHarvest} setHarvest={setSelectedHarvest} />
    </div>
  );
}
// note to self, make sure the filters are persisted between back and forth.
// probably easiest to do this by switching the render order? 
// either way we need the state to be changed so the fetching/filters is always rendered when on the page

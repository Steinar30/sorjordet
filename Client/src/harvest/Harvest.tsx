import { Accessor, createSignal, Setter, Show } from "solid-js";
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

import TractorIcon from "@suid/icons-material/Agriculture";
import TractorIconOutlined from "@suid/icons-material/AgricultureOutlined";

import { ValidHarvest } from "./HarvestForm";

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

export function Harvest({ selectedHarvest, setSelectedHarvest }: {
  selectedHarvest: Accessor<ValidHarvest>;
  setSelectedHarvest: Setter<ValidHarvest | undefined>
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
        style={{ height: "fit-content" }}
      />
    );
  };

  const renderEditHarvest = (
    initialHarvest: ValidHarvest,
    commit: (harvest: HarvestEvent) => void,
  ) => {
    const [editHarvest, setEditHarvest] = createSignal<HarvestEvent>(
      initialHarvest.harvest,
    );
    return (
      <div
        style={{
          display: "flex",
          "flex-direction": "column",
          gap: "16px",
          "margin-top": "16px",
        }}
      >
        <TextField
          fullWidth
          id="outlined-basic"
          label="Value"
          variant="outlined"
          type="number"
          sx={{ marginTop: "20px" }}
          value={editHarvest().value}
          onChange={(x) => {
            const parsed = parseInt(x.currentTarget.value);
            if (!isNaN(parsed)) {
              setEditHarvest({ ...editHarvest(), value: parsed });
            } else {
              setEditHarvest({ ...editHarvest(), value: 0 });
            }
          }}
        />
        <div style={{ display: "flex", "justify-content": "space-evenly" }}>
          <Button
            disabled={
              editHarvest().value === initialHarvest.harvest.value &&
              editHarvest().type_name === initialHarvest.harvest.type_name
            }
            variant="contained"
            color="primary"
            onClick={async () => {
              const res = await updateHarvestEvent(editHarvest());
              if (res) {
                commit(res);
              }
            }}
          >
            Save
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => setEditHarvest(initialHarvest.harvest)}
          >
            Reset
          </Button>
        </div>
      </div>
    );
  };

  function RenderSelectedHarvest({ harvest, setHarvest }: { harvest: Accessor<ValidHarvest>, setHarvest: Setter<ValidHarvest | undefined> }) {
    const commitHarvest = (toCommit: HarvestEvent) => {
      setHarvest({ ...harvest(), harvest: toCommit });
    };
    return (
      <Card
        variant="outlined"
        sx={{
          padding: "20px",
          marginTop: "40px",
          width: "300px",
        }}
      >
        <CardContent>
          <div style={{ display: "flex", "justify-content": "space-between" }}>
            <Typography variant="h4">{harvest().field.name}</Typography>

            {tractorModeButton()}
          </div>
          <Typography variant="subtitle1" color="text.secondary">
            {harvest().group.name}
          </Typography>
          <Typography
            sx={{ marginTop: "10px" }}
            variant="h6"
            color="text.primary"
          >
            {renderHarvest(harvest().harvest)}
          </Typography>

          <Show
            when={tractorMode()}
            fallback={renderEditHarvest(harvest(), commitHarvest)}
          >
            <Typography
              sx={{ marginTop: "20px", textAlign: "center" }}
              variant="h1"
              color="text.primary"
            >
              {harvest().harvest.value}
            </Typography>
            <div
              style={{
                display: "flex",
                "justify-content": "space-evenly",
                "margin-top": "20px",
              }}
            >
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
          </Show>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        "flex-direction": "column",
        "align-items": "center",
        padding: "20px",
      }}
    >
      <Button
        variant="outlined"
        color="primary"
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

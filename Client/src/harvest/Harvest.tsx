import { createSignal, Show, Signal } from "solid-js";
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

import { jwt_token } from "../App";
import { HarvestSelector, ValidHarvest } from "./HarvestSelector";

const updateHarvestEvent = async (
  harvest: HarvestEvent
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
    return harvest;
  }
};

const tractorModeAdd = async (
  harvest: HarvestEvent
): Promise<HarvestEvent | undefined> => {
  const copy = { ...harvest, value: harvest.value + 1 };
  return updateHarvestEvent(copy);
};

const tractorModeSub = async (
  harvest: HarvestEvent
): Promise<HarvestEvent | undefined> => {
  if (harvest.value <= 0) {
    return;
  }
  const copy = { ...harvest, value: harvest.value - 1 };
  return updateHarvestEvent(copy);
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

export default function Harvest() {
  const [isOpen, setIsOpen] = createSignal(false);
  const [tractorMode, setTractorMode] = createSignal(
    localStorage.getItem("tractor_mode") === "true"
  );
  const selectedHarvest = createSignal<ValidHarvest>();

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
      />
    );
  };

  const renderEditHarvest = (
    initialHarvest: ValidHarvest,
    commit: (harvest: HarvestEvent) => void
  ) => {
    const [editHarvest, setEditHarvest] = createSignal<HarvestEvent>(
      initialHarvest.harvest
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

  const renderSelectedHarvest = ([
    harvest,
    setHarvest,
  ]: Signal<ValidHarvest>) => {
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
                onClick={async () => {
                  const res = await tractorModeAdd(harvest().harvest);
                  if (res !== undefined) {
                    commitHarvest(res);
                  }
                }}
              >
                +
              </Button>
              <Button
                variant="contained"
                size="large"
                onClick={async () => {
                  const res = await tractorModeSub(harvest().harvest);
                  if (res !== undefined) {
                    commitHarvest(res);
                  }
                }}
              >
                -
              </Button>
            </div>
          </Show>
        </CardContent>
      </Card>
    );
  };

  return (
    <div
      style={{
        display: "flex",
        "flex-direction": "column",
        "align-items": "center",
        padding: "20px",
      }}
    >
      <Show
        when={jwt_token()}
        fallback={<p>You don't have access to this page</p>}
      >
        <HarvestSelector
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          selectHarvest={(x) => {
            selectedHarvest[1](x);
            setIsOpen(false);
          }}
        />

        <Button
          variant="outlined"
          color="primary"
          onClick={() => setIsOpen(true)}
        >
          Choose or create harvest
        </Button>
        <Show when={selectedHarvest[0]() != undefined}>
          {renderSelectedHarvest(selectedHarvest as Signal<ValidHarvest>)}
        </Show>
      </Show>
    </div>
  );
}

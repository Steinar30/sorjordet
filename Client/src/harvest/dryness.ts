export type DrynessRating = 1 | 2 | 3 | 4 | 5;
export type DrynessIcon = "wet" | "average" | "dry" | "unset";

export type DrynessDisplay = {
  rating: DrynessRating | null;
  label: string;
  shortLabel: string;
  description: string;
  className: string;
  icon: DrynessIcon;
  background: string;
  borderColor: string;
  color: string;
};

const drynessDisplays: Record<DrynessRating, DrynessDisplay> = {
  1: {
    rating: 1,
    label: "Very wet",
    shortLabel: "Very wet",
    description: "Much wetter than average",
    className: "drynessVeryWet",
    icon: "wet",
    background: "linear-gradient(135deg, rgba(76, 141, 204, 0.18), rgba(39, 108, 170, 0.08))",
    borderColor: "rgba(39, 108, 170, 0.24)",
    color: "#1f527e",
  },
  2: {
    rating: 2,
    label: "Wet",
    shortLabel: "Wet",
    description: "Wetter than average",
    className: "drynessWet",
    icon: "wet",
    background: "linear-gradient(135deg, rgba(106, 168, 210, 0.16), rgba(96, 151, 184, 0.07))",
    borderColor: "rgba(67, 126, 166, 0.22)",
    color: "#2d6689",
  },
  3: {
    rating: 3,
    label: "Average",
    shortLabel: "Average",
    description: "Average dryness",
    className: "drynessAverage",
    icon: "average",
    background: "linear-gradient(135deg, rgba(107, 143, 94, 0.16), rgba(196, 176, 103, 0.1))",
    borderColor: "rgba(107, 143, 94, 0.22)",
    color: "#4f6f44",
  },
  4: {
    rating: 4,
    label: "Dry",
    shortLabel: "Dry",
    description: "Drier than average",
    className: "drynessDry",
    icon: "dry",
    background: "linear-gradient(135deg, rgba(217, 166, 75, 0.18), rgba(180, 124, 56, 0.08))",
    borderColor: "rgba(180, 124, 56, 0.24)",
    color: "#8a5c27",
  },
  5: {
    rating: 5,
    label: "Very dry",
    shortLabel: "Very dry",
    description: "Much drier than average",
    className: "drynessVeryDry",
    icon: "dry",
    background: "linear-gradient(135deg, rgba(220, 135, 76, 0.2), rgba(175, 82, 54, 0.1))",
    borderColor: "rgba(175, 82, 54, 0.25)",
    color: "#93432f",
  },
};

const unsetDryness: DrynessDisplay = {
  rating: null,
  label: "Not set",
  shortLabel: "Unset",
  description: "Dryness has not been rated",
  className: "drynessUnset",
  icon: "unset",
  background: "rgba(247, 250, 246, 0.82)",
  borderColor: "rgba(32, 52, 50, 0.12)",
  color: "rgba(32, 52, 50, 0.58)",
};

export const drynessRatings: DrynessRating[] = [1, 2, 3, 4, 5];

export function getDrynessDisplay(rating: number | null | undefined): DrynessDisplay {
  if (rating === 1 || rating === 2 || rating === 3 || rating === 4 || rating === 5) {
    return drynessDisplays[rating];
  }

  return unsetDryness;
}
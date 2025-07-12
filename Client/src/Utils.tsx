import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@suid/material";

export function ConfirmDeleteDialog(props: {
  title: string;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={props.open} onClose={props.onClose}>
      <DialogTitle>Confirm Delete</DialogTitle>
      <DialogContent>
        <DialogContentText>{props.title}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => props.onClose()}>Cancel</Button>
        <Button onClick={() => props.onConfirm()}>Delete</Button>
      </DialogActions>
    </Dialog>
  );
}


export function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    }
    : null;
}

export function hexToRgbWithOpacity(hex: string, opacity: number) {
  const x = hexToRgb(hex);
  if (x) {
    return "rgba(" + x.r + "," + x.g + "," + x.b + "," + opacity + ")";
  } else {
    return hex;
  }
}

export function rgbToHex(rgba: string) {
  if (rgba === "") {
    return "#000";
  }
  const [r, g, b] = rgba.match(/\d+/g)!.map(Number);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export function formatDate(date: string) {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// based on https://stackoverflow.com/questions/1575271/range-of-years-in-javascript-for-a-select-box
export function getYearRangeSinceYearToCurrent(year: number) {
  const currentYear = (new Date()).getFullYear();
  const outputLen = ((currentYear - year) / 1) + 1;
  return Array.from({ length: outputLen }, (_, i) => year + i);
}

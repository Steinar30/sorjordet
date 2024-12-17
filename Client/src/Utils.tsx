import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@suid/material";

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
                <Button onClick={() => props.onClose}>Cancel</Button>
                <Button onClick={() => props.onConfirm}>Delete</Button>
            </DialogActions>
        </Dialog>
    );
}
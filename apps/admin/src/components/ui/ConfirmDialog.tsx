// src/components/ui/ConfirmDialog.tsx
import type { ReactNode } from "react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({
    open, title, description, confirmText = "Confirm", cancelText = "Cancel",
    onCancel, onConfirm, danger = false
}: {
    open: boolean;
    title: string;
    description?: ReactNode;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    return (
        <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>
                <DialogFooter className="mt-4">
                    <Button variant="secondary" onClick={onCancel}> {cancelText} </Button>
                    <Button variant={danger ? "destructive" : "default"} onClick={onConfirm}>
                        {confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

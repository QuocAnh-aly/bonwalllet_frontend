/**
 * Promise-based confirmation dialog using shadcn AlertDialog.
 * Usage: if (!await confirmDialog("Bạn có chắc muốn xóa?")) return;
 *        if (!await confirmDialog("Xóa...?", { destructive: true })) return;
 */
import { createRoot } from "react-dom/client";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "../components/ui/overlays/alert-dialog";

export function confirmDialog(message, { destructive = true, title = "Xác nhận" } = {}) {
  return new Promise((resolve) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    let closed = false;
    const handleClose = (result) => {
      if (closed) return;
      closed = true;
      root.unmount();
      container.remove();
      resolve(result);
    };

    root.render(
      <AlertDialog open={true} onOpenChange={(open) => { if (!open) handleClose(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleClose(false)}>
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleClose(true)}
              className={destructive ? "bg-destructive text-white hover:bg-destructive/90" : ""}
            >
              {destructive ? "Xóa" : "Xác nhận"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  });
}

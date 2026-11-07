import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CALCULATOR_PATH = "/zodia/oroskopos/";
const RETURN_TO = encodeURIComponent(CALCULATOR_PATH);

interface SignupPromptDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Shown to signed-out visitors who try the Ascendant calculator, which needs an account. */
export function SignupPromptDialog({ open, onClose }: SignupPromptDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Δημιούργησε λογαριασμό</DialogTitle>
          <DialogDescription className="leading-relaxed">
            Ο υπολογισμός ωροσκόπου είναι διαθέσιμος για τα μέλη. Η εγγραφή είναι δωρεάν και
            παίρνεις 5 δωρεάν credits για αναγνώσεις.
          </DialogDescription>
        </DialogHeader>
        {/* flex-col-reverse: on phones the main action sits on top. */}
        <DialogFooter className="pt-5">
          <Link
            href={`/login?returnTo=${RETURN_TO}`}
            className="rounded-md border border-violet-700 hover:border-violet-600 hover:bg-violet-900/50 text-violet-100 text-sm text-center px-4 py-2 transition-colors"
          >
            Σύνδεση
          </Link>
          <Link
            href={`/login?mode=register&returnTo=${RETURN_TO}`}
            className="rounded-md bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium text-center px-4 py-2 transition-colors"
          >
            Εγγραφή
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

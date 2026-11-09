import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const DEFAULT_RETURN_TO = "/zodia/oroskopos/";
const DEFAULT_FEATURE_TEXT = "Ο υπολογισμός ωροσκόπου είναι διαθέσιμος για τα μέλη.";

interface SignupPromptDialogProps {
  open: boolean;
  onClose: () => void;
  /** Unencoded path to come back to after signing in or up. */
  returnTo?: string;
  /** The sentence naming the members-only feature. */
  featureText?: string;
}

/**
 * Shown to signed-out visitors who try a members-only tool (the Ascendant calculator, the
 * full chart). The page stays public; this asks them to sign up.
 */
export function SignupPromptDialog({
  open,
  onClose,
  returnTo = DEFAULT_RETURN_TO,
  featureText = DEFAULT_FEATURE_TEXT,
}: SignupPromptDialogProps) {
  const encodedReturnTo = encodeURIComponent(returnTo);
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Δημιούργησε λογαριασμό</DialogTitle>
          <DialogDescription className="leading-relaxed">
            {featureText} Η εγγραφή είναι δωρεάν και παίρνεις 5 δωρεάν credits για αναγνώσεις.
          </DialogDescription>
        </DialogHeader>
        {/* flex-col-reverse: on phones the main action sits on top. */}
        <DialogFooter className="pt-5">
          <Link
            href={`/login?returnTo=${encodedReturnTo}`}
            className="rounded-md border border-violet-700 hover:border-violet-600 hover:bg-violet-900/50 text-violet-100 text-sm text-center px-4 py-2 transition-colors"
          >
            Σύνδεση
          </Link>
          <Link
            href={`/login?mode=register&returnTo=${encodedReturnTo}`}
            className="rounded-md bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium text-center px-4 py-2 transition-colors"
          >
            Εγγραφή
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

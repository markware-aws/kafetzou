import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import {
  Upload,
  X,
  Coffee,
  Loader2,
  ImagePlus,
  AlertCircle,
  CheckCircle2,
  Coins,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { AuthGuard } from "@/components/auth-guard";
import { ReadingCard } from "@/components/reading-card";
import {
  getUploadUrl,
  uploadImageToS3,
  createReading,
  type ReadCoffeeResponse,
} from "@/lib/api";
import { notifyCreditsChanged } from "@/lib/user";
import { InsufficientCreditsDialog } from "@/components/credits-dialog";

const MAX_IMAGES = 3;

interface ImageSlot {
  id: string;
  file: File;
  preview: string;
  status: "idle" | "uploading" | "reading" | "done" | "error";
  result?: ReadCoffeeResponse;
  error?: string;
}

type StepLabel = "Μεταφόρτωση…" | "Ανάλυση…" | "Έγινε" | "Αποτυχία";

function stepLabel(status: ImageSlot["status"]): StepLabel {
  if (status === "uploading") return "Μεταφόρτωση…";
  if (status === "reading") return "Ανάλυση…";
  if (status === "done") return "Έγινε";
  return "Αποτυχία";
}

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const addMoreRef = useRef<HTMLInputElement>(null);
  const [slots, setSlots] = useState<ImageSlot[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);

  function resetSlots() {
    setSlots((prev) => {
      prev.forEach((s) => URL.revokeObjectURL(s.preview));
      return [];
    });
  }

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const arr = Array.from(files).slice(0, MAX_IMAGES - slots.length);
      const newSlots: ImageSlot[] = arr.map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        status: "idle",
      }));
      setSlots((prev) => [...prev, ...newSlots].slice(0, MAX_IMAGES));
    },
    [slots.length],
  );

  function removeSlot(id: string) {
    setSlots((prev) => {
      const slot = prev.find((s) => s.id === id);
      if (slot) URL.revokeObjectURL(slot.preview);
      return prev.filter((s) => s.id !== id);
    });
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = "";
  }

  function updateSlot(id: string, patch: Partial<ImageSlot>) {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  async function processSlot(slot: ImageSlot) {
    updateSlot(slot.id, { status: "uploading", error: undefined });
    try {
      const { upload_url, image_key, reading_id } = await getUploadUrl();
      await uploadImageToS3(upload_url, slot.file);
      updateSlot(slot.id, { status: "reading" });
      const result = await createReading(image_key, reading_id);
      updateSlot(slot.id, { status: "done", result });
      notifyCreditsChanged();
    } catch (err: any) {
      const msg = err.message ?? "Something went wrong";
      const isLowCredits = msg.includes("credits") || msg.includes("402");
      if (isLowCredits) {
        updateSlot(slot.id, { status: "idle" });
        setCreditDialogOpen(true);
      } else {
        updateSlot(slot.id, { status: "error", error: msg });
      }
    }
  }

  async function handleReadAll() {
    if (slots.length === 0 || processing) return;
    setProcessing(true);
    for (const slot of slots.filter(
      (s) => s.status === "idle" || s.status === "error",
    )) {
      await processSlot(slot);
    }
    setProcessing(false);
  }

  const idleSlots = slots.filter(
    (s) => s.status === "idle" || s.status === "error",
  );
  const allDone = slots.length > 0 && slots.every((s) => s.status === "done");
  const canRead = idleSlots.length > 0 && !processing;
  const results = slots.filter((s) => s.status === "done" && s.result);

  return (
    <AuthGuard title="Ανάγνωση Καφέ">
      <InsufficientCreditsDialog
        open={creditDialogOpen}
        onClose={() => setCreditDialogOpen(false)}
        requiredCredits={2}
        featureName="Ανάγνωση Καφέ"
      />
      <div className="min-h-screen flex flex-col">
        <Navbar />

        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-violet-50">
              Διάβασε τον καφέ σου
            </h1>
            <p className="mt-1 text-sm text-violet-300">
              Ανέβασε έως {MAX_IMAGES} φωτογραφίες του φλιτζανιού σου.
            </p>
          </div>

          {slots.length === 0 && (
            <div
              className={`relative border border-dashed rounded-lg transition-colors cursor-pointer mb-6 ${
                dragOver
                  ? "border-amber-500 bg-violet-900/60"
                  : "border-violet-700 hover:border-violet-600 bg-surface"
              }`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <ImagePlus
                  className={`w-6 h-6 mb-3 transition-colors ${dragOver ? "text-amber-400" : "text-violet-300"}`}
                />
                <p className="text-violet-50 text-sm font-medium mb-1">
                  {dragOver
                    ? "Αφήστε τις φωτογραφίες εδώ"
                    : "Σύρετε τις φωτογραφίες του φλιτζανιού σας"}
                </p>
                <p className="text-violet-300 text-xs">
                  ή κάντε κλικ — έως {MAX_IMAGES} φωτογραφίες · JPG, PNG, WEBP
                </p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={onFileChange}
              />
            </div>
          )}

          {slots.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              {slots.map((slot, i) => (
                <div
                  key={slot.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="relative rounded-md overflow-hidden border border-violet-800 bg-surface aspect-square">
                    <img
                      src={slot.preview}
                      alt={`Cup ${i + 1}`}
                      className="w-full h-full object-cover"
                    />

                    {slot.status !== "idle" && (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
                        {(slot.status === "uploading" ||
                          slot.status === "reading") && (
                          <>
                            <Loader2 className="w-6 h-6 text-violet-50 animate-spin" />
                            <p className="text-xs text-violet-50 text-center px-2">
                              {stepLabel(slot.status)}
                            </p>
                          </>
                        )}
                        {slot.status === "done" && (
                          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                        )}
                        {slot.status === "error" && (
                          <div className="flex flex-col items-center gap-2">
                            <AlertCircle className="w-8 h-8 text-rose-400" />
                            <p className="text-xs text-rose-300 text-center px-2">
                              {slot.error}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {!processing &&
                      (slot.status === "idle" || slot.status === "error") && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSlot(slot.id);
                          }}
                          aria-label="Αφαίρεση φωτογραφίας"
                          className="absolute top-2 right-2 w-6 h-6 rounded-md bg-black/70 flex items-center justify-center text-violet-100 hover:text-white transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}

                    <span className="absolute top-2 left-2 rounded bg-black/70 px-1.5 text-xs text-violet-100 tabular-nums">
                      {i + 1}
                    </span>
                  </div>
                </div>
              ))}

              {slots.length < MAX_IMAGES && !processing && (
                <button
                  onClick={() => addMoreRef.current?.click()}
                  className="aspect-square rounded-md border border-dashed border-violet-700 hover:border-violet-600 bg-surface flex flex-col items-center justify-center gap-2 transition-colors"
                >
                  <ImagePlus className="w-5 h-5 text-violet-300" />
                  <span className="text-xs text-violet-300">Προσθήκη</span>
                </button>
              )}
              <input
                ref={addMoreRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={onFileChange}
              />
            </div>
          )}

          {slots.length > 0 && !allDone && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <button
                onClick={handleReadAll}
                disabled={!canRead}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-md px-5 py-2.5 text-sm transition-colors"
              >
                <Coffee className="w-4 h-4" />
                {processing
                  ? "Ανάλυση…"
                  : `Διάβασε τον καφέ σου${slots.length > 1 ? ` (${idleSlots.length})` : ""}`}
              </button>
              {!processing && (
                <span className="flex items-center gap-1.5 text-xs text-violet-300">
                  <Coins className="w-3.5 h-3.5" />
                  2 credits ανά ανάγνωση
                </span>
              )}
              {!processing && (
                <button
                  onClick={resetSlots}
                  className="ml-auto text-sm text-violet-300 hover:text-violet-50 transition-colors"
                >
                  Καθαρισμός
                </button>
              )}
            </div>
          )}

          {allDone && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="flex items-center gap-2 text-emerald-400 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Όλες οι αναγνώσεις ολοκληρώθηκαν
              </span>
              <button
                onClick={resetSlots}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-md px-4 py-2 text-sm transition-colors"
              >
                <Upload className="w-4 h-4" />
                Νέα ανάγνωση
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="text-sm text-violet-300 hover:text-violet-50 transition-colors"
              >
                Ιστορικό →
              </button>
            </div>
          )}

          {results.length > 0 && (
            <div className="mt-10 flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-violet-50">
                Η καφετζού μιλά
              </h2>
              {results.map((slot, i) => (
                <ReadingCard
                  key={slot.id}
                  reading={slot.result!.reading}
                  symbolsDetected={slot.result!.symbols_detected}
                  lettersDetected={slot.result!.letters_detected}
                  imagePreview={slot.preview}
                  index={i}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}

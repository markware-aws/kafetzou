"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Coffee, Sparkles, ImagePlus, AlertCircle, CheckCircle2, Coins } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { AuthGuard } from "@/components/auth-guard";
import { ReadingCard } from "@/components/reading-card";
import { getUploadUrl, uploadImageToS3, createReading, type ReadCoffeeResponse } from "@/lib/api";
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

type StepLabel = "Μεταφόρτωση…" | "Διαβάζω τον καφέ…" | "Έγινε" | "Αποτυχία";

function stepLabel(status: ImageSlot["status"]): StepLabel {
  if (status === "uploading") return "Μεταφόρτωση…";
  if (status === "reading") return "Διαβάζω τον καφέ…";
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
    setSlots((prev) => { prev.forEach((s) => URL.revokeObjectURL(s.preview)); return []; });
  }

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).slice(0, MAX_IMAGES - slots.length);
    const newSlots: ImageSlot[] = arr.map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      status: "idle",
    }));
    setSlots((prev) => [...prev, ...newSlots].slice(0, MAX_IMAGES));
  }, [slots.length]);

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
    // Process sequentially to avoid Cognito token issues and rate limits
    for (const slot of slots.filter((s) => s.status === "idle" || s.status === "error")) {
      await processSlot(slot);
    }
    setProcessing(false);
  }

  const idleSlots = slots.filter((s) => s.status === "idle" || s.status === "error");
  const allDone = slots.length > 0 && slots.every((s) => s.status === "done");
  const canRead = idleSlots.length > 0 && !processing;
  const results = slots.filter((s) => s.status === "done" && s.result);

  return (
    <AuthGuard>
      <InsufficientCreditsDialog
        open={creditDialogOpen}
        onClose={() => setCreditDialogOpen(false)}
        requiredCredits={2}
        featureName="Ανάγνωση Καφέ"
      />
      <div className="min-h-screen flex flex-col">
        <Navbar />

        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
          {/* Hero */}
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span className="text-amber-400 text-sm font-medium uppercase tracking-widest">Λειτουργία Μαντείου</span>
            </div>
            <h1 className="text-3xl font-bold text-violet-100 mb-2">Διάβασε τον Καφέ μου</h1>
            <p className="text-violet-400 text-sm max-w-sm mx-auto">
              Ανέβασε έως {MAX_IMAGES} φωτογραφίες του φλιτζανιού σου. Η καφετζού θα αποκαλύψει τι κρύβει ο κατακάθι.
            </p>
          </div>

          {/* Drop zone — only when no images selected yet */}
          {slots.length === 0 && (
            <div
              className={`relative border-2 border-dashed rounded-2xl transition-all cursor-pointer mb-6 ${
                dragOver
                  ? "border-amber-500 bg-amber-900/10"
                  : "border-violet-800/50 hover:border-violet-600/70 bg-[#2e2a3a]/60 hover:bg-[#2e2a3a]"
              }`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-colors ${dragOver ? "bg-amber-500/20" : "bg-violet-900/40"}`}>
                  <ImagePlus className={`w-6 h-6 transition-colors ${dragOver ? "text-amber-400" : "text-violet-400"}`} />
                </div>
                <p className="text-violet-200 text-sm font-medium mb-1">
                  {dragOver ? "Αφήστε τις φωτογραφίες εδώ" : "Σύρετε τις φωτογραφίες του φλιτζανιού σας"}
                </p>
                <p className="text-violet-500 text-xs">
                  ή κάντε κλικ — έως {MAX_IMAGES} φωτογραφίες
                </p>
                <p className="text-violet-600 text-xs mt-2">JPG, PNG, WEBP</p>
              </div>
              <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={onFileChange} />
            </div>
          )}

          {/* Image previews + add more tile */}
          {slots.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              {slots.map((slot, i) => (
                <div key={slot.id} className="animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="relative rounded-xl overflow-hidden border border-violet-800/40 bg-[#2e2a3a] aspect-square">
                    <img src={slot.preview} alt={`Cup ${i + 1}`} className="w-full h-full object-cover" />

                    {/* Status overlay */}
                    {slot.status !== "idle" && (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
                        {(slot.status === "uploading" || slot.status === "reading") && (
                          <>
                            <div className="w-10 h-10 rounded-full border-2 border-amber-500/30 border-t-amber-500 spin-slow" />
                            <p className="text-xs text-amber-300 text-center px-2">{stepLabel(slot.status)}</p>
                          </>
                        )}
                        {slot.status === "done" && <CheckCircle2 className="w-10 h-10 text-emerald-400" />}
                        {slot.status === "error" && (
                          <div className="flex flex-col items-center gap-2">
                            <AlertCircle className="w-8 h-8 text-rose-400" />
                            <p className="text-xs text-rose-300 text-center px-2">{slot.error}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Remove button */}
                    {!processing && (slot.status === "idle" || slot.status === "error") && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeSlot(slot.id); }}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-violet-300 hover:text-rose-300 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Slot number badge */}
                    <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-violet-900/80 flex items-center justify-center">
                      <span className="text-xs text-violet-300 font-medium">{i + 1}</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add more tile */}
              {slots.length < MAX_IMAGES && !processing && (
                <button
                  onClick={() => addMoreRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-violet-800/40 hover:border-violet-600/60 bg-[#2e2a3a]/60 hover:bg-[#2e2a3a] flex flex-col items-center justify-center gap-2 transition-all"
                >
                  <ImagePlus className="w-6 h-6 text-violet-500" />
                  <span className="text-xs text-violet-500">Προσθήκη</span>
                </button>
              )}
              <input ref={addMoreRef} type="file" accept="image/*" multiple className="hidden" onChange={onFileChange} />
            </div>
          )}

          {/* CTA */}
          {slots.length > 0 && !allDone && (
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={handleReadAll}
                disabled={!canRead}
                className="flex items-center gap-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-xl px-8 py-3.5 text-sm transition-all shadow-xl shadow-amber-500/20"
              >
                <Coffee className="w-4 h-4" />
                {processing ? "Διαβάζω τον καφέ…" : `Διάβασε τον καφέ μου${slots.length > 1 ? ` (${idleSlots.length})` : ""}`}
              </button>
              {!processing && (
                <div className="flex items-center gap-1 text-xs text-amber-600">
                  <Coins className="w-3 h-3" />
                  <span>2 credits ανά ανάγνωση</span>
                </div>
              )}
              {!processing && (
                <button onClick={resetSlots} className="text-xs text-violet-600 hover:text-violet-400 transition-colors">
                  Νέα Ανάγνωση
                </button>
              )}
            </div>
          )}

          {allDone && (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Όλες οι αναγνώσεις ολοκληρώθηκαν
              </div>
              <div className="flex items-center gap-4">
                <button onClick={resetSlots} className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold rounded-xl px-5 py-2.5 text-sm transition-all shadow-lg shadow-amber-500/20">
                  <Upload className="w-4 h-4" />
                  Νέα Ανάγνωση
                </button>
                <button onClick={() => router.push("/dashboard")} className="text-xs text-violet-400 hover:text-amber-300 transition-colors">
                  Δες όλες →
                </button>
              </div>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="mt-10 flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-violet-900/40" />
                <span className="text-xs text-violet-500 uppercase tracking-widest font-medium">Η Καφετζού Μιλά</span>
                <div className="h-px flex-1 bg-violet-900/40" />
              </div>
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

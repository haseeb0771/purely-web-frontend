"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDown,
  Box,
  Download,
  Expand,
  Loader2,
  ScanEye,
  Sparkles,
  X,
} from "lucide-react";
import AdminPage from "@/components/admin/AdminPage";
import SelectDropdown from "@/components/admin/SelectDropdown";
import { useToast } from "@/components/admin/toast";
import {
  ApiError,
  fetchBottles,
  generateMockup,
  uploadBottleImage,
  type Bottle,
  type MockupGenerationMode,
  type MockupItem,
} from "@/lib/admin-api";
import { subscribeMockupProgress } from "@/lib/admin-socket";

const inputClass =
  "w-full rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0F172A] px-3.5 py-2.5 text-sm text-[#0F172A] dark:text-white placeholder-[#94A3B8] outline-none transition-colors focus:border-[#2FB9BF] focus:bg-white dark:focus:bg-[#1a2332] focus:ring-2 focus:ring-[#2FB9BF]/20";

const BUSINESS_TYPE_OPTIONS = [
  "Restaurant",
  "Hotel",
  "Corporate",
  "Marriage Hall",
  "Event",
  "Gym",
  "School",
  "Retail",
];

const BACKGROUND_REF = "/background-modal-image.jfif";

interface ProgressState {
  current: number;
  total: number;
  status: string;
  stage: "prompts" | "render" | "done" | "error";
}

export default function NewLabelDesignPage() {
  const toast = useToast();

  const [mode, setMode] = useState<MockupGenerationMode>("CLIENT_DESIGNS");

  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [bottleId, setBottleId] = useState("");
  const [loadingBottles, setLoadingBottles] = useState(true);

  const [businessType, setBusinessType] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [rawReference, setRawReference] = useState("");

  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [activeJob, setActiveJob] = useState<string | null>(null);

  const [images, setImages] = useState<MockupItem[]>([]);
  const [preview, setPreview] = useState<MockupItem | null>(null);

  const loadBottles = useCallback(async () => {
    setLoadingBottles(true);
    try {
      const data = await fetchBottles();
      setBottles(data);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to load bottles.",
      );
    } finally {
      setLoadingBottles(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadBottles();
  }, [loadBottles]);

  useEffect(() => {
    return subscribeMockupProgress((payload) => {
      const p = payload as ProgressState & { jobId?: string };
      setProgress({
        current: p.current ?? 0,
        total: p.total ?? 0,
        status: p.status ?? "",
        stage: p.stage ?? "render",
      });
      if (p.jobId) setActiveJob(p.jobId);
      if (p.stage === "error") {
        setGenerating(false);
        toast.error(p.status ?? "Generation failed.");
      }
      if (p.stage === "done") {
        setGenerating(false);
      }
    });
  }, [toast]);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const result = await uploadBottleImage(file, "mockups/logos");
      setLogoUrl(result.url);
      toast.success("Logo uploaded.");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Logo upload failed.",
      );
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  }

  function handleRawReference(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setRawReference(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  }

  async function handleGenerate() {
    if (mode === "CLIENT_DESIGNS") {
      if (!businessName.trim()) {
        toast.error("Business name is required.");
        return;
      }
    }
    if (!bottleId) {
      toast.error("Select a bottle.");
      return;
    }

    setGenerating(true);
    setImages([]);
    setProgress({ current: 0, total: 10, status: "Starting…", stage: "prompts" });
    setActiveJob(null);

    try {
      const gallery = await generateMockup({
        generationMode: mode,
        bottleId,
        businessType: businessType || undefined,
        businessName: businessName.trim() || undefined,
        businessLogoUrl: logoUrl || undefined,
        referenceBackground: BACKGROUND_REF,
      });
      setImages(gallery.items);
      setProgress({
        current: gallery.items.length,
        total: gallery.items.length,
        status: "Complete",
        stage: "done",
      });
      toast.success("Mockups generated successfully.");
    } catch (err) {
      setGenerating(false);
      setProgress((prev) =>
        prev
          ? { ...prev, stage: "error", status: err instanceof ApiError ? err.message : "Generation failed." }
          : { current: 0, total: 0, status: "Generation failed.", stage: "error" }
      );
      toast.error(err instanceof ApiError ? err.message : "Generation failed.");
    }
  }

  const percent =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  return (
    <AdminPage
      title="New Label Design"
      description="Generate studio product mockups with a fixed background reference using Google AI (Gemini + Imagen)."
    >
      <div className="space-y-5 p-4 sm:p-6">
        <div className="flex items-center gap-3 rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] p-4">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[#E2E8F0] dark:border-[#1E293B]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BACKGROUND_REF}
              alt="Base background reference"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[#0F172A] dark:text-white">
              Fixed Background Reference
            </p>
            <p className="mt-0.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
              The luxury marble wall, &ldquo;Purely CUSTOM LABELS&rdquo; logo and
              black marble table stay identical in every mockup. Only the bottle
              / center label changes.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMode("CLIENT_DESIGNS")}
            className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
              mode === "CLIENT_DESIGNS"
                ? "border-[#2FB9BF] bg-[#E6F7F8] text-[#0E7A80] ring-2 ring-[#2FB9BF]/30 dark:border-[#2FB9BF]/50 dark:bg-[#163A3B] dark:text-[#5EEAD4]"
                : "border-[#E2E8F0] bg-white text-[#475569] hover:border-[#2FB9BF]/50 dark:border-[#1E293B] dark:bg-[#0F172A] dark:text-[#94A3B8]"
            }`}
          >
            10 Client Label Designs
          </button>
          <button
            type="button"
            onClick={() => setMode("RAW_BOTTLE")}
            className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
              mode === "RAW_BOTTLE"
                ? "border-[#2FB9BF] bg-[#E6F7F8] text-[#0E7A80] ring-2 ring-[#2FB9BF]/30 dark:border-[#2FB9BF]/50 dark:bg-[#163A3B] dark:text-[#5EEAD4]"
                : "border-[#E2E8F0] bg-white text-[#475569] hover:border-[#2FB9BF]/50 dark:border-[#1E293B] dark:bg-[#0F172A] dark:text-[#94A3B8]"
            }`}
          >
            Raw Bottle Render (No Cap / No Label)
          </button>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] p-4">
          <p className="mb-3 text-sm font-bold text-[#0F172A] dark:text-white">
            {mode === "CLIENT_DESIGNS"
              ? "Client Details"
              : "Raw Bottle Reference"}
          </p>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
                Bottle *
              </label>
              {loadingBottles ? (
                <div className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5 text-sm text-[#94A3B8] dark:border-[#334155] dark:bg-[#0F172A]">
                  <Loader2 className="h-4 w-4 animate-spin text-[#2FB9BF]" />
                  Loading bottles…
                </div>
              ) : (
                <SelectDropdown
                  value={bottleId}
                  placeholder="Select a bottle…"
                  options={bottles.map((b) => ({
                    label: b.bottleName,
                    value: b._id,
                  }))}
                  onSelect={setBottleId}
                />
              )}
            </div>

            {mode === "CLIENT_DESIGNS" ? (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
                    Business Type
                  </label>
                  <SelectDropdown
                    value={businessType}
                    placeholder="Select business type…"
                    options={BUSINESS_TYPE_OPTIONS.map((type) => ({
                      label: type,
                      value: type,
                    }))}
                    onSelect={setBusinessType}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Waves Café"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
                    Business Logo{" "}
                    <span className="font-normal text-[#94A3B8]">(optional)</span>
                  </label>
                  {logoUrl ? (
                    <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 dark:border-[#334155] dark:bg-[#0F172A]">
                      <img
                        src={logoUrl}
                        alt="Logo"
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#0F172A] dark:text-white">
                          Logo uploaded
                        </p>
                        <p className="text-xs text-[#94A3B8]">
                          Falls back to typography if removed
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLogoUrl("")}
                        className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#CBD5E1] bg-white px-4 py-3 text-sm font-semibold text-[#475569] transition-colors hover:border-[#2FB9BF] hover:text-[#2FB9BF] dark:border-[#334155] dark:bg-[#0F172A] dark:text-[#94A3B8] dark:hover:border-[#2FB9BF]">
                      {uploadingLogo ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-[#2FB9BF]" />
                          Uploading…
                        </>
                      ) : (
                        "Upload business logo"
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => void handleLogoUpload(e)}
                        disabled={uploadingLogo}
                      />
                    </label>
                  )}
                </div>
              </>
            ) : (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
                  Raw Bottle Reference Image{" "}
                  <span className="font-normal text-[#94A3B8]">(optional)</span>
                </label>
                {rawReference ? (
                  <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 dark:border-[#334155] dark:bg-[#0F172A]">
                    <img
                      src={rawReference}
                      alt="Raw reference"
                      className="h-14 w-14 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#0F172A] dark:text-white">
                        Reference uploaded
                      </p>
                      <p className="text-xs text-[#94A3B8]">
                        Used as the raw bottle shape guide
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRawReference("")}
                      className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#CBD5E1] bg-white px-4 py-3 text-sm font-semibold text-[#475569] transition-colors hover:border-[#2FB9BF] hover:text-[#2FB9BF] dark:border-[#334155] dark:bg-[#0F172A] dark:text-[#94A3B8] dark:hover:border-[#2FB9BF]">
                    <ScanEye className="h-4 w-4" />
                    Upload raw bottle image
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={handleRawReference}
                    />
                  </label>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={generating}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2FB9BF] px-6 py-3 text-sm font-bold text-white shadow-[0_4px_16px_rgba(47,185,191,0.3)] transition-all hover:bg-[#28a5ab] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {mode === "CLIENT_DESIGNS"
                  ? "Generate 10 Label Designs"
                  : "Render Raw Bottle"}
              </>
            )}
          </button>
        </div>

        {generating && progress && (
          <div className="rounded-2xl border border-[#2FB9BF]/30 bg-[#E6F7F8] p-4 dark:border-[#2FB9BF]/50 dark:bg-[#163A3B]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-[#0E7A80] dark:text-[#5EEAD4]">
                {progress.stage === "prompts"
                  ? "Building design briefs…"
                  : `Generating mockup ${progress.current} of ${progress.total}`}
              </p>
              <span className="text-sm font-bold text-[#0E7A80] dark:text-[#5EEAD4]">
                {percent}%
              </span>
            </div>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white dark:bg-[#0F172A]">
              <div
                className="h-full rounded-full bg-[#2FB9BF] transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-[#64748B] dark:text-[#94A3B8]">
              {progress.status}
              {activeJob ? ` · Job ${activeJob}` : ""}
            </p>
          </div>
        )}

        {images.length > 0 && (
          <div>
            <p className="mb-3 text-sm font-bold text-[#0F172A] dark:text-white">
              Generated Results
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {images.map((item, index) => (
                <div
                  key={index}
                  className="group overflow-hidden rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A]"
                >
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.labelName ?? `Mockup ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => setPreview(item)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-[#0F172A] transition-colors hover:bg-white"
                        title="Preview"
                      >
                        <Expand className="h-4 w-4" />
                      </button>
                      <a
                        href={item.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-[#0F172A] transition-colors hover:bg-white"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                  <div className="border-t border-[#E2E8F0] px-3 py-2 dark:border-[#1E293B]">
                    <p className="truncate text-xs font-semibold text-[#0F172A] dark:text-white">
                      {item.labelName ?? `Design ${index + 1}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!generating && !images.length && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#CBD5E1] py-16 text-center dark:border-[#334155]">
            <Box className="h-10 w-10 text-[#CBD5E1]" />
            <p className="mt-3 text-sm font-semibold text-[#0F172A] dark:text-white">
              No mockups yet
            </p>
            <p className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8]">
              Fill in the details above and generate your first design.
            </p>
          </div>
        )}
      </div>

      {preview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-sm"
            onClick={() => setPreview(null)}
          />
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white dark:border-[#1E293B] dark:bg-[#0F172A]">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] p-4 dark:border-[#1E293B]">
              <p className="text-sm font-bold text-[#0F172A] dark:text-white">
                {preview.labelName ?? "Mockup Preview"}
              </p>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="rounded-lg p-1.5 text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <img
                src={preview.imageUrl}
                alt={preview.labelName ?? "Mockup"}
                className="mx-auto max-h-[70vh] rounded-xl object-contain"
              />
              <p className="mt-3 text-xs text-[#64748B] dark:text-[#94A3B8]">
                {preview.prompt}
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#E2E8F0] p-4 dark:border-[#1E293B]">
              <a
                href={preview.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="inline-flex items-center gap-2 rounded-xl bg-[#2FB9BF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#28a9af]"
              >
                <ArrowDown className="h-4 w-4" />
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </AdminPage>
  );
}

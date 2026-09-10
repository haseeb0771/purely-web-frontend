"use client";

import { useCallback, useEffect, useState } from "react";

import {
  AlertTriangle,
  ExternalLink,
  History,
  ImagePlus,
  Loader2,
  PackagePlus,
  PackageSearch,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import AdminPage from "@/components/admin/AdminPage";
import {
  addBottleInventory,
  ApiError,
  BOTTLE_SIZES,
  createBottle,
  deleteBottle,
  fetchBottles,
  uploadBottleImage,
  type AddInventorySize,
  type Bottle,
  type BottleSize,
  type BottleType,
  type SizeDetail,
} from "@/lib/admin-api";
import { subscribeInventoryNotification } from "@/lib/admin-socket";
import NumberInput from "@/components/admin/NumberInput";
import { useToast } from "@/components/admin/toast";
import ImageHoverPreview from "@/components/admin/ImageHoverPreview";

const inputClass =
  "w-full rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0F172A] px-3.5 py-2.5 text-sm text-[#0F172A] dark:text-white placeholder-[#94A3B8] outline-none transition-colors focus:border-[#2FB9BF] focus:bg-white dark:focus:bg-[#1a2332] focus:ring-2 focus:ring-[#2FB9BF]/20";

const TYPE_STYLES: Record<BottleType, string> = {
  Mixing: "bg-violet-50 text-violet-700 ring-violet-200",
  Pure: "bg-sky-50 text-sky-700 ring-sky-200",
};

function typeColor(type: BottleType): string {
  return TYPE_STYLES[type];
}

function formatTime(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BottlesInventoryPage() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [bottles, setBottles] = useState<Bottle[]>([]);  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Bottle | null>(null);

  // create form state
  const [showForm, setShowForm] = useState(false);
  const [bottleName, setBottleName] = useState("");
  const [type, setType] = useState<BottleType>("Pure");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  // Per-size state: selected sizes (checked) and details (qty + cost)
  const [selectedSizes, setSelectedSizes] = useState<BottleSize[]>([]);
  const [sizeDetails, setSizeDetails] = useState<SizeDetail[]>([
    { size: "300ml", quantity: 0, totalCostPrice: 0, unitCostPrice: 0, stockAlertLevel: 0 },
    { size: "500ml", quantity: 0, totalCostPrice: 0, unitCostPrice: 0, stockAlertLevel: 0 },
    { size: "1500ml", quantity: 0, totalCostPrice: 0, unitCostPrice: 0, stockAlertLevel: 0 },
    { size: "19L", quantity: 0, totalCostPrice: 0, unitCostPrice: 0, stockAlertLevel: 0 },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Bottle | null>(null);
  const [addInvBottle, setAddInvBottle] = useState<Bottle | null>(null);
  const toast = useToast();

  function toggleSize(size: BottleSize) {
    setSelectedSizes((current) =>
      current.includes(size)
        ? current.filter((s) => s !== size)
        : [...current, size]
    );
  }

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchBottles();
      setBottles(data);
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.message : "Failed to load bottle inventory."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return subscribeInventoryNotification(() => {
      void load();
    });
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setOpenId(params.get("open"));
  }, []);

  useEffect(() => {
    if (openId && bottles.length > 0 && !selected) {
      const match = bottles.find((b) => b._id === openId);
      if (match) setSelected(match);
    }
  }, [openId, bottles, selected]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const trimmedName = bottleName.trim();
    const trimmedImage = imageUrl.trim();

    if (!trimmedName) {
      setFormError("Bottle name is required.");
      return;
    }
    if (!trimmedImage) {
      setFormError("Please upload an image or provide an image URL.");
      return;
    }
    if (selectedSizes.length === 0) {
      setFormError("Please select at least one bottle size.");
      return;
    }

    // Build sizeDetails array from selected sizes only
    const sizeDetailsSend = sizeDetails
      .filter((sd) => selectedSizes.includes(sd.size))
      .map((sd) => ({
        size: sd.size,
        quantity: sd.quantity,
        totalCostPrice: sd.totalCostPrice,
        stockAlertLevel: sd.stockAlertLevel,
        unitCostPrice:
          sd.quantity > 0 ? Math.round((sd.totalCostPrice / sd.quantity) * 100) / 100 : 0,
      }));

    setSubmitting(true);
    try {
      const created = await createBottle({
        bottleName: trimmedName,
        type,
        imageUrl: trimmedImage,
        sizeDetails: sizeDetailsSend,
      });
      setBottles((current) => [created, ...current]);
      toast.success(`Created ${created.customId} successfully.`);
      resetForm();
      setShowForm(false);
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Failed to create bottle."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setFormError(null);
    try {
      const result = await uploadBottleImage(file);
      setImageUrl(result.url);
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Image upload failed."
      );
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function resetForm() {
    setBottleName("");
    setType("Pure");
    setImageUrl("");
    setSelectedSizes([]);
    setSizeDetails([
      { size: "300ml", quantity: 0, totalCostPrice: 0, unitCostPrice: 0, stockAlertLevel: 0 },
      { size: "500ml", quantity: 0, totalCostPrice: 0, unitCostPrice: 0, stockAlertLevel: 0 },
      { size: "1500ml", quantity: 0, totalCostPrice: 0, unitCostPrice: 0, stockAlertLevel: 0 },
      { size: "19L", quantity: 0, totalCostPrice: 0, unitCostPrice: 0, stockAlertLevel: 0 },
    ]);
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setActionLoading(confirmDelete._id);
    setFormError(null);
    try {
      await deleteBottle(confirmDelete._id);
      setBottles((current) =>
        current.filter((b) => b._id !== confirmDelete._id)
      );
      if (selected?._id === confirmDelete._id) setSelected(null);
      setConfirmDelete(null);
    } catch (err) {
      setActionLoading(null);
      setFormError(
        err instanceof ApiError ? err.message : "Failed to delete bottle."
      );
    } finally {
      setActionLoading(null);
      setConfirmDelete(null);
    }
  }

  return (
    <AdminPage
      title="Bottles Inventory"
      description="Manage plastic bottle stock with full creation and edit history."
    >
      <div className="flex flex-col gap-3 border-b border-[#E2E8F0] dark:border-[#1E293B] dark:border-[#1E293B] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-sm text-[#64748B] dark:text-[#94A3B8] dark:text-[#94A3B8]">
          {bottles.length} {bottles.length === 1 ? "bottle" : "bottles"} in stock
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowForm((v) => !v);
              setFormError(null);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2FB9BF] px-3.5 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(47,185,191,0.3)] dark:shadow-none transition-colors hover:bg-[#28a9af]"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Close form" : "Add bottle"}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="border-b border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC]/70 dark:bg-[#1E293B] p-4 sm:p-6">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
            <Plus className="h-4 w-4 text-[#2FB9BF]" />
            New Bottle
          </h3>

          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
                Bottle Name
              </label>
              <input
                type="text"
                value={bottleName}
                onChange={(e) => setBottleName(e.target.value)}
                placeholder="e.g. Standard Rounded"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
                Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["Mixing", "Pure"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setType(option)}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                      type === option
                        ? "border-[#2FB9BF] bg-[#2FB9BF] text-white"
                        : "border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] text-[#475569] dark:text-[#94A3B8] hover:border-[#2FB9BF]/50"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
              Image
            </label>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => document.getElementById("bottle-image-input")?.click()}
                disabled={uploading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#CBD5E1] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] px-4 py-3 text-sm font-semibold text-[#475569] dark:text-[#94A3B8] transition-colors hover:border-[#2FB9BF] hover:text-[#2FB9BF] disabled:opacity-60"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading to storage…
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-4 w-4" />
                    Upload image
                  </>
                )}
              </button>
              <input
                id="bottle-image-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleUpload}
              />
              {imageUrl && (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="h-14 w-14 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] object-cover"
                  />
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://.../bottle-image.png"
                    className={inputClass}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="mt-5">
            <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
              Sizes & Costs
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {BOTTLE_SIZES.map((size) => {
                const checked = selectedSizes.includes(size);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleSize(size)}
                    className={`rounded-xl border px-3 py-3 text-center text-sm font-semibold transition-colors ${
                      checked
                        ? "border-[#2FB9BF] bg-[#2FB9BF]/5 dark:bg-[#163A3B] text-[#0F172A] dark:text-white"
                        : "border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] text-[#475569] dark:text-[#94A3B8] hover:border-[#2FB9BF]/40"
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>

            {selectedSizes.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-xl border border-[#E2E8F0] dark:border-[#1E293B]">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#F8FAFC] dark:bg-[#1E293B] text-left text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                      <th className="px-3 py-2">Size</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Total Cost (PKR)</th>
                      <th className="px-3 py-2 text-right">Cost / Piece</th>
                      <th className="px-3 py-2 text-right">Alert Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] dark:divide-[#1E293B]">
                    {selectedSizes.map((size) => {
                      const sd = sizeDetails.find((s) => s.size === size);
                      const perPiece =
                        (sd?.quantity ?? 0) > 0
                          ? Math.round(((sd?.totalCostPrice ?? 0) / (sd?.quantity ?? 1)) * 100) / 100
                          : 0;
                      return (
                        <tr key={size}>
                          <td className="px-3 py-2 font-semibold text-[#0F172A] dark:text-white">
                            {size}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <NumberInput
                              value={sd?.quantity ?? 0}
                              onValueChange={(n) =>
                                setSizeDetails((prev) =>
                                  prev.map((s) =>
                                    s.size === size ? { ...s, quantity: n } : s
                                  )
                                )
                              }
                              min={0}
                              className="w-24 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#0F172A] px-2.5 py-1.5 text-right text-sm text-[#0F172A] dark:text-white outline-none focus:border-[#2FB9BF] focus:ring-2 focus:ring-[#2FB9BF]/20"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <NumberInput
                              value={sd?.totalCostPrice ?? 0}
                              onValueChange={(n) =>
                                setSizeDetails((prev) =>
                                  prev.map((s) =>
                                    s.size === size ? { ...s, totalCostPrice: n } : s
                                  )
                                )
                              }
                              min={0}
                              className="w-28 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#0F172A] px-2.5 py-1.5 text-right text-sm text-[#0F172A] dark:text-white outline-none focus:border-[#2FB9BF] focus:ring-2 focus:ring-[#2FB9BF]/20"
                            />
                          </td>
                          <td className="px-3 py-2 text-right text-[#64748B] dark:text-[#94A3B8]">
                            Rs. {perPiece.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <NumberInput
                              value={sd?.stockAlertLevel ?? 0}
                              onValueChange={(n) =>
                                setSizeDetails((prev) =>
                                  prev.map((s) =>
                                    s.size === size ? { ...s, stockAlertLevel: n } : s
                                  )
                                )
                              }
                              min={0}
                              placeholder="0 = off"
                              className="w-24 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#0F172A] px-2.5 py-1.5 text-right text-sm text-[#0F172A] dark:text-white outline-none focus:border-[#2FB9BF] focus:ring-2 focus:ring-[#2FB9BF]/20"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {formError && (
            <div className="mt-4 rounded-xl border border-red-200 dark:border-[#334155] bg-red-50 dark:bg-[#1E293B] px-4 py-3 text-sm font-medium text-red-600">
              {formError}
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] px-4 py-2.5 text-sm font-semibold text-[#475569] dark:text-[#94A3B8] transition-colors hover:border-[#2FB9BF]/50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2FB9BF] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(47,185,191,0.3)] dark:shadow-none transition-colors hover:bg-[#28a9af] disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create Bottle
            </button>
          </div>
        </form>
      )}

      {loadError ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <p className="mt-4 text-sm font-semibold text-[#0F172A] dark:text-white">{loadError}</p>
        </div>
      ) : loading && bottles.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#2FB9BF]" />
          <p className="mt-4 text-sm font-medium text-[#64748B] dark:text-[#94A3B8]">
            Loading bottles…
          </p>
        </div>
      ) : bottles.length === 0 ? (
        <EmptyInventory onAdd={() => setShowForm(true)} />
      ) : (
        <InventoryTable
          bottles={bottles}
          onOpen={(bottle) => setSelected(bottle)}
          onAddInventory={(bottle) => {
            setAddInvBottle(bottle);
          }}
          onDelete={(bottle) => setConfirmDelete(bottle)}
          actionLoading={actionLoading}
        />
      )}

      {confirmDelete && (
        <DeleteConfirm
          bottle={confirmDelete}
          loading={actionLoading === confirmDelete._id}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => void handleDelete()}
        />
      )}

      {selected && (
        <AuditDrawer bottle={selected} onClose={() => setSelected(null)} />
      )}

      {addInvBottle && (
        <AddInventoryModal
          bottle={addInvBottle}
          onClose={() => setAddInvBottle(null)}
          onAdded={(updated) => {
            setBottles((current) =>
              current.map((b) => (b._id === updated._id ? updated : b))
            );
            setAddInvBottle(null);
          }}
        />
      )}
    </AdminPage>
  );
}

function EmptyInventory({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <PackageSearch className="h-12 w-12 text-[#CBD5E1]" />
      <h2 className="mt-4 text-lg font-semibold text-[#0F172A] dark:text-white">
        No bottles yet
      </h2>
      <p className="mt-1 max-w-md text-sm text-[#64748B] dark:text-[#94A3B8]">
        Add your first plastic bottle (Mixing or Pure) to start tracking sizes
        and quantities.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#2FB9BF] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#28a9af]"
      >
        <Plus className="h-4 w-4" />
        Add bottle
      </button>
    </div>
  );
}

function InventoryTable({
  bottles,
  onOpen,
  onAddInventory,
  onDelete,
  actionLoading,
}: {
  bottles: Bottle[];
  onOpen: (bottle: Bottle) => void;
  onAddInventory: (bottle: Bottle) => void;
  onDelete: (bottle: Bottle) => void;
  actionLoading: string | null;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[920px] border-collapse text-left">
        <thead>
          <tr className="border-b border-[#E2E8F0] dark:border-[#1E293B] text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
            <th className="px-6 py-3">ID</th>
            <th className="px-6 py-3">Image</th>
            <th className="px-6 py-3">Name</th>
            <th className="px-6 py-3">Type</th>
            <th className="px-6 py-3 text-right">Per-Size Cost</th>
            <th className="px-6 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F1F5F9] dark:divide-[#1E293B]">
          {bottles.map((bottle) => {
            return (
              <tr
                key={bottle._id}
                className="cursor-pointer align-middle transition-colors hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]"
                onClick={() => onOpen(bottle)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="rounded-lg bg-[#E6F7F8] dark:bg-[#163A3B] px-2.5 py-1 font-mono text-xs font-bold text-[#0E7A80] dark:text-[#5EEAD4] ring-1 ring-[#2FB9BF]/30">
                    {bottle.customId}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <ImageHoverPreview src={bottle.imageUrl} alt={bottle.bottleName} className="h-11 w-11 overflow-hidden rounded-xl border border-[#E2E8F0] dark:border-[#1E293B]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={bottle.imageUrl}
                      alt={bottle.bottleName}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.opacity = "0.15";
                      }}
                    />
                  </ImageHoverPreview>
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-[#0F172A] dark:text-white">
                  {bottle.bottleName}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${typeColor(
                      bottle.type
                    )}`}
                  >
                    {bottle.type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col items-end gap-1">
                    {bottle.sizeDetails.length === 0 && (
                      <span className="text-sm text-[#CBD5E1] dark:text-[#334155]">
                        —
                      </span>
                    )}
                    {bottle.sizeDetails
                      .slice()
                      .sort((a, b) => b.quantity - a.quantity)
                      .map((sd) => {
                        const unit =
                          Number(sd.quantity) > 0
                            ? Number(sd.totalCostPrice) / Number(sd.quantity)
                            : 0;
                        return (
                          <span
                            key={sd.size}
                            className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap text-xs text-[#64748B] dark:text-[#94A3B8]"
                          >
                            <span className="font-semibold text-[#0F172A] dark:text-white">
                              {sd.size}
                            </span>
                            <span className="text-[#2FB9BF]">
                              Rs. {Number(sd.totalCostPrice).toLocaleString()}
                            </span>
                            <span>
                              (Rs. {unit.toLocaleString(undefined, { maximumFractionDigits: 2 })}/pc)
                            </span>
                          </span>
                        );
                      })}
                  </div>
                </td>
                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onAddInventory(bottle)}
                      title="Add inventory"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#2FB9BF]/40 bg-[#2FB9BF]/5 dark:bg-[#163A3B] px-3 py-2 text-xs font-bold text-[#0E7A80] dark:text-[#5EEAD4] transition-colors hover:bg-[#2FB9BF] hover:text-white"
                    >
                      <PackagePlus className="h-4 w-4" />
                      Add Inventory
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpen(bottle)}
                      title="View audit trail"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] text-[#475569] dark:text-[#94A3B8] transition-colors hover:border-[#2FB9BF]/50 hover:text-[#2FB9BF]"
                    >
                      <History className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading === bottle._id}
                      onClick={() => onDelete(bottle)}
                      title="Delete"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] text-[#475569] dark:text-[#94A3B8] transition-colors hover:border-red-200 dark:border-[#334155] hover:bg-red-50 dark:bg-[#1E293B] hover:text-red-600 disabled:opacity-60"
                    >
                      {actionLoading === bottle._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DeleteConfirm({
  bottle,
  loading,
  onCancel,
  onConfirm,
}: {
  bottle: Bottle;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] p-6 shadow-xl dark:shadow-none">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 dark:bg-[#1E293B] ring-1 ring-red-200">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </span>
          <div>
            <h3 className="text-base font-bold text-[#0F172A] dark:text-white">
              Delete {bottle.customId}?
            </h3>
            <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">This action cannot be undone.</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] px-4 py-2.5 text-sm font-semibold text-[#475569] dark:text-[#94A3B8] hover:border-[#2FB9BF]/50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function AddInventoryModal({
  bottle,
  onClose,
  onAdded,
}: {
  bottle: Bottle;
  onClose: () => void;
  onAdded: (bottle: Bottle) => void;
}) {
  const existing = bottle.sizeDetails.reduce<Record<BottleSize, number>>(
    (acc, sd) => {
      acc[sd.size] = sd.quantity;
      return acc;
    },
    { "300ml": 0, "500ml": 0, "1500ml": 0, "19L": 0 }
  );

  const [selectedSizes, setSelectedSizes] = useState<BottleSize[]>([]);
  const [additions, setAdditions] = useState<AddInventorySize[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAdditions(
      BOTTLE_SIZES.map((size) => {
        const existingSd = bottle.sizeDetails.find((sd) => sd.size === size);
        return { size, quantity: 0, totalCostPrice: 0, stockAlertLevel: existingSd?.stockAlertLevel ?? 0 };
      })
    );
  }, [bottle]);

  function toggleSize(size: BottleSize) {
    setSelectedSizes((current) =>
      current.includes(size)
        ? current.filter((s) => s !== size)
        : [...current, size]
    );
  }

  function setAdd(size: BottleSize, field: keyof AddInventorySize, value: number) {
    setAdditions((current) =>
      current.map((a) => (a.size === size ? { ...a, [field]: value } : a))
    );
  }

  const filtered = additions.filter((a) => selectedSizes.includes(a.size));
  const totalQty = filtered.reduce((sum, a) => sum + (Number(a.quantity) || 0), 0);
  const totalCost = filtered.reduce(
    (sum, a) => sum + (Number(a.totalCostPrice) || 0),
    0
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const sizeDetails = filtered.filter((a) => (Number(a.quantity) || 0) > 0);
    if (sizeDetails.length === 0) {
      setError("Select at least one size and enter a positive quantity.");
      return;
    }
    setSubmitting(true);
    try {
      const updated = await addBottleInventory(bottle._id, { sizeDetails });
      onAdded(updated);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to add inventory."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] shadow-2xl dark:shadow-none"
      >
        <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1E293B] p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E6F7F8] dark:bg-[#163A3B] ring-1 ring-[#2FB9BF]/30">
              <PackagePlus className="h-5 w-5 text-[#0E7A80] dark:text-[#5EEAD4]" />
            </span>
            <div>
              <h3 className="text-base font-bold text-[#0F172A] dark:text-white">
                Add Inventory
              </h3>
              <p className="font-mono text-xs font-bold text-[#0E7A80] dark:text-[#5EEAD4]">
                {bottle.customId} · {bottle.bottleName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] text-[#475569] dark:text-[#94A3B8] hover:border-[#2FB9BF]/50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
            Select sizes to add
          </label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {BOTTLE_SIZES.map((size) => {
              const checked = selectedSizes.includes(size);
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleSize(size)}
                  className={`rounded-xl border px-3 py-3 text-center text-sm font-semibold transition-colors ${
                    checked
                      ? "border-[#2FB9BF] bg-[#2FB9BF]/5 dark:bg-[#163A3B] text-[#0F172A] dark:text-white"
                      : "border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] text-[#475569] dark:text-[#94A3B8] hover:border-[#2FB9BF]/40"
                  }`}
                >
                  <span>{size}</span>
                  <span className="block text-[11px] font-medium text-[#94A3B8]">
                    current: {Number(existing[size] || 0).toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>

          {filtered.length > 0 && (
            <div className="mt-5 space-y-3">
              {filtered.map((a) => (
                <div
                  key={a.size}
                   className="rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#1E293B] p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#0F172A] dark:text-white">
                      {a.size}
                    </span>
                    <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                      current {Number(existing[a.size] || 0).toLocaleString()}
                      {" → "}
                      <span className="font-bold text-[#0E7A80] dark:text-[#5EEAD4]">
                        {(
                          Number(existing[a.size] || 0) + (Number(a.quantity) || 0)
                        ).toLocaleString()}
                      </span>
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                        Qty to add
                      </label>
                      <NumberInput
                        value={a.quantity}
                        onValueChange={(n) => setAdd(a.size, "quantity", n)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                        Cost (PKR)
                      </label>
                      <NumberInput
                        value={a.totalCostPrice}
                        onValueChange={(n) => setAdd(a.size, "totalCostPrice", n)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                        Alert Level
                      </label>
                      <NumberInput
                        value={a.stockAlertLevel}
                        onValueChange={(n) => setAdd(a.size, "stockAlertLevel", n)}
                        min={0}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  {(Number(a.quantity) || 0) > 0 && (
                    <p className="mt-2 text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                      Cost per piece:{" "}
                      <span className="text-[#2FB9BF]">
                        Rs.{" "}
                        {Math.round(
                          ((Number(a.totalCostPrice) || 0) / Math.max(1, Number(a.quantity) || 0)) * 100
                        ) / 100}
                      </span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {totalQty > 0 && (
            <p className="mt-4 rounded-xl border border-[#2FB9BF]/30 bg-[#2FB9BF]/5 dark:bg-[#163A3B] px-3 py-2 text-xs font-medium text-[#0E7A80] dark:text-[#5EEAD4]">
              Adding:{" "}
              <span className="font-bold text-[#0F172A] dark:text-white">
                {totalQty.toLocaleString()} pcs
              </span>
              {" · "}Total cost:{" "}
              <span className="font-bold text-[#0F172A] dark:text-white">
                Rs. {totalCost.toLocaleString()}
              </span>
            </p>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 dark:border-[#334155] bg-red-50 dark:bg-[#1E293B] px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[#E2E8F0] dark:border-[#1E293B] p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] px-4 py-2.5 text-sm font-semibold text-[#475569] dark:text-[#94A3B8] transition-colors hover:border-[#2FB9BF]/50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2FB9BF] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(47,185,191,0.3)] dark:shadow-none transition-colors hover:bg-[#28a9af] disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PackagePlus className="h-4 w-4" />
            )}
            Add to Inventory
          </button>
        </div>
      </form>
    </div>
  );
}

function AuditDrawer({
  bottle,
  onClose,
}: {
  bottle: Bottle;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white dark:bg-[#0F172A] shadow-2xl dark:shadow-none">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1E293B] p-5">
          <div className="flex items-center gap-3">
            <ImageHoverPreview src={bottle.imageUrl} alt={bottle.bottleName} className="h-12 w-12 overflow-hidden rounded-xl border border-[#E2E8F0] dark:border-[#1E293B]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bottle.imageUrl}
                alt={bottle.bottleName}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.opacity = "0.15";
                }}
              />
            </ImageHoverPreview>
            <div>
              <p className="font-mono text-xs font-bold text-[#0E7A80] dark:text-[#5EEAD4]">
                {bottle.customId}
              </p>
              <h3 className="text-lg font-bold text-[#0F172A] dark:text-white">
                {bottle.bottleName}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] text-[#475569] dark:text-[#94A3B8] hover:border-[#2FB9BF]/50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
           <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#1E293B] p-4">
            <div className="flex items-center justify-between">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${typeColor(
                  bottle.type
                )}`}
              >
                {bottle.type}
              </span>
              <a
                href={bottle.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#2FB9BF] hover:text-[#0E7A80] dark:text-[#5EEAD4]"
              >
                View image <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A]">
              <table className="w-full border-collapse text-sm">
                <thead>
                   <tr className="bg-[#F8FAFC] dark:bg-[#1E293B] text-left text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                    <th className="px-3 py-2">Size</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Total Cost</th>
                    <th className="px-3 py-2 text-right">Unit Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] dark:divide-[#1E293B]">
                  {bottle.sizeDetails.map((sd) => (
                    <tr key={sd.size}>
                      <td className="px-3 py-2 font-semibold text-[#0F172A] dark:text-white">
                        {sd.size}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-[#0F172A] dark:text-white">
                        {Number(sd.quantity).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right text-[#2FB9BF]">
                        Rs. {Number(sd.totalCostPrice).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right text-[#64748B] dark:text-[#94A3B8]">
                        Rs. {Number(sd.unitCostPrice || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                   <tr className="border-t border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#1E293B] font-bold text-[#0F172A] dark:text-white">
                    <td className="px-3 py-2">Total</td>
                    <td className="px-3 py-2 text-right">
                      {bottle.sizeDetails
                        .reduce((sum, sd) => sum + (Number(sd.quantity) || 0), 0)
                        .toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-[#2FB9BF]">
                      Rs.{" "}
                      {bottle.sizeDetails
                        .reduce((sum, sd) => sum + (Number(sd.totalCostPrice) || 0), 0)
                        .toLocaleString()}
                    </td>
                    <td className="px-3 py-2" />
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="mt-3 border-t border-[#E2E8F0] dark:border-[#1E293B] pt-3 text-xs text-[#64748B] dark:text-[#94A3B8]">
              Created by{" "}
              <span className="font-semibold text-[#0F172A] dark:text-white">
                {bottle.createdBy?.name ?? "—"}
              </span>{" "}
              · {formatTime(bottle.createdAt)}
            </div>
          </div>

          <h3 className="mt-6 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
            <History className="h-4 w-4 text-[#2FB9BF]" />
            Audit Trail
          </h3>

          <ol className="relative mt-4 space-y-5 border-l-2 border-[#E6F7F8] dark:border-[#163A3B] pl-5">
            {bottle.updatedByHistory
              .slice()
              .sort(
                (a, b) =>
                  new Date(a.updatedAt).getTime() -
                  new Date(b.updatedAt).getTime()
              )
              .map((entry, index) => (
                <li key={index} className="relative">
                  <span className="absolute -left-[27px] top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#2FB9BF] ring-4 ring-[#E6F7F8] dark:ring-[#163A3B]">
                    <span className="h-1.5 w-1.5 rounded-full bg-white dark:bg-[#0F172A]" />
                  </span>
                  <p className="text-sm font-bold text-[#0F172A] dark:text-white">
                    {entry.adminName}
                  </p>
                  <p className="text-xs text-[#94A3B8]">{formatTime(entry.updatedAt)}</p>
                   <p className="mt-1.5 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#1E293B] px-3 py-2 text-xs leading-relaxed text-[#475569] dark:text-[#94A3B8]">
                    {entry.changesSummary}
                  </p>
                </li>
              ))}
          </ol>
        </div>
      </aside>
    </div>
  );
}

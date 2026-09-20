"use client";

import { useCallback, useEffect, useState } from "react";

import {
  AlertTriangle,
  ExternalLink,
  History,
  ImagePlus,
  Loader2,
  PackageSearch,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import AdminPage from "@/components/admin/AdminPage";
import SelectDropdown, {
  type SelectOption,
} from "@/components/admin/SelectDropdown";
import NumberInput from "@/components/admin/NumberInput";
import { useToast } from "@/components/admin/toast";
import ImageHoverPreview from "@/components/admin/ImageHoverPreview";
import {
  ApiError,
  createCap,
  createColor,
  deleteCap,
  fetchCaps,
  fetchColorsPaginated,
  updateCap,
  uploadBottleImage,
  type Cap,
  type Color,
} from "@/lib/admin-api";
import { subscribeInventoryNotification } from "@/lib/admin-socket";

const inputClass =
  "w-full rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0F172A] px-3.5 py-2.5 text-sm text-[#0F172A] dark:text-white placeholder-[#94A3B8] outline-none transition-colors focus:border-[#2FB9BF] focus:bg-white dark:focus:bg-[#1a2332] focus:ring-2 focus:ring-[#2FB9BF]/20";

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

export default function CapsInventoryPage() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [caps, setCaps] = useState<Cap[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Cap | null>(null);

  // create form state
  const [showForm, setShowForm] = useState(false);
  const [color, setColor] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [totalCostPrice, setTotalCostPrice] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Cap | null>(null);
  const [stockAlertLevel, setStockAlertLevel] = useState(0);
  const toast = useToast();

  // color list + add-new-color modal state
  const [colors, setColors] = useState<Color[]>([]);
  const [colorPage, setColorPage] = useState(1);
  const [colorHasMore, setColorHasMore] = useState(false);
  const [loadingMoreColors, setLoadingMoreColors] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);
  const [newColorName, setNewColorName] = useState("");
  const [newColorValue, setNewColorValue] = useState("");
  const [colorSubmitting, setColorSubmitting] = useState(false);
  const [colorError, setColorError] = useState<string | null>(null);

  const costPerCap =
    totalQuantity > 0 ? Math.round((totalCostPrice / totalQuantity) * 100) / 100 : 0;

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchCaps();
      setCaps(data);
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.message : "Failed to load cap inventory."
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
    if (openId && caps.length > 0 && !selected) {
      const match = caps.find((c) => c._id === openId);
      if (match) setSelected(match);
    }
  }, [openId, caps, selected]);

  const loadColors = useCallback(async () => {
    try {
      const result = await fetchColorsPaginated(1, 20);
      setColors(result.data);
      setColorHasMore(result.hasMore);
      setColorPage(1);
    } catch {
      setColors([]);
      setColorHasMore(false);
    }
  }, []);

  useEffect(() => {
    void loadColors();
  }, [loadColors]);

  function loadMoreColors() {
    if (!colorHasMore || loadingMoreColors) return;
    const nextPage = colorPage + 1;
    setLoadingMoreColors(true);
    void fetchColorsPaginated(nextPage, 20)
      .then((result) => {
        setColors((prev) => [...prev, ...result.data]);
        setColorHasMore(result.hasMore);
        setColorPage(nextPage);
      })
      .catch(() => setColorHasMore(false))
      .finally(() => setLoadingMoreColors(false));
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const trimmedColor = color.trim();
    const trimmedImage = imageUrl.trim();

    if (!trimmedColor) {
      setFormError("Cap color is required.");
      return;
    }
    if (!trimmedImage) {
      setFormError("Please upload an image or provide an image URL.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createCap({
        color: trimmedColor,
        imageUrl: trimmedImage,
        totalQuantity,
        totalCostPrice,
        stockAlertLevel,
      });
      setCaps((current) => [created, ...current]);
      toast.success(`Created ${created.customId} successfully.`);
      resetForm();
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Failed to create cap.");
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
      const result = await uploadBottleImage(file, "caps");
      setImageUrl(result.url);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Image upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function resetForm() {
    setColor("");
    setImageUrl("");
    setTotalQuantity(0);
    setTotalCostPrice(0);
    setStockAlertLevel(0);
  }

  function openAddColorModal() {
    setColor("");
    setNewColorName("");
    setNewColorValue("");
    setColorError(null);
    setShowColorModal(true);
  }

  async function handleCreateColor(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setColorError(null);
    const name = newColorName.trim();
    if (!name) {
      setColorError("Color name is required.");
      return;
    }
    setColorSubmitting(true);
    try {
      const created = await createColor({
        name,
        value: newColorValue.trim() || undefined,
      });
      const updated = [...colors, created].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      setColors(updated);
      setColor(created.name);
      setShowColorModal(false);
      setNewColorName("");
      setNewColorValue("");
    } catch (err) {
      setColorError(err instanceof ApiError ? err.message : "Failed to add color.");
    } finally {
      setColorSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setActionLoading(confirmDelete._id);
    setFormError(null);
    try {
      await deleteCap(confirmDelete._id);
      setCaps((current) =>
        current.filter((c) => c._id !== confirmDelete._id)
      );
      if (selected?._id === confirmDelete._id) setSelected(null);
      setConfirmDelete(null);
    } catch (err) {
      setActionLoading(null);
      setFormError(err instanceof ApiError ? err.message : "Failed to delete cap.");
    } finally {
      setActionLoading(null);
      setConfirmDelete(null);
    }
  }

  return (
    <AdminPage
      title="Caps Inventory"
      description="Manage cap stock with full creation and edit history."
    >
      <div className="flex flex-col gap-3 border-b border-[#E2E8F0] dark:border-[#1E293B] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">
          {caps.length} {caps.length === 1 ? "cap" : "caps"} in stock
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowForm((current) => !current);
              setFormError(null);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2FB9BF] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(47,185,191,0.3)] dark:shadow-none transition-colors hover:bg-[#28a9af]"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Close" : "Add Cap"}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
                Color
              </label>
              <SelectDropdown
                value={color}
                placeholder="Select a color"
                options={colors.map(
                  (c): SelectOption => ({ label: c.name, value: c.name })
                )}
                onSelect={(v) => setColor(v)}
                actionLabel="+ Add new color"
                onAction={openAddColorModal}
                onReachEnd={loadMoreColors}
                loadingMore={loadingMoreColors}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
                Total Quantity
              </label>
              <NumberInput
                value={totalQuantity}
                onValueChange={setTotalQuantity}
                placeholder="e.g. 5000"
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
              Image
            </label>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => document.getElementById("cap-image-input")?.click()}
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
                id="cap-image-input"
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
                    placeholder="https://.../cap-image.png"
                    className={inputClass}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
              Total Cost (PKR)
            </label>
            <NumberInput
              value={totalCostPrice}
              onValueChange={setTotalCostPrice}
              placeholder="e.g. 30000"
              className={inputClass}
            />
            {totalQuantity > 0 && (
              <p className="mt-1.5 text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                Cost per cap:{" "}
                <span className="text-[#2FB9BF]">
                  Rs. {costPerCap.toLocaleString()}
                </span>
              </p>
            )}
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
              Stock Alert Level <span className="text-xs font-normal text-[#94A3B8]">(minimum quantity; 0 = disabled)</span>
            </label>
            <NumberInput
              value={stockAlertLevel}
              onValueChange={setStockAlertLevel}
              min={0}
              placeholder="e.g. 200"
              className={inputClass}
            />
            {stockAlertLevel > 0 && (
              <p className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8]">
                You will be alerted when stock falls below {stockAlertLevel.toLocaleString()}.
              </p>
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
              Create Cap
            </button>
          </div>
        </form>
      )}

      {loadError ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <p className="mt-4 text-sm font-semibold text-[#0F172A] dark:text-white">{loadError}</p>
        </div>
      ) : loading && caps.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#2FB9BF]" />
          <p className="mt-4 text-sm font-medium text-[#64748B] dark:text-[#94A3B8]">Loading caps…</p>
        </div>
      ) : caps.length === 0 ? (
        <EmptyCaps onAdd={() => setShowForm(true)} />
      ) : (
        <CapsTable
          caps={caps}
          onOpen={(cap) => setSelected(cap)}
          onDelete={(cap) => setConfirmDelete(cap)}
          onEdit={(cap) => setSelected(cap)}
          actionLoading={actionLoading}
        />
      )}

      {confirmDelete && (
        <DeleteConfirm
          cap={confirmDelete}
          loading={actionLoading === confirmDelete._id}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => void handleDelete()}
        />
      )}

      {selected && (
        <CapDrawer
          cap={selected}
          onClose={() => setSelected(null)}
          onSaved={(updated) => {
            setCaps((current) =>
              current.map((c) => (c._id === updated._id ? updated : c))
            );
            setSelected(updated);
          }}
        />
      )}

      {showColorModal && (
        <AddColorModal
          name={newColorName}
          value={newColorValue}
          error={colorError}
          submitting={colorSubmitting}
          onNameChange={setNewColorName}
          onValueChange={setNewColorValue}
          onCancel={() => setShowColorModal(false)}
          onSubmit={(e) => void handleCreateColor(e)}
        />
      )}
    </AdminPage>
  );
}

function AddColorModal({
  name,
  value,
  error,
  submitting,
  onNameChange,
  onValueChange,
  onCancel,
  onSubmit,
}: {
  name: string;
  value: string;
  error: string | null;
  submitting: boolean;
  onNameChange: (v: string) => void;
  onValueChange: (v: string) => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] p-6 shadow-xl dark:shadow-none"
      >
        <h3 className="text-base font-bold text-[#0F172A] dark:text-white">Add New Color</h3>
        <p className="mt-1 text-sm text-[#64748B] dark:text-[#94A3B8]">
          This color will be saved and available in the dropdown.
        </p>

        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
            Color Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g. Blue, White, Black"
            className={inputClass}
            autoFocus
          />
        </div>

        <div className="mt-3">
          <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
            Color Value <span className="font-normal text-[#94A3B8]">(optional)</span>
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder="e.g. #1E90FF"
            className={inputClass}
          />
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 dark:border-[#334155] bg-red-50 dark:bg-[#1E293B] px-4 py-3 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] px-4 py-2.5 text-sm font-semibold text-[#475569] dark:text-[#94A3B8] hover:border-[#2FB9BF]/50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2FB9BF] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(47,185,191,0.3)] dark:shadow-none transition-colors hover:bg-[#28a9af] disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Add Color
          </button>
        </div>
      </form>
    </div>
  );
}

function EmptyCaps({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <PackageSearch className="h-12 w-12 text-[#CBD5E1]" />
      <div className="mt-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 ring-1 ring-violet-200">
        <div className="h-5 w-5 rounded-full border-4 border-[#2FB9BF]" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-[#0F172A] dark:text-white">No caps yet</h2>
      <p className="mt-1 max-w-md text-sm text-[#64748B] dark:text-[#94A3B8]">
        Add your first cap variant by color to start tracking stock and costs.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#2FB9BF] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#28a9af]"
      >
        <Plus className="h-4 w-4" />
        Add cap
      </button>
    </div>
  );
}

function CapsTable({
  caps,
  onOpen,
  onDelete,
  onEdit,
  actionLoading,
}: {
  caps: Cap[];
  onOpen: (cap: Cap) => void;
  onDelete: (cap: Cap) => void;
  onEdit: (cap: Cap) => void;
  actionLoading: string | null;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-left">
        <thead>
          <tr className="border-b border-[#E2E8F0] dark:border-[#1E293B] text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
            <th className="px-6 py-3">Custom ID</th>
            <th className="px-6 py-3">Image</th>
            <th className="px-6 py-3">Color</th>
            <th className="px-6 py-3 text-right">Stock</th>
            <th className="px-6 py-3 text-right">Per Piece Cost</th>
            <th className="px-6 py-3 text-right">Total Cost</th>
            <th className="px-6 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F1F5F9] dark:divide-[#1E293B]">
          {caps.map((cap) => {
            const lastEdit =
              cap.updatedByHistory[cap.updatedByHistory.length - 1];
            return (
              <tr
                key={cap._id}
                className="cursor-pointer align-middle transition-colors hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]"
                onClick={() => onOpen(cap)}
              >
                <td className="px-6 py-4">
                  <span className="rounded-lg bg-[#E6F7F8] dark:bg-[#163A3B] px-2.5 py-1 font-mono text-xs font-bold text-[#0E7A80] dark:text-[#5EEAD4] ring-1 ring-[#2FB9BF]/30">
                    {cap.customId}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <ImageHoverPreview src={cap.imageUrl} alt={cap.color} className="h-10 w-10 overflow-hidden rounded-lg">
                    {cap.imageUrl && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={cap.imageUrl}
                      alt={cap.color}
                      className="h-full w-full rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.opacity = "0.15";
                      }}
                    />
                     )}
                  </ImageHoverPreview>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-4 w-4 rounded-full border border-[#E2E8F0] dark:border-[#1E293B]"
                      style={{ backgroundColor: colorHex(cap.color) }}
                    />
                    <span className="text-sm font-semibold text-[#0F172A] dark:text-white">
                      {cap.color}
                    </span>
                    {lastEdit && (
                      <span
                        title={`Last updated by ${lastEdit.adminName}`}
                        className="text-xs text-[#94A3B8]"
                      >
                        by {lastEdit.adminName}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-sm font-bold text-[#0F172A] dark:text-white">
                  {Number(cap.totalQuantity).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right text-sm font-semibold text-[#2FB9BF]">
                  Rs.{" "}
                  {(
                    (Number(cap.totalQuantity) || 0) > 0
                      ? (Number(cap.totalCostPrice) || 0) /
                        Number(cap.totalQuantity)
                      : 0
                  ).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium text-[#475569] dark:text-[#94A3B8]">
                  Rs. {(Number(cap.totalCostPrice) || 0).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(cap)}
                      title="Edit cap"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] text-[#475569] dark:text-[#94A3B8] transition-colors hover:border-[#2FB9BF]/50 hover:text-[#2FB9BF]"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpen(cap)}
                      title="View audit trail"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] text-[#475569] dark:text-[#94A3B8] transition-colors hover:border-[#2FB9BF]/50 hover:text-[#2FB9BF]"
                    >
                      <History className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading === cap._id}
                      onClick={() => onDelete(cap)}
                      title="Delete"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] text-[#475569] dark:text-[#94A3B8] transition-colors hover:border-red-200 dark:border-[#334155] hover:bg-red-50 dark:bg-[#1E293B] hover:text-red-600 disabled:opacity-60"
                    >
                      {actionLoading === cap._id ? (
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
  cap,
  loading,
  onCancel,
  onConfirm,
}: {
  cap: Cap;
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
              Delete {cap.customId}?
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

function CapDrawer({
  cap,
  onClose,
  onSaved,
}: {
  cap: Cap;
  onClose: () => void;
  onSaved: (updated: Cap) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editColor, setEditColor] = useState(cap.color);
  const [editQuantity, setEditQuantity] = useState(cap.totalQuantity);
  const [editCost, setEditCost] = useState(cap.totalCostPrice);
  const [editStockAlertLevel, setEditStockAlertLevel] = useState(cap.stockAlertLevel);
  const [editImageUrl, setEditImageUrl] = useState(cap.imageUrl);
  const [editUploading, setEditUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const editCostPerCap =
    editQuantity > 0 ? Math.round((editCost / editQuantity) * 100) / 100 : 0;

  async function handleEditUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditUploading(true);
    setEditError(null);
    try {
      const result = await uploadBottleImage(file, "caps");
      setEditImageUrl(result.url);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Image upload failed.");
    } finally {
      setEditUploading(false);
      e.target.value = "";
    }
  }

  async function handleSave() {
    setEditError(null);
    if (!editColor.trim()) {
      setEditError("Color is required.");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateCap(cap._id, {
        color: editColor.trim(),
        totalQuantity: editQuantity,
        totalCostPrice: editCost,
        stockAlertLevel: editStockAlertLevel,
        imageUrl: editImageUrl.trim() || undefined,
      });
      setEditing(false);
      onSaved(updated);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Failed to update cap.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white dark:bg-[#0F172A] shadow-2xl dark:shadow-none">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1E293B] p-5">
          <div className="flex items-center gap-3">
            <ImageHoverPreview src={cap.imageUrl} alt={cap.color} className="h-12 w-12 overflow-hidden rounded-xl border border-[#E2E8F0] dark:border-[#1E293B]">
              {cap.imageUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={cap.imageUrl}
                alt={cap.color}
                className="h-full w-full rounded-xl object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.opacity = "0.15";
                }}
              />
               )}
            </ImageHoverPreview>
            <div>
              <p className="font-mono text-xs font-bold text-[#0E7A80] dark:text-[#5EEAD4]">
                {cap.customId}
              </p>
              <h3 className="text-lg font-bold text-[#0F172A] dark:text-white">{cap.color}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditing((cur) => !cur)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] px-3 py-2 text-xs font-semibold text-[#475569] dark:text-[#94A3B8] hover:border-[#2FB9BF]/50 hover:text-[#2FB9BF]"
            >
              {editing ? (
                <X className="h-3.5 w-3.5" />
              ) : (
                <Pencil className="h-3.5 w-3.5" />
              )}
              {editing ? "Cancel" : "Edit"}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] text-[#475569] dark:text-[#94A3B8] hover:border-[#2FB9BF]/50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {editing ? (
          <div className="flex-1 overflow-y-auto p-5">
            <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
              Color
            </label>
            <input
              type="text"
              value={editColor}
              onChange={(e) => setEditColor(e.target.value)}
              className={inputClass}
            />
            <label className="mt-4 mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
              Image
            </label>
            <button
              type="button"
              onClick={() => document.getElementById("cap-edit-image-input")?.click()}
              disabled={editUploading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#CBD5E1] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] px-4 py-3 text-sm font-semibold text-[#475569] dark:text-[#94A3B8] transition-colors hover:border-[#2FB9BF] hover:text-[#2FB9BF] disabled:opacity-60"
            >
              {editUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <ImagePlus className="h-4 w-4" />
                  Replace image
                </>
              )}
            </button>
            <input
              id="cap-edit-image-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleEditUpload}
            />
            <label className="mt-4 mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
              Total Quantity
            </label>
            <input
              type="number"
              min={0}
              value={editQuantity || ""}
              onChange={(e) =>
                setEditQuantity(Math.max(0, Number(e.target.value) || 0))
              }
              className={inputClass}
            />
            <label className="mt-4 mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
              Total Cost (PKR)
            </label>
            <input
              type="number"
              min={0}
              value={editCost || ""}
              onChange={(e) =>
                setEditCost(Math.max(0, Number(e.target.value) || 0))
              }
              className={inputClass}
            />
            {editQuantity > 0 && (
              <p className="mt-1.5 text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                Cost per cap:{" "}
                <span className="text-[#2FB9BF]">
                  Rs. {editCostPerCap.toLocaleString()}
                </span>
              </p>
            )}
            <label className="mt-4 mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
              Stock Alert Level
            </label>
            <NumberInput
              value={editStockAlertLevel}
              onValueChange={setEditStockAlertLevel}
              min={0}
              className={inputClass}
            />

            {editError && (
              <div className="mt-4 rounded-xl border border-red-200 dark:border-[#334155] bg-red-50 dark:bg-[#1E293B] px-4 py-3 text-sm font-medium text-red-600">
                {editError}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditColor(cap.color);
                  setEditQuantity(cap.totalQuantity);
                  setEditCost(cap.totalCostPrice);
                  setEditImageUrl(cap.imageUrl);
                  setEditing(false);
                  setEditError(null);
                }}
                className="rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] px-4 py-2 text-sm font-semibold text-[#475569] dark:text-[#94A3B8] hover:border-[#2FB9BF]/50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2FB9BF] px-5 py-2 text-sm font-semibold text-white hover:bg-[#28a9af] disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5">
             <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#1E293B] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-4 w-4 rounded-full border border-[#E2E8F0] dark:border-[#1E293B]"
                    style={{ backgroundColor: colorHex(cap.color) }}
                  />
                  <span className="text-sm font-bold text-[#0F172A] dark:text-white">
                    {cap.color}
                  </span>
                </div>
                <a
                  href={cap.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#2FB9BF] hover:text-[#0E7A80] dark:text-[#5EEAD4]"
                >
                  View image <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 border-t border-[#E2E8F0] dark:border-[#1E293B] pt-3 text-center">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                    Stock
                  </p>
                  <p className="mt-1 text-lg font-bold text-[#0F172A] dark:text-white">
                    {Number(cap.totalQuantity).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                    Per Piece Cost
                  </p>
                  <p className="mt-1 text-lg font-bold text-[#2FB9BF]">
                    Rs.{" "}
                    {(
                      (Number(cap.totalQuantity) || 0) > 0
                        ? (Number(cap.totalCostPrice) || 0) /
                          Number(cap.totalQuantity)
                        : 0
                    ).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                    Total Cost
                  </p>
                  <p className="mt-1 text-lg font-bold text-[#0F172A] dark:text-white">
                    Rs. {(Number(cap.totalCostPrice) || 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="mt-3 border-t border-[#E2E8F0] dark:border-[#1E293B] pt-3 text-xs text-[#64748B] dark:text-[#94A3B8]">
                Created by{" "}
                <span className="font-semibold text-[#0F172A] dark:text-white">
                  {cap.createdBy?.name ?? "—"}
                </span>{" "}
                · {formatTime(cap.createdAt)}
              </div>
            </div>

            <h3 className="mt-6 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
              <History className="h-4 w-4 text-[#2FB9BF]" />
              Audit Trail
            </h3>

            <ol className="relative mt-4 space-y-5 border-l-2 border-[#E6F7F8] dark:border-[#163A3B] pl-5">
              {cap.updatedByHistory
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
                    <p className="text-xs text-[#94A3B8]">
                      {formatTime(entry.updatedAt)}
                    </p>
                     <p className="mt-1.5 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#1E293B] px-3 py-2 text-xs leading-relaxed text-[#475569] dark:text-[#94A3B8]">
                      {entry.changesSummary}
                    </p>
                  </li>
                ))}
            </ol>
          </div>
        )}
      </aside>
    </div>
  );
}

function colorHex(color: string): string {
  const normalized = color.trim().toLowerCase();
  const known: Record<string, string> = {
    red: "#EF4444",
    blue: "#3B82F6",
    green: "#22C55E",
    yellow: "#EAB308",
    white: "#FFFFFF",
    black: "#0F172A",
    orange: "#F97316",
    purple: "#A855F7",
    pink: "#EC4899",
    brown: "#92400E",
    grey: "#64748B",
    gray: "#64748B",
    silver: "#CBD5E1",
    navy: "#1E3A8A",
  };
  if (known[normalized]) return known[normalized];
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalized)) return normalized;
  return "#CBD5E1";
}

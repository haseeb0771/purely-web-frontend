"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  History,
  Loader2,
  PackagePlus,
  PackageSearch,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import AdminPage from "@/components/admin/AdminPage";
import {
  ApiError,
  addPetPackagingInventory,
  createPetPackaging,
  deletePetPackaging,
  fetchPetPackaging,
  updatePetPackaging,
  PET_PACKAGING_SIZES,
  type PetPackaging,
  type PetPackagingAddInventorySize,
  type PetPackagingSizeDetail,
} from "@/lib/admin-api";
import { subscribeInventoryNotification } from "@/lib/admin-socket";
import NumberInput from "@/components/admin/NumberInput";
import { useToast } from "@/components/admin/toast";

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

function blankSizeDetails(): PetPackagingSizeDetail[] {
  return PET_PACKAGING_SIZES.map((size) => ({
    size,
    quantity: 0,
    totalCostPrice: 0,
    unitCostPrice: 0,
    stockAlertLevel: 0,
  }));
}

// Legacy records (created before multi-size support or from the mobile app)
// only have flat size/quantity fields — derive a single size detail so the
// whole UI can treat every record uniformly.
function effectiveSizeDetails(pkg: PetPackaging): PetPackagingSizeDetail[] {
  if (pkg.sizeDetails && pkg.sizeDetails.length > 0) return pkg.sizeDetails;
  if (pkg.size) {
    return [
      {
        size: pkg.size,
        quantity: Number(pkg.quantity) || 0,
        totalCostPrice: Number(pkg.totalCostPrice) || 0,
        unitCostPrice: Number(pkg.unitCostPrice) || 0,
        stockAlertLevel: Number(pkg.stockAlertLevel) || 0,
      },
    ];
  }
  return [];
}

function totalsOf(details: PetPackagingSizeDetail[]) {
  const totalQuantity = details.reduce(
    (sum, sd) => sum + (Number(sd.quantity) || 0),
    0
  );
  const totalCost = details.reduce(
    (sum, sd) => sum + (Number(sd.totalCostPrice) || 0),
    0
  );
  // Use the intake-frozen per-piece cost so the summary does not inflate as
  // stock is drawn down; only derive from total ÷ quantity when it is missing.
  let weightedCost = 0;
  let unitSum = 0;
  let unitCount = 0;
  for (const sd of details) {
    const qty = Number(sd.quantity) || 0;
    const stored = Number(sd.unitCostPrice) || 0;
    const unit =
      stored > 0 ? stored : qty > 0 ? (Number(sd.totalCostPrice) || 0) / qty : 0;
    weightedCost += qty * unit;
    if (unit > 0) {
      unitSum += unit;
      unitCount += 1;
    }
  }
  const costPerPiece =
    totalQuantity > 0
      ? weightedCost / totalQuantity
      : unitCount > 0
        ? unitSum / unitCount
        : 0;
  return { totalQuantity, totalCost, costPerPiece };
}

export default function InventoryPetPackagingPage() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [petPackagings, setPetPackagings] = useState<PetPackaging[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PetPackaging | null>(null);

  // create form state
  const [showForm, setShowForm] = useState(false);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [sizeDetails, setSizeDetails] = useState<PetPackagingSizeDetail[]>(blankSizeDetails);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PetPackaging | null>(null);
  const [addInventoryTarget, setAddInventoryTarget] =
    useState<PetPackaging | null>(null);
  const toast = useToast();

  const quantities = sizeDetails.reduce<Record<string, number>>((acc, sd) => {
    acc[sd.size] = sd.quantity;
    return acc;
  }, {});

  const totalQuantity = selectedSizes.reduce(
    (sum, size) => sum + (Number(quantities[size]) || 0),
    0
  );
  const totalCostPriceFromDetails = selectedSizes.reduce(
    (sum, size) =>
      sum + (sizeDetails.find((sd) => sd.size === size)?.totalCostPrice || 0),
    0
  );
  const costPerPiece =
    totalQuantity > 0 ? Math.round((totalCostPriceFromDetails / totalQuantity) * 100) / 100 : 0;

  function toggleSize(size: string) {
    setSelectedSizes((current) =>
      current.includes(size) ? current.filter((s) => s !== size) : [...current, size]
    );
  }

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchPetPackaging();
      setPetPackagings(data);
    } catch (err) {
      setLoadError(
        err instanceof ApiError
          ? err.message
          : "Failed to load pet packaging inventory."
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
    if (openId && petPackagings.length > 0 && !selected) {
      const match = petPackagings.find((p) => p._id === openId);
      if (match) setSelected(match);
    }
  }, [openId, petPackagings, selected]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    if (selectedSizes.length === 0) {
      setFormError("Please select at least one PET packaging size.");
      return;
    }

    const sizeDetailsSend = sizeDetails
      .filter((sd) => selectedSizes.includes(sd.size))
      .map((sd) => ({
        size: sd.size,
        quantity: sd.quantity,
        totalCostPrice: sd.totalCostPrice,
        stockAlertLevel: sd.stockAlertLevel,
        unitCostPrice:
          sd.quantity > 0
            ? Math.round((sd.totalCostPrice / sd.quantity) * 100) / 100
            : 0,
      }));

    setSubmitting(true);
    try {
      const created = await createPetPackaging({ sizeDetails: sizeDetailsSend });
      setPetPackagings((current) => [created, ...current]);
      toast.success(`Created ${created.customId} successfully.`);
      resetForm();
      setShowForm(false);
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Failed to create pet packaging."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setSelectedSizes([]);
    setSizeDetails(blankSizeDetails());
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setActionLoading(confirmDelete._id);
    setFormError(null);
    try {
      await deletePetPackaging(confirmDelete._id);
      setPetPackagings((current) =>
        current.filter((c) => c._id !== confirmDelete._id)
      );
      if (selected?._id === confirmDelete._id) setSelected(null);
      setConfirmDelete(null);
    } catch (err) {
      setActionLoading(null);
      setFormError(
        err instanceof ApiError ? err.message : "Failed to delete pet packaging."
      );
    } finally {
      setActionLoading(null);
      setConfirmDelete(null);
    }
  }

  function handleInventoryAdded(updated: PetPackaging) {
    setPetPackagings((current) =>
      current.map((c) => (c._id === updated._id ? updated : c))
    );
    setAddInventoryTarget(null);
    if (selected && selected._id === updated._id) setSelected(updated);
  }

  return (
    <AdminPage
      title="PET Packaging Inventory"
      description="Manage PET packaging stock with multiple sizes, cost, quantity and stock alert levels."
    >
      <div className="flex flex-col gap-3 border-b border-[#E2E8F0] dark:border-[#1E293B] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">
          {petPackagings.length}{" "}
          {petPackagings.length === 1 ? "item" : "items"} in stock
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
            {showForm ? "Close form" : "Add Packaging"}
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="border-b border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC]/70 dark:bg-[#1E293B] p-4 sm:p-6"
        >
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
            <Plus className="h-4 w-4 text-[#2FB9BF]" />
            New Packaging
          </h3>

          <div className="mt-5">
            <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
              Sizes & Costs
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {PET_PACKAGING_SIZES.map((size) => {
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
              <div className="mt-4 space-y-3">
                {selectedSizes.map((size) => {
                  const sd = sizeDetails.find((s) => s.size === size) ?? {
                    size,
                    quantity: 0,
                    totalCostPrice: 0,
                    unitCostPrice: 0,
                    stockAlertLevel: 0,
                  };
                  return (
                    <div
                      key={size}
                      className="rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-[#0F172A] dark:text-white">
                          {size}
                        </span>
                        <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                          {sd.quantity} pcs
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                            Qty
                          </label>
                          <NumberInput
                            value={sd.quantity}
                            onValueChange={(n) =>
                              setSizeDetails((current) =>
                                current.map((s) =>
                                  s.size === size ? { ...s, quantity: n } : s
                                )
                              )
                            }
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                            Cost (PKR)
                          </label>
                          <NumberInput
                            value={sd.totalCostPrice}
                            onValueChange={(n) =>
                              setSizeDetails((current) =>
                                current.map((s) =>
                                  s.size === size ? { ...s, totalCostPrice: n } : s
                                )
                              )
                            }
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                            Alert Level
                          </label>
                          <NumberInput
                            value={sd.stockAlertLevel}
                            onValueChange={(n) =>
                              setSizeDetails((current) =>
                                current.map((s) =>
                                  s.size === size ? { ...s, stockAlertLevel: n } : s
                                )
                              )
                            }
                            min={0}
                            className={inputClass}
                          />
                        </div>
                      </div>
                      {sd.quantity > 0 && (
                        <p className="mt-2 text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                          Cost per piece:
                          <span className="text-[#2FB9BF]">
                            {" "}Rs.{" "}
                            {Math.round(
                              (sd.totalCostPrice / Math.max(1, sd.quantity)) * 100
                            ) / 100}{" "}
                            {sd.stockAlertLevel > 0 &&
                              `· Alert at ${sd.stockAlertLevel}`
                            }
                          </span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {totalQuantity > 0 && (
              <p className="mt-4 rounded-xl border border-[#2FB9BF]/30 bg-[#2FB9BF]/5 dark:bg-[#163A3B] px-3 py-2 text-xs font-medium text-[#0E7A80] dark:text-[#5EEAD4]">
                Total quantity:{" "}
                <span className="font-bold text-[#0F172A] dark:text-white">
                  {totalQuantity}
                </span>
                {" · "}Total cost:{" "}
                <span className="font-bold text-[#0F172A] dark:text-white">
                  Rs. {totalCostPriceFromDetails.toLocaleString()}
                </span>
                {" · "}Cost per piece:{" "}
                <span className="font-bold text-[#2FB9BF]">
                  Rs. {costPerPiece.toLocaleString()}
                </span>
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
              Create Packaging
            </button>
          </div>
        </form>
      )}

      {loadError ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <p className="mt-4 text-sm font-semibold text-[#0F172A] dark:text-white">{loadError}</p>
        </div>
      ) : loading && petPackagings.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#2FB9BF]" />
          <p className="mt-4 text-sm font-medium text-[#64748B] dark:text-[#94A3B8]">
            Loading packaging…
          </p>
        </div>
      ) : petPackagings.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <PackageSearch className="h-12 w-12 text-[#CBD5E1]" />
          <h2 className="mt-4 text-lg font-semibold text-[#0F172A] dark:text-white">
            No packaging yet
          </h2>
          <p className="mt-1 max-w-md text-sm text-[#64748B] dark:text-[#94A3B8]">
            Add PET packaging stock by selecting sizes and entering cost,
            quantity and alert levels for each.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#2FB9BF] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#28a9af]"
          >
            <Plus className="h-4 w-4" />
            Add Packaging
          </button>
        </div>
      ) : (
        <PetPackagingTable
          petPackagings={petPackagings}
          onOpen={(petPackaging) => setSelected(petPackaging)}
          onDelete={(petPackaging) => setConfirmDelete(petPackaging)}
          onAddInventory={(petPackaging) => setAddInventoryTarget(petPackaging)}
          actionLoading={actionLoading}
        />
      )}

      {addInventoryTarget && (
        <AddInventoryModal
          packaging={addInventoryTarget}
          onClose={() => setAddInventoryTarget(null)}
          onAdded={handleInventoryAdded}
        />
      )}

      {confirmDelete && (
        <DeleteConfirm
          packaging={confirmDelete}
          loading={actionLoading === confirmDelete._id}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => void handleDelete()}
        />
      )}

      {selected && (
        <PetPackagingDrawer
          packaging={selected}
          onClose={() => setSelected(null)}
          onSaved={(updated) => {
            setPetPackagings((current) =>
              current.map((c) => (c._id === updated._id ? updated : c))
            );
            setSelected(null);
          }}
        />
      )}
    </AdminPage>
  );
}

function DeleteConfirm({
  packaging,
  loading,
  onCancel,
  onConfirm,
}: {
  packaging: PetPackaging;
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
              Delete {packaging.customId}?
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

function PetPackagingTable({
  petPackagings,
  onOpen,
  onDelete,
  onAddInventory,
  actionLoading,
}: {
  petPackagings: PetPackaging[];
  onOpen: (petPackaging: PetPackaging) => void;
  onDelete: (petPackaging: PetPackaging) => void;
  onAddInventory: (petPackaging: PetPackaging) => void;
  actionLoading: string | null;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[840px] border-collapse text-left">
        <thead>
          <tr className="border-b border-[#E2E8F0] dark:border-[#1E293B] text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
            <th className="px-6 py-3">ID</th>
            <th className="px-6 py-3">Sizes</th>
            <th className="px-6 py-3 text-right">Total Qty</th>
            <th className="px-6 py-3 text-right">Total Stock Cost</th>
            <th className="px-6 py-3 text-right">Cost / Piece</th>
            <th className="px-6 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F1F5F9] dark:divide-[#1E293B]">
          {petPackagings.map((packaging) => {
            const details = effectiveSizeDetails(packaging);
            const { totalQuantity, totalCost, costPerPiece } = totalsOf(details);
            return (
              <tr
                key={packaging._id}
                className="cursor-pointer align-middle transition-colors hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]"
                onClick={() => onOpen(packaging)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="rounded-lg bg-[#E6F7F8] dark:bg-[#163A3B] px-2.5 py-1 font-mono text-xs font-bold text-[#0E7A80] dark:text-[#5EEAD4] ring-1 ring-[#2FB9BF]/30">
                    {packaging.customId}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-[#0F172A] dark:text-white">
                  {details.length > 1 ? (
                    <span className="flex flex-wrap items-center gap-1">
                      {details.map((sd) => (
                        <span
                          key={sd.size}
                          className="rounded-md bg-[#F1F5F9] dark:bg-[#1E293B] px-1.5 py-0.5 text-xs font-semibold"
                        >
                          {sd.size}
                        </span>
                      ))}
                    </span>
                  ) : (
                    details[0]?.size ?? packaging.size ?? "—"
                  )}
                </td>
                <td className="px-6 py-4 text-right text-sm font-semibold text-[#0F172A] dark:text-white">
                  {totalQuantity.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right text-sm font-semibold text-[#2FB9BF]">
                  Rs. {totalCost.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium text-[#334155] dark:text-[#94A3B8]">
                  Rs. {costPerPiece.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onAddInventory(packaging)}
                      title="Add inventory"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#2FB9BF]/40 bg-[#2FB9BF]/5 dark:bg-[#163A3B] px-3 py-2 text-xs font-bold text-[#0E7A80] dark:text-[#5EEAD4] transition-colors hover:bg-[#2FB9BF] hover:text-white"
                    >
                      <PackagePlus className="h-4 w-4" />
                      Add Inventory
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpen(packaging)}
                      title="View audit trail"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] text-[#475569] dark:text-[#94A3B8] transition-colors hover:border-[#2FB9BF]/50 hover:text-[#2FB9BF]"
                    >
                      <History className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading === packaging._id}
                      onClick={() => onDelete(packaging)}
                      title="Delete"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] text-[#475569] dark:text-[#94A3B8] transition-colors hover:border-red-200 dark:border-[#334155] hover:bg-red-50 dark:bg-[#1E293B] hover:text-red-600 disabled:opacity-60"
                    >
                      {actionLoading === packaging._id ? (
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

function AddInventoryModal({
  packaging,
  onClose,
  onAdded,
}: {
  packaging: PetPackaging;
  onClose: () => void;
  onAdded: (packaging: PetPackaging) => void;
}) {
  const toast = useToast();
  const existing = effectiveSizeDetails(packaging).reduce<
    Record<string, number>
  >((acc, sd) => {
    acc[sd.size] = sd.quantity;
    return acc;
  }, {});

  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [additions, setAdditions] = useState<PetPackagingAddInventorySize[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAdditions(
      PET_PACKAGING_SIZES.map((size) => {
        const existingSd = effectiveSizeDetails(packaging).find(
          (sd) => sd.size === size
        );
        return {
          size,
          quantity: 0,
          totalCostPrice: 0,
          stockAlertLevel: existingSd?.stockAlertLevel ?? 0,
        };
      })
    );
  }, [packaging]);

  function toggleSize(size: string) {
    setSelectedSizes((current) =>
      current.includes(size) ? current.filter((s) => s !== size) : [...current, size]
    );
  }

  function setAdd(
    size: string,
    field: keyof PetPackagingAddInventorySize,
    value: number
  ) {
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
      const updated = await addPetPackagingInventory(packaging._id, { sizeDetails });
      toast.success(
        `Added ${totalQty.toLocaleString()} pcs to ${packaging.customId}.`
      );
      onAdded(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add inventory.");
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
              <h3 className="text-base font-bold text-[#0F172A] dark:text-white">Add Inventory</h3>
              <p className="font-mono text-xs font-bold text-[#0E7A80] dark:text-[#5EEAD4]">
                {packaging.customId}
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
            {PET_PACKAGING_SIZES.map((size) => {
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
                          ((Number(a.totalCostPrice) || 0) /
                            Math.max(1, Number(a.quantity) || 0)) *
                            100
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

function PetPackagingDrawer({
  packaging,
  onClose,
  onSaved,
}: {
  packaging: PetPackaging;
  onClose: () => void;
  onSaved: (updated: PetPackaging) => void;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [editSelectedSizes, setEditSelectedSizes] = useState<string[]>([]);
  const [editDetails, setEditDetails] = useState<PetPackagingSizeDetail[]>(blankSizeDetails);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const details = effectiveSizeDetails(packaging);
  const { totalQuantity, totalCost, costPerPiece } = totalsOf(details);

  function startEdit() {
    const current = effectiveSizeDetails(packaging);
    setEditSelectedSizes(current.map((sd) => sd.size));
    const next = blankSizeDetails().map((sd) => {
      const match = current.find((c) => c.size === sd.size);
      return match ?? sd;
    });
    setEditDetails(next);
    setEditError(null);
    setEditing(true);
  }

  function toggleEditSize(size: string) {
    setEditSelectedSizes((current) =>
      current.includes(size) ? current.filter((s) => s !== size) : [...current, size]
    );
  }

  const editQuantities = editDetails.reduce<Record<string, number>>((acc, sd) => {
    acc[sd.size] = sd.quantity;
    return acc;
  }, {});
  const editTotalQuantity = editSelectedSizes.reduce(
    (sum, size) => sum + (Number(editQuantities[size]) || 0),
    0
  );
  const editTotalCost = editSelectedSizes.reduce(
    (sum, size) =>
      sum + (editDetails.find((sd) => sd.size === size)?.totalCostPrice || 0),
    0
  );

  async function handleSave() {
    setEditError(null);
    if (editSelectedSizes.length === 0) {
      setEditError("Select at least one size.");
      return;
    }
    const sizeDetails = editDetails
      .filter((sd) => editSelectedSizes.includes(sd.size))
      .map((sd) => ({
        size: sd.size,
        quantity: sd.quantity,
        totalCostPrice: sd.totalCostPrice,
        stockAlertLevel: sd.stockAlertLevel,
        unitCostPrice:
          sd.quantity > 0
            ? Math.round((sd.totalCostPrice / sd.quantity) * 100) / 100
            : 0,
      }));
    setSaving(true);
    try {
      const updated = await updatePetPackaging(packaging._id, { sizeDetails });
      toast.success(`Updated ${updated.customId} successfully.`);
      setEditing(false);
      onSaved(updated);
    } catch (err) {
      setEditError(
        err instanceof ApiError ? err.message : "Failed to update pet packaging."
      );
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
            <div>
              <p className="font-mono text-xs font-bold text-[#0E7A80] dark:text-[#5EEAD4]">
                {packaging.customId}
              </p>
              <h3 className="text-lg font-bold text-[#0F172A] dark:text-white">
                {details.length > 1
                  ? `${details.length} sizes`
                  : details[0]?.size ?? packaging.size ?? "PET Packaging"}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => (editing ? setEditing(false) : startEdit())}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] px-3 py-2 text-xs font-semibold text-[#475569] dark:text-[#94A3B8] hover:border-[#2FB9BF]/50 hover:text-[#2FB9BF]"
            >
              {editing ? (
                <X className="h-3.5 w-3.5" />
              ) : (
                <Pencil className="h-3.5 w-3.5" />
              )}
              {editing ? "Cancel" : "Edit"}
            </button>
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

        {editing ? (
          <div className="flex-1 overflow-y-auto p-5">
            <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
              Sizes
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {PET_PACKAGING_SIZES.map((size) => {
                const checked = editSelectedSizes.includes(size);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleEditSize(size)}
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

            {editSelectedSizes.length > 0 && (
              <div className="mt-4 space-y-3">
                {editSelectedSizes.map((size) => {
                  const sd = editDetails.find((s) => s.size === size) ?? {
                    size,
                    quantity: 0,
                    totalCostPrice: 0,
                    unitCostPrice: 0,
                    stockAlertLevel: 0,
                  };
                  return (
                    <div
                      key={size}
                      className="rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] p-4"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-semibold text-[#0F172A] dark:text-white">
                          {size}
                        </span>
                        <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                          {editQuantities[size]} pcs
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                            Qty
                          </label>
                          <NumberInput
                            value={sd.quantity}
                            onValueChange={(n) =>
                              setEditDetails((current) =>
                                current.map((s) =>
                                  s.size === size ? { ...s, quantity: n } : s
                                )
                              )
                            }
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                            Cost (PKR)
                          </label>
                          <NumberInput
                            value={sd.totalCostPrice}
                            onValueChange={(n) =>
                              setEditDetails((current) =>
                                current.map((s) =>
                                  s.size === size ? { ...s, totalCostPrice: n } : s
                                )
                              )
                            }
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                            Alert Level
                          </label>
                          <NumberInput
                            value={sd.stockAlertLevel}
                            onValueChange={(n) =>
                              setEditDetails((current) =>
                                current.map((s) =>
                                  s.size === size ? { ...s, stockAlertLevel: n } : s
                                )
                              )
                            }
                            min={0}
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {editTotalQuantity > 0 && (
              <p className="mt-4 rounded-xl border border-[#2FB9BF]/30 bg-[#2FB9BF]/5 dark:bg-[#163A3B] px-3 py-2 text-xs font-medium text-[#0E7A80] dark:text-[#5EEAD4]">
                Total quantity:{" "}
                <span className="font-bold text-[#0F172A] dark:text-white">
                  {editTotalQuantity}
                </span>
                {" · "}Total cost:{" "}
                <span className="font-bold text-[#0F172A] dark:text-white">
                  Rs. {editTotalCost.toLocaleString()}
                </span>
              </p>
            )}

            {editError && (
              <div className="mt-4 rounded-xl border border-red-200 dark:border-[#334155] bg-red-50 dark:bg-[#1E293B] px-4 py-3 text-sm font-medium text-red-600">
                {editError}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
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
                <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
                  {details.length} size(s)
                </span>
                <span className="text-xs font-semibold text-[#2FB9BF]">
                  {totalQuantity.toLocaleString()} in stock
                </span>
              </div>
              <div className="mt-4 overflow-hidden rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A]">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#F8FAFC] dark:bg-[#1E293B] text-left text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                      <th className="px-3 py-2">Size</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Total Cost</th>
                      <th className="px-3 py-2 text-right">Cost per piece</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] dark:divide-[#1E293B]">
                    {details.map((sd) => (
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
                        {totalQuantity.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right text-[#2FB9BF]">
                        Rs. {totalCost.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right text-[#64748B] dark:text-[#94A3B8]">
                        Rs. {costPerPiece.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="mt-3 border-t border-[#E2E8F0] dark:border-[#1E293B] pt-3 text-xs text-[#64748B] dark:text-[#94A3B8]">
                Created by{" "}
                <span className="font-semibold text-[#0F172A] dark:text-white">
                  {packaging.createdBy?.name ?? "—"}
                </span>{" "}
                · {formatTime(packaging.createdAt)}
              </div>
            </div>

            <h3 className="mt-6 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
              <History className="h-4 w-4 text-[#2FB9BF]" />
              Audit Trail
            </h3>

            <ol className="relative mt-4 space-y-5 border-l-2 border-[#E6F7F8] dark:border-[#163A3B] pl-5">
              {packaging.updatedByHistory
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
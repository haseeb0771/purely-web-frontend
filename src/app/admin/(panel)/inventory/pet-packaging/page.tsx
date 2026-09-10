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
  createPetPackaging,
  deletePetPackaging,
  fetchPetPackaging,
  updatePetPackaging,
  type PetPackaging,
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

export default function InventoryPetPackagingPage() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [petPackagings, setPetPackagings] = useState<PetPackaging[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PetPackaging | null>(null);

  // create form state
  const [showForm, setShowForm] = useState(false);
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [totalCostPrice, setTotalCostPrice] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PetPackaging | null>(null);
  const [addInventoryTarget, setAddInventoryTarget] =
    useState<PetPackaging | null>(null);
  const [stockAlertLevel, setStockAlertLevel] = useState(0);
  const toast = useToast();

  const costPerUnit =
    quantity > 0 ? Math.round((totalCostPrice / quantity) * 100) / 100 : 0;

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

    const trimmedSize = size.trim();

    if (!trimmedSize) {
      setFormError("Size is required.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createPetPackaging({
        size: trimmedSize,
        quantity,
        totalCostPrice,
        stockAlertLevel,
      });
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
    setSize("");
    setQuantity(0);
    setTotalCostPrice(0);
    setStockAlertLevel(0);
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
      description="Manage shrink wrap, pallets and PET packaging stock."
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

          <div className="mt-4 grid gap-5 md:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
                Size
              </label>
              <input
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="e.g. 300ml, 500ml, 1500ml, 19L"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
                Quantity
              </label>
              <NumberInput
                value={quantity}
                onValueChange={setQuantity}
                className={inputClass}
              />
              {quantity > 0 && (
                <p className="mt-1.5 text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                  Cost per unit: <span className="text-[#2FB9BF]">Rs. {costPerUnit.toLocaleString()}</span>
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
                Total Cost (PKR)
              </label>
              <NumberInput
                value={totalCostPrice}
                onValueChange={setTotalCostPrice}
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
              Stock Alert Level <span className="text-xs font-normal text-[#94A3B8]">(minimum quantity; 0 = disabled)</span>
            </label>
            <NumberInput
              value={stockAlertLevel}
              onValueChange={setStockAlertLevel}
              min={0}
              placeholder="e.g. 50"
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
            Add PET packaging items such as shrink wrap or pallets to track
            stock.
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
      <table className="w-full min-w-[760px] border-collapse text-left">
        <thead>
          <tr className="border-b border-[#E2E8F0] dark:border-[#1E293B] text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
            <th className="px-6 py-3">ID</th>
            <th className="px-6 py-3">Size</th>
            <th className="px-6 py-3 text-right">Stock</th>
            <th className="px-6 py-3 text-right">Total Stock Cost</th>
            <th className="px-6 py-3 text-right">Cost / Piece</th>
            <th className="px-6 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F1F5F9] dark:divide-[#1E293B]">
          {petPackagings.map((packaging) => {
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
                  {packaging.size}
                </td>
                <td className="px-6 py-4 text-right text-sm font-semibold text-[#0F172A] dark:text-white">
                  {Number(packaging.quantity).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right text-sm font-semibold text-[#2FB9BF]">
                  Rs. {(Number(packaging.totalCostPrice) || 0).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium text-[#334155] dark:text-[#94A3B8]">
                  Rs.{" "}
                  {(
                    (Number(packaging.quantity) || 0) > 0
                      ? (Number(packaging.totalCostPrice) || 0) /
                        Number(packaging.quantity)
                      : 0
                  ).toLocaleString()}
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

function PetPackagingDrawer({
  packaging,
  onClose,
  onSaved,
}: {
  packaging: PetPackaging;
  onClose: () => void;
  onSaved: (updated: PetPackaging) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editSize, setEditSize] = useState(packaging.size);
  const [editQuantity, setEditQuantity] = useState(packaging.quantity);
  const [editCost, setEditCost] = useState(packaging.totalCostPrice);
  const [editStockAlertLevel, setEditStockAlertLevel] = useState(packaging.stockAlertLevel);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const editCostPerUnit =
    editQuantity > 0 ? Math.round((editCost / editQuantity) * 100) / 100 : 0;

  async function handleSave() {
    setEditError(null);
    if (!editSize.trim()) {
      setEditError("Size is required.");
      return;
    }
    setSaving(true);
    try {
      const updated = await updatePetPackaging(packaging._id, {
        size: editSize.trim(),
        quantity: editQuantity,
        totalCostPrice: editCost,
        stockAlertLevel: editStockAlertLevel,
      });
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
                {packaging.size}
              </h3>
            </div>
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
              Size
            </label>
            <input
              type="text"
              value={editSize}
              onChange={(e) => setEditSize(e.target.value)}
              className={inputClass}
            />
            <label className="mt-4 mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
              Quantity
            </label>
            <NumberInput
              value={editQuantity}
              onValueChange={setEditQuantity}
              className={inputClass}
            />
            <label className="mt-4 mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
              Total Cost (PKR)
            </label>
            <NumberInput
              value={editCost}
              onValueChange={setEditCost}
              className={inputClass}
            />
            {editQuantity > 0 && (
              <p className="mt-1.5 text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                Cost per unit:{" "}
                <span className="text-[#2FB9BF]">
                  Rs. {editCostPerUnit.toLocaleString()}
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
                  setEditSize(packaging.size);
                  setEditQuantity(packaging.quantity);
                  setEditCost(packaging.totalCostPrice);
                  setEditStockAlertLevel(packaging.stockAlertLevel);
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
                <span className="font-medium text-[#0F172A] dark:text-white">
                  {packaging.size}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2FB9BF]">
                  {packaging.quantity} in stock
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 border-t border-[#E2E8F0] dark:border-[#1E293B] pt-3 text-center">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                    Stock
                  </p>
                  <p className="mt-1 text-lg font-bold text-[#0F172A] dark:text-white">
                    {Number(packaging.quantity).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                    Total Cost
                  </p>
                  <p className="mt-1 text-lg font-bold text-[#2FB9BF]">
                    Rs. {(Number(packaging.totalCostPrice) || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                    Cost / Piece
                  </p>
                  <p className="mt-1 text-lg font-bold text-[#2FB9BF]">
                    Rs.{" "}
                    {(
                      (Number(packaging.quantity) || 0) > 0
                        ? (Number(packaging.totalCostPrice) || 0) /
                          Number(packaging.quantity)
                        : 0
                    ).toLocaleString()}
                  </p>
                </div>
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
  const [addQuantity, setAddQuantity] = useState(0);
  const [addCost, setAddCost] = useState(0);
  const [stockAlertLevel, setStockAlertLevel] = useState(packaging.stockAlertLevel);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if ((Number(addQuantity) || 0) <= 0) {
      setError("Please enter a positive quantity to add.");
      return;
    }
    setSubmitting(true);
    try {
      const newQuantity = (Number(packaging.quantity) || 0) + (Number(addQuantity) || 0);
      const newTotalCost = (Number(packaging.totalCostPrice) || 0) + (Number(addCost) || 0);
      const updated = await updatePetPackaging(packaging._id, {
        quantity: newQuantity,
        totalCostPrice: newTotalCost,
        stockAlertLevel,
      });
      toast.success(
        `Added ${addQuantity.toLocaleString()} pcs of ${packaging.customId} (${packaging.size}).`
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
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] shadow-2xl dark:shadow-none"
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
                {packaging.customId} · {packaging.size}
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
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#1E293B] p-4 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                Current Stock
              </p>
              <p className="mt-1 text-xl font-bold text-[#0F172A] dark:text-white">
                {Number(packaging.quantity).toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#1E293B] p-4 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                Current Total Cost
              </p>
              <p className="mt-1 text-xl font-bold text-[#2FB9BF]">
                Rs. {(Number(packaging.totalCostPrice) || 0).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
                Quantity to add
              </label>
              <NumberInput
                value={addQuantity}
                onValueChange={setAddQuantity}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
                Total cost to add (PKR)
              </label>
              <NumberInput
                value={addCost}
                onValueChange={setAddCost}
                className={inputClass}
              />
              <p className="mt-1.5 text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                New stock:{" "}
                <span className="font-semibold text-[#0F172A] dark:text-white">
                  {((Number(packaging.quantity) || 0) + (Number(addQuantity) || 0)).toLocaleString()}
                </span>{" "}
                pcs · New total cost:{" "}
                <span className="font-semibold text-[#2FB9BF]">
                  Rs. {((Number(packaging.totalCostPrice) || 0) + (Number(addCost) || 0)).toLocaleString()}
                </span>
              </p>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
              Stock Alert Level <span className="text-xs font-normal text-[#94A3B8]">(min; 0 = off)</span>
            </label>
            <NumberInput
              value={stockAlertLevel}
              onValueChange={setStockAlertLevel}
              min={0}
              className={inputClass}
            />
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 dark:border-[#334155] bg-red-50 dark:bg-[#1E293B] px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[#E2E8F0] dark:border-[#1E293B] p-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] px-4 py-2.5 text-sm font-semibold text-[#475569] dark:text-[#94A3B8] hover:border-[#2FB9BF]/50"
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
            Add Stock
          </button>
        </div>
      </form>
    </div>
  );
}

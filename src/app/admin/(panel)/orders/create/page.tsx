"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Loader2,
  Package,
  X,
} from "lucide-react";
import AdminPage from "@/components/admin/AdminPage";
import NumberInput from "@/components/admin/NumberInput";
import SelectDropdown from "@/components/admin/SelectDropdown";
import { useToast } from "@/components/admin/toast";
import {
  ApiError,
  BOTTLE_SIZES,
  uploadBottleImage,
  fetchBottlesBySizes,
  fetchAvailableCaps,
  fetchPaginatedLabels,
  fetchAvailablePetPackaging,
  createLabel,
  createOrder,
  type Bottle,
  type BottleSize,
  type Cap,
  type Label,
  type PetPackaging,
  type SizeQuantity,
} from "@/lib/admin-api";

const inputClass =
  "w-full rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0F172A] px-3.5 py-2.5 text-sm text-[#0F172A] dark:text-white placeholder-[#94A3B8] outline-none transition-colors focus:border-[#2FB9BF] focus:bg-white dark:focus:bg-[#1a2332] focus:ring-2 focus:ring-[#2FB9BF]/20";

const PET_PACK_CONFIG: Record<string, number> = {
  "300ml": 12,
  "500ml": 12,
  "1500ml": 6,
  "19L": 1,
};

function toDateInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
}

function DeliveryDatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value, open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const applyPreset = (daysOffset: number) => {
    const now = new Date();
    const target = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + daysOffset
    );
    onChange(toDateInputValue(target));
    setOpen(false);
  };

  const display = value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Delivery date";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex h-10 w-full items-center gap-2 rounded-xl border bg-white px-3 text-sm font-medium transition-colors hover:border-[#2FB9BF]/50 dark:bg-[#0F172A] ${
          value
            ? "border-[#2FB9BF]/60 text-[#0F172A] dark:text-white"
            : "border-[#E2E8F0] text-[#94A3B8] dark:border-[#334155]"
        }`}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-[#2FB9BF]" />
        <span className="flex-1 truncate text-left">{display}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#94A3B8] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          title="Clear delivery date"
          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#E2E8F0] text-[#475569] hover:bg-red-100 hover:text-red-600 dark:bg-[#1E293B] dark:text-[#94A3B8] dark:hover:bg-red-500/10 dark:hover:text-red-400"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {open && (
        <div className="absolute left-0 top-full z-40 mt-2 w-80 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-[0_16px_48px_rgba(15,23,42,0.14)] dark:border-[#1E293B] dark:bg-[#0F172A] dark:shadow-none">
          <p className="mb-3 text-sm font-bold text-[#0F172A] dark:text-white">
            Delivery date
          </p>

          <div className="mb-4 grid grid-cols-4 gap-1.5">
            {[
              { label: "Today", days: 0 },
              { label: "+3 days", days: 3 },
              { label: "+7 days", days: 7 },
              { label: "+30 days", days: 30 },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset.days)}
                className="rounded-lg border border-[#E2E8F0] px-2 py-1.5 text-xs font-semibold text-[#475569] transition-colors hover:border-[#2FB9BF] hover:text-[#2FB9BF] dark:border-[#334155] dark:text-[#94A3B8]"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
              <Clock className="h-3.5 w-3.5" /> Pick date
            </span>
            <input
              type="date"
              value={draft}
              min={toDateInputValue(new Date())}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none transition-colors focus:border-[#2FB9BF] focus:ring-2 focus:ring-[#2FB9BF]/20 dark:border-[#334155] dark:bg-[#0F172A] dark:text-white"
            />
          </label>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onChange(draft);
                setOpen(false);
              }}
              className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-[#2FB9BF] px-3 text-sm font-semibold text-white transition-colors hover:bg-[#0BAEC4]"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-[#E2E8F0] px-3 text-sm font-semibold text-[#475569] transition-colors hover:border-[#2FB9BF]/50 dark:border-[#334155] dark:text-[#94A3B8]"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionCard({
  number,
  title,
  description,
  children,
}: {
  number: number;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] dark:border-[#1E293B] dark:bg-[#0F172A] dark:shadow-none">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2FB9BF] text-sm font-bold text-white">
          {number}
        </span>
        <div>
          <h3 className="text-base font-semibold text-[#0F172A] dark:text-white">
            {title}
          </h3>
          {description && (
            <p className="mt-0.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function CreateOrderPage() {
  const router = useRouter();
  const toast = useToast();

  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerWhatsapp, setOwnerWhatsapp] = useState("");
  const [isWhatsappSame, setIsWhatsappSame] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState("");

  const [selectedSizes, setSelectedSizes] = useState<BottleSize[]>([]);
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [bottleId, setBottleId] = useState("");
  const [loadingBottles, setLoadingBottles] = useState(false);
  const [sizeQuantities, setSizeQuantities] = useState<
    Record<string, number>
  >({});
  const [qtyMode, setQtyMode] = useState<"bottle" | "pet">("bottle");
  const [petPacksBySize, setPetPacksBySize] = useState<Record<string, number>>(
    {},
  );

  const [caps, setCaps] = useState<Cap[]>([]);
  const [capId, setCapId] = useState("");
  const [loadingCaps, setLoadingCaps] = useState(true);

  const [labelId, setLabelId] = useState("");
  const [labels, setLabels] = useState<Label[]>([]);
  const [labelPage, setLabelPage] = useState(1);
  const [labelHasMore, setLabelHasMore] = useState(false);
  const [loadingLabels, setLoadingLabels] = useState(false);
  const [showAddLabelModal, setShowAddLabelModal] = useState(false);
  const bottleDropdownRef = useRef<HTMLDivElement>(null);
  const [bottleDropdownOpen, setBottleDropdownOpen] = useState(false);

  const [petItems, setPetItems] = useState<PetPackaging[]>([]);
  const [selectedPets, setSelectedPets] = useState<
    { id: string; quantity: number }[]
  >([]);
  const [loadingPets, setLoadingPets] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [sellingPrice, setSellingPrice] = useState<number>(0);

  const effectiveQuantities: Record<string, number> =
    qtyMode === "pet"
      ? Object.fromEntries(
          selectedSizes.map((s) => [
            s,
            (petPacksBySize[s] ?? 1) * (PET_PACK_CONFIG[s] ?? 0),
          ]),
        )
      : sizeQuantities;

  const totalBottleQty = selectedSizes.reduce(
    (sum, size) => sum + (effectiveQuantities[size] ?? 0),
    0,
  );

  const petTotalsBySize: Record<string, number> =
    qtyMode === "pet"
      ? Object.fromEntries(
          selectedSizes
            .map((s) => [
              s,
              (petPacksBySize[s] ?? 1) * (PET_PACK_CONFIG[s] ?? 0),
            ])
            .filter(([, q]) => (q as number) > 0),
        )
      : Object.fromEntries(
          petItems
            .map((item) => [
              item.size,
              selectedPets
                .filter((p) => p.id === item._id)
                .reduce((sum, p) => sum + p.quantity, 0),
            ])
            .filter(([, q]) => (q as number) > 0),
        );

  const selectedBottle = bottles.find((b) => b._id === bottleId) ?? null;
  const selectedCap = caps.find((c) => c._id === capId) ?? null;
  const selectedLabel = labels.find((l) => l._id === labelId) ?? null;

  const costBreakdown = useMemo(() => {
    let bottlesCost = 0;
    let capsCost = 0;
    let labelsCost = 0;
    let petCost = 0;
    const petItemsCost: {
      size: string;
      unitCost: number;
      quantity: number;
      lineCost: number;
    }[] = [];

    if (selectedBottle) {
      for (const size of selectedSizes) {
        const qty = effectiveQuantities[size] ?? 0;
        const detail = selectedBottle.sizeDetails.find((d) => d.size === size);
        if (detail) bottlesCost += (detail.unitCostPrice ?? 0) * qty;
      }
    }
    if (selectedCap && selectedCap.totalQuantity > 0) {
      const capUnitCost = selectedCap.totalCostPrice / selectedCap.totalQuantity;
      capsCost = capUnitCost * totalBottleQty;
    }
    if (selectedLabel) {
      for (const size of selectedSizes) {
        const qty = effectiveQuantities[size] ?? 0;
        const detail = selectedLabel.sizeDetails.find((d) => d.size === size);
        if (detail) labelsCost += (detail.unitCostPrice ?? 0) * qty;
      }
    }
    for (const pet of selectedPets) {
      const item = petItems.find((p) => p._id === pet.id);
      if (item && item.quantity > 0) {
        const unitCost = item.totalCostPrice / item.quantity;
        const lineCost = unitCost * pet.quantity;
        petCost += lineCost;
        petItemsCost.push({
          size: item.size,
          unitCost: Math.round(unitCost * 100) / 100,
          quantity: pet.quantity,
          lineCost: Math.round(lineCost * 100) / 100,
        });
      }
    }

    const total = bottlesCost + capsCost + labelsCost + petCost;
    const totalPETUnits = selectedPets.reduce(
      (sum, p) => sum + p.quantity,
      0,
    );
    const rounded = (n: number) => Math.round(n * 100) / 100;

    return {
      bottlesCost: rounded(bottlesCost),
      capsCost: rounded(capsCost),
      labelsCost: rounded(labelsCost),
      petCost: rounded(petCost),
      total: rounded(total),
      totalBottleQty,
      totalPETUnits,
      bottleAvgUnitCost:
        totalBottleQty > 0 ? rounded(bottlesCost / totalBottleQty) : 0,
      capUnitCost:
        totalBottleQty > 0 ? rounded(capsCost / totalBottleQty) : 0,
      labelAvgUnitCost:
        totalBottleQty > 0 ? rounded(labelsCost / totalBottleQty) : 0,
      componentCostPerBottle:
        totalBottleQty > 0
          ? rounded((bottlesCost + capsCost + labelsCost) / totalBottleQty)
          : 0,
      petItemsCost,
    };
  }, [selectedBottle, selectedCap, selectedLabel, selectedSizes, effectiveQuantities, selectedPets, petItems, totalBottleQty]);

  const toggleSize = useCallback((size: BottleSize) => {
    setSelectedSizes((prev) => {
      const next = prev.includes(size)
        ? prev.filter((s) => s !== size)
        : [...prev, size];
      return next;
    });
    setBottleId("");
    setSizeQuantities({});
  }, []);

  useEffect(() => {
    if (selectedSizes.length === 0) {
      setBottles([]);
      return;
    }
    let cancelled = false;
    setLoadingBottles(true);
    void fetchBottlesBySizes(selectedSizes)
      .then((data) => {
        if (cancelled) return;
        setBottles(data ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setBottles([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingBottles(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSizes]);

  useEffect(() => {
    let cancelled = false;
    setLoadingCaps(true);
    void fetchAvailableCaps()
      .then((data) => {
        if (cancelled) return;
        setCaps(data ?? []);
      })
      .catch(() => {
        if (cancelled) return;
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingCaps(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingPets(true);
    void fetchAvailablePetPackaging()
      .then((data) => {
        if (cancelled) return;
        setPetItems(data ?? []);
      })
      .catch(() => {
        if (cancelled) return;
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingPets(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadLabelsPage = useCallback(
    async (page: number, append: boolean) => {
      setLoadingLabels(true);
      try {
        const result = await fetchPaginatedLabels({ page, limit: 10 });
        setLabels((prev) =>
          append ? [...prev, ...result.data] : result.data,
        );
        setLabelHasMore(result.pagination.hasMore);
      } catch {
        if (!append) setLabels([]);
      } finally {
        setLoadingLabels(false);
      }
    },
    [],
  );

  useEffect(() => {
    setLabels([]);
    setLabelPage(1);
    void loadLabelsPage(1, false);
  }, [loadLabelsPage]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        bottleDropdownRef.current &&
        !bottleDropdownRef.current.contains(e.target as Node)
      ) {
        setBottleDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function loadMoreLabels() {
    if (!labelHasMore || loadingLabels) return;
    const nextPage = labelPage + 1;
    setLabelPage(nextPage);
    void loadLabelsPage(nextPage, true);
  }

  function handleLabelCreated(created: Label) {
    setLabels((prev) => [created, ...prev]);
    setLabelId(created._id);
    setShowAddLabelModal(false);
    toast.success(`Label "${created.name}" added to inventory.`);
  }

  function togglePetItem(itemId: string) {
    setSelectedPets((prev) => {
      const exists = prev.find((p) => p.id === itemId);
      if (exists) return prev.filter((p) => p.id !== itemId);
      return [...prev, { id: itemId, quantity: 1 }];
    });
  }

  function updatePetQuantity(itemId: string, quantity: number) {
    setSelectedPets((prev) =>
      prev.map((p) => (p.id === itemId ? { ...p, quantity } : p)),
    );
  }

  function validate(): string | null {
    if (!businessName.trim()) return "Business name is required.";
    if (!ownerName.trim()) return "Owner name is required.";
    if (!ownerPhone.trim()) return "Phone number is required.";
    if (!isWhatsappSame && !ownerWhatsapp.trim())
      return "WhatsApp number is required.";
    if (selectedSizes.length === 0) return "Select at least one bottle size.";
    if (!bottleId) return "Select a bottle.";
    if (qtyMode === "pet") {
      for (const size of selectedSizes) {
        if ((petPacksBySize[size] ?? 1) < 1)
          return `Enter the number of PET packs for ${size}.`;
      }
    }
    for (const size of selectedSizes) {
      const qty = effectiveQuantities[size] ?? 0;
      if (qty < 1)
        return `Enter a quantity for ${size} bottles.`;
    }
    if (!capId) return "Select a cap.";
    if (!labelId) return "Select a label from inventory.";
    for (const pet of selectedPets) {
      if (pet.quantity < 1)
        return `Enter a quantity for the selected PET packaging.`;
    }
    return null;
  }

  async function handleSubmit() {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    setSubmitting(true);
    setGlobalError(null);

    const sizeQtyArray: SizeQuantity[] = selectedSizes.map((size) => ({
      size,
      quantity: effectiveQuantities[size] ?? 0,
    }));

    try {
      await createOrder({
        clientDetails: {
          businessName: businessName.trim(),
          ownerName: ownerName.trim(),
          ownerPhone: ownerPhone.trim(),
          ownerWhatsapp: isWhatsappSame
            ? ownerPhone.trim()
            : ownerWhatsapp.trim(),
          isWhatsappSameAsPhone: isWhatsappSame,
        },
        bottleSelection: {
          sizes: selectedSizes,
          bottleId,
          sizeQuantities: sizeQtyArray,
        },
        capSelection: {
          capId,
          quantity: totalBottleQty,
        },
        labelSelection: {
          type: "EXISTING_INVENTORY",
          labelId,
        },
        petPackagingSelection: selectedPets.map((pet) => ({
          petPackagingId: pet.id,
          size: petItems.find((p) => p._id === pet.id)?.size ?? "",
          quantity: pet.quantity,
        })),
        deliveryDate: deliveryDate || undefined,
        sellingPrice,
      });

      toast.success("Order created successfully! Stock has been deducted.");
      router.push("/admin/orders");
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to create order.";
      setGlobalError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminPage
      title="Create Order"
      description="Create a new order with full inventory validation and stock deduction."
    >
      <div className="space-y-5 p-4 sm:p-6">
        {globalError && (
          <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              {globalError}
            </p>
            <button
              type="button"
              onClick={() => setGlobalError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              &times;
            </button>
          </div>
        )}

        <SectionCard number={1} title="Client Information">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
                Business Name *
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Purely Waters"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
                Owner Name *
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. John Doe"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
                Phone Number *
              </label>
              <input
                type="tel"
                value={ownerPhone}
                onChange={(e) => {
                  setOwnerPhone(e.target.value);
                  if (isWhatsappSame) setOwnerWhatsapp(e.target.value);
                }}
                placeholder="+92 300 1234567"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
                WhatsApp Number *
              </label>
              <input
                type="tel"
                value={isWhatsappSame ? ownerPhone : ownerWhatsapp}
                onChange={(e) => {
                  setOwnerWhatsapp(e.target.value);
                  if (isWhatsappSame) setOwnerPhone(e.target.value);
                }}
                disabled={isWhatsappSame}
                placeholder="+92 300 1234567"
                className={`${inputClass} ${isWhatsappSame ? "opacity-60" : ""}`}
              />
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
                <input
                  type="checkbox"
                  checked={isWhatsappSame}
                  onChange={(e) => {
                    setIsWhatsappSame(e.target.checked);
                    if (e.target.checked) setOwnerWhatsapp(ownerPhone);
                  }}
                  className="h-4 w-4 rounded border-[#CBD5E1] text-[#2FB9BF] focus:ring-[#2FB9BF]"
                />
                Same as Phone Number
              </label>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
                Delivery / Dispatch Date
              </label>
              <DeliveryDatePicker value={deliveryDate} onChange={setDeliveryDate} />
              <span className="mt-2 block text-xs text-[#94A3B8]">
                When to deliver this order — helps track how much time is left.
              </span>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          number={2}
          title="Bottle Selection"
          description="Select sizes, then choose a bottle from available stock."
        >
          <div>
            <label className="mb-2 block text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
              Select Bottle Sizes *
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {BOTTLE_SIZES.map((size) => {
                const active = selectedSizes.includes(size);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleSize(size)}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                      active
                        ? "border-[#2FB9BF] bg-[#E6F7F8] text-[#0E7A80] ring-2 ring-[#2FB9BF]/30 dark:border-[#2FB9BF]/50 dark:bg-[#163A3B] dark:text-[#5EEAD4]"
                        : "border-[#E2E8F0] bg-white text-[#475569] hover:border-[#2FB9BF]/50 dark:border-[#1E293B] dark:bg-[#0F172A] dark:text-[#94A3B8] dark:hover:border-[#2FB9BF]/50"
                    }`}
                  >
                    {active && <Check className="h-4 w-4" />}
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedSizes.length > 0 && (
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
                Choose Bottle *
              </label>
              {loadingBottles ? (
                <div className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5 dark:border-[#334155] dark:bg-[#0F172A]">
                  <Loader2 className="h-4 w-4 animate-spin text-[#2FB9BF]" />
                  <span className="text-sm text-[#94A3B8]">
                    Finding bottles…
                  </span>
                </div>
              ) : bottles.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 dark:border-amber-500/30 dark:bg-amber-500/10">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    No bottles found with all selected sizes in stock.
                  </p>
                </div>
              ) : (
                <div className="relative" ref={bottleDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setBottleDropdownOpen((v) => !v)}
                    className="flex w-full items-center justify-between rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5 text-sm text-[#0F172A] outline-none transition-colors focus:border-[#2FB9BF] focus:bg-white focus:ring-2 focus:ring-[#2FB9BF]/20 dark:border-[#334155] dark:bg-[#0F172A] dark:text-white dark:focus:bg-[#0F172A]"
                  >
                    <span
                      className={
                        selectedBottle
                          ? "text-[#0F172A] dark:text-white"
                          : "text-[#94A3B8]"
                      }
                    >
                      {selectedBottle
                        ? `${selectedBottle.bottleName} (${selectedBottle.customId})`
                        : "Select a bottle…"}
                    </span>
                    <ChevronDown className="h-4 w-4 text-[#94A3B8]" />
                  </button>
                  {bottleDropdownOpen && (
                    <div className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-auto rounded-xl border border-[#E2E8F0] bg-white py-1 shadow-lg dark:border-[#1E293B] dark:bg-[#0F172A]">
                      {bottles.map((bottle) => {
                        const isSelected = bottle._id === bottleId;
                        return (
                          <button
                            key={bottle._id}
                            type="button"
                            onClick={() => {
                              setBottleId(bottle._id);
                              setSizeQuantities({});
                              setBottleDropdownOpen(false);
                            }}
                            className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm transition-colors ${
                              isSelected
                                ? "bg-[#F0FDFB] font-semibold text-[#0E7A80] dark:bg-[#163A3B] dark:text-[#5EEAD4]"
                                : "text-[#334155] hover:bg-[#F8FAFC] dark:text-[#CBD5E1] dark:hover:bg-[#1E293B]"
                            }`}
                          >
                            <span className="h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-[#F1F5F9] dark:bg-[#1E293B]">
                              {bottle.imageUrl && (
                                <img
                                  src={bottle.imageUrl}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">
                                {bottle.bottleName}
                              </span>
                              <span className="block text-xs text-[#94A3B8]">
                                {bottle.customId} &middot; {bottle.type}
                              </span>
                            </span>
                            {isSelected && (
                              <Check className="h-4 w-4 shrink-0 text-[#2FB9BF]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {selectedBottle && selectedSizes.length > 0 && (
            <div className="mt-4">
              <label className="mb-2 block text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
                Quantity Mode *
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setQtyMode("bottle")}
                  className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                    qtyMode === "bottle"
                      ? "border-[#2FB9BF] bg-[#E6F7F8] text-[#0E7A80] ring-2 ring-[#2FB9BF]/30 dark:border-[#2FB9BF]/50 dark:bg-[#163A3B] dark:text-[#5EEAD4]"
                      : "border-[#E2E8F0] bg-white text-[#475569] hover:border-[#2FB9BF]/50 dark:border-[#1E293B] dark:bg-[#0F172A] dark:text-[#94A3B8]"
                  }`}
                >
                  Bottle Wise
                </button>
                <button
                  type="button"
                  onClick={() => setQtyMode("pet")}
                  className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                    qtyMode === "pet"
                      ? "border-[#2FB9BF] bg-[#E6F7F8] text-[#0E7A80] ring-2 ring-[#2FB9BF]/30 dark:border-[#2FB9BF]/50 dark:bg-[#163A3B] dark:text-[#5EEAD4]"
                      : "border-[#E2E8F0] bg-white text-[#475569] hover:border-[#2FB9BF]/50 dark:border-[#1E293B] dark:bg-[#0F172A] dark:text-[#94A3B8]"
                  }`}
                >
                  PET Wise
                </button>
              </div>

              {qtyMode === "pet" ? (
                <div className="mt-4">
                  <label className="mb-1.5 block text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
                    PET Packs per Size *
                  </label>
                  <p className="mb-3 text-xs text-[#94A3B8]">
                    Each PET pack contains: 500ml &times; 12 bottles, 1500ml
                    &times; 6 bottles, 300ml &times; 12 bottles, 19L &times; 1.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {selectedSizes.map((size) => {
                      const detail = selectedBottle.sizeDetails.find(
                        (d) => d.size === size,
                      );
                      const available = detail?.quantity ?? 0;
                      const packs = petPacksBySize[size] ?? 1;
                      const computed = packs * (PET_PACK_CONFIG[size] ?? 0);
                      const overStock = computed > available;
                      return (
                        <div
                          key={size}
                          className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 ${
                            overStock
                              ? "border-red-300 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10"
                              : "border-[#E2E8F0] bg-[#F8FAFC] dark:border-[#334155] dark:bg-[#0F172A]"
                          }`}
                        >
                          <div className="min-w-0">
                            <span className="text-sm font-semibold text-[#0F172A] dark:text-white">
                              {size}
                            </span>
                            <span className="ml-2 text-xs text-[#94A3B8]">
                              {PET_PACK_CONFIG[size] ?? 0} bottles / pack
                            </span>
                            <span className="block truncate text-xs text-[#94A3B8]">
                              ({available} available)
                            </span>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <NumberInput
                              value={packs}
                              min={0}
                              onValueChange={(val) =>
                                setPetPacksBySize((prev) => ({
                                  ...prev,
                                  [size]: val,
                                }))
                              }
                              placeholder="1"
                              className="w-20 rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-right text-sm font-semibold text-[#0F172A] outline-none focus:border-[#2FB9BF] focus:ring-2 focus:ring-[#2FB9BF]/20 dark:border-[#334155] dark:bg-[#0F172A] dark:text-white"
                            />
                            <span className="text-xs font-bold text-[#2FB9BF]">
                              = {computed} bottles
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {totalBottleQty > 0 && (
                    <p className="mt-2 text-right text-sm font-semibold text-[#0F172A] dark:text-white">
                      Total Bottles:{" "}
                      <span className="text-[#2FB9BF]">
                        {totalBottleQty}
                      </span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-4">
                  <label className="mb-2 block text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
                    Quantity per Size *
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {selectedSizes.map((size) => {
                      const detail = selectedBottle.sizeDetails.find(
                        (d) => d.size === size,
                      );
                      const available = detail?.quantity ?? 0;
                      const currentQty = sizeQuantities[size] ?? 0;
                      const overStock = currentQty > available;
                      return (
                        <div
                          key={size}
                          className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 ${
                            overStock
                              ? "border-red-300 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10"
                              : "border-[#E2E8F0] bg-[#F8FAFC] dark:border-[#334155] dark:bg-[#0F172A]"
                          }`}
                        >
                          <div>
                            <span className="text-sm font-semibold text-[#0F172A] dark:text-white">
                              {size}
                            </span>
                            <span className="ml-2 text-xs text-[#94A3B8]">
                              ({available} available)
                            </span>
                          </div>
                          <NumberInput
                            value={currentQty}
                            min={0}
                            onValueChange={(val) =>
                              setSizeQuantities((prev) => ({
                                ...prev,
                                [size]: val,
                              }))
                            }
                            placeholder="0"
                            className="w-24 rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-right text-sm font-semibold text-[#0F172A] outline-none focus:border-[#2FB9BF] focus:ring-2 focus:ring-[#2FB9BF]/20 dark:border-[#334155] dark:bg-[#0F172A] dark:text-white"
                          />
                        </div>
                      );
                    })}
                  </div>
                  {totalBottleQty > 0 && (
                    <p className="mt-2 text-right text-sm font-semibold text-[#0F172A] dark:text-white">
                      Total Bottles:{" "}
                      <span className="text-[#2FB9BF]">
                        {totalBottleQty}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </SectionCard>

        <SectionCard
          number={3}
          title="Cap Selection"
          description="Select cap type. Quantity auto-matches total bottle count."
        >
          {loadingCaps ? (
            <div className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5 dark:border-[#334155] dark:bg-[#0F172A]">
              <Loader2 className="h-4 w-4 animate-spin text-[#2FB9BF]" />
              <span className="text-sm text-[#94A3B8]">Loading caps…</span>
            </div>
          ) : caps.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 dark:border-amber-500/30 dark:bg-amber-500/10">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                No caps available in stock.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <SelectCapDropdown
                caps={caps}
                value={capId}
                onSelect={setCapId}
              />
              {capId && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5 dark:border-[#334155] dark:bg-[#0F172A]">
                  <span className="text-sm font-semibold text-[#0F172A] dark:text-white">
                    Cap Quantity
                  </span>
                  <span className="rounded-lg bg-[#E6F7F8] px-3 py-1 text-sm font-bold text-[#0E7A80] dark:bg-[#163A3B] dark:text-[#5EEAD4]">
                    {totalBottleQty} pcs
                  </span>
                </div>
              )}
            </div>
          )}
        </SectionCard>

        <SectionCard
          number={4}
          title="Label Selection"
          description="Select a label from inventory. You can add a new label quickly from the dropdown if it is not listed yet."
        >
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
              Select Label *
            </label>
            <SelectDropdown
              value={labelId}
              placeholder="Select a label…"
              options={labels.map((label) => ({
                label: label.name,
                value: label._id,
              }))}
              onSelect={setLabelId}
              actionLabel="+ Add New Label"
              onAction={() => setShowAddLabelModal(true)}
              onReachEnd={loadMoreLabels}
              loadingMore={loadingLabels}
            />
          </div>
        </SectionCard>

        <SectionCard
          number={5}
          title="PET Packaging (Optional)"
          description="Select packaging trays/boxes and quantities needed."
        >
          {Object.entries(petTotalsBySize).length > 0 && (
            <div className="mb-3 rounded-xl border border-[#2FB9BF]/30 bg-[#E6F7F8] px-3.5 py-2.5 dark:border-[#2FB9BF]/50 dark:bg-[#163A3B]">
              <p className="text-xs font-semibold text-[#0E7A80] dark:text-[#5EEAD4]">
                Total PET (size-wise)
              </p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {Object.entries(petTotalsBySize).map(([size, qty]) => (
                  <span
                    key={size}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-[#0F172A] dark:bg-[#0F172A] dark:text-white"
                  >
                    {size}
                    <span className="text-[#2FB9BF]">{qty}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {loadingPets ? (
            <div className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5 dark:border-[#334155] dark:bg-[#0F172A]">
              <Loader2 className="h-4 w-4 animate-spin text-[#2FB9BF]" />
              <span className="text-sm text-[#94A3B8]">
                Loading PET packaging…
              </span>
            </div>
          ) : petItems.length === 0 ? (
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5 text-center dark:border-[#334155] dark:bg-[#0F172A]">
              <p className="text-sm text-[#94A3B8]">
                No PET packaging items available.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {petItems.map((item) => {
                const selected = selectedPets.find(
                  (p) => p.id === item._id,
                );
                return (
                  <div key={item._id}>
                    <button
                      type="button"
                      onClick={() => togglePetItem(item._id)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm transition-all ${
                        selected
                          ? "border-[#2FB9BF] bg-[#E6F7F8] ring-1 ring-[#2FB9BF]/30 dark:border-[#2FB9BF]/50 dark:bg-[#163A3B]"
                          : "border-[#E2E8F0] bg-white hover:border-[#2FB9BF]/50 dark:border-[#1E293B] dark:bg-[#0F172A]"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                          selected
                            ? "border-[#2FB9BF] bg-[#2FB9BF] text-white"
                            : "border-[#CBD5E1] dark:border-[#334155]"
                        }`}
                      >
                        {selected && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-[#0F172A] dark:text-white">
                          {item.size}
                        </span>
                        <span className="text-xs text-[#94A3B8]">
                          {item.customId} &middot; {item.quantity} in stock
                        </span>
                      </span>
                    </button>
                    {selected && (
                      <div className="ml-8 mt-2 flex items-center gap-3">
                        <span className="text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
                          Quantity:
                        </span>
                        <NumberInput
                          value={selected.quantity}
                          min={1}
                          onValueChange={(val) =>
                            updatePetQuantity(item._id, val)
                          }
                          placeholder="1"
                          className="w-24 rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-right text-sm font-semibold text-[#0F172A] outline-none focus:border-[#2FB9BF] focus:ring-2 focus:ring-[#2FB9BF]/20 dark:border-[#334155] dark:bg-[#0F172A] dark:text-white"
                        />
                        <span className="text-xs text-[#94A3B8]">
                          / {item.quantity} available
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] dark:border-[#1E293B] dark:bg-[#0F172A] dark:shadow-none">
          <h3 className="mb-4 text-base font-semibold text-[#0F172A] dark:text-white">
            Order Summary
          </h3>

          <div className="space-y-2 text-sm">
            {businessName && (
              <div className="flex justify-between">
                <span className="text-[#64748B] dark:text-[#94A3B8]">
                  Business
                </span>
                <span className="font-medium text-[#0F172A] dark:text-white">
                  {businessName}
                </span>
              </div>
            )}
            {ownerName && (
              <div className="flex justify-between">
                <span className="text-[#64748B] dark:text-[#94A3B8]">
                  Owner
                </span>
                <span className="font-medium text-[#0F172A] dark:text-white">
                  {ownerName}
                </span>
              </div>
            )}
            {selectedSizes.length > 0 && (
              <div className="flex justify-between">
                <span className="text-[#64748B] dark:text-[#94A3B8]">
                  Bottles
                </span>
                <span className="font-medium text-[#0F172A] dark:text-white">
                  {selectedBottle?.bottleName ?? "—"} &middot;{" "}
                  {selectedSizes
                    .map(
                      (s) =>
                        `${s}×${effectiveQuantities[s] ?? 0}`,
                    )
                    .join(", ")}
                </span>
              </div>
            )}
            {totalBottleQty > 0 && (
              <div className="flex justify-between">
                <span className="text-[#64748B] dark:text-[#94A3B8]">
                  Total Bottles
                </span>
                <span className="font-bold text-[#2FB9BF]">
                  {totalBottleQty.toLocaleString("en-US")}
                </span>
              </div>
            )}
            {capId && (
              <div className="flex justify-between">
                <span className="text-[#64748B] dark:text-[#94A3B8]">
                  Cap
                </span>
                <span className="font-medium text-[#0F172A] dark:text-white">
                  {caps.find((c) => c._id === capId)?.color ?? "—"} ×{" "}
                  {totalBottleQty.toLocaleString("en-US")}
                </span>
              </div>
            )}
            {labelId && (
              <div className="flex justify-between">
                <span className="text-[#64748B] dark:text-[#94A3B8]">
                  Label
                </span>
                <span className="font-medium text-[#0F172A] dark:text-white">
                  {labels.find((l) => l._id === labelId)?.name ?? "—"}
                </span>
              </div>
            )}
          </div>

          {costBreakdown.total > 0 && (
            <>
              <div className="mt-5 border-t border-[#E2E8F0] dark:border-[#1E293B] pt-4">
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                  Cost Per Piece
                </h4>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {costBreakdown.bottleAvgUnitCost > 0 && (
                    <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 dark:border-[#334155] dark:bg-[#0F172A]">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                        Per Bottle
                      </p>
                      <p className="mt-0.5 text-base font-extrabold text-[#0F172A] dark:text-white">
                        Rs. {costBreakdown.bottleAvgUnitCost.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {costBreakdown.capUnitCost > 0 && (
                    <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 dark:border-[#334155] dark:bg-[#0F172A]">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                        Per Cap
                      </p>
                      <p className="mt-0.5 text-base font-extrabold text-[#0F172A] dark:text-white">
                        Rs. {costBreakdown.capUnitCost.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {costBreakdown.labelAvgUnitCost > 0 && (
                    <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 dark:border-[#334155] dark:bg-[#0F172A]">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                        Per Label
                      </p>
                      <p className="mt-0.5 text-base font-extrabold text-[#0F172A] dark:text-white">
                        Rs. {costBreakdown.labelAvgUnitCost.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {costBreakdown.componentCostPerBottle > 0 && (
                    <div className="rounded-xl border border-[#2FB9BF]/30 bg-[#2FB9BF]/5 px-3 py-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#0E7A80] dark:text-[#5EEAD4]">
                        Complete Bottle
                      </p>
                      <p className="mt-0.5 text-base font-extrabold text-[#0E7A80] dark:text-[#5EEAD4]">
                        Rs. {costBreakdown.componentCostPerBottle.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                {costBreakdown.petItemsCost.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {costBreakdown.petItemsCost.map((pet) => (
                      <div
                        key={pet.size}
                        className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm dark:border-[#334155] dark:bg-[#0F172A]"
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                            Per {pet.size} PET
                          </span>
                          <span className="font-extrabold text-[#0F172A] dark:text-white">
                            Rs. {pet.unitCost.toLocaleString()}
                          </span>
                        </span>
                        <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
                          × {pet.quantity.toLocaleString("en-US")} = Rs. {pet.lineCost.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 border-t border-[#E2E8F0] dark:border-[#1E293B] pt-4">
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                  Order Totals
                </h4>
                <div className="space-y-1.5 text-sm">
                  {costBreakdown.bottlesCost > 0 && (
                    <div className="flex justify-between text-[#64748B] dark:text-[#94A3B8]">
                      <span>
                        Bottles · {costBreakdown.totalBottleQty.toLocaleString("en-US")} × Rs.{" "}
                        {costBreakdown.bottleAvgUnitCost.toLocaleString()}
                      </span>
                      <span className="font-medium text-[#0F172A] dark:text-white">
                        Rs. {costBreakdown.bottlesCost.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {costBreakdown.capsCost > 0 && (
                    <div className="flex justify-between text-[#64748B] dark:text-[#94A3B8]">
                      <span>
                        Caps · {costBreakdown.totalBottleQty.toLocaleString("en-US")} × Rs.{" "}
                        {costBreakdown.capUnitCost.toLocaleString()}
                      </span>
                      <span className="font-medium text-[#0F172A] dark:text-white">
                        Rs. {costBreakdown.capsCost.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {costBreakdown.labelsCost > 0 && (
                    <div className="flex justify-between text-[#64748B] dark:text-[#94A3B8]">
                      <span>
                        Labels · {costBreakdown.totalBottleQty.toLocaleString("en-US")} × Rs.{" "}
                        {costBreakdown.labelAvgUnitCost.toLocaleString()}
                      </span>
                      <span className="font-medium text-[#0F172A] dark:text-white">
                        Rs. {costBreakdown.labelsCost.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {costBreakdown.petCost > 0 && (
                    <div className="flex justify-between text-[#64748B] dark:text-[#94A3B8]">
                      <span>
                        PET Packaging · {costBreakdown.totalPETUnits.toLocaleString("en-US")} units
                      </span>
                      <span className="font-medium text-[#0F172A] dark:text-white">
                        Rs. {costBreakdown.petCost.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-[#E2E8F0] pt-1.5 dark:border-[#1E293B]">
                    <span className="font-semibold text-[#0F172A] dark:text-white">
                      Total Cost
                    </span>
                    <span className="font-bold text-[#0F172A] dark:text-white">
                      Rs. {costBreakdown.total.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="mt-4 border-t border-[#E2E8F0] dark:border-[#1E293B] pt-4">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
              Selling Price (PKR)
            </label>
            <NumberInput
              value={sellingPrice}
              onValueChange={setSellingPrice}
              min={0}
              placeholder="Enter your selling price"
              className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5 text-sm text-[#0F172A] outline-none transition-colors focus:border-[#2FB9BF] focus:bg-white focus:ring-2 focus:ring-[#2FB9BF]/20 dark:border-[#334155] dark:bg-[#0F172A] dark:text-white dark:focus:bg-[#1a2332]"
            />
          </div>

          {costBreakdown.total > 0 &&
            (sellingPrice > 0 || costBreakdown.total > 0) && (
              <div className="mt-4 border-t border-[#E2E8F0] dark:border-[#1E293B] pt-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {costBreakdown.totalBottleQty > 0 && (
                    <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 dark:border-[#334155] dark:bg-[#0F172A]">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                        Sale Price Per Bottle
                      </p>
                      <p className="mt-1 text-lg font-extrabold text-[#0F172A] dark:text-white">
                        Rs.{" "}
                        {costBreakdown.totalBottleQty > 0
                          ? Math.round(sellingPrice / costBreakdown.totalBottleQty).toLocaleString()
                          : 0}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#94A3B8]">
                        {sellingPrice > 0
                          ? `Profit Rs. ${Math.round(
                              (sellingPrice / costBreakdown.totalBottleQty) -
                                costBreakdown.componentCostPerBottle,
                            ).toLocaleString()}/bottle`
                          : `Cost Rs. ${costBreakdown.componentCostPerBottle.toLocaleString()}/bottle`}
                      </p>
                    </div>
                  )}
                  {costBreakdown.totalPETUnits > 0 &&
                    costBreakdown.petItemsCost.map((pet) => (
                      <div
                        key={`sale-${pet.size}`}
                        className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 dark:border-[#334155] dark:bg-[#0F172A]"
                      >
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                          Sale Price Per {pet.size} PET
                        </p>
                        <p className="mt-1 text-lg font-extrabold text-[#0F172A] dark:text-white">
                          Rs.{" "}
                          {pet.quantity > 0
                            ? Math.round(sellingPrice / pet.quantity).toLocaleString()
                            : 0}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#94A3B8]">
                          Cost Rs. {pet.unitCost.toLocaleString()}/unit
                        </p>
                      </div>
                    ))}
                </div>

                <div
                  className={`mt-3 rounded-xl border p-4 ${
                    sellingPrice >= costBreakdown.total
                      ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                      : "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-bold ${
                      sellingPrice >= costBreakdown.total
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-red-700 dark:text-red-400"
                    }`}>
                      {sellingPrice >= costBreakdown.total ? "Total Profit" : "Total Loss"}
                    </span>
                    <span className={`text-lg font-extrabold ${
                      sellingPrice >= costBreakdown.total
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-red-700 dark:text-red-400"
                    }`}>
                      Rs. {Math.abs(sellingPrice - costBreakdown.total).toLocaleString()}
                    </span>
                  </div>
                  <p className={`mt-1 text-xs ${
                    sellingPrice >= costBreakdown.total
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }`}>
                    Selling Rs. {sellingPrice.toLocaleString()} − Cost Rs. {costBreakdown.total.toLocaleString()}
                  </p>
                </div>
              </div>
            )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2FB9BF] px-6 py-3 text-sm font-bold text-white shadow-[0_4px_16px_rgba(47,185,191,0.3)] transition-all hover:bg-[#28a5ab] hover:shadow-[0_6px_24px_rgba(47,185,191,0.4)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating Order…
              </>
            ) : (
              <>
                <Package className="h-4 w-4" />
                Create Order &amp; Deduct Stock
              </>
)}
          </button>
        </div>
      </div>

      {showAddLabelModal && (
        <AddLabelModal
          onClose={() => setShowAddLabelModal(false)}
          onCreated={handleLabelCreated}
        />
      )}
    </AdminPage>
  );
}

function AddLabelModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (label: Label) => void;
}) {
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [details, setDetails] = useState<
    Record<string, { quantity: number; totalCostPrice: number }>
  >(
    Object.fromEntries(
      BOTTLE_SIZES.map((size) => [size, { quantity: 0, totalCostPrice: 0 }]),
    ),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const result = await uploadBottleImage(file, "labels");
      setImageUrl(result.url);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Image upload failed.",
      );
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Label name is required.");
      return;
    }
    const sizeDetails = BOTTLE_SIZES.filter((size) => {
      const d = details[size];
      return (d.quantity || 0) > 0 || (d.totalCostPrice || 0) > 0;
    }).map((size) => {
      const d = details[size];
      const quantity = Number(d.quantity) || 0;
      const totalCostPrice = Number(d.totalCostPrice) || 0;
      return {
        size,
        quantity,
        totalCostPrice,
        stockAlertLevel: 0,
        unitCostPrice:
          quantity > 0
            ? Math.round((totalCostPrice / quantity) * 100) / 100
            : 0,
      };
    });

    setSubmitting(true);
    setError(null);
    try {
      const created = await createLabel({
        name: trimmed,
        imageUrl,
        sizeDetails,
      });
      onCreated(created);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to add label.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="w-full max-w-md rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] p-6 shadow-xl dark:shadow-none"
      >
        <h3 className="text-base font-bold text-[#0F172A] dark:text-white">
          Add New Label
        </h3>
        <p className="mt-1 text-sm text-[#64748B] dark:text-[#94A3B8]">
          This label will be saved to inventory and available in the dropdown.
        </p>

        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
            Label Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Classic Mineral 500ml"
            className={inputClass}
            autoFocus
          />
        </div>

        <div className="mt-3">
          <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
            Image <span className="font-normal text-[#94A3B8]">(optional)</span>
          </label>
          {imageUrl ? (
            <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 dark:border-[#334155] dark:bg-[#0F172A]">
              <img
                src={imageUrl}
                alt="Label preview"
                className="h-14 w-14 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#0F172A] dark:text-white">
                  Image uploaded
                </p>
                <p className="text-xs text-[#94A3B8]">Ready to use</p>
              </div>
              <button
                type="button"
                onClick={() => setImageUrl("")}
                className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#CBD5E1] bg-white px-4 py-2.5 text-sm font-semibold text-[#475569] transition-colors hover:border-[#2FB9BF] hover:text-[#2FB9BF] dark:border-[#334155] dark:bg-[#0F172A] dark:text-[#94A3B8] dark:hover:border-[#2FB9BF]">
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-[#2FB9BF]" />
                  Uploading…
                </>
              ) : (
                "Upload image"
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => void handleUpload(e)}
                disabled={uploading}
              />
            </label>
          )}
        </div>

        <div className="mt-3">
          <p className="mb-1.5 text-sm font-medium text-[#0F172A] dark:text-white">
            Stock <span className="font-normal text-[#94A3B8]">(optional)</span>
          </p>
          <div className="space-y-2">
            {BOTTLE_SIZES.map((size) => (
              <div
                key={size}
                className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0F172A] p-2.5"
              >
                <span className="w-16 shrink-0 text-sm font-semibold text-[#0F172A] dark:text-white">
                  {size}
                </span>
                <NumberInput
                  value={details[size].quantity}
                  onValueChange={(n) =>
                    setDetails((current) => ({
                      ...current,
                      [size]: { ...current[size], quantity: n },
                    }))
                  }
                  placeholder="Qty"
                  className={`${inputClass} !py-1.5`}
                />
                <NumberInput
                  value={details[size].totalCostPrice}
                  onValueChange={(n) =>
                    setDetails((current) => ({
                      ...current,
                      [size]: { ...current[size], totalCostPrice: n },
                    }))
                  }
                  placeholder="Cost"
                  className={`${inputClass} !py-1.5`}
                />
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 dark:border-[#334155] bg-red-50 dark:bg-[#1E293B] px-4 py-3 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
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
            Add Label
          </button>
        </div>
      </form>
    </div>
  );
}

function SelectCapDropdown({
  caps,
  value,
  onSelect,
}: {
  caps: Cap[];
  value: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = caps.find((c) => c._id === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5 text-sm text-[#0F172A] outline-none transition-colors focus:border-[#2FB9BF] focus:bg-white focus:ring-2 focus:ring-[#2FB9BF]/20 dark:border-[#334155] dark:bg-[#0F172A] dark:text-white dark:focus:bg-[#0F172A]"
      >
        <span
          className={
            selected
              ? "text-[#0F172A] dark:text-white"
              : "text-[#94A3B8]"
          }
        >
          {selected
            ? `${selected.color} (${selected.customId}) — ${selected.totalQuantity} in stock`
            : "Select a cap…"}
        </span>
        <ChevronDown className="h-4 w-4 text-[#94A3B8]" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-auto rounded-xl border border-[#E2E8F0] bg-white py-1 shadow-lg dark:border-[#1E293B] dark:bg-[#0F172A]">
          {caps.map((cap) => {
            const isSelected = cap._id === value;
            return (
              <button
                key={cap._id}
                type="button"
                onClick={() => {
                  onSelect(cap._id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm transition-colors ${
                  isSelected
                    ? "bg-[#F0FDFB] font-semibold text-[#0E7A80] dark:bg-[#163A3B] dark:text-[#5EEAD4]"
                    : "text-[#334155] hover:bg-[#F8FAFC] dark:text-[#CBD5E1] dark:hover:bg-[#1E293B]"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{cap.color}</span>
                  <span className="block text-xs text-[#94A3B8]">
                    {cap.customId} &middot; {cap.totalQuantity} in stock
                  </span>
                </span>
                {isSelected && (
                  <Check className="h-4 w-4 shrink-0 text-[#2FB9BF]" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

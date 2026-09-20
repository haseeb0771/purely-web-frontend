"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Send, X } from "lucide-react";
import AdminPage from "@/components/admin/AdminPage";
import DatePicker from "@/components/admin/DatePicker";
import NumberInput from "@/components/admin/NumberInput";
import SelectDropdown, {
  type SelectOption,
} from "@/components/admin/SelectDropdown";
import { useToast } from "@/components/admin/toast";
import {
  createMarketingClient,
  createOrder,
  fetchAvailableCaps,
  fetchAvailablePetPackaging,
  fetchBottlesBySizesPaginated,
  fetchMarketingClients,
  fetchPaginatedLabels,
  type Bottle,
  type BottleSize,
  type Cap,
  type Label,
  type MarketingClient,
  type PetPackaging,
} from "@/lib/admin-api";

const BOTTLE_SIZES: BottleSize[] = ["300ml", "500ml", "1500ml", "19L"];

// One PET pack contains these many bottles per size.
const BOTTLES_PER_PET: Record<string, number> = {
  "300ml": 12,
  "500ml": 12,
  "1500ml": 6,
  "19L": 1,
};

const LITERS_PER_SIZE: Record<string, number> = {
  "300ml": 0.3,
  "500ml": 0.5,
  "1500ml": 1.5,
  "19L": 19,
};

const BOTTLE_PAGE_SIZE = 15;

const WATER_COST_PER_LITER_DEFAULT = 2.5;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// The intake-frozen per-piece cost is authoritative; only derive from
// total ÷ quantity when the stored value is missing so costs never inflate as
// stock is drawn down.
function resolveUnitCost(
  stored?: number,
  total?: number,
  quantity?: number
): number {
  const storedValue = Number(stored) || 0;
  if (storedValue > 0) return storedValue;
  const qty = Number(quantity) || 0;
  return qty > 0 ? (Number(total) || 0) / qty : 0;
}

function rs(n: number): string {
  return `Rs. ${(Number.isFinite(n) ? n : 0).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`;
}

function num(n: number): string {
  return (Number.isFinite(n) ? n : 0).toLocaleString();
}

const inputClass =
  "w-full rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0F172A] px-3.5 py-2.5 text-sm text-[#0F172A] dark:text-white placeholder-[#94A3B8] outline-none transition-colors focus:border-[#2FB9BF] focus:bg-white dark:focus:bg-[#1a2332] focus:ring-2 focus:ring-[#2FB9BF]/20";

const invalidClass =
  "!border-red-400 !ring-2 !ring-red-400/25 focus:!border-red-500 focus:!ring-red-500/25 dark:!border-red-500/60";

function Section({
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
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 dark:border-[#1E293B] dark:bg-[#0F172A]">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2FB9BF] text-sm font-bold text-white">
          {number}
        </span>
        <div>
          <h2 className="text-base font-bold text-[#0F172A] dark:text-white">
            {title}
          </h2>
          {description ? (
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-baseline gap-1.5">
        <span className="text-xs font-semibold text-[#475569] dark:text-[#CBD5E1]">
          {label}
        </span>
        {required ? <span className="text-xs text-red-500">*</span> : null}
        {hint ? (
          <span className="ml-auto text-[11px] text-[#94A3B8]">{hint}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

interface SizeBottleState {
  bottleId: string;
  petCount: number;
}

interface PetRowState {
  petPackagingId: string;
  quantity: number;
}

function daysFromToday(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
}

function isoToInputDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
}

export default function CreateOrderPage() {
  const router = useRouter();
  const toast = useToast();

  /* ---------- Client info ---------- */
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerWhatsapp, setOwnerWhatsapp] = useState("");
  const [whatsappSame, setWhatsappSame] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [nextOrderReminderAt, setNextOrderReminderAt] = useState("");

  /* ---------- Bottles (per size) ---------- */
  const [selectedSizes, setSelectedSizes] = useState<BottleSize[]>([]);
  const [bottlesBySize, setBottlesBySize] = useState<
    Record<BottleSize, Bottle[]>
  >({} as Record<BottleSize, Bottle[]>);
  const [loadingBottles, setLoadingBottles] = useState<Record<string, boolean>>(
    {}
  );
  const [loadingMoreBottles, setLoadingMoreBottles] = useState<
    Record<string, boolean>
  >({});
  const [bottlePageBySize, setBottlePageBySize] = useState<
    Record<string, number>
  >({});
  const [bottleHasMoreBySize, setBottleHasMoreBySize] = useState<
    Record<string, boolean>
  >({});
  const [sizeBottles, setSizeBottles] = useState<
    Record<BottleSize, SizeBottleState>
  >({} as Record<BottleSize, SizeBottleState>);

  /* ---------- Caps ---------- */
  const [caps, setCaps] = useState<Cap[]>([]);
  const [loadingCaps, setLoadingCaps] = useState(true);
  const [capId, setCapId] = useState("");
  const [capQty, setCapQty] = useState(0);
  const [capQtyTouched, setCapQtyTouched] = useState(false);

  /* ---------- Labels ---------- */
  const [labels, setLabels] = useState<Label[]>([]);
  const [labelPage, setLabelPage] = useState(1);
  const [labelHasMore, setLabelHasMore] = useState(false);
  const [loadingLabels, setLoadingLabels] = useState(false);
  const [labelId, setLabelId] = useState("");
  const [labelQuantities, setLabelQuantities] = useState<
    Record<BottleSize, number>
  >({} as Record<BottleSize, number>);
  const [labelQtyTouched, setLabelQtyTouched] = useState(false);

  /* ---------- PET packaging ---------- */
  const [petItems, setPetItems] = useState<PetPackaging[]>([]);
  const [loadingPets, setLoadingPets] = useState(true);
  const [petBySize, setPetBySize] = useState<Record<BottleSize, PetRowState>>(
    {} as Record<BottleSize, PetRowState>
  );
  const [petQtyTouched, setPetQtyTouched] = useState<Record<string, boolean>>(
    {}
  );

  /* ---------- Billing ---------- */
  const [waterRate, setWaterRate] = useState(WATER_COST_PER_LITER_DEFAULT);
  const [sellPerPET, setSellPerPET] = useState<Record<BottleSize, number>>({} as Record<BottleSize, number>);

  /* ---------- Advance payment ---------- */
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [advanceMethod, setAdvanceMethod] = useState("");
  const [advanceNote, setAdvanceNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ---------- Marketing client (auto-population) ---------- */
  const [clientId, setClientId] = useState("");
  const [clients, setClients] = useState<MarketingClient[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddBusiness, setQuickAddBusiness] = useState("");
  const [quickAddOwner, setQuickAddOwner] = useState("");
  const [quickAddPhone, setQuickAddPhone] = useState("");
  const [quickAddWhatsapp, setQuickAddWhatsapp] = useState("");
  const [quickAddSame, setQuickAddSame] = useState(false);
  const [quickAddSaving, setQuickAddSaving] = useState(false);
  const [quickAddError, setQuickAddError] = useState<string | null>(null);

  /** Fields that are locked because the selected client already provides them. */
  const [clientLocks, setClientLocks] = useState({
    businessName: false,
    ownerName: false,
    ownerPhone: false,
    ownerWhatsapp: false,
  });
  const [invalid, setInvalid] = useState<string[]>([]);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const registerField = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      fieldRefs.current[key] = el;
    },
    []
  );

  const clearInvalid = useCallback((key: string) => {
    setInvalid((prev) =>
      prev.includes(key) ? prev.filter((entry) => entry !== key) : prev
    );
  }, []);

  /* ==================== Derived helpers ==================== */

  const bottleCountOf = useCallback(
    (size: BottleSize): number =>
      (sizeBottles[size]?.petCount ?? 0) * (BOTTLES_PER_PET[size] ?? 0),
    [sizeBottles]
  );

  const selectedCap = useMemo(
    () => caps.find((cap) => cap._id === capId) ?? null,
    [caps, capId]
  );

  const selectedLabel = useMemo(
    () => labels.find((label) => label._id === labelId) ?? null,
    [labels, labelId]
  );

  const labelSupportedSizes = useMemo(() => {
    const supported = new Set<BottleSize>();
    for (const size of selectedSizes) {
      if (
        selectedLabel?.sizeDetails.some((detail) => detail.size === size)
      ) {
        supported.add(size);
      }
    }
    return [...supported];
  }, [selectedLabel, selectedSizes]);

  const petOptionsFor = useCallback(
    (size: BottleSize): PetPackaging[] =>
      petItems.filter((item) =>
        item.sizeDetails?.some((detail) => detail.size === size)
          ? true
          : item.size === size
      ),
    [petItems]
  );

  const totalBottleQty = useMemo(
    () =>
      selectedSizes.reduce((sum, size) => sum + bottleCountOf(size), 0),
    [selectedSizes, bottleCountOf]
  );

  const totalPetPacks = useMemo(
    () =>
      selectedSizes.reduce(
        (sum, size) => sum + (petBySize[size]?.quantity ?? 0),
        0
      ),
    [selectedSizes, petBySize]
  );

  /* ==================== Data loading ==================== */

  useEffect(() => {
    let cancelled = false;
    setLoadingCaps(true);
    fetchAvailableCaps()
      .then((data) => {
        if (!cancelled) setCaps(data ?? []);
      })
      .catch(() => {
        if (!cancelled) setCaps([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCaps(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingPets(true);
    fetchAvailablePetPackaging()
      .then((data) => {
        if (!cancelled) setPetItems(data ?? []);
      })
      .catch(() => {
        if (!cancelled) setPetItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingPets(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadLabelsPage = useCallback(async (page: number, append: boolean) => {
    setLoadingLabels(true);
    try {
      const result = await fetchPaginatedLabels({ page, limit: 50 });
      setLabels((prev) =>
        append ? [...prev, ...(result?.data ?? [])] : (result?.data ?? [])
      );
      setLabelHasMore(result?.pagination?.hasMore ?? false);
    } catch {
      if (!append) setLabels([]);
    } finally {
      setLoadingLabels(false);
    }
  }, []);

  useEffect(() => {
    setLabels([]);
    setLabelPage(1);
    void loadLabelsPage(1, false);
  }, [loadLabelsPage]);

  const loadMoreLabels = useCallback(() => {
    if (!labelHasMore || loadingLabels) return;
    const next = labelPage + 1;
    setLabelPage(next);
    void loadLabelsPage(next, true);
  }, [labelHasMore, loadingLabels, labelPage, loadLabelsPage]);

  /* ==================== Marketing clients ==================== */

  const loadClients = useCallback(async () => {
    setLoadingClients(true);
    try {
      const data = await fetchMarketingClients();
      setClients(data ?? []);
    } catch {
      setClients([]);
    } finally {
      setLoadingClients(false);
    }
  }, []);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  const clientOptions: SelectOption[] = useMemo(
    () =>
      clients.map((client) => ({
        label: client.businessName,
        value: client._id,
      })),
    [clients]
  );

  const selectedClient = useMemo(
    () => clients.find((client) => client._id === clientId) ?? null,
    [clients, clientId]
  );

  const handleSelectClient = useCallback(
    (id: string) => {
      const client = clients.find((c) => c._id === id);
      if (!client) return;
      const phone = client.phone ?? "";
      const whatsapp = client.whatsapp ?? "";
      setClientId(client._id);
      setBusinessName(client.businessName ?? "");
      setOwnerName(client.ownerName ?? "");
      setOwnerPhone(phone);
      setOwnerWhatsapp(whatsapp);
      setWhatsappSame(Boolean(whatsapp) && whatsapp === phone);
      setClientLocks({
        businessName: Boolean((client.businessName ?? "").trim()),
        ownerName: Boolean((client.ownerName ?? "").trim()),
        ownerPhone: Boolean(phone.trim()),
        ownerWhatsapp: Boolean(whatsapp.trim()),
      });
      if (client.dealStatus === "DEAL_CLOSED_WON") {
        const existingReminder = client.nextOrderReminderAt
          ? isoToInputDate(client.nextOrderReminderAt)
          : "";
        setNextOrderReminderAt(existingReminder || daysFromToday(14));
      }
    },
    [clients]
  );

  // Preselect the marketing client when arriving from the client's
  // "Place New Order" follow-up action (/admin/orders/create?client=<id>).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preselectedId = params.get("client");
    if (!preselectedId || clientId) return;
    const client = clients.find((c) => c._id === preselectedId);
    if (client) handleSelectClient(client._id);
  }, [clients, clientId, handleSelectClient]);

  const openQuickAdd = useCallback(() => {
    setQuickAddBusiness("");
    setQuickAddOwner("");
    setQuickAddPhone("");
    setQuickAddWhatsapp("");
    setQuickAddSame(false);
    setQuickAddError(null);
    setQuickAddOpen(true);
  }, []);

  const handleQuickAdd = useCallback(async () => {
    const business = quickAddBusiness.trim();
    if (!business) {
      setQuickAddError("Business name is required.");
      return;
    }
    setQuickAddSaving(true);
    setQuickAddError(null);
    try {
      const created = await createMarketingClient({
        businessName: business,
        ownerName: quickAddOwner.trim() || undefined,
        phone: quickAddPhone.trim() || undefined,
        whatsapp:
          (quickAddSame ? quickAddPhone.trim() : quickAddWhatsapp.trim()) ||
          undefined,
        dealStatus: "PENDING_VISIT",
      });
      setClients((prev) => [created, ...prev]);
      const phone = created.phone ?? "";
      const whatsapp = created.whatsapp ?? "";
      setClientId(created._id);
      setBusinessName(created.businessName ?? "");
      setOwnerName(created.ownerName ?? "");
      setOwnerPhone(phone);
      setOwnerWhatsapp(whatsapp);
      setWhatsappSame(Boolean(whatsapp) && whatsapp === phone);
      setClientLocks({
        businessName: Boolean((created.businessName ?? "").trim()),
        ownerName: Boolean((created.ownerName ?? "").trim()),
        ownerPhone: Boolean(phone.trim()),
        ownerWhatsapp: Boolean(whatsapp.trim()),
      });
      setQuickAddOpen(false);
      toast.success(`Client "${created.businessName}" added and selected.`);
    } catch (err) {
      setQuickAddError(
        err instanceof Error ? err.message : "Failed to add client."
      );
    } finally {
      setQuickAddSaving(false);
    }
  }, [
    quickAddBusiness,
    quickAddOwner,
    quickAddPhone,
    quickAddWhatsapp,
    quickAddSame,
    toast,
  ]);

  /* ==================== Selection actions ==================== */

  const toggleSize = useCallback(
    (size: BottleSize) => {
      setSelectedSizes((prev) => {
        const active = prev.includes(size);
        if (active) return prev.filter((s) => s !== size);
        return [...prev, size];
      });
    },
    []
  );

  // Fetch the available bottles for a newly selected size (paginated).
  const loadBottlesPage = useCallback(
    async (size: BottleSize, page: number, append: boolean) => {
      if (append) {
        setLoadingMoreBottles((prev) => ({ ...prev, [size]: true }));
      } else {
        setLoadingBottles((prev) => ({ ...prev, [size]: true }));
      }
      try {
        const result = await fetchBottlesBySizesPaginated(
          [size],
          page,
          BOTTLE_PAGE_SIZE
        );
        const pageData = result?.data ?? [];
        setBottlesBySize((prev) => {
          const existing = prev[size] ?? [];
          const merged = append ? [...existing, ...pageData] : pageData;
          const seen = new Set<string>();
          const unique: Bottle[] = [];
          for (const b of merged) {
            if (seen.has(b._id)) continue;
            seen.add(b._id);
            unique.push(b);
          }
          return { ...prev, [size]: unique };
        });
        setBottleHasMoreBySize((prev) => ({
          ...prev,
          [size]: result?.hasMore ?? false,
        }));
        setBottlePageBySize((prev) => ({ ...prev, [size]: page }));
        if (!append) {
          const inStock = pageData.find((b) =>
            b.sizeDetails.some((d) => d.size === size && d.quantity > 0)
          );
          setSizeBottles((prev) =>
            prev[size]?.bottleId
              ? prev
              : {
                  ...prev,
                  [size]: {
                    bottleId: inStock?._id ?? pageData[0]?._id ?? "",
                    petCount: 1,
                  },
                }
          );
        }
      } catch {
        if (!append) setBottlesBySize((prev) => ({ ...prev, [size]: [] }));
      } finally {
        if (append) {
          setLoadingMoreBottles((prev) => ({ ...prev, [size]: false }));
        } else {
          setLoadingBottles((prev) => ({ ...prev, [size]: false }));
        }
      }
    },
    []
  );

  useEffect(() => {
    for (const size of selectedSizes) {
      if (bottlesBySize[size] || loadingBottles[size]) continue;
      void loadBottlesPage(size, 1, false);
    }
  }, [selectedSizes, bottlesBySize, loadingBottles, loadBottlesPage]);

  const loadMoreBottles = useCallback(
    (size: BottleSize) => {
      if (
        !bottleHasMoreBySize[size] ||
        loadingMoreBottles[size] ||
        loadingBottles[size]
      )
        return;
      const next = (bottlePageBySize[size] ?? 1) + 1;
      void loadBottlesPage(size, next, true);
    },
    [
      bottleHasMoreBySize,
      loadingMoreBottles,
      loadingBottles,
      bottlePageBySize,
      loadBottlesPage,
    ]
  );

  const updateSizeBottleId = useCallback((size: BottleSize, bottleId: string) => {
    setSizeBottles((prev) => ({ ...prev, [size]: { ...prev[size], bottleId } }));
  }, []);

  const updatePetCount = useCallback(
    (size: BottleSize, petCount: number) => {
      setSizeBottles((prev) => ({ ...prev, [size]: { ...prev[size], petCount } }));
      // Auto-match PET packaging quantity to the PET count (unless edited).
      if (!petQtyTouched[size]) {
        setPetBySize((prev) =>
          prev[size]
            ? { ...prev, [size]: { ...prev[size], quantity: petCount } }
            : prev
        );
      }
    },
    [petQtyTouched]
  );

  // Auto-create a PET packaging row for every selected size.
  useEffect(() => {
    if (petItems.length === 0) return;
    setPetBySize((prev) => {
      let next = prev;
      for (const size of selectedSizes) {
        if (next[size]) continue;
        const candidate = petOptionsFor(size)[0];
        if (!candidate) {
          next = { ...next, [size]: { petPackagingId: "", quantity: 0 } };
          continue;
        }
        next = {
          ...next,
          [size]: {
            petPackagingId: candidate._id,
            quantity: sizeBottles[size]?.petCount ?? 1,
          },
        };
      }
      return next;
    });
  }, [selectedSizes, petItems, petOptionsFor, sizeBottles]);

  const updatePetRow = useCallback(
    (size: BottleSize, patch: Partial<PetRowState>) => {
      setPetBySize((prev) => ({ ...prev, [size]: { ...prev[size], ...patch } }));
    },
    []
  );

  const togglePetQtyTouched = useCallback((size: BottleSize) => {
    setPetQtyTouched((prev) => ({ ...prev, [size]: true }));
  }, []);

  const selectCap = useCallback(
    (id: string) => {
      setCapId(id);
      setCapQty(totalBottleQty);
    },
    [totalBottleQty]
  );

  // Keep cap quantity auto-matched to total bottles until manually edited.
  useEffect(() => {
    if (capId && !capQtyTouched) setCapQty(totalBottleQty);
  }, [totalBottleQty, capId, capQtyTouched]);

  const selectLabel = useCallback(
    (id: string) => {
      setLabelId(id);
      const label = labels.find((l) => l._id === id);
      setLabelQtyTouched(false);
      if (label) {
        const quantities = {} as Record<BottleSize, number>;
        for (const size of selectedSizes) {
          quantities[size] = label.sizeDetails.some(
            (detail) => detail.size === size
          )
            ? bottleCountOf(size)
            : 0;
        }
        setLabelQuantities(quantities);
      }
    },
    [labels, selectedSizes, bottleCountOf]
  );

  // Auto-match label quantities to bottle counts when sizes/bottles change.
  useEffect(() => {
    if (!labelId || labelQtyTouched) return;
    const quantities = {} as Record<BottleSize, number>;
    for (const size of selectedSizes) {
      quantities[size] = labelSupportedSizes.includes(size)
        ? bottleCountOf(size)
        : 0;
    }
    setLabelQuantities(quantities);
  }, [labelId, selectedSizes, bottleCountOf, labelSupportedSizes, labelQtyTouched]);

  const toggleSizeRemoval = useCallback(
    (size: BottleSize) => {
      setSelectedSizes((prev) => prev.filter((s) => s !== size));
    },
    []
  );

  /* ==================== Billing (mirrors backend pricing) ==================== */

  const billing = useMemo(() => {
    const capUnitCost = selectedCap
      ? resolveUnitCost(
          selectedCap.unitCostPrice,
          selectedCap.totalCostPrice,
          selectedCap.totalQuantity
        )
      : 0;

    const lines = selectedSizes.map((size) => {
      const bottle = (bottlesBySize[size] ?? []).find(
        (b) => b._id === sizeBottles[size]?.bottleId
      );
      const bottleDetail = bottle?.sizeDetails.find((d) => d.size === size);
      const bottleCostPerUnit = resolveUnitCost(
        bottleDetail?.unitCostPrice,
        bottleDetail?.totalCostPrice,
        bottleDetail?.quantity
      );

      const labelDetail = selectedLabel?.sizeDetails.find(
        (d) => d.size === size
      );
      const labelCostPerUnit = resolveUnitCost(
        labelDetail?.unitCostPrice,
        labelDetail?.totalCostPrice,
        labelDetail?.quantity
      );
      const labelQty = labelQuantities[size] ?? 0;

      const petRow = petBySize[size];
      const petItem = petItems.find((p) => p._id === petRow?.petPackagingId);
      const petDetail = petItem?.sizeDetails?.find((d) => d.size === size);
      const petUnitCost = petItem
        ? petDetail
          ? resolveUnitCost(
              petDetail.unitCostPrice,
              petDetail.totalCostPrice,
              petDetail.quantity
            )
          : resolveUnitCost(
              petItem.unitCostPrice,
              petItem.totalCostPrice,
              petItem.quantity
            )
        : 0;

      const petCount = sizeBottles[size]?.petCount ?? 0;
      const bottleCount = bottleCountOf(size);
      const bottlesPerPET = BOTTLES_PER_PET[size] ?? 1;
      const waterCostPerBottle = round2(
        (LITERS_PER_SIZE[size] ?? 0) * waterRate
      );

      const bottleCostAmount = round2(bottleCostPerUnit * bottleCount);
      const capCostAmount = round2(capUnitCost * bottleCount);
      const labelCostAmount = round2(labelCostPerUnit * labelQty);
      const petPackCostAmount = round2(petUnitCost * petCount);
      const waterCostAmount = round2(waterCostPerBottle * bottleCount);

      const costPerUnit = round2(
        bottleCostPerUnit + capUnitCost + labelCostPerUnit
      );
      const costPerBottle = round2(costPerUnit + waterCostPerBottle);
      const costPerPET = round2(
        costPerBottle * bottlesPerPET + (petCount > 0 ? petUnitCost : 0)
      );
      const costAmount = round2(
        bottleCostAmount +
          capCostAmount +
          labelCostAmount +
          petPackCostAmount +
          waterCostAmount
      );

      const sell = Number(sellPerPET[size] ?? 0);
      const sellAmount = round2(sell * petCount);

      return {
        size,
        bottleName: bottle?.bottleName ?? "",
        petCount,
        bottleCount,
        bottlesPerPET,
        bottleCostPerUnit,
        capCostPerUnit: capUnitCost,
        labelCostPerUnit,
        petUnitCost,
        waterCostPerBottle,
        bottleCostAmount,
        capCostAmount,
        labelCostAmount,
        petPackCostAmount,
        waterCostAmount,
        costPerBottle,
        costPerPET,
        costAmount,
        sell,
        sellAmount,
        hasPet: Boolean(petRow?.petPackagingId),
      };
    });

    const totalBottles = round2(
      lines.reduce((sum, l) => sum + l.bottleCostAmount, 0)
    );
    const totalCaps = round2(
      lines.reduce((sum, l) => sum + l.capCostAmount, 0)
    );
    const totalLabels = round2(
      lines.reduce((sum, l) => sum + l.labelCostAmount, 0)
    );
    const totalPet = round2(
      lines.reduce((sum, l) => sum + l.petPackCostAmount, 0)
    );
    const totalWater = round2(
      lines.reduce((sum, l) => sum + l.waterCostAmount, 0)
    );
    const totalCost = round2(
      totalBottles + totalCaps + totalLabels + totalPet + totalWater
    );
    const totalSell = round2(
      lines.reduce((sum, l) => sum + l.sellAmount, 0)
    );
    const profit = round2(totalSell - totalCost);

    return {
      lines,
      totals: {
        bottles: totalBottles,
        caps: totalCaps,
        labels: totalLabels,
        pet: totalPet,
        water: totalWater,
        cost: totalCost,
        sell: totalSell,
        profit,
      },
    };
  }, [
    selectedSizes,
    bottlesBySize,
    sizeBottles,
    bottleCountOf,
    selectedCap,
    selectedLabel,
    labelQuantities,
    petBySize,
    petItems,
    waterRate,
    sellPerPET,
  ]);

  /* ==================== Submit ==================== */

  const collectErrors = useCallback((): { key: string; message: string }[] => {
    const errors: { key: string; message: string }[] = [];
    if (!businessName.trim())
      errors.push({ key: "businessName", message: "Business name is required." });
    if (!ownerName.trim())
      errors.push({ key: "ownerName", message: "Owner name is required." });
    if (!ownerPhone.trim())
      errors.push({ key: "ownerPhone", message: "Phone number is required." });
    if (!whatsappSame && !ownerWhatsapp.trim())
      errors.push({
        key: "ownerWhatsapp",
        message: "WhatsApp number is required.",
      });
    if (!deliveryDate)
      errors.push({
        key: "deliveryDate",
        message: "Delivery / dispatch date is required.",
      });
    if (selectedSizes.length === 0)
      errors.push({
        key: "selectedSizes",
        message: "Select at least one bottle size.",
      });
    for (const size of selectedSizes) {
      if (!sizeBottles[size]?.bottleId)
        errors.push({
          key: `bottle-${size}`,
          message: `Select a bottle for ${size}.`,
        });
      if ((sizeBottles[size]?.petCount ?? 0) < 1)
        errors.push({
          key: `pet-${size}`,
          message: `Enter the PET pack count for ${size}.`,
        });
    }
    if (!capId)
      errors.push({ key: "capId", message: "Select a cap." });
    if (capQty < 1)
      errors.push({ key: "capQty", message: "Enter the cap quantity." });
    if (!labelId)
      errors.push({
        key: "labelId",
        message: "Select a label from inventory.",
      });
    for (const size of selectedSizes) {
      const sell = Number(sellPerPET[size]);
      if (!Number.isFinite(sell) || sell <= 0)
        errors.push({
          key: `sell-${size}`,
          message: `Enter the selling price per PET for ${size}.`,
        });
    }
    if (advanceAmount > billing.totals.sell)
      errors.push({
        key: "advanceAmount",
        message: "Advance payment cannot exceed the total selling price.",
      });
    return errors;
  }, [
    businessName,
    ownerName,
    ownerPhone,
    whatsappSame,
    ownerWhatsapp,
    deliveryDate,
    selectedSizes,
    sizeBottles,
    capId,
    capQty,
    labelId,
    sellPerPET,
    advanceAmount,
    billing,
  ]);

  const handleSubmit = useCallback(async () => {
    const errors = collectErrors();
    if (errors.length > 0) {
      setInvalid(errors.map((entry) => entry.key));
      setError(errors[0].message);
      toast.error("Please fill all required fields.");
      const target = fieldRefs.current[errors[0].key];
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
          target.focus({ preventScroll: true });
        }
      }
      return;
    }
    setInvalid([]);
    setSubmitting(true);
    setError(null);
    const labelSizeQuantities = labelSupportedSizes.map((size) => ({
      size,
      quantity: labelQuantities[size] ?? bottleCountOf(size),
    }));
    const petSelections = selectedSizes
      .filter((size) => petBySize[size]?.petPackagingId)
      .map((size) => ({
        petPackagingId: petBySize[size].petPackagingId,
        size,
        quantity: petBySize[size].quantity,
      }));
    try {
      await createOrder({
        clientId: clientId || null,
        clientDetails: {
          businessName: businessName.trim(),
          ownerName: ownerName.trim(),
          ownerPhone: ownerPhone.trim(),
          ownerWhatsapp: whatsappSame ? ownerPhone.trim() : ownerWhatsapp.trim(),
          isWhatsappSameAsPhone: whatsappSame,
        },
        bottleSelection: {
          sizes: selectedSizes,
          sizeBottles: selectedSizes.map((size) => ({
            size,
            bottleId: sizeBottles[size].bottleId,
            petCount: sizeBottles[size].petCount,
            bottleCount: bottleCountOf(size),
          })),
        },
        capSelection: { capId, quantity: capQty },
        labelSelection: {
          type: "EXISTING_INVENTORY",
          labelId,
          sizeQuantities: labelSizeQuantities,
        },
        petPackagingSelection: petSelections,
        deliveryDate: deliveryDate || undefined,
        nextOrderReminderAt: nextOrderReminderAt || undefined,
        sellingPrice: billing.totals.sell,
        priceMode: "PER_PET",
        unitPrice: totalPetPacks > 0
          ? Math.round((billing.totals.sell / totalPetPacks) * 100) / 100
          : 0,
        waterRate,
        sellPerPET: Object.fromEntries(
          selectedSizes.map((size) => [size, Number(sellPerPET[size]) || 0])
        ) as unknown as Record<BottleSize, number>,
        advancePayment:
          advanceAmount > 0
            ? {
                amount: Number(advanceAmount) || 0,
                method: advanceMethod.trim() || undefined,
                note: advanceNote.trim() || undefined,
              }
            : undefined,
      });
      toast.success("Order created successfully. Stock has been deducted.");
      router.push("/admin/orders");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create the order."
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    collectErrors,
    clientId,
    businessName,
    ownerName,
    ownerPhone,
    whatsappSame,
    ownerWhatsapp,
    selectedSizes,
    sizeBottles,
    bottleCountOf,
    capId,
    capQty,
    labelId,
    labelSupportedSizes,
    labelQuantities,
    petBySize,
    deliveryDate,
    nextOrderReminderAt,
    billing,
    waterRate,
    sellPerPET,
    totalPetPacks,
    advanceAmount,
    advanceMethod,
    advanceNote,
    router,
    toast,
  ]);

  /* ==================== Render ==================== */

  return (
    <AdminPage
      title="Create Order"
      description="Build an order PET pack by PET pack — one bottle, cap, label and packaging price per size."
    >
      <div className="p-6">
        {error ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* ① Client Information */}
          <Section
            number={1}
            title="Client Information"
            description="Select a marketing client — their details auto-fill below."
          >
            <Field
              label="Marketing Client"
              required
              hint={loadingClients ? "Loading clients…" : undefined}
            >
              <div className="flex items-stretch gap-2">
                <div className="min-w-0 flex-1">
                  <SelectDropdown
                    value={clientId}
                    options={clientOptions}
                    onSelect={handleSelectClient}
                    placeholder={
                      loadingClients ? "Loading clients…" : "Select a client…"
                    }
                    searchable
                    searchPlaceholder="Search by business, owner or phone…"
                    actionLabel="Add new client"
                    onAction={openQuickAdd}
                    disabled={loadingClients}
                  />
                </div>
                <button
                  type="button"
                  onClick={openQuickAdd}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#2FB9BF] bg-[#2FB9BF]/10 px-3.5 text-sm font-semibold text-[#0E7A80] transition-colors hover:bg-[#2FB9BF]/20 dark:text-[#5EEAD4]"
                >
                  <Plus className="h-4 w-4" />
                  New
                </button>
              </div>
            </Field>

            {selectedClient ? (
              <p className="-mt-2 mb-4 text-xs font-medium text-[#0E7A80] dark:text-[#5EEAD4]">
                Auto-filled from {selectedClient.businessName}. Fill any missing
                detail below for this order.
              </p>
            ) : null}

            {selectedClient?.dealStatus === "DEAL_CLOSED_WON" && (
              <Field
                label="Next Order Reminder Date"
                hint="Estimated re-order date for a repeat order."
              >
                {selectedClient.followUpStatus === "OVERDUE" && (
                  <p className="mb-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-[#4C1D24] dark:bg-rose-900/20 dark:text-rose-200">
                    This client&apos;s last re-order reminder is overdue — placing
                    this order starts a fresh reminder cycle.
                  </p>
                )}
                <DatePicker
                  value={nextOrderReminderAt}
                  onChange={setNextOrderReminderAt}
                />
              </Field>
            )}

            <Field label="Business Name" required>
              <input
                ref={registerField("businessName")}
                className={`${inputClass} ${
                  invalid.includes("businessName") ? invalidClass : ""
                } ${
                  clientLocks.businessName ? "cursor-default opacity-70" : ""
                }`}
                value={businessName}
                onChange={(e) => {
                  setBusinessName(e.target.value);
                  clearInvalid("businessName");
                }}
                placeholder="e.g. Purely Waters"
                readOnly={clientLocks.businessName}
              />
            </Field>
            <Field label="Owner Name" required>
              <input
                ref={registerField("ownerName")}
                className={`${inputClass} ${
                  invalid.includes("ownerName") ? invalidClass : ""
                } ${clientLocks.ownerName ? "cursor-default opacity-70" : ""}`}
                value={ownerName}
                onChange={(e) => {
                  setOwnerName(e.target.value);
                  clearInvalid("ownerName");
                }}
                placeholder="e.g. John Doe"
                readOnly={clientLocks.ownerName}
              />
            </Field>
            <Field label="Phone Number" required>
              <input
                ref={registerField("ownerPhone")}
                className={`${inputClass} ${
                  invalid.includes("ownerPhone") ? invalidClass : ""
                } ${clientLocks.ownerPhone ? "cursor-default opacity-70" : ""}`}
                value={ownerPhone}
                onChange={(e) => {
                  setOwnerPhone(e.target.value);
                  if (whatsappSame) setOwnerWhatsapp(e.target.value);
                  clearInvalid("ownerPhone");
                  if (whatsappSame) clearInvalid("ownerWhatsapp");
                }}
                placeholder="+92 300 1234567"
                readOnly={clientLocks.ownerPhone}
              />
            </Field>
            <Field label="WhatsApp Number" required>
              <input
                ref={registerField("ownerWhatsapp")}
                className={`${inputClass} ${
                  invalid.includes("ownerWhatsapp") ? invalidClass : ""
                } ${
                  clientLocks.ownerWhatsapp ? "cursor-default opacity-70" : ""
                }`}
                value={whatsappSame ? ownerPhone : ownerWhatsapp}
                onChange={(e) => {
                  setOwnerWhatsapp(e.target.value);
                  if (whatsappSame) setOwnerPhone(e.target.value);
                  clearInvalid("ownerWhatsapp");
                }}
                placeholder="+92 300 1234567"
                readOnly={whatsappSame || clientLocks.ownerWhatsapp}
              />
            </Field>
            <label className="mb-4 flex cursor-pointer items-center gap-2.5 text-sm font-medium text-[#475569] dark:text-[#CBD5E1]">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-[#E2E8F0] text-[#2FB9BF] focus:ring-[#2FB9BF]/30"
                checked={whatsappSame}
                onChange={(e) => setWhatsappSame(e.target.checked)}
              />
              Same as phone number
            </label>
            <Field label="Delivery / Dispatch Date" required>
              <div
                ref={registerField("deliveryDate")}
                className={`rounded-xl ${
                  invalid.includes("deliveryDate") ? "ring-2 ring-red-400/50" : ""
                }`}
              >
                <DatePicker value={deliveryDate} onChange={setDeliveryDate} />
              </div>
            </Field>
          </Section>

          {/* ② Bottle Selection */}
          <Section
            number={2}
            title="Bottle Selection"
            description="Pick sizes, then choose a bottle and PET count for each size."
          >
            <Field label="Select Bottle Sizes" required>
              <div
                ref={registerField("selectedSizes")}
                className={`flex flex-wrap gap-2 rounded-xl ${
                  invalid.includes("selectedSizes")
                    ? "p-1 ring-2 ring-red-400/50"
                    : ""
                }`}
              >
                {BOTTLE_SIZES.map((size) => {
                  const active = selectedSizes.includes(size);
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => toggleSize(size)}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-bold transition-colors ${
                        active
                          ? "border-[#2FB9BF] bg-[#2FB9BF]/10 text-[#0E7A80] dark:text-[#5EEAD4]"
                          : "border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#2FB9BF]/40 dark:border-[#334155] dark:bg-[#0F172A] dark:text-[#CBD5E1]"
                      }`}
                    >
                      {active ? <span>✓</span> : null}
                      {size}
                      <span className="text-[10px] font-semibold text-[#94A3B8]">
                        {BOTTLES_PER_PET[size]} btl/pet
                      </span>
                    </button>
                  );
                })}
              </div>
            </Field>

            {selectedSizes.map((size) => {
              const bottles = bottlesBySize[size] ?? [];
              const sb = sizeBottles[size];
              const bottle = bottles.find((b) => b._id === sb?.bottleId);
              const detail = bottle?.sizeDetails.find((d) => d.size === size);
              const bottleCount = bottleCountOf(size);
              return (
                <div
                  key={size}
                  className="mb-4 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B1220] p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-[#2FB9BF]/10 px-2.5 py-1 text-xs font-bold text-[#0E7A80] dark:text-[#5EEAD4]">
                        {size}
                      </span>
                      <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                        {bottleCount} bottles = {sb?.petCount ?? 0} PET ×{" "}
                        {BOTTLES_PER_PET[size]}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSizeRemoval(size)}
                      aria-label={`Remove ${size}`}
                      className="rounded-lg p-1.5 text-[#94A3B8] transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {loadingBottles[size] ? (
                    <div className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-3 text-sm text-[#94A3B8] dark:border-[#334155] dark:bg-[#0F172A]">
                      <Loader2 className="h-4 w-4 animate-spin text-[#2FB9BF]" />
                      Finding bottles…
                    </div>
                  ) : bottles.length === 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm font-medium text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
                      No {size} bottles available in stock.
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div
                        ref={registerField(`bottle-${size}`)}
                        className={
                          invalid.includes(`bottle-${size}`)
                            ? "rounded-xl ring-2 ring-red-400/50"
                            : ""
                        }
                      >
                        <span className="mb-1.5 block text-xs font-semibold text-[#475569] dark:text-[#CBD5E1]">
                          Bottle
                        </span>
                        <SelectDropdown
                          value={sb?.bottleId ?? ""}
                          placeholder="Choose a bottle…"
                          options={bottles.map((b) => ({
                            value: b._id,
                            label: `${b.bottleName} (${b.customId})`,
                          }))}
                          onSelect={(id) => updateSizeBottleId(size, id)}
                          onReachEnd={() => loadMoreBottles(size)}
                          loadingMore={!!loadingMoreBottles[size]}
                          renderOption={(option, isSelected) => {
                            const b = bottles.find(
                              (item) => item._id === option.value
                            );
                            return (
                              <span className="flex min-w-0 items-center gap-2.5">
                                <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] dark:border-[#334155] dark:bg-[#0B1220]">
                                  {b?.imageUrl ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                      src={b.imageUrl}
                                      alt={b.bottleName}
                                      className="h-full w-full object-contain"
                                    />
                                  ) : (
                                    <span className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-[#94A3B8]">
                                      —
                                    </span>
                                  )}
                                </span>
                                <span className="min-w-0">
                                  <span
                                    className={`block truncate text-sm ${
                                      isSelected
                                        ? "font-semibold text-[#0E7A80] dark:text-[#5EEAD4]"
                                        : "font-medium text-[#334155] dark:text-[#CBD5E1]"
                                    }`}
                                  >
                                    {b?.bottleName ?? "(not loaded)"}
                                  </span>
                                  <span className="block truncate text-xs text-[#94A3B8]">
                                    {b?.customId ?? option.value}
                                  </span>
                                </span>
                              </span>
                            );
                          }}
                        />
                      </div>
                      <div>
                        <span className="mb-1.5 block text-xs font-semibold text-[#475569] dark:text-[#CBD5E1]">
                          PET count
                        </span>
                        <NumberInput
                          value={sb?.petCount ?? 0}
                          min={1}
                          onValueChange={(n) => {
                            updatePetCount(size, n);
                            clearInvalid(`pet-${size}`);
                          }}
                          className={`${inputClass} ${
                            invalid.includes(`pet-${size}`) ? invalidClass : ""
                          }`}
                        />
                      </div>
                    </div>
                  )}

                  {bottle ? (
                    <p className="mt-2 text-[11px] text-[#94A3B8]">
                      Bottle cost: {rs(resolveUnitCost(detail?.unitCostPrice, detail?.totalCostPrice, detail?.quantity))}/piece ·{" "}
                      {num(detail?.quantity ?? 0)} in stock
                    </p>
                  ) : null}
                </div>
              );
            })}

            {selectedSizes.length === 0 ? (
              <p className="text-sm text-[#94A3B8]">
                No sizes selected yet — pick at least one size above.
              </p>
            ) : null}
          </Section>

          {/* ③ Cap Selection */}
          <Section
            number={3}
            title="Cap Selection"
            description="Quantity auto-matches the total bottle count — adjust if needed."
          >
            {loadingCaps ? (
              <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
                <Loader2 className="h-4 w-4 animate-spin text-[#2FB9BF]" />
                Loading caps…
              </div>
            ) : caps.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm font-medium text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
                No caps available in stock.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div
                  ref={registerField("capId")}
                  className={
                    invalid.includes("capId")
                      ? "rounded-xl ring-2 ring-red-400/50"
                      : ""
                  }
                >
                  <span className="mb-1.5 block text-xs font-semibold text-[#475569] dark:text-[#CBD5E1]">
                    Cap
                  </span>
                  <SelectDropdown
                    value={capId}
                    placeholder="Select a cap…"
                    options={caps.map((cap) => ({
                      value: cap._id,
                      label: `${cap.color} (${cap.customId})`,
                    }))}
                    onSelect={(id) => {
                      selectCap(id);
                      clearInvalid("capId");
                    }}
                  />
                </div>
                <div>
                  <span className="mb-1.5 block text-xs font-semibold text-[#475569] dark:text-[#CBD5E1]">
                    Quantity
                  </span>
                  <NumberInput
                    value={capQty}
                    min={0}
                    onValueChange={(n) => {
                      setCapQtyTouched(true);
                      setCapQty(n);
                      clearInvalid("capQty");
                    }}
                    className={`${inputClass} ${
                      invalid.includes("capQty") ? invalidClass : ""
                    }`}
                  />
                </div>
              </div>
            )}
            {selectedCap ? (
              <p className="mt-2 text-[11px] text-[#94A3B8]">
                Cap cost: {rs(resolveUnitCost(selectedCap.unitCostPrice, selectedCap.totalCostPrice, selectedCap.totalQuantity))}/piece · {num(selectedCap.totalQuantity)} in stock
              </p>
            ) : null}
          </Section>

          {/* ④ Label Selection */}
          <Section
            number={4}
            title="Label Selection"
            description="Per-size label quantities auto-match bottle counts for the sizes this label supports."
          >
            <Field label="Label from Inventory" required>
              <div
                ref={registerField("labelId")}
                className={
                  invalid.includes("labelId")
                    ? "rounded-xl ring-2 ring-red-400/50"
                    : ""
                }
              >
                <SelectDropdown
                  value={labelId}
                  placeholder="Select a label…"
                  options={labels.map((label) => ({
                    value: label._id,
                    label: `${label.name} (${label.customId})`,
                  }))}
                  onSelect={(id) => {
                    selectLabel(id);
                    clearInvalid("labelId");
                  }}
                  onReachEnd={loadMoreLabels}
                  loadingMore={loadingLabels}
                />
              </div>
            </Field>

            {labelId && labelSupportedSizes.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {labelSupportedSizes.map((size) => {
                  const detail = selectedLabel?.sizeDetails.find(
                    (d) => d.size === size
                  );
                  return (
                    <div key={size}>
                      <span className="mb-1.5 block text-xs font-semibold text-[#475569] dark:text-[#CBD5E1]">
                        {size} labels
                      </span>
                      <NumberInput
                        value={labelQuantities[size] ?? 0}
                        min={0}
                        onValueChange={(n) => {
                          setLabelQtyTouched(true);
                          setLabelQuantities((prev) => ({ ...prev, [size]: n }));
                        }}
                        className={inputClass}
                      />
                      <p className="mt-1 text-[11px] text-[#94A3B8]">
                        {rs(resolveUnitCost(detail?.unitCostPrice, detail?.totalCostPrice, detail?.quantity))}/piece ·{" "}
                        {num(detail?.quantity ?? 0)} in stock
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : labelId ? (
              <p className="text-sm text-amber-500">
                This label does not support any of the selected sizes.
              </p>
            ) : null}
          </Section>

          {/* ⑤ PET Packaging */}
          <Section
            number={5}
            title="PET Packaging"
            description="Rows auto-match the selected sizes; quantities equal the PET counts. Adjust freely."
          >
            {loadingPets ? (
              <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
                <Loader2 className="h-4 w-4 animate-spin text-[#2FB9BF]" />
                Loading PET packaging…
              </div>
            ) : petItems.length === 0 ? (
              <p className="text-sm text-[#94A3B8]">
                No PET packaging items available.
              </p>
            ) : selectedSizes.length === 0 ? (
              <p className="text-sm text-[#94A3B8]">
                Select bottle sizes first — packaging rows will appear here.
              </p>
            ) : (
              selectedSizes.map((size) => {
                const row = petBySize[size];
                const options = petOptionsFor(size);
                const petItem = petItems.find(
                  (p) => p._id === row?.petPackagingId
                );
                const detail = petItem?.sizeDetails?.find(
                  (d) => d.size === size
                );
                const petUnitCost = petItem
                  ? detail
                    ? resolveUnitCost(
                        detail.unitCostPrice,
                        detail.totalCostPrice,
                        detail.quantity
                      )
                    : resolveUnitCost(
                        petItem.unitCostPrice,
                        petItem.totalCostPrice,
                        petItem.quantity
                      )
                  : 0;
                return (
                  <div
                    key={size}
                    className="mb-3 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B1220] p-4"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-lg bg-[#2FB9BF]/10 px-2.5 py-1 text-xs font-bold text-[#0E7A80] dark:text-[#5EEAD4]">
                        {size}
                      </span>
                      <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                        {num((detail?.quantity ?? petItem?.quantity) ?? 0)} in stock
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <span className="mb-1.5 block text-xs font-semibold text-[#475569] dark:text-[#CBD5E1]">
                          Packaging item
                        </span>
                        <SelectDropdown
                          value={row?.petPackagingId ?? ""}
                          placeholder="Select packaging…"
                          options={options.map((p) => ({
                            value: p._id,
                            label: `${p.customId}`,
                          }))}
                          onSelect={(id) => updatePetRow(size, { petPackagingId: id })}
                        />
                      </div>
                      <div>
                        <span className="mb-1.5 block text-xs font-semibold text-[#475569] dark:text-[#CBD5E1]">
                          Quantity
                        </span>
                        <NumberInput
                          value={row?.quantity ?? 0}
                          min={0}
                          onValueChange={(n) => {
                            togglePetQtyTouched(size);
                            updatePetRow(size, { quantity: n });
                          }}
                          className={inputClass}
                        />
                      </div>
                    </div>
                    {row?.petPackagingId ? (
                      <p className="mt-2 text-[11px] text-[#94A3B8]">
                        Packaging cost: {rs(petUnitCost)}/PET pack
                      </p>
                    ) : (
                      <p className="mt-2 text-[11px] text-amber-500">
                        No packaging matches this size yet.
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </Section>
        </div>

        {/* ⑥ Billing */}
        <div className="mt-6 rounded-2xl border border-[#E2E8F0] bg-white p-6 dark:border-[#1E293B] dark:bg-[#0F172A]">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2FB9BF] text-sm font-bold text-white">
              6
            </span>
            <div>
              <h2 className="text-base font-bold text-[#0F172A] dark:text-white">
                Billing & Selling Price
              </h2>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Cost per bottle and per PET pack, water cost, and the selling
                price per PET for every size.
              </p>
            </div>
          </div>

          <div className="mb-5 max-w-xs">
            <span className="mb-1.5 block text-xs font-semibold text-[#475569] dark:text-[#CBD5E1]">
              Water rate (Rs / liter)
            </span>
            <NumberInput
              value={waterRate}
              min={0}
              onValueChange={(n) => {
                const rounded = Math.round(n * 100) / 100;
                setWaterRate(Number.isFinite(rounded) ? rounded : 0);
              }}
              className={inputClass}
            />
            <p className="mt-1 text-[11px] text-[#94A3B8]">
              Default {WATER_COST_PER_LITER_DEFAULT} Rs/liter. Applied per
              bottle by size.
            </p>
          </div>

          <div className="space-y-4">
            {billing.lines.map((line) => (
              <div
                key={line.size}
                className="rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] p-4"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-[#2FB9BF]/10 px-2.5 py-1 text-xs font-bold text-[#0E7A80] dark:text-[#5EEAD4]">
                      {line.size}
                    </span>
                    <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                      {line.bottleName || "—"} · {num(line.petCount)} PET ×{" "}
                      {line.bottlesPerPET} = {num(line.bottleCount)} bottles
                    </span>
                  </div>
                </div>

                <div className="mb-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:grid-cols-5">
                  <div className="rounded-lg bg-[#F8FAFC] p-2.5 dark:bg-[#0B1220]">
                    <p className="text-[#94A3B8]">Bottles</p>
                    <p className="mt-0.5 font-bold text-[#0F172A] dark:text-white">
                      {rs(line.bottleCostAmount)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#F8FAFC] p-2.5 dark:bg-[#0B1220]">
                    <p className="text-[#94A3B8]">Caps</p>
                    <p className="mt-0.5 font-bold text-[#0F172A] dark:text-white">
                      {rs(line.capCostAmount)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#F8FAFC] p-2.5 dark:bg-[#0B1220]">
                    <p className="text-[#94A3B8]">Labels</p>
                    <p className="mt-0.5 font-bold text-[#0F172A] dark:text-white">
                      {rs(line.labelCostAmount)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#F8FAFC] p-2.5 dark:bg-[#0B1220]">
                    <p className="text-[#94A3B8]">PET packaging</p>
                    <p className="mt-0.5 font-bold text-[#0F172A] dark:text-white">
                      {rs(line.petPackCostAmount)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#F8FAFC] p-2.5 dark:bg-[#0B1220]">
                    <p className="text-[#94A3B8]">Water</p>
                    <p className="mt-0.5 font-bold text-[#0F172A] dark:text-white">
                      {rs(line.waterCostAmount)}
                    </p>
                  </div>
                </div>

                <div className="mb-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-lg border border-[#2FB9BF]/30 bg-[#2FB9BF]/5 px-2.5 py-1.5 font-bold text-[#0E7A80] dark:text-[#5EEAD4]">
                    Cost/bottle {rs(line.costPerBottle)}
                  </span>
                  <span className="rounded-lg border border-[#2FB9BF]/30 bg-[#2FB9BF]/5 px-2.5 py-1.5 font-bold text-[#0E7A80] dark:text-[#5EEAD4]">
                    Cost/PET {rs(line.costPerPET)}
                  </span>
                  <span className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1.5 font-bold text-[#0F172A] dark:border-[#334155] dark:bg-[#0B1220] dark:text-white">
                    Total cost {rs(line.costAmount)}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
                  <div
                    ref={registerField(`sell-${line.size}`)}
                    className={
                      invalid.includes(`sell-${line.size}`)
                        ? "rounded-xl ring-2 ring-red-400/50"
                        : ""
                    }
                  >
                    <span className="mb-1.5 block text-xs font-semibold text-[#475569] dark:text-[#CBD5E1]">
                      Selling price per PET (Rs)
                    </span>
                    <NumberInput
                      value={Number(sellPerPET[line.size] ?? 0)}
                      min={0}
                      onValueChange={(n) => {
                        setSellPerPET((prev) => ({ ...prev, [line.size]: n }));
                        clearInvalid(`sell-${line.size}`);
                      }}
                      className={`${inputClass} ${
                        invalid.includes(`sell-${line.size}`) ? invalidClass : ""
                      }`}
                    />
                  </div>
                  <div className="flex items-end justify-between gap-3 rounded-xl bg-[#F8FAFC] p-3 dark:bg-[#0B1220]">
                    <div>
                      <p className="text-xs font-semibold text-[#94A3B8]">
                        Sale amount
                      </p>
                      <p className="text-lg font-extrabold text-[#0F172A] dark:text-white">
                        {rs(line.sellAmount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-[#94A3B8]">
                        Profit
                      </p>
                      <p
                        className={`text-lg font-extrabold ${
                          line.sellAmount - line.costAmount >= 0
                            ? "text-emerald-500"
                            : "text-red-500"
                        }`}
                      >
                        {rs(line.sellAmount - line.costAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 dark:border-[#1E293B] dark:bg-[#0B1220]">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs font-semibold text-[#94A3B8]">Total bottles</p>
                <p className="text-sm font-bold text-[#0F172A] dark:text-white">
                  {num(totalBottleQty)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#94A3B8]">Total PET</p>
                <p className="text-sm font-bold text-[#0F172A] dark:text-white">
                  {num(totalPetPacks)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#94A3B8]">Total cost</p>
                <p className="text-sm font-bold text-[#0F172A] dark:text-white">
                  {rs(billing.totals.cost)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#94A3B8]">Total selling price</p>
                <p className="text-sm font-extrabold text-[#2FB9BF]">
                  {rs(billing.totals.sell)}
                </p>
              </div>
            </div>
            <div
              className={`mt-3 rounded-lg px-3 py-2 text-center text-sm font-bold ${
                billing.totals.profit >= 0
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
              }`}
            >
              {billing.totals.profit >= 0 ? "Profit" : "Loss"}:{" "}
              {rs(billing.totals.profit)}
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-[#2FB9BF]/30 bg-[#E6F7F8] p-4 dark:border-[#2FB9BF]/20 dark:bg-[#163A3B]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">
                  Advance payment (optional)
                </h3>
                <p className="mt-0.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
                  Record an amount the customer pays now. It appears tagged as
                  &ldquo;Advance&rdquo; in the order&apos;s payment records.
                </p>
              </div>
              {advanceAmount > 0 && (
                <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                  Advance
                </span>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div
                ref={registerField("advanceAmount")}
                className={
                  invalid.includes("advanceAmount")
                    ? "rounded-xl ring-2 ring-red-400/50"
                    : ""
                }
              >
                <span className="mb-1.5 block text-xs font-semibold text-[#475569] dark:text-[#CBD5E1]">
                  Amount (Rs)
                </span>
                <NumberInput
                  value={advanceAmount}
                  min={0}
                  allowDecimal
                  onValueChange={(n) => {
                    setAdvanceAmount(n);
                    clearInvalid("advanceAmount");
                  }}
                  className={`${inputClass} ${
                    invalid.includes("advanceAmount") ? invalidClass : ""
                  }`}
                  placeholder="0"
                />
              </div>
              <div>
                <span className="mb-1.5 block text-xs font-semibold text-[#475569] dark:text-[#CBD5E1]">
                  Method
                </span>
                <SelectDropdown
                  value={advanceMethod}
                  placeholder="Not specified"
                  options={[
                    { label: "Not specified", value: "" },
                    { label: "Cash", value: "Cash" },
                    { label: "Bank transfer", value: "Bank transfer" },
                    { label: "Online transfer", value: "Online transfer" },
                    { label: "Cheque", value: "Cheque" },
                    { label: "Other", value: "Other" },
                  ]}
                  onSelect={setAdvanceMethod}
                />
              </div>
              <div>
                <span className="mb-1.5 block text-xs font-semibold text-[#475569] dark:text-[#CBD5E1]">
                  Note
                </span>
                <input
                  type="text"
                  value={advanceNote}
                  onChange={(e) => setAdvanceNote(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. 50% advance"
                />
              </div>
            </div>
            {advanceAmount > 0 && (
              <p className="mt-3 text-xs font-medium text-[#0E7A80] dark:text-[#5EEAD4]">
                Remaining after advance:{" "}
                <span className="font-bold">
                  {rs(Math.max(0, billing.totals.sell - advanceAmount))}
                </span>
              </p>
            )}
          </div>

          <div className="mt-6">
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2FB9BF] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#25a3a8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {submitting ? "Creating order…" : "Create Order"}
            </button>
          </div>
        </div>
      </div>

      {quickAddOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl dark:bg-[#0F172A] sm:rounded-2xl sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#0F172A] dark:text-white">
                  Add New Client
                </h3>
                <p className="mt-0.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
                  Creates a marketing client and selects them for this order.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickAddOpen(false)}
                className="rounded-lg p-1 text-[#94A3B8] transition-colors hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {quickAddError ? (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                {quickAddError}
              </div>
            ) : null}

            <div className="space-y-3.5">
              <div>
                <span className="mb-1.5 block text-xs font-semibold text-[#475569] dark:text-[#CBD5E1]">
                  Business Name <span className="text-red-500">*</span>
                </span>
                <input
                  className={inputClass}
                  value={quickAddBusiness}
                  onChange={(e) => setQuickAddBusiness(e.target.value)}
                  placeholder="e.g. Eden Garden"
                  autoFocus
                />
              </div>
              <div>
                <span className="mb-1.5 block text-xs font-semibold text-[#475569] dark:text-[#CBD5E1]">
                  Owner Name
                </span>
                <input
                  className={inputClass}
                  value={quickAddOwner}
                  onChange={(e) => setQuickAddOwner(e.target.value)}
                  placeholder="e.g. Umar"
                />
              </div>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <div>
                  <span className="mb-1.5 block text-xs font-semibold text-[#475569] dark:text-[#CBD5E1]">
                    Phone
                  </span>
                  <input
                    className={inputClass}
                    value={quickAddPhone}
                    onChange={(e) => setQuickAddPhone(e.target.value)}
                    placeholder="+92 300 1234567"
                  />
                </div>
                <div>
                  <span className="mb-1.5 block text-xs font-semibold text-[#475569] dark:text-[#CBD5E1]">
                    WhatsApp
                  </span>
                  <input
                    className={inputClass}
                    value={quickAddSame ? quickAddPhone : quickAddWhatsapp}
                    onChange={(e) => setQuickAddWhatsapp(e.target.value)}
                    placeholder="+92 300 1234567"
                    readOnly={quickAddSame}
                  />
                  <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs font-medium text-[#475569] dark:text-[#CBD5E1]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[#E2E8F0] text-[#2FB9BF] focus:ring-[#2FB9BF]/30"
                      checked={quickAddSame}
                      onChange={(e) => setQuickAddSame(e.target.checked)}
                    />
                    Same as phone
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setQuickAddOpen(false)}
                className="rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm font-semibold text-[#475569] transition-colors hover:bg-[#F8FAFC] dark:border-[#334155] dark:text-[#CBD5E1] dark:hover:bg-[#1E293B]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={quickAddSaving}
                onClick={handleQuickAdd}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2FB9BF] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#25a3a8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {quickAddSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {quickAddSaving ? "Adding…" : "Add & Select"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminPage>
  );
}
export interface SanitizedAdmin {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token");
}

export const API_BASE_URL = (
  process.env.API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");

async function parseResponse<T extends ApiResponse>(response: Response): Promise<T> {
  let body: T;
  try {
    body = (await response.json()) as T;
  } catch {
    throw new ApiError("The server returned an invalid response.", response.status);
  }

  if (!response.ok || !body.success) {
    throw new ApiError(body.message || "Request failed.", response.status);
  }

  return body;
}

export async function loginAdmin(
  email: string,
  password: string
): Promise<SanitizedAdmin> {
  const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  const text = await response.text();
  const data = JSON.parse(text);

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Login failed");
  }

  // Store token in localStorage
  typeof window !== "undefined" && localStorage.setItem("admin_token", data.token);

  // Return admin data
  return data.data;
}

export async function fetchAdminMe(): Promise<SanitizedAdmin> {
  const response = await fetch(`${API_BASE_URL}/api/admin/me`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (response.status === 401) {
    throw new ApiError("Session expired. Please log in again.", 401);
  }

  const body = await parseResponse<ApiResponse<SanitizedAdmin>>(response);
  return body.data!;
}

export async function logoutAdmin(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/admin/logout`, {
    method: "POST",
    credentials: "include",
  });
  await parseResponse<ApiResponse>(response);
}

export async function updateProfile(input: {
  name?: string;
  email?: string;
}): Promise<SanitizedAdmin> {
  return apiSend<SanitizedAdmin>("/api/admin/profile", "PUT", input);
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await apiSend<{ success: boolean }>("/api/admin/password", "PUT", input);
}

export interface InventoryItem {
  _id: string;
  category: string;
  name: string;
  sku: string;
  quantity: number;
  unit: string;
  reorderLevel: number;
  unitCost: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface AuditLogEntry {
  id: string;
  adminId: string;
  adminName: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  targetModule: string;
  itemId: string;
  itemLabel?: string;
  changes: AuditChange[];
  timestamp?: string;
}

export interface Paginated<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

async function apiGet<T>(url: string): Promise<T> {
  const token = localStorage.getItem("admin_token");
  const authHeader = token ? `Bearer ${token}` : undefined;

  const response = await fetch(`${API_BASE_URL}${url}`, {
    method: "GET",
    headers: {
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    cache: "no-store",
  });

  if (response.status === 401) {
    throw new ApiError("Session expired. Please log in again.", 401);
  }

  const body = await parseResponse<ApiResponse<T>>(response);
  return body.data!;
}

export async function fetchAuditLogs(params?: {
  page?: number;
  pageSize?: number;
  adminId?: string;
  module?: string;
  action?: string;
  from?: string;
  to?: string;
}): Promise<Paginated<AuditLogEntry>> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));
  if (params?.adminId) query.set("adminId", params.adminId);
  if (params?.module) query.set("module", params.module);
  if (params?.action) query.set("action", params.action);
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);

  const qs = query.toString();
  const response = await fetch(
    `${API_BASE_URL}/api/audit-logs${qs ? `?${qs}` : ""}`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    }
  );

  if (response.status === 401) {
    throw new ApiError("Session expired. Please log in again.", 401);
  }

  const body = await parseResponse<
    ApiResponse<AuditLogEntry[]> & {
      pagination?: Paginated<AuditLogEntry>["pagination"];
    }
  >(response);

  const data = body.data ?? [];
  const pagination = body.pagination ?? {
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 20,
    total: data.length,
    totalPages: 1,
  };

  return { data, pagination };
}

export function fetchInventory(params?: {
  category?: string;
  search?: string;
}): Promise<InventoryItem[]> {
  const query = new URLSearchParams();
  if (params?.category) query.set("category", params.category);
  if (params?.search) query.set("search", params.search);

  const qs = query.toString();
  return apiGet<InventoryItem[]>(
    `/api/inventory${qs ? `?${qs}` : ""}`
  );
}

export interface AdminNotification {
  id: string;
  type: "inquiry" | "activity" | "inventory";
  action: string;
  title: string;
  message: string;
  module?: string;
  itemId?: string;
  href?: string;
  read: boolean;
  createdAt: string;
}

export async function fetchNotifications(params?: {
  page?: number;
  pageSize?: number;
  type?: string;
}): Promise<{
  data: AdminNotification[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  unreadCount: number;
  totalUnread: number;
}> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));
  if (params?.type) query.set("type", params.type);

  const qs = query.toString();
  const response = await fetch(
    `${API_BASE_URL}/api/notifications${qs ? `?${qs}` : ""}`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    }
  );

  if (response.status === 401) {
    throw new ApiError("Session expired. Please log in again.", 401);
  }

  const body = await parseResponse<
    ApiResponse<AdminNotification[]> & {
      pagination?: Paginated<AdminNotification>["pagination"];
      unreadCount?: number;
      totalUnread?: number;
    }
  >(response);

  return {
    data: body.data ?? [],
    pagination: body.pagination ?? {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 20,
      total: (body.data ?? []).length,
      totalPages: 1,
    },
    unreadCount: body.unreadCount ?? 0,
    totalUnread: body.totalUnread ?? 0,
  };
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const response = await fetch(`${API_BASE_URL}/api/notifications/unread-count`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (response.status === 401) {
    throw new ApiError("Session expired. Please log in again.", 401);
  }

  const body = await parseResponse<ApiResponse<{ unreadCount: number }>>(response);
  return body.data?.unreadCount ?? 0;
}

export async function markNotificationsRead(
  ids: string[] = []
): Promise<number> {
  const response = await fetch(`${API_BASE_URL}/api/notifications/read`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });

  if (response.status === 401) {
    throw new ApiError("Session expired. Please log in again.", 401);
  }

  const body = await parseResponse<ApiResponse<{ unreadCount: number }>>(response);
  return body.data?.unreadCount ?? 0;
}

export type InquiryStatus = "new" | "replied" | "archived";

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: InquiryStatus;
  createdAt: string;
}

export interface InquirySummary {
  total: number;
  totalNew: number;
  totalReplied: number;
  totalArchived: number;
}

export async function fetchInquiries(params?: {
  page?: number;
  pageSize?: number;
  status?: InquiryStatus;
  search?: string;
}): Promise<Paginated<Inquiry>> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));
  if (params?.status) query.set("status", params.status);
  if (params?.search) query.set("search", params.search);

  const qs = query.toString();
  const response = await fetch(
    `${API_BASE_URL}/api/inquiries${qs ? `?${qs}` : ""}`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    }
  );

  if (response.status === 401) {
    throw new ApiError("Session expired. Please log in again.", 401);
  }

  const body = await parseResponse<
    ApiResponse<Inquiry[]> & {
      pagination?: Paginated<Inquiry>["pagination"];
    }
  >(response);

  const data = body.data ?? [];
  const pagination = body.pagination ?? {
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 20,
    total: data.length,
    totalPages: 1,
  };

  return { data, pagination };
}

export async function fetchInquirySummary(): Promise<InquirySummary> {
  return apiGet<InquirySummary>("/api/inquiries/summary");
}

export function updateInquiryStatus(
  id: string,
  status: InquiryStatus
): Promise<{ id: string; status: InquiryStatus }> {
  return apiSend<{ id: string; status: InquiryStatus }>(
    `/api/inquiries/${id}/status`,
    "PUT",
    { status }
  );
}

export function deleteInquiry(id: string): Promise<{ id: string }> {
  return apiSend<{ id: string }>(`/api/inquiries/${id}`, "DELETE");
}

export type BottleType = "Mixing" | "Pure";
export type BottleSize = "300ml" | "500ml" | "1500ml" | "19L";
export const BOTTLE_SIZES: BottleSize[] = [
  "300ml",
  "500ml",
  "1500ml",
  "19L",
];

export interface AdminRef {
  _id: string;
  name: string;
  email: string;
}

export interface SizeDetail {
  size: BottleSize;
  quantity: number;
  totalCostPrice: number;
  unitCostPrice: number;
  stockAlertLevel: number;
}

export interface SizeQuantity {
  size: BottleSize;
  quantity: number;
}

export interface UpdatedByEntry {
  adminId: AdminRef;
  adminName: string;
  updatedAt: string;
  changesSummary: string;
}

export interface Bottle {
  _id: string;
  customId: string;
  bottleName: string;
  type: BottleType;
  imageUrl: string;
  sizeDetails: SizeDetail[];
  createdBy: AdminRef;
  updatedByHistory: UpdatedByEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateBottleInput {
  bottleName: string;
  type: BottleType;
  imageUrl: string;
  sizeDetails: SizeDetail[];
}

export type UpdateBottleInput = Partial<CreateBottleInput>;

export interface AddInventorySize {
  size: BottleSize;
  quantity: number;
  totalCostPrice: number;
  stockAlertLevel: number;
}

export interface AddInventoryInput {
  sizeDetails: AddInventorySize[];
}

export interface UploadResult {
  url: string;
  storage: "cloudinary";
  size: number;
  originalName: string;
}

export async function uploadBottleImage(
  file: File,
  folder = "bottles"
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("folder", folder);

  const response = await fetch(`${API_BASE_URL}/api/upload`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (response.status === 401) {
    throw new ApiError("Session expired. Please log in again.", 401);
  }

  const parsed = await parseResponse<ApiResponse<UploadResult>>(response);
  return parsed.data!;
}

async function apiSend<T>(
  url: string,
  method: "POST" | "PUT" | "DELETE",
  body?: unknown
): Promise<T> {
  const token = localStorage.getItem("admin_token");
  const authHeader = token ? `Bearer ${token}` : undefined;

  const response = await fetch(`${API_BASE_URL}${url}`, {
    method,
    headers: {
      ...(authHeader ? { Authorization: authHeader } : {}),
      ...(body ? { "Content-Type": "application/json" } : undefined),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    throw new ApiError("Session expired. Please log in again.", 401);
  }

  const parsed = await parseResponse<ApiResponse<T>>(response);
  return parsed.data!;
}

export function fetchBottles(): Promise<Bottle[]> {
  return apiGet<Bottle[]>("/api/bottles");
}

export function fetchBottle(id: string): Promise<Bottle> {
  return apiGet<Bottle>(`/api/bottles/${id}`);
}

export function createBottle(input: CreateBottleInput): Promise<Bottle> {
  return apiSend<Bottle>("/api/bottles", "POST", input);
}

export function updateBottle(
  id: string,
  input: UpdateBottleInput
): Promise<Bottle> {
  return apiSend<Bottle>(`/api/bottles/${id}`, "PUT", input);
}

export function deleteBottle(
  id: string
): Promise<{ id: string; customId: string }> {
  return apiSend<{ id: string; customId: string }>(
    `/api/bottles/${id}`,
    "DELETE"
  );
}

export function addBottleInventory(
  id: string,
  input: AddInventoryInput
): Promise<Bottle> {
  return apiSend<Bottle>(`/api/bottles/${id}/inventory`, "POST", input);
}

export interface Cap {
  _id: string;
  customId: string;
  color: string;
  imageUrl: string;
  totalQuantity: number;
  totalCostPrice: number;
  unitCostPrice: number;
  stockAlertLevel: number;
  createdBy: AdminRef;
  updatedByHistory: UpdatedByEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCapInput {
  color: string;
  imageUrl: string;
  totalQuantity: number;
  totalCostPrice: number;
  stockAlertLevel?: number;
}

export type UpdateCapInput = Partial<CreateCapInput>;

export function fetchCaps(): Promise<Cap[]> {
  return apiGet<Cap[]>("/api/caps");
}

export function createCap(input: CreateCapInput): Promise<Cap> {
  return apiSend<Cap>("/api/caps", "POST", input);
}

export function updateCap(id: string, input: UpdateCapInput): Promise<Cap> {
  return apiSend<Cap>(`/api/caps/${id}`, "PUT", input);
}

export function deleteCap(
  id: string
): Promise<{ id: string; customId: string; color: string }> {
  return apiSend<{ id: string; customId: string; color: string }>(
    `/api/caps/${id}`,
    "DELETE"
  );
}

export interface Cap {
  _id: string;
  customId: string;
  color: string;
  imageUrl: string;
  totalQuantity: number;
  totalCostPrice: number;
  unitCostPrice: number;
  stockAlertLevel: number;
  createdBy: AdminRef;
  updatedByHistory: UpdatedByEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface Color {
  _id: string;
  name: string;
  value?: string;
  createdAt: string;
  updatedAt: string;
}

export function fetchColors(): Promise<Color[]> {
  return apiGet<Color[]>("/api/colors");
}

export function createColor(input: { name: string; value?: string }): Promise<Color> {
  return apiSend<Color>("/api/colors", "POST", input);
}

export interface PetPackaging {
  _id: string;
  customId: string;
  size: string;
  quantity: number;
  totalCostPrice: number;
  unitCostPrice: number;
  stockAlertLevel: number;
  createdBy: AdminRef;
  updatedByHistory: UpdatedByEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePetPackagingInput {
  size: string;
  quantity: number;
  totalCostPrice: number;
  stockAlertLevel?: number;
}

export type UpdatePetPackagingInput = Partial<CreatePetPackagingInput>;

export function fetchPetPackaging(): Promise<PetPackaging[]> {
  return apiGet<PetPackaging[]>("/api/pet-packaging");
}

export function createPetPackaging(input: CreatePetPackagingInput): Promise<PetPackaging> {
  return apiSend<PetPackaging>("/api/pet-packaging", "POST", input);
}

export function updatePetPackaging(
  id: string,
  input: UpdatePetPackagingInput
): Promise<PetPackaging> {
  return apiSend<PetPackaging>(`/api/pet-packaging/${id}`, "PUT", input);
}

export function deletePetPackaging(
  id: string
): Promise<{ id: string; customId: string; size: string }> {
  return apiSend<{ id: string; customId: string; size: string }>(
    `/api/pet-packaging/${id}`,
    "DELETE"
  );
}

export interface Label {
  _id: string;
  customId: string;
  name: string;
  imageUrl: string;
  sizeDetails: SizeDetail[];
  createdBy: AdminRef;
  updatedByHistory: UpdatedByEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateLabelInput {
  name: string;
  imageUrl: string;
  sizeDetails: SizeDetail[];
}

export type UpdateLabelInput = Partial<CreateLabelInput>;

export function fetchLabels(): Promise<Label[]> {
  return apiGet<Label[]>("/api/labels");
}

export function fetchLabel(id: string): Promise<Label> {
  return apiGet<Label>(`/api/labels/${id}`);
}

export function createLabel(input: CreateLabelInput): Promise<Label> {
  return apiSend<Label>("/api/labels", "POST", input);
}

export function updateLabel(
  id: string,
  input: UpdateLabelInput
): Promise<Label> {
  return apiSend<Label>(`/api/labels/${id}`, "PUT", input);
}

export function deleteLabel(
  id: string
): Promise<{ id: string; customId: string }> {
  return apiSend<{ id: string; customId: string }>(`/api/labels/${id}`, "DELETE");
}

export function addLabelInventory(
  id: string,
  input: AddInventoryInput
): Promise<Label> {
  return apiSend<Label>(`/api/labels/${id}/inventory`, "POST", input);
}

export interface ExpenseCategory {
  id: string;
  name: string;
}

export interface ExpenseRecord {
  id: string;
  category: string;
  amount: number;
  note?: string;
  recordedByName: string;
  date?: string;
}

export interface FinanceSummary {
  budget: number;
  stockInvestment: number;
  otherExpenses: number;
  profit: number;
  recentExpenses: ExpenseRecord[];
  byCategory: { category: string; total: number; count: number }[];
}

export type ExpenseCategoryInput = Pick<ExpenseCategory, "name">;
export type CreateExpenseInput = {
  category: string;
  amount: number;
  note?: string;
};

export function fetchFinanceSummary(): Promise<FinanceSummary> {
  return apiGet<FinanceSummary>("/api/finance/summary");
}

export interface DashboardMonthlyExpense {
  key: string;
  label: string;
  total: number;
}

export interface DashboardMonthlyOrder {
  key: string;
  label: string;
  count: number;
}

export interface DashboardSummary {
  budget: number;
  stockInvestment: number;
  otherExpenses: number;
  profit: number;
  totalOrders: number;
  monthlyExpenses: DashboardMonthlyExpense[];
  monthlyOrders: DashboardMonthlyOrder[];
  recentLogs: AuditLogEntry[];
}

export function fetchDashboardSummary(): Promise<DashboardSummary> {
  return apiGet<DashboardSummary>("/api/dashboard/summary");
}

export async function fetchBudget(): Promise<number> {
  const data = await apiGet<{ budget: number }>("/api/finance/budget");
  return data.budget ?? 0;
}

export async function updateBudget(budget: number): Promise<number> {
  const data = await apiSend<{ budget: number }>(
    "/api/finance/budget",
    "PUT",
    { budget }
  );
  return data.budget ?? budget;
}

export async function fetchExpenseCategories(): Promise<ExpenseCategory[]> {
  const raw = await apiGet<
    (ExpenseCategory & { _id: string })[]
  >("/api/expenses/categories");
  return (raw ?? []).map((c) => ({ id: c._id, name: c.name }));
}

export async function createExpenseCategory(
  input: ExpenseCategoryInput
): Promise<ExpenseCategory> {
  return apiSend<ExpenseCategory>("/api/expenses/categories", "POST", input);
}

export function fetchExpenses(params?: {
  page?: number;
  pageSize?: number;
  category?: string;
}): Promise<Paginated<ExpenseRecord>> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));
  if (params?.category) query.set("category", params.category);

  const qs = query.toString();
  return fetch(
    `${API_BASE_URL}/api/expenses${qs ? `?${qs}` : ""}`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    }
  ).then(async (response) => {
    if (response.status === 401) {
      throw new ApiError("Session expired. Please log in again.", 401);
    }
    const body = await parseResponse<
      ApiResponse<ExpenseRecord[]> & {
        pagination?: Paginated<ExpenseRecord>["pagination"];
      }
    >(response);
    const data = body.data ?? [];
    return {
      data,
      pagination: body.pagination ?? {
        page: params?.page ?? 1,
        pageSize: params?.pageSize ?? 20,
        total: data.length,
        totalPages: 1,
      },
    };
  });
}

export function createExpense(input: CreateExpenseInput): Promise<ExpenseRecord> {
  return apiSend<ExpenseRecord>("/api/expenses", "POST", input);
}

export function deleteExpense(id: string): Promise<{ id: string }> {
  return apiSend<{ id: string }>(`/api/expenses/${id}`, "DELETE");
}

/* ------------------------------------------------------------------ */
/*  Label Orders                                                       */
/* ------------------------------------------------------------------ */

export type OrderStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED";

export interface SizeSelection {
  size: BottleSize;
  quantity: number;
}

export interface LabelOrder {
  _id: string;
  orderId: string;
  businessName: string;
  ownerName: string;
  phone: string;
  whatsapp: string;
  isWhatsappSameAsPhone: boolean;
  bottle: Bottle;
  sizeSelections: SizeSelection[];
  cap: Cap | null;
  petPackaging: PetPackaging | null;
  logoUrl: string;
  status: OrderStatus;
  createdBy: AdminRef;
  updatedByHistory: UpdatedByEntry[];
  createdAt: string;
  updatedAt: string;
}

export type LabelSelectionType = "NEW_DESIGN" | "EXISTING_INVENTORY"; // kept for future use

export interface ClientDetails {
  businessName: string;
  ownerName: string;
  ownerPhone: string;
  ownerWhatsapp: string;
  isWhatsappSameAsPhone: boolean;
}

export interface BottleSelection {
  sizes: BottleSize[];
  bottleId: string | Bottle;
  sizeQuantities: SizeQuantity[];
}

export interface CapSelection {
  capId: string | Cap;
  quantity: number;
}

export interface LabelSelection {
  type: LabelSelectionType;
  logoImageUrl?: string;
  labelId?: string | Label | null;
}

export interface PetPackagingSelection {
  petPackagingId: string | PetPackaging;
  size: string;
  quantity: number;
}

export function fetchBottlesBySizes(sizes: BottleSize[]): Promise<Bottle[]> {
  if (sizes.length === 0) return Promise.resolve([]);
  return apiGet<Bottle[]>(
    `/api/inventory/bottles-by-sizes?sizes=${encodeURIComponent(sizes.join(","))}`
  );
}

export function fetchAvailableCaps(): Promise<Cap[]> {
  return apiGet<Cap[]>("/api/inventory/caps");
}

export async function fetchPaginatedLabels(params?: {
  page?: number;
  limit?: number;
}): Promise<{
  data: Label[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;
  const response = await fetch(
    `${API_BASE_URL}/api/inventory/labels?page=${page}&limit=${limit}`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    }
  );

  if (response.status === 401) {
    throw new ApiError("Session expired. Please log in again.", 401);
  }

  const body = await parseResponse<
    ApiResponse<Label[]> & {
      pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
      };
    }
  >(response);

  const data = body.data ?? [];
  return {
    data,
    pagination: body.pagination ?? {
      page,
      limit,
      total: data.length,
      totalPages: 1,
      hasMore: false,
    },
  };
}

export function fetchAvailablePetPackaging(): Promise<PetPackaging[]> {
  return apiGet<PetPackaging[]>("/api/inventory/pet-packaging");
}

export function bottlesBySizes(sizes: string[]): Promise<Bottle[]> {
  return fetchBottlesBySizes(sizes as BottleSize[]);
}

export interface CreateLabelOrderInput {
  businessName: string;
  ownerName: string;
  phone: string;
  whatsapp: string;
  bottle: string;
  sizeSelections: SizeSelection[];
  cap?: string | null;
  petPackaging?: string | null;
  logoUrl?: string;
}

export type UpdateLabelOrderInput = Partial<
  Omit<CreateLabelOrderInput, "bottle" | "sizeSelections">
> & {
  status?: OrderStatus;
  bottle?: string;
  sizeSelections?: SizeSelection[];
};

export function fetchLabelOrders(): Promise<LabelOrder[]> {
  return apiGet<LabelOrder[]>("/api/label-orders");
}

export function fetchLabelOrder(id: string): Promise<LabelOrder> {
  return apiGet<LabelOrder>(`/api/label-orders/${id}`);
}

export function createLabelOrder(input: CreateLabelOrderInput): Promise<LabelOrder> {
  return apiSend<LabelOrder>("/api/label-orders", "POST", input);
}

export function updateLabelOrder(
  id: string,
  input: UpdateLabelOrderInput
): Promise<LabelOrder> {
  return apiSend<LabelOrder>(`/api/label-orders/${id}`, "PUT", input);
}

export function deleteLabelOrder(
  id: string
): Promise<{ id: string; orderId: string; businessName: string }> {
  return apiSend<{ id: string; orderId: string; businessName: string }>(
    `/api/label-orders/${id}`,
    "DELETE"
  );
}

/* ------------------------------------------------------------------ */
/*  Orders (full order system with stock deduction)                    */
/* ------------------------------------------------------------------ */

export type { OrderStatus as OrderResponseStatus };

export interface OrderResponse {
  _id: string;
  orderId: string;
  clientDetails: {
    businessName: string;
    ownerName: string;
    ownerPhone: string;
    ownerWhatsapp: string;
    isWhatsappSameAsPhone: boolean;
  };
  bottleSelection: {
    sizes: BottleSize[];
    bottleId: Bottle;
    sizeQuantities: SizeQuantity[];
  };
  capSelection: {
    capId: Cap;
    quantity: number;
  };
  labelSelection: {
    type: "NEW_DESIGN" | "EXISTING_INVENTORY";
    logoImageUrl: string;
    labelId: Label | null;
  };
  petPackagingSelection: {
    petPackagingId: PetPackaging;
    size: string;
    quantity: number;
  }[];
  createdBy: AdminRef;
  status: OrderStatus;
  deliveryDate?: string | null;
  note?: string;
  sellingPrice: number;
  totalCost: number;
  profit: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderInput {
  clientDetails: {
    businessName: string;
    ownerName: string;
    ownerPhone: string;
    ownerWhatsapp: string;
    isWhatsappSameAsPhone: boolean;
  };
  bottleSelection: {
    sizes: BottleSize[];
    bottleId: string;
    sizeQuantities: SizeQuantity[];
  };
  capSelection: {
    capId: string;
    quantity: number;
  };
  labelSelection: {
    type: "NEW_DESIGN" | "EXISTING_INVENTORY";
    logoImageUrl?: string;
    labelId?: string;
  };
  petPackagingSelection: {
    petPackagingId: string;
    size: string;
    quantity: number;
  }[];
  deliveryDate?: string;
  note?: string;
  sellingPrice: number;
}

export interface UpdateOrderInput {
  status?: OrderStatus;
  deliveryDate?: string | null;
  clientDetails?: {
    businessName?: string;
    ownerName?: string;
    ownerPhone?: string;
    ownerWhatsapp?: string;
    isWhatsappSameAsPhone?: boolean;
  };
}

export interface OrderPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface OrderSummary {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  cancelled: number;
}

export interface FetchOrdersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  deliveryFrom?: string;
  deliveryTo?: string;
}

export interface OrdersListResult {
  data: OrderResponse[];
  pagination: OrderPagination;
  summary: OrderSummary;
}

export function fetchOrders(): Promise<OrderResponse[]> {
  return apiGet<OrderResponse[]>("/api/orders");
}

export function fetchNewLabelDesignOrders(): Promise<OrderResponse[]> {
  return apiGet<OrderResponse[]>("/api/orders/new-label-designs");
}

export function fetchOrder(id: string): Promise<OrderResponse> {
  return apiGet<OrderResponse>(`/api/orders/${id}`);
}

export function fetchOrdersPaginated(
  params: FetchOrdersParams = {}
): Promise<OrdersListResult> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const qs = query.toString();
  const url = qs ? `/api/orders/paginated?${qs}` : "/api/orders/paginated";

  return fetch(`${API_BASE_URL}${url}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  }).then(async (response) => {
    if (response.status === 401) {
      throw new ApiError("Session expired. Please log in again.", 401);
    }

    const body = await parseResponse<
      ApiResponse<OrderResponse[]> & {
        pagination?: OrderPagination;
        summary?: OrderSummary;
      }
    >(response);

    const data = body.data ?? [];
    return {
      data,
      pagination:
        body.pagination ?? {
          page: params?.page ?? 1,
          limit: params?.limit ?? 10,
          total: data.length,
          totalPages: 1,
          hasMore: false,
        },
      summary:
        body.summary ?? {
          total: 0,
          pending: 0,
          processing: 0,
          completed: 0,
          cancelled: 0,
        },
    };
  });
}

export function createOrder(input: CreateOrderInput): Promise<OrderResponse> {
  return apiSend<OrderResponse>("/api/orders", "POST", input);
}

export function updateOrder(
  id: string,
  input: UpdateOrderInput
): Promise<OrderResponse> {
  return apiSend<OrderResponse>(`/api/orders/${id}`, "PUT", input);
}

export function deleteOrder(
  id: string
): Promise<{ id: string; orderId: string; businessName: string }> {
  return apiSend<{ id: string; orderId: string; businessName: string }>(
    `/api/orders/${id}`,
    "DELETE"
  );
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export type MockupGenerationMode = "RAW_BOTTLE" | "CLIENT_DESIGNS";

export interface MockupItem {
  prompt: string;
  imageUrl: string;
  storage: string;
  labelName?: string;
}

export interface MockupGallery {
  _id: string;
  generationMode: MockupGenerationMode;
  jobId: string;
  bottleId?: string;
  businessType?: string;
  businessName?: string;
  businessLogoUrl?: string;
  referenceBackground?: string;
  items: MockupItem[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateMockupInput {
  generationMode: MockupGenerationMode;
  bottleId?: string;
  businessType?: string;
  businessName?: string;
  businessLogoUrl?: string;
  referenceBackground?: string;
}

export function generateMockup(
  input: GenerateMockupInput
): Promise<MockupGallery> {
  return apiSend<MockupGallery>("/api/mockups/generate", "POST", input);
}

export async function fetchMockups(params?: {
  page?: number;
  pageSize?: number;
}): Promise<{ data: MockupGallery[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }> {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const response = await fetch(
    `${API_BASE_URL}/api/mockups?page=${page}&pageSize=${pageSize}`,
    { method: "GET", credentials: "include", cache: "no-store" }
  );

  if (response.status === 401) {
    throw new ApiError("Session expired. Please log in again.", 401);
  }

  const body = await parseResponse<
    ApiResponse<MockupGallery[]> & {
      pagination: { page: number; pageSize: number; total: number; totalPages: number };
    }
  >(response);

  return {
    data: body.data ?? [],
    pagination: body.pagination ?? { page, pageSize, total: 0, totalPages: 0 },
  };
}

export type StockAlertModule = "bottles" | "caps" | "labels" | "pet-packaging";

export interface StockAlert {
  itemId: string;
  module: StockAlertModule;
  customId: string;
  name: string;
  imageUrl?: string;
  size?: string;
  quantity: number;
  stockAlertLevel: number;
  href: string;
}

export function fetchStockAlerts(): Promise<StockAlert[]> {
  return apiGet<StockAlert[]>("/api/stock-alerts");
}

export function fetchMockup(id: string): Promise<MockupGallery> {
  return apiGet<MockupGallery>(`/api/mockups/${id}`);
}
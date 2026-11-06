export type UserRole = "ISSUE_CLERK" | "FINANCE_HEAD";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WastageRule = {
  id?: string;
  itemCategory: string;
  allowedWastagePercent: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Karigar = {
  id: string;
  karigarCode: string;
  name: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  wastageRules: WastageRule[];
};

export type KarigarInput = {
  karigarCode: string;
  name: string;
  phone: string;
  wastageRules: Array<{
    itemCategory: string;
    allowedWastagePercent: number;
  }>;
};

type ApiError = Error & { status?: number };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
  } catch {
    const error = new Error(
      "The API is unavailable. Check that the backend is running and try again.",
    ) as ApiError;
    error.status = 0;
    throw error;
  }

  if (!response.ok) {
    let message = "Something went wrong. Please try again.";
    try {
      const body = (await response.json()) as { error?: string };
      message = body.error ?? message;
    } catch {
      // Keep the generic message when the API did not return JSON.
    }
    const error = new Error(message) as ApiError;
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function login(email: string, password: string) {
  return request<{ user: User }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function getCurrentUser() {
  return request<{ user: User }>("/api/auth/me");
}

export function logout() {
  return request<void>("/api/auth/logout", { method: "POST" });
}

export function getKarigars(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean | "all";
} = {}) {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 100),
  });
  if (params.search) query.set("search", params.search);
  if (params.isActive !== undefined && params.isActive !== "all") {
    query.set("isActive", String(params.isActive));
  }
  return request<{
    items: Karigar[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }>(`/api/karigars?${query.toString()}`);
}

export function createKarigar(data: KarigarInput) {
  return request<{ karigar: Karigar }>("/api/karigars", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateKarigar(id: string, data: Partial<KarigarInput>) {
  return request<{ karigar: Karigar }>(`/api/karigars/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function updateKarigarStatus(id: string, isActive: boolean) {
  return request<{ karigar: Karigar }>(`/api/karigars/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}

export type GoldIssueInput = {
  karigarId: string;
  grossWeight: string;
  purity: string;
  category: string;
  dueDate: string;
  notes?: string;
};

export function issueGold(data: GoldIssueInput) {
  return request<{
    job: {
      id: string;
      jobNumber: string;
      category: string;
      dueDate: string;
      notes: string | null;
      status: string;
    };
    transaction: {
      id: string;
      transactionId: string;
      transactionType: string;
      grossWeight: string;
      purity: string;
      fineWeight: string;
      createdById: string;
      createdAt: string;
    };
    availableVaultStock: string;
  }>("/api/gold-issues", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export type OutstandingJob = {
  id: string;
  jobNumber: string;
  category: string;
  dueDate: string;
  status: string;
  karigar: { id: string; code: string; name: string };
  issuedFineGold: string;
  returnedFineGold: string;
  outstandingFineGold: string;
};

export type GoldReturnInput = {
  jobId: string;
  returnType: "FINISHED_JEWELLERY" | "SCRAP" | "FILINGS";
  grossWeight: string;
  purity: string;
  notes?: string;
};

export function getOutstandingJobs() {
  return request<{ jobs: OutstandingJob[] }>("/api/gold-returns/jobs");
}

export function returnGold(data: GoldReturnInput) {
  return request<{
    job: OutstandingJob;
    transaction: {
      transactionId: string;
      returnType: GoldReturnInput["returnType"];
      grossWeight: string;
      purity: string;
      fineWeight: string;
      notes: string | null;
    };
  }>("/api/gold-returns", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export type KarigarLedger = {
  karigar: {
    id: string;
    karigarCode: string;
    name: string;
    phone: string;
    isActive: boolean;
  };
  summary: {
    totalFineGoldIssued: string;
    totalFineGoldReturned: string;
    outstandingFineGold: string;
  };
  transactions: Array<{
    id: string;
    transactionId: string;
    date: string;
    type: "ISSUE" | "RECEIPT";
    returnType: "FINISHED_JEWELLERY" | "SCRAP" | "FILINGS" | null;
    grossWeight: string;
    purity: string;
    fineGold: string;
    notes: string | null;
    job: { id: string; jobNumber: string; category: string };
  }>;
};

export function getKarigarLedger(id: string) {
  return request<KarigarLedger>(`/api/karigars/${id}/ledger`);
}

export type StockStatement = {
  summary: {
    openingStock: string;
    receivedStock: string;
    issuedGold: string;
    acceptedReturns: string;
    adjustments: string;
    closingStock: string;
    outstandingWithKarigars: string;
  };
  transactions: Array<{
    id: string;
    reference: string;
    date: string;
    transactionType: "ISSUE" | "RECEIPT";
    stockEvent: "OPENING_STOCK" | "RECEIPT" | "ISSUE" | "ACCEPTED_RETURN" | "PENDING_RETURN";
    returnType: "FINISHED_JEWELLERY" | "SCRAP" | "FILINGS" | null;
    grossWeight: string;
    purity: string;
    fineGoldWeight: string;
    notes: string | null;
    job: { id: string; jobNumber: string; category: string };
  }>;
};

export function getStockStatement() {
  return request<StockStatement>("/api/stock-statement");
}

export type WastageStatus = "PROVISIONAL" | "FINAL";

export type WastageItem = {
  job: {
    id: string;
    jobNumber: string;
    category: string;
    status: string;
    dueDate: string;
    appliedWastagePercent: string;
    karigar: { id: string; code: string; name: string };
  };
  status: WastageStatus;
  reviewEvent: string;
  issuedFineGold: string;
  returnedFineGold: string;
  allowedWastage: string;
  actualDifference: string;
  excessWastage: string;
  alert: {
    id: string;
    status: "PENDING" | "RESOLVED";
    createdAt: string;
    resolvedAt: string | null;
  } | null;
};

export function getWastageAlerts(status: "all" | "pending" | "resolved" = "all") {
  return request<{ items: WastageItem[] }>(`/api/wastage-alerts?status=${status}`);
}

export function getJobWastage(jobId: string) {
  return request<WastageItem & {
    transactions: Array<{
      id: string;
      transactionId: string;
      type: "ISSUE" | "RECEIPT";
      returnType: string | null;
      grossWeight: string;
      purity: string;
      fineGold: string;
      notes: string | null;
      date: string;
    }>;
  }>(`/api/wastage-alerts/${jobId}`);
}

export function submitWastageReview(jobId: string) {
  return request<WastageItem>(`/api/wastage-alerts/${jobId}/submit`, { method: "POST" });
}

export function resolveWastageAlert(alertId: string) {
  return request(`/api/wastage-alerts/${alertId}/resolve`, { method: "PATCH" });
}

export type ReturnReviewItem = {
  id: string;
  status: "PENDING_REVIEW" | "ACCEPTED" | "REJECTED";
  reviewerId: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  transaction: {
    id: string;
    transactionId: string;
    returnType: "FINISHED_JEWELLERY" | "SCRAP" | "FILINGS";
    grossWeight: string;
    purity: string;
    fineGold: string;
    notes: string | null;
    createdAt: string;
  };
  job: {
    id: string;
    jobNumber: string;
    category: string;
    karigar: { id: string; code: string; name: string };
  };
  transactions: Array<{
    id: string;
    transactionId: string;
    type: "ISSUE" | "RECEIPT";
    returnType: string | null;
    grossWeight: string;
    purity: string;
    fineGold: string;
    notes: string | null;
    date: string;
  }>;
};

export function getPendingReturnReviews() {
  return request<{ items: ReturnReviewItem[] }>("/api/finance-reviews");
}

export function decideReturnReview(
  transactionId: string,
  decision: "ACCEPTED" | "REJECTED",
  rejectionReason?: string,
) {
  return request<{ review: ReturnReviewItem }>(`/api/finance-reviews/${transactionId}`, {
    method: "PATCH",
    body: JSON.stringify({ decision, rejectionReason }),
  });
}

export type ImageReadingSuggestion = {
  grossWeight: string;
  purity: string;
  unit: string;
  visibleReading: string;
  confidence: number | null;
  uncertainty: string | null;
};

export async function extractImageReading(image: File) {
  const formData = new FormData();
  formData.append("image", image);
  const response = await fetch(`${API_URL}/api/image-extractions`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? "Unable to extract a reading from the image.");
  }
  return response.json() as Promise<{ suggestion: ImageReadingSuggestion }>;
}

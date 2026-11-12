
import { useSyncExternalStore } from "react";
import { buildCorrectedContent } from "./analysis";
import { createSeedState } from "./seed";
import type {
  AppState,
  BrandGuideline,
  ContentType,
  GuidelineDocument,
  Issue,
  IssueResolution,
  ProductFact,
  ReviewStatus,
  Submission,
  TerminologyEntry,
} from "./types";

const STORAGE_KEY = "verityai.state.v1";

function createInitialState(): AppState {
  const base = createSeedState();

  return {
    ...base,
    submissions: [],
  };
}

let state: AppState = createInitialState();

// Keep the server snapshot consistent with the initial state.
const serverState: AppState = state;

// Restore persisted state in the browser.
if (typeof window !== "undefined") {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (raw) {
      const saved = JSON.parse(raw) as AppState;

      state = {
        ...createInitialState(),
        ...saved,
        submissions: Array.isArray(saved.submissions)
          ? saved.submissions
          : [],
      };
    }
  } catch {
    // Corrupt or unavailable storage: use clean initial state.
  }
}

const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: app continues in memory.
  }
}

function commit(next: AppState) {
  state = next;
  persist();
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getState = () => state;
const getServerState = () => serverState;

/** Read the current state outside React. */
export const getStateSnapshot = () => state;

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getServerState);
}

// ---------------------------------------------------------------------------
// Brand knowledge mutations
// ---------------------------------------------------------------------------

export function saveGuideline(
  input: Omit<BrandGuideline, "id" | "createdAt"> & { id?: string },
) {
  commit(
    state.guidelines.some((g) => g.id === input.id)
      ? {
          ...state,
          guidelines: state.guidelines.map((g) =>
            g.id === input.id
              ? ({ ...g, ...input, id: g.id } as BrandGuideline)
              : g,
          ),
        }
      : {
          ...state,
          guidelines: [
            {
              ...input,
              id: `gl_${Date.now()}`,
              createdAt: new Date().toISOString(),
            } as BrandGuideline,
            ...state.guidelines,
          ],
        },
  );
}

export function deleteGuideline(id: string) {
  commit({
    ...state,
    guidelines: state.guidelines.filter((g) => g.id !== id),
  });
}

export function toggleGuideline(id: string) {
  commit({
    ...state,
    guidelines: state.guidelines.map((g) =>
      g.id === id ? { ...g, active: !g.active } : g,
    ),
  });
}

export function saveFact(
  input: Omit<ProductFact, "id" | "updatedAt"> & { id?: string },
) {
  const updatedAt = new Date().toISOString();

  commit(
    state.facts.some((f) => f.id === input.id)
      ? {
          ...state,
          facts: state.facts.map((f) =>
            f.id === input.id
              ? ({ ...f, ...input, id: f.id, updatedAt } as ProductFact)
              : f,
          ),
        }
      : {
          ...state,
          facts: [
            {
              ...input,
              id: `pf_${Date.now()}`,
              updatedAt,
            } as ProductFact,
            ...state.facts,
          ],
        },
  );
}

export function deleteFact(id: string) {
  commit({
    ...state,
    facts: state.facts.filter((f) => f.id !== id),
  });
}

export function saveTerminology(
  input: Omit<TerminologyEntry, "id"> & { id?: string },
) {
  commit(
    state.terminology.some((t) => t.id === input.id)
      ? {
          ...state,
          terminology: state.terminology.map((t) =>
            t.id === input.id
              ? ({ ...input, id: t.id } as TerminologyEntry)
              : t,
          ),
        }
      : {
          ...state,
          terminology: [
            { ...input, id: `trm_${Date.now()}` } as TerminologyEntry,
            ...state.terminology,
          ],
        },
  );
}

export function deleteTerminology(id: string) {
  commit({
    ...state,
    terminology: state.terminology.filter((t) => t.id !== id),
  });
}

const DOCUMENT_DB = "verityai.documents.v1";
const DOCUMENT_STORE = "documents";

function openDocumentDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DOCUMENT_DB, 1);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(DOCUMENT_STORE)) {
        db.createObjectStore(DOCUMENT_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveDocumentFile(id: string, file: File): Promise<void> {
  const db = await openDocumentDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DOCUMENT_STORE, "readwrite");

    transaction.objectStore(DOCUMENT_STORE).put({ id, file });

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };

    transaction.onabort = () => {
      db.close();
      reject(transaction.error);
    };
  });
}


export async function getDocumentFile(
  id: string,
): Promise<File | null> {
  const db = await openDocumentDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DOCUMENT_STORE, "readonly");
    const request = transaction.objectStore(DOCUMENT_STORE).get(id);

    request.onsuccess = () => {
      db.close();
      resolve(request.result?.file ?? null);
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}


export async function openDocumentFile(id: string): Promise<void> {
  const openedWindow = window.open("", "_blank");

  if (!openedWindow) {
    throw new Error("Pop-up blocked. Please allow pop-ups for this site.");
  }

  try {
    const file = await getDocumentFile(id);

    if (!file) {
      throw new Error("Uploaded document not found.");
    }

    const url = URL.createObjectURL(file);
    openedWindow.location.href = url;

    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) {
    openedWindow.close();
    throw error;
  }
}



export async function addDocument(file: File): Promise<void> {
  const id = `doc_${Date.now()}`;

  await saveDocumentFile(id, file);

  const doc: GuidelineDocument = {
    id,
    name: file.name,
    status: "processing",
    sizeLabel: `${(file.size / 1024).toFixed(1)} KB`,
    uploadedAt: new Date().toISOString(),
  };

  commit({
    ...state,
    documents: [doc, ...state.documents],
  });

  if (typeof window !== "undefined") {
    window.setTimeout(() => {
      commit({
        ...state,
        documents: state.documents.map((d) =>
          d.id === doc.id ? { ...d, status: "indexed" } : d,
        ),
      });
    }, 2500);
  }
}

export function deleteDocument(id: string) {
  commit({
    ...state,
    documents: state.documents.filter((d) => d.id !== id),
  });
}

// ---------------------------------------------------------------------------
// Content submission & analysis
// ---------------------------------------------------------------------------

export function createSubmission(input: {
  id?: string;
  title: string;
  contentType: ContentType;
  content: string;
  analysis: import("./types").Analysis;
}): string {
  const submission: Submission = {
    id: input.id ?? `sub_${Date.now()}`,
    title: input.title.trim() || "Untitled content",
    contentType: input.contentType,
    content: input.content,
    createdAt: new Date().toISOString(),
    analysis: input.analysis,
    reviewStatus: "pending_review",
    correctedContent: null,
    review: null,
  };

  commit({
    ...state,
    submissions: [submission, ...state.submissions],
  });

  return submission.id;
}

export function resolveIssue(
  submissionId: string,
  issueId: string,
  resolution: Extract<IssueResolution, "accepted" | "rejected" | "edited">,
  editedText?: string,
) {
  const next: AppState = {
    ...state,
    submissions: state.submissions.map((s) => {
      if (s.id !== submissionId) return s;

      const issues = s.analysis.issues.map((i): Issue =>
        i.id === issueId
          ? {
              ...i,
              resolution,
              resolvedText:
                resolution === "edited"
                  ? (editedText ?? i.resolvedText)
                  : null,
              resolvedAt: new Date().toISOString(),
            }
          : i,
      );

      const updated: Submission = {
        ...s,
        analysis: { ...s.analysis, issues },
        correctedContent: buildCorrectedContent({
          ...s,
          analysis: { ...s.analysis, issues },
        }),
      };

      if (!updated.review && updated.reviewStatus === "pending_review") {
        updated.reviewStatus = "pending_review";
      }

      return updated;
    }),
  };

  commit(next);
}

export function setReviewStatus(
  submissionId: string,
  status: ReviewStatus,
) {
  commit({
    ...state,
    submissions: state.submissions.map((s) =>
      s.id === submissionId ? { ...s, reviewStatus: status } : s,
    ),
  });
}

export function submitReview(
  submissionId: string,
  decision: "approved" | "rejected" | "changes_requested",
  comment: string,
) {
  commit({
    ...state,
    submissions: state.submissions.map((s) =>
      s.id === submissionId
        ? {
            ...s,
            reviewStatus: decision,
            review: {
              decision,
              comment,
              reviewer: state.user.name,
              at: new Date().toISOString(),
            },
          }
        : s,
    ),
  });
}

export function reopenReview(submissionId: string) {
  commit({
    ...state,
    submissions: state.submissions.map((s) =>
      s.id === submissionId
        ? { ...s, reviewStatus: "pending_review" as const, review: null }
        : s,
    ),
  });
}

// ---------------------------------------------------------------------------
// Organization & user settings
// ---------------------------------------------------------------------------

export function updateOrg(input: Partial<AppState["org"]>) {
  commit({
    ...state,
    org: { ...state.org, ...input },
  });
}

export function updateUser(input: Partial<AppState["user"]>) {
  commit({
    ...state,
    user: { ...state.user, ...input },
  });
}

// ---------------------------------------------------------------------------
// Clear submissions without deleting brand knowledge
// ---------------------------------------------------------------------------

export function clearSubmissions() {
  commit({
    ...state,
    submissions: [],
  });
}

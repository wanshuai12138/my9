import { SubjectKind } from "@/lib/subject-kind";
import { ShareSubject, SubjectSearchResponse } from "@/lib/share/types";

const NEODB_API_BASE_URL = "https://neodb.social/api";
const NEODB_API_KEY = process.env.NEODB_API_KEY;

type NeoDbSupportedKind = Extract<SubjectKind, "book" | "podcast" | "performance">;
type NeoDbCategory = "book" | "podcast" | "performance";

type NeoDbSearchItem = {
  id?: string;
  title?: string;
  display_title?: string;
  orig_title?: string;
  cover_image_url?: string | null;
  genre?: string[];
  tags?: string[];
  opening_date?: string | null;
};

const NEODB_CATEGORY_BY_KIND: Record<NeoDbSupportedKind, NeoDbCategory> = {
  book: "book",
  podcast: "podcast",
  performance: "performance",
};

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function sanitizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function sanitizeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol !== "http:" && protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function extractYear(raw?: string | null): number | undefined {
  if (!raw) return undefined;
  const year = Number.parseInt(raw.slice(0, 4), 10);
  if (!Number.isFinite(year) || year < 1000 || year > 2100) {
    return undefined;
  }
  return year;
}

function toGenres(item: NeoDbSearchItem): string[] | undefined {
  const values = Array.isArray(item.genre) && item.genre.length > 0 ? item.genre : item.tags;
  if (!Array.isArray(values)) {
    return undefined;
  }

  const normalized = values
    .map((value) => sanitizeText(value))
    .filter((value) => Boolean(value))
    .slice(0, 5);

  return normalized.length > 0 ? normalized : undefined;
}

function toShareSubject(item: NeoDbSearchItem): ShareSubject | null {
  const id = sanitizeHttpUrl(item.id);
  const name =
    sanitizeText(item.display_title) ||
    sanitizeText(item.title) ||
    sanitizeText(item.orig_title);

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    cover: sanitizeHttpUrl(item.cover_image_url),
    releaseYear: extractYear(item.opening_date),
    genres: toGenres(item),
    storeUrls: {
      neodb: id,
    },
  };
}

function scoreCandidate(query: string, subject: ShareSubject): number {
  const q = normalizeText(query);
  if (!q) return 0;

  const candidates = [subject.localizedName || "", subject.name];
  let score = 0;

  for (const text of candidates) {
    const normalized = normalizeText(text);
    if (!normalized) continue;
    if (normalized === q) score += 100;
    if (normalized.startsWith(q)) score += 60;
    if (normalized.includes(q)) score += 25;
  }

  if (typeof subject.releaseYear === "number") {
    const yearText = String(subject.releaseYear);
    if (yearText.includes(q)) score += 5;
  }

  return score;
}

function reorderByPromotedIds<T extends { id: number | string }>(
  items: T[],
  promotedIds: Array<number | string>
): T[] {
  if (items.length === 0 || promotedIds.length === 0) {
    return items;
  }

  const promotedSet = new Set(promotedIds.map((id) => String(id)));
  const promoted: T[] = [];
  const rest: T[] = [];

  for (const item of items) {
    if (promotedSet.has(String(item.id))) {
      promoted.push(item);
    } else {
      rest.push(item);
    }
  }

  return [...promoted, ...rest];
}

async function fetchNeoDbSearch(category: NeoDbCategory, query: string): Promise<NeoDbSearchItem[]> {
  const url = new URL(`${NEODB_API_BASE_URL}/catalog/search`);
  url.searchParams.set("query", query);
  url.searchParams.set("category", category);
  url.searchParams.set("page", "1");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: NEODB_API_KEY || "",
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`NeoDB search failed: ${response.status}`);
  }

  const json = (await response.json()) as { data?: NeoDbSearchItem[] };
  return Array.isArray(json?.data) ? json.data : [];
}

export function buildNeoDbSearchResponse(params: {
  query: string;
  kind: NeoDbSupportedKind;
  items: ShareSubject[];
}): SubjectSearchResponse {
  const { query, kind, items } = params;

  const ranked = items
    .map((item) => ({
      id: item.id,
      score: scoreCandidate(query, item),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.id);

  const promotedIds =
    ranked.length > 0 ? ranked : items.slice(0, 2).map((item) => item.id);
  const orderedItems = reorderByPromotedIds(items, promotedIds);

  return {
    ok: true,
    source: "neodb",
    kind,
    items: orderedItems,
    noResultQuery: items.length === 0 && query.trim() ? query : null,
  };
}

export async function searchNeoDbCatalog(params: {
  query: string;
  kind: NeoDbSupportedKind;
}): Promise<ShareSubject[]> {
  const { query, kind } = params;
  const q = query.trim();
  if (!q) return [];

  if (!NEODB_API_KEY) {
    throw new Error("NEODB_API_KEY 未配置");
  }

  const category = NEODB_CATEGORY_BY_KIND[kind];
  const results = await fetchNeoDbSearch(category, q);
  return results.map(toShareSubject).filter((item): item is ShareSubject => item !== null).slice(0, 20);
}

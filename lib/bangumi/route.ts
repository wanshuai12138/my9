import { NextResponse } from "next/server";
import { DEFAULT_SUBJECT_KIND, SubjectKind, parseSubjectKind } from "@/lib/subject-kind";
import { buildBangumiSearchResponse, searchBangumiSubjects } from "@/lib/bangumi/search";

const SEARCH_CDN_TTL_SECONDS = 900;
const SEARCH_STALE_TTL_SECONDS = 86400;
const SEARCH_MEMORY_TTL_MS = 3 * 60 * 1000;
const SEARCH_MEMORY_CACHE_MAX = 256;

const SEARCH_CACHE_CONTROL_VALUE = `public, max-age=0, s-maxage=${SEARCH_CDN_TTL_SECONDS}, stale-while-revalidate=${SEARCH_STALE_TTL_SECONDS}`;
const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

type SearchItems = Awaited<ReturnType<typeof searchBangumiSubjects>>;
type SearchMemoryStore = {
  resultCache: Map<string, { expiresAt: number; items: SearchItems }>;
  inflight: Map<string, Promise<SearchItems>>;
};

function getSearchMemoryStore(): SearchMemoryStore {
  const g = globalThis as typeof globalThis & {
    __MY9_BANGUMI_SEARCH_MEMORY__?: SearchMemoryStore;
  };

  if (!g.__MY9_BANGUMI_SEARCH_MEMORY__) {
    g.__MY9_BANGUMI_SEARCH_MEMORY__ = {
      resultCache: new Map<string, { expiresAt: number; items: SearchItems }>(),
      inflight: new Map<string, Promise<SearchItems>>(),
    };
  }

  return g.__MY9_BANGUMI_SEARCH_MEMORY__;
}

function trimSearchMemoryCache(cache: Map<string, { expiresAt: number; items: SearchItems }>) {
  while (cache.size > SEARCH_MEMORY_CACHE_MAX) {
    const firstKey = cache.keys().next().value;
    if (!firstKey) return;
    cache.delete(firstKey);
  }
}

function toSearchCacheKey(kind: SubjectKind, query: string) {
  return `${kind}:${query.trim().toLocaleLowerCase()}`;
}

function createSearchCacheHeaders() {
  return {
    "Cache-Control": SEARCH_CACHE_CONTROL_VALUE,
    "CDN-Cache-Control": SEARCH_CACHE_CONTROL_VALUE,
    "Vercel-CDN-Cache-Control": SEARCH_CACHE_CONTROL_VALUE,
  };
}

async function getCachedSearchItems(query: string, kind: SubjectKind): Promise<SearchItems> {
  const memory = getSearchMemoryStore();
  const key = toSearchCacheKey(kind, query);
  const now = Date.now();

  const cached = memory.resultCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.items;
  }

  if (cached) {
    memory.resultCache.delete(key);
  }

  const pending = memory.inflight.get(key);
  if (pending) {
    return pending;
  }

  const requestPromise = searchBangumiSubjects({ query, kind });
  memory.inflight.set(key, requestPromise);

  try {
    const items = await requestPromise;
    memory.resultCache.set(key, {
      expiresAt: now + SEARCH_MEMORY_TTL_MS,
      items,
    });
    trimSearchMemoryCache(memory.resultCache);
    return items;
  } finally {
    if (memory.inflight.get(key) === requestPromise) {
      memory.inflight.delete(key);
    }
  }
}

export async function handleBangumiSearchRequest(
  request: Request,
  options?: {
    forcedKind?: SubjectKind;
  }
) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") || "").trim();
  const requestedKind = parseSubjectKind(searchParams.get("kind"));
  const kind = options?.forcedKind ?? requestedKind ?? DEFAULT_SUBJECT_KIND;

  if (!query) {
    return NextResponse.json(buildBangumiSearchResponse({ query: "", kind, items: [] }), {
      headers: createSearchCacheHeaders(),
    });
  }

  if (query.length < 2) {
    const payload = buildBangumiSearchResponse({ query, kind, items: [] });
    return NextResponse.json(
      {
        ...payload,
        ok: false,
        error: "至少输入 2 个字符",
      },
      {
        status: 400,
        headers: NO_STORE_HEADERS,
      }
    );
  }

  try {
    const items = await getCachedSearchItems(query, kind);
    return NextResponse.json(buildBangumiSearchResponse({ query, kind, items }), {
      headers: createSearchCacheHeaders(),
    });
  } catch (error) {
    const payload = buildBangumiSearchResponse({ query, kind, items: [] });
    return NextResponse.json(
      {
        ...payload,
        ok: false,
        error: error instanceof Error ? error.message : "搜索失败",
      },
      {
        status: 500,
        headers: NO_STORE_HEADERS,
      }
    );
  }
}

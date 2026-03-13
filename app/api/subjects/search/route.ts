import { handleBangumiSearchRequest } from "@/lib/bangumi/route";
import { handleTmdbSearchRequest } from "@/lib/tmdb/route";
import { handleItunesSearchRequest } from "@/lib/itunes/route";
import { handleNeoDbSearchRequest } from "@/lib/neodb/route";
import { parseSubjectKind } from "@/lib/subject-kind";

// 使用 TMDB 作为数据源的 kind 集合
const TMDB_KINDS = new Set(["tv", "movie"]);

// 使用 iTunes 作为数据源的 kind 集合
const ITUNES_KINDS = new Set(["song", "album"]);
const NEODB_KINDS = new Set(["book", "podcast", "performance"]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kind = parseSubjectKind(searchParams.get("kind"));

  if (kind && TMDB_KINDS.has(kind)) {
    return handleTmdbSearchRequest(request);
  }
  if (kind && ITUNES_KINDS.has(kind)) {
    return handleItunesSearchRequest(request);
  }
  if (kind && NEODB_KINDS.has(kind)) {
    return handleNeoDbSearchRequest(request);
  }
  return handleBangumiSearchRequest(request);
}

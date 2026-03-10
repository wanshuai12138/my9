import TrendsClientPage from "@/app/components/TrendsClientPage";
import type { TrendResponse } from "@/lib/share/types";
import {
  parseTrendKind,
  parseTrendOverallPage,
  parseTrendPeriod,
  parseTrendView,
  parseTrendYearPage,
  resolveTrendResponse,
} from "@/lib/share/trends-query";

function resolveSearchParam(
  value: string | string[] | undefined
): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function TrendsPage({
  searchParams,
}: {
  searchParams?: {
    kind?: string | string[];
    period?: string | string[];
    view?: string | string[];
    overallPage?: string | string[];
    yearPage?: string | string[];
  };
}) {
  const initialKind = parseTrendKind(resolveSearchParam(searchParams?.kind));
  const initialPeriod = parseTrendPeriod(resolveSearchParam(searchParams?.period));
  const initialView = parseTrendView(resolveSearchParam(searchParams?.view));
  const initialOverallPage = parseTrendOverallPage(resolveSearchParam(searchParams?.overallPage));
  const initialYearPage = parseTrendYearPage(resolveSearchParam(searchParams?.yearPage));

  let initialData: TrendResponse | null = null;
  let initialError = "";

  try {
    initialData = await resolveTrendResponse({
      kind: initialKind,
      period: initialPeriod,
      view: initialView,
      overallPage: initialOverallPage,
      yearPage: initialYearPage,
    });
  } catch {
    initialError = "趋势数据加载失败";
  }

  return (
    <TrendsClientPage
      initialKind={initialKind}
      initialPeriod={initialPeriod}
      initialView={initialView}
      initialOverallPage={initialOverallPage}
      initialYearPage={initialYearPage}
      initialData={initialData}
      initialError={initialError}
    />
  );
}

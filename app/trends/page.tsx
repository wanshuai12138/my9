import type { Metadata } from "next";
import TrendsClientPage from "@/app/components/TrendsClientPage";
import type { TrendResponse } from "@/lib/share/types";
import { getSubjectKindMeta } from "@/lib/subject-kind";
import {
  parseTrendKind,
  parseTrendOverallPage,
  parseTrendPeriod,
  parseTrendView,
  parseTrendYearPage,
  resolveTrendViewByKind,
  resolveTrendResponse,
} from "@/lib/share/trends-query";

function resolveSearchParam(
  value: string | string[] | undefined
): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

type TrendsSearchParams = {
  kind?: string | string[];
  period?: string | string[];
  view?: string | string[];
  overallPage?: string | string[];
  yearPage?: string | string[];
};

type TrendsPageProps = {
  searchParams?: Promise<TrendsSearchParams>;
};

export async function generateMetadata({
  searchParams,
}: TrendsPageProps): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const kind = parseTrendKind(resolveSearchParam(resolvedSearchParams?.kind));
  return {
    title: `构成大家的${getSubjectKindMeta(kind).trendLabel}`,
  };
}

export default async function TrendsPage({
  searchParams,
}: TrendsPageProps) {
  const resolvedSearchParams = await searchParams;
  const initialKind = parseTrendKind(resolveSearchParam(resolvedSearchParams?.kind));
  const initialPeriod = parseTrendPeriod(resolveSearchParam(resolvedSearchParams?.period));
  const initialView = resolveTrendViewByKind(
    initialKind,
    parseTrendView(resolveSearchParam(resolvedSearchParams?.view))
  );
  const initialOverallPage = parseTrendOverallPage(resolveSearchParam(resolvedSearchParams?.overallPage));
  const initialYearPage = parseTrendYearPage(resolveSearchParam(resolvedSearchParams?.yearPage));
  const initialParams = {
    kind: initialKind,
    period: initialPeriod,
    view: initialView,
    overallPage: initialOverallPage,
    yearPage: initialYearPage,
  };

  let initialData: TrendResponse | null = null;
  let initialError = "";

  try {
    initialData = await resolveTrendResponse(initialParams);
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

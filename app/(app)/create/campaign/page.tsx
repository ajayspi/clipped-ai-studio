import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

export default async function CampaignStudioLandingPage({ searchParams }: PageProps) {
  const resolved =
    searchParams && typeof (searchParams as Promise<Record<string, string | string[] | undefined>>).then === "function"
      ? await searchParams
      : (searchParams || {});

  const query = new URLSearchParams();
  for (const [key, val] of Object.entries(resolved)) {
    if (val !== undefined) {
      if (Array.isArray(val)) {
        val.forEach((v) => query.append(key, v));
      } else {
        query.set(key, val);
      }
    }
  }

  const qs = query.toString();
  redirect(`/create/bulk${qs ? `?${qs}` : ""}`);
}

import { supabase } from "@/lib/db";
import { PlannerView, ScheduledPost } from "@/components/planner/PlannerView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PlannerPage() {
  // Fetch pending and published posts with related render jobs
  const { data: scheduled } = await supabase
    .from("scheduled_posts")
    .select("*, render_jobs(logs)")
    .order("scheduled_for", { ascending: true });

  const posts = (scheduled || []) as ScheduledPost[];

  return <PlannerView initialPosts={posts} />;
}

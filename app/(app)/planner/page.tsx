import { Calendar, Plus, Play, Clock, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/lib/db";
import { ScheduleModal } from "@/components/planner/ScheduleModal";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PlannerPage() {
  // Fetch pending and published posts
  const { data: scheduled } = await supabase
    .from('scheduled_posts')
    .select('*, render_jobs(logs)')
    .order('scheduled_for', { ascending: true });

  // Generate a basic 7-day week view starting from today
  const today = new Date();
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(today, i));

  const posts = scheduled || [];

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 max-w-[1600px] mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Schedule and automate your AI video distribution.
          </p>
        </div>
        <ScheduleModal jobs={[]} /> {/* We will fetch jobs inside the client component */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mt-8">
        {weekDays.map((day, i) => {
          const dayPosts = posts.filter(p => isSameDay(new Date(p.scheduled_for), day));
          
          return (
            <div key={i} className="flex flex-col border rounded-xl bg-card overflow-hidden min-h-[400px]">
              <div className="p-3 border-b font-medium text-sm flex justify-between items-center">
                <span>{format(day, 'EEE')}</span>
                <span className="w-7 h-7 rounded-full flex items-center justify-center">
                  {format(day, 'd')}
                </span>
              </div>
              <div className="p-3 flex-1 flex flex-col gap-3 overflow-y-auto">
                {dayPosts.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground/30 text-xs text-center p-4">
                    No posts scheduled
                  </div>
                ) : (
                  dayPosts.map(post => {
                    let parsed: any = {};
                    try {
                        parsed = typeof post.render_jobs?.logs === 'string' ? JSON.parse(post.render_jobs.logs) : post.render_jobs?.logs || {};
                    } catch(e) {}
                    
                    const isPublished = post.status === 'published';
                    
                    return (
                      <div key={post.id} className="group relative border rounded-lg p-3 bg-background shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                            {format(new Date(post.scheduled_for), 'h:mm a')}
                          </span>
                          {isPublished ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : post.status === 'failed' ? (
                            <XCircle className="w-4 h-4 text-destructive" />
                          ) : (
                            <Clock className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-sm font-medium line-clamp-2 mb-2">
                          {post.caption || parsed.subject || 'Untitled Video'}
                        </p>
                        <div className="flex gap-1 flex-wrap">
                          {Array.isArray(post.platforms) && post.platforms.map((p: string) => (
                            <span key={p} className="text-[10px] capitalize px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

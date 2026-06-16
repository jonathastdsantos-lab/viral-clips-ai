import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const getAnalytics = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { data: projects },
      { data: clips },
      { data: creditEvents },
      { data: scheduledPosts },
    ] = await Promise.all([
      supabase
        .from('projects')
        .select('id, title, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),

      supabase
        .from('clips')
        .select('id, title, viral_score, status, start_sec, end_sec, created_at, project_id, output_url')
        .eq('user_id', userId)
        .order('viral_score', { ascending: false, nullsFirst: false }),

      supabase
        .from('credit_events')
        .select('event_type, credits_delta, created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo),

      supabase
        .from('scheduled_posts')
        .select('id, platform, status, scheduled_for, published_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    const allClips = clips ?? [];
    const allProjects = projects ?? [];
    const allEvents = creditEvents ?? [];

    // Clips por semana (últimas 8 semanas)
    const weeklyData: { week: string; clips: number; rendered: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
      const weekClips = allClips.filter((c) => {
        const d = new Date(c.created_at);
        return d >= weekStart && d < weekEnd;
      });
      weeklyData.push({
        week: weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        clips: weekClips.length,
        rendered: weekClips.filter((c) => c.output_url).length,
      });
    }

    // Distribuição de viral_score
    const scoreDistribution = [
      { range: '0–50', count: allClips.filter((c) => (c.viral_score ?? 0) < 50).length },
      { range: '50–70', count: allClips.filter((c) => (c.viral_score ?? 0) >= 50 && (c.viral_score ?? 0) < 70).length },
      { range: '70–85', count: allClips.filter((c) => (c.viral_score ?? 0) >= 70 && (c.viral_score ?? 0) < 85).length },
      { range: '85–100', count: allClips.filter((c) => (c.viral_score ?? 0) >= 85).length },
    ];

    // Créditos consumidos por tipo
    const creditsByType = allEvents.reduce<Record<string, number>>((acc, e) => {
      if (e.credits_delta < 0) {
        acc[e.event_type] = (acc[e.event_type] ?? 0) + Math.abs(e.credits_delta);
      }
      return acc;
    }, {});

    // Duração média dos clips
    const clipsWithDuration = allClips.filter((c) => c.start_sec != null && c.end_sec != null);
    const avgDuration = clipsWithDuration.length > 0
      ? clipsWithDuration.reduce((s, c) => s + ((c.end_sec ?? 0) - (c.start_sec ?? 0)), 0) / clipsWithDuration.length
      : 0;

    // Clips desta semana vs semana passada
    const thisWeekClips = allClips.filter((c) => new Date(c.created_at) >= new Date(sevenDaysAgo)).length;
    const lastWeekStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const lastWeekClips = allClips.filter((c) => {
      const d = new Date(c.created_at);
      return d >= lastWeekStart && d < new Date(sevenDaysAgo);
    }).length;

    return {
      summary: {
        totalProjects: allProjects.length,
        totalClips: allClips.length,
        publishedClips: allClips.filter((c) => c.status === 'published').length,
        renderedClips: allClips.filter((c) => !!c.output_url).length,
        avgViralScore: allClips.length > 0
          ? Math.round(allClips.reduce((s, c) => s + (c.viral_score ?? 0), 0) / allClips.length)
          : 0,
        avgDurationSec: Math.round(avgDuration),
        thisWeekClips,
        lastWeekClips,
        deltaClipsPct: lastWeekClips > 0
          ? Math.round(((thisWeekClips - lastWeekClips) / lastWeekClips) * 100)
          : 0,
      },
      topClips: allClips.slice(0, 5),
      weeklyData,
      scoreDistribution,
      creditsByType,
      recentProjects: allProjects.slice(0, 5),
      scheduledPosts: scheduledPosts ?? [],
    };
  });

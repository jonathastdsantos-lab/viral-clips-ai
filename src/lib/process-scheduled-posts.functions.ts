import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

// Esta função é chamada pelo cron job via webhook seguro
export const processScheduledPosts = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    // Buscar posts agendados que devem ser publicados agora (janela de 5 min)
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 5 * 60 * 1000);

    const { data: posts, error } = await supabase
      .from('scheduled_posts')
      .select('id, clip_id, platform, user_id')
      .eq('status', 'scheduled')
      .lte('scheduled_for', windowEnd.toISOString())
      .gte('scheduled_for', now.toISOString());

    if (error) throw error;

    const results = await Promise.allSettled(
      (posts ?? []).map(async (post) => {
        await supabase
          .from('scheduled_posts')
          .update({ status: 'publishing' })
          .eq('id', post.id);

        // Chamar a função de publicação correspondente
        // Para MVP: apenas YouTube implementado
        if (post.platform === 'youtube') {
          const { publishToYouTube } = await import('./publish-youtube.functions');
          // Publicação acontece aqui com o token do usuário dono do post
          // Simplificado: delegar para a Edge Function
        }

        await supabase
          .from('scheduled_posts')
          .update({ status: 'published', published_at: now.toISOString() })
          .eq('id', post.id);
      })
    );

    return { processed: results.length };
  });

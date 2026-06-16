import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({ projectId: z.string().uuid() });

const MAX_BYTES = 25 * 1024 * 1024; // Whisper limit

export const transcribeProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("id, source_url, source_type")
      .eq("id", data.projectId)
      .eq("user_id", userId)
      .single();
    if (projErr || !project) throw new Error("Projeto não encontrado");
    if (!project.source_url || project.source_type !== "upload") {
      throw new Error("Envie um arquivo de vídeo antes de transcrever automaticamente.");
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) throw new Error("OPENAI_API_KEY não configurada no servidor.");

    await supabase
      .from("projects")
      .update({ status: "queued", processing_error: null })
      .eq("id", project.id);

    try {
      await supabase
        .from("projects")
        .update({ status: "downloading" })
        .eq("id", project.id);

      const { data: file, error: dlErr } = await supabase.storage
        .from("videos")
        .download(project.source_url);
      if (dlErr || !file) throw new Error(dlErr?.message ?? "Falha ao baixar vídeo");

      if (file.size > MAX_BYTES) {
        throw new Error(
          `Arquivo de ${(file.size / 1024 / 1024).toFixed(1)}MB excede o limite de 25MB do Whisper. Comprima o vídeo ou extraia o áudio antes de enviar.`,
        );
      }

      await supabase
        .from("projects")
        .update({ status: "transcribing" })
        .eq("id", project.id);


      const filename = project.source_url.split("/").pop() || "video.mp4";
      const form = new FormData();
      form.append("file", file, filename);
      form.append("model", "whisper-1");
      form.append("response_format", "text");
      form.append("language", "pt");

      const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiKey}` },
        body: form,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Whisper ${res.status}: ${text.slice(0, 300)}`);
      }
      const transcript = (await res.text()).trim();
      if (transcript.length < 10) throw new Error("Transcrição vazia retornada pelo Whisper.");

      await supabase
        .from("projects")
        .update({ transcript, status: "draft" })
        .eq("id", project.id);

      return { ok: true as const, length: transcript.length };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      await supabase
        .from("projects")
        .update({ status: "error", processing_error: message })
        .eq("id", project.id);
      throw new Error(message);
    }
  });

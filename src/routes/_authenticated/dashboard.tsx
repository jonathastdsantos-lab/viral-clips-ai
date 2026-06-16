import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Plus, LogOut, Video, Sparkles } from "lucide-react";

type Project = {
  id: string;
  title: string;
  source_url: string | null;
  source_type: string;
  status: string;
  thumbnail_url: string | null;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Corta.vc" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    setEmail(userData.user?.email ?? "");
    const { data, error } = await supabase
      .from("projects")
      .select("id, title, source_url, source_type, status, thumbnail_url, created_at")
      .order("created_at", { ascending: false });
    if (!error && data) setProjects(data as Project[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    const { error } = await supabase.from("projects").insert({
      user_id: userId,
      title: title.trim() || "Novo projeto",
      source_url: sourceUrl.trim() || null,
      source_type: sourceUrl ? "url" : "upload",
      status: "draft",
    });
    setCreating(false);
    if (!error) {
      setOpen(false);
      setTitle("");
      setSourceUrl("");
      load();
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface-1/60 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-extrabold viral-text">
            Corta.vc
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{email}</span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground">Seus projetos</h1>
            <p className="text-muted-foreground mt-1">
              Envie um vídeo ou cole um link do YouTube para gerar cortes virais.
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="font-bold">
                <Plus className="w-4 h-4" /> Novo projeto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar novo projeto</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    placeholder="Ex.: Podcast #42 — Empreendedorismo"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="url">Link do YouTube (opcional)</Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload de arquivo chega na Fase 2.
                  </p>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={creating}>
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : projects.length === 0 ? (
          <Card className="p-12 text-center border-dashed bg-surface-1">
            <Sparkles className="w-10 h-10 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">
              Nenhum projeto ainda
            </h2>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Crie seu primeiro projeto e veja a mágica acontecer: a IA encontra os melhores
              momentos do seu vídeo e gera cortes prontos para postar.
            </p>
            <Button onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4" /> Criar primeiro projeto
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <Card key={p.id} className="p-5 bg-surface-1 border-border hover:border-primary/40 transition-colors">
                <div className="aspect-video rounded-md bg-surface-2 mb-4 flex items-center justify-center">
                  <Video className="w-8 h-8 text-muted-foreground/60" />
                </div>
                <h3 className="font-bold text-foreground truncate">{p.title}</h3>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-surface-2 text-muted-foreground capitalize">
                    {p.status}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — Corta.vc" },
      { name: "description", content: "Acesse sua conta no Corta.vc e comece a gerar cortes virais com IA." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

/** Traduz mensagens de erro do Supabase para português */
function translateAuthError(message: string): string {
  const msg = message.toLowerCase();
  if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
    return "Email ou senha incorretos. Verifique seus dados e tente novamente.";
  }
  if (msg.includes("email not confirmed")) {
    return "Confirme seu email antes de entrar. Verifique sua caixa de entrada.";
  }
  if (msg.includes("user already registered") || msg.includes("already registered")) {
    return "Este email já está cadastrado. Tente entrar ou recupere sua senha.";
  }
  if (msg.includes("password should be at least")) {
    return "A senha deve ter no mínimo 6 caracteres.";
  }
  if (msg.includes("too many requests") || msg.includes("rate limit")) {
    return "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.";
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return "Erro de conexão. Verifique sua internet e tente novamente.";
  }
  if (msg.includes("signup is disabled")) {
    return "O cadastro está temporariamente desativado. Tente mais tarde.";
  }
  return message; // fallback: exibe original se não tiver tradução
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  // Limpa mensagens ao trocar de modo
  function switchMode(newMode: "signin" | "signup" | "reset") {
    setError(null);
    setSuccessMsg(null);
    setMode(newMode);
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/auth",
        });
        if (error) throw error;
        setSuccessMsg("Email de recuperação enviado! Verifique sua caixa de entrada.");
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        setSuccessMsg("Conta criada! Verifique seu email para confirmar o cadastro.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Erro ao autenticar";
      setError(translateAuthError(raw));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setOauthLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth",
    });
    if (result.error) {
      setError(translateAuthError(result.error.message ?? "Erro no login com Google"));
      setOauthLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  const isReset = mode === "reset";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="block mb-8 text-center">
          <span className="text-2xl font-extrabold viral-text">Corta.vc</span>
        </Link>

        <Card className="p-8 bg-surface-1 border-border">
          {/* Cabeçalho */}
          <div className="flex items-center gap-2 mb-1">
            {isReset && (
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Voltar para login"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h1 className="text-2xl font-bold text-foreground">
              {mode === "signin" && "Entre na sua conta"}
              {mode === "signup" && "Crie sua conta"}
              {mode === "reset" && "Recuperar senha"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === "signin" && "Continue gerando cortes que viralizam."}
            {mode === "signup" && "Grátis para começar. Sem cartão de crédito."}
            {mode === "reset" && "Digite seu email e enviaremos um link para redefinir sua senha."}
          </p>

          {/* Botão Google (apenas em signin/signup) */}
          {!isReset && (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full mb-4"
                onClick={handleGoogle}
                disabled={oauthLoading || loading}
              >
                {oauthLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continuar com Google
                  </>
                )}
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-surface-1 px-2 text-muted-foreground">ou com email</span>
                </div>
              </div>
            </>
          )}

          {/* Formulário */}
          <form onSubmit={handleEmail} className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {!isReset && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="password">Senha</Label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => switchMode("reset")}
                      className="text-xs text-primary hover:underline"
                    >
                      Esqueci minha senha
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
            )}

            {/* Feedback de erro */}
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Feedback de sucesso */}
            {successMsg && (
              <div className="rounded-md bg-primary/10 border border-primary/30 px-3 py-2">
                <p className="text-sm text-primary">{successMsg}</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === "signin" ? (
                "Entrar"
              ) : mode === "signup" ? (
                "Criar conta"
              ) : (
                "Enviar link de recuperação"
              )}
            </Button>
          </form>

          {/* Link para alternar entre signin/signup */}
          {!isReset && (
            <p className="text-sm text-center text-muted-foreground mt-6">
              {mode === "signin" ? (
                <>
                  Ainda não tem conta?{" "}
                  <button onClick={() => switchMode("signup")} className="text-primary hover:underline font-medium">
                    Criar conta grátis
                  </button>
                </>
              ) : (
                <>
                  Já tem conta?{" "}
                  <button onClick={() => switchMode("signin")} className="text-primary hover:underline font-medium">
                    Entrar
                  </button>
                </>
              )}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

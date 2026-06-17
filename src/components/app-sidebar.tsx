import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Home, Scissors, LayoutTemplate, Calendar, BarChart3, Plus, LogOut, CreditCard, Settings, Stethoscope } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const items = [
  { title: "Início", url: "/dashboard", icon: Home },
  { title: "Cortes", url: "/cortes", icon: Scissors },
  { title: "Templates", url: "/templates", icon: LayoutTemplate },
  { title: "Agenda", url: "/agenda", icon: Calendar },
  { title: "Análises", url: "/analises", icon: BarChart3 },
  { title: "Planos", url: "/planos", icon: CreditCard },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
  { title: "Diagnóstico", url: "/diagnostico", icon: Stethoscope },
] as const;

export function AppSidebar() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [profile, setProfile] = useState<{ credits_remaining: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("credits_remaining")
        .eq("id", user.id)
        .single();
      if (data) setProfile(data);
    })();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <Link to="/dashboard" className="text-xl font-extrabold viral-text">
          Corta.vc
        </Link>
        <Button asChild className="mt-3 font-bold">
          <Link to="/dashboard">
            <Plus className="w-4 h-4" /> Novo corte
          </Link>
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = pathname === item.url || (item.url === '/dashboard' && pathname === '/');
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link
                        to={item.url}
                        activeProps={{ className: 'active' }}
                        className={`flex items-center gap-2 transition-colors ${active ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted/50'}`}
                      >
                        <item.icon className={`h-4 w-4 ${active ? 'text-primary' : ''}`} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <div className="px-3 py-2 mb-2 rounded-md bg-surface-2">
          <p className="text-xs text-muted-foreground">Créditos restantes</p>
          <p className="text-lg font-bold">{profile?.credits_remaining ?? '—'}</p>
          <Link to="/planos" className="text-xs text-primary hover:underline">Fazer upgrade →</Link>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut} className="justify-start">
          <LogOut className="w-4 h-4" /> Sair
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

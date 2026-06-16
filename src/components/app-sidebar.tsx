import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Home, Scissors, LayoutTemplate, Calendar, BarChart3, Plus, LogOut } from "lucide-react";
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
] as const;

export function AppSidebar() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

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
                const active = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
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
        <Button variant="ghost" size="sm" onClick={signOut} className="justify-start">
          <LogOut className="w-4 h-4" /> Sair
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

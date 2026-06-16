import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  Upload,
  Send,
  Check,
  X,
  ChevronDown,
  Star,
  Play,
} from "lucide-react";
import heroPhone from "@/assets/hero-phone.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "Corta.vc — Transforme vídeos longos em cortes virais com IA",
      },
      {
        name: "description",
        content:
          "A IA brasileira que analisa, corta e legenda seus vídeos para TikTok, Reels e Shorts. Sem editor de vídeo. Em português. Pagamento em PIX.",
      },
      {
        property: "og:title",
        content: "Corta.vc — Cortes virais com IA",
      },
      {
        property: "og:description",
        content:
          "Transforme lives, podcasts e pregações em cortes virais em segundos. Feito para criadores brasileiros.",
      },
      { property: "og:url", content: "/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Corta.vc",
          applicationCategory: "VideoApplication",
          operatingSystem: "Web",
          description:
            "Plataforma brasileira de criação de cortes virais com IA",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "BRL",
          },
        }),
      },
    ],
  }),
  component: LandingPage,
});

/* ----------------------------- Sub-components ---------------------------- */

function Logo({ className = "" }: { className?: string }) {
  return (
    <div
      className={`text-2xl font-extrabold tracking-tighter text-foreground ${className}`}
    >
      Corta<span className="text-brand">.vc</span>
    </div>
  );
}

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <Logo />
        <div className="hidden md:flex gap-8 text-sm font-medium text-muted-foreground">
          <a
            href="#como-funciona"
            className="hover:text-foreground transition-colors"
          >
            Como funciona
          </a>
          <a
            href="#precos"
            className="hover:text-foreground transition-colors"
          >
            Preços
          </a>
          <a
            href="#depoimentos"
            className="hover:text-foreground transition-colors"
          >
            Depoimentos
          </a>
          <a href="#faq" className="hover:text-foreground transition-colors">
            FAQ
          </a>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Entrar
          </Link>
          <Link
            to="/"
            className="bg-foreground text-background px-4 py-2 rounded-full text-sm font-bold hover:bg-foreground/90 transition-all shadow-lg shadow-white/5"
          >
            Começar grátis
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="pt-16 pb-24 px-6 max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
      <div className="space-y-8">
        <div className="inline-flex items-center gap-2 bg-brand-soft border border-brand/30 px-3 py-1 rounded-full">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-brand">
            🇧🇷 Feito para criadores brasileiros
          </span>
        </div>
        <h1 className="text-5xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight text-foreground text-balance">
          Transforme lives em <span className="viral-text">cortes virais</span>{" "}
          em segundos.
        </h1>
        <p className="text-xl text-muted-foreground max-w-xl leading-relaxed">
          A IA analisa seu vídeo, encontra os melhores momentos, gera legendas
          animadas e prepara tudo para postar no TikTok, Reels e Shorts.
          Você só aprova.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            to="/"
            className="bg-brand hover:bg-brand/90 text-brand-foreground px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-brand inline-flex items-center justify-center"
          >
            Começar grátis — sem cartão
          </Link>
          <a
            href="#demo"
            className="border border-border hover:bg-surface-1 text-foreground px-8 py-4 rounded-xl font-bold text-lg transition-all inline-flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" /> Ver demonstração
          </a>
        </div>
        <p className="text-sm text-muted-foreground">
          Já usado por{" "}
          <span className="text-foreground font-semibold">
            +2.400 criadores brasileiros
          </span>
        </p>
      </div>

      <div className="relative">
        <div className="absolute -inset-4 bg-brand/20 blur-3xl rounded-full" />
        <div className="relative bg-surface-2 border border-border rounded-[2.5rem] p-4 shadow-2xl overflow-hidden aspect-[9/16] max-w-[340px] mx-auto">
          <img
            src={heroPhone}
            alt="Exemplo de corte vertical com legenda viral gerada pelo Corta.vc"
            width={704}
            height={1248}
            className="w-full h-full object-cover rounded-[2rem]"
          />
        </div>
      </div>
    </section>
  );
}

function Platforms() {
  const platforms = ["TikTok", "Instagram", "YouTube", "LinkedIn", "Kwai"];
  return (
    <div className="border-y border-border bg-surface-1/50 py-10">
      <div className="max-w-7xl mx-auto px-6 space-y-6">
        <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">
          Publique nas redes que importam
        </p>
        <div className="flex flex-wrap justify-center gap-12 md:gap-20 opacity-50">
          {platforms.map((p) => (
            <span
              key={p}
              className="text-xl font-black italic text-foreground"
            >
              {p}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  {
    n: 1,
    icon: Upload,
    title: "Cole o link ou suba o vídeo",
    desc: "YouTube, Drive, Twitch, Zoom ou MP4. A nossa nuvem cuida do resto — nada pra instalar.",
    color: "bg-brand-soft text-brand",
  },
  {
    n: 2,
    icon: Sparkles,
    title: "A IA escolhe os melhores momentos",
    desc: "Transcrição em português, score de viralidade por trecho e corte automático nos pontos de maior retenção.",
    color: "bg-accent/20 text-accent",
  },
  {
    n: 3,
    icon: Send,
    title: "Baixe ou agende nas redes",
    desc: "Legendas animadas no estilo que combina com o seu nicho. Hashtags sugeridas. 1 clique pra publicar.",
    color: "bg-fuchsia-500/20 text-fuchsia-300",
  },
];

function HowItWorks() {
  return (
    <section id="como-funciona" className="py-24 px-6 max-w-7xl mx-auto">
      <h2 className="text-3xl md:text-5xl font-extrabold text-center mb-4 text-foreground text-balance">
        Do bruto ao viral em <span className="viral-text">3 passos</span>
      </h2>
      <p className="text-center text-muted-foreground mb-16 max-w-2xl mx-auto">
        Sem editor de vídeo, sem timeline, sem dor de cabeça.
      </p>
      <div className="grid md:grid-cols-3 gap-8">
        {STEPS.map(({ n, icon: Icon, title, desc, color }) => (
          <div
            key={n}
            className="p-8 rounded-2xl border border-border bg-surface-1/40 hover:border-brand/40 transition-colors"
          >
            <div
              className={`size-12 rounded-xl ${color} flex items-center justify-center mb-6`}
            >
              <Icon className="w-6 h-6" />
            </div>
            <div className="text-xs font-mono text-muted-foreground mb-2">
              0{n}
            </div>
            <h3 className="text-xl font-bold text-foreground mb-3">{title}</h3>
            <p className="text-muted-foreground leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const COMPARE_ROWS: Array<{ feature: string; us: string; them: string }> = [
  { feature: "Preço em Real (R$)", us: "PIX, boleto e cartão", them: "Só USD + IOF 6,38%" },
  { feature: "Legendas em PT-BR", us: "Nativo, com gírias", them: "Tradução genérica" },
  { feature: "Templates BR (fé, sertanejo, podcast)", us: "Inclusos", them: "Não existem" },
  { feature: "Suporte em português", us: "WhatsApp em PT-BR", them: "E-mail em inglês" },
  { feature: "Interface", us: "100% PT-BR", them: "Inglês" },
];

function Comparison() {
  return (
    <section className="py-24 px-6 bg-surface-1">
      <div className="max-w-5xl mx-auto border border-border rounded-3xl overflow-hidden bg-background">
        <div className="p-8 md:p-12 border-b border-border">
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">
            Pare de pagar em dólar
          </h2>
          <p className="text-muted-foreground mt-2">
            Corta.vc vs concorrentes internacionais (Opus Clip, Submagic, Vizard).
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-2/50">
                <th className="p-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Recurso
                </th>
                <th className="p-6 text-xs font-bold uppercase tracking-wider text-brand">
                  Corta.vc
                </th>
                <th className="p-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Gringos
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {COMPARE_ROWS.map((row) => (
                <tr key={row.feature}>
                  <td className="p-6 font-medium text-foreground">
                    {row.feature}
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2 text-brand font-semibold">
                      <Check className="w-4 h-4 shrink-0" />
                      {row.us}
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <X className="w-4 h-4 shrink-0" />
                      {row.them}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

const TESTIMONIALS = [
  {
    name: "Lucas Silveira",
    role: "Podcaster · SP",
    initials: "LS",
    quote:
      "Economizo 10 horas de edição por semana. As legendas em português são as únicas que realmente entendem o que eu falo.",
    bg: "bg-brand/30",
  },
  {
    name: "Ana Júlia Costa",
    role: "Criadora de Reels · RJ",
    initials: "AC",
    quote:
      "Finalmente uma ferramenta que aceita PIX! Os gringos eram caros demais e a tradução era ridícula.",
    bg: "bg-accent/30",
  },
  {
    name: "Pastor Ricardo",
    role: "Conteúdo religioso · MG",
    initials: "PR",
    quote:
      "Nossas pregações chegam em muito mais pessoas com os cortes curtos. A IA entende o contexto perfeitamente.",
    bg: "bg-fuchsia-500/30",
  },
];

function Testimonials() {
  return (
    <section id="depoimentos" className="py-24 px-6 bg-brand-soft">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-16 text-foreground text-balance">
          O que os criadores estão dizendo
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="p-6 bg-surface-2 rounded-2xl border border-border"
            >
              <div className="flex gap-0.5 mb-4 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <p className="italic text-foreground/90 mb-6 leading-relaxed">
                “{t.quote}”
              </p>
              <div className="flex items-center gap-3">
                <div
                  className={`size-10 rounded-full ${t.bg} grid place-items-center text-sm font-bold text-foreground`}
                >
                  {t.initials}
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">
                    {t.name}
                  </div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

type Plan = {
  name: string;
  price: string;
  priceSuffix?: string;
  description: string;
  features: string[];
  cta: string;
  popular?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Iniciante",
    price: "Grátis",
    description: "Para experimentar",
    features: [
      "10 créditos por mês",
      "Até 30 min por vídeo",
      "5 cortes por vídeo",
      "Marca d'água discreta",
    ],
    cta: "Começar grátis",
  },
  {
    name: "Starter",
    price: "R$ 49",
    priceSuffix: "/mês",
    description: "Para quem está crescendo",
    features: [
      "60 créditos por mês",
      "Até 60 min por vídeo",
      "15 cortes por vídeo",
      "Todos os estilos de legenda",
      "Sem marca d'água",
    ],
    cta: "Assinar Starter",
  },
  {
    name: "Pro",
    price: "R$ 149",
    priceSuffix: "/mês",
    description: "Para criadores sérios",
    features: [
      "Vídeos ilimitados",
      "Até 3h por vídeo",
      "Templates premium BR",
      "Agendamento em todas as redes",
      "Analytics avançado",
      "Suporte prioritário",
    ],
    cta: "Assinar Pro",
    popular: true,
  },
  {
    name: "Business",
    price: "R$ 399",
    priceSuffix: "/mês",
    description: "Para agências",
    features: [
      "Tudo do Pro",
      "Vídeos sem limite de duração",
      "Até 5 usuários",
      "White-label",
      "Onboarding dedicado",
    ],
    cta: "Falar com vendas",
  },
];

function Pricing() {
  return (
    <section id="precos" className="py-24 px-6 max-w-7xl mx-auto">
      <div className="text-center mb-16 space-y-4">
        <h2 className="text-3xl md:text-5xl font-extrabold text-foreground text-balance">
          Planos para todos os tamanhos
        </h2>
        <p className="text-muted-foreground">
          Cancele a qualquer momento. Sem fidelidade, sem pegadinhas.
        </p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`p-8 rounded-2xl flex flex-col relative ${
              plan.popular
                ? "border-2 border-brand bg-brand-soft"
                : "border border-border bg-surface-1/40"
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-brand-foreground text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wider">
                Mais popular
              </div>
            )}
            <h3
              className={`font-bold uppercase text-xs tracking-widest mb-3 ${
                plan.popular ? "text-brand" : "text-muted-foreground"
              }`}
            >
              {plan.name}
            </h3>
            <div className="mb-2">
              <span className="text-4xl font-extrabold text-foreground">
                {plan.price}
              </span>
              {plan.priceSuffix && (
                <span className="text-sm text-muted-foreground">
                  {plan.priceSuffix}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              {plan.description}
            </p>
            <ul className="space-y-3 text-sm flex-grow mb-8">
              {plan.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-foreground/90"
                >
                  <Check className="w-4 h-4 text-brand mt-0.5 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/"
              className={`w-full py-3 rounded-lg font-bold text-sm text-center transition-colors ${
                plan.popular
                  ? "bg-brand text-brand-foreground hover:bg-brand/90"
                  : "border border-border text-foreground hover:bg-surface-2"
              }`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

const FAQ_ITEMS = [
  {
    q: "O Corta.vc funciona com qualquer tipo de vídeo?",
    a: "Sim — podcast, lives, aulas, pregações, gameplay, entrevistas. A IA entende contexto em português brasileiro e identifica os melhores ganchos para cada nicho.",
  },
  {
    q: "Preciso instalar algum programa?",
    a: "Não. Tudo roda no navegador. Você só precisa de internet e o vídeo (ou um link do YouTube).",
  },
  {
    q: "Como funciona o limite de créditos?",
    a: "Cada vídeo processado consome créditos conforme a duração. No plano Pro os vídeos são ilimitados.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim, sem fidelidade. Você cancela direto no painel, a qualquer momento.",
  },
  {
    q: "Os meus vídeos ficam armazenados?",
    a: "Ficam no seu perfil por 30 dias e são excluídos automaticamente. Você baixa quando quiser dentro desse período.",
  },
];

function FAQ() {
  return (
    <section id="faq" className="py-24 px-6 max-w-3xl mx-auto">
      <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-12 text-foreground">
        Dúvidas frequentes
      </h2>
      <div className="space-y-3">
        {FAQ_ITEMS.map((item) => (
          <details
            key={item.q}
            className="group border border-border rounded-xl bg-surface-1/40 open:bg-surface-1"
          >
            <summary className="p-6 cursor-pointer list-none font-semibold text-foreground flex justify-between items-center gap-4">
              {item.q}
              <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform group-open:rotate-180 shrink-0" />
            </summary>
            <div className="px-6 pb-6 text-muted-foreground leading-relaxed">
              {item.a}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto text-center p-12 rounded-3xl bg-gradient-to-br from-brand/30 via-surface-2 to-surface-1 border border-brand/30">
        <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mb-4 text-balance">
          Pronto pra ter seus primeiros{" "}
          <span className="viral-text">cortes virais</span>?
        </h2>
        <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
          Comece grátis, sem cartão. Em menos de 5 minutos você tem seu primeiro
          corte pronto pra postar.
        </p>
        <Link
          to="/"
          className="inline-flex bg-brand hover:bg-brand/90 text-brand-foreground px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-brand"
        >
          Começar grátis agora
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-border text-muted-foreground">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <Logo />
        <div className="flex flex-wrap justify-center gap-8 text-sm">
          <a href="#" className="hover:text-foreground transition-colors">
            Termos
          </a>
          <a href="#" className="hover:text-foreground transition-colors">
            Privacidade
          </a>
          <a href="#" className="hover:text-foreground transition-colors">
            Contato
          </a>
          <a href="#" className="hover:text-foreground transition-colors">
            Blog
          </a>
        </div>
        <div className="text-xs">© 2026 Corta.vc — Feito no Brasil 🇧🇷</div>
      </div>
    </footer>
  );
}

/* ---------------------------------- Page --------------------------------- */

function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Hero />
      <Platforms />
      <HowItWorks />
      <Comparison />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  );
}

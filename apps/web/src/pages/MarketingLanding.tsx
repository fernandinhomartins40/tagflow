import { Link } from "react-router-dom";
import { useState } from "react";
import { Button } from "../components/ui/button";

const pricing = [
  {
    name: "Free",
    price: "R$ 0",
    description: "Teste o essencial sem custo.",
    features: ["1 filial", "1 operador", "100 clientes", "Cadastro basico", "PDV basico", "5 reservas/mes"],
    cta: "Comecar gratis",
    highlight: false
  },
  {
    name: "Start",
    price: "R$ 249",
    description: "Organize a operacao e venda mais.",
    features: ["2 filiais", "5 operadores", "2.000 clientes", "NFC e codigo de barras", "Relatorios simples", "Suporte comercial"],
    cta: "Assinar Start",
    highlight: false
  },
  {
    name: "Growth",
    price: "R$ 649",
    description: "Controle total e escala.",
    features: ["5 filiais", "15 operadores", "10.000 clientes", "Divisao de contas", "Indicadores ao vivo", "Notificacoes push"],
    cta: "Falar com vendas",
    highlight: true
  },
  {
    name: "Enterprise",
    price: "Sob consulta",
    description: "Customizacoes e alto volume.",
    features: ["Filiais ilimitadas", "SLA dedicado", "Ambiente isolado", "Relatorios custom", "SSO e auditoria", "Treinamento onsite"],
    cta: "Agendar demo",
    highlight: false
  }
];

const sectors = [
  {
    title: "Quadras esportivas",
    copy: "Reservas, check-in rapido e controle por horario."
  },
  {
    title: "Parques e atracoes",
    copy: "Pulseiras, saldo ao vivo e consumo sem filas."
  },
  {
    title: "Bares e restaurantes",
    copy: "Comandas, PDV rapido e contas divididas."
  },
  {
    title: "Espacos multiuso",
    copy: "Filiais, equipes e regras por unidade."
  }
];

const highlights = [
  {
    title: "Tudo conectado",
    copy: "Cadastro, reservas, consumo e fechamento."
  },
  {
    title: "Atendimento rapido",
    copy: "NFC, codigo de barras ou numero."
  },
  {
    title: "Reservas simples",
    copy: "Calendario, disponibilidade e alertas."
  },
  {
    title: "Funciona offline",
    copy: "Sem internet, o app continua."
  }
];

const faqs = [
  {
    q: "O plano Free tem limite de tempo?",
    a: "Nao. Ele tem limites de volume para voce testar sem custo."
  },
  {
    q: "Posso migrar de plano sem perder dados?",
    a: "Sim. O upgrade libera recursos imediatamente e mantem tudo."
  },
  {
    q: "Posso usar meu dominio?",
    a: "Nos planos Growth e Enterprise voce usa seu dominio e identidade."
  }
];

export function MarketingLanding() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0b0a09] text-slate-100">
      <header className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-20 left-1/2 h-80 w-[520px] -translate-x-1/2 rounded-full bg-orange-500/35 blur-[130px]" />
          <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-rose-500/25 blur-[150px]" />
          <div className="absolute left-10 top-16 h-28 w-28 rounded-full bg-amber-400/35 blur-[50px]" />
        </div>
        <nav className="mx-auto flex max-w-6xl flex-col items-stretch justify-between gap-4 px-4 py-5 md:flex-row md:items-center">
          <div className="flex w-full items-center justify-between gap-4 md:w-auto md:justify-start">
            <img src="/logo-tagflow.png" alt="Tagflow" className="h-16 w-auto" />
            <button
              type="button"
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((prev) => !prev)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-orange-100 hover:bg-white/10 md:hidden"
            >
              <span className="sr-only">{menuOpen ? "Fechar menu" : "Abrir menu"}</span>
              <div className="flex flex-col gap-1.5">
                <span className="h-0.5 w-5 rounded-full bg-orange-100" />
                <span className="h-0.5 w-5 rounded-full bg-orange-100" />
                <span className="h-0.5 w-5 rounded-full bg-orange-100" />
              </div>
            </button>
          </div>
          <div className={`${menuOpen ? "flex" : "hidden"} w-full flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 md:flex md:w-auto md:flex-row md:items-center md:border-0 md:bg-transparent md:p-0`}>
            <a className="rounded-xl px-3 py-2 text-center text-sm text-orange-100/80 hover:bg-white/10 hover:text-orange-100 md:text-left" href="#planos">
              Planos
            </a>
            <a className="rounded-xl px-3 py-2 text-center text-sm text-orange-100/80 hover:bg-white/10 hover:text-orange-100 md:text-left" href="#produto">
              Produto
            </a>
            <Button asChild className="w-full bg-orange-500 text-slate-950 hover:bg-orange-400 md:w-auto">
              <Link to="/login">Entrar</Link>
            </Button>
          </div>
        </nav>
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-6 sm:pt-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6 animate-[fade-up_0.9s_ease-out_both]">
            <p className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500/30 via-white/10 to-rose-500/30 px-3 py-1 text-xs uppercase tracking-[0.3em] text-orange-100">
              Tudo simples, tudo no controle
            </p>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Venda mais com menos bagunca.
            </h1>
            <p className="text-base text-orange-100/80">
              Reservas, atendimento e fechamento no mesmo app. Simples, rapido e com modo offline.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="w-full bg-orange-500 text-slate-950 hover:bg-orange-400 sm:w-auto">
                <Link to="/login">Quero testar agora</Link>
              </Button>
              <Button asChild variant="outline" className="w-full border-orange-400/50 text-orange-100 hover:bg-white/10 sm:w-auto">
                <a href="#planos">Ver planos</a>
              </Button>
            </div>
            <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:grid-cols-3">
              {["3x mais rapido", "Clientes voltam mais", "Tudo no celular"].map((stat) => (
                <div key={stat} className="text-sm text-orange-100/80">
                  <span className="block text-lg font-semibold text-white">{stat.split(" ")[0]}</span>
                  <span>{stat.split(" ").slice(1).join(" ")}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative animate-[fade-up_1s_ease-out_both]" style={{ animationDelay: "120ms" }}>
            <div className="absolute -right-6 top-6 h-60 w-60 rounded-[32px] border border-white/10 bg-gradient-to-br from-orange-500/50 via-amber-300/20 to-rose-500/30 blur-[2px] motion-safe:animate-[float-soft_8s_ease-in-out_infinite]" />
            <div className="relative space-y-4 rounded-[28px] border border-white/10 bg-white/5 p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-orange-200">Operacao ao vivo</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div>
                    <p className="text-sm text-orange-100/80">Quadra 2</p>
                    <p className="text-lg font-semibold">Em uso</p>
                  </div>
                  <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs text-emerald-200">
                    +R$ 120
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div>
                    <p className="text-sm text-orange-100/80">Bar</p>
                    <p className="text-lg font-semibold">15 pedidos</p>
                  </div>
                  <span className="rounded-full bg-orange-400/20 px-3 py-1 text-xs text-orange-100">Em alta</span>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-sm text-orange-100/80">Saldo do cliente</p>
                  <p className="text-2xl font-semibold">R$ 380,00</p>
                  <p className="text-xs text-orange-100/60">Atualizado agora</p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-orange-100/70">Sem planilhas, sem dor.</p>
                <span className="text-xs text-emerald-200">Online</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section id="produto" className="mx-auto max-w-6xl px-4 py-14 animate-[fade-up_0.9s_ease-out_both]">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.3em] text-orange-200">Feito para o dia a dia</p>
            <h2 className="text-3xl font-semibold">Um app simples e direto.</h2>
            <p className="text-sm text-orange-100/70">
              Fluxo rapido, facil de ensinar e com visao clara do negocio.
            </p>
            <div className="grid gap-3">
              {highlights.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-4">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-sm text-orange-100/70">{item.copy}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {sectors.map((item, index) => (
              <div
                key={item.title}
                className="group rounded-[24px] border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-5 transition hover:border-orange-400/70 hover:shadow-[0_0_30px_rgba(255,124,71,0.2)] animate-[fade-up_0.8s_ease-out_both]"
                style={{ animationDelay: `${index * 120}ms` }}
              >
                <div className="mb-4 h-10 w-10 rounded-2xl bg-orange-500/20 text-center text-lg leading-10 text-orange-200">
                  {index + 1}
                </div>
                <p className="text-lg font-semibold">{item.title}</p>
                <p className="text-sm text-orange-100/70">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="planos" className="border-t border-white/10 bg-[#120f0d]">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-orange-200">Planos flexiveis</p>
              <h2 className="text-3xl font-semibold">Planos para cada fase.</h2>
            </div>
            <p className="text-sm text-orange-100/70">Valores mensais, sem taxa de implantacao.</p>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {pricing.map((plan, index) => (
              <div
                key={plan.name}
                className={`relative flex h-full flex-col gap-4 rounded-[28px] border ${
                  plan.highlight ? "border-orange-400/70 bg-gradient-to-b from-orange-500/20" : "border-white/10 bg-white/5"
                } p-5 animate-[fade-up_0.8s_ease-out_both]`}
                style={{ animationDelay: `${index * 140}ms` }}
              >
                {plan.highlight && (
                  <span className="absolute right-5 top-5 rounded-full bg-orange-500/20 px-3 py-1 text-xs text-orange-200">
                    Mais escolhido
                  </span>
                )}
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-orange-200">{plan.name}</p>
                  <p className="mt-2 text-3xl font-semibold">{plan.price}</p>
                  <p className="text-sm text-orange-100/70">{plan.description}</p>
                </div>
                <ul className="space-y-2 text-sm text-orange-100/80">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-orange-300" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className={`mt-auto ${plan.highlight ? "bg-orange-500 text-slate-950 hover:bg-orange-400" : "bg-white/10 hover:bg-white/20"}`}
                >
                  <Link to="/login">{plan.cta}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-6 rounded-[32px] border border-white/10 bg-gradient-to-r from-orange-500/20 via-white/5 to-rose-500/20 p-6 sm:p-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.3em] text-orange-200">Implantacao rapida</p>
            <h2 className="text-3xl font-semibold">Entre no ar em poucos dias.</h2>
            <p className="text-sm text-orange-100/70">
              Importamos dados e treinamos sua equipe.
            </p>
            <Button asChild className="w-full bg-slate-950 text-orange-200 hover:bg-black sm:w-auto">
              <Link to="/login">Quero comecar</Link>
            </Button>
          </div>
          <div className="grid gap-3">
            {["Setup guiado", "Migracao assistida", "Treinamento por equipe", "Suporte humano"].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-orange-100/80">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {faqs.map((faq) => (
            <div key={faq.q} className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <p className="text-sm font-semibold">{faq.q}</p>
              <p className="text-sm text-orange-100/70">{faq.a}</p>
            </div>
          ))}
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-semibold">Precisa de algo maior?</p>
            <p className="text-sm text-orange-100/70">
              Fale com o time para um plano sob medida.
            </p>
            <Button asChild variant="outline" className="mt-4 border-orange-400/50 text-orange-100 hover:bg-white/10">
              <a href="mailto:contato@tagflow.app">Falar com vendas</a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

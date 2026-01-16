import { Link } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../components/ui/button";
import { apiFetch } from "../services/api";

const fallbackPricing = [
  {
    name: "Free",
    price: "R$ 0",
    description: "Comece com o essencial para testar o fluxo.",
    features: ["1 filial", "1 operador", "100 clientes", "PDV basico", "5 reservas/mes"],
    cta: "Testar gratis",
    highlight: false
  },
  {
    name: "Start",
    price: "R$ 97",
    description: "Operacao organizada e vendas mais rapidas.",
    features: ["2 filiais", "5 operadores", "1.000 clientes", "NFC e codigo de barras", "Relatorios simples"],
    cta: "Assinar Start",
    highlight: false
  },
  {
    name: "Prime",
    price: "R$ 197",
    description: "Recursos premium para maxima performance.",
    features: ["5 filiais", "20 operadores", "10.000 clientes", "Divisao de contas", "Relatorios avancados"],
    cta: "Assinar Prime",
    highlight: true
  }
];

const features = [
  {
    title: "PDV inteligente",
    copy: "Venda rapida com NFC, QR ou codigo de barras."
  },
  {
    title: "Reservas claras",
    copy: "Disponibilidade ao vivo com alertas e check-in."
  },
  {
    title: "Comandas seguras",
    copy: "Credito liberado ou pre-pago, tudo rastreado."
  },
  {
    title: "Caixa completo",
    copy: "Abertura, conferencia e fechamento sem planilhas."
  }
];

const useCases = [
  {
    title: "Quadras esportivas",
    copy: "Horarios, participantes e divisao do valor."
  },
  {
    title: "Parques e atracoes",
    copy: "Pulseiras, saldo e consumo sem fila."
  },
  {
    title: "Bares e restaurantes",
    copy: "Comandas agiles e contas divididas."
  },
  {
    title: "Espacos multiuso",
    copy: "Filiais, equipes e regras por unidade."
  }
];

const flow = [
  {
    step: "1",
    title: "Cadastro rapido",
    copy: "Nome e identificador em poucos segundos."
  },
  {
    step: "2",
    title: "Venda e consumo",
    copy: "Produtos, servicos e locais no mesmo PDV."
  },
  {
    step: "3",
    title: "Fechamento seguro",
    copy: "Pagamento e recibo com tudo registrado."
  }
];

const faqs = [
  {
    q: "Posso migrar de plano sem perder dados?",
    a: "Sim. O upgrade libera recursos sem alterar seu historico."
  },
  {
    q: "Funciona offline?",
    a: "Sim. O PDV segue funcionando mesmo sem internet."
  },
  {
    q: "Posso usar meu dominio?",
    a: "Nos planos Start e Prime voce usa seu dominio."
  }
];

export function MarketingLanding() {
  const [menuOpen, setMenuOpen] = useState(false);
  const plansQuery = useQuery({
    queryKey: ["public-plans"],
    queryFn: () =>
      apiFetch<{
        plans: Array<{
          id: string;
          name: string;
          description?: string | null;
          priceMonthly: string;
          features?: string | null;
          tools?: string | null;
          limits?: string | null;
        }>;
      }>("/api/public/plans")
  });

  const pricing = plansQuery.data?.plans?.length
    ? plansQuery.data.plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        price: Number(plan.priceMonthly) > 0 ? `R$ ${Number(plan.priceMonthly).toFixed(2)}` : "R$ 0",
        description: plan.description ?? "Plano ideal para crescer.",
        features: buildPlanFeatures(plan),
        cta: plan.name.toLowerCase() === "free" ? "Testar gratis" : `Assinar ${plan.name}`,
        highlight: plan.name.toLowerCase() === "prime"
      }))
    : fallbackPricing;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="relative overflow-hidden border-b border-slate-200/70">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 h-72 w-[520px] -translate-x-1/2 rounded-full bg-orange-200/70 blur-[120px]" />
          <div className="absolute right-[-80px] top-8 h-64 w-64 rounded-full bg-amber-200/60 blur-[120px]" />
          <div className="absolute bottom-[-120px] left-12 h-64 w-64 rounded-full bg-rose-100/70 blur-[120px]" />
        </div>
        <nav className="mx-auto flex max-w-6xl flex-col items-stretch justify-between gap-4 px-4 py-5 md:flex-row md:items-center">
          <div className="flex w-full items-center justify-between gap-4 md:w-auto md:justify-start">
            <img src="/logo-tagflow-black.png" alt="Tagflow" className="h-16 w-auto" />
            <button
              type="button"
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((prev) => !prev)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 md:hidden"
            >
              <div className="flex flex-col gap-1.5">
                <span className="h-0.5 w-5 rounded-full bg-slate-500" />
                <span className="h-0.5 w-5 rounded-full bg-slate-500" />
                <span className="h-0.5 w-5 rounded-full bg-slate-500" />
              </div>
            </button>
          </div>
          <div className={`${menuOpen ? "flex" : "hidden"} w-full flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:flex md:w-auto md:flex-row md:items-center md:border-0 md:bg-transparent md:p-0`}>
            <a className="rounded-xl px-3 py-2 text-center text-sm text-slate-600 hover:bg-slate-100 md:text-left" href="#produto">
              Produto
            </a>
            <a className="rounded-xl px-3 py-2 text-center text-sm text-slate-600 hover:bg-slate-100 md:text-left" href="#planos">
              Planos
            </a>
            <Button asChild className="w-full bg-orange-500 text-white hover:bg-orange-400 md:w-auto">
              <Link to="/login">Entrar</Link>
            </Button>
          </div>
        </nav>

        <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs uppercase tracking-[0.3em] text-orange-500 shadow-sm">
              Plataforma completa
            </span>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Controle vendas, reservas e caixa em um unico app.
            </h1>
            <p className="text-base text-slate-600">
              Tagflow organiza o atendimento do seu negocio: cadastro, consumo, locacoes e fechamento. Rapido de aprender, facil de usar.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="w-full bg-orange-500 text-white hover:bg-orange-400 sm:w-auto">
                <Link to="/signup">Assinar agora</Link>
              </Button>
              <Button asChild variant="outline" className="w-full border-slate-300 text-slate-700 hover:bg-slate-100 sm:w-auto">
                <a href="#planos">Ver planos</a>
              </Button>
            </div>
            <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
              {["Setup rapido", "Equipe pronta", "Resultados claros"].map((stat) => (
                <div key={stat} className="text-sm text-slate-500">
                  <span className="block text-lg font-semibold text-slate-900">{stat.split(" ")[0]}</span>
                  <span>{stat.split(" ").slice(1).join(" ")}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute -right-6 top-6 h-60 w-60 rounded-[32px] bg-gradient-to-br from-orange-200 via-amber-100 to-rose-100 blur-[2px]" />
            <div className="relative space-y-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <p className="text-xs uppercase tracking-[0.3em] text-orange-500">Operacao ao vivo</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="text-sm text-slate-500">Quadra 2</p>
                    <p className="text-lg font-semibold">Em uso</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-700">
                    +R$ 120
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="text-sm text-slate-500">Bar</p>
                    <p className="text-lg font-semibold">15 pedidos</p>
                  </div>
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-xs text-orange-700">Em alta</span>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Saldo do cliente</p>
                  <p className="text-2xl font-semibold">R$ 380,00</p>
                  <p className="text-xs text-slate-400">Atualizado agora</p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-500">
                <span>Sem planilhas, sem dor.</span>
                <span className="text-emerald-600">Online</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-14">
        <div className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="absolute inset-0 -z-10">
            <div className="absolute -left-16 top-8 h-40 w-40 rounded-full bg-black/10 blur-[80px]" />
            <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-orange-200/60 blur-[120px]" />
            <div className="absolute bottom-0 right-16 h-24 w-24 rounded-2xl bg-slate-900/10 blur-[40px]" />
          </div>
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Painel do cliente</p>
              <h2 className="text-3xl font-semibold">Seus gastos e saldos em todas as lojas Tagflow.</h2>
              <p className="text-sm text-slate-600">
                Veja quanto consumiu, o saldo disponivel e o historico de compras. Tudo no mesmo lugar.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild className="bg-slate-900 text-white hover:bg-slate-800">
                  <Link to="/cliente/login">Entrar no painel do cliente</Link>
                </Button>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
                  Login com celular + senha
                </span>
              </div>
            </div>
            <div className="relative rounded-[28px] border border-slate-200 bg-slate-900 p-5 text-white">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Resumo rapido</p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-white/60">Saldo total</p>
                  <p className="text-2xl font-semibold">R$ 380,00</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-white/60">Lojas visitadas</p>
                    <p className="text-lg font-semibold">4</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-white/60">Ultima compra</p>
                    <p className="text-lg font-semibold">Hoje</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-white/60">
                <span>Atualizado em tempo real</span>
                <span className="rounded-full bg-emerald-400/20 px-2 py-1 text-emerald-200">Online</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="produto" className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.3em] text-orange-500">Funcionalidades</p>
            <h2 className="text-3xl font-semibold">Tudo que seu atendimento precisa.</h2>
            <p className="text-sm text-slate-600">
              Tela simples, fluxo claro e controle total do consumo ao fechamento.
            </p>
            <div className="grid gap-3">
              {features.map((item) => (
                <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-sm text-slate-500">{item.copy}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {useCases.map((item, index) => (
              <div
                key={item.title}
                className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-4 h-10 w-10 rounded-2xl bg-orange-100 text-center text-sm font-semibold leading-10 text-orange-600">
                  {index + 1}
                </div>
                <p className="text-lg font-semibold">{item.title}</p>
                <p className="text-sm text-slate-500">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14">
        <div className="grid gap-6 rounded-[32px] border border-slate-200 bg-white p-6 sm:p-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.3em] text-orange-500">Fluxo simples</p>
            <h2 className="text-3xl font-semibold">Treine a equipe em poucas horas.</h2>
            <p className="text-sm text-slate-600">
              Um passo a passo claro para atender com rapidez e sem erro.
            </p>
            <div className="grid gap-3">
              {flow.map((item) => (
                <div key={item.step} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-sm font-semibold text-white">
                    {item.step}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-sm text-slate-500">{item.copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-3">
            {["PDV rapido", "Reserva garantida", "Saldo ao vivo", "Relatorios automaticos"].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="planos" className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-orange-500">Planos</p>
              <h2 className="text-3xl font-semibold">Escolha o plano certo.</h2>
            </div>
            <p className="text-sm text-slate-500">Sem taxa de implantacao e sem fidelidade.</p>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {pricing.map((plan, index) => (
              <div
                key={plan.name}
                className={`relative flex h-full flex-col gap-4 rounded-[28px] border ${
                  plan.highlight ? "border-orange-300 bg-orange-50" : "border-slate-200 bg-white"
                } p-5 shadow-sm`}
              >
                {plan.highlight ? (
                  <span className="absolute right-5 top-5 rounded-full bg-orange-200 px-3 py-1 text-xs text-orange-700">
                    Mais escolhido
                  </span>
                ) : null}
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-orange-500">{plan.name}</p>
                  <p className="mt-2 text-3xl font-semibold">{plan.price}</p>
                  <p className="text-sm text-slate-500">{plan.description}</p>
                </div>
                <ul className="space-y-2 text-sm text-slate-600">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-orange-300" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className={`mt-auto ${plan.highlight ? "bg-orange-500 text-white hover:bg-orange-400" : "bg-slate-900 text-white hover:bg-slate-800"}`}
                >
                  {"id" in plan ? (
                    <Link to={`/signup?planId=${plan.id}`}>{plan.cta}</Link>
                  ) : (
                    <Link to="/signup">{plan.cta}</Link>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {faqs.map((faq) => (
            <div key={faq.q} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold">{faq.q}</p>
              <p className="text-sm text-slate-500">{faq.a}</p>
            </div>
          ))}
          <div className="rounded-[24px] border border-slate-200 bg-orange-50 p-5">
            <p className="text-sm font-semibold">Precisa de um plano sob medida?</p>
            <p className="text-sm text-slate-600">
              Fale com nosso time para montar sua operacao.
            </p>
            <Button asChild className="mt-4 w-full bg-slate-900 text-white hover:bg-slate-800">
              <a href="mailto:contato@tagflow.app">Falar com vendas</a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function parsePlanList(value?: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item)).filter(Boolean);
    }
    if (parsed && typeof parsed === "object") {
      return planLimitsToList(parsed as Record<string, unknown>);
    }
  } catch {
    // ignore
  }
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function planLimitsToList(limits: Record<string, unknown>): string[] {
  const items: string[] = [];
  if (typeof limits.maxBranches === "number") items.push(`${limits.maxBranches} filiais`);
  if (typeof limits.maxUsers === "number") items.push(`${limits.maxUsers} usuarios`);
  if (typeof limits.maxCustomers === "number") items.push(`${limits.maxCustomers} clientes`);
  if (typeof limits.maxBookingsPerMonth === "number") items.push(`${limits.maxBookingsPerMonth} reservas/mes`);
  return items;
}

function buildPlanFeatures(plan: { features?: string | null; tools?: string | null; limits?: string | null }) {
  const features = [...parsePlanList(plan.features), ...parsePlanList(plan.tools), ...parsePlanList(plan.limits)];
  return features.length ? features.slice(0, 6) : ["Checkout Stripe", "Suporte dedicado", "Funcionalidades completas", "Relatorios completos"];
}

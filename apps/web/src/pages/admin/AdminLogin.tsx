import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Moon, Sun } from "lucide-react";
import { apiFetch } from "../../services/api";
import { useAuthStore } from "../../store/auth";
import { useTenantStore } from "../../store/tenant";
import { Button } from "../../components/ui/button";
import { useTheme } from "../../hooks/useTheme";

interface LoginResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    companyId: string;
  };
}

export function AdminLogin() {
  const navigate = useNavigate();
  const status = useAuthStore((state) => state.status);
  const setAuth = useAuthStore((state) => state.setAuth);
  const setTenantId = useTenantStore((state) => state.setTenantId);
  const [email, setEmail] = useState("admin@tagflow.local");
  const [password, setPassword] = useState("admin123");
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const { theme, toggleTheme } = useTheme();
  const logoSrc = theme === "dark" ? "/logo-tagflow.png" : "/logo-tagflow-black.png";
  const isIos =
    typeof window !== "undefined" &&
    /iphone|ipad|ipod/i.test(window.navigator.userAgent) &&
    !(window as { navigator: { standalone?: boolean } }).navigator.standalone;

  const isAndroid =
    typeof window !== "undefined" && /android/i.test(window.navigator.userAgent);
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async () => {
      return apiFetch<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
    },
    onSuccess: (data) => {
      if (data.user.companyId) {
        setTenantId(data.user.companyId);
      }
      setAuth("authenticated", data.user);
      navigate("/admin/pdv", { replace: true });
    }
  });

  useEffect(() => {
    if (status === "authenticated") {
      navigate("/admin/pdv", { replace: true });
    }
  }, [status, navigate]);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler as EventListener);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler as EventListener);
    };
  }, []);

  if (status === "authenticated") {
    return <Navigate to="/admin/pdv" replace />;
  }

  return (
    <section className="relative mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center px-4 py-12">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-10 left-1/2 h-64 w-[420px] -translate-x-1/2 rounded-full bg-orange-500/25 blur-[120px] dark:bg-orange-500/25" />
        <div className="absolute bottom-10 right-10 h-56 w-56 rounded-full bg-rose-500/20 blur-[140px] dark:bg-rose-500/20" />
      </div>
      <div className="w-full max-w-md space-y-5 rounded-[28px] border border-slate-200 bg-white p-6 text-slate-900 shadow-[0_20px_60px_rgba(0,0,0,0.12)] dark:border-white/10 dark:bg-[#120f0d] dark:text-slate-100 dark:shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:p-8">
        <header className="space-y-2 text-center">
          <div className="flex justify-end">
            <Button
              variant="outline"
              className="h-9 w-9 rounded-full p-0 text-slate-800 hover:text-slate-900 dark:text-slate-100 dark:hover:text-white"
              onClick={toggleTheme}
              aria-label="Alternar tema"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
          <img src={logoSrc} alt="Tagflow" className="mx-auto h-14 w-auto" />
          <p className="text-xs uppercase tracking-[0.3em] text-orange-600 dark:text-orange-200">Acesso</p>
          <h2 className="text-2xl font-semibold">Entrar no painel</h2>
          <p className="text-sm text-orange-600/70 dark:text-orange-100/70">Use seu email e senha.</p>
        </header>
        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-orange-600/80 dark:text-orange-200/80">Email</label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-400/60 focus:outline-none dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-orange-100/40"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-orange-600/80 dark:text-orange-200/80">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-400/60 focus:outline-none dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-orange-100/40"
            />
          </div>
          <Button className="w-full bg-orange-500 text-slate-950 hover:bg-orange-400" onClick={() => loginMutation.mutate()}>
            {loginMutation.isPending ? "Entrando..." : "Entrar"}
          </Button>
          {loginMutation.isError ? <p className="text-sm text-rose-500 dark:text-rose-300">Falha no login</p> : null}
          <p className="text-center text-xs text-slate-500 dark:text-orange-100/60">
            Nao tem conta? <a className="text-orange-600 hover:text-orange-500 dark:text-orange-200 dark:hover:text-orange-100" href="/signup">Criar conta free</a>
          </p>
          <div className="grid gap-3">
            {isAndroid ? (
              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-3 text-xs text-orange-700 dark:border-orange-300/30 dark:bg-orange-500/10 dark:text-orange-100/80">
                <p className="text-sm font-semibold text-orange-700 dark:text-orange-100">Instale o app no Android</p>
                <p className="mt-1 text-xs text-orange-700/70 dark:text-orange-100/70">
                  {installPrompt ? "Toque para instalar o Tagflow na tela inicial." : "Use o menu do navegador para adicionar o app."}
                </p>
                <Button
                  className="mt-3 w-full bg-orange-500 text-slate-950 hover:bg-orange-400"
                  onClick={async () => {
                    if (!installPrompt) {
                      setShowInstallHelp(true);
                      return;
                    }
                    const prompt = installPrompt;
                    setInstallPrompt(null);
                    await prompt.prompt();
                    await prompt.userChoice;
                  }}
                >
                  {installPrompt ? "Instalar app" : "Como instalar"}
                </Button>
                {showInstallHelp ? (
                  <p className="mt-2 text-xs text-orange-700/70 dark:text-orange-100/70">
                    Toque nos três pontos do navegador e escolha "Adicionar à tela inicial".
                  </p>
                ) : null}
              </div>
            ) : null}
            {isIos ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-300/30 dark:bg-emerald-500/10 dark:text-emerald-100/80">
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-100">Instale no iPhone/iPad</p>
                <p className="mt-1 text-xs text-emerald-700/70 dark:text-emerald-100/70">
                  Toque no botao de compartilhar e selecione Adicionar a Tela de Inicio.
                </p>
              </div>
            ) : null}
          </div>
          <p className="text-center text-xs text-slate-500 dark:text-orange-100/60">
            Precisa de ajuda? <a className="text-orange-600 hover:text-orange-500 dark:text-orange-200 dark:hover:text-orange-100" href="mailto:contato@tagflow.app">Fale com a equipe</a>
          </p>
        </div>
      </div>
    </section>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

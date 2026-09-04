import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

/**
 * Cada rota é carregada sob demanda. O cliente final abre /review/:slug pelo
 * telemóvel, muitas vezes em rede móvel fraca dentro do restaurante — não faz
 * sentido baixar o painel do dono, o admin e as definições para tocar em três
 * emojis. Cada tela passa a baixar só o que usa.
 */
const Index = lazy(() => import("./pages/Index"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
// A area do Marcelo. `lazy` como as outras: quem nao e administrador nunca
// carrega este pedaco, porque nunca chega a rota.
const Admin = lazy(() => import('./pages/Admin'));
const Review = lazy(() => import("./pages/Review"));
const Feedback = lazy(() => import("./pages/Feedback"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ThankYou = lazy(() => import("./pages/ThankYou"));
const BemVindo = lazy(() => import('./pages/BemVindo'));
const Reviews = lazy(() => import("./pages/Reviews"));
const WhatsApp = lazy(() => import("./pages/WhatsApp"));
const QRCodes = lazy(() => import("./pages/QRCodes"));
const Settings = lazy(() => import("./pages/Settings"));
const Profile = lazy(() => import("./pages/Profile"));
const Demo = lazy(() => import("./pages/Demo"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));

const queryClient = new QueryClient();

const PageFallback = () => (
  <div
    className="flex min-h-screen items-center justify-center bg-gray-50 p-4"
    role="status"
    aria-live="polite"
  >
    <span className="sr-only">A carregar…</span>
    <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/review/:businessId" element={<Review />} />
              <Route path="/feedback/:businessId" element={<Feedback />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/thank-you" element={<ThankYou />} />
              {/*
                Sem `ProtectedRoute`: e para onde o Stripe devolve quem acabou
                de pagar e AINDA NAO TEM CONTA. Proteger esta rota mandaria essa
                pessoa para o login — que e exactamente o que este caminho
                existe para nao fazer.
              */}
              <Route path="/bem-vindo" element={<BemVindo />} />
              <Route path="/reviews" element={
                <ProtectedRoute>
                  <Reviews />
                </ProtectedRoute>
              } />
              {/*
                O WhatsApp virou destino do menu principal em 31/08/2026, por
                decisão de Marcelo. A configuração vivia ao fim do painel e
                aparecia em todas as telas do dono; ver "Painel que cabe no
                celular" em docs/contrato-produto-binno.md.
              */}
              <Route path="/whatsapp" element={
                <ProtectedRoute>
                  <WhatsApp />
                </ProtectedRoute>
              } />
              <Route path="/qrcodes" element={
                <ProtectedRoute>
                  <QRCodes />
                </ProtectedRoute>
              } />
              <Route path="/configuracao" element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              {/*
                Sem `ProtectedRoute`: quem nao tem sessao chega, a funcao no
                banco recusa, e a pagina devolve "nao encontrado" — que e menos
                informacao do que um redireccionamento para o login, o qual
                confirmaria que a rota existe.
              */}
              <Route path="/admin" element={<Admin />} />
              <Route path="/demo" element={<Demo />} />
              <Route path="/termos" element={<Terms />} />
              <Route path="/privacidade" element={<Privacy />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

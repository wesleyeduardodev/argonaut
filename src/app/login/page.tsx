import LoginForm from "@/components/auth/LoginForm";
import ArgonautLogo from "@/components/ArgonautLogo";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.03] rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/[0.02] rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo + Title */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-5">
            <div className="animate-glow-pulse">
              <ArgonautLogo size={64} />
            </div>
          </div>
          <h1 className="font-display text-3xl font-bold text-text tracking-tight">
            Argonaut <span className="text-primary">AI</span>
          </h1>
          <p className="text-text-muted text-sm mt-2">
            Gerencie suas aplicações ArgoCD com inteligência artificial
          </p>
        </div>

        {/* Login card */}
        <div className="card-gradient p-6">
          <LoginForm />
        </div>

        {/* Footer */}
        <p className="text-center text-text-muted/40 text-xs mt-8">
          Gerenciamento inteligente de deployments Kubernetes
        </p>
      </div>
    </div>
  );
}

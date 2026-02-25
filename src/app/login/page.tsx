import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Argonaut</h1>
          <p className="text-gray-400 mt-1">Sign in to manage your applications</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}

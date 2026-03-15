"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { loginSchema, type LoginData } from "@/lib/validators";
import { useAuthStore } from "@/stores/auth-store";
import { Spinner } from "@/components/ui/spinner";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginData) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      toast.success("Bienvenido!");
      router.replace("/dashboard");
    } catch {
      toast.error("Email o contrasena incorrectos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Iniciar sesion</h2>
      <p className="text-text-secondary mb-6">Ingresa a tu cuenta para jugar</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Email</label>
          <input
            {...register("email")}
            type="email"
            placeholder="tu@email.com"
            className={`input-field ${errors.email ? "input-error" : ""}`}
            autoComplete="email"
          />
          {errors.email && (
            <p className="text-danger text-xs mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="label">Contrasena</label>
          <div className="relative">
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              placeholder="Tu contrasena"
              className={`input-field pr-12 ${errors.password ? "input-error" : ""}`}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-danger text-xs mt-1">{errors.password.message}</p>
          )}
        </div>

        <div className="text-right">
          <Link href="/forgot-password" className="text-sm text-primary-600 font-medium hover:underline">
            Olvidaste tu contrasena?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? <Spinner size={20} className="text-white" /> : <LogIn size={20} />}
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-text-secondary">
          No tenes cuenta?{" "}
          <Link href="/register" className="text-primary-600 font-semibold hover:underline">
            Registrate
          </Link>
        </p>
      </div>
    </div>
  );
}

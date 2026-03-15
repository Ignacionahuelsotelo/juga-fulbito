"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { registerSchema, type RegisterData } from "@/lib/validators";
import { useAuthStore } from "@/stores/auth-store";
import { Spinner } from "@/components/ui/spinner";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const router = useRouter();
  const registerUser = useAuthStore((s) => s.register);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterData>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterData) => {
    setLoading(true);
    try {
      await registerUser(data.email, data.password, data.display_name);
      toast.success("Cuenta creada! Bienvenido");
      router.replace("/dashboard");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Error al registrar";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Crear cuenta</h2>
      <p className="text-text-secondary mb-6">Unite y arma tu picadito</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Nombre</label>
          <input
            {...register("display_name")}
            type="text"
            placeholder="Como te dicen en la cancha?"
            className={`input-field ${errors.display_name ? "input-error" : ""}`}
          />
          {errors.display_name && (
            <p className="text-danger text-xs mt-1">{errors.display_name.message}</p>
          )}
        </div>

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
              placeholder="Minimo 6 caracteres"
              className={`input-field pr-12 ${errors.password ? "input-error" : ""}`}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-danger text-xs mt-1">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label className="label">Confirmar contrasena</label>
          <input
            {...register("password_confirm")}
            type="password"
            placeholder="Repeti tu contrasena"
            className={`input-field ${errors.password_confirm ? "input-error" : ""}`}
            autoComplete="new-password"
          />
          {errors.password_confirm && (
            <p className="text-danger text-xs mt-1">{errors.password_confirm.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? <Spinner size={20} className="text-white" /> : <UserPlus size={20} />}
          {loading ? "Creando cuenta..." : "Registrarme"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-text-secondary">
          Ya tenes cuenta?{" "}
          <Link href="/login" className="text-primary-600 font-semibold hover:underline">
            Inicia sesion
          </Link>
        </p>
      </div>
    </div>
  );
}

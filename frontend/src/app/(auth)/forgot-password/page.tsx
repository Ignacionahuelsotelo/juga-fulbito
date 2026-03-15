"use client";
import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
      toast.success("Email enviado!");
    } catch {
      toast.error("Error al enviar email");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="animate-fade-in text-center py-8">
        <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-primary-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Revisa tu email</h2>
        <p className="text-text-secondary text-sm mb-6">
          Te enviamos instrucciones para resetear tu contrasena a <strong>{email}</strong>
        </p>
        <Link href="/login" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft size={18} /> Volver al login
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Recuperar contrasena</h2>
      <p className="text-text-secondary mb-6">Te enviamos un email para resetearla</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="input-field"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading || !email}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? <Spinner size={20} className="text-white" /> : <Mail size={20} />}
          {loading ? "Enviando..." : "Enviar email"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link href="/login" className="text-sm text-primary-600 font-medium hover:underline">
          Volver al login
        </Link>
      </div>
    </div>
  );
}

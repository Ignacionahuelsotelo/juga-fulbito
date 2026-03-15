"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Users, Swords, MessageCircle, Star, Bell } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { Spinner } from "@/components/ui/spinner";
import toast from "react-hot-toast";

const PLAYERS = [
  {
    email: "messi@test.com",
    name: "Leo Messi",
    role: "Delantero - Zurdo",
    highlight: "Organizador partido 1, chat directo con Enzo",
    emoji: "🐐",
    tags: ["Organizador", "Chat directo"],
  },
  {
    email: "dibu@test.com",
    name: "Dibu Martinez",
    role: "Arquero - Diestro",
    highlight: "Jugador en partido 1 y 2",
    emoji: "🧤",
    tags: ["Arquero"],
  },
  {
    email: "fideo@test.com",
    name: "Angel Di Maria",
    role: "Delantero - Zurdo",
    highlight: "Organizador partido 3 (completado, tiene ratings)",
    emoji: "⚡",
    tags: ["Org. partido completado"],
  },
  {
    email: "cuti@test.com",
    name: "Cuti Romero",
    role: "Defensor - Diestro",
    highlight: "Jugador en partidos 1, 2 y 3",
    emoji: "🛡️",
    tags: ["Defensor"],
  },
  {
    email: "enzo@test.com",
    name: "Enzo Fernandez",
    role: "Mediocampista - Diestro",
    highlight: "Organizador partido 2 (confirmado), chat directo con Messi",
    emoji: "🎯",
    tags: ["Org. confirmado", "Chat directo"],
  },
  {
    email: "maxi@test.com",
    name: "Maxi Rodriguez",
    role: "Delantero - Zurdo",
    highlight: "Tiene invitacion PENDIENTE al partido 1",
    emoji: "📩",
    tags: ["Invitacion pendiente"],
  },
  {
    email: "gago@test.com",
    name: "Fernando Gago",
    role: "Mediocampista - Diestro",
    highlight: "Tiene invitacion PENDIENTE al partido 1",
    emoji: "📩",
    tags: ["Invitacion pendiente"],
  },
  {
    email: "carlitos@test.com",
    name: "Carlos Tevez",
    role: "Delantero - Diestro",
    highlight: "Tiene invitacion PENDIENTE al partido 1",
    emoji: "📩",
    tags: ["Invitacion pendiente"],
  },
  {
    email: "riquelme@test.com",
    name: "Juan Roman",
    role: "Mediocampista - Zurdo",
    highlight: "Jugador en partidos 2 y 3",
    emoji: "👑",
    tags: ["Mediocampista"],
  },
  {
    email: "mascherano@test.com",
    name: "Javier Mascherano",
    role: "Defensor - Diestro",
    highlight: "Jugador en partidos 2 y 3",
    emoji: "🦁",
    tags: ["Defensor"],
  },
];

const PASSWORD = "test123";

export default function DevLoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [loading, setLoading] = useState("");

  const handleLogin = async (email: string, name: string) => {
    setLoading(email);
    try {
      await login(email, PASSWORD);
      toast.success(`Logueado como ${name}!`);
      router.replace("/dashboard");
    } catch (err) {
      toast.error("Error al loguear. Corriste el seed?");
      console.error(err);
    } finally {
      setLoading("");
    }
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-bold text-gray-800 mb-1">Dev Login</h2>
      <p className="text-text-secondary text-sm mb-1">
        Elegir usuario para testear (password: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-primary-700 font-mono text-xs">{PASSWORD}</code>)
      </p>
      <p className="text-xs text-text-secondary mb-4">
        Abri varias pestanas con distintos usuarios para testear chat, invitaciones y notificaciones en tiempo real
      </p>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4 pb-3 border-b border-gray-100">
        <span className="inline-flex items-center gap-1 text-[10px] bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">
          <Swords size={10} /> Partido open
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
          <Users size={10} /> Partido confirmed
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
          <Star size={10} /> Partido completed
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
          <Bell size={10} /> Invitaciones
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
          <MessageCircle size={10} /> Chat
        </span>
      </div>

      <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
        {PLAYERS.map((p) => (
          <button
            key={p.email}
            onClick={() => handleLogin(p.email, p.name)}
            disabled={!!loading}
            className="w-full text-left card-hover !p-3 flex items-center gap-3"
          >
            <span className="text-2xl flex-shrink-0">{p.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">{p.name}</span>
                <span className="text-[10px] text-text-secondary">{p.role}</span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5 truncate">
                {p.highlight}
              </p>
              <div className="flex flex-wrap gap-1 mt-1">
                {p.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[9px] px-1.5 py-0.5 bg-primary-50 text-primary-700 rounded-full font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex-shrink-0">
              {loading === p.email ? (
                <Spinner size={18} />
              ) : (
                <LogIn size={18} className="text-primary-500" />
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
        <p className="text-xs text-amber-800">
          <strong>Tip:</strong> Abri 2+ pestanas del navegador, loguea distintos usuarios y manda mensajes en el chat para verlos en tiempo real. Tambien podes aceptar/rechazar invitaciones y ver como llegan las notificaciones.
        </p>
      </div>
    </div>
  );
}

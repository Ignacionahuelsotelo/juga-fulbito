import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isToday, isTomorrow } from "date-fns";
import { es } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  if (isToday(d)) return "Hoy";
  if (isTomorrow(d)) return "Manana";
  return format(d, "EEE d MMM", { locale: es });
}

export function formatTime(time: string): string {
  return time.slice(0, 5);
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return format(d, "d MMM yyyy, HH:mm", { locale: es });
}

export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es });
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    open: "badge-green",
    full: "badge-yellow",
    confirmed: "badge-blue",
    in_progress: "badge-green",
    completed: "badge-gray",
    cancelled: "badge-red",
    pending: "badge-yellow",
    accepted: "badge-green",
    rejected: "badge-red",
  };
  return colors[status] || "badge-gray";
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    open: "Abierto",
    full: "Completo",
    confirmed: "Confirmado",
    in_progress: "En juego",
    completed: "Finalizado",
    cancelled: "Cancelado",
    pending: "Pendiente",
    accepted: "Aceptada",
    rejected: "Rechazada",
  };
  return labels[status] || status;
}

export function getRatingLabel(avg: number): string {
  if (avg >= 4.5) return "Crack";
  if (avg >= 3.5) return "Muy bueno";
  if (avg >= 2.5) return "Bueno";
  if (avg >= 1.5) return "Regular";
  return "Nuevo";
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

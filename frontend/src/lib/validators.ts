import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email invalido"),
  password: z.string().min(6, "Minimo 6 caracteres"),
});

export const registerSchema = z
  .object({
    email: z.string().email("Email invalido"),
    display_name: z
      .string()
      .min(2, "Minimo 2 caracteres")
      .max(100, "Maximo 100 caracteres"),
    password: z.string().min(6, "Minimo 6 caracteres"),
    password_confirm: z.string(),
  })
  .refine((data) => data.password === data.password_confirm, {
    message: "Las contrasenas no coinciden",
    path: ["password_confirm"],
  });

export const profileSchema = z.object({
  display_name: z.string().min(2).max(100),
  age: z.number().min(14).max(80).nullable().optional(),
  position: z.string().optional(),
  skill_level: z.string().optional(),
  play_style: z.string().optional(),
  dominant_foot: z.string().optional(),
  bio: z.string().max(500).optional(),
  zone_name: z.string().optional(),
});

export const availabilitySchema = z.object({
  date: z.string().min(1, "Selecciona una fecha"),
  start_time: z.string().min(1, "Selecciona hora inicio"),
  end_time: z.string().min(1, "Selecciona hora fin"),
  zone_name: z.string().optional(),
  match_type_pref: z.string().default("5v5"),
});

export const matchSchema = z.object({
  date: z.string().min(1, "Selecciona una fecha"),
  start_time: z.string().min(1, "Selecciona hora inicio"),
  duration_minutes: z.number().min(30).max(180).default(60),
  players_needed: z.number().min(2).max(22).default(10),
  match_type: z.string().default("5v5"),
  desired_level: z.string().optional(),
  venue_name: z.string().optional(),
  venue_address: z.string().optional(),
});

export const venueSchema = z.object({
  name: z.string().min(2, "Minimo 2 caracteres"),
  address: z.string().min(5, "Ingresa la direccion"),
  phone: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
});

export const ratingSchema = z.object({
  skill_score: z.number().min(1).max(5),
  punctuality_score: z.number().min(1).max(5),
  fair_play_score: z.number().min(1).max(5),
  attitude_score: z.number().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
export type ProfileData = z.infer<typeof profileSchema>;
export type AvailabilityData = z.infer<typeof availabilitySchema>;
export type MatchData = z.infer<typeof matchSchema>;
export type VenueData = z.infer<typeof venueSchema>;
export type RatingData = z.infer<typeof ratingSchema>;

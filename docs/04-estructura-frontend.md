# Estructura Frontend (Next.js) — JUGA FULBITO

## Stack Frontend

| Tecnología | Uso |
|------------|-----|
| Next.js 14+ (App Router) | Framework, SSR, routing |
| React 18 | UI |
| TypeScript | Tipado |
| Tailwind CSS | Estilos utility-first |
| shadcn/ui | Componentes base (Button, Input, Card, Dialog, etc.) |
| Zustand | Estado global (auth, notificaciones) |
| React Hook Form + Zod | Formularios + validación |
| Axios | HTTP client con interceptors JWT |
| Socket.IO Client | WebSocket para chat |
| Leaflet / react-leaflet | Mapas (open source, sin API key) |
| date-fns | Manejo de fechas |
| lucide-react | Iconos |

---

## Estructura de Carpetas

```
frontend/src/
├── app/                           # Next.js App Router
│   ├── layout.tsx                 # Root layout (providers, fonts, meta)
│   ├── page.tsx                   # Landing / redirect a login o dashboard
│   ├── globals.css                # Tailwind base + custom vars
│   │
│   ├── (auth)/                    # Grupo de rutas de autenticación
│   │   ├── layout.tsx             # Layout auth (centrado, sin navbar)
│   │   ├── login/
│   │   │   └── page.tsx           # Pantalla de login
│   │   ├── register/
│   │   │   └── page.tsx           # Pantalla de registro
│   │   └── forgot-password/
│   │       └── page.tsx           # Recuperar contraseña
│   │
│   └── (main)/                    # Grupo de rutas autenticadas
│       ├── layout.tsx             # Layout con bottom nav, header, providers
│       ├── dashboard/
│       │   └── page.tsx           # Pantalla principal (home)
│       ├── profile/
│       │   ├── page.tsx           # Mi perfil (ver)
│       │   └── edit/
│       │       └── page.tsx       # Editar perfil
│       ├── availability/
│       │   ├── page.tsx           # Mis disponibilidades
│       │   └── new/
│       │       └── page.tsx       # Crear disponibilidad
│       ├── matches/
│       │   ├── page.tsx           # Lista de partidos (mis + cercanos)
│       │   ├── new/
│       │   │   └── page.tsx       # Crear partido
│       │   └── [id]/
│       │       ├── page.tsx       # Detalle de partido
│       │       ├── invite/
│       │       │   └── page.tsx   # Buscar e invitar jugadores
│       │       ├── teams/
│       │       │   └── page.tsx   # Ver equipos (post-IA)
│       │       └── rate/
│       │           └── page.tsx   # Calificar jugadores post-partido
│       ├── chat/
│       │   ├── page.tsx           # Lista de chats
│       │   └── [roomId]/
│       │       └── page.tsx       # Chat individual
│       ├── notifications/
│       │   └── page.tsx           # Lista de notificaciones
│       └── player/
│           └── [id]/
│               └── page.tsx       # Perfil público de otro jugador
│
├── components/
│   ├── ui/                        # Primitivos shadcn/ui
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── badge.tsx
│   │   ├── avatar.tsx
│   │   ├── select.tsx
│   │   ├── slider.tsx
│   │   ├── tabs.tsx
│   │   ├── toast.tsx
│   │   └── skeleton.tsx
│   │
│   ├── layout/
│   │   ├── bottom-nav.tsx         # Barra inferior tipo app (Home, Partidos, Chat, Perfil)
│   │   ├── header.tsx             # Header con notificaciones
│   │   └── page-container.tsx     # Wrapper con padding y max-width
│   │
│   ├── auth/
│   │   ├── login-form.tsx
│   │   ├── register-form.tsx
│   │   └── forgot-password-form.tsx
│   │
│   ├── profile/
│   │   ├── profile-card.tsx       # Card de perfil (foto, nombre, rating, tags)
│   │   ├── profile-form.tsx       # Formulario de edición de perfil
│   │   ├── avatar-upload.tsx      # Subida de foto
│   │   ├── position-selector.tsx  # Selector visual de posición
│   │   └── rating-display.tsx     # Estrellas + tags
│   │
│   ├── availability/
│   │   ├── availability-form.tsx  # Form para crear disponibilidad
│   │   ├── availability-card.tsx  # Card de un slot
│   │   └── availability-list.tsx  # Lista de mis slots
│   │
│   ├── match/
│   │   ├── match-card.tsx         # Card resumen de partido
│   │   ├── match-form.tsx         # Form para crear partido
│   │   ├── match-detail.tsx       # Detalle completo
│   │   ├── player-search.tsx      # Buscador de jugadores disponibles
│   │   ├── player-list-item.tsx   # Item de jugador en lista
│   │   ├── invite-button.tsx      # Botón de invitar
│   │   ├── team-display.tsx       # Visualización de equipos A/B
│   │   └── match-status-badge.tsx # Badge de estado del partido
│   │
│   ├── chat/
│   │   ├── chat-room-list.tsx     # Lista de salas
│   │   ├── chat-room-item.tsx     # Item de sala en lista
│   │   ├── message-bubble.tsx     # Burbuja de mensaje
│   │   ├── message-input.tsx      # Input de mensaje + enviar
│   │   └── chat-container.tsx     # Container del chat (scroll, load more)
│   │
│   ├── rating/
│   │   ├── rating-form.tsx        # Form de calificación (estrellas por categoría)
│   │   ├── star-input.tsx         # Input de estrellas interactivo
│   │   └── rating-summary.tsx     # Resumen de ratings recibidos
│   │
│   ├── maps/
│   │   ├── location-picker.tsx    # Mapa para seleccionar ubicación
│   │   ├── venue-map.tsx          # Mapa mostrando cancha
│   │   └── player-map.tsx         # Mapa de jugadores cercanos
│   │
│   └── notifications/
│       ├── notification-bell.tsx  # Ícono con badge de count
│       ├── notification-item.tsx  # Item de notificación
│       └── notification-list.tsx  # Lista de notificaciones
│
├── lib/
│   ├── api.ts                     # Axios instance con interceptors JWT
│   ├── auth.ts                    # Funciones de auth (login, register, etc.)
│   ├── constants.ts               # Constantes (posiciones, niveles, estilos)
│   ├── utils.ts                   # Helpers genéricos
│   ├── socket.ts                  # Configuración Socket.IO
│   └── validators.ts              # Schemas Zod compartidos
│
├── hooks/
│   ├── use-auth.ts                # Hook de autenticación
│   ├── use-geolocation.ts         # Hook para obtener ubicación del browser
│   ├── use-notifications.ts       # Hook de notificaciones (polling o WS)
│   ├── use-chat.ts                # Hook de WebSocket para chat
│   └── use-debounce.ts            # Debounce para búsquedas
│
├── stores/
│   ├── auth-store.ts              # Zustand: user, token, isAuthenticated
│   └── notification-store.ts      # Zustand: unread count, notifications
│
└── types/
    ├── user.ts                    # User, Profile types
    ├── match.ts                   # Match, MatchInvitation, MatchPlayer
    ├── chat.ts                    # ChatRoom, ChatMessage
    ├── availability.ts            # AvailabilitySlot
    ├── rating.ts                  # Rating
    ├── notification.ts            # Notification
    └── api.ts                     # ApiResponse<T>, PaginatedResponse<T>
```

---

## Pantallas Principales (Flujo de Usuario)

### 1. Landing / Splash
- Si no hay token → redirige a `/login`
- Si hay token → redirige a `/dashboard`

### 2. Login (`/login`)
- Email + contraseña
- Link a registro
- Link a olvidé contraseña
- Al login exitoso → guarda JWT en Zustand + localStorage → redirige a dashboard

### 3. Registro (`/register`)
- Email + contraseña + nombre
- Al registrar → login automático → redirige a editar perfil

### 4. Dashboard (`/dashboard`)
- **Sección superior**: Saludo + accesos rápidos
  - "Estoy disponible" → shortcut a crear disponibilidad
  - "Armar partido" → shortcut a crear partido
- **Partidos próximos**: Lista de mis partidos confirmados
- **Invitaciones pendientes**: Cards con aceptar/rechazar
- **Partidos abiertos cerca**: Lista de partidos buscando jugadores

### 5. Mi Perfil (`/profile`)
- Avatar, nombre, rating, tags
- Stats (partidos jugados, rating promedio)
- Historial de partidos
- Botón editar

### 6. Editar Perfil (`/profile/edit`)
- Form completo: foto, datos, posición, nivel, estilo, bio
- Selector de ubicación con mapa
- Selector visual de posición (cancha gráfica)

### 7. Mis Disponibilidades (`/availability`)
- Lista de mis slots activos
- Botón crear nuevo
- Cada card: día, horario, zona, preferencia
- Swipe o botón para eliminar

### 8. Crear Disponibilidad (`/availability/new`)
- Date picker
- Time range selector
- Mapa para zona
- Selector de tipo de partido preferido

### 9. Lista de Partidos (`/matches`)
- Tabs: "Mis partidos" | "Partidos abiertos"
- Cada card: fecha, hora, cancha, jugadores confirmados/necesarios, tipo
- Filtros: fecha, cercanía, tipo

### 10. Crear Partido (`/matches/new`)
- Form: fecha, hora, duración, tipo, nivel, jugadores necesarios
- Selección de cancha (búsqueda o nueva)
- Mapa para ubicación
- Al crear → redirige a detalle del partido

### 11. Detalle de Partido (`/matches/[id]`)
- Info completa del partido
- Lista de jugadores confirmados
- Si soy organizador:
  - Botón "Invitar jugadores" → `/matches/[id]/invite`
  - Botón "Balancear equipos" → llama a la IA
  - Controles de estado (confirmar, iniciar, completar, cancelar)
- Si soy jugador: ver info, chat grupal
- Mapa con ubicación de la cancha

### 12. Invitar Jugadores (`/matches/[id]/invite`)
- Buscador con filtros (cercanía, horario, nivel, estilo)
- Lista de jugadores con su info resumida
- Botón "Invitar" en cada jugador
- Mapa mostrando jugadores cercanos (opcional)

### 13. Equipos (`/matches/[id]/teams`)
- Visualización Equipo A vs Equipo B
- Cada jugador con su posición, nivel, rating
- Explicación de la IA
- Balance score visual

### 14. Calificar Jugadores (`/matches/[id]/rate`)
- Lista de jugadores del partido
- Por cada uno: 4 categorías con estrellas (1-5)
- Comentario opcional
- Submit individual o batch

### 15. Chat (`/chat`)
- Lista de salas (grupales de partidos + directos)
- Último mensaje, timestamp, unread badge
- Click → chat individual

### 16. Chat Room (`/chat/[roomId]`)
- Mensajes en burbujas (propio a derecha, otros a izquierda)
- Input + botón enviar
- Scroll infinito hacia arriba para historial
- WebSocket para tiempo real

### 17. Notificaciones (`/notifications`)
- Lista cronológica
- Tipos con íconos distintos
- Click en notificación → navega al recurso (partido, chat, etc.)
- Marcar como leída

---

## Navegación (Bottom Nav)

```
┌───────┬───────────┬────────┬─────────┐
│ Home  │ Partidos  │  Chat  │ Perfil  │
│  🏠   │    ⚽     │   💬   │   👤    │
└───────┴───────────┴────────┴─────────┘
```

4 tabs principales, siempre visibles en mobile.
Badge de notificación en Chat (mensajes no leídos).
El header muestra campana de notificaciones.

---

## Manejo de Estado (Zustand)

### `auth-store.ts`
```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateProfile: (profile: Partial<Profile>) => void;
}
```

### `notification-store.ts`
```typescript
interface NotificationState {
  unreadCount: number;
  notifications: Notification[];
  setUnreadCount: (count: number) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
}
```

---

## API Client (Axios)

```typescript
// lib/api.ts
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL + '/api/v1',
});

// Interceptor: agrega JWT a cada request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: refresh token en 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // intentar refresh, si falla → logout
    }
    return Promise.reject(error);
  }
);
```

---

## Responsive Design

- **Mobile-first**: todas las pantallas diseñadas para 375px+
- **Breakpoints**: Tailwind defaults (sm: 640px, md: 768px, lg: 1024px)
- **Bottom nav**: visible solo en mobile/tablet (<1024px)
- **En desktop**: sidebar izquierdo en lugar de bottom nav
- **PWA**: manifest.json + service worker para instalación en home screen

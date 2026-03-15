# Endpoints API (FastAPI) — JUGA FULBITO

Base URL: `/api/v1`

Todas las respuestas siguen el formato:
```json
{
  "data": { ... },
  "message": "ok"
}
```

Los errores siguen:
```json
{
  "detail": "Descripción del error"
}
```

---

## 🔐 AUTH — `/api/v1/auth`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Registro con email + contraseña |
| POST | `/auth/login` | No | Login, devuelve access_token + refresh_token |
| POST | `/auth/refresh` | No | Renueva access_token con refresh_token |
| POST | `/auth/forgot-password` | No | Envía email de recuperación |
| POST | `/auth/reset-password` | No | Resetea contraseña con token |

### POST `/auth/register`
```json
// Request
{
  "email": "nacho@gmail.com",
  "password": "miPassword123",
  "display_name": "Nacho"
}

// Response 201
{
  "data": {
    "id": "uuid",
    "email": "nacho@gmail.com",
    "access_token": "eyJ...",
    "refresh_token": "eyJ..."
  }
}
```

### POST `/auth/login`
```json
// Request
{
  "email": "nacho@gmail.com",
  "password": "miPassword123"
}

// Response 200
{
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "user_id": "uuid"
  }
}
```

---

## 👤 USERS — `/api/v1/users`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/users/me` | Sí | Perfil del usuario autenticado |
| PUT | `/users/me` | Sí | Actualizar perfil |
| POST | `/users/me/avatar` | Sí | Subir foto de perfil |
| GET | `/users/{user_id}` | Sí | Ver perfil de otro usuario |
| GET | `/users/{user_id}/ratings` | Sí | Ver reseñas de un usuario |
| GET | `/users/{user_id}/matches` | Sí | Historial de partidos de un usuario |

### PUT `/users/me`
```json
// Request
{
  "display_name": "Nacho",
  "age": 28,
  "zone_name": "Palermo, CABA",
  "latitude": -34.5882,
  "longitude": -58.4209,
  "position": "midfielder",
  "skill_level": "intermediate",
  "play_style": "competitive",
  "dominant_foot": "right",
  "bio": "Juego de 8, buen pase largo"
}

// Response 200
{
  "data": { /* profile completo */ }
}
```

### POST `/users/me/avatar`
```
Content-Type: multipart/form-data
file: <imagen>

// Response 200
{
  "data": {
    "avatar_url": "https://storage.../avatar-uuid.jpg"
  }
}
```

---

## 📅 AVAILABILITY — `/api/v1/availability`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/availability` | Sí | Crear bloque de disponibilidad |
| GET | `/availability/me` | Sí | Mis bloques activos |
| GET | `/availability/search` | Sí | Buscar jugadores disponibles |
| PUT | `/availability/{id}` | Sí | Editar un bloque |
| DELETE | `/availability/{id}` | Sí | Eliminar/desactivar un bloque |

### POST `/availability`
```json
// Request
{
  "date": "2025-03-15",
  "start_time": "18:00",
  "end_time": "20:00",
  "zone_name": "Palermo",
  "latitude": -34.5882,
  "longitude": -58.4209,
  "match_type_pref": "any"
}

// Response 201
{
  "data": { /* availability slot */ }
}
```

### GET `/availability/search`
Endpoint clave para organizadores buscando jugadores.

```
Query params:
  ?date=2025-03-15
  &start_time=18:00
  &end_time=20:00
  &latitude=-34.5882
  &longitude=-58.4209
  &radius_km=5
  &match_type=competitive
  &skill_level=intermediate
  &page=1
  &per_page=20

// Response 200
{
  "data": {
    "players": [
      {
        "user_id": "uuid",
        "display_name": "Nacho",
        "avatar_url": "...",
        "position": "midfielder",
        "skill_level": "intermediate",
        "play_style": "competitive",
        "rating_avg": 4.2,
        "distance_km": 1.3,
        "availability_slot_id": "uuid"
      }
    ],
    "total": 45,
    "page": 1,
    "per_page": 20
  }
}
```

---

## ⚽ MATCHES — `/api/v1/matches`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/matches` | Sí | Crear partido |
| GET | `/matches` | Sí | Listar partidos cercanos/abiertos |
| GET | `/matches/me` | Sí | Mis partidos (organizados + como jugador) |
| GET | `/matches/{id}` | Sí | Detalle de un partido |
| PUT | `/matches/{id}` | Sí | Editar partido (solo organizador) |
| DELETE | `/matches/{id}` | Sí | Cancelar partido (solo organizador) |
| POST | `/matches/{id}/invite` | Sí | Invitar jugador |
| POST | `/matches/{id}/invite/bulk` | Sí | Invitar múltiples jugadores |
| GET | `/matches/{id}/players` | Sí | Lista de jugadores confirmados |
| POST | `/matches/{id}/balance` | Sí | Ejecutar IA de balanceo |
| PUT | `/matches/{id}/status` | Sí | Cambiar estado del partido |

### POST `/matches`
```json
// Request
{
  "date": "2025-03-15",
  "start_time": "19:00",
  "duration_minutes": 60,
  "players_needed": 10,
  "match_type": "competitive",
  "desired_level": "intermediate",
  "venue_id": "uuid",          // opcional, si la cancha ya existe
  "venue_name": "Cancha Don Pedro",    // si no hay venue_id
  "venue_address": "Av. Libertador 1234",
  "latitude": -34.5700,
  "longitude": -58.4300
}

// Response 201
{
  "data": { /* match completo */ }
}
```

### POST `/matches/{id}/invite`
```json
// Request
{
  "player_id": "uuid"
}

// Response 201
{
  "data": {
    "invitation_id": "uuid",
    "status": "pending"
  }
}
```

### POST `/matches/{id}/invite/bulk`
```json
// Request
{
  "player_ids": ["uuid1", "uuid2", "uuid3"]
}

// Response 201
{
  "data": {
    "invitations_sent": 3,
    "invitations": [ /* lista */ ]
  }
}
```

### POST `/matches/{id}/balance`
Ejecuta el módulo de IA para dividir en dos equipos.

```json
// Response 200
{
  "data": {
    "team_a": [
      {
        "user_id": "uuid",
        "display_name": "Nacho",
        "position": "midfielder",
        "skill_level": "intermediate",
        "rating_avg": 4.2
      }
    ],
    "team_b": [ /* idem */ ],
    "explanation": "Equipos balanceados por nivel (diff 0.15), posiciones cubiertas en ambos equipos, estilos de juego similares.",
    "balance_score": 0.92
  }
}
```

---

## 📩 INVITATIONS — `/api/v1/invitations`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/invitations/me` | Sí | Mis invitaciones pendientes |
| PUT | `/invitations/{id}/accept` | Sí | Aceptar invitación |
| PUT | `/invitations/{id}/reject` | Sí | Rechazar invitación |

### PUT `/invitations/{id}/accept`
```json
// Response 200
{
  "data": {
    "invitation_id": "uuid",
    "status": "accepted",
    "match_id": "uuid",
    "chat_room_id": "uuid"   // Se agrega al jugador al chat grupal
  }
}
```

---

## 💬 CHAT — `/api/v1/chat`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/chat/rooms` | Sí | Mis salas de chat |
| GET | `/chat/rooms/{room_id}/messages` | Sí | Mensajes de una sala (paginado) |
| POST | `/chat/rooms/direct` | Sí | Crear chat 1:1 |
| WS | `/ws/chat/{room_id}` | Sí (token en query) | WebSocket para chat en tiempo real |

### GET `/chat/rooms/{room_id}/messages`
```
Query params:
  ?before=2025-03-15T19:00:00Z   // cursor para paginación
  &limit=50

// Response 200
{
  "data": {
    "messages": [
      {
        "id": "uuid",
        "sender_id": "uuid",
        "sender_name": "Nacho",
        "sender_avatar": "...",
        "content": "Dale, llego a las 7",
        "created_at": "2025-03-15T18:45:00Z"
      }
    ],
    "has_more": true
  }
}
```

### WebSocket `/ws/chat/{room_id}?token=eyJ...`
```json
// Cliente envía:
{
  "type": "message",
  "content": "¡Vamos!"
}

// Servidor broadcast a todos en la sala:
{
  "type": "new_message",
  "data": {
    "id": "uuid",
    "sender_id": "uuid",
    "sender_name": "Nacho",
    "content": "¡Vamos!",
    "created_at": "2025-03-15T18:50:00Z"
  }
}
```

---

## ⭐ RATINGS — `/api/v1/ratings`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/ratings` | Sí | Calificar a un jugador post-partido |
| GET | `/ratings/match/{match_id}` | Sí | Calificaciones de un partido |
| GET | `/ratings/pending` | Sí | Jugadores que aún no califiqué |

### POST `/ratings`
```json
// Request
{
  "match_id": "uuid",
  "reviewed_id": "uuid",
  "skill_score": 4,
  "punctuality_score": 5,
  "fair_play_score": 4,
  "attitude_score": 5,
  "comment": "Crack, buenísimo al medio"
}

// Response 201
{
  "data": { /* rating creado */ }
}
```

---

## 🔔 NOTIFICATIONS — `/api/v1/notifications`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/notifications` | Sí | Mis notificaciones (paginado) |
| GET | `/notifications/unread-count` | Sí | Contador de no leídas |
| PUT | `/notifications/{id}/read` | Sí | Marcar como leída |
| PUT | `/notifications/read-all` | Sí | Marcar todas como leídas |

### GET `/notifications`
```
Query params:
  ?page=1&per_page=20&unread_only=true

// Response 200
{
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "type": "invitation",
        "title": "Nueva invitación",
        "body": "Nacho te invitó a jugar el 15/03 a las 19hs",
        "data": { "match_id": "uuid", "invitation_id": "uuid" },
        "is_read": false,
        "created_at": "2025-03-14T10:00:00Z"
      }
    ],
    "total": 8,
    "unread_count": 3
  }
}
```

---

## 🏟️ VENUES — `/api/v1/venues`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/venues` | Sí | Registrar cancha nueva |
| GET | `/venues` | Sí | Buscar canchas cercanas |
| GET | `/venues/{id}` | Sí | Detalle de cancha |

### GET `/venues`
```
Query params:
  ?latitude=-34.5882
  &longitude=-58.4209
  &radius_km=3
  &q=Don Pedro     // búsqueda por nombre (opcional)

// Response 200
{
  "data": {
    "venues": [
      {
        "id": "uuid",
        "name": "Cancha Don Pedro",
        "address": "Av. Libertador 1234",
        "distance_km": 0.8,
        "latitude": -34.5700,
        "longitude": -58.4300
      }
    ]
  }
}
```

---

## Middleware y Seguridad

### Headers requeridos (rutas autenticadas)
```
Authorization: Bearer eyJ...
Content-Type: application/json
```

### Rate Limiting
- Auth endpoints: 5 req/min por IP
- API general: 100 req/min por usuario
- WebSocket: 30 mensajes/min por usuario

### CORS
```python
origins = [
    "http://localhost:3000",       # dev
    "https://jugafulbito.com",     # prod
]
```

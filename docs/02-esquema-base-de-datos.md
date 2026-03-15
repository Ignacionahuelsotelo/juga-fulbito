# Esquema de Base de Datos — JUGA FULBITO

## Diagrama de Entidades y Relaciones

```
┌──────────────┐       ┌───────────────────┐       ┌──────────────────┐
│    users     │       │ availability_slots │       │     venues       │
├──────────────┤       ├───────────────────┤       ├──────────────────┤
│ id (PK)      │──┐    │ id (PK)           │       │ id (PK)          │
│ email        │  │    │ user_id (FK)──────│───┐   │ name             │
│ hashed_pw    │  │    │ date              │   │   │ address          │
│ created_at   │  │    │ start_time        │   │   │ location (GEO)   │
│ updated_at   │  │    │ end_time          │   │   │ created_at       │
│ is_active    │  │    │ zone_name         │   │   └──────────────────┘
└──────────────┘  │    │ location (GEO)    │   │            │
       │          │    │ match_type_pref   │   │            │
       │ 1:1      │    │ is_active         │   │            │
       ▼          │    └───────────────────┘   │            │
┌──────────────┐  │                            │            │
│   profiles   │  │    ┌───────────────────┐   │            │
├──────────────┤  │    │     matches        │   │            │
│ id (PK)      │  │    ├───────────────────┤   │            │
│ user_id (FK) │──┘    │ id (PK)           │   │            │
│ display_name │  ┌────│ organizer_id (FK) │   │            │
│ avatar_url   │  │    │ venue_id (FK)─────│───│────────────┘
│ age          │  │    │ date              │   │
│ zone_name    │  │    │ start_time        │   │
│ location     │  │    │ duration_minutes  │   │
│ position     │  │    │ match_type        │   │
│ skill_level  │  │    │ players_needed    │   │
│ play_style   │  │    │ desired_level     │   │
│ dominant_foot│  │    │ status            │   │
│ bio          │  │    │ team_a (JSON)     │   │
│ rating_avg   │  │    │ team_b (JSON)     │   │
│ matches_count│  │    │ ai_explanation    │   │
│ tags (JSON)  │  │    │ created_at        │   │
└──────────────┘  │    └───────────────────┘   │
                  │             │               │
                  │             │               │
                  │    ┌────────┴──────────┐    │
                  │    │                   │    │
                  │    ▼                   ▼    │
          ┌────────────────┐    ┌───────────────────┐
          │match_invitations│    │  match_players    │
          ├────────────────┤    ├───────────────────┤
          │ id (PK)        │    │ id (PK)           │
          │ match_id (FK)  │    │ match_id (FK)     │
          │ player_id (FK) │    │ user_id (FK)──────│───┐
          │ status         │    │ team              │   │
          │ created_at     │    │ joined_at         │   │
          │ responded_at   │    └───────────────────┘   │
          └────────────────┘                            │
                                                        │
┌──────────────────┐    ┌───────────────────┐           │
│   chat_rooms     │    │  chat_messages    │           │
├──────────────────┤    ├───────────────────┤           │
│ id (PK)          │    │ id (PK)           │           │
│ match_id (FK)    │    │ room_id (FK)      │           │
│ type             │    │ sender_id (FK)────│───────────┤
│ created_at       │    │ content           │           │
└──────────────────┘    │ created_at        │           │
        │               └───────────────────┘           │
        │                                               │
        │               ┌───────────────────┐           │
        │               │ chat_room_members  │           │
        │               ├───────────────────┤           │
        └───────────────│ room_id (FK)      │           │
                        │ user_id (FK)──────│───────────┤
                        │ joined_at         │           │
                        └───────────────────┘           │
                                                        │
                        ┌───────────────────┐           │
                        │     ratings       │           │
                        ├───────────────────┤           │
                        │ id (PK)           │           │
                        │ match_id (FK)     │           │
                        │ reviewer_id (FK)──│───────────┤
                        │ reviewed_id (FK)──│───────────┤
                        │ skill_score       │           │
                        │ punctuality_score │           │
                        │ fair_play_score   │           │
                        │ attitude_score    │           │
                        │ comment           │           │
                        │ created_at        │           │
                        └───────────────────┘           │
                                                        │
                        ┌───────────────────┐           │
                        │  notifications    │           │
                        ├───────────────────┤           │
                        │ id (PK)           │           │
                        │ user_id (FK)──────│───────────┘
                        │ type              │
                        │ title             │
                        │ body              │
                        │ data (JSON)       │
                        │ is_read           │
                        │ created_at        │
                        └───────────────────┘
```

## Definición Detallada de Tablas

### `users`
Tabla principal de autenticación.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK, default uuid4 | Identificador único |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Email de login |
| hashed_password | VARCHAR(255) | NOT NULL | Contraseña hasheada (bcrypt) |
| is_active | BOOLEAN | DEFAULT true | Cuenta activa |
| created_at | TIMESTAMPTZ | DEFAULT now() | Fecha de registro |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Última actualización |

### `profiles`
Perfil público del usuario. Relación 1:1 con `users`.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK | |
| user_id | UUID | FK → users.id, UNIQUE | |
| display_name | VARCHAR(100) | NOT NULL | Nombre o apodo |
| avatar_url | VARCHAR(500) | NULL | URL de foto de perfil |
| age | SMALLINT | CHECK (age >= 14 AND age <= 80) | Edad |
| zone_name | VARCHAR(200) | NULL | Barrio / zona textual |
| location | GEOGRAPHY(Point, 4326) | NULL | Coordenadas PostGIS |
| position | VARCHAR(20) | CHECK IN ('goalkeeper','defender','midfielder','forward','mixed') | Posición habitual |
| skill_level | VARCHAR(20) | CHECK IN ('beginner','intermediate','competitive') | Nivel percibido |
| play_style | VARCHAR(20) | CHECK IN ('relaxed','competitive','physical') | Estilo de juego |
| dominant_foot | VARCHAR(10) | CHECK IN ('left','right','both'), NULL | Pierna hábil |
| bio | VARCHAR(500) | NULL | Bio corta |
| rating_avg | DECIMAL(3,2) | DEFAULT 0.00 | Rating promedio (0-5) |
| matches_played | INTEGER | DEFAULT 0 | Contador de partidos |
| tags | JSONB | DEFAULT '[]' | Tags de comportamiento |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

**Índices:**
- `idx_profiles_location` — GiST sobre `location` (búsqueda geoespacial)
- `idx_profiles_skill_level` — B-tree
- `idx_profiles_play_style` — B-tree

### `venues`
Canchas registradas en el sistema.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK | |
| name | VARCHAR(200) | NOT NULL | Nombre de la cancha |
| address | VARCHAR(500) | NOT NULL | Dirección textual |
| location | GEOGRAPHY(Point, 4326) | NOT NULL | Coordenadas |
| phone | VARCHAR(50) | NULL | Teléfono de contacto |
| created_by | UUID | FK → users.id | Quién la registró |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Índices:**
- `idx_venues_location` — GiST

### `availability_slots`
Bloques de disponibilidad publicados por jugadores.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK | |
| user_id | UUID | FK → users.id | Jugador |
| date | DATE | NOT NULL | Día disponible |
| start_time | TIME | NOT NULL | Hora inicio |
| end_time | TIME | NOT NULL | Hora fin |
| zone_name | VARCHAR(200) | NULL | Zona donde puede jugar |
| location | GEOGRAPHY(Point, 4326) | NULL | Centro de zona |
| match_type_pref | VARCHAR(20) | CHECK IN ('competitive','relaxed','any') | Preferencia |
| is_active | BOOLEAN | DEFAULT true | Aún vigente |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Índices:**
- `idx_availability_date_time` — B-tree compuesto (date, start_time, end_time)
- `idx_availability_location` — GiST
- `idx_availability_user_active` — B-tree parcial (user_id) WHERE is_active = true

### `matches`
Partidos creados por organizadores.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK | |
| organizer_id | UUID | FK → users.id | Quien organiza |
| venue_id | UUID | FK → venues.id, NULL | Cancha (opcional) |
| venue_name | VARCHAR(200) | NULL | Nombre si no hay venue registrado |
| venue_address | VARCHAR(500) | NULL | Dirección alternativa |
| venue_location | GEOGRAPHY(Point, 4326) | NULL | Coordenadas si no hay venue |
| date | DATE | NOT NULL | Fecha del partido |
| start_time | TIME | NOT NULL | Hora de inicio |
| duration_minutes | SMALLINT | DEFAULT 60 | Duración en minutos |
| players_needed | SMALLINT | NOT NULL, DEFAULT 10 | Jugadores totales necesarios |
| match_type | VARCHAR(20) | CHECK IN ('competitive','relaxed') | Tipo de partido |
| desired_level | VARCHAR(20) | NULL | Nivel promedio deseado |
| status | VARCHAR(20) | CHECK IN ('open','full','confirmed','in_progress','completed','cancelled') | Estado del partido |
| team_a | JSONB | NULL | Lista de user_ids equipo A (post-IA) |
| team_b | JSONB | NULL | Lista de user_ids equipo B (post-IA) |
| ai_explanation | TEXT | NULL | Explicación del balance de IA |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

**Índices:**
- `idx_matches_date_status` — B-tree compuesto (date, status)
- `idx_matches_organizer` — B-tree (organizer_id)
- `idx_matches_venue_location` — GiST (venue_location)

### `match_invitations`
Invitaciones enviadas por el organizador a jugadores.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK | |
| match_id | UUID | FK → matches.id | Partido |
| player_id | UUID | FK → users.id | Jugador invitado |
| status | VARCHAR(20) | CHECK IN ('pending','accepted','rejected') | Estado |
| created_at | TIMESTAMPTZ | DEFAULT now() | Cuándo se envió |
| responded_at | TIMESTAMPTZ | NULL | Cuándo respondió |

**Constraints:**
- UNIQUE (match_id, player_id) — no duplicar invitaciones

### `match_players`
Jugadores confirmados en un partido.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK | |
| match_id | UUID | FK → matches.id | Partido |
| user_id | UUID | FK → users.id | Jugador |
| team | VARCHAR(1) | CHECK IN ('A','B'), NULL | Equipo asignado (post-IA) |
| joined_at | TIMESTAMPTZ | DEFAULT now() | |

**Constraints:**
- UNIQUE (match_id, user_id)

### `chat_rooms`
Salas de chat (grupal por partido o 1:1).

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK | |
| match_id | UUID | FK → matches.id, NULL | NULL si es chat 1:1 |
| type | VARCHAR(10) | CHECK IN ('match','direct') | Tipo de sala |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

### `chat_room_members`
Miembros de cada sala de chat.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK | |
| room_id | UUID | FK → chat_rooms.id | Sala |
| user_id | UUID | FK → users.id | Miembro |
| joined_at | TIMESTAMPTZ | DEFAULT now() | |

**Constraints:**
- UNIQUE (room_id, user_id)

### `chat_messages`
Mensajes individuales.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK | |
| room_id | UUID | FK → chat_rooms.id | Sala |
| sender_id | UUID | FK → users.id | Remitente |
| content | TEXT | NOT NULL | Contenido del mensaje |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Índices:**
- `idx_messages_room_created` — B-tree compuesto (room_id, created_at DESC)

### `ratings`
Calificaciones post-partido entre jugadores.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK | |
| match_id | UUID | FK → matches.id | Partido |
| reviewer_id | UUID | FK → users.id | Quien califica |
| reviewed_id | UUID | FK → users.id | Calificado |
| skill_score | SMALLINT | CHECK (1-5) | Nivel de juego |
| punctuality_score | SMALLINT | CHECK (1-5) | Puntualidad |
| fair_play_score | SMALLINT | CHECK (1-5) | Fair play |
| attitude_score | SMALLINT | CHECK (1-5) | Buena onda |
| comment | VARCHAR(500) | NULL | Comentario opcional |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Constraints:**
- UNIQUE (match_id, reviewer_id, reviewed_id) — una review por par por partido
- CHECK (reviewer_id != reviewed_id) — no auto-calificarse

### `notifications`
Notificaciones internas.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | UUID | PK | |
| user_id | UUID | FK → users.id | Destinatario |
| type | VARCHAR(30) | NOT NULL | Tipo: invitation, acceptance, new_message, match_reminder |
| title | VARCHAR(200) | NOT NULL | Título |
| body | TEXT | NULL | Contenido |
| data | JSONB | NULL | Datos extra (match_id, room_id, etc.) |
| is_read | BOOLEAN | DEFAULT false | Leída |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Índices:**
- `idx_notifications_user_unread` — B-tree parcial (user_id) WHERE is_read = false

## Enums como VARCHAR con CHECK

Se usan VARCHAR + CHECK en lugar de tipos ENUM de PostgreSQL para mayor flexibilidad en migraciones.
Los valores válidos se documentan aquí y se validan también en Pydantic.

```
position:        goalkeeper | defender | midfielder | forward | mixed
skill_level:     beginner | intermediate | competitive
play_style:      relaxed | competitive | physical
dominant_foot:   left | right | both
match_type:      competitive | relaxed
match_type_pref: competitive | relaxed | any
match_status:    open | full | confirmed | in_progress | completed | cancelled
invitation_status: pending | accepted | rejected
chat_type:       match | direct
notification_type: invitation | acceptance | new_message | match_reminder
team:            A | B
```

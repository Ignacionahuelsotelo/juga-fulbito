# Arquitectura General — JUGA FULBITO

## Visión General

Aplicación web responsive (mobile-first) para organizar partidos de fútbol 5.
Arquitectura monolítica con separación frontend/backend por API REST.

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENTE                            │
│              Next.js (React + SSR)                      │
│         Mobile-first responsive PWA                     │
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │   Auth   │ │  Perfil  │ │ Partidos │ │   Chat    │  │
│  │  Pages   │ │  Pages   │ │  Pages   │ │  Pages    │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
│                       │                                  │
│              HTTP / WebSocket                            │
└───────────────────────┼─────────────────────────────────┘
                        │
                   API REST + WS
                        │
┌───────────────────────┼─────────────────────────────────┐
│                   SERVIDOR                               │
│              FastAPI (Python)                             │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │                API Layer (Routes)                 │   │
│  │  /auth  /users  /matches  /chat  /notifications  │   │
│  └──────────────────────┬───────────────────────────┘   │
│                         │                                │
│  ┌──────────────────────┼───────────────────────────┐   │
│  │             Service Layer (Lógica)                │   │
│  │  AuthService  MatchService  ChatService           │   │
│  │  UserService  AIBalancer    NotificationService    │   │
│  └──────────────────────┬───────────────────────────┘   │
│                         │                                │
│  ┌──────────────────────┼───────────────────────────┐   │
│  │            Data Layer (SQLAlchemy)                 │   │
│  │         Models + Repositorios + Migraciones        │   │
│  └──────────────────────┬───────────────────────────┘   │
│                         │                                │
└─────────────────────────┼───────────────────────────────┘
                          │
                 ┌────────┴────────┐
                 │   PostgreSQL    │
                 │   + PostGIS     │
                 └─────────────────┘
```

## Componentes Principales

### Frontend (Next.js 14+ App Router)
- **Framework**: React 18 + Next.js con App Router
- **Estilos**: Tailwind CSS + shadcn/ui
- **Estado**: Zustand (ligero, simple)
- **Formularios**: React Hook Form + Zod
- **Mapas**: Leaflet (open source) o Google Maps
- **WebSocket**: Socket.IO client (para chat en tiempo real)
- **HTTP**: Axios con interceptors para JWT

### Backend (FastAPI)
- **Framework**: FastAPI (async, tipado, autodocumentado)
- **ORM**: SQLAlchemy 2.0 (async)
- **Migraciones**: Alembic
- **Auth**: JWT con python-jose + passlib (bcrypt)
- **WebSocket**: FastAPI WebSocket nativo
- **Validación**: Pydantic v2
- **Geolocalización**: PostGIS + func.ST_DWithin de GeoAlchemy2
- **IA**: scikit-learn (balanceo) — sin dependencias pesadas

### Base de Datos (PostgreSQL + PostGIS)
- PostgreSQL 15+
- Extensión PostGIS para consultas geoespaciales
- Índices GiST para búsquedas por cercanía

## Flujo de Datos Principal

```
1. Usuario se registra/login → JWT token
2. Completa perfil → se guarda con coordenadas
3. Publica disponibilidad → AvailabilitySlot
4. Otro usuario crea partido → Match
5. Organizador busca jugadores disponibles → query geoespacial + filtros
6. Envía invitaciones → MatchInvitation + Notification
7. Jugadores aceptan → MatchPlayer + se crea ChatRoom
8. IA balancea equipos → Equipo A / Equipo B
9. Se juega el partido → estado "completed"
10. Calificaciones mutuas → Rating → actualiza score
```

## Estructura de Carpetas

```
JUGA FULBITO/
├── docs/                          # Documentación de arquitectura
├── backend/
│   ├── alembic/                   # Migraciones de BD
│   ├── app/
│   │   ├── main.py                # Entry point FastAPI
│   │   ├── core/
│   │   │   ├── config.py          # Settings (env vars)
│   │   │   ├── security.py        # JWT, hashing
│   │   │   └── dependencies.py    # Deps de FastAPI (get_db, get_current_user)
│   │   ├── db/
│   │   │   ├── base.py            # SQLAlchemy Base
│   │   │   └── session.py         # Engine + SessionLocal
│   │   ├── models/                # Modelos SQLAlchemy
│   │   │   ├── user.py
│   │   │   ├── match.py
│   │   │   ├── chat.py
│   │   │   ├── availability.py
│   │   │   ├── notification.py
│   │   │   └── rating.py
│   │   ├── schemas/               # Pydantic schemas (request/response)
│   │   │   ├── user.py
│   │   │   ├── match.py
│   │   │   ├── chat.py
│   │   │   └── ...
│   │   ├── api/
│   │   │   └── routes/            # Endpoints agrupados
│   │   │       ├── auth.py
│   │   │       ├── users.py
│   │   │       ├── matches.py
│   │   │       ├── availability.py
│   │   │       ├── chat.py
│   │   │       ├── ratings.py
│   │   │       └── notifications.py
│   │   └── services/              # Lógica de negocio
│   │       ├── auth_service.py
│   │       ├── user_service.py
│   │       ├── match_service.py
│   │       ├── chat_service.py
│   │       ├── notification_service.py
│   │       ├── ai_balancer.py     # Módulo IA
│   │       └── geo_service.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/                   # Next.js App Router
│   │   │   ├── (auth)/            # Grupo: login, register, forgot-password
│   │   │   ├── (main)/            # Grupo: dashboard, perfil, partidos, chat
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/            # Componentes reutilizables
│   │   │   ├── ui/                # Primitivos (Button, Input, Card...)
│   │   │   ├── maps/              # Componentes de mapa
│   │   │   ├── match/             # Componentes de partido
│   │   │   ├── chat/              # Componentes de chat
│   │   │   └── profile/           # Componentes de perfil
│   │   ├── lib/                   # Utilidades, API client, constantes
│   │   ├── hooks/                 # Custom hooks
│   │   └── types/                 # TypeScript types
│   ├── public/
│   ├── tailwind.config.ts
│   ├── next.config.js
│   └── package.json
└── docker-compose.yml
```

## Decisiones de Arquitectura

| Decisión | Elección | Razón |
|----------|----------|-------|
| Monolito vs Microservicios | Monolito | Simplicidad, un solo deploy, suficiente para MVP y escala media |
| REST vs GraphQL | REST | Más simple, mejor cacheado, endpoints predecibles |
| Chat en tiempo real | WebSocket nativo de FastAPI | Sin necesidad de servicio externo para MVP |
| Geolocalización | PostGIS | Consultas espaciales nativas, performantes, estándar de industria |
| IA para balanceo | scikit-learn local | Sin APIs externas, baja latencia, control total |
| Estado frontend | Zustand | Más simple que Redux, suficiente para esta app |
| ORM | SQLAlchemy 2.0 async | Tipado, maduro, soporte async nativo |

## Escalabilidad Futura

- **Push notifications**: agregar Firebase Cloud Messaging
- **Búsqueda avanzada**: Elasticsearch para búsqueda de jugadores
- **Cache**: Redis para sesiones y cache de queries frecuentes
- **CDN**: Cloudflare para assets estáticos y fotos de perfil
- **Storage**: S3/Cloudflare R2 para fotos de perfil
- **Workers**: Celery + Redis para tareas async (emails, notificaciones)

"""
Seed script - Crea 10 jugadores ficticios con datos realistas para testing.
Todos los usuarios tienen password: 'test123'

Uso:
  cd backend
  source .venv/bin/activate
  python -m scripts.seed
"""

import asyncio
import random
import uuid
from datetime import date, datetime, time, timedelta, timezone

import json

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# ── Fake data ────────────────────────────────────────────────────────────────

PLAYERS = [
    {
        "email": "messi@test.com",
        "display_name": "Leo Messi",
        "age": 28,
        "position": "forward",
        "skill_level": "competitive",
        "play_style": "competitive",
        "dominant_foot": "left",
        "bio": "Vengo a gambetear, no me pidan que defienda",
        "zone_name": "Palermo, CABA",
        "lat": -34.5795, "lon": -58.4245,
    },
    {
        "email": "dibu@test.com",
        "display_name": "Dibu Martinez",
        "age": 31,
        "position": "goalkeeper",
        "skill_level": "competitive",
        "play_style": "physical",
        "dominant_foot": "right",
        "bio": "Mira que te como hermano",
        "zone_name": "Nunez, CABA",
        "lat": -34.5440, "lon": -58.4495,
    },
    {
        "email": "fideo@test.com",
        "display_name": "Angel Di Maria",
        "age": 35,
        "position": "forward",
        "skill_level": "competitive",
        "play_style": "competitive",
        "dominant_foot": "left",
        "bio": "Le pego de afuera si se abre",
        "zone_name": "Belgrano, CABA",
        "lat": -34.5608, "lon": -58.4571,
    },
    {
        "email": "cuti@test.com",
        "display_name": "Cuti Romero",
        "age": 26,
        "position": "defender",
        "skill_level": "competitive",
        "play_style": "physical",
        "dominant_foot": "right",
        "bio": "Nadie pasa. Punto.",
        "zone_name": "Caballito, CABA",
        "lat": -34.6197, "lon": -58.4394,
    },
    {
        "email": "enzo@test.com",
        "display_name": "Enzo Fernandez",
        "age": 23,
        "position": "midfielder",
        "skill_level": "competitive",
        "play_style": "competitive",
        "dominant_foot": "right",
        "bio": "La manejo desde el medio",
        "zone_name": "Villa Crespo, CABA",
        "lat": -34.5985, "lon": -58.4369,
    },
    {
        "email": "maxi@test.com",
        "display_name": "Maxi Rodriguez",
        "age": 40,
        "position": "forward",
        "skill_level": "intermediate",
        "play_style": "relaxed",
        "dominant_foot": "left",
        "bio": "Vengo a pasarla bien y meter un golcito",
        "zone_name": "Flores, CABA",
        "lat": -34.6299, "lon": -58.4629,
    },
    {
        "email": "gago@test.com",
        "display_name": "Fernando Gago",
        "age": 37,
        "position": "midfielder",
        "skill_level": "intermediate",
        "play_style": "relaxed",
        "dominant_foot": "right",
        "bio": "Me cuido las rodillas pero la paso bien",
        "zone_name": "Almagro, CABA",
        "lat": -34.6090, "lon": -58.4192,
    },
    {
        "email": "carlitos@test.com",
        "display_name": "Carlos Tevez",
        "age": 39,
        "position": "forward",
        "skill_level": "competitive",
        "play_style": "physical",
        "dominant_foot": "right",
        "bio": "Del potrero a la cancha de 5",
        "zone_name": "La Boca, CABA",
        "lat": -34.6354, "lon": -58.3637,
    },
    {
        "email": "riquelme@test.com",
        "display_name": "Juan Roman",
        "age": 45,
        "position": "midfielder",
        "skill_level": "intermediate",
        "play_style": "relaxed",
        "dominant_foot": "left",
        "bio": "La pelota se mueve, yo no",
        "zone_name": "San Telmo, CABA",
        "lat": -34.6227, "lon": -58.3708,
    },
    {
        "email": "mascherano@test.com",
        "display_name": "Javier Mascherano",
        "age": 40,
        "position": "defender",
        "skill_level": "competitive",
        "play_style": "physical",
        "dominant_foot": "right",
        "bio": "Hago la rabona si hace falta para defender",
        "zone_name": "Boedo, CABA",
        "lat": -34.6265, "lon": -58.4175,
    },
]

VENUES = [
    ("La Canchita de Palermo", "Av. del Libertador 4500, Palermo", -34.5760, -58.4290, "11-2222-3333"),
    ("Fulbo House Belgrano", "Cabildo 2500, Belgrano", -34.5590, -58.4615, "11-4444-5555"),
    ("El Potrero de Boca", "Brandsen 800, La Boca", -34.6360, -58.3650, "11-6666-7777"),
]

CHAT_MESSAGES = [
    "Vamos que hay que ganar!",
    "Alguien lleva la pelota?",
    "Yo llevo los pechitos",
    "A que hora hay que estar?",
    "Dale llego 5 min tarde",
    "Hay vestuario?",
    "Falta uno, conocen a alguien?",
    "La cancha es de pasto sintetico",
    "Yo juego de cualquier cosa",
    "Genio, nos vemos ahi!",
    "Alguien tiene agua?",
    "Ojo que el piso resbala",
    "Tremendo gol metio el Leo",
    "Hoy hay revancha muchachos",
    "Armen los equipos bien eh",
    "El Dibu no deja pasar nada",
    "Me comi un asado ayer, no corro",
    "Buena cancha esta",
    "La proxima pido ser team A",
    "GG, la pasamos bien",
]


PASSWORD = "test123"


async def main():
    import bcrypt
    from geoalchemy2.elements import WKTElement

    # Direct DB connection
    DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/jugafulbito"
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    hashed_pw = bcrypt.hashpw(PASSWORD.encode(), bcrypt.gensalt()).decode()
    now = datetime.now(timezone.utc)

    async with async_session() as db:
        # ── Clean existing data (in correct FK order) ────────────────────
        print("🧹 Limpiando datos existentes...")
        for table in [
            "chat_messages", "chat_room_members", "chat_rooms",
            "ratings", "match_players", "match_invitations", "matches",
            "notifications", "availability_slots", "venues",
            "profiles", "users",
        ]:
            await db.execute(text(f"DELETE FROM {table}"))
        await db.commit()

        # ── 1. Create users + profiles ───────────────────────────────────
        print("👥 Creando 10 jugadores...")
        user_ids = []
        for p in PLAYERS:
            uid = uuid.uuid4()
            user_ids.append(uid)
            pid = uuid.uuid4()

            point = WKTElement(f"POINT({p['lon']} {p['lat']})", srid=4326)

            await db.execute(text("""
                INSERT INTO users (id, email, hashed_password, is_active, created_at, updated_at)
                VALUES (:id, :email, :pw, true, :now, :now)
            """), {"id": uid, "email": p["email"], "pw": hashed_pw, "now": now})

            await db.execute(text("""
                INSERT INTO profiles (id, user_id, display_name, age, position, skill_level,
                    play_style, dominant_foot, bio, zone_name, location,
                    rating_avg, matches_played, tags, created_at, updated_at)
                VALUES (:id, :uid, :name, :age, :pos, :skill, :style, :foot, :bio, :zone,
                    ST_GeogFromText(:point), :rating, :matches, CAST(:tags AS jsonb), :now, :now)
            """), {
                "id": pid, "uid": uid,
                "name": p["display_name"], "age": p["age"],
                "pos": p["position"], "skill": p["skill_level"],
                "style": p["play_style"], "foot": p["dominant_foot"],
                "bio": p["bio"], "zone": p["zone_name"],
                "point": f"POINT({p['lon']} {p['lat']})",
                "rating": round(random.uniform(3.0, 4.8), 2),
                "matches": random.randint(5, 50),
                "tags": json.dumps({"Crack": random.randint(1, 10), "Puntual": random.randint(1, 8), "Fair Play": random.randint(1, 6)}),
                "now": now,
            })
        await db.commit()
        print(f"   ✅ {len(user_ids)} usuarios creados")

        # ── 2. Create venues ────────────────────────────────────────────
        print("🏟  Creando canchas...")
        venue_ids = []
        for name, addr, lat, lon, phone in VENUES:
            vid = uuid.uuid4()
            venue_ids.append(vid)
            await db.execute(text("""
                INSERT INTO venues (id, name, address, location, phone, created_by, created_at)
                VALUES (:id, :name, :addr, ST_GeogFromText(:point), :phone, :uid, :now)
            """), {
                "id": vid, "name": name, "addr": addr,
                "point": f"POINT({lon} {lat})",
                "phone": phone, "uid": user_ids[0], "now": now,
            })
        await db.commit()
        print(f"   ✅ {len(venue_ids)} canchas creadas")

        # ── 3. Create availability slots (next 7 days for all) ──────────
        print("📅 Creando disponibilidad...")
        slot_count = 0
        for i, uid in enumerate(user_ids):
            p = PLAYERS[i]
            for day_offset in range(1, 8):
                if random.random() < 0.5:
                    continue  # 50% chance of having a slot each day
                d = date.today() + timedelta(days=day_offset)
                hour = random.choice([18, 19, 20, 21])
                await db.execute(text("""
                    INSERT INTO availability_slots (id, user_id, date, start_time, end_time,
                        zone_name, location, match_type_pref, is_active, created_at)
                    VALUES (:id, :uid, :date, :st, :et, :zone,
                        ST_GeogFromText(:point), :pref, true, :now)
                """), {
                    "id": uuid.uuid4(), "uid": uid,
                    "date": d, "st": time(hour, 0), "et": time(hour + 1, 30),
                    "zone": p["zone_name"],
                    "point": f"POINT({p['lon']} {p['lat']})",
                    "pref": random.choice(["competitive", "relaxed", "any"]),
                    "now": now,
                })
                slot_count += 1
        await db.commit()
        print(f"   ✅ {slot_count} slots de disponibilidad")

        # ── 4. Create matches ───────────────────────────────────────────
        print("⚽ Creando partidos...")

        # Match 1: Upcoming, open, organized by Messi - needs players
        match1_id = uuid.uuid4()
        m1_date = date.today() + timedelta(days=2)
        await db.execute(text("""
            INSERT INTO matches (id, organizer_id, venue_id, venue_name, venue_address,
                venue_location, date, start_time, duration_minutes, players_needed,
                match_type, desired_level, status, created_at, updated_at)
            VALUES (:id, :org, :vid, :vname, :vaddr,
                ST_GeogFromText(:point), :date, :st, 60, 10,
                '5v5', 'competitive', 'open', :now, :now)
        """), {
            "id": match1_id, "org": user_ids[0],
            "vid": venue_ids[0], "vname": VENUES[0][0], "vaddr": VENUES[0][1],
            "point": f"POINT({VENUES[0][3]} {VENUES[0][2]})",
            "date": m1_date, "st": time(20, 0), "now": now,
        })

        # Add organizer as player + 4 more accepted players
        for idx in [0, 1, 2, 3, 4]:
            await db.execute(text("""
                INSERT INTO match_players (id, match_id, user_id, team, joined_at)
                VALUES (:id, :mid, :uid, NULL, :now)
            """), {"id": uuid.uuid4(), "mid": match1_id, "uid": user_ids[idx], "now": now})

        # Pending invitations to 3 more players
        for idx in [5, 6, 7]:
            await db.execute(text("""
                INSERT INTO match_invitations (id, match_id, player_id, status, created_at)
                VALUES (:id, :mid, :pid, 'pending', :now)
            """), {"id": uuid.uuid4(), "mid": match1_id, "pid": user_ids[idx], "now": now})

        # Match 2: Confirmed, full, teams balanced - tomorrow
        match2_id = uuid.uuid4()
        m2_date = date.today() + timedelta(days=1)
        await db.execute(text("""
            INSERT INTO matches (id, organizer_id, venue_id, venue_name, venue_address,
                venue_location, date, start_time, duration_minutes, players_needed,
                match_type, status, team_a, team_b,
                ai_explanation, created_at, updated_at)
            VALUES (:id, :org, :vid, :vname, :vaddr,
                ST_GeogFromText(:point), :date, :st, 60, 10,
                '5v5', 'confirmed', CAST(:ta AS jsonb), CAST(:tb AS jsonb),
                :expl, :now, :now)
        """), {
            "id": match2_id, "org": user_ids[4],
            "vid": venue_ids[1], "vname": VENUES[1][0], "vaddr": VENUES[1][1],
            "point": f"POINT({VENUES[1][3]} {VENUES[1][2]})",
            "date": m2_date, "st": time(19, 0),
            "ta": json.dumps([str(user_ids[i]) for i in range(5)]),
            "tb": json.dumps([str(user_ids[i]) for i in range(5, 10)]),
            "expl": "Balance 94% - Equipos equilibrados por rating y posiciones. Team A tiene rating promedio 3.8 y Team B 3.7. Ambos equipos tienen defensor, mediocampista y delanteros.",
            "now": now,
        })

        # All 10 players in match 2
        for idx, uid in enumerate(user_ids):
            team = "A" if idx < 5 else "B"
            await db.execute(text("""
                INSERT INTO match_players (id, match_id, user_id, team, joined_at)
                VALUES (:id, :mid, :uid, :team, :now)
            """), {"id": uuid.uuid4(), "mid": match2_id, "uid": uid, "team": team, "now": now})

        # Match 3: Completed (yesterday) - for ratings
        match3_id = uuid.uuid4()
        m3_date = date.today() - timedelta(days=1)
        await db.execute(text("""
            INSERT INTO matches (id, organizer_id, venue_name, venue_address,
                venue_location, date, start_time, duration_minutes, players_needed,
                match_type, status, created_at, updated_at)
            VALUES (:id, :org, :vname, :vaddr,
                ST_GeogFromText(:point), :date, :st, 90, 10,
                '5v5', 'completed', :now, :now)
        """), {
            "id": match3_id, "org": user_ids[2],
            "vname": VENUES[2][0], "vaddr": VENUES[2][1],
            "point": f"POINT({VENUES[2][3]} {VENUES[2][2]})",
            "date": m3_date, "st": time(21, 0), "now": now,
        })

        for idx, uid in enumerate(user_ids):
            team = "A" if idx < 5 else "B"
            await db.execute(text("""
                INSERT INTO match_players (id, match_id, user_id, team, joined_at)
                VALUES (:id, :mid, :uid, :team, :now)
            """), {"id": uuid.uuid4(), "mid": match3_id, "uid": uid, "team": team, "now": now})

        await db.commit()
        print("   ✅ 3 partidos creados (open, confirmed, completed)")

        # ── 5. Create chat rooms + messages ─────────────────────────────
        print("💬 Creando chats...")

        # Chat for match 2 (confirmed)
        chat_match2 = uuid.uuid4()
        await db.execute(text("""
            INSERT INTO chat_rooms (id, match_id, type, created_at)
            VALUES (:id, :mid, 'match', :now)
        """), {"id": chat_match2, "mid": match2_id, "now": now})

        for uid in user_ids:
            await db.execute(text("""
                INSERT INTO chat_room_members (id, room_id, user_id, joined_at)
                VALUES (:id, :rid, :uid, :now)
            """), {"id": uuid.uuid4(), "rid": chat_match2, "uid": uid, "now": now})

        # Add messages
        for i, msg_text in enumerate(CHAT_MESSAGES[:15]):
            sender = user_ids[i % 10]
            msg_time = now - timedelta(hours=15 - i, minutes=random.randint(0, 30))
            await db.execute(text("""
                INSERT INTO chat_messages (id, room_id, sender_id, content, created_at)
                VALUES (:id, :rid, :sid, :content, :ts)
            """), {
                "id": uuid.uuid4(), "rid": chat_match2,
                "sid": sender, "content": msg_text, "ts": msg_time,
            })

        # Chat for match 1 (open)
        chat_match1 = uuid.uuid4()
        await db.execute(text("""
            INSERT INTO chat_rooms (id, match_id, type, created_at)
            VALUES (:id, :mid, 'match', :now)
        """), {"id": chat_match1, "mid": match1_id, "now": now})

        for uid in user_ids[:5]:
            await db.execute(text("""
                INSERT INTO chat_room_members (id, room_id, user_id, joined_at)
                VALUES (:id, :rid, :uid, :now)
            """), {"id": uuid.uuid4(), "rid": chat_match1, "uid": uid, "now": now})

        for i, msg_text in enumerate(CHAT_MESSAGES[10:16]):
            sender = user_ids[i % 5]
            msg_time = now - timedelta(hours=6 - i, minutes=random.randint(0, 20))
            await db.execute(text("""
                INSERT INTO chat_messages (id, room_id, sender_id, content, created_at)
                VALUES (:id, :rid, :sid, :content, :ts)
            """), {
                "id": uuid.uuid4(), "rid": chat_match1,
                "sid": sender, "content": msg_text, "ts": msg_time,
            })

        # Direct chat: Messi <-> Enzo
        chat_direct = uuid.uuid4()
        await db.execute(text("""
            INSERT INTO chat_rooms (id, type, created_at) VALUES (:id, 'direct', :now)
        """), {"id": chat_direct, "now": now})
        for uid in [user_ids[0], user_ids[4]]:
            await db.execute(text("""
                INSERT INTO chat_room_members (id, room_id, user_id, joined_at)
                VALUES (:id, :rid, :uid, :now)
            """), {"id": uuid.uuid4(), "rid": chat_direct, "uid": uid, "now": now})

        direct_msgs = [
            (user_ids[0], "Enzo, venis manana?"),
            (user_ids[4], "Si, a las 8. Llego un toque antes"),
            (user_ids[0], "Genial, nos vemos ahi"),
            (user_ids[4], "Dale crack! Llevamos los pechitos?"),
            (user_ids[0], "Si yo los llevo"),
        ]
        for i, (sender, txt) in enumerate(direct_msgs):
            msg_time = now - timedelta(hours=3 - i * 0.5)
            await db.execute(text("""
                INSERT INTO chat_messages (id, room_id, sender_id, content, created_at)
                VALUES (:id, :rid, :sid, :content, :ts)
            """), {
                "id": uuid.uuid4(), "rid": chat_direct,
                "sid": sender, "content": txt, "ts": msg_time,
            })

        await db.commit()
        print("   ✅ 3 salas de chat con mensajes")

        # ── 6. Create ratings (for completed match 3) ───────────────────
        print("⭐ Creando calificaciones...")
        rating_count = 0
        for reviewer_idx in range(10):
            # Each player rates 3 random others from the match
            targets = [i for i in range(10) if i != reviewer_idx]
            for reviewed_idx in random.sample(targets, 3):
                await db.execute(text("""
                    INSERT INTO ratings (id, match_id, reviewer_id, reviewed_id,
                        skill_score, punctuality_score, fair_play_score, attitude_score,
                        comment, created_at)
                    VALUES (:id, :mid, :rev, :revd, :s1, :s2, :s3, :s4, :comment, :now)
                """), {
                    "id": uuid.uuid4(), "mid": match3_id,
                    "rev": user_ids[reviewer_idx], "revd": user_ids[reviewed_idx],
                    "s1": random.randint(3, 5), "s2": random.randint(3, 5),
                    "s3": random.randint(3, 5), "s4": random.randint(3, 5),
                    "comment": random.choice([
                        "Crack total", "Muy buen jugador", "Buena onda",
                        "Juega bien pero llega tarde", "Genio!", "Buen pie",
                        None, None,
                    ]),
                    "now": now - timedelta(hours=random.randint(1, 12)),
                })
                rating_count += 1
        await db.commit()
        print(f"   ✅ {rating_count} calificaciones")

        # ── 7. Create notifications ─────────────────────────────────────
        print("🔔 Creando notificaciones...")
        notif_data = [
            # Pending invitation notifications for players 5, 6, 7
            (user_ids[5], "invitation", "Te invitaron a un partido!", f"Leo Messi te invito a jugar el {m1_date.strftime('%d/%m')} en {VENUES[0][0]}"),
            (user_ids[6], "invitation", "Te invitaron a un partido!", f"Leo Messi te invito a jugar el {m1_date.strftime('%d/%m')} en {VENUES[0][0]}"),
            (user_ids[7], "invitation", "Te invitaron a un partido!", f"Leo Messi te invito a jugar el {m1_date.strftime('%d/%m')} en {VENUES[0][0]}"),
            # Match confirmed notifications for all
            (user_ids[0], "match_reminder", "Partido manana!", f"No te olvides del partido manana a las 19:00 en {VENUES[1][0]}"),
            (user_ids[1], "match_reminder", "Partido manana!", f"No te olvides del partido manana a las 19:00 en {VENUES[1][0]}"),
            (user_ids[2], "match_reminder", "Partido manana!", f"No te olvides del partido manana a las 19:00 en {VENUES[1][0]}"),
            (user_ids[3], "acceptance", "Cuti Romero se unio!", "Se sumo al partido del sabado"),
            (user_ids[4], "acceptance", "Enzo Fernandez se unio!", "Se sumo al partido del sabado"),
            (user_ids[0], "new_message", "Nuevo mensaje en el chat", "Enzo Fernandez: Dale crack!"),
            (user_ids[4], "new_message", "Nuevo mensaje de Leo Messi", "Si yo los llevo"),
        ]

        for uid, ntype, title, body in notif_data:
            await db.execute(text("""
                INSERT INTO notifications (id, user_id, type, title, body, is_read, created_at)
                VALUES (:id, :uid, :type, :title, :body, false, :ts)
            """), {
                "id": uuid.uuid4(), "uid": uid, "type": ntype,
                "title": title, "body": body,
                "ts": now - timedelta(hours=random.randint(0, 6)),
            })
        await db.commit()
        print(f"   ✅ {len(notif_data)} notificaciones")

    await engine.dispose()

    # ── Summary ─────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("✅ SEED COMPLETADO!")
    print("=" * 60)
    print(f"\n🔑 Password para TODOS: {PASSWORD}\n")
    print("👥 Usuarios creados:")
    print("-" * 60)
    for p in PLAYERS:
        print(f"   📧 {p['email']:30s} 🏷  {p['display_name']}")
    print("-" * 60)
    print(f"\n⚽ Partidos:")
    print(f"   1. {VENUES[0][0]} - {m1_date} 20:00 (OPEN, 5/10 jugadores, 3 invitaciones pendientes)")
    print(f"   2. {VENUES[1][0]} - {m2_date} 19:00 (CONFIRMED, 10/10, equipos balanceados)")
    print(f"   3. {VENUES[2][0]} - {m3_date} 21:00 (COMPLETED, con calificaciones)")
    print(f"\n💬 Chats:")
    print(f"   - Chat del partido 1 (5 miembros, 6 mensajes)")
    print(f"   - Chat del partido 2 (10 miembros, 15 mensajes)")
    print(f"   - Chat directo Messi <-> Enzo (5 mensajes)")
    print(f"\n💡 Tip: Logueate como diferentes usuarios para ver perspectivas distintas")
    print(f"   - messi@test.com -> organizador del partido 1, ve invitaciones enviadas")
    print(f"   - maxi@test.com -> tiene invitacion pendiente al partido 1")
    print(f"   - enzo@test.com -> organizador del partido 2, chat directo con Messi")
    print(f"   - fideo@test.com -> organizador del partido 3 (completado), puede ver ratings")


if __name__ == "__main__":
    asyncio.run(main())

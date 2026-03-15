"""
AI Team Balancer — LangChain + LLM

Divide jugadores confirmados en dos equipos equilibrados
usando un modelo de lenguaje (GPT-4o, etc.) via LangChain.

Si la API key no está configurada o el LLM falla,
el caller debe usar el fallback heurístico (ai_balancer.py).
"""

import json
import logging

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.output_parsers import JsonOutputParser

from app.core.config import settings
from app.services.ai_balancer import PlayerData, BalanceResult

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Sos un experto en fútbol amateur argentino. Tu tarea es dividir jugadores en dos equipos lo más equilibrados posible.

CRITERIOS DE BALANCE (en orden de importancia):
1. **Nivel de habilidad** (skill_level + rating_avg): Los equipos deben tener nivel similar
2. **Posiciones**: Cada equipo debe tener cobertura de posiciones (arquero, defensores, mediocampistas, delanteros)
3. **Estilo de juego** (play_style): Balancear estilos para que ambos equipos sean competitivos
4. **Edad**: Distribuir jugadores jóvenes y experimentados
5. **Experiencia** (matches_played + rating_avg): Mezclar experimentados con novatos

REGLAS:
- Dividir en exactamente 2 equipos del mismo tamaño
- Priorizar balance de nivel sobre todo lo demás
- Si hay arqueros, intentar que cada equipo tenga uno
- La explicación debe ser en español argentino, breve y clara

RESPONDE SIEMPRE en JSON con esta estructura exacta:
{
  "team_a": ["user_id_1", "user_id_2", ...],
  "team_b": ["user_id_3", "user_id_4", ...],
  "explanation": "Breve explicación del balance en español",
  "balance_score": 0.85
}

balance_score es un número entre 0.0 y 1.0 donde 1.0 = equipos perfectamente equilibrados."""


def _build_players_prompt(players: list[PlayerData]) -> str:
    """Build a human-readable prompt with player data."""
    lines = ["Estos son los jugadores confirmados para el partido:\n"]
    for p in players:
        lines.append(
            f"- ID: {p.user_id} | {p.display_name} | "
            f"Edad: {p.age or 'N/A'} | "
            f"Posición: {p.position} | "
            f"Nivel: {p.skill_level} ({p.skill_numeric}/3) | "
            f"Estilo: {p.play_style} | "
            f"Rating: {p.rating_avg:.1f}/5.0 | "
            f"Partidos jugados: {p.matches_played}"
        )
    lines.append(f"\nTotal: {len(players)} jugadores → {len(players)//2} por equipo.")
    lines.append("\nDividilos en 2 equipos equilibrados. Respondé en JSON.")
    return "\n".join(lines)


async def balance_teams_llm(players: list[PlayerData]) -> BalanceResult:
    """
    Balance teams using an LLM via LangChain.

    Raises:
        ValueError: If API key not configured
        Exception: If LLM call fails (caller should fallback to heuristic)
    """
    if not settings.OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY no configurada — usando fallback heurístico")

    n = len(players)
    if n < 4:
        raise ValueError("Se necesitan al menos 4 jugadores para balancear")
    if n % 2 != 0:
        raise ValueError("Se necesita un número par de jugadores")

    player_ids = {p.user_id for p in players}
    half = n // 2

    llm = ChatOpenAI(
        model=settings.AI_MODEL_NAME,
        temperature=settings.AI_TEMPERATURE,
        api_key=settings.OPENAI_API_KEY,
        max_tokens=1024,
    )

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=_build_players_prompt(players)),
    ]

    logger.info(f"Calling LLM ({settings.AI_MODEL_NAME}) to balance {n} players")

    response = await llm.ainvoke(messages)

    # Parse the JSON response
    parser = JsonOutputParser()
    result = await parser.ainvoke(response)

    # Validate the response
    team_a = result.get("team_a", [])
    team_b = result.get("team_b", [])
    explanation = result.get("explanation", "Equipos balanceados por IA")
    balance_score = float(result.get("balance_score", 0.8))

    # Validate teams
    if len(team_a) != half or len(team_b) != half:
        raise ValueError(
            f"LLM returned invalid team sizes: {len(team_a)} vs {len(team_b)}, expected {half}"
        )

    all_returned = set(team_a) | set(team_b)
    if all_returned != player_ids:
        missing = player_ids - all_returned
        extra = all_returned - player_ids
        raise ValueError(
            f"LLM returned invalid player IDs. Missing: {missing}, Extra: {extra}"
        )

    balance_score = max(0.0, min(1.0, balance_score))

    logger.info(
        f"LLM balance complete: score={balance_score:.2f}, explanation={explanation[:80]}"
    )

    return BalanceResult(
        team_a=team_a,
        team_b=team_b,
        explanation=explanation,
        balance_score=round(balance_score, 2),
    )

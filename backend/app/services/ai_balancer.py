"""
AI Team Balancer — Juga Fulbito

Divide jugadores confirmados en dos equipos equilibrados
usando evaluación exhaustiva de todas las particiones posibles.
"""

from dataclasses import dataclass
from itertools import combinations

from pydantic import BaseModel


@dataclass
class PlayerData:
    user_id: str
    display_name: str
    age: int | None
    position: str  # goalkeeper, defender, midfielder, forward, mixed
    skill_level: str  # beginner, intermediate, competitive
    skill_numeric: int  # 1, 2, 3
    play_style: str  # relaxed, competitive, physical
    style_numeric: int  # 1, 2, 3
    rating_avg: float  # 0.0 - 5.0
    matches_played: int


class BalanceResult(BaseModel):
    team_a: list[str]  # user_ids
    team_b: list[str]
    explanation: str
    balance_score: float  # 0.0 - 1.0


SKILL_MAP = {"beginner": 1, "intermediate": 2, "competitive": 3}
STYLE_MAP = {"relaxed": 1, "competitive": 2, "physical": 3}

SCORE_WEIGHTS = {
    "skill": 0.30,
    "rating": 0.30,
    "age": 0.10,
    "style": 0.15,
    "experience": 0.15,
}

COST_WEIGHTS = {
    "score_diff": 0.40,
    "position_coverage": 0.30,
    "style_diff": 0.15,
    "rating_diff": 0.15,
}


def _age_factor(age: int | None) -> float:
    if age is None:
        return 0.5
    if 20 <= age <= 32:
        return 1.0
    elif 16 <= age < 20:
        return 0.7 + (age - 16) * 0.075
    elif 32 < age <= 45:
        return max(0.3, 1.0 - (age - 32) * 0.04)
    elif age > 45:
        return max(0.3, 1.0 - (age - 32) * 0.04)
    else:
        return 0.5


def calculate_player_score(player: PlayerData) -> float:
    skill_score = (player.skill_numeric / 3.0) * 5.0
    rating_score = player.rating_avg if player.rating_avg > 0 else 2.5
    age_score = _age_factor(player.age) * 5.0
    style_score = (player.style_numeric / 3.0) * 5.0
    exp_score = min(player.matches_played / 50.0, 1.0) * 5.0

    total = (
        SCORE_WEIGHTS["skill"] * skill_score
        + SCORE_WEIGHTS["rating"] * rating_score
        + SCORE_WEIGHTS["age"] * age_score
        + SCORE_WEIGHTS["style"] * style_score
        + SCORE_WEIGHTS["experience"] * exp_score
    )
    return round(total, 3)


def _avg(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def _position_coverage_cost(
    team_a_ids: list[str],
    team_b_ids: list[str],
    player_map: dict[str, PlayerData],
) -> float:
    def _team_score(team_ids: list[str]) -> float:
        positions = [player_map[p].position for p in team_ids]
        score = 0.0
        if "goalkeeper" in positions:
            score += 0.4
        if "defender" in positions or "mixed" in positions:
            score += 0.2
        if "midfielder" in positions or "mixed" in positions:
            score += 0.2
        if "forward" in positions or "mixed" in positions:
            score += 0.2
        return score

    score_a = _team_score(team_a_ids)
    score_b = _team_score(team_b_ids)
    diff_penalty = abs(score_a - score_b)
    coverage_penalty = (2.0 - score_a - score_b) / 2.0
    return (diff_penalty + coverage_penalty) / 2.0


def _evaluate_partition(
    team_a_ids: list[str],
    team_b_ids: list[str],
    scores: dict[str, float],
    player_map: dict[str, PlayerData],
) -> float:
    # Score total difference
    sum_a = sum(scores[pid] for pid in team_a_ids)
    sum_b = sum(scores[pid] for pid in team_b_ids)
    max_possible = max(sum_a + sum_b, 1)
    score_diff_cost = abs(sum_a - sum_b) / max_possible

    # Position coverage
    pos_cost = _position_coverage_cost(team_a_ids, team_b_ids, player_map)

    # Style difference
    style_a = _avg([player_map[p].style_numeric for p in team_a_ids])
    style_b = _avg([player_map[p].style_numeric for p in team_b_ids])
    style_diff_cost = abs(style_a - style_b) / 3.0

    # Rating difference
    rating_a = _avg([player_map[p].rating_avg or 2.5 for p in team_a_ids])
    rating_b = _avg([player_map[p].rating_avg or 2.5 for p in team_b_ids])
    rating_diff_cost = abs(rating_a - rating_b) / 5.0

    return (
        COST_WEIGHTS["score_diff"] * score_diff_cost
        + COST_WEIGHTS["position_coverage"] * pos_cost
        + COST_WEIGHTS["style_diff"] * style_diff_cost
        + COST_WEIGHTS["rating_diff"] * rating_diff_cost
    )


def _generate_explanation(
    team_a: list[str],
    team_b: list[str],
    scores: dict[str, float],
    player_map: dict[str, PlayerData],
) -> str:
    sum_a = sum(scores[p] for p in team_a)
    sum_b = sum(scores[p] for p in team_b)
    diff = abs(sum_a - sum_b)
    diff_pct = (diff / max(sum_a + sum_b, 1)) * 100

    parts = []

    if diff_pct < 3:
        parts.append("Equipos muy equilibrados en nivel general")
    elif diff_pct < 8:
        parts.append("Equipos equilibrados con diferencia minima de nivel")
    else:
        parts.append(f"Mejor balance posible (diferencia de {diff_pct:.1f}%)")

    pos_a = [player_map[p].position for p in team_a]
    pos_b = [player_map[p].position for p in team_b]
    if "goalkeeper" in pos_a and "goalkeeper" in pos_b:
        parts.append("ambos equipos tienen arquero")
    elif "goalkeeper" not in pos_a and "goalkeeper" not in pos_b:
        parts.append("ningun equipo tiene arquero designado")

    rat_a = _avg([player_map[p].rating_avg or 2.5 for p in team_a])
    rat_b = _avg([player_map[p].rating_avg or 2.5 for p in team_b])
    if abs(rat_a - rat_b) < 0.3:
        parts.append("rating promedio similar")

    return ". ".join(parts) + "."


def balance_teams(players: list[PlayerData]) -> BalanceResult:
    """
    Main entry point. Takes a list of players and returns balanced teams.

    Raises ValueError if fewer than 4 players or odd number.
    """
    n = len(players)
    if n < 4:
        raise ValueError("Se necesitan al menos 4 jugadores para balancear")
    if n % 2 != 0:
        raise ValueError("Se necesita un numero par de jugadores")

    half = n // 2
    scores = {p.user_id: calculate_player_score(p) for p in players}
    player_map = {p.user_id: p for p in players}
    player_ids = list(scores.keys())

    best_partition = None
    best_cost = float("inf")

    for team_a_tuple in combinations(player_ids, half):
        team_a_ids = list(team_a_tuple)
        team_b_ids = [pid for pid in player_ids if pid not in team_a_ids]

        cost = _evaluate_partition(team_a_ids, team_b_ids, scores, player_map)

        if cost < best_cost:
            best_cost = cost
            best_partition = (team_a_ids, team_b_ids)

    team_a, team_b = best_partition
    explanation = _generate_explanation(team_a, team_b, scores, player_map)
    balance_score = max(0.0, 1.0 - best_cost)

    return BalanceResult(
        team_a=team_a,
        team_b=team_b,
        explanation=explanation,
        balance_score=round(balance_score, 2),
    )

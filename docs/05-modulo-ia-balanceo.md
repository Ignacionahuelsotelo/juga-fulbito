# Módulo de IA — Balanceo Automático de Equipos

## Objetivo

Dado un conjunto de jugadores confirmados para un partido, dividirlos en dos equipos lo más equilibrados posible, considerando múltiples dimensiones del jugador.

## Enfoque

Se usa un **algoritmo de optimización combinatoria** (no machine learning complejo), ya que:
- El dataset es pequeño (5 vs 5 = 10 jugadores)
- Las variables son pocas y bien definidas
- Se necesita determinismo y explicabilidad
- No hay datos de entrenamiento al inicio

Para 10 jugadores, las combinaciones posibles de dividir en 2 equipos de 5 son C(10,5)/2 = 126. Es perfectamente factible evaluar todas.

---

## Variables de Entrada por Jugador

| Variable | Tipo | Peso | Fuente |
|----------|------|------|--------|
| `skill_level` | Numérico (1-3) | 0.30 | Perfil (beginner=1, intermediate=2, competitive=3) |
| `rating_avg` | Float (0-5) | 0.30 | Calculado de reviews |
| `age_factor` | Float (0-1) | 0.10 | Normalizado: mejor edad ~22-30 = 1.0, decrece |
| `position` | Categórico | N/A | Se balancea por cobertura, no por peso |
| `play_style` | Numérico (1-3) | 0.15 | relaxed=1, competitive=2, physical=3 |
| `matches_played` | Float (0-1) | 0.15 | Normalizado: más partidos = más experiencia |

---

## Cálculo del Score Individual

```python
def calculate_player_score(player: PlayerData) -> float:
    """
    Calcula un score numérico que representa la 'fuerza' general del jugador.
    Rango aproximado: 0.0 - 5.0
    """
    WEIGHTS = {
        'skill': 0.30,
        'rating': 0.30,
        'age': 0.10,
        'style': 0.15,
        'experience': 0.15,
    }

    # Skill level: beginner=1, intermediate=2, competitive=3 → normalizar a 0-5
    skill_score = (player.skill_numeric / 3.0) * 5.0

    # Rating: ya es 0-5, usar directo (si no tiene, usar 2.5 como default)
    rating_score = player.rating_avg if player.rating_avg > 0 else 2.5

    # Edad: peak performance 20-32, decrece suavemente fuera
    age_score = _age_factor(player.age) * 5.0

    # Estilo: no es "mejor o peor", pero sí queremos equilibrar
    style_score = (player.style_numeric / 3.0) * 5.0

    # Experiencia: normalizada por partidos jugados
    exp_score = min(player.matches_played / 50.0, 1.0) * 5.0

    total = (
        WEIGHTS['skill'] * skill_score +
        WEIGHTS['rating'] * rating_score +
        WEIGHTS['age'] * age_score +
        WEIGHTS['style'] * style_score +
        WEIGHTS['experience'] * exp_score
    )

    return round(total, 3)


def _age_factor(age: int) -> float:
    """Curva de rendimiento por edad para fútbol amateur."""
    if age is None:
        return 0.5  # default medio
    if 20 <= age <= 32:
        return 1.0
    elif 16 <= age < 20:
        return 0.7 + (age - 16) * 0.075  # 0.7 → 1.0
    elif 32 < age <= 45:
        return 1.0 - (age - 32) * 0.04   # 1.0 → 0.48
    elif age > 45:
        return max(0.3, 1.0 - (age - 32) * 0.04)
    else:
        return 0.5
```

---

## Algoritmo de Balanceo

### Paso 1: Evaluación Exhaustiva (para ≤14 jugadores)

Con 10 jugadores, enumeramos todas las particiones posibles y evaluamos cada una:

```python
from itertools import combinations

def balance_teams(players: list[PlayerData]) -> BalanceResult:
    n = len(players)
    half = n // 2

    # Calcular scores
    scores = {p.user_id: calculate_player_score(p) for p in players}
    player_map = {p.user_id: p for p in players}
    player_ids = list(scores.keys())

    best_partition = None
    best_cost = float('inf')

    for team_a_ids in combinations(player_ids, half):
        team_b_ids = [pid for pid in player_ids if pid not in team_a_ids]

        cost = _evaluate_partition(
            team_a_ids, team_b_ids, scores, player_map
        )

        if cost < best_cost:
            best_cost = cost
            best_partition = (list(team_a_ids), team_b_ids)

    team_a, team_b = best_partition
    explanation = _generate_explanation(team_a, team_b, scores, player_map)
    balance_score = max(0, 1.0 - best_cost)  # 1.0 = perfecto

    return BalanceResult(
        team_a=team_a,
        team_b=team_b,
        explanation=explanation,
        balance_score=round(balance_score, 2),
    )
```

### Paso 2: Función de Costo Multi-Objetivo

```python
def _evaluate_partition(
    team_a_ids: list,
    team_b_ids: list,
    scores: dict,
    player_map: dict,
) -> float:
    """
    Menor costo = mejor balance.
    Combina múltiples criterios con pesos.
    """
    COST_WEIGHTS = {
        'score_diff': 0.40,      # Diferencia de score total
        'position_coverage': 0.30, # Cobertura de posiciones
        'style_diff': 0.15,       # Diferencia de estilo promedio
        'rating_diff': 0.15,      # Diferencia de rating promedio
    }

    # 1. Diferencia de score total (normalizada)
    sum_a = sum(scores[pid] for pid in team_a_ids)
    sum_b = sum(scores[pid] for pid in team_b_ids)
    max_possible = max(sum_a + sum_b, 1)
    score_diff_cost = abs(sum_a - sum_b) / max_possible

    # 2. Cobertura de posiciones
    pos_cost = _position_coverage_cost(team_a_ids, team_b_ids, player_map)

    # 3. Diferencia de estilo promedio
    style_a = _avg([player_map[p].style_numeric for p in team_a_ids])
    style_b = _avg([player_map[p].style_numeric for p in team_b_ids])
    style_diff_cost = abs(style_a - style_b) / 3.0

    # 4. Diferencia de rating promedio
    rating_a = _avg([player_map[p].rating_avg or 2.5 for p in team_a_ids])
    rating_b = _avg([player_map[p].rating_avg or 2.5 for p in team_b_ids])
    rating_diff_cost = abs(rating_a - rating_b) / 5.0

    total_cost = (
        COST_WEIGHTS['score_diff'] * score_diff_cost +
        COST_WEIGHTS['position_coverage'] * pos_cost +
        COST_WEIGHTS['style_diff'] * style_diff_cost +
        COST_WEIGHTS['rating_diff'] * rating_diff_cost
    )

    return total_cost
```

### Paso 3: Balanceo de Posiciones

```python
# Posiciones ideales para fútbol 5 (1 arquero + 4 de campo):
IDEAL_COMPOSITION = {
    'goalkeeper': 1,
    'defender': 1,
    'midfielder': 1,
    'forward': 1,
    # El 5to es flexible
}

POSITION_PRIORITY = ['goalkeeper', 'defender', 'midfielder', 'forward', 'mixed']

def _position_coverage_cost(team_a_ids, team_b_ids, player_map) -> float:
    """
    Evalúa qué tan bien ambos equipos cubren posiciones esenciales.
    Penaliza equipos sin arquero o con desequilibrio posicional.
    """
    def _team_position_score(team_ids):
        positions = [player_map[p].position for p in team_ids]
        score = 0.0

        # Tiene arquero? (peso alto)
        if 'goalkeeper' in positions:
            score += 0.4
        # Tiene al menos 1 defensor?
        if 'defender' in positions or 'mixed' in positions:
            score += 0.2
        # Tiene al menos 1 medio?
        if 'midfielder' in positions or 'mixed' in positions:
            score += 0.2
        # Tiene al menos 1 delantero?
        if 'forward' in positions or 'mixed' in positions:
            score += 0.2

        return score

    score_a = _team_position_score(team_a_ids)
    score_b = _team_position_score(team_b_ids)

    # Penalizar diferencia de cobertura + penalizar baja cobertura total
    diff_penalty = abs(score_a - score_b)
    coverage_penalty = (2.0 - score_a - score_b) / 2.0  # 0 si ambos = 1.0

    return (diff_penalty + coverage_penalty) / 2.0
```

---

## Generación de Explicación

```python
def _generate_explanation(team_a, team_b, scores, player_map) -> str:
    """Genera una explicación legible del balance."""
    sum_a = sum(scores[p] for p in team_a)
    sum_b = sum(scores[p] for p in team_b)
    diff = abs(sum_a - sum_b)
    diff_pct = (diff / max(sum_a + sum_b, 1)) * 100

    parts = []

    if diff_pct < 3:
        parts.append("Equipos muy equilibrados en nivel general")
    elif diff_pct < 8:
        parts.append("Equipos equilibrados con diferencia mínima de nivel")
    else:
        parts.append(f"Mejor balance posible (diferencia de {diff_pct:.1f}%)")

    # Posiciones
    pos_a = [player_map[p].position for p in team_a]
    pos_b = [player_map[p].position for p in team_b]
    if 'goalkeeper' in pos_a and 'goalkeeper' in pos_b:
        parts.append("Ambos equipos tienen arquero")
    elif 'goalkeeper' not in pos_a and 'goalkeeper' not in pos_b:
        parts.append("Ningún equipo tiene arquero designado")

    # Rating
    rat_a = _avg([player_map[p].rating_avg or 2.5 for p in team_a])
    rat_b = _avg([player_map[p].rating_avg or 2.5 for p in team_b])
    if abs(rat_a - rat_b) < 0.3:
        parts.append("Rating promedio similar entre equipos")

    return ". ".join(parts) + "."
```

---

## Estructura de Datos

```python
from dataclasses import dataclass
from pydantic import BaseModel

@dataclass
class PlayerData:
    user_id: str
    display_name: str
    age: int | None
    position: str           # goalkeeper, defender, midfielder, forward, mixed
    skill_level: str        # beginner, intermediate, competitive
    skill_numeric: int      # 1, 2, 3
    play_style: str         # relaxed, competitive, physical
    style_numeric: int      # 1, 2, 3
    rating_avg: float       # 0.0 - 5.0
    matches_played: int

class BalanceResult(BaseModel):
    team_a: list[str]       # user_ids
    team_b: list[str]       # user_ids
    explanation: str
    balance_score: float    # 0.0 - 1.0 (1.0 = perfecto)

class TeamDisplay(BaseModel):
    """Para respuesta de API con info completa de jugadores."""
    team_a: list[PlayerSummary]
    team_b: list[PlayerSummary]
    explanation: str
    balance_score: float

class PlayerSummary(BaseModel):
    user_id: str
    display_name: str
    avatar_url: str | None
    position: str
    skill_level: str
    rating_avg: float
```

---

## Integración en el Backend

```python
# services/ai_balancer.py

class AIBalancerService:

    SKILL_MAP = {'beginner': 1, 'intermediate': 2, 'competitive': 3}
    STYLE_MAP = {'relaxed': 1, 'competitive': 2, 'physical': 3}

    async def balance_match(self, match_id: str, db: AsyncSession) -> BalanceResult:
        """Punto de entrada principal. Obtiene jugadores y balancea."""

        # 1. Obtener jugadores confirmados del partido
        match_players = await self._get_confirmed_players(match_id, db)

        if len(match_players) < 4:
            raise ValueError("Se necesitan al menos 4 jugadores para balancear")

        if len(match_players) % 2 != 0:
            raise ValueError("Se necesita un número par de jugadores")

        # 2. Convertir a PlayerData
        player_data = [self._to_player_data(mp) for mp in match_players]

        # 3. Ejecutar balanceo
        result = balance_teams(player_data)

        # 4. Guardar resultado en el match
        await self._save_balance(match_id, result, db)

        return result

    def _to_player_data(self, mp) -> PlayerData:
        return PlayerData(
            user_id=str(mp.user_id),
            display_name=mp.profile.display_name,
            age=mp.profile.age,
            position=mp.profile.position or 'mixed',
            skill_level=mp.profile.skill_level or 'intermediate',
            skill_numeric=self.SKILL_MAP.get(mp.profile.skill_level, 2),
            play_style=mp.profile.play_style or 'competitive',
            style_numeric=self.STYLE_MAP.get(mp.profile.play_style, 2),
            rating_avg=float(mp.profile.rating_avg or 0),
            matches_played=mp.profile.matches_played or 0,
        )
```

---

## Flujo Completo

```
1. Organizador crea partido con 10 jugadores necesarios
2. Invita jugadores → jugadores aceptan → se agregan a match_players
3. Cuando hay 10 confirmados, se habilita botón "Balancear equipos"
4. Organizador clickea → POST /matches/{id}/balance
5. Backend:
   a. Obtiene los 10 jugadores con sus perfiles
   b. Calcula score individual de cada uno
   c. Evalúa las 126 particiones posibles
   d. Selecciona la de menor costo
   e. Genera explicación
   f. Guarda team_a y team_b en el match
   g. Retorna resultado
6. Frontend muestra equipos A vs B con info de cada jugador
7. Organizador puede re-balancear si quiere (re-ejecuta)
```

---

## Extensiones Futuras

| Feature | Descripción |
|---------|-------------|
| **ML con historial** | Entrenar modelo con resultados reales de partidos para mejorar predicción |
| **Preferencias de compañeros** | "Quiero jugar con X" / "No quiero jugar con Y" como soft constraints |
| **Ajuste post-partido** | Si un equipo ganó muy fácil, ajustar los scores retrospectivamente |
| **Score dinámico** | Score que evoluciona tipo ELO basado en resultados |
| **Múltiples balanceos** | Mostrar top 3 opciones al organizador para que elija |

---

## Complejidad Computacional

| Jugadores | Particiones | Tiempo estimado |
|-----------|-------------|-----------------|
| 6 (3v3) | 10 | < 1ms |
| 8 (4v4) | 35 | < 1ms |
| 10 (5v5) | 126 | < 5ms |
| 12 (6v6) | 462 | < 10ms |
| 14 (7v7) | 1716 | < 50ms |
| 16 (8v8) | 6435 | < 200ms |

Para fútbol 5, siempre estamos en 10 jugadores = **126 evaluaciones**. Es instantáneo.
Si en el futuro se soportan más jugadores, para >16 se puede usar un algoritmo greedy o simulated annealing.

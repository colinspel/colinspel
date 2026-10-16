"""Load StatsBomb open data for Bayer Leverkusen's 2023-24 Bundesliga season.

Coordinates: StatsBomb pitch is 120 x 80 (yards). Every event is recorded in the
acting team's attacking direction (towards x = 120). We convert everything into
LEVERKUSEN's frame: Leverkusen always attack towards x = 120, so opponent events
are flipped (x -> 120 - x, y -> 80 - y).
"""
import json
from functools import lru_cache
from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / "data"
LEV = "Bayer Leverkusen"


@lru_cache(None)
def matches():
    ms = json.loads((DATA / "matches" / "9" / "281.json").read_text())
    out = []
    for m in ms:
        home = m["home_team"]["home_team_name"] == LEV
        out.append(dict(
            match_id=m["match_id"], date=m["match_date"], week=m.get("match_week"),
            home=home,
            opponent=m["away_team"]["away_team_name"] if home else m["home_team"]["home_team_name"],
            gf=m["home_score"] if home else m["away_score"],
            ga=m["away_score"] if home else m["home_score"]))
    return sorted(out, key=lambda r: r["date"])


@lru_cache(None)
def events(match_id):
    return json.loads((DATA / "events" / f"{match_id}.json").read_text())


@lru_cache(None)
def frames(match_id):
    p = DATA / "three-sixty" / f"{match_id}.json"
    if not p.exists():
        return {}
    return {f["event_uuid"]: f for f in json.loads(p.read_text())}


@lru_cache(None)
def lineups(match_id):
    """player_id -> dict(name, nickname, number, team)"""
    out = {}
    for team in json.loads((DATA / "lineups" / f"{match_id}.json").read_text()):
        for p in team["lineup"]:
            out[p["player_id"]] = dict(name=p["player_name"], nickname=p.get("player_nickname") or p["player_name"],
                                       number=p["jersey_number"], team=team["team_name"])
    return out


def to_lev(loc, team):
    """Convert a location recorded in `team`'s frame into Leverkusen's frame."""
    if loc is None:
        return None
    x, y = loc[0], loc[1]
    return (x, y) if team == LEV else (120 - x, 80 - y)


def seconds(e):
    """Seconds since kick-off of the period, from the event timestamp."""
    h, m, s = e["timestamp"].split(":")
    return int(h) * 3600 + int(m) * 60 + float(s)


OVERRIDES = {"Álex Grimaldo": "Grimaldo", "Borja Iglesias": "Borja Iglesias", "Edmond Fayçal Tapsoba": "Tapsoba",
             "Arthur Augusto de Matos Soares": "Arthur", "Gustavo Adolfo Puerta Molano": "Puerta",
             "Odilon Kossonou": "Kossounou", "Ken Eghosa Gideon Izekor": "Izekor",
             "Francis-Ikechukwu Onyeka": "Onyeka", "Timothy Fosu-Mensah": "Fosu-Mensah"}


def short_name(nickname):
    """Display surname from StatsBomb's nickname field ('Florian Wirtz' -> 'Wirtz')."""
    if nickname in OVERRIDES:
        return OVERRIDES[nickname]
    return nickname.split()[-1]

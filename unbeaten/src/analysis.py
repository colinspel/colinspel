"""Season analysis for the report. Every metric is computed for Leverkusen AND for their
opponents in the same 34 matches, which is the baseline (StatsBomb released only
Leverkusen's matches, so league-wide baselines are not available)."""
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from load import LEV, matches, events, frames, lineups, to_lev, seconds, short_name, DATA

OUT = Path(__file__).resolve().parents[1] / "outputs"


def clock(s):
    m, sec = s.split(":")
    return int(m) + int(sec) / 60


def minutes_played():
    mins = defaultdict(float)
    for m in matches():
        ev = events(m["match_id"])
        end = max(e["minute"] + e["second"] / 60 for e in ev)
        raw = json.loads((DATA / "lineups" / f"{m['match_id']}.json").read_text())
        for team in raw:
            for p in team["lineup"]:
                for pos in p["positions"]:
                    a = clock(pos["from"])
                    b = clock(pos["to"]) if pos["to"] else end
                    mins[(team["team_name"] == LEV, p["player_id"])] += max(0, b - a)
    return mins


def is_goal(e):
    return e["type"]["name"] == "Shot" and e["shot"]["outcome"]["name"] == "Goal"


# ------------------------------------------------------------------ 1. how goals are built
def buildup():
    rows = {True: [], False: []}
    shots = {True: [], False: []}
    for m in matches():
        ev = events(m["match_id"])
        by_poss = defaultdict(list)
        for e in ev:
            by_poss[(e["period"], e["possession"])].append(e)
        for e in ev:
            if e["type"]["name"] != "Shot" or e["shot"]["type"]["name"] == "Penalty":
                continue
            lev = e["team"]["name"] == LEV
            poss = [x for x in by_poss[(e["period"], e["possession"])] if x["index"] <= e["index"]]
            passes = sum(1 for x in poss if x["type"]["name"] == "Pass" and x["team"]["name"] == e["team"]["name"])
            first = next(x for x in poss if "location" in x)
            sx = to_lev(first["location"], first["team"]["name"])[0]
            if not lev:
                sx = 120 - sx               # in the shooting team's own frame
            r = dict(passes=passes, secs=seconds(e) - seconds(poss[0]), start_x=sx,
                     pattern=e["play_pattern"]["name"], xg=e["shot"]["statsbomb_xg"],
                     set_piece=e["shot"]["type"]["name"] != "Open Play" or e["play_pattern"]["name"] in ("From Corner", "From Free Kick"))
            shots[lev].append(r)
            if is_goal(e):
                rows[lev].append(r)
    def summ(rs):
        if not rs:
            return {}
        p = np.array([r["passes"] for r in rs]); s = np.array([r["secs"] for r in rs]); x = np.array([r["start_x"] for r in rs])
        return dict(n=len(rs), median_passes=float(np.median(p)), share_10plus=float((p >= 10).mean()),
                    share_0to2=float((p <= 2).mean()), median_secs=float(np.median(s)),
                    share_started_own_half=float((x < 60).mean()),
                    share_set_piece=float(np.mean([r["set_piece"] for r in rs])),
                    patterns=dict(Counter(r["pattern"] for r in rs).most_common()))
    bins = [(0, 2), (3, 5), (6, 9), (10, 19), (20, 200)]
    dist = {}
    for lev in (True, False):
        p = [r["passes"] for r in rows[lev]]
        dist["lev" if lev else "opp"] = [sum(a <= v <= b for v in p) for a, b in bins]
    return dict(goals=dict(lev=summ(rows[True]), opp=summ(rows[False])),
                shots=dict(lev=summ(shots[True]), opp=summ(shots[False])),
                pass_bins=["0-2", "3-5", "6-9", "10-19", "20+"], pass_dist=dist)


# ------------------------------------------------------------------ 2. pass network
def pass_network(n_players=11):
    mins = minutes_played()
    loc = defaultdict(list); edges = Counter(); touches = Counter(); names = {}; numbers = {}
    total = 0
    for m in matches():
        lu = lineups(m["match_id"])
        for e in events(m["match_id"]):
            if e["team"]["name"] != LEV or e["type"]["name"] != "Pass":
                continue
            if e["pass"].get("type", {}).get("name") in ("Throw-in", "Corner", "Free Kick", "Goal Kick", "Kick Off"):
                continue
            if "outcome" in e["pass"]:
                continue                       # completed open-play passes only
            a, b = e["player"]["id"], e["pass"]["recipient"]["id"]
            total += 1
            loc[a].append(e["location"]); loc[b].append(e["pass"]["end_location"])
            touches[a] += 1; touches[b] += 1
            edges[tuple(sorted((a, b)))] += 1
            for pid in (a, b):
                names[pid] = short_name(lu[pid]["nickname"]); numbers[pid] = lu[pid]["number"]
    core = sorted(names, key=lambda p: -mins[(True, p)])[:n_players]
    nodes = []
    for pid in core:
        xy = np.median(np.array(loc[pid]), axis=0)
        nodes.append(dict(pid=pid, name=names[pid], num=numbers[pid], x=round(float(xy[0]), 1), y=round(float(xy[1]), 1),
                          touches=touches[pid], minutes=round(mins[(True, pid)]),
                          share=round(touches[pid] / total, 4),
                          per90=round(touches[pid] / mins[(True, pid)] * 90, 1)))
    cs = set(core)
    E = [dict(a=a, b=b, n=n, per90=round(n / max(1, min(mins[(True, a)], mins[(True, b)])) * 90, 2))
         for (a, b), n in edges.items() if a in cs and b in cs]
    E.sort(key=lambda r: -r["n"])
    return dict(nodes=sorted(nodes, key=lambda r: -r["touches"]), edges=E[:28], total_passes=total, n_players=n_players)


# ------------------------------------------------------------------ 3. late goals
def late_goals():
    """Goals and xG by match period (per 90 actually played, stoppage time included),
    and what Leverkusen's own late goals were worth in points."""
    labels = ["0-15", "15-30", "30-45+", "45-60", "60-75", "75-85", "85-90+"]
    def bin_of(period, minute):
        if period == 1:
            return 0 if minute < 15 else 1 if minute < 30 else 2
        return 3 if minute < 60 else 4 if minute < 75 else 5 if minute < 85 else 6
    g = {True: np.zeros(7), False: np.zeros(7)}; xg = {True: np.zeros(7), False: np.zeros(7)}
    played = np.zeros(7)
    base = 0
    late_value = {85: 0, 80: 0, 90: 0}
    flips = []
    for m in matches():
        ev = events(m["match_id"])
        for per in (1, 2):
            pe = [e for e in ev if e["period"] == per]
            end = max(e["minute"] + e["second"] / 60 for e in pe)
            if per == 1:
                played[0] += 15; played[1] += 15; played[2] += end - 30
            else:
                played[3] += 15; played[4] += 15; played[5] += 10; played[6] += end - 85
        gl = []
        for e in ev:
            if e["type"]["name"] == "Shot" or e["type"]["name"] == "Own Goal For":
                lev = e["team"]["name"] == LEV
                k = bin_of(e["period"], e["minute"])
                if e["type"]["name"] == "Shot":
                    xg[lev][k] += e["shot"]["statsbomb_xg"]
                if e["type"]["name"] == "Own Goal For" or is_goal(e):
                    g[lev][k] += 1; gl.append((e["period"], e["minute"], lev))
        f = sum(1 for p, mm, lev in gl if lev); a = sum(1 for p, mm, lev in gl if not lev)
        assert (f, a) == (m["gf"], m["ga"]), (m, f, a)
        pts = lambda f, a: 3 if f > a else 1 if f == a else 0
        full = pts(f, a); base += full
        for cut in late_value:
            f_cut = sum(1 for p, mm, lev in gl if lev and not (p == 2 and mm >= cut))
            late_value[cut] += full - pts(f_cut, a)
            if cut == 85 and pts(f_cut, a) != full:
                flips.append(dict(opponent=m["opponent"], date=m["date"], home=m["home"], final=f"{f}-{a}",
                                  without=f"{f_cut}-{a}", lost_points=full - pts(f_cut, a),
                                  becomes_loss=f_cut < a,
                                  late_minutes=[mm + 1 for p, mm, lev in gl if lev and p == 2 and mm >= 85]))
    per90 = lambda arr: [round(float(v / played[i] * 90), 2) for i, v in enumerate(arr)]
    return dict(labels=labels, minutes_played=[round(float(v)) for v in played],
                goals_for=g[True].tolist(), goals_against=g[False].tolist(),
                xg_for=[round(float(v), 2) for v in xg[True]], xg_against=[round(float(v), 2) for v in xg[False]],
                xg_for_per90=per90(xg[True]), xg_against_per90=per90(xg[False]),
                goals_for_per90=per90(g[True]),
                points=base, late_points={str(k): v for k, v in late_value.items()}, flips=flips,
                losses_without_85=sum(fl["becomes_loss"] for fl in flips),
                ratio_before75=round(float(g[True][:5].sum() / xg[True][:5].sum()), 3),
                ratio_after75=round(float(g[True][5:].sum() / xg[True][5:].sum()), 3),
                goals_after85=float(g[True][6]), xg_after85=round(float(xg[True][6]), 2))


# ------------------------------------------------------------------ 4. where they win it back
REGAIN_TYPES = {"Ball Recovery", "Interception"}


def regains():
    pts = {True: [], False: []}
    shot_after = {True: [0, 0], False: [0, 0]}     # [regains in final third, followed by a shot within 15 s]
    for m in matches():
        ev = events(m["match_id"])
        for i, e in enumerate(ev):
            t = e["type"]["name"]
            won = (t == "Ball Recovery" and not e.get("ball_recovery", {}).get("recovery_failure")) or \
                  (t == "Interception" and e["interception"]["outcome"]["name"] in ("Won", "Success In Play", "Success To Team")) or \
                  (t == "Duel" and e["duel"]["type"]["name"] == "Tackle" and e["duel"].get("outcome", {}).get("name") in ("Won", "Success In Play", "Success To Team"))
            if not won or "location" not in e:
                continue
            lev = e["team"]["name"] == LEV
            x, y = e["location"]                     # own frame: attacking to x = 120
            pts[lev].append((round(x, 1), round(y, 1)))
            if x >= 80:
                shot_after[lev][0] += 1
                t0 = seconds(e)
                for f in ev[i + 1:i + 60]:
                    if f["period"] != e["period"] or seconds(f) - t0 > 15:
                        break
                    if f["type"]["name"] == "Shot" and f["team"]["name"] == e["team"]["name"]:
                        shot_after[lev][1] += 1
                        break
    def grid(p):
        H = np.zeros((6, 4))                          # 6 bands along the pitch (20 yd), 4 across
        for x, y in p:
            H[min(5, int(x // 20)), min(3, int(y // 20))] += 1
        return (H / len(p)).round(4).tolist()
    out = {}
    for lev in (True, False):
        arr = np.array(pts[lev])
        out["lev" if lev else "opp"] = dict(
            n=len(arr), per_match=round(len(arr) / 34, 1), share_final_third=round(float((arr[:, 0] >= 80).mean()), 3),
            share_own_third=round(float((arr[:, 0] < 40).mean()), 3), grid=grid(pts[lev]),
            final_third_regains=shot_after[lev][0], shot_within_15s=shot_after[lev][1],
            shot_rate=round(shot_after[lev][1] / max(1, shot_after[lev][0]), 3),
            points=pts[lev])
    return out


# ------------------------------------------------------------------ 5. line-breaking passes (360)
def line_breakers(min_minutes=900):
    """A completed pass 'breaks lines' if it gains >= 10 yards towards goal and at least
    3 visible opponents stand between the passer and the receiver along the pitch
    (x strictly between start and end, in the 360 freeze frame at the moment of the pass)."""
    mins = minutes_played()
    cnt = Counter(); cnt_all = Counter(); recv = Counter(); names = {}; numbers = {}
    team = {True: [0, 0], False: [0, 0]}   # [line-breaking, completed passes with a frame]
    examples = defaultdict(list)
    for m in matches():
        ev, fr, lu = events(m["match_id"]), frames(m["match_id"]), lineups(m["match_id"])
        for e in ev:
            if e["type"]["name"] != "Pass" or "outcome" in e["pass"] or e["id"] not in fr:
                continue
            if e["pass"].get("type", {}).get("name") in ("Throw-in", "Corner", "Free Kick", "Goal Kick", "Kick Off"):
                continue
            lev = e["team"]["name"] == LEV
            x0, y0 = e["location"]; x1, y1 = e["pass"]["end_location"]
            opp = [p["location"] for p in fr[e["id"]]["freeze_frame"] if not p["teammate"] and not p["keeper"]]
            between = sum(1 for (ox, oy) in opp if x0 < ox < x1)
            lb = (x1 - x0 >= 10) and between >= 3
            team[lev][1] += 1
            if lb:
                team[lev][0] += 1
            if lev:
                pid = e["player"]["id"]
                names[pid] = short_name(lu[pid]["nickname"]); numbers[pid] = lu[pid]["number"]
                cnt_all[pid] += 1
                rid = e["pass"]["recipient"]["id"]
                names[rid] = short_name(lu[rid]["nickname"]); numbers[rid] = lu[rid]["number"]
                if lb:
                    cnt[pid] += 1
                    recv[rid] += 1
                    examples[pid].append([round(x0, 1), round(y0, 1), round(x1, 1), round(y1, 1)])
    players = [dict(name=names[p], num=numbers[p], n=cnt[p], per90=round(cnt[p] / mins[(True, p)] * 90, 2),
                    share=round(cnt[p] / cnt_all[p], 3), minutes=round(mins[(True, p)]), pid=p)
               for p in cnt if mins[(True, p)] >= min_minutes]
    players.sort(key=lambda r: -r["per90"])
    receivers = [dict(name=names[p], num=numbers[p], n=recv[p], per90=round(recv[p] / mins[(True, p)] * 90, 2))
                 for p in recv if mins[(True, p)] >= min_minutes]
    receivers.sort(key=lambda r: -r["per90"])
    top = players[0]["pid"]
    return dict(players=players[:10], receivers=receivers[:8], team=dict(lev=team[True], opp=team[False],
                lev_rate=round(team[True][0] / team[True][1], 4), opp_rate=round(team[False][0] / team[False][1], 4),
                lev_per_match=round(team[True][0] / 34, 1), opp_per_match=round(team[False][0] / 34, 1)),
                top_examples=examples[top], top_name=names[top], min_minutes=min_minutes)


def season():
    ms = matches()
    return dict(played=len(ms), won=sum(m["gf"] > m["ga"] for m in ms), drawn=sum(m["gf"] == m["ga"] for m in ms),
                lost=sum(m["gf"] < m["ga"] for m in ms), gf=sum(m["gf"] for m in ms), ga=sum(m["ga"] for m in ms),
                points=sum(3 if m["gf"] > m["ga"] else 1 if m["gf"] == m["ga"] else 0 for m in ms),
                results=[dict(date=m["date"], opp=m["opponent"], home=m["home"], gf=m["gf"], ga=m["ga"]) for m in ms])


if __name__ == "__main__":
    R = dict(season=season(), buildup=buildup(), network=pass_network(), late=late_goals(),
             regains=regains(), lines=line_breakers())
    (OUT / "analysis.json").write_text(json.dumps(R))
    s = R["season"]; print({k: v for k, v in s.items() if k != "results"})
    print(json.dumps(R["buildup"]["goals"], indent=0)[:900]); print(R["buildup"]["pass_dist"])
    print({k: v for k, v in R["late"].items()})
    print({k: {kk: vv for kk, vv in v.items() if kk not in ("grid", "points")} for k, v in R["regains"].items()})
    print(R["lines"]["team"]); print([(p["name"], p["per90"], p["n"]) for p in R["lines"]["players"]])
    print([(p["name"], p["per90"], p["n"]) for p in R["lines"]["receivers"]])
    print([(n["name"], n["num"], n["minutes"], n["share"], n["x"], n["y"]) for n in R["network"]["nodes"]])

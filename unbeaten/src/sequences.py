"""Turn every Leverkusen goal into an animation: ball path, player tracks, captions.

What is real and what is reconstructed:
- Ball path: event locations and pass/carry end points, timed by event timestamps.
- Player positions: StatsBomb 360 freeze frames (what the broadcast camera saw at each
  event) plus the named shot freeze frame. Between frames, movement is interpolated.
- Player identity: the player on the ball is known at every event. Everyone in the shot
  freeze frame is named. Other dots are linked frame to frame by minimum-distance
  assignment with a speed gate, starting from the named shot frame and working backwards.
  Dots that can't be linked stay unnamed.
"""
import json
import sys
from pathlib import Path

import numpy as np
from scipy.optimize import linear_sum_assignment

sys.path.insert(0, str(Path(__file__).parent))
from load import LEV, matches, events, frames, lineups, to_lev, seconds, short_name

MAX_SECONDS = 45          # animate at most the last 45 s of the possession
SPEED = 11.0              # yards per second gate for linking dots between frames
NOISE = 5.0               # yards of slack for freeze-frame noise
MAX_GAP = 3.0             # seconds off camera before a player fades out
ON_BALL = {"Pass", "Carry", "Shot", "Dribble", "Ball Receipt*"}


def describe(e, lu):
    t = e["type"]["name"]
    who = short_name(lu[e["player"]["id"]]["nickname"]) if "player" in e and e["player"]["id"] in lu else ""
    if t == "Pass":
        rec = e["pass"].get("recipient")
        to = f" to {short_name(lu[rec['id']]['nickname'])}" if rec and rec["id"] in lu else ""
        kind = e["pass"].get("type", {}).get("name")
        verb = {"Corner": "corner", "Throw-in": "throw-in", "Free Kick": "free kick", "Goal Kick": "goal kick",
                "Kick Off": "kick-off"}.get(kind, "cross" if e["pass"].get("cross") else "pass")
        return f"{who} {verb}{to}"
    if t == "Carry":
        return f"{who} carries"
    if t == "Dribble":
        return f"{who} dribbles"
    if t == "Shot":
        return f"{who} scores"
    return None


def build_goal(match, shot, ev, fr, lu):
    poss = [e for e in ev if e["possession"] == shot["possession"] and e["index"] <= shot["index"]
            and e["period"] == shot["period"]]
    t_end = seconds(shot)
    t0 = max(seconds(poss[0]), t_end - MAX_SECONDS)
    seq = [e for e in poss if seconds(e) >= t0]
    # start the clip on an on-ball Leverkusen event so it doesn't open mid-air
    while seq and not (seq[0]["type"]["name"] in ON_BALL and seq[0]["team"]["name"] == LEV):
        seq = seq[1:]
    t0 = seconds(seq[0])

    # ---------------- ball path
    ball, caps = [], []
    for e in seq:
        if "location" not in e:
            continue
        t = seconds(e) - t0
        loc = to_lev(e["location"], e["team"]["name"])
        ball.append((t, *loc))
        typ = e["type"]["name"]
        end = None
        if typ == "Pass":
            end = to_lev(e["pass"]["end_location"], e["team"]["name"])
        elif typ == "Carry":
            end = to_lev(e["carry"]["end_location"], e["team"]["name"])
        elif typ == "Shot":
            end = to_lev(e["shot"]["end_location"][:2], e["team"]["name"])
        if end is not None:
            dur = max(e.get("duration") or 0.4, 0.25)
            ball.append((t + dur, *end))
        c = describe(e, lu) if e["team"]["name"] == LEV else None
        if c and (not caps or caps[-1][1] != c):
            caps.append((t, c))
    ball.sort()

    # ---------------- keyframes of players (Leverkusen frame), team 'L' or 'O'
    keys = []
    for e in seq:
        f = fr.get(e["id"])
        if not f or "location" not in e:
            continue
        lev_actor = e["team"]["name"] == LEV
        dots = []
        for p in f["freeze_frame"]:
            team = "L" if (p["teammate"] == lev_actor) else "O"
            x, y = to_lev(p["location"], e["team"]["name"])
            pid = e["player"]["id"] if p["actor"] else None
            dots.append(dict(team=team, x=x, y=y, pid=pid, keeper=p["keeper"]))
        keys.append((seconds(e) - t0, dots))
    # named shot freeze frame as the final keyframe
    t_shot = t_end - t0
    dots = [dict(team="L", x=shot["location"][0], y=shot["location"][1], pid=shot["player"]["id"], keeper=False)]
    for p in shot["shot"].get("freeze_frame", []):
        x, y = p["location"]
        dots.append(dict(team="L" if p["teammate"] else "O", x=x, y=y, pid=p["player"]["id"],
                         keeper=p["position"]["name"] == "Goalkeeper"))
    keys = [k for k in keys if k[0] < t_shot - 0.15] + [(t_shot, dots)]
    # consecutive events (receipt -> carry) often share a timestamp and a near-identical
    # frame; keep one frame per 0.15 s so a player can't be "seen twice" at once
    merged = []
    for t, d in sorted(keys, key=lambda k: k[0]):
        if merged and t - merged[-1][0] < 0.15:
            if len(d) > len(merged[-1][1]) or t == t_shot:
                merged[-1] = (t, d)
            continue
        merged.append((t, d))
    keys = merged

    # ---------------- link dots into tracks, working backwards from the named shot frame
    tracks = []      # each: dict(team, pid, keeper, obs={t:(x,y)})
    for t, dots in reversed(keys):
        for team in ("L", "O"):
            dd = [d for d in dots if d["team"] == team]
            live = [tr for tr in tracks if tr["team"] == team]
            used_tr, used_d = set(), set()
            # 1) dots with a known identity attach to that player's track
            for i, d in enumerate(dd):
                if d["pid"] is None:
                    continue
                tr = next((tr for tr in live if tr["pid"] == d["pid"]), None)
                if tr is None:
                    tr = dict(team=team, pid=d["pid"], keeper=d["keeper"], obs={})
                    tracks.append(tr); live.append(tr)
                if id(tr) in used_tr:
                    continue
                tr["obs"][t] = (d["x"], d["y"])
                used_tr.add(id(tr)); used_d.add(i)
            # 2) the rest: minimum-distance assignment with a speed gate
            cand_tr = [tr for tr in live if id(tr) not in used_tr and t not in tr["obs"]]
            cand_d = [i for i in range(len(dd)) if i not in used_d]
            if cand_tr and cand_d:
                C = np.full((len(cand_d), len(cand_tr)), 1e6)
                for a, i in enumerate(cand_d):
                    for b, tr in enumerate(cand_tr):
                        tn = min(tr["obs"])                      # nearest later observation
                        if dd[i]["keeper"] != tr["keeper"]:
                            continue
                        dist = np.hypot(dd[i]["x"] - tr["obs"][tn][0], dd[i]["y"] - tr["obs"][tn][1])
                        if dist <= SPEED * (tn - t) + NOISE:
                            C[a, b] = dist
                r, c = linear_sum_assignment(C)
                for a, b in zip(r, c):
                    if C[a, b] < 1e6:
                        cand_tr[b]["obs"][t] = (dd[cand_d[a]]["x"], dd[cand_d[a]]["y"])
                        used_d.add(cand_d[a])
            for i, d in enumerate(dd):
                if i not in used_d:
                    tracks.append(dict(team=team, pid=None, keeper=d["keeper"], obs={t: (d["x"], d["y"])}))

    # ---------------- anchor players to the ball: whoever plays, carries or receives the ball
    # is placed exactly where the event says, at the moment it says. Freeze-frame sightings
    # of that player within 0.4 s are dropped so the anchor wins.
    def track_for(pid, team, keeper=False):
        tr = next((x for x in tracks if x["pid"] == pid), None)
        if tr is None:
            tr = dict(team=team, pid=pid, keeper=keeper, obs={})
            tracks.append(tr)
        return tr

    def anchor(pid, team, t, loc, keeper=False):
        if t > t_shot + 0.05:
            return
        tr = track_for(pid, team, keeper)
        for k in [k for k in tr["obs"] if abs(k - t) < 0.4]:
            del tr["obs"][k]
        tr["obs"][round(t, 3)] = (float(loc[0]), float(loc[1]))
        tr.setdefault("anchors", set()).add(round(t, 3))

    bseg = []          # ball segments: [t0, t1, kind, x0, y0, x1, y1, height, pid]
    for e in seq:
        if "location" not in e or "player" not in e:
            continue
        team = "L" if e["team"]["name"] == LEV else "O"
        t = seconds(e) - t0
        loc = to_lev(e["location"], e["team"]["name"])
        typ = e["type"]["name"]
        gk = e.get("position", {}).get("name") == "Goalkeeper"
        if typ in ("Pass", "Carry", "Ball Receipt*", "Shot", "Dribble", "Ball Recovery", "Interception",
                   "Duel", "Clearance", "Block", "Goal Keeper", "Pressure", "Miscontrol", "Dispossessed"):
            anchor(e["player"]["id"], team, t, loc, gk)
        dur = max(e.get("duration") or 0.0, 0.0)
        if typ == "Carry":
            end = to_lev(e["carry"]["end_location"], e["team"]["name"])
            dur = max(dur, 0.3)
            anchor(e["player"]["id"], team, t + dur, end, gk)
            bseg.append([t, t + dur, "c", *loc, *end, 0, e["player"]["id"]])
        elif typ == "Pass":
            end = to_lev(e["pass"]["end_location"], e["team"]["name"])
            dur = max(dur, 0.3)
            h = {"Ground Pass": 0, "Low Pass": 1, "High Pass": 2}.get(e["pass"].get("height", {}).get("name"), 0)
            bseg.append([t, t + dur, "p", *loc, *end, h, None])
            rec = e["pass"].get("recipient")
            if rec and "outcome" not in e["pass"]:
                anchor(rec["id"], team, t + dur, end)
        elif typ == "Shot":
            ex, ey = e["shot"]["end_location"][:2]
            ez = e["shot"]["end_location"][2] if len(e["shot"]["end_location"]) > 2 else 0.2
            dur = max(dur, 0.35)
            bseg.append([t, t + dur, "s", *loc, ex, ey, ez, None])

    # drop freeze-frame sightings that would need an impossible sprint (> 10 yd/s) to reach
    # from the neighbouring points; event anchors are never dropped
    for tr in tracks:
        anc = tr.get("anchors", set())
        for _ in range(3):
            ts = sorted(tr["obs"])
            bad = []
            for i, t in enumerate(ts):
                if t in anc:
                    continue
                for j in (i - 1, i + 1):
                    if 0 <= j < len(ts):
                        u = ts[j]; dt = abs(u - t)
                        d = np.hypot(tr["obs"][t][0] - tr["obs"][u][0], tr["obs"][t][1] - tr["obs"][u][1])
                        if dt > 0 and d / dt > 10 and d > 3:
                            bad.append(t); break
            if not bad:
                break
            for t in bad:
                tr["obs"].pop(t, None)

    key_times = [k[0] for k in keys]
    out_tracks = []
    for tr in tracks:
        if not tr["obs"] or (len(tr["obs"]) < 2 and tr["pid"] is None):
            continue          # a single anonymous sighting adds flicker, not information
        info = lu.get(tr["pid"], {}) if tr["pid"] else {}
        out_tracks.append(dict(
            pid=tr["pid"], team=tr["team"], keeper=tr["keeper"],
            num=info.get("number") if tr["team"] == "L" else None,
            name=short_name(info["nickname"]) if info else None,
            pts=[[round(t, 2), round(x, 1), round(y, 1)] for t, (x, y) in sorted(tr["obs"].items())]))
    # mark gaps: if a player was off camera for more than MAX_GAP seconds, don't draw
    # an invented path across the gap (the player fades out and back in)
    for tr in out_tracks:
        tr["gaps"] = [[a[0], b[0]] for a, b in zip(tr["pts"], tr["pts"][1:])
                      if b[0] - a[0] > MAX_GAP and any(a[0] + 0.3 < kt < b[0] - 0.3 for kt in key_times)]

    # ---------------- meta
    key_pass = next((e for e in ev if e["id"] == shot["shot"].get("key_pass_id")), None)
    passes = [e for e in poss if e["type"]["name"] == "Pass" and e["team"]["name"] == LEV]
    lev_players = {e["player"]["id"] for e in poss if e["team"]["name"] == LEV and "player" in e}
    score_before = goals_before(ev, shot)
    meta = dict(
        match_id=match["match_id"], date=match["date"], opponent=match["opponent"], home=match["home"],
        final=f"{match['gf']}-{match['ga']}", minute=shot["minute"], second=shot["second"], period=shot["period"],
        scorer=short_name(lu[shot["player"]["id"]]["nickname"]),
        assist=short_name(lu[key_pass["player"]["id"]]["nickname"]) if key_pass else None,
        xg=round(shot["shot"]["statsbomb_xg"], 3), body=shot["shot"]["body_part"]["name"],
        shot_type=shot["shot"]["type"]["name"], pattern=shot["play_pattern"]["name"],
        poss_passes=len(passes), poss_players=len(lev_players),
        poss_seconds=round(t_end - seconds(poss[0]), 1),
        clip_seconds=round(t_shot, 1), frames=len(keys),
        named_lev=sum(1 for t in out_tracks if t["team"] == "L" and t["name"]),
        score_before=score_before, start_x=round(to_lev(poss[0].get("location", [60, 40]), poss[0]["team"]["name"])[0], 1))
    # carries reference the carrier's track index so the ball can stay at his feet
    idx = {tr["pid"]: i for i, tr in enumerate(out_tracks) if tr["pid"]}
    segs = []
    for t_a, t_b, kind, x0, y0, x1, y1, h, pid in sorted(bseg):
        segs.append([round(t_a, 2), round(t_b, 2), kind, round(x0, 1), round(y0, 1), round(x1, 1), round(y1, 1),
                     round(h, 2), idx.get(pid, -1)])
    for tr in out_tracks:
        tr.pop("pid", None)
    return dict(meta=meta, dur=round(t_shot + 1.2, 2), bseg=segs,
                ball=[[round(t, 2), round(x, 1), round(y, 1)] for t, x, y in ball],
                caps=[[round(t, 2), c] for t, c in caps], tracks=out_tracks)


def goals_before(ev, shot):
    """Leverkusen and opponent goals before this shot (incl. own goals)."""
    lf = la = 0
    for e in ev:
        if e["index"] >= shot["index"]:
            break
        if e["type"]["name"] == "Shot" and e["shot"]["outcome"]["name"] == "Goal":
            if e["team"]["name"] == LEV:
                lf += 1
            else:
                la += 1
        if e["type"]["name"] == "Own Goal For":
            if e["team"]["name"] == LEV:
                lf += 1
            else:
                la += 1
    return [lf, la]


def all_goals(include_penalties=False):
    out = []
    for m in matches():
        ev, fr, lu = events(m["match_id"]), frames(m["match_id"]), lineups(m["match_id"])
        for e in ev:
            if e["type"]["name"] == "Shot" and e["team"]["name"] == LEV and e["shot"]["outcome"]["name"] == "Goal":
                if e["shot"]["type"]["name"] == "Penalty" and not include_penalties:
                    continue
                out.append(build_goal(m, e, ev, fr, lu))
    return out


if __name__ == "__main__":
    gs = all_goals()
    OUT = Path(__file__).resolve().parents[1] / "outputs"
    OUT.mkdir(exist_ok=True)
    (OUT / "goals.json").write_text(json.dumps(gs, separators=(",", ":")))
    print(len(gs), "goals,", round((OUT / "goals.json").stat().st_size / 1024), "KB")
    for g in gs[:3]:
        m = g["meta"]
        print(m["opponent"], m["minute"], m["scorer"], m["assist"], m["frames"], len(g["tracks"]), m["named_lev"], g["caps"][:4])
    print("median frames", np.median([g["meta"]["frames"] for g in gs]), "no-360 clips", sum(g["meta"]["frames"] <= 1 for g in gs))

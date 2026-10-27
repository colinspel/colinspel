"""Minimal reader for R .rds files containing data.frames (XDR format, version 2/3)."""
import gzip, bz2, lzma, struct
import numpy as np
import pandas as pd

NA_INT = -2147483648


class R:
    def __init__(self, b):
        self.b = b; self.p = 0; self.refs = []

    def i(self):
        v = struct.unpack('>i', self.b[self.p:self.p + 4])[0]; self.p += 4; return v

    def d(self, n):
        a = np.frombuffer(self.b, dtype='>f8', count=n, offset=self.p).astype(float); self.p += 8 * n; return a

    def ints(self, n):
        a = np.frombuffer(self.b, dtype='>i4', count=n, offset=self.p).astype(np.int64); self.p += 4 * n; return a

    def length(self):
        n = self.i()
        if n == -1:
            hi = self.i(); lo = self.i(); n = (hi << 32) + lo
        return n

    def item(self):
        flags = self.i()
        t = flags & 0xFF
        has_attr = bool(flags & (1 << 9)); has_tag = bool(flags & (1 << 10))
        if t == 254 or t == 242:  # NILVALUE / EMPTYENV
            return None
        if t == 252 or t == 253 or t == 251 or t == 250:  # global env, unbound, missing, baseenv
            return None
        if t == 255:  # REFSXP
            idx = flags >> 8
            if idx == 0: idx = self.i()
            return self.refs[idx - 1]
        if t == 1:  # SYMSXP
            s = self.item(); self.refs.append(s); return s
        if t == 9:  # CHARSXP
            n = self.i()
            if n == -1: return None
            s = self.b[self.p:self.p + n].decode('utf-8', 'replace'); self.p += n; return s
        if t == 2:  # LISTSXP pairlist
            out = {}
            while True:
                attr = self.item() if has_attr else None
                tag = self.item() if has_tag else None
                val = self.item()
                out[tag] = val
                f2 = self.i(); t2 = f2 & 0xFF
                if t2 == 254: break
                has_attr = bool(f2 & (1 << 9)); has_tag = bool(f2 & (1 << 10))
            return out
        if t == 238:  # ALTREP
            info = self.item(); state = self.item(); attr = self.item()
            cls = info and list(info.values())[0] if isinstance(info, dict) else None
            # compact_intseq: state is real vector (n, start, step)
            if isinstance(state, np.ndarray) and len(state) == 3:
                n, s, st = state
                return np.arange(s, s + n * st, st)
            if isinstance(state, dict):
                return list(state.values())[0]
            return state
        if t == 4:  # ENVSXP
            locked = self.i(); env = {}
            self.refs.append(env)
            self.item(); self.item(); self.item(); self.item()
            return env
        if t in (10, 13):  # LGL/INT
            n = self.length(); v = self.ints(n).astype(float); v[v == NA_INT] = np.nan; res = v
        elif t == 14:
            n = self.length(); res = self.d(n)
        elif t == 16:
            n = self.length(); res = [self.item() for _ in range(n)]
        elif t == 19 or t == 20:
            n = self.length(); res = [self.item() for _ in range(n)]
        else:
            raise ValueError(f'unsupported SEXP type {t} at {self.p}')
        attrs = self.item() if has_attr else None
        return Obj(res, attrs) if attrs else res


class Obj:
    def __init__(self, v, a): self.v = v; self.a = a


def read_rds(path):
    raw = open(path, 'rb').read()
    for dec in (gzip.decompress, bz2.decompress, lzma.decompress):
        try: raw = dec(raw); break
        except Exception: pass
    assert raw[:2] == b'X\n', raw[:2]
    r = R(raw); r.p = 2
    ver = r.i(); r.i(); r.i()
    if ver == 3:
        n = r.i(); r.p += n
    o = r.item()
    names = o.a['names']
    cols = {}
    for nm, col in zip(names, o.v):
        if isinstance(col, Obj): col = col.v
        cols[nm] = col
    return pd.DataFrame(cols)

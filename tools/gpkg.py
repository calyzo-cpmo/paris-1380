# Lecture minimale d'un GeoPackage (sqlite3 + WKB), sans dépendance.
import sqlite3, struct

def _wkb(buf, o):
    le = buf[o] == 1; f = '<' if le else '>'
    t = struct.unpack_from(f + 'I', buf, o + 1)[0]; o += 5
    base = t % 1000; dim = 2 + (1 if (t // 1000) in (1, 2) else 0) + (1 if (t // 1000) == 3 else 0)
    if t & 0x80000000: dim = 3; base = t & 0xff
    def pts(o):
        n = struct.unpack_from(f + 'I', buf, o)[0]; o += 4
        out = []
        for _ in range(n):
            c = struct.unpack_from(f + 'd' * dim, buf, o); o += 8 * dim; out.append((c[0], c[1]))
        return out, o
    if base == 1:
        c = struct.unpack_from(f + 'd' * dim, buf, o); return ('Point', (c[0], c[1])), o + 8 * dim
    if base == 2:
        p, o = pts(o); return ('LineString', p), o
    if base == 3:
        n = struct.unpack_from(f + 'I', buf, o)[0]; o += 4; rings = []
        for _ in range(n):
            p, o = pts(o); rings.append(p)
        return ('Polygon', rings), o
    if base in (4, 5, 6, 7):
        n = struct.unpack_from(f + 'I', buf, o)[0]; o += 4; parts = []
        for _ in range(n):
            g, o = _wkb(buf, o); parts.append(g)
        return ({4: 'MultiPoint', 5: 'MultiLineString', 6: 'MultiPolygon', 7: 'Collection'}[base], parts), o
    raise ValueError('type WKB %d' % t)

def geometry(blob):
    if blob is None: return None
    flags = blob[3]; n = [0, 32, 48, 48, 64][(flags >> 1) & 7]
    if flags & 0x10: return None            # géométrie vide
    return _wkb(blob, 8 + n)[0]

def polygons(g):
    """Liste des polygones [anneau extérieur, trous…] d'une géométrie."""
    if g is None: return []
    if g[0] == 'Polygon': return [g[1]]
    if g[0] in ('MultiPolygon', 'Collection'): return [q for p in g[1] for q in polygons(p)]
    return []

def lines(g):
    if g is None: return []
    if g[0] == 'LineString': return [g[1]]
    if g[0] in ('MultiLineString', 'Collection'): return [q for p in g[1] for q in lines(p)]
    return []

def read(path, table=None):
    db = sqlite3.connect('file:' + path + '?mode=ro', uri=True); db.row_factory = sqlite3.Row
    if table is None: table = db.execute("select table_name from gpkg_contents where data_type='features'").fetchone()[0]
    gcol = db.execute("select column_name from gpkg_geometry_columns where table_name=?", (table,)).fetchone()[0]
    for r in db.execute(f'select * from "{table}"'):
        d = dict(r); g = geometry(d.pop(gcol)); yield d, g

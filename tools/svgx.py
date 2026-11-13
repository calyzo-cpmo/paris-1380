"""Minimal SVG geometry extractor (paths flattened to polylines)."""
import re, math
import xml.etree.ElementTree as ET

def tag(e): return e.tag.split('}')[-1]

def parse_transform(s):
    m = [1,0,0,1,0,0]
    if not s: return m
    for name, args in re.findall(r'(\w+)\s*\(([^)]*)\)', s):
        a = [float(x) for x in re.split(r'[\s,]+', args.strip()) if x]
        if name == 'matrix': t = a
        elif name == 'translate': t = [1,0,0,1,a[0],a[1] if len(a)>1 else 0]
        elif name == 'scale': t = [a[0],0,0,a[1] if len(a)>1 else a[0],0,0]
        elif name == 'rotate':
            c, s_ = math.cos(math.radians(a[0])), math.sin(math.radians(a[0]))
            t = [c,s_,-s_,c,0,0]
            if len(a) == 3:
                cx, cy = a[1], a[2]
                t = mul(mul([1,0,0,1,cx,cy], t), [1,0,0,1,-cx,-cy])
        else: t = [1,0,0,1,0,0]
        m = mul(m, t)
    return m

def mul(a, b):
    return [a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1], a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3], a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]]

def apply(m, p): return (m[0]*p[0]+m[2]*p[1]+m[4], m[1]*p[0]+m[3]*p[1]+m[5])

TOK = re.compile(r'([MmLlHhVvCcSsQqTtAaZz])|(-?\d*\.?\d+(?:[eE][-+]?\d+)?)')

def flatten_cubic(p0,p1,p2,p3,tol,out):
    # adaptive by control-polygon flatness
    d1 = dist_pt_line(p1,p0,p3); d2 = dist_pt_line(p2,p0,p3)
    if max(d1,d2) <= tol:
        out.append(p3); return
    m01=mid(p0,p1); m12=mid(p1,p2); m23=mid(p2,p3); a=mid(m01,m12); b=mid(m12,m23); c=mid(a,b)
    flatten_cubic(p0,m01,a,c,tol,out); flatten_cubic(c,b,m23,p3,tol,out)

def mid(a,b): return ((a[0]+b[0])/2,(a[1]+b[1])/2)
def dist_pt_line(p,a,b):
    dx,dy=b[0]-a[0],b[1]-a[1]; L=math.hypot(dx,dy)
    if L<1e-12: return math.hypot(p[0]-a[0],p[1]-a[1])
    return abs((p[0]-a[0])*dy-(p[1]-a[1])*dx)/L

def parse_path(d, tol=0.05):
    """returns list of (points, closed)"""
    toks = TOK.findall(d)
    i = 0; subs=[]; cur=None; pos=(0,0); start=(0,0); cmd=None; lastc=None; lastcmd=None
    def num():
        nonlocal i
        v=float(toks[i][1]); i+=1; return v
    while i < len(toks):
        if toks[i][0]:
            cmd = toks[i][0]; i+=1
            if cmd in 'Zz':
                if cur is not None:
                    subs.append((cur, True)); cur=None
                pos = start; lastcmd=cmd; continue
        c = cmd
        rel = c.islower(); C = c.upper()
        if C == 'M':
            x,y = num(),num()
            if rel: x+=pos[0]; y+=pos[1]
            if cur is not None and len(cur)>1: subs.append((cur, False))
            pos=(x,y); start=pos; cur=[pos]
            cmd = 'l' if rel else 'L'
        elif C == 'L':
            x,y = num(),num()
            if rel: x+=pos[0]; y+=pos[1]
            pos=(x,y)
            if cur is None: cur=[start]
            cur.append(pos)
        elif C == 'H':
            x = num()
            if rel: x+=pos[0]
            pos=(x,pos[1])
            if cur is None: cur=[start]
            cur.append(pos)
        elif C == 'V':
            y = num()
            if rel: y+=pos[1]
            pos=(pos[0],y)
            if cur is None: cur=[start]
            cur.append(pos)
        elif C in 'CS':
            if C=='C':
                x1,y1,x2,y2,x,y = num(),num(),num(),num(),num(),num()
                if rel: x1+=pos[0];y1+=pos[1];x2+=pos[0];y2+=pos[1];x+=pos[0];y+=pos[1]
            else:
                x2,y2,x,y = num(),num(),num(),num()
                if rel: x2+=pos[0];y2+=pos[1];x+=pos[0];y+=pos[1]
                if lastcmd and lastcmd.upper() in 'CS' and lastc: x1,y1 = 2*pos[0]-lastc[0], 2*pos[1]-lastc[1]
                else: x1,y1 = pos
            if cur is None: cur=[start]
            flatten_cubic(pos,(x1,y1),(x2,y2),(x,y),tol,cur)
            lastc=(x2,y2); pos=(x,y)
        elif C in 'QT':
            if C=='Q':
                x1,y1,x,y = num(),num(),num(),num()
                if rel: x1+=pos[0];y1+=pos[1];x+=pos[0];y+=pos[1]
            else:
                x,y = num(),num()
                if rel: x+=pos[0];y+=pos[1]
                if lastcmd and lastcmd.upper() in 'QT' and lastc: x1,y1 = 2*pos[0]-lastc[0], 2*pos[1]-lastc[1]
                else: x1,y1 = pos
            c1=(pos[0]+2/3*(x1-pos[0]),pos[1]+2/3*(y1-pos[1])); c2=(x+2/3*(x1-x),y+2/3*(y1-y))
            if cur is None: cur=[start]
            flatten_cubic(pos,c1,c2,(x,y),tol,cur)
            lastc=(x1,y1); pos=(x,y)
        elif C == 'A':
            rx,ry,rot,la,sw,x,y = num(),num(),num(),num(),num(),num(),num()
            if rel: x+=pos[0];y+=pos[1]
            if cur is None: cur=[start]
            cur.append((x,y)); pos=(x,y)  # arcs are not used by Illustrator exports; straight fallback
        else:
            i+=1
        lastcmd = c
    if cur is not None and len(cur)>1: subs.append((cur, False))
    return subs

def pts_attr(s):
    v=[float(x) for x in re.split(r'[\s,]+', s.strip()) if x]
    return [(v[i],v[i+1]) for i in range(0,len(v)-1,2)]

def shapes_of(g, tol=0.05, inherit=None):
    """yield dict(kind, pts, closed, fill, stroke, sw, dash, opacity, r)"""
    out=[]
    def rec(e, m, st):
        for k in e:
            t = tag(k)
            m2 = mul(m, parse_transform(k.attrib.get('transform')))
            st2 = dict(st)
            for a in ('fill','stroke','stroke-width','stroke-dasharray','opacity','display'):
                if a in k.attrib: st2[a]=k.attrib[a]
            if t == 'g' or t=='switch': rec(k, m2, st2); continue
            base = dict(fill=st2.get('fill','#000000'), stroke=st2.get('stroke','none'), sw=float(st2.get('stroke-width','1')), dash=st2.get('stroke-dasharray',''), opacity=float(st2.get('opacity','1')))
            if st2.get('display')=='none': continue
            if t == 'path':
                subs = parse_path(k.attrib.get('d',''), tol)
                def _a(pts):
                    return abs(sum(pts[i][0]*pts[(i+1)%len(pts)][1]-pts[(i+1)%len(pts)][0]*pts[i][1] for i in range(len(pts))))
                if len(subs) > 1 and base['fill'] != 'none': subs = sorted(subs, key=lambda s: -_a(s[0]))
                pid = id(k)
                for si, (pts, closed) in enumerate(subs):
                    out.append(dict(base, kind='path', pts=[apply(m2,p) for p in pts], closed=closed, pid=pid, sub=si))
            elif t == 'polygon':
                out.append(dict(base, kind='polygon', pts=[apply(m2,p) for p in pts_attr(k.attrib.get('points',''))], closed=True))
            elif t == 'polyline':
                out.append(dict(base, kind='polyline', pts=[apply(m2,p) for p in pts_attr(k.attrib.get('points',''))], closed=False))
            elif t == 'line':
                out.append(dict(base, kind='line', pts=[apply(m2,(float(k.attrib.get('x1',0)),float(k.attrib.get('y1',0)))), apply(m2,(float(k.attrib.get('x2',0)),float(k.attrib.get('y2',0))))], closed=False))
            elif t == 'circle':
                c = apply(m2,(float(k.attrib.get('cx',0)),float(k.attrib.get('cy',0))))
                out.append(dict(base, kind='circle', pts=[c], r=float(k.attrib.get('r',0))*math.sqrt(abs(m2[0]*m2[3]-m2[1]*m2[2])), closed=True))
            elif t == 'rect':
                x,y,w,h = (float(k.attrib.get(a,0)) for a in ('x','y','width','height'))
                out.append(dict(base, kind='rect', pts=[apply(m2,p) for p in [(x,y),(x+w,y),(x+w,y+h),(x,y+h)]], closed=True))
    rec(g, [1,0,0,1,0,0], inherit or {})
    return out

def texts_of(g):
    """returns list of label groups: each = list of (string, x, y, angle_deg, fontsize) fragments"""
    groups=[]
    def collect(e, m, acc):
        for k in e:
            t = tag(k)
            m2 = mul(m, parse_transform(k.attrib.get('transform')))
            if t == 'text':
                # tspans
                base = m2
                parts = []
                if k.text and k.text.strip(): parts.append((k.text, 0.0, 0.0))
                for ts in k:
                    if tag(ts)=='tspan' and ts.text:
                        parts.append((ts.text, float(ts.attrib.get('x','0').split()[0]), float(ts.attrib.get('y','0').split()[0])))
                fs = float(k.attrib.get('font-size', '0') or 0)
                for s,x,y in parts:
                    p = apply(base,(x,y))
                    ang = math.degrees(math.atan2(base[1], base[0]))
                    if not fs:
                        for ts in k:
                            if 'font-size' in ts.attrib: fs=float(ts.attrib['font-size']); break
                    acc.append((s, p[0], p[1], ang, fs))
            else:
                collect(k, m2, acc)
    for k in g:
        acc=[]
        if tag(k)=='text':
            wrapper = ET.Element('g'); wrapper.append(k); collect(wrapper, [1,0,0,1,0,0], acc)
        else:
            collect(k, parse_transform(k.attrib.get('transform')), acc)
        if acc: groups.append(acc)
    return groups

def load(path):
    root = ET.parse(path).getroot()
    layers = {}
    for g in root:
        if tag(g)=='g': layers[g.attrib.get('id','')] = g
    return root, layers

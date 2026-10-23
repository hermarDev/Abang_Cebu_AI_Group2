#!/usr/bin/env python3
"""Render the project's uncompressed diagrams.net mxGraph flowcharts to SVG previews.

Reads geometry, node labels, symbols, styles, and connector endpoints from editable
.drawio source. Uses orthogonal routing with obstacle avoidance for preview output.
"""
from __future__ import annotations
import heapq
import html
import math
import os
import re
import xml.etree.ElementTree as ET

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
FLOW = os.path.join(ROOT, "docs", "flowcharts")
OUT = os.environ.get("FLOWCHART_PREVIEW_OUT", os.path.join(ROOT, "docs", "assets", "flowcharts"))
FILES = [
    "landlord-listing-draft-submit.drawio",
    "landlord-listing-review-outcomes.drawio",
    "admin-kyc-review.drawio",
    "admin-listing-moderation.drawio",
    "renter-favorites.drawio",
    "renter-contact-reveal.drawio",
    "renter-inquiry-viewing.drawio",
]
GRID = 10


def num(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def parse_style(style):
    return dict((part.split("=", 1) if "=" in part else (part, "1")) for part in style.strip(";").split(";") if part)


def bounds(node):
    g = node.find("mxGeometry")
    return tuple(num(g.get(k)) for k in ("x", "y", "width", "height"))


def shape_of(cell):
    st = parse_style(cell.get("style", ""))
    shape = st.get("shape", "rect")
    if st.get("rhombus") == "1" or shape == "rhombus":
        return "diamond"
    if st.get("ellipse") == "1" or shape == "ellipse":
        return "ellipse"
    if shape == "cylinder3":
        return "cylinder"
    if st.get("rounded") == "1":
        return "rounded"
    return "rect"


def gridpoint(p):
    return (round(p[0] / GRID) * GRID, round(p[1] / GRID) * GRID)


def segment_intersects_rect(a, b, r, pad=3):
    x, y, w, h = r
    x -= pad; y -= pad; w += 2 * pad; h += 2 * pad
    if abs(a[0] - b[0]) < 0.01:
        xx = a[0]
        lo, hi = sorted((a[1], b[1]))
        return x < xx < x + w and max(lo, y) < min(hi, y + h)
    if abs(a[1] - b[1]) < 0.01:
        yy = a[1]
        lo, hi = sorted((a[0], b[0]))
        return y < yy < y + h and max(lo, x) < min(hi, x + w)
    return True


def crosses_segment(a, b, c, d):
    if a[0] == b[0] and c[1] == d[1]:
        return min(a[1], b[1]) < c[1] < max(a[1], b[1]) and min(c[0], d[0]) < a[0] < max(c[0], d[0])
    if a[1] == b[1] and c[0] == d[0]:
        return min(a[0], b[0]) < c[0] < max(a[0], b[0]) and min(c[1], d[1]) < a[1] < max(c[1], d[1])
    return False


def inside_any(p, obstacles, ignore=()):
    for key, (x, y, w, h) in obstacles.items():
        if key in ignore:
            continue
        if x - 4 < p[0] < x + w + 4 and y - 4 < p[1] < y + h + 4:
            return True
    return False


def astar(start, goal, obstacles, ignore, used, canvas):
    start, goal = gridpoint(start), gridpoint(goal)
    dirs = [(GRID, 0), (-GRID, 0), (0, GRID), (0, -GRID)]
    # state includes direction to penalize unnecessary bends
    q = [(abs(goal[0]-start[0]) + abs(goal[1]-start[1]), 0, start[0], start[1], 4)]
    prev, dist = {}, {(start[0], start[1], 4): 0}
    final = None
    maxx, maxy = canvas
    while q:
        _, cost, x, y, di = heapq.heappop(q)
        state = (x, y, di)
        if cost != dist.get(state):
            continue
        if (x, y) == goal:
            final = state; break
        for ni, (dx, dy) in enumerate(dirs):
            nx, ny = x + dx, y + dy
            if nx < 0 or ny < 0 or nx > maxx or ny > maxy or inside_any((nx, ny), obstacles, ignore):
                continue
            penalty = 0
            if di != 4 and ni != di:
                penalty += 22
            for (a, b) in used:
                if crosses_segment((x, y), (nx, ny), a, b):
                    penalty += 120
                if (nx, ny) in (a, b):
                    penalty += 35
            nc = cost + GRID + penalty
            ns = (nx, ny, ni)
            if nc < dist.get(ns, math.inf):
                dist[ns] = nc; prev[ns] = state
                heuristic = abs(goal[0]-nx) + abs(goal[1]-ny)
                heapq.heappush(q, (nc + heuristic, nc, nx, ny, ni))
    if final is None:
        return [start, goal]
    path = [(final[0], final[1])]
    while final in prev:
        final = prev[final]; path.append((final[0], final[1]))
    path.reverse()
    # Remove collinear intermediate points
    result = []
    for p in path:
        while len(result) >= 2 and ((result[-1][0]-result[-2][0]) * (p[1]-result[-1][1]) == (result[-1][1]-result[-2][1]) * (p[0]-result[-1][0])):
            result.pop()
        result.append(p)
    return result


def ports(rect):
    x,y,w,h=rect; cx=x+w/2; cy=y+h/2
    return [(cx,y,"N"),(x+w,cy,"E"),(cx,y+h,"S"),(x,cy,"W")]


def edge_route(src, dst, obstacles, used, canvas):
    sx,sy,sw,sh=src; tx,ty,tw,th=dst
    best=None
    for sp in ports(src):
        for tp in ports(dst):
            # Orthogonal exit stubs are clear of endpoint shapes. A* routes between them.
            sx0,sy0,sd=sp; tx0,ty0,td=tp
            def outward(x,y,d):
                return (x,y-20) if d=="N" else (x+20,y) if d=="E" else (x,y+20) if d=="S" else (x-20,y)
            a=outward(sx0,sy0,sd); b=outward(tx0,ty0,td)
            p=astar(a,b,obstacles,(None,),used,canvas)
            points=[(sx0,sy0),a]+p[1:-1]+[b,(tx0,ty0)]
            # Remove duplicate/collinear points
            clean=[]
            for pt in points:
                if clean and pt==clean[-1]: continue
                while len(clean)>=2 and ((clean[-1][0]-clean[-2][0])*(pt[1]-clean[-1][1]) == (clean[-1][1]-clean[-2][1])*(pt[0]-clean[-1][0])): clean.pop()
                clean.append(pt)
            length=sum(abs(clean[i][0]-clean[i-1][0])+abs(clean[i][1]-clean[i-1][1]) for i in range(1,len(clean)))
            bends=max(0,len(clean)-2)
            # Score crossings explicitly; a deterministic small penalty keeps
            # later connectors from unnecessarily crossing established paths.
            cross_count=sum(1 for a,b in used for i in range(1,len(clean)) if crosses_segment(a,b,clean[i-1],clean[i]))
            score=length+bends*14+cross_count*500
            if best is None or score<best[0]: best=(score,clean)
    return best[1]


def split_text(text, max_chars):
    lines=[]
    for raw in text.split("\n"):
        words=raw.split()
        if not words:
            lines.append(""); continue
        line=""
        for word in words:
            if line and len(line)+len(word)+1 > max_chars:
                lines.append(line); line=word
            else: line=(line+" "+word).strip()
        lines.append(line)
    return lines


def clean_label(value):
    value = html.unescape(value or "")
    value = value.replace("&#xa;", "\n").replace("&#10;", "\n")
    value = re.sub(r"<br\s*/?>", "\n", value, flags=re.I)
    value = re.sub(r"<[^>]*>", "", value)
    return value.strip()


def render(filename):
    source=os.path.join(FLOW,filename)
    root=ET.parse(source).getroot()
    model=root.find(".//mxGraphModel")
    if model is None:
        raise ValueError(f"{filename}: missing mxGraphModel")
    diagram = root.find("diagram")
    if diagram is None:
        raise ValueError(f"{filename}: missing diagram element")
    title_node = next((c for c in model.iter("mxCell") if c.get("id") == "title"), None)
    title = clean_label(title_node.get("value", "")) if title_node is not None else (diagram.get("name") or filename)
    root_container = model.find("root")
    if root_container is None:
        raise ValueError(f"{filename}: missing mxGraph root")
    cells = root_container.findall("mxCell")
    vertices={c.get("id"):c for c in cells if c.get("vertex")=="1" and c.find("mxGeometry") is not None}
    edges=[c for c in cells if c.get("edge")=="1"]
    rects={k:bounds(v) for k,v in vertices.items()}
    w=max([num(model.get("pageWidth"),1000)]+[x+bw+60 for x,y,bw,bh in rects.values()])
    h=max([num(model.get("pageHeight"),1000)]+[y+bh+60 for x,y,bw,bh in rects.values()])
    canvas=(w,h)
    used=[]; routes={}
    for e in edges:
        s=e.get("source"); t=e.get("target")
        if s not in rects or t not in rects: continue
        route=edge_route(rects[s],rects[t],rects,used,canvas)
        routes[e.get("id")]=route
        used += list(zip(route,route[1:]))
    pad=60
    out=['<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">'%(w,h,w,h),
         '<defs><marker id="arrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L10,4 L0,8 Z" fill="#334155"/></marker>',
         '<filter id="shadow" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#0f172a" flood-opacity=".12"/></filter>',
         '<style>text{font-family:Arial,Helvetica,sans-serif}.branch-label{paint-order:stroke;stroke:#fff;stroke-width:6px;stroke-linejoin:round}</style></defs>',
         '<rect width="100%" height="100%" fill="#f8fafc"/>',
         '<rect x="%d" y="12" width="%d" height="58" rx="12" fill="#0f172a"/>'%(pad,w-2*pad),
         '<text x="%s" y="48" text-anchor="middle" font-weight="700" font-size="20" fill="#fff">%s</text>'%(w/2,html.escape(title))]
    # Connectors first so nodes remain visually on top
    for e in edges:
        route=routes.get(e.get("id"))
        if not route: continue
        pts=" ".join("%g,%g"%p for p in route)
        out.append('<polyline points="%s" fill="none" stroke="#64748b" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#arrow)"/>'%pts)
        label=clean_label(e.get("value", ""))
        if label:
            mid=route[len(route)//2]
            words=label.split()
            lines=[]
            line=""
            for word in words:
                if line and len(line)+len(word)+1>24:
                    lines.append(line); line=word
                else:
                    line=(line+" "+word).strip()
            if line: lines.append(line)
            width=max(58,min(220,max(len(line) for line in lines)*7+18))
            height=max(22,len(lines)*16+8)
            out.append('<rect x="%g" y="%g" width="%g" height="%g" rx="8" fill="#fff" stroke="#cbd5e1" stroke-width="1" opacity=".98"/>'%(mid[0]-width/2,mid[1]-height/2,width,height))
            for i,line in enumerate(lines):
                out.append('<text class="branch-label" x="%g" y="%g" font-size="12" font-weight="700" text-anchor="middle" dominant-baseline="middle" fill="#334155">%s</text>'%(mid[0],mid[1]+(i-(len(lines)-1)/2)*16,html.escape(line)))
    for k,c in vertices.items():
        x,y,bw,bh=rects[k]
        text=clean_label(c.get("value", ""))
        style=parse_style(c.get("style","")); shape=shape_of(c)
        fs=num(style.get("fontSize"),12); sw=num(style.get("strokeWidth"),1.5)
        if shape=="diamond":
            points=f"{x+bw/2},{y} {x+bw},{y+bh/2} {x+bw/2},{y+bh} {x},{y+bh/2}"
            fill="#dbeafe"; stroke="#2563eb"; text_color="#1e3a8a"; padx,pady=0.62,0.56
            out.append(f'<polygon points="{points}" fill="{fill}" stroke="{stroke}" stroke-width="{max(sw,2)}" filter="url(#shadow)"/>')
        elif shape=="ellipse":
            fill="#dcfce7" if any(tag in text.upper() for tag in ("START", "END", "TRIGGER")) else "#fef3c7"
            stroke="#16a34a" if any(tag in text.upper() for tag in ("START", "END")) else "#d97706"
            text_color="#14532d" if stroke=="#16a34a" else "#78350f"
            out.append(f'<ellipse cx="{x+bw/2}" cy="{y+bh/2}" rx="{bw/2}" ry="{bh/2}" fill="{fill}" stroke="{stroke}" stroke-width="{max(sw,2)}" filter="url(#shadow)"/>'); padx,pady=.72,.56
        elif shape=="cylinder":
            fill="#ede9fe"; stroke="#7c3aed"; text_color="#4c1d95"
            out.append(f'<path d="M{x},{y+10} C{x},{y-3} {x+bw},{y-3} {x+bw},{y+10} L{x+bw},{y+bh-10} C{x+bw},{y+bh+3} {x},{y+bh+3} {x},{y+bh-10} Z" fill="{fill}" stroke="{stroke}" stroke-width="{max(sw,2)}" filter="url(#shadow)"/>'); padx,pady=.8,.62
        elif style.get("shape") == "parallelogram":
            skew=min(24,bw*.10)
            points=f"{x+skew},{y} {x+bw},{y} {x+bw-skew},{y+bh} {x},{y+bh}"
            fill="#e0f2fe"; stroke="#0284c7"; text_color="#0c4a6e"
            out.append(f'<polygon points="{points}" fill="{fill}" stroke="{stroke}" stroke-width="{max(sw,2)}" filter="url(#shadow)"/>'); padx,pady=.70,.68
        else:
            rad=12 if shape=="rounded" else 12
            is_blocked=any(tag in text.upper() for tag in ("BLOCKED", "DENY", "NO CONTACT DATA"))
            fill="#fee2e2" if is_blocked else "#ffffff"
            stroke="#dc2626" if is_blocked else "#475569"
            text_color="#7f1d1d" if is_blocked else "#0f172a"
            out.append(f'<rect x="{x}" y="{y}" width="{bw}" height="{bh}" rx="{rad}" fill="{fill}" stroke="{stroke}" stroke-width="{max(sw,1.8)}" filter="url(#shadow)"/>'); padx,pady=.82,.70
        lines=split_text(text,max(10,int(bw*padx/(fs*.58))))
        lineh=fs*1.25; total=len(lines)*lineh
        ty=y+(bh-total)/2+fs*.85
        weight="700" if style.get("fontStyle")=="1" or any(tag in text.upper() for tag in ("START", "END", "BLOCKED", "DENY")) else "400"
        for i,line in enumerate(lines):
            out.append('<text x="%g" y="%g" text-anchor="middle" font-size="%g" font-weight="%s" fill="%s">%s</text>'%(x+bw/2,ty+i*lineh,fs,weight,text_color,html.escape(line)))
    out.append('</svg>')
    dest=os.path.join(OUT,filename.replace(".drawio",".svg"))
    os.makedirs(OUT,exist_ok=True)
    with open(dest,"w",encoding="utf-8") as f:f.write("\n".join(out))
    return dest,len(vertices),len(edges)

if __name__=="__main__":
    for name in FILES:
        path,nv,ne=render(name)
        print(f"{os.path.basename(path)}: {nv} nodes, {ne} edges")

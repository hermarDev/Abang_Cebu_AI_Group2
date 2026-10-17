#!/usr/bin/env python3
"""Generator for standard project flowcharts adhering 100% to the
auth-registration-pkce (1).drawio and auth-registration-pkce.svg reference standard.

Refactors the last 3 tackled tickets:
- SCRUM-126:
  1) admin-listing-moderation
  2) admin-kyc-review
- SCRUM-125:
  3) landlord-listing-draft-submit
  4) landlord-listing-review-outcomes
- SCRUM-127:
  5) renter-favorites
  6) renter-contact-reveal
  7) renter-inquiry-viewing
"""

import os
import subprocess
import html
import xml.sax.saxutils as saxutils

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
FLOW_DIR = os.path.join(ROOT, "docs", "flowcharts")
ASSET_DIR = os.path.join(ROOT, "docs", "assets", "flowcharts")

os.makedirs(FLOW_DIR, exist_ok=True)
os.makedirs(ASSET_DIR, exist_ok=True)


def build_drawio_xml(diag_id, title_text, page_w, page_h, nodes, edges):
    """Generate exact Draw.io mxGraphModel XML matching auth-registration-pkce (1).drawio."""
    xml_parts = [
        '<mxfile host="Electron" modified="2026-10-18T00:00:00.000Z" agent="Antigravity" version="21.0.0" type="device">',
        f'  <diagram id="{diag_id}" name="{saxutils.escape(title_text)}">',
        f'    <mxGraphModel dx="1200" dy="1600" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="{page_w}" pageHeight="{page_h}" math="0" shadow="0">',
        '      <root>',
        '        <mxCell id="0" />',
        '        <mxCell id="1" parent="0" />',
        '',
        '        <!-- Title -->',
        f'        <mxCell id="title" value="{saxutils.escape(title_text)}" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontFamily=Helvetica;fontSize=18;fontStyle=1;fontColor=#000000;" vertex="1" parent="1">',
        f'          <mxGeometry x="250" y="25" width="550" height="35" as="geometry" />',
        '        </mxCell>',
        ''
    ]

    # Add Nodes
    for n in nodes:
        nid = n["id"]
        val = saxutils.escape(n["value"]).replace("\n", "&#xa;")
        ntype = n.get("type", "process")
        x, y, w, h = n["x"], n["y"], n["w"], n["h"]

        if ntype in ("start", "end"):
            style = "rounded=1;arcSize=50;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=2;fontFamily=Helvetica;fontSize=14;fontStyle=1;fontColor=#000000;align=center;"
        elif ntype == "decision":
            fs = n.get("fontSize", 12)
            style = f"rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize={fs};fontColor=#000000;align=center;"
        elif ntype == "io":
            style = "shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fixedSize=1;size=20;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;"
        elif ntype == "db":
            style = "shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=13;fontStyle=1;fontColor=#000000;align=center;"
        elif ntype == "step":
            style = "shape=step;perimeter=stepPerimeter;whiteSpace=wrap;html=1;fixedSize=1;size=15;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;fontColor=#000000;align=center;"
        elif ntype == "connector":
            style = "ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=14;fontStyle=1;fontColor=#000000;align=center;"
        else: # process
            fs = n.get("fontSize", 12)
            fw = ";fontStyle=1" if n.get("bold") else ""
            style = f"rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize={fs}{fw};fontColor=#000000;align=center;"

        xml_parts.append(f'        <!-- Node: {nid} -->')
        xml_parts.append(f'        <mxCell id="{nid}" value="{val}" style="{style}" vertex="1" parent="1">')
        xml_parts.append(f'          <mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry" />')
        xml_parts.append(f'        </mxCell>')
        if n.get("sublabel"):
            subval = saxutils.escape(n["sublabel"])
            suby = y + h + 2
            xml_parts.append(f'        <mxCell id="sub_{nid}" value="{subval}" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;fontFamily=Helvetica;fontSize=11;fontStyle=1;fontColor=#000000;" vertex="1" parent="1">')
            xml_parts.append(f'          <mxGeometry x="{x-20}" y="{suby}" width="{w+40}" height="20" as="geometry" />')
            xml_parts.append(f'        </mxCell>')

    xml_parts.append('')
    xml_parts.append('        <!-- EDGES / CONNECTORS -->')

    # Add Edges
    for e in edges:
        eid = e["id"]
        src = e["source"]
        tgt = e["target"]
        val = e.get("value", "")
        dashed = e.get("dashed", False)
        bidirectional = e.get("bidirectional", False)

        style_bits = [
            "edgeStyle=orthogonalEdgeStyle",
            "rounded=0",
            "orthogonalLoop=1",
            "jettySize=auto",
            "html=1",
            "strokeColor=#000000",
            "strokeWidth=1.5"
        ]
        if dashed:
            style_bits.append("dashed=1")
            if bidirectional:
                style_bits.append("startArrow=classic")
            style_bits.append("endArrow=classic")
            style_bits.append("fontColor=#000000")
            style_bits.append("fontSize=11")
        else:
            style_bits.append("endArrow=classic")
            if val:
                style_bits.append("fontColor=#000000")
                style_bits.append("fontSize=11")
                style_bits.append("fontStyle=1")

        style_str = ";".join(style_bits) + ";"
        val_attr = f' value="{val}"' if val else ""

        xml_parts.append(f'        <!-- Edge: {src} -> {tgt} -->')
        xml_parts.append(f'        <mxCell id="{eid}"{val_attr} style="{style_str}" edge="1" source="{src}" target="{tgt}" parent="1">')

        points = e.get("points")
        if points:
            xml_parts.append('          <mxGeometry relative="1" as="geometry">')
            xml_parts.append('            <Array as="points">')
            for px, py in points:
                xml_parts.append(f'              <mxPoint x="{px}" y="{py}" />')
            xml_parts.append('            </Array>')
            xml_parts.append('          </mxGeometry>')
        else:
            xml_parts.append('          <mxGeometry relative="1" as="geometry" />')
        xml_parts.append('        </mxCell>')

    xml_parts.extend([
        '      </root>',
        '    </mxGraphModel>',
        '  </diagram>',
        '</mxfile>',
        ''
    ])
    return "\n".join(xml_parts)


def build_svg_xml(title_text, page_w, page_h, nodes, edges):
    """Generate exact standalone SVG vector flowchart matching auth-registration-pkce.svg."""
    node_map = {n["id"]: n for n in nodes}

    svg = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {page_w} {page_h}" width="{page_w}" height="{page_h}" style="background:#ffffff; font-family:Helvetica, Arial, sans-serif;">',
        '  <defs>',
        '    <!-- Arrow marker for end of lines -->',
        '    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">',
        '      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#000000" />',
        '    </marker>',
        '    <!-- Arrow marker for start of lines (bidirectional) -->',
        '    <marker id="arrow-start" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto">',
        '      <path d="M 8 1.5 L 0 5 L 8 8.5 z" fill="#000000" />',
        '    </marker>',
        '    <!-- Pattern for grid background -->',
        '    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">',
        '      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E2E8F0" stroke-width="0.8"/>',
        '    </pattern>',
        '  </defs>',
        '',
        '  <!-- Grid Background -->',
        '  <rect width="100%" height="100%" fill="url(#grid)" />',
        '',
        f'  <!-- Flowchart Title -->',
        f'  <text x="{page_w/2}" y="45" text-anchor="middle" font-size="18" font-weight="bold" fill="#000000" letter-spacing="1">{html.escape(title_text)}</text>',
        '',
        '  <!-- ==================== CONNECTING EDGES ==================== -->'
    ]

    for e in edges:
        src = node_map.get(e["source"])
        tgt = node_map.get(e["target"])
        if not src or not tgt:
            continue
        val = e.get("value", "")
        dashed = e.get("dashed", False)
        bidi = e.get("bidirectional", False)
        dash_attr = ' stroke-dasharray="6,4"' if dashed else ''
        start_marker = ' marker-start="url(#arrow-start)"' if bidi else ''

        # Waypoints or direct connection
        svg_points = e.get("svg_points")
        if svg_points:
            p_str = " ".join(f"{'M' if i==0 else 'L'} {px} {py}" for i, (px, py) in enumerate(svg_points))
            svg.append(f'  <!-- {e["source"]} -> {e["target"]} -->')
            svg.append(f'  <path d="{p_str}" fill="none" stroke="#000000" stroke-width="1.8"{dash_attr}{start_marker} marker-end="url(#arrow)" />')
        else:
            # Automatic vertical spine connection:
            # From bottom center of source to top center of target
            x1 = src["x"] + src["w"] / 2
            y1 = src["y"] + src["h"]
            x2 = tgt["x"] + tgt["w"] / 2
            y2 = tgt["y"]
            svg.append(f'  <!-- {e["source"]} -> {e["target"]} -->')
            svg.append(f'  <line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#000000" stroke-width="1.8"{dash_attr}{start_marker} marker-end="url(#arrow)" />')

        # Label position
        if val:
            lbl_pos = e.get("label_pos")
            if lbl_pos:
                lx, ly = lbl_pos
            elif svg_points:
                # default mid point
                mid = svg_points[0]
                lx, ly = mid[0] + 8, mid[1] - 8
            else:
                lx = (x1 + x2) / 2 + 8
                ly = (y1 + y2) / 2
            fw = "bold" if val in ("YES", "NO") else "normal"
            svg.append(f'  <text x="{lx}" y="{ly}" font-size="11" font-weight="{fw}" fill="#000000">{html.escape(val)}</text>')

    svg.append('')
    svg.append('  <!-- ==================== FLOWCHART NODES ==================== -->')

    for n in nodes:
        nid = n["id"]
        ntype = n.get("type", "process")
        x, y, w, h = n["x"], n["y"], n["w"], n["h"]
        lines = n["value"].split("\n")
        cx = x + w / 2
        cy = y + h / 2

        svg.append(f'  <!-- Node: {nid} -->')
        if ntype in ("start", "end"):
            svg.append(f'  <rect x="{x}" y="{y}" width="{w}" height="{h}" rx="25" ry="25" fill="#FFFFFF" stroke="#000000" stroke-width="2.2" />')
            svg.append(f'  <text x="{cx}" y="{y + h/2 + 5}" text-anchor="middle" font-size="14" font-weight="bold" fill="#000000">{html.escape(lines[0])}</text>')
        elif ntype == "decision":
            svg.append(f'  <polygon points="{cx},{y} {x+w},{cy} {cx},{y+h} {x},{cy}" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />')
            # Render lines centered
            fs = n.get("fontSize", 12)
            line_h = fs * 1.25
            start_y = cy - (len(lines) - 1) * line_h / 2 + (fs * 0.35)
            for i, line in enumerate(lines):
                fw = "bold" if i == 0 and len(lines) > 1 and ("?" in lines[0] or "Valid" in lines[0]) else "normal"
                svg.append(f'  <text x="{cx}" y="{start_y + i * line_h}" text-anchor="middle" font-size="{fs}" font-weight="{fw}" fill="#000000">{html.escape(line)}</text>')
        elif ntype == "io":
            # Parallelogram: skew = 25px
            skew = 25
            svg.append(f'  <polygon points="{x+skew},{y} {x+w},{y} {x+w-skew},{y+h} {x},{y+h}" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />')
            fs = 12
            line_h = 16
            start_y = cy - (len(lines) - 1) * line_h / 2 + 4
            for i, line in enumerate(lines):
                fw = "bold" if i == 0 else "normal"
                fc = "#000000" if i == 0 else "#333333"
                svg.append(f'  <text x="{cx}" y="{start_y + i * line_h}" text-anchor="middle" font-size="{fs}" font-weight="{fw}" fill="{fc}">{html.escape(line)}</text>')
        elif ntype == "db":
            # Cylinder
            ry = 15
            svg.append('  <g>')
            svg.append(f'    <path d="M {x} {y+ry} A {w/2} {ry} 0 0 0 {x+w} {y+ry} A {w/2} {ry} 0 0 0 {x} {y+ry} Z" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />')
            svg.append(f'    <path d="M {x} {y+ry} L {x} {y+h-ry} A {w/2} {ry} 0 0 0 {x+w} {y+h-ry} L {x+w} {y+ry}" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />')
            svg.append(f'    <path d="M {x} {y+h-ry} A {w/2} {ry} 0 0 0 {x+w} {y+h-ry}" fill="none" stroke="#000000" stroke-width="1.8" />')
            svg.append(f'    <text x="{cx}" y="{cy + 4}" text-anchor="middle" font-size="13" font-weight="bold" fill="#000000">{html.escape(lines[0])}</text>')
            svg.append('  </g>')
        elif ntype == "step":
            # Step banner pointing right
            indent = 20
            svg.append(f'  <polygon points="{x},{y} {x+w-indent},{y} {x+w},{cy} {x+w-indent},{y+h} {x},{y+h} {x+indent},{cy}" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />')
            fs = 11
            line_h = 15
            start_y = cy - (len(lines) - 1) * line_h / 2 + 4
            for i, line in enumerate(lines):
                svg.append(f'  <text x="{cx + 5}" y="{start_y + i * line_h}" text-anchor="middle" font-size="{fs}" font-weight="bold" fill="#000000">{html.escape(line)}</text>')
        elif ntype == "connector":
            r = min(w, h) / 2
            svg.append(f'  <circle cx="{cx}" cy="{cy}" r="{r}" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />')
            svg.append(f'  <text x="{cx}" y="{cy + 5}" text-anchor="middle" font-size="14" font-weight="bold" fill="#000000">{html.escape(lines[0])}</text>')
            if n.get("sublabel"):
                svg.append(f'  <text x="{cx}" y="{y + h + 18}" text-anchor="middle" font-size="11" font-weight="bold" fill="#000000">{html.escape(n["sublabel"])}</text>')
        else: # process
            fs = n.get("fontSize", 12)
            line_h = fs * 1.3
            svg.append(f'  <rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />')
            start_y = cy - (len(lines) - 1) * line_h / 2 + (fs * 0.35)
            for i, line in enumerate(lines):
                fw = "bold" if (i == 0 and n.get("bold")) or (i == 0 and len(lines) > 1 and "Prompt" in line) else "normal"
                fc = "#000000" if fw == "bold" or len(lines) == 1 else "#333333"
                svg.append(f'  <text x="{cx}" y="{start_y + i * line_h}" text-anchor="middle" font-size="{fs}" font-weight="{fw}" fill="{fc}">{html.escape(line)}</text>')

    svg.append('')
    svg.append('</svg>')
    return "\n".join(svg)


def export_png(svg_path, png_path, page_w, page_h):
    """Render pixel-perfect 2x PNG from SVG via headless Chromium."""
    cmd = [
        "chromium-browser",
        "--headless",
        "--disable-gpu",
        "--force-device-scale-factor=2",
        f"--screenshot={png_path}",
        f"--window-size={page_w},{page_h}",
        f"file://{svg_path}"
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"Error rendering {png_path}: {res.stderr}")
    else:
        size = os.path.getsize(png_path)
        print(f"Generated PNG: {os.path.basename(png_path)} ({size} bytes)")

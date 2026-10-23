#!/usr/bin/env python3
"""
Draw.io ANSI X3.5 / ISO 5807 7-Gate Quality Auditor.
Audits all .drawio flowcharts for the sprint deliverables.
"""

import sys
import os
import xml.etree.ElementTree as ET

def audit_drawio_file(filepath):
    try:
        tree = ET.parse(filepath)
    except Exception as e:
        print(f"[FATAL] Failed to parse XML in {filepath}: {e}")
        return False, 1

    root = tree.getroot()
    diagrams = root.findall('.//diagram')
    if not diagrams:
        print(f"[FATAL] No <diagram> elements found in {filepath}.")
        return False, 1

    total_defects = 0
    total_vertices = 0
    total_edges = 0
    total_decisions = 0

    basename = os.path.basename(filepath)
    print(f"\nAUDITING: {basename}")
    print("-" * 65)

    for idx, d in enumerate(diagrams, 1):
        d_name = d.attrib.get('name', f'Page {idx}')
        mx = d.find('.//mxGraphModel')
        root_cell = mx.find('.//root') if mx is not None else d.find('.//root')
        cells = root_cell.findall('.//mxCell') if root_cell is not None else []

        vertices = {}
        edges = []
        outgoing = {}
        incoming = {}

        for c in cells:
            cid = c.attrib.get('id')
            if c.attrib.get('vertex') == '1':
                val = c.attrib.get('value', '').replace('\n', ' ')
                style = c.attrib.get('style', '')
                geo = c.find('mxGeometry')
                x = float(geo.attrib.get('x', 0)) if geo is not None else 0
                y = float(geo.attrib.get('y', 0)) if geo is not None else 0
                w = float(geo.attrib.get('width', 0)) if geo is not None else 0
                h = float(geo.attrib.get('height', 0)) if geo is not None else 0
                vertices[cid] = {'val': val, 'style': style, 'x': x, 'y': y, 'w': w, 'h': h}
                outgoing[cid] = []
                incoming[cid] = []
            elif c.attrib.get('edge') == '1':
                src = c.attrib.get('source')
                tgt = c.attrib.get('target')
                val = c.attrib.get('value', '')
                edges.append({'id': cid, 'src': src, 'tgt': tgt, 'val': val})

        for e in edges:
            src = e['src']
            tgt = e['tgt']
            if src in outgoing:
                outgoing[src].append(e)
            if tgt in incoming:
                incoming[tgt].append(e)

        page_defects = []

        # Gate 1 & 2: Rhombus Binary & Labeling
        page_rhombuses = 0
        for vid, vdata in vertices.items():
            if 'rhombus' in vdata['style']:
                page_rhombuses += 1
                out_edges = outgoing.get(vid, [])
                if len(out_edges) != 2:
                    page_defects.append(
                        f"  [G1-FAIL] Decision '{vdata['val']}' (ID: {vid}) has {len(out_edges)} outgoing branches (Mandate: strictly 2)."
                    )
                for oe in out_edges:
                    if not oe['val'].strip():
                        page_defects.append(
                            f"  [G2-FAIL] Decision branch from '{vdata['val']}' to '{vertices.get(oe['tgt'], {}).get('val')}' has NO label."
                        )

        # Gate 3: Dangling Edges
        for e in edges:
            if not e['src'] or e['src'] not in vertices:
                page_defects.append(f"  [G3-FAIL] Edge ID {e['id']} has invalid/missing source: {e['src']}")
            if not e['tgt'] or e['tgt'] not in vertices:
                page_defects.append(f"  [G3-FAIL] Edge ID {e['id']} has invalid/missing target: {e['tgt']}")

        # Gate 7: Dead-End Sinks
        for vid, vdata in vertices.items():
            style = vdata['style']
            # Ignore terminators, connectors, databases, and labels
            if any(term in style for term in ('arcSize=50', 'offPageConnector', 'text')):
                continue
            if 'shape=cylinder3' in style: # database
                continue
            if 'ellipse' in style and len(vdata['val'].strip()) <= 3: # on-page connector
                continue
            if len(outgoing.get(vid, [])) == 0:
                page_defects.append(f"  [G7-FAIL] Dead-end unhandled node '{vdata['val']}' (ID: {vid}) with 0 outgoing edges.")

        total_vertices += len(vertices)
        total_edges += len(edges)
        total_decisions += page_rhombuses
        total_defects += len(page_defects)

        if page_defects:
            print(f"[{d_name}] FAIL ({len(page_defects)} defects):")
            for dft in page_defects:
                print(dft)
        else:
            print(f"[{d_name}] PASSED (0 defects) - Nodes: {len(vertices)}, Edges: {len(edges)}, Decisions: {page_rhombuses}")

    return total_defects == 0, total_defects

def main():
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    flow_dir = os.path.join(root, "docs", "flowcharts")

    sprint2_targets = [
        # SCRUM-125
        "landlord-master-orchestration.drawio",
        "landlord-onboarding-kyc.drawio",
        "landlord-listing-draft-submit.drawio",
        "landlord-listing-review-outcomes.drawio",
        # SCRUM-126
        "admin-master-orchestration.drawio",
        "admin-listing-moderation.drawio",
        "admin-kyc-review.drawio",
        # SCRUM-127
        "renter-master-orchestration.drawio",
        "renter-favorites.drawio",
        "renter-contact-reveal.drawio",
        "renter-inquiry-viewing.drawio"
    ]

    args = sys.argv[1:]
    if "--sprint2" in args:
        files = sprint2_targets
    elif args:
        files = [os.path.basename(a) for a in args]
    else:
        files = sorted([f for f in os.listdir(flow_dir) if f.endswith(".drawio")])

    if not files:
        print(f"No .drawio files found in {flow_dir}")
        sys.exit(1)

    print("=" * 65)
    print(f"RUNNING 7-GATE AUDIT ON {len(files)} DRAWIO FILES")
    print("=" * 65)

    all_passed = True
    total_defects_count = 0
    for f in files:
        fpath = os.path.join(flow_dir, f)
        passed, defects = audit_drawio_file(fpath)
        if not passed:
            all_passed = False
        total_defects_count += defects

    print("\n" + "=" * 65)
    print(f"FINAL AUDIT RESULT: {'ALL PASSED (0 defects)' if all_passed else f'FAILED ({total_defects_count} defects)'}")
    print("=" * 65)
    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()

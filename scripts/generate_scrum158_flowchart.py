#!/usr/bin/env python3
"""Generate the concise, standard two-page SCRUM-158 flowchart workbook."""
from __future__ import annotations
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from generate_standard_flowcharts import build_drawio_xml

FLOW = ROOT / "docs/flowcharts/ai-assistant-master-orchestration.drawio"
FONT = 13


def node(cell_id, kind, label, x, y, width, height):
    return {"id": cell_id, "type": kind, "value": label, "x": x, "y": y, "w": width, "h": height, "fontSize": FONT}


def edge(edge_id, source, target, label="", **kwargs):
    return {"id": edge_id, "source": source, "target": target, "value": label, **kwargs}


# Page 1: request safety, clarification loop, and handoff to existing map search.
PAGE1_NODES = [
    node("start", "start", "START", 470, 70, 160, 50),
    node("request", "io", "Finder enters English / Cebuano rental request", 405, 145, 290, 65),
    node("valid", "decision", "Valid, safe, within configured limits?", 435, 240, 230, 100),
    node("reject", "process", "Reject safely; continue with manual search", 55, 255, 290, 70),
    node("end_manual", "end", "END\nManual discovery", 110, 365, 180, 55),
    node("extract", "process", "Extract only stated or user-confirmed criteria", 405, 370, 290, 70),
    node("clear", "decision", "Criteria clear and supported?", 435, 475, 230, 100),
    node("clarify", "process", "Ask one specific question; preserve confirmed criteria", 60, 485, 300, 75),
    node("reply", "io", "Finder clarifies / selects a supported location", 75, 595, 270, 65),
    node("Aout", "connector", "A", 185, 700, 50, 50),
    node("Ain", "connector", "A", 335, 380, 50, 50),
    node("B_in", "offpage", "B\nRevised criteria", 740, 380, 155, 70),
    node("validate", "process", "Validate against the approved search contract", 405, 630, 290, 70),
    node("search_out", "offpage", "S\nSCRUM-116–120 search", 470, 720, 160, 65),
]
PAGE1_EDGES = [
    edge("e1", "start", "request"), edge("e2", "request", "valid"),
    edge("e3", "valid", "extract", "YES"), edge("e4", "valid", "reject", "NO"),
    edge("e5", "reject", "end_manual"), edge("e6", "extract", "clear"),
    edge("e7", "clear", "validate", "YES"), edge("e8", "clear", "clarify", "NO"),
    edge("e9", "clarify", "reply"), edge("e10", "reply", "Aout"),
    edge("e11", "Ain", "extract"), edge("e12", "B_in", "extract"),
    edge("e13", "validate", "search_out"),
]

# Page 2: search outcomes, record grounding, and user-controlled refinements.
PAGE2_NODES = [
    node("search_in", "offpage", "S\nSearch return", 475, 75, 155, 70),
    node("succeeded", "decision", "Search succeeds?", 435, 180, 230, 100),
    node("fail", "process", "Explain failure; offer manual map / filters", 55, 190, 290, 75),
    node("manual2", "process", "Continue with manual map / filters", 60, 305, 280, 70),
    node("end_fail", "end", "END\nManual discovery", 110, 420, 180, 55),
    node("eligible", "decision", "Approved listing and available unit returned?", 430, 340, 240, 110),
    node("none", "process", "No matches; offer optional user-selected changes", 750, 355, 290, 75),
    node("change", "decision", "Finder chooses a change?", 780, 470, 230, 100),
    node("B_adjust", "offpage", "B\nRevised criteria", 910, 615, 155, 70),
    node("no_change", "end", "END\nNo search change", 720, 615, 150, 55),
    node("records", "process", "Present returned records with real listing IDs only", 405, 500, 290, 75),
    node("cards", "process", "Open matching existing listing cards and map pins", 405, 610, 290, 75),
    node("refine", "decision", "Refinement requested?", 435, 730, 230, 100),
    node("refine_action", "io", "Finder requests a refinement", 60, 755, 270, 65),
    node("B_refine", "offpage", "B\nRevised criteria", 110, 840, 155, 70),
    node("end", "end", "END\nContinue discovery", 775, 820, 200, 55),
]
PAGE2_EDGES = [
    edge("f1", "search_in", "succeeded"),
    edge("f2", "succeeded", "eligible", "YES"), edge("f3", "succeeded", "fail", "NO"),
    edge("f4", "fail", "manual2"), edge("f5", "manual2", "end_fail"),
    edge("f6", "eligible", "records", "YES"), edge("f7", "eligible", "none", "NO"),
    edge("f8", "none", "change"), edge("f9", "change", "B_adjust", "YES"),
    edge("f10", "change", "no_change", "NO"), edge("f11", "records", "cards"),
    edge("f12", "cards", "refine"), edge("f13", "refine", "refine_action", "YES"),
    edge("f14", "refine", "end", "NO"), edge("f15", "refine_action", "B_refine"),
]


def make_diagram(diagram_id: str, title: str, nodes: list, edges: list) -> ET.Element:
    raw = build_drawio_xml(diagram_id, title, 1100, 980, nodes, edges)
    diagram = ET.fromstring(raw).find("diagram")
    if diagram is None:
        raise RuntimeError(f"Failed to generate diagram {diagram_id}")
    model = diagram.find("mxGraphModel")
    if model is None:
        raise RuntimeError(f"Missing graph model for {diagram_id}")
    title_geometry = model.find("./root/mxCell[@id='title']/mxGeometry")
    if title_geometry is None:
        raise RuntimeError(f"Missing title geometry for {diagram_id}")
    title_geometry.attrib.update(x="40", y="20", width="1020", height="40")

    # Keep branch labels legible and make each decision outcome leave its own point.
    # Fixed waypoints remove the shared YES/NO stem at the page-2 change decision.
    routing = {
        "scrum158-input": {
            "e3": ("0.5", "1", "0.5", "0", []),
            "e4": ("0", "0.5", "1", "0.5", []),
            "e7": ("0.5", "1", "0.5", "0", []),
            "e8": ("0", "0.5", "1", "0.5", []),
            "e13": ("0.5", "1", "0.5", "0", []),
        },
        "scrum158-results": {
            "f2": ("0.5", "1", "0.5", "0", []),
            "f3": ("0", "0.5", "1", "0.5", []),
            "f6": ("0.5", "1", "0.5", "0", []),
            "f7": ("1", "0.5", "0", "0.5", []),
            "f9": ("1", "0.5", "0.5", "0", [(1040, 520), (1040, 580), (987, 580)]),
            "f10": ("0", "0.5", "0.5", "0", [(750, 520), (750, 580), (795, 580)]),
            "f13": ("0", "0.5", "1", "0.5", []),
            "f14": ("1", "0.5", "0", "0.5", [(720, 780), (720, 870)]),
        },
    }.get(diagram_id, {})
    for edge_id, (exit_x, exit_y, entry_x, entry_y, points) in routing.items():
        cell = model.find(f"./root/mxCell[@id='{edge_id}']")
        if cell is None:
            raise RuntimeError(f"Missing edge {edge_id} in {diagram_id}")
        cell.set("style", cell.get("style", "") +
                 f"exitX={exit_x};exitY={exit_y};exitDx=0;exitDy=0;"
                 f"entryX={entry_x};entryY={entry_y};entryDx=0;entryDy=0;"
                 "labelBackgroundColor=#FFFFFF;fontSize=14;")
        if points:
            geometry = cell.find("mxGeometry")
            if geometry is None:
                raise RuntimeError(f"Missing geometry for edge {edge_id}")
            point_array = ET.SubElement(geometry, "Array", {"as": "points"})
            for x, y in points:
                ET.SubElement(point_array, "mxPoint", {"x": str(x), "y": str(y)})

    if diagram_id == "scrum158-input":
        connector_ids = ("Aout", "Ain", "B_in", "search_out")
    else:
        connector_ids = ("search_in", "B_adjust", "no_change", "B_refine")
    for cell_id in connector_ids:
        cell = model.find(f"./root/mxCell[@id='{cell_id}']")
        if cell is not None:
            cell.set("style", cell.get("style", "") + "fontSize=15;")
    return diagram


def main() -> None:
    workbook = ET.Element("mxfile", host="Electron", modified="2026-10-19T12:08:00.000Z", agent="Hermes", version="32.4.1", type="device")
    workbook.append(make_diagram("scrum158-input", "SCRUM-158 | AI Assistant — Input & Clarification", PAGE1_NODES, PAGE1_EDGES))
    workbook.append(make_diagram("scrum158-results", "SCRUM-158 | AI Assistant — Results & Refinement", PAGE2_NODES, PAGE2_EDGES))
    ET.indent(workbook, space="  ")
    FLOW.parent.mkdir(parents=True, exist_ok=True)
    ET.ElementTree(workbook).write(FLOW, encoding="utf-8", xml_declaration=True)
    print(f"wrote {FLOW}; pages=2; page1={len(PAGE1_NODES)} nodes/{len(PAGE1_EDGES)} edges; page2={len(PAGE2_NODES)} nodes/{len(PAGE2_EDGES)} edges")


if __name__ == "__main__":
    main()

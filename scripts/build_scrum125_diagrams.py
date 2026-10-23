#!/usr/bin/env python3
"""Build SCRUM-125 standard flowcharts:
3. landlord-listing-draft-submit
4. landlord-listing-review-outcomes (Images #8 & #9 defect resolution)
Adheres 100% to ANSI X3.5-1970 / ISO 5807:1985 and the auth-registration-pkce reference standard.
"""

import os
import sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from generate_standard_flowcharts import (
    build_drawio_xml, build_svg_xml, export_png, export_pdf,
    FLOW_DIR, ASSET_DIR, PDF_DIR
)

def build_landlord_draft_submit():
    name = "landlord-listing-draft-submit"
    diag_id = "scrum-125-landlord-listing-draft-submit"
    title = "SCRUM-125: LANDLORD LISTING DRAFT & SUBMISSION FLOW"
    pw, ph = 1050, 1680

    nodes = [
        {"id": "node_start", "type": "start", "value": "START", "x": 420, "y": 80, "w": 160, "h": 50},
        {"id": "node_auth", "type": "decision", "value": "Authenticated\nSession?", "x": 420, "y": 165, "w": 160, "h": 90},
        {"id": "node_auth_gate", "type": "offpage", "value": "SCRUM-121 Auth Gate\nPreserve Intent & Sign In", "x": 160, "y": 182.5, "w": 190, "h": 55},

        {"id": "node_role", "type": "decision", "value": "Landlord\nRole?", "x": 420, "y": 295, "w": 160, "h": 90},
        {"id": "node_deny", "type": "io", "value": "Deny Access\nNo Records Disclosed", "x": 160, "y": 312.5, "w": 190, "h": 55, "bold": True},
        {"id": "node_conn_e1", "type": "connector", "value": "E", "sublabel": "Exit", "x": 60, "y": 315, "w": 50, "h": 50},

        {"id": "node_editor", "type": "io", "value": "Edit Property, Units, Photos &\nAmenities (Draft-Safe Form)", "x": 370, "y": 425, "w": 260, "h": 60},
        {"id": "node_save_choice", "type": "decision", "value": "Save Draft\nor Submit?", "x": 420, "y": 525, "w": 160, "h": 90},

        # Draft Branch (Left)
        {"id": "node_draft_validate", "type": "process", "value": "Validate Ownership &\nDraft-Safe Partial Input", "x": 150, "y": 650, "w": 210, "h": 60},
        {"id": "node_draft_result", "type": "decision", "value": "Draft Save\nSucceeded?", "x": 175, "y": 750, "w": 160, "h": 90},
        {"id": "node_draft_saved", "type": "io", "value": "Saved Draft State\n(Private & Non-Public)", "x": 150, "y": 880, "w": 210, "h": 55, "bold": True},
        {"id": "node_conn_e2", "type": "connector", "value": "E", "sublabel": "Exit", "x": 60, "y": 882.5, "w": 50, "h": 50},
        {"id": "node_draft_retry", "type": "io", "value": "Save Failed / Retain Input\nCheck State & Retry in Editor", "x": 150, "y": 975, "w": 210, "h": 55},

        # Submit Branch (Spine)
        {"id": "node_submit_validate", "type": "process", "value": "Validate Complete Property, Units,\nRequired Media & KYC Policy", "x": 370, "y": 650, "w": 260, "h": 60},
        {"id": "node_submit_valid", "type": "decision", "value": "Complete &\nEligible?", "x": 420, "y": 750, "w": 160, "h": 90},
        {"id": "node_fix_input", "type": "io", "value": "Field Errors / Conflict\nReconcile in Editor", "x": 740, "y": 767.5, "w": 200, "h": 55},

        {"id": "node_pending_snapshot", "type": "process", "value": "Persist Pending Snapshot Under\nApproved Schema & Prevent Race", "x": 370, "y": 880, "w": 260, "h": 60, "bold": True},
        {"id": "node_persist_result", "type": "decision", "value": "Persistence\nSucceeded?", "x": 420, "y": 980, "w": 160, "h": 90},
        {"id": "node_persist_fail", "type": "io", "value": "Persistence Failed\nRetain Safe Input & Retry", "x": 740, "y": 997.5, "w": 200, "h": 55},

        {"id": "node_handoff", "type": "offpage", "value": "Handoff to Module 4\nAdmin Moderation Review Queue", "x": 380, "y": 1110, "w": 240, "h": 55},
        {"id": "node_handoff_check", "type": "decision", "value": "Handoff\nAccepted?", "x": 420, "y": 1205, "w": 160, "h": 90},
        {"id": "node_handoff_reconcile", "type": "io", "value": "Show Authoritative State\nReconcile Acknowledgement", "x": 740, "y": 1222.5, "w": 200, "h": 55},
        {"id": "node_conn_e3", "type": "connector", "value": "E", "sublabel": "Exit", "x": 960, "y": 1225, "w": 50, "h": 50},

        {"id": "node_submitted_end", "type": "process", "value": "Persisted Pending Snapshot &\nEnqueued for Admin Review", "x": 370, "y": 1335, "w": 260, "h": 55, "bold": True},

        # Database Store (Right)
        {"id": "node_db", "type": "db", "value": "Listings &\nDrafts DB", "x": 780, "y": 880, "w": 130, "h": 90},

        # On-Page Connector E receiver & End
        {"id": "node_conn_e_recv", "type": "connector", "value": "E", "sublabel": "From Exits", "x": 260, "y": 1450, "w": 50, "h": 50},
        {"id": "node_end", "type": "end", "value": "END", "x": 420, "y": 1450, "w": 160, "h": 50}
    ]

    edges = [
        {"id": "e_start_auth", "source": "node_start", "target": "node_auth", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},
        {"id": "e_auth_no", "source": "node_auth", "target": "node_auth_gate", "value": "NO",
         "points": [(350, 210)], "svg_points": [(420, 210), (350, 210)], "label_pos": (375, 202), "exitX": 0.0, "exitY": 0.5, "entryX": 1.0, "entryY": 0.5},
        {"id": "e_gate_auth", "source": "node_auth_gate", "target": "node_auth",
         "points": [(255, 140), (500, 140)], "svg_points": [(255, 182.5), (255, 140), (500, 140), (500, 165)], "exitX": 0.5, "exitY": 0.0, "entryX": 0.5, "entryY": 0.0},
        {"id": "e_auth_yes", "source": "node_auth", "target": "node_role", "value": "YES", "label_pos": (508, 275), "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        {"id": "e_role_no", "source": "node_role", "target": "node_deny", "value": "NO",
         "points": [(350, 340)], "svg_points": [(420, 340), (350, 340)], "label_pos": (375, 332), "exitX": 0.0, "exitY": 0.5, "entryX": 1.0, "entryY": 0.5},
        {"id": "e_deny_conn_e", "source": "node_deny", "target": "node_conn_e1", "exitX": 0.0, "exitY": 0.5, "entryX": 1.0, "entryY": 0.5},
        {"id": "e_role_yes", "source": "node_role", "target": "node_editor", "value": "YES", "label_pos": (508, 405), "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        {"id": "e_editor_save", "source": "node_editor", "target": "node_save_choice", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # Draft branch
        {"id": "e_choice_draft", "source": "node_save_choice", "target": "node_draft_validate", "value": "Save Draft",
         "points": [(255, 570)], "svg_points": [(420, 570), (255, 570), (255, 650)], "label_pos": (310, 560), "exitX": 0.0, "exitY": 0.5, "entryX": 0.5, "entryY": 0.0},
        {"id": "e_draft_validate_result", "source": "node_draft_validate", "target": "node_draft_result", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},
        {"id": "e_draft_result_yes", "source": "node_draft_result", "target": "node_draft_saved", "value": "YES", "label_pos": (262, 855), "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},
        {"id": "e_draft_saved_conn_e", "source": "node_draft_saved", "target": "node_conn_e2", "exitX": 0.0, "exitY": 0.5, "entryX": 1.0, "entryY": 0.5},
        {"id": "e_draft_result_no", "source": "node_draft_result", "target": "node_draft_retry", "value": "NO",
         "points": [(130, 795), (130, 1002.5)], "svg_points": [(175, 795), (130, 795), (130, 1002.5), (150, 1002.5)], "label_pos": (140, 785), "exitX": 0.0, "exitY": 0.5, "entryX": 0.0, "entryY": 0.5},
        {"id": "e_draft_retry_editor", "source": "node_draft_retry", "target": "node_editor",
         "points": [(25, 1002.5), (25, 455)], "svg_points": [(150, 1002.5), (25, 1002.5), (25, 455), (370, 455)], "exitX": 0.0, "exitY": 0.5, "entryX": 0.0, "entryY": 0.5},

        # Submit branch
        {"id": "e_choice_submit", "source": "node_save_choice", "target": "node_submit_validate", "value": "Submit", "label_pos": (508, 630), "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},
        {"id": "e_submit_validate_valid", "source": "node_submit_validate", "target": "node_submit_valid", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},
        {"id": "e_submit_valid_no", "source": "node_submit_valid", "target": "node_fix_input", "value": "NO",
         "points": [(740, 795)], "svg_points": [(580, 795), (740, 795)], "label_pos": (640, 787), "exitX": 1.0, "exitY": 0.5, "entryX": 0.0, "entryY": 0.5},
        {"id": "e_fix_editor", "source": "node_fix_input", "target": "node_editor",
         "points": [(840, 455)], "svg_points": [(840, 767.5), (840, 455), (630, 455)], "exitX": 0.5, "exitY": 0.0, "entryX": 1.0, "entryY": 0.5},
        {"id": "e_submit_valid_yes", "source": "node_submit_valid", "target": "node_pending_snapshot", "value": "YES", "label_pos": (508, 855), "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # DB Sync (Dashed)
        {"id": "e_pending_db", "source": "node_pending_snapshot", "target": "node_db", "value": "Persist", "dashed": True,
         "points": [(700, 910), (700, 925)], "svg_points": [(630, 910), (700, 910), (700, 925), (780, 925)], "label_pos": (705, 900), "exitX": 1.0, "exitY": 0.5, "entryX": 0.0, "entryY": 0.5},

        {"id": "e_pending_persist", "source": "node_pending_snapshot", "target": "node_persist_result", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},
        {"id": "e_persist_no", "source": "node_persist_result", "target": "node_persist_fail", "value": "NO",
         "points": [(740, 1025)], "svg_points": [(580, 1025), (740, 1025)], "label_pos": (640, 1017), "exitX": 1.0, "exitY": 0.5, "entryX": 0.0, "entryY": 0.5},
        {"id": "e_persist_fail_editor", "source": "node_persist_fail", "target": "node_editor",
         "points": [(860, 455)], "svg_points": [(840, 997.5), (860, 997.5), (860, 455), (630, 455)], "exitX": 0.5, "exitY": 0.0, "entryX": 1.0, "entryY": 0.5},
        {"id": "e_persist_yes", "source": "node_persist_result", "target": "node_handoff", "value": "YES", "label_pos": (508, 1085), "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        {"id": "e_handoff_check", "source": "node_handoff", "target": "node_handoff_check", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},
        {"id": "e_handoff_no", "source": "node_handoff_check", "target": "node_handoff_reconcile", "value": "NO",
         "points": [(740, 1250)], "svg_points": [(580, 1250), (740, 1250)], "label_pos": (640, 1242), "exitX": 1.0, "exitY": 0.5, "entryX": 0.0, "entryY": 0.5},
        {"id": "e_reconcile_conn_e", "source": "node_handoff_reconcile", "target": "node_conn_e3", "exitX": 1.0, "exitY": 0.5, "entryX": 0.0, "entryY": 0.5},
        {"id": "e_handoff_yes", "source": "node_handoff_check", "target": "node_submitted_end", "value": "YES", "label_pos": (508, 1310), "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},
        {"id": "e_submitted_end", "source": "node_submitted_end", "target": "node_end", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # On-Page Connector E to End
        {"id": "e_conn_e_end", "source": "node_conn_e_recv", "target": "node_end", "exitX": 1.0, "exitY": 0.5, "entryX": 0.0, "entryY": 0.5}
    ]

    drawio_str = build_drawio_xml(diag_id, title, pw, ph, nodes, edges)
    svg_str = build_svg_xml(title, pw, ph, nodes, edges)

    drawio_path = os.path.join(FLOW_DIR, f"{name}.drawio")
    svg_path = os.path.join(ASSET_DIR, f"{name}.svg")
    png_path = os.path.join(ASSET_DIR, f"{name}.png")
    pdf_path = os.path.join(PDF_DIR, f"{name}.pdf")

    with open(drawio_path, "w", encoding="utf-8") as f:
        f.write(drawio_str)
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(svg_str)
    export_png(svg_path, png_path, pw, ph)
    export_pdf(svg_path, pdf_path, pw, ph)
    print(f"Generated {name} (.drawio, .svg, .png, .pdf)")


def build_landlord_review_outcomes():
    name = "landlord-listing-review-outcomes"
    diag_id = "scrum-125-landlord-listing-review-outcomes"
    title = "SCRUM-125: REVIEW OUTCOME & OWNER LISTING MAINTENANCE"
    pw, ph = 1050, 1600

    nodes = [
        {"id": "node_start", "type": "start", "value": "START", "x": 420, "y": 80, "w": 160, "h": 50},
        {"id": "node_read_outcome", "type": "process", "value": "Read Persisted Module 4 Outcome\nfor Owned Submitted Listing", "x": 370, "y": 165, "w": 260, "h": 55},
        {"id": "node_owner_auth", "type": "decision", "value": "Authorized Owner &\nValid Record?", "x": 420, "y": 255, "w": 160, "h": 90},
        {"id": "node_invalid", "type": "io", "value": "Unauthorized / Stale\nReturn to Queue", "x": 160, "y": 272.5, "w": 190, "h": 55, "bold": True},
        {"id": "node_conn_e1", "type": "connector", "value": "E", "sublabel": "Exit", "x": 60, "y": 275, "w": 50, "h": 50},

        {"id": "node_decision_status", "type": "decision", "value": "Persisted Outcome\nStatus?", "x": 420, "y": 380, "w": 160, "h": 90},

        # Approved Branch (Right)
        {"id": "node_approved_display", "type": "io", "value": "Display Approved State\n(Audit Evidence Recorded)", "x": 740, "y": 495, "w": 200, "h": 55, "bold": True},
        {"id": "node_available_check", "type": "decision", "value": "Available Unit\nPresent?", "x": 760, "y": 590, "w": 160, "h": 90},
        {"id": "node_public_discovery", "type": "offpage", "value": "Sub-Process 2.2 / 2.3:\nDiscoverable in Search & Map", "x": 740, "y": 725, "w": 200, "h": 55, "bold": True},
        {"id": "node_hidden_display", "type": "io", "value": "Display Approved But Hidden\n(No Available Units)", "x": 740, "y": 820, "w": 200, "h": 55},
        {"id": "node_conn_e4", "type": "connector", "value": "E", "sublabel": "Exit", "x": 960, "y": 775, "w": 50, "h": 50},

        # Rejected Branch (Spine)
        {"id": "node_rejected_display", "type": "io", "value": "Display Rejected Status &\nActionable Moderation Reason", "x": 370, "y": 495, "w": 260, "h": 60, "bold": True},
        {"id": "node_resubmit_choice", "type": "decision", "value": "Owner Corrects\n& Resubmits?", "x": 420, "y": 595, "w": 160, "h": 90},
        {"id": "node_remain_rejected", "type": "io", "value": "Remain Rejected / Non-Public\nPreserve Audit Record", "x": 160, "y": 612.5, "w": 190, "h": 55},
        {"id": "node_conn_e2", "type": "connector", "value": "E", "sublabel": "Exit", "x": 60, "y": 615, "w": 50, "h": 50},

        {"id": "node_correction_editor", "type": "io", "value": "Owner Correction Editor\n(No Direct Moderation Writes)", "x": 375, "y": 725, "w": 250, "h": 55},
        {"id": "node_validate_changes", "type": "decision", "value": "Role, Version &\nData Valid?", "x": 420, "y": 820, "w": 160, "h": 90},
        {"id": "node_fix_resubmit", "type": "io", "value": "Field Errors / Conflict\nReconcile in Editor", "x": 160, "y": 837.5, "w": 190, "h": 55},

        {"id": "node_persist_resubmit", "type": "process", "value": "Persist Resubmitted Snapshot\nUnder Approved Schema", "x": 370, "y": 950, "w": 260, "h": 60, "bold": True},
        {"id": "node_resubmit_result", "type": "decision", "value": "Resubmission\nSucceeded?", "x": 420, "y": 1050, "w": 160, "h": 90},
        {"id": "node_resubmit_fail", "type": "io", "value": "Submission Failed\nRetain Input & Retry", "x": 160, "y": 1067.5, "w": 190, "h": 55},

        {"id": "node_re_enqueue", "type": "offpage", "value": "Re-enqueue to Module 4\nAdmin Moderation Queue", "x": 380, "y": 1180, "w": 240, "h": 55},
        {"id": "node_queue_ack", "type": "decision", "value": "Queue Handoff\nAccepted?", "x": 420, "y": 1275, "w": 160, "h": 90},
        {"id": "node_reconcile_ack", "type": "io", "value": "Reconcile Authoritative State\n(No Duplicate Submit)", "x": 160, "y": 1292.5, "w": 190, "h": 55},
        {"id": "node_conn_e3", "type": "connector", "value": "E", "sublabel": "Exit", "x": 60, "y": 1295, "w": 50, "h": 50},

        {"id": "node_resubmitted_end", "type": "process", "value": "Persisted Pending Review\n(Awaiting Admin Decision)", "x": 370, "y": 1405, "w": 260, "h": 55, "bold": True},

        # Database Store (Right)
        {"id": "node_db", "type": "db", "value": "Listings DB", "x": 780, "y": 950, "w": 130, "h": 90},

        # On-Page Connector E receiver & End
        {"id": "node_conn_e_recv", "type": "connector", "value": "E", "sublabel": "From Exits", "x": 260, "y": 1500, "w": 50, "h": 50},
        {"id": "node_end", "type": "end", "value": "END", "x": 420, "y": 1500, "w": 160, "h": 50}
    ]

    edges = [
        {"id": "e_start_read", "source": "node_start", "target": "node_read_outcome", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},
        {"id": "e_read_owner", "source": "node_read_outcome", "target": "node_owner_auth", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},
        {"id": "e_owner_no", "source": "node_owner_auth", "target": "node_invalid", "value": "NO",
         "points": [(350, 300)], "svg_points": [(420, 300), (350, 300)], "label_pos": (375, 292), "exitX": 0.0, "exitY": 0.5, "entryX": 1.0, "entryY": 0.5},
        {"id": "e_invalid_conn_e", "source": "node_invalid", "target": "node_conn_e1", "exitX": 0.0, "exitY": 0.5, "entryX": 1.0, "entryY": 0.5},
        {"id": "e_owner_yes", "source": "node_owner_auth", "target": "node_decision_status", "value": "YES", "label_pos": (508, 360), "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # Status decisions
        {"id": "e_status_approved", "source": "node_decision_status", "target": "node_approved_display", "value": "Approved",
         "points": [(840, 425)], "svg_points": [(580, 425), (840, 425), (840, 495)], "label_pos": (670, 417), "exitX": 1.0, "exitY": 0.5, "entryX": 0.5, "entryY": 0.0},
        {"id": "e_approved_available", "source": "node_approved_display", "target": "node_available_check", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},
        {"id": "e_available_yes", "source": "node_available_check", "target": "node_public_discovery", "value": "YES", "label_pos": (848, 700), "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},
        {"id": "e_available_no", "source": "node_available_check", "target": "node_hidden_display", "value": "NO",
         "points": [(950, 635), (950, 847.5)], "svg_points": [(920, 635), (950, 635), (950, 847.5), (940, 847.5)], "label_pos": (955, 730), "exitX": 1.0, "exitY": 0.5, "entryX": 1.0, "entryY": 0.5},
        {"id": "e_public_conn_e", "source": "node_public_discovery", "target": "node_conn_e4",
         "points": [(985, 752.5)], "svg_points": [(940, 752.5), (985, 752.5), (985, 775)], "exitX": 1.0, "exitY": 0.5, "entryX": 0.5, "entryY": 0.0},
        {"id": "e_hidden_conn_e", "source": "node_hidden_display", "target": "node_conn_e4",
         "points": [(985, 847.5)], "svg_points": [(940, 847.5), (985, 847.5), (985, 825)], "exitX": 1.0, "exitY": 0.5, "entryX": 0.5, "entryY": 1.0},

        # Rejected flow
        {"id": "e_status_rejected", "source": "node_decision_status", "target": "node_rejected_display", "value": "Rejected", "label_pos": (508, 480), "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},
        {"id": "e_rejected_choice", "source": "node_rejected_display", "target": "node_resubmit_choice", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},
        {"id": "e_choice_no", "source": "node_resubmit_choice", "target": "node_remain_rejected", "value": "NO",
         "points": [(350, 640)], "svg_points": [(420, 640), (350, 640)], "label_pos": (375, 632), "exitX": 0.0, "exitY": 0.5, "entryX": 1.0, "entryY": 0.5},
        {"id": "e_remain_conn_e", "source": "node_remain_rejected", "target": "node_conn_e2", "exitX": 0.0, "exitY": 0.5, "entryX": 1.0, "entryY": 0.5},
        {"id": "e_choice_yes", "source": "node_resubmit_choice", "target": "node_correction_editor", "value": "YES", "label_pos": (508, 705), "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # Correction validation
        {"id": "e_editor_validate", "source": "node_correction_editor", "target": "node_validate_changes", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},
        {"id": "e_validate_no", "source": "node_validate_changes", "target": "node_fix_resubmit", "value": "NO",
         "points": [(350, 865)], "svg_points": [(420, 865), (350, 865)], "label_pos": (375, 857), "exitX": 0.0, "exitY": 0.5, "entryX": 1.0, "entryY": 0.5},
        {"id": "e_fix_editor", "source": "node_fix_resubmit", "target": "node_correction_editor",
         "points": [(255, 752.5)], "svg_points": [(255, 837.5), (255, 752.5), (375, 752.5)], "exitX": 0.5, "exitY": 0.0, "entryX": 0.0, "entryY": 0.5},
        {"id": "e_validate_yes", "source": "node_validate_changes", "target": "node_persist_resubmit", "value": "YES", "label_pos": (508, 930), "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # DB Sync (Dashed)
        {"id": "e_persist_db", "source": "node_persist_resubmit", "target": "node_db", "value": "Persist", "dashed": True,
         "points": [(700, 980), (700, 995)], "svg_points": [(630, 980), (700, 980), (700, 995), (780, 995)], "label_pos": (705, 970), "exitX": 1.0, "exitY": 0.5, "entryX": 0.0, "entryY": 0.5},

        {"id": "e_persist_check", "source": "node_persist_resubmit", "target": "node_resubmit_result", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},
        {"id": "e_resubmit_no", "source": "node_resubmit_result", "target": "node_resubmit_fail", "value": "NO",
         "points": [(350, 1095)], "svg_points": [(420, 1095), (350, 1095)], "label_pos": (375, 1087), "exitX": 0.0, "exitY": 0.5, "entryX": 1.0, "entryY": 0.5},
        {"id": "e_fail_editor", "source": "node_resubmit_fail", "target": "node_correction_editor",
         "points": [(130, 1095), (130, 705), (400, 705)], "svg_points": [(160, 1095), (130, 1095), (130, 705), (400, 705), (400, 725)], "exitX": 0.0, "exitY": 0.5, "entryX": 0.1, "entryY": 0.0},
        {"id": "e_resubmit_yes", "source": "node_resubmit_result", "target": "node_re_enqueue", "value": "YES", "label_pos": (508, 1160), "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        {"id": "e_enqueue_ack", "source": "node_re_enqueue", "target": "node_queue_ack", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},
        {"id": "e_ack_no", "source": "node_queue_ack", "target": "node_reconcile_ack", "value": "NO",
         "points": [(350, 1320)], "svg_points": [(420, 1320), (350, 1320)], "label_pos": (375, 1312), "exitX": 0.0, "exitY": 0.5, "entryX": 1.0, "entryY": 0.5},
        {"id": "e_reconcile_conn_e", "source": "node_reconcile_ack", "target": "node_conn_e3", "exitX": 0.0, "exitY": 0.5, "entryX": 1.0, "entryY": 0.5},
        {"id": "e_ack_yes", "source": "node_queue_ack", "target": "node_resubmitted_end", "value": "YES", "label_pos": (508, 1385), "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},
        {"id": "e_resubmitted_end", "source": "node_resubmitted_end", "target": "node_end", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # On-Page Connector E to End
        {"id": "e_conn_e_end", "source": "node_conn_e_recv", "target": "node_end", "exitX": 1.0, "exitY": 0.5, "entryX": 0.0, "entryY": 0.5}
    ]

    drawio_str = build_drawio_xml(diag_id, title, pw, ph, nodes, edges)
    svg_str = build_svg_xml(title, pw, ph, nodes, edges)

    drawio_path = os.path.join(FLOW_DIR, f"{name}.drawio")
    svg_path = os.path.join(ASSET_DIR, f"{name}.svg")
    png_path = os.path.join(ASSET_DIR, f"{name}.png")
    pdf_path = os.path.join(PDF_DIR, f"{name}.pdf")

    with open(drawio_path, "w", encoding="utf-8") as f:
        f.write(drawio_str)
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(svg_str)
    export_png(svg_path, png_path, pw, ph)
    export_pdf(svg_path, pdf_path, pw, ph)
    print(f"Generated {name} (.drawio, .svg, .png, .pdf)")

if __name__ == "__main__":
    build_landlord_draft_submit()
    build_landlord_review_outcomes()

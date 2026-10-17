#!/usr/bin/env python3
"""Build SCRUM-127 standard flowcharts:
5. renter-favorites
6. renter-contact-reveal
7. renter-inquiry-viewing
Adheres 100% to the auth-registration-pkce reference standard.
"""

import os
import sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from generate_standard_flowcharts import build_drawio_xml, build_svg_xml, export_png, FLOW_DIR, ASSET_DIR

def build_renter_favorites():
    name = "renter-favorites"
    diag_id = "scrum-127-renter-favorites"
    title = "SCRUM-127: SAVE / REMOVE FAVORITE LISTING"
    pw, ph = 1050, 1150

    nodes = [
        {"id": "node_start", "type": "start", "value": "START", "x": 420, "y": 80, "w": 160, "h": 50},
        {"id": "node_auth", "type": "decision", "value": "Authenticated\nRenter?", "x": 420, "y": 165, "w": 160, "h": 90},
        {"id": "node_gate", "type": "process", "value": "Guest: SCRUM-121 Gate\nPreserve Listing & Action", "x": 160, "y": 182.5, "w": 190, "h": 55},

        {"id": "node_action", "type": "decision", "value": "Requested Action\nis Save?", "x": 420, "y": 295, "w": 160, "h": 90},

        # Save branch (Spine)
        {"id": "node_approved", "type": "decision", "value": "Listing Approved\n& Available?", "x": 420, "y": 425, "w": 160, "h": 90},
        {"id": "node_unavailable", "type": "process", "value": "Unavailable Listing\nAction Refused Safely", "x": 740, "y": 442.5, "w": 200, "h": 55},
        {"id": "node_save", "type": "process", "value": "Upsert Favorite Association\n(Enforce Unique Renter/Listing)", "x": 370, "y": 555, "w": 260, "h": 60, "bold": True},

        # Remove branch (Left)
        {"id": "node_remove", "type": "process", "value": "Delete Favorite Association\n(Idempotent Removal)", "x": 150, "y": 555, "w": 210, "h": 60},

        # Persistence check
        {"id": "node_persist", "type": "decision", "value": "Persistence\nSucceeded?", "x": 420, "y": 665, "w": 160, "h": 90},
        {"id": "node_error", "type": "process", "value": "Persistence Failed\nSafe Bounded Retry", "x": 160, "y": 682.5, "w": 190, "h": 55},
        {"id": "node_confirm", "type": "process", "value": "Update Renter Saved State\n(Reflect Instant UI Toggle)", "x": 370, "y": 795, "w": 260, "h": 55, "bold": True},

        # Database Store (Right)
        {"id": "node_db", "type": "db", "value": "Saved\nListings DB", "x": 780, "y": 545, "w": 130, "h": 90},

        # End
        {"id": "node_end", "type": "end", "value": "END", "x": 420, "y": 910, "w": 160, "h": 50}
    ]

    edges = [
        {"id": "e_start_auth", "source": "node_start", "target": "node_auth"},
        {"id": "e_auth_no", "source": "node_auth", "target": "node_gate", "value": "NO",
         "points": [(350, 210)], "svg_points": [(420, 210), (350, 210)], "label_pos": (375, 202)},
        {"id": "e_gate_auth", "source": "node_gate", "target": "node_auth",
         "points": [(255, 140), (500, 140)], "svg_points": [(255, 182.5), (255, 140), (500, 140), (500, 165)]},
        {"id": "e_auth_yes", "source": "node_auth", "target": "node_action", "value": "YES", "label_pos": (508, 275)},

        # Action choice
        {"id": "e_action_save", "source": "node_action", "target": "node_approved", "value": "YES (Save)", "label_pos": (508, 405)},
        {"id": "e_action_remove", "source": "node_action", "target": "node_remove", "value": "NO (Remove)",
         "points": [(255, 340)], "svg_points": [(420, 340), (255, 340), (255, 555)], "label_pos": (310, 330)},

        # Save check
        {"id": "e_approved_no", "source": "node_approved", "target": "node_unavailable", "value": "NO",
         "points": [(740, 470)], "svg_points": [(580, 470), (740, 470)], "label_pos": (640, 462)},
        {"id": "e_unavailable_end", "source": "node_unavailable", "target": "node_end",
         "points": [(840, 935)], "svg_points": [(840, 497.5), (840, 935), (580, 935)]},
        {"id": "e_approved_yes", "source": "node_approved", "target": "node_save", "value": "YES", "label_pos": (508, 535)},

        # DB Sync (Dashed)
        {"id": "e_save_db", "source": "node_save", "target": "node_db", "value": "Upsert", "dashed": True,
         "points": [(780, 585)], "svg_points": [(630, 585), (780, 585)], "label_pos": (705, 575)},

        # Convergence to persist check
        {"id": "e_save_persist", "source": "node_save", "target": "node_persist"},
        {"id": "e_remove_persist", "source": "node_remove", "target": "node_persist",
         "points": [(255, 710)], "svg_points": [(255, 615), (255, 710), (420, 710)]},

        {"id": "e_persist_no", "source": "node_persist", "target": "node_error", "value": "NO",
         "points": [(350, 710)], "svg_points": [(420, 710), (350, 710)], "label_pos": (375, 702)},
        {"id": "e_error_end", "source": "node_error", "target": "node_end",
         "points": [(100, 710), (100, 935)], "svg_points": [(160, 710), (100, 710), (100, 935), (420, 935)]},
        {"id": "e_persist_yes", "source": "node_persist", "target": "node_confirm", "value": "YES", "label_pos": (508, 775)},
        {"id": "e_confirm_end", "source": "node_confirm", "target": "node_end"}
    ]

    drawio_str = build_drawio_xml(diag_id, title, pw, ph, nodes, edges)
    svg_str = build_svg_xml(title, pw, ph, nodes, edges)

    drawio_path = os.path.join(FLOW_DIR, f"{name}.drawio")
    svg_path = os.path.join(ASSET_DIR, f"{name}.svg")
    png_path = os.path.join(ASSET_DIR, f"{name}.png")

    with open(drawio_path, "w", encoding="utf-8") as f:
        f.write(drawio_str)
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(svg_str)
    export_png(svg_path, png_path, pw, ph)
    print(f"Generated {name} (.drawio, .svg, .png)")

def build_renter_contact_reveal():
    name = "renter-contact-reveal"
    diag_id = "scrum-127-renter-contact-reveal"
    title = "SCRUM-127: LANDLORD CONTACT REVEAL FLOW"
    pw, ph = 1050, 1050

    nodes = [
        {"id": "node_start", "type": "start", "value": "START", "x": 420, "y": 80, "w": 160, "h": 50},
        {"id": "node_auth", "type": "decision", "value": "Authenticated\nRenter?", "x": 420, "y": 165, "w": 160, "h": 90},
        {"id": "node_gate", "type": "process", "value": "Guest: SCRUM-121 Gate\nStore Intent & Sign In", "x": 160, "y": 182.5, "w": 190, "h": 55},

        {"id": "node_listing_check", "type": "decision", "value": "Listing Approved\n& Landlord Linked?", "x": 420, "y": 295, "w": 160, "h": 90},
        {"id": "node_deny_listing", "type": "process", "value": "Fail Closed / Safe Response\nNo Contact Disclosed", "x": 160, "y": 312.5, "w": 190, "h": 55, "bold": True},

        {"id": "node_abuse_policy", "type": "decision", "value": "Policy & Abuse\nControls Pass?", "x": 420, "y": 425, "w": 160, "h": 90},
        {"id": "node_withhold", "type": "process", "value": "Withhold Contact Data\nOffer In-App Inquiry", "x": 160, "y": 442.5, "w": 190, "h": 55},

        {"id": "node_contact_avail", "type": "decision", "value": "Verified Contact\nAvailable?", "x": 420, "y": 555, "w": 160, "h": 90},
        {"id": "node_none_avail", "type": "process", "value": "Contact Unavailable\nOffer In-App Inquiry", "x": 740, "y": 572.5, "w": 200, "h": 55},

        {"id": "node_reveal", "type": "process", "value": "Return Minimum Verified Contact\nto Authorized Renter & Log Access", "x": 360, "y": 685, "w": 280, "h": 60, "bold": True},

        # Database Store (Right)
        {"id": "node_db", "type": "db", "value": "Landlord Contact\n& Access Log DB", "x": 780, "y": 670, "w": 130, "h": 90},

        # End
        {"id": "node_end", "type": "end", "value": "END", "x": 420, "y": 810, "w": 160, "h": 50}
    ]

    edges = [
        {"id": "e_start_auth", "source": "node_start", "target": "node_auth"},
        {"id": "e_auth_no", "source": "node_auth", "target": "node_gate", "value": "NO",
         "points": [(350, 210)], "svg_points": [(420, 210), (350, 210)], "label_pos": (375, 202)},
        {"id": "e_gate_auth", "source": "node_gate", "target": "node_auth",
         "points": [(255, 140), (500, 140)], "svg_points": [(255, 182.5), (255, 140), (500, 140), (500, 165)]},
        {"id": "e_auth_yes", "source": "node_auth", "target": "node_listing_check", "value": "YES", "label_pos": (508, 275)},

        {"id": "e_listing_no", "source": "node_listing_check", "target": "node_deny_listing", "value": "NO",
         "points": [(350, 340)], "svg_points": [(420, 340), (350, 340)], "label_pos": (375, 332)},
        {"id": "e_deny_end", "source": "node_deny_listing", "target": "node_end",
         "points": [(100, 340), (100, 835)], "svg_points": [(160, 340), (100, 340), (100, 835), (420, 835)]},
        {"id": "e_listing_yes", "source": "node_listing_check", "target": "node_abuse_policy", "value": "YES", "label_pos": (508, 405)},

        {"id": "e_abuse_no", "source": "node_abuse_policy", "target": "node_withhold", "value": "NO",
         "points": [(350, 470)], "svg_points": [(420, 470), (350, 470)], "label_pos": (375, 462)},
        {"id": "e_withhold_end", "source": "node_withhold", "target": "node_end",
         "points": [(100, 470), (100, 835)], "svg_points": [(160, 470), (100, 470), (100, 835), (420, 835)]},
        {"id": "e_abuse_yes", "source": "node_abuse_policy", "target": "node_contact_avail", "value": "YES", "label_pos": (508, 535)},

        {"id": "e_contact_no", "source": "node_contact_avail", "target": "node_none_avail", "value": "NO",
         "points": [(740, 600)], "svg_points": [(580, 600), (740, 600)], "label_pos": (640, 592)},
        {"id": "e_none_end", "source": "node_none_avail", "target": "node_end",
         "points": [(840, 835)], "svg_points": [(840, 627.5), (840, 835), (580, 835)]},
        {"id": "e_contact_yes", "source": "node_contact_avail", "target": "node_reveal", "value": "YES", "label_pos": (508, 665)},

        # DB Sync (Dashed)
        {"id": "e_reveal_db", "source": "node_reveal", "target": "node_db", "value": "Log Access", "dashed": True,
         "points": [(780, 715)], "svg_points": [(640, 715), (780, 715)], "label_pos": (705, 705)},

        {"id": "e_reveal_end", "source": "node_reveal", "target": "node_end"}
    ]

    drawio_str = build_drawio_xml(diag_id, title, pw, ph, nodes, edges)
    svg_str = build_svg_xml(title, pw, ph, nodes, edges)

    drawio_path = os.path.join(FLOW_DIR, f"{name}.drawio")
    svg_path = os.path.join(ASSET_DIR, f"{name}.svg")
    png_path = os.path.join(ASSET_DIR, f"{name}.png")

    with open(drawio_path, "w", encoding="utf-8") as f:
        f.write(drawio_str)
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(svg_str)
    export_png(svg_path, png_path, pw, ph)
    print(f"Generated {name} (.drawio, .svg, .png)")

def build_renter_inquiry_viewing():
    name = "renter-inquiry-viewing"
    diag_id = "scrum-127-renter-inquiry-viewing"
    title = "SCRUM-127: RENTER INQUIRY & VIEWING REQUEST FLOW"
    pw, ph = 1050, 1420

    nodes = [
        {"id": "node_start", "type": "start", "value": "START", "x": 420, "y": 80, "w": 160, "h": 50},
        {"id": "node_auth", "type": "decision", "value": "Authenticated\nRenter?", "x": 420, "y": 165, "w": 160, "h": 90},
        {"id": "node_gate", "type": "process", "value": "Guest: SCRUM-121 Gate\nPreserve Listing & Action", "x": 160, "y": 182.5, "w": 190, "h": 55},

        {"id": "node_target_check", "type": "decision", "value": "Listing Eligible\n& Available?", "x": 420, "y": 295, "w": 160, "h": 90},
        {"id": "node_closed", "type": "process", "value": "Target Unavailable\nSafe Termination", "x": 160, "y": 312.5, "w": 190, "h": 55, "bold": True},

        {"id": "node_input_form", "type": "io", "value": "Capture Inquiry Message, Move-in Date\n& Viewing Appointment Slot", "x": 360, "y": 425, "w": 280, "h": 65},

        {"id": "node_validate_input", "type": "decision", "value": "Inputs Valid &\nWithin Rate Limits?", "x": 420, "y": 530, "w": 160, "h": 90},
        {"id": "node_field_errors", "type": "process", "value": "Field Errors Detected\nCorrect or Cancel", "x": 160, "y": 547.5, "w": 190, "h": 55},

        {"id": "node_insert_pending", "type": "process", "value": "Derive Landlord from Property &\nInsert Inquiry with 'Pending' Status", "x": 370, "y": 660, "w": 260, "h": 60, "bold": True},
        {"id": "node_persist_check", "type": "decision", "value": "Persistence\nSucceeded?", "x": 420, "y": 760, "w": 160, "h": 90},
        {"id": "node_fail_notice", "type": "process", "value": "Persistence Failure\nRetry Without Duplicate", "x": 160, "y": 777.5, "w": 190, "h": 55},

        {"id": "node_notify_landlord", "type": "process", "value": "Notify Owning Landlord of\nNew Inquiry / Viewing Request", "x": 370, "y": 890, "w": 260, "h": 55},
        {"id": "node_landlord_decision", "type": "decision", "value": "Landlord Response\nOutcome?", "x": 420, "y": 985, "w": 160, "h": 90},

        {"id": "node_persist_response", "type": "process", "value": "Persist Landlord Response &\nNotify Renter of Status / Schedule", "x": 360, "y": 1115, "w": 280, "h": 60, "bold": True},

        # Database Store (Right)
        {"id": "node_db", "type": "db", "value": "Inquiries &\nAppointments DB", "x": 780, "y": 645, "w": 130, "h": 90},

        # End
        {"id": "node_end", "type": "end", "value": "END", "x": 420, "y": 1235, "w": 160, "h": 50}
    ]

    edges = [
        {"id": "e_start_auth", "source": "node_start", "target": "node_auth"},
        {"id": "e_auth_no", "source": "node_auth", "target": "node_gate", "value": "NO",
         "points": [(350, 210)], "svg_points": [(420, 210), (350, 210)], "label_pos": (375, 202)},
        {"id": "e_gate_auth", "source": "node_gate", "target": "node_auth",
         "points": [(255, 140), (500, 140)], "svg_points": [(255, 182.5), (255, 140), (500, 140), (500, 165)]},
        {"id": "e_auth_yes", "source": "node_auth", "target": "node_target_check", "value": "YES", "label_pos": (508, 275)},

        {"id": "e_target_no", "source": "node_target_check", "target": "node_closed", "value": "NO",
         "points": [(350, 340)], "svg_points": [(420, 340), (350, 340)], "label_pos": (375, 332)},
        {"id": "e_closed_end", "source": "node_closed", "target": "node_end",
         "points": [(100, 340), (100, 1260)], "svg_points": [(160, 340), (100, 340), (100, 1260), (420, 1260)]},
        {"id": "e_target_yes", "source": "node_target_check", "target": "node_input_form", "value": "YES", "label_pos": (508, 405)},

        {"id": "e_form_validate", "source": "node_input_form", "target": "node_validate_input"},
        {"id": "e_validate_no", "source": "node_validate_input", "target": "node_field_errors", "value": "NO",
         "points": [(350, 575)], "svg_points": [(420, 575), (350, 575)], "label_pos": (375, 567)},
        {"id": "e_errors_form", "source": "node_field_errors", "target": "node_input_form",
         "points": [(255, 457.5)], "svg_points": [(255, 547.5), (255, 457.5), (360, 457.5)]},
        {"id": "e_validate_yes", "source": "node_validate_input", "target": "node_insert_pending", "value": "YES", "label_pos": (508, 640)},

        # DB Sync (Dashed)
        {"id": "e_insert_db", "source": "node_insert_pending", "target": "node_db", "value": "Insert", "dashed": True,
         "points": [(780, 690)], "svg_points": [(630, 690), (780, 690)], "label_pos": (705, 680)},

        {"id": "e_insert_check", "source": "node_insert_pending", "target": "node_persist_check"},
        {"id": "e_persist_no", "source": "node_persist_check", "target": "node_fail_notice", "value": "NO",
         "points": [(350, 805)], "svg_points": [(420, 805), (350, 805)], "label_pos": (375, 797)},
        {"id": "e_fail_end", "source": "node_fail_notice", "target": "node_end",
         "points": [(100, 805), (100, 1260)], "svg_points": [(160, 805), (100, 805), (100, 1260), (420, 1260)]},
        {"id": "e_persist_yes", "source": "node_persist_check", "target": "node_notify_landlord", "value": "YES", "label_pos": (508, 870)},

        {"id": "e_notify_landlord_decision", "source": "node_notify_landlord", "target": "node_landlord_decision"},
        {"id": "e_decision_persist", "source": "node_landlord_decision", "target": "node_persist_response", "value": "Accept / Schedule", "label_pos": (508, 1095)},
        {"id": "e_persist_response_end", "source": "node_persist_response", "target": "node_end"}
    ]

    drawio_str = build_drawio_xml(diag_id, title, pw, ph, nodes, edges)
    svg_str = build_svg_xml(title, pw, ph, nodes, edges)

    drawio_path = os.path.join(FLOW_DIR, f"{name}.drawio")
    svg_path = os.path.join(ASSET_DIR, f"{name}.svg")
    png_path = os.path.join(ASSET_DIR, f"{name}.png")

    with open(drawio_path, "w", encoding="utf-8") as f:
        f.write(drawio_str)
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(svg_str)
    export_png(svg_path, png_path, pw, ph)
    print(f"Generated {name} (.drawio, .svg, .png)")

if __name__ == "__main__":
    build_renter_favorites()
    build_renter_contact_reveal()
    build_renter_inquiry_viewing()

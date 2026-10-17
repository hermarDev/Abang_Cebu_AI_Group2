#!/usr/bin/env python3
"""Build SCRUM-126 standard flowcharts:
1. admin-listing-moderation
2. admin-kyc-review
Adheres 100% to the auth-registration-pkce reference standard.
"""

import os
import sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from generate_standard_flowcharts import build_drawio_xml, build_svg_xml, export_png, FLOW_DIR, ASSET_DIR

def build_admin_listing_moderation():
    name = "admin-listing-moderation"
    diag_id = "scrum-126-admin-listing-moderation"
    title = "SCRUM-126: ADMIN LISTING MODERATION FLOW"
    pw, ph = 1050, 1720

    # Central spine at x = 500
    # Left corridor at x = 100
    # Left boxes at x = 150 (w=200)
    # Right DB/Public at x = 750 (w=180)
    # Right return corridor at x = 700

    nodes = [
        {"id": "node_start", "type": "start", "value": "START", "x": 420, "y": 80, "w": 160, "h": 50},
        {"id": "node_admin_auth", "type": "decision", "value": "Authorized Active\nAdmin?", "x": 420, "y": 165, "w": 160, "h": 90},
        {"id": "node_deny", "type": "process", "value": "Deny Access\nNo Listing Data Disclosed", "x": 160, "y": 182.5, "w": 190, "h": 55, "bold": True},

        {"id": "node_queue", "type": "process", "value": "Retrieve Eligible\nPending Listing Queue", "x": 390, "y": 295, "w": 220, "h": 55},
        {"id": "node_current", "type": "decision", "value": "Pending Record\nExists?", "x": 420, "y": 385, "w": 160, "h": 90},
        {"id": "node_stale", "type": "process", "value": "Stale / Reviewed Record\nReload Queue", "x": 160, "y": 402.5, "w": 190, "h": 55},

        {"id": "node_inspect", "type": "process", "value": "Inspect Property, Units,\nAvailability, Media & KYC Gate", "x": 375, "y": 515, "w": 250, "h": 60},
        {"id": "node_eligible", "type": "decision", "value": "Eligible Under\nPolicy?", "x": 420, "y": 610, "w": 160, "h": 90},
        {"id": "node_correction", "type": "process", "value": "Incomplete / Request\nLandlord Correction", "x": 160, "y": 627.5, "w": 190, "h": 55},

        {"id": "node_outcome", "type": "decision", "value": "Moderation\nDecision?", "x": 420, "y": 740, "w": 160, "h": 90},

        # Approve Branch (Spine)
        {"id": "node_approved", "type": "process", "value": "Persist Approved Status +\nReviewer ID, Timestamp & Audit Log", "x": 370, "y": 870, "w": 260, "h": 60, "bold": True},
        {"id": "node_available", "type": "decision", "value": "Eligible Unit\nAvailable?", "x": 420, "y": 970, "w": 160, "h": 90},
        {"id": "node_public", "type": "process", "value": "Discoverable in Search &\nMap (SCRUM-116 Gate)", "x": 740, "y": 987.5, "w": 200, "h": 55, "bold": True},
        {"id": "node_hidden", "type": "process", "value": "Hidden from Search\n(No Available Units)", "x": 390, "y": 1100, "w": 220, "h": 55},

        # Reject Branch (Left)
        {"id": "node_reason", "type": "decision", "value": "Actionable Reason\nPresent?", "x": 175, "y": 740, "w": 160, "h": 90},
        {"id": "node_reason_missing", "type": "process", "value": "Prompt Required Reason\n(No State Mutation)", "x": 160, "y": 870, "w": 190, "h": 55},
        {"id": "node_rejected", "type": "process", "value": "Persist Rejected Status +\nReason & Admin Audit Log", "x": 160, "y": 1100, "w": 190, "h": 60, "bold": True},

        # Notifications & Retries
        {"id": "node_notify", "type": "process", "value": "Return Persisted Outcome\nto Landlord via Owner Flow", "x": 380, "y": 1220, "w": 240, "h": 55},
        {"id": "node_delivered", "type": "decision", "value": "Notification\nDelivered?", "x": 420, "y": 1315, "w": 160, "h": 90},
        {"id": "node_retry", "type": "process", "value": "Delivery Failed\nRetry Notification Dispatch", "x": 160, "y": 1332.5, "w": 190, "h": 55},

        # Database Store (Right)
        {"id": "node_db", "type": "db", "value": "Listings &\nAudit DB", "x": 780, "y": 855, "w": 130, "h": 90},

        # End
        {"id": "node_end", "type": "end", "value": "END", "x": 420, "y": 1460, "w": 160, "h": 50}
    ]

    edges = [
        {"id": "e_start_auth", "source": "node_start", "target": "node_admin_auth"},
        {"id": "e_auth_no", "source": "node_admin_auth", "target": "node_deny", "value": "NO",
         "points": [(350, 210)], "svg_points": [(420, 210), (350, 210)], "label_pos": (375, 202)},
        {"id": "e_deny_end", "source": "node_deny", "target": "node_end",
         "points": [(100, 210), (100, 1485)], "svg_points": [(160, 210), (100, 210), (100, 1485), (420, 1485)]},

        {"id": "e_auth_yes", "source": "node_admin_auth", "target": "node_queue", "value": "YES", "label_pos": (508, 275)},
        {"id": "e_queue_current", "source": "node_queue", "target": "node_current"},
        {"id": "e_current_no", "source": "node_current", "target": "node_stale", "value": "NO",
         "points": [(350, 430)], "svg_points": [(420, 430), (350, 430)], "label_pos": (375, 422)},
        {"id": "e_stale_queue", "source": "node_stale", "target": "node_queue",
         "points": [(255, 322.5)], "svg_points": [(255, 402.5), (255, 322.5), (390, 322.5)]},
        {"id": "e_current_yes", "source": "node_current", "target": "node_inspect", "value": "YES", "label_pos": (508, 495)},

        {"id": "e_inspect_eligible", "source": "node_inspect", "target": "node_eligible"},
        {"id": "e_eligible_no", "source": "node_eligible", "target": "node_correction", "value": "NO",
         "points": [(350, 655)], "svg_points": [(420, 655), (350, 655)], "label_pos": (375, 647)},
        {"id": "e_correction_end", "source": "node_correction", "target": "node_end",
         "points": [(100, 655), (100, 1485)], "svg_points": [(160, 655), (100, 655), (100, 1485), (420, 1485)]},
        {"id": "e_eligible_yes", "source": "node_eligible", "target": "node_outcome", "value": "YES", "label_pos": (508, 720)},

        # Outcome choices
        {"id": "e_outcome_approve", "source": "node_outcome", "target": "node_approved", "value": "Approve", "label_pos": (508, 850)},
        {"id": "e_outcome_reject", "source": "node_outcome", "target": "node_reason", "value": "Reject",
         "points": [(335, 785)], "svg_points": [(420, 785), (335, 785)], "label_pos": (360, 777)},

        # Reason check
        {"id": "e_reason_no", "source": "node_reason", "target": "node_reason_missing", "value": "NO",
         "points": [(255, 870)], "svg_points": [(255, 830), (255, 870)], "label_pos": (262, 850)},
        {"id": "e_missing_reason", "source": "node_reason_missing", "target": "node_reason",
         "points": [(130, 897.5), (130, 785)], "svg_points": [(160, 897.5), (130, 897.5), (130, 785), (175, 785)]},
        {"id": "e_reason_yes", "source": "node_reason", "target": "node_rejected", "value": "YES",
         "points": [(255, 1100)], "svg_points": [(255, 830), (255, 1100)], "label_pos": (262, 980)},

        # DB Auditing (Dashed)
        {"id": "e_approved_db", "source": "node_approved", "target": "node_db", "value": "Persist Audit", "dashed": True,
         "points": [(780, 900)], "svg_points": [(630, 900), (780, 900)], "label_pos": (705, 890)},

        # Available check
        {"id": "e_approved_available", "source": "node_approved", "target": "node_available"},
        {"id": "e_available_yes", "source": "node_available", "target": "node_public", "value": "YES",
         "points": [(740, 1015)], "svg_points": [(580, 1015), (740, 1015)], "label_pos": (650, 1007)},
        {"id": "e_available_no", "source": "node_available", "target": "node_hidden", "value": "NO", "label_pos": (508, 1078)},

        # Convergence to notify
        {"id": "e_public_notify", "source": "node_public", "target": "node_notify",
         "points": [(840, 1247.5)], "svg_points": [(840, 1042.5), (840, 1247.5), (620, 1247.5)]},
        {"id": "e_hidden_notify", "source": "node_hidden", "target": "node_notify"},
        {"id": "e_rejected_notify", "source": "node_rejected", "target": "node_notify",
         "points": [(255, 1247.5)], "svg_points": [(255, 1160), (255, 1247.5), (380, 1247.5)]},

        # Delivery check
        {"id": "e_notify_delivered", "source": "node_notify", "target": "node_delivered"},
        {"id": "e_delivered_no", "source": "node_delivered", "target": "node_retry", "value": "NO",
         "points": [(350, 1360)], "svg_points": [(420, 1360), (350, 1360)], "label_pos": (375, 1352)},
        {"id": "e_retry_notify", "source": "node_retry", "target": "node_notify",
         "points": [(255, 1247.5)], "svg_points": [(255, 1332.5), (255, 1247.5), (380, 1247.5)]},
        {"id": "e_delivered_yes", "source": "node_delivered", "target": "node_end", "value": "YES", "label_pos": (508, 1435)}
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

def build_admin_kyc_review():
    name = "admin-kyc-review"
    diag_id = "scrum-126-admin-kyc-review"
    title = "SCRUM-126: ADMIN KYC VERIFICATION REVIEW"
    pw, ph = 1050, 1600

    nodes = [
        {"id": "node_start", "type": "start", "value": "START", "x": 420, "y": 80, "w": 160, "h": 50},
        {"id": "node_auth", "type": "decision", "value": "Authenticated Active\nAdmin?", "x": 420, "y": 165, "w": 160, "h": 90},
        {"id": "node_deny", "type": "process", "value": "Deny Access\nNo KYC Data Disclosed", "x": 160, "y": 182.5, "w": 190, "h": 55, "bold": True},

        {"id": "node_queue", "type": "process", "value": "Retrieve Eligible Pending\nKYC Submissions", "x": 390, "y": 295, "w": 220, "h": 55},
        {"id": "node_current", "type": "decision", "value": "Pending Record\nExists?", "x": 420, "y": 385, "w": 160, "h": 90},
        {"id": "node_stale", "type": "process", "value": "Stale / Reviewed Record\nReload Queue", "x": 160, "y": 402.5, "w": 190, "h": 55},

        {"id": "node_inspect", "type": "process", "value": "Inspect Identity / Government ID &\nDocument Evidence (Private Storage)", "x": 365, "y": 515, "w": 270, "h": 60},
        {"id": "node_sufficient", "type": "decision", "value": "Evidence\nSufficient?", "x": 420, "y": 610, "w": 160, "h": 90},
        {"id": "node_insufficient", "type": "process", "value": "Insufficient Evidence\nRequest Correction via Owner Flow", "x": 160, "y": 627.5, "w": 200, "h": 55},

        {"id": "node_outcome", "type": "decision", "value": "Verification\nOutcome?", "x": 420, "y": 740, "w": 160, "h": 90},

        # Verified Branch
        {"id": "node_verified", "type": "process", "value": "Persist Verified Status +\nReviewer ID, Timestamp & Audit Log", "x": 370, "y": 870, "w": 260, "h": 60, "bold": True},

        # Rejected Branch
        {"id": "node_reason", "type": "decision", "value": "Actionable Reason\nPresent?", "x": 175, "y": 740, "w": 160, "h": 90},
        {"id": "node_reason_missing", "type": "process", "value": "Prompt Required Reason\n(No State Mutation)", "x": 160, "y": 870, "w": 190, "h": 55},
        {"id": "node_rejected", "type": "process", "value": "Persist Rejected Status +\nReason & Admin Audit Log", "x": 160, "y": 990, "w": 190, "h": 60, "bold": True},

        # Database Store (Right)
        {"id": "node_db", "type": "db", "value": "Landlord KYC\n& Audit DB", "x": 780, "y": 855, "w": 130, "h": 90},

        # Notify
        {"id": "node_notify", "type": "process", "value": "Notify Landlord of Outcome\nvia Configured Channel", "x": 380, "y": 1090, "w": 240, "h": 55},
        {"id": "node_delivered", "type": "decision", "value": "Notification\nDelivered?", "x": 420, "y": 1185, "w": 160, "h": 90},
        {"id": "node_retry", "type": "process", "value": "Delivery Failed\nRetry Notification Dispatch", "x": 160, "y": 1202.5, "w": 190, "h": 55},

        # End
        {"id": "node_end", "type": "end", "value": "END", "x": 420, "y": 1335, "w": 160, "h": 50}
    ]

    edges = [
        {"id": "e_start_auth", "source": "node_start", "target": "node_auth"},
        {"id": "e_auth_no", "source": "node_auth", "target": "node_deny", "value": "NO",
         "points": [(350, 210)], "svg_points": [(420, 210), (350, 210)], "label_pos": (375, 202)},
        {"id": "e_deny_end", "source": "node_deny", "target": "node_end",
         "points": [(100, 210), (100, 1360)], "svg_points": [(160, 210), (100, 210), (100, 1360), (420, 1360)]},

        {"id": "e_auth_yes", "source": "node_auth", "target": "node_queue", "value": "YES", "label_pos": (508, 275)},
        {"id": "e_queue_current", "source": "node_queue", "target": "node_current"},
        {"id": "e_current_no", "source": "node_current", "target": "node_stale", "value": "NO",
         "points": [(350, 430)], "svg_points": [(420, 430), (350, 430)], "label_pos": (375, 422)},
        {"id": "e_stale_queue", "source": "node_stale", "target": "node_queue",
         "points": [(255, 322.5)], "svg_points": [(255, 402.5), (255, 322.5), (390, 322.5)]},
        {"id": "e_current_yes", "source": "node_current", "target": "node_inspect", "value": "YES", "label_pos": (508, 495)},

        {"id": "e_inspect_sufficient", "source": "node_inspect", "target": "node_sufficient"},
        {"id": "e_sufficient_no", "source": "node_sufficient", "target": "node_insufficient", "value": "NO",
         "points": [(360, 655)], "svg_points": [(420, 655), (360, 655)], "label_pos": (380, 647)},
        {"id": "e_insufficient_end", "source": "node_insufficient", "target": "node_end",
         "points": [(100, 655), (100, 1360)], "svg_points": [(160, 655), (100, 655), (100, 1360), (420, 1360)]},
        {"id": "e_sufficient_yes", "source": "node_sufficient", "target": "node_outcome", "value": "YES", "label_pos": (508, 720)},

        # Outcome
        {"id": "e_outcome_verified", "source": "node_outcome", "target": "node_verified", "value": "Verified", "label_pos": (508, 850)},
        {"id": "e_outcome_rejected", "source": "node_outcome", "target": "node_reason", "value": "Rejected",
         "points": [(335, 785)], "svg_points": [(420, 785), (335, 785)], "label_pos": (360, 777)},

        # Reason
        {"id": "e_reason_no", "source": "node_reason", "target": "node_reason_missing", "value": "NO",
         "points": [(255, 870)], "svg_points": [(255, 830), (255, 870)], "label_pos": (262, 850)},
        {"id": "e_missing_reason", "source": "node_reason_missing", "target": "node_reason",
         "points": [(130, 897.5), (130, 785)], "svg_points": [(160, 897.5), (130, 897.5), (130, 785), (175, 785)]},
        {"id": "e_reason_yes", "source": "node_reason", "target": "node_rejected", "value": "YES",
         "points": [(255, 990)], "svg_points": [(255, 830), (255, 990)], "label_pos": (262, 940)},

        # DB Audit (Dashed)
        {"id": "e_verified_db", "source": "node_verified", "target": "node_db", "value": "Persist Audit", "dashed": True,
         "points": [(780, 900)], "svg_points": [(630, 900), (780, 900)], "label_pos": (705, 890)},

        # Convergence
        {"id": "e_verified_notify", "source": "node_verified", "target": "node_notify"},
        {"id": "e_rejected_notify", "source": "node_rejected", "target": "node_notify",
         "points": [(255, 1117.5)], "svg_points": [(255, 1050), (255, 1117.5), (380, 1117.5)]},

        # Delivery
        {"id": "e_notify_delivered", "source": "node_notify", "target": "node_delivered"},
        {"id": "e_delivered_no", "source": "node_delivered", "target": "node_retry", "value": "NO",
         "points": [(350, 1230)], "svg_points": [(420, 1230), (350, 1230)], "label_pos": (375, 1222)},
        {"id": "e_retry_notify", "source": "node_retry", "target": "node_notify",
         "points": [(255, 1117.5)], "svg_points": [(255, 1202.5), (255, 1117.5), (380, 1117.5)]},
        {"id": "e_delivered_yes", "source": "node_delivered", "target": "node_end", "value": "YES", "label_pos": (508, 1300)}
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
    build_admin_listing_moderation()
    build_admin_kyc_review()

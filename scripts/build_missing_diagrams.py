#!/usr/bin/env python3
"""Generator for the 4 master and subprocess flowcharts for Sprint 2:
1. landlord-onboarding-kyc (SCRUM-125, Sub-Process 3.1)
2. landlord-master-orchestration (SCRUM-125, Master Orchestration 3.0)
3. admin-master-orchestration (SCRUM-126, Master Orchestration 4.0)
4. renter-master-orchestration (SCRUM-127, Master Orchestration 5.0)

Conforms 100% to ANSI X3.5-1970 / ISO 5807:1985 and the auth-registration-pkce (1).drawio reference standard.
Includes ANSI I/O parallelograms for UI/screens/inputs, on-page connectors for loopbacks,
and off-page connectors for cross-module handoffs.
"""

import os
from generate_standard_flowcharts import (
    ROOT, FLOW_DIR, ASSET_DIR, PDF_DIR,
    build_drawio_xml, build_svg_xml, export_png, export_pdf
)

def build_landlord_onboarding_kyc():
    name = "landlord-onboarding-kyc"
    diag_id = "diag_landlord_onboarding_kyc"
    title = "SCRUM-125: LANDLORD ONBOARDING & KYC VERIFICATION FLOW"
    pw = 1050
    ph = 1450

    nodes = [
        # START
        {"id": "node_start", "type": "start", "value": "START: Authenticated\nLandlord Profile Setup", "x": 420, "y": 80, "w": 160, "h": 50},

        # Auth Role Check
        {"id": "node_auth_check", "type": "decision", "value": "User Session Role\nIs Landlord?", "x": 410, "y": 170, "w": 180, "h": 80},
        {"id": "node_role_redirect", "type": "io", "value": "Redirect to Role Selection\nUpgrade / Switch to Landlord", "x": 180, "y": 182.5, "w": 180, "h": 55},

        # Fetch KYC Record
        {"id": "node_fetch_kyc", "type": "process", "value": "Retrieve Existing KYC Profile &\nVerification Status from DB", "x": 370, "y": 290, "w": 260, "h": 55},
        {"id": "node_db_kyc", "type": "db", "value": "Database (Supabase)\nlandlord_kyc / profiles", "x": 780, "y": 282.5, "w": 180, "h": 70},

        # Already Approved Check
        {"id": "node_status_check", "type": "decision", "value": "KYC Record Status\nAlready Approved?", "x": 410, "y": 385, "w": 180, "h": 80},
        {"id": "node_approved_notice", "type": "io", "value": "Display 'Verified Landlord'\nDirect to Listing Creation", "x": 680, "y": 397.5, "w": 200, "h": 55},

        # Input KYC Form
        {"id": "node_kyc_form", "type": "io", "value": "Landlord Inputs Business / Individual Info\n& Uploads Government ID & Property Proof", "x": 350, "y": 505, "w": 300, "h": 65},

        # Client Validation
        {"id": "node_validate_client", "type": "decision", "value": "Payload Complete &\nFormats Valid (MIME/Size)?", "x": 400, "y": 610, "w": 200, "h": 90},
        {"id": "node_client_err", "type": "io", "value": "Display Validation Errors\nHighlight Missing Fields", "x": 180, "y": 627.5, "w": 180, "h": 55},

        # Upload to Storage
        {"id": "node_upload_storage", "type": "process", "value": "Encrypt & Upload Identity Docs to\nPrivate Secure Bucket (storage.objects)", "x": 360, "y": 740, "w": 280, "h": 55},
        {"id": "node_storage_db", "type": "db", "value": "Private Storage Bucket\nkyc-documents (RLS)", "x": 780, "y": 732.5, "w": 180, "h": 70},

        # Insert Pending KYC
        {"id": "node_insert_submission", "type": "process", "value": "Insert Pending KYC Record\n(status = 'pending_review')", "x": 360, "y": 835, "w": 280, "h": 55},
        {"id": "node_db_insert", "type": "db", "value": "Database (Supabase)\nlandlord_kyc", "x": 780, "y": 827.5, "w": 180, "h": 70},

        # Persistence Check
        {"id": "node_persist_check", "type": "decision", "value": "Database Insertion\nSuccessful?", "x": 420, "y": 930, "w": 160, "h": 80},
        {"id": "node_persist_fail", "type": "io", "value": "Show 500 Submission Error\nPrompt Landlord to Retry", "x": 180, "y": 942.5, "w": 180, "h": 55},

        # Admin Queue Handoff
        {"id": "node_trigger_admin_queue", "type": "offpage", "value": "Sub-Process 4.1 Handoff:\nEnqueue Admin KYC Review (SCRUM-126)", "x": 360, "y": 1050, "w": 280, "h": 60},

        # Confirmation & Draft Rights
        {"id": "node_notify_landlord", "type": "io", "value": "Send Confirmation Notice:\n'KYC Under Review (1-2 Business Days)'", "x": 370, "y": 1150, "w": 260, "h": 55},
        {"id": "node_allow_drafts", "type": "process", "value": "Grant Draft Listing Permissions\n(Lock Public Publishing Until Verified)", "x": 360, "y": 1245, "w": 280, "h": 55, "bold": True},

        # END
        {"id": "node_end", "type": "end", "value": "END: Landlord Ready\nfor Draft Creation", "x": 420, "y": 1340, "w": 160, "h": 50}
    ]

    edges = [
        # Start -> Auth Check
        {"id": "e_start_auth", "source": "node_start", "target": "node_auth_check", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # Auth Check Branches
        {"id": "e_auth_no", "source": "node_auth_check", "target": "node_role_redirect", "value": "NO",
         "points": [(360, 210)], "svg_points": [(410, 210), (360, 210)], "label_pos": (375, 202), "exitX": 0.0, "exitY": 0.5, "entryX": 1.0, "entryY": 0.5},
        {"id": "e_role_end", "source": "node_role_redirect", "target": "node_end",
         "points": [(100, 210), (100, 1365)], "svg_points": [(180, 210), (100, 210), (100, 1365), (420, 1365)], "exitX": 0.0, "exitY": 0.5, "entryX": 0.0, "entryY": 0.5},
        {"id": "e_auth_yes", "source": "node_auth_check", "target": "node_fetch_kyc", "value": "YES", "label_pos": (508, 265), "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # DB Fetch
        {"id": "e_fetch_db", "source": "node_fetch_kyc", "target": "node_db_kyc", "value": "SELECT status", "dashed": True, "bidirectional": True,
         "points": [(780, 317.5)], "svg_points": [(630, 317.5), (780, 317.5)], "label_pos": (675, 307), "exitX": 1.0, "exitY": 0.5, "entryX": 0.0, "entryY": 0.5},
        {"id": "e_fetch_status", "source": "node_fetch_kyc", "target": "node_status_check", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # Status Check Branches
        {"id": "e_status_yes", "source": "node_status_check", "target": "node_approved_notice", "value": "YES",
         "points": [(680, 425)], "svg_points": [(590, 425), (680, 425)], "label_pos": (610, 417), "exitX": 1.0, "exitY": 0.5, "entryX": 0.0, "entryY": 0.5},
        {"id": "e_approved_end", "source": "node_approved_notice", "target": "node_end",
         "points": [(950, 425), (950, 1365)], "svg_points": [(880, 425), (950, 425), (950, 1365), (580, 1365)], "exitX": 1.0, "exitY": 0.5, "entryX": 1.0, "entryY": 0.5},
        {"id": "e_status_no", "source": "node_status_check", "target": "node_kyc_form", "value": "NO", "label_pos": (508, 480), "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # Form -> Validate
        {"id": "e_form_validate", "source": "node_kyc_form", "target": "node_validate_client", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # Validate Branches
        {"id": "e_validate_no", "source": "node_validate_client", "target": "node_client_err", "value": "NO",
         "points": [(360, 655)], "svg_points": [(400, 655), (360, 655)], "label_pos": (375, 647), "exitX": 0.0, "exitY": 0.5, "entryX": 1.0, "entryY": 0.5},
        {"id": "e_err_loop", "source": "node_client_err", "target": "node_kyc_form",
         "points": [(150, 655), (150, 537.5)], "svg_points": [(180, 655), (150, 655), (150, 537.5), (350, 537.5)], "exitX": 0.0, "exitY": 0.5, "entryX": 0.0, "entryY": 0.5},
        {"id": "e_validate_yes", "source": "node_validate_client", "target": "node_upload_storage", "value": "YES", "label_pos": (508, 715), "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # Storage Write
        {"id": "e_upload_db", "source": "node_upload_storage", "target": "node_storage_db", "value": "Upload Encrypted", "dashed": True,
         "points": [(780, 767.5)], "svg_points": [(640, 767.5), (780, 767.5)], "label_pos": (670, 757), "exitX": 1.0, "exitY": 0.5, "entryX": 0.0, "entryY": 0.5},
        {"id": "e_upload_insert", "source": "node_upload_storage", "target": "node_insert_submission", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # DB Insert
        {"id": "e_insert_db", "source": "node_insert_submission", "target": "node_db_insert", "value": "INSERT pending", "dashed": True,
         "points": [(780, 862.5)], "svg_points": [(640, 862.5), (780, 862.5)], "label_pos": (675, 852), "exitX": 1.0, "exitY": 0.5, "entryX": 0.0, "entryY": 0.5},
        {"id": "e_insert_check", "source": "node_insert_submission", "target": "node_persist_check", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # Persist Check Branches
        {"id": "e_persist_no", "source": "node_persist_check", "target": "node_persist_fail", "value": "NO",
         "points": [(360, 970)], "svg_points": [(420, 970), (360, 970)], "label_pos": (375, 962), "exitX": 0.0, "exitY": 0.5, "entryX": 1.0, "entryY": 0.5},
        {"id": "e_fail_end", "source": "node_persist_fail", "target": "node_end",
         "points": [(100, 970), (100, 1365)], "svg_points": [(180, 970), (100, 970), (100, 1365), (420, 1365)], "exitX": 0.0, "exitY": 0.5, "entryX": 0.0, "entryY": 0.5},
        {"id": "e_persist_yes", "source": "node_persist_check", "target": "node_trigger_admin_queue", "value": "YES", "label_pos": (508, 1025), "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # Queue -> Notify -> Drafts -> End
        {"id": "e_queue_notify", "source": "node_trigger_admin_queue", "target": "node_notify_landlord", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},
        {"id": "e_notify_allow", "source": "node_notify_landlord", "target": "node_allow_drafts", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},
        {"id": "e_allow_end", "source": "node_allow_drafts", "target": "node_end", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0}
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


def build_landlord_master_orchestration():
    name = "landlord-master-orchestration"
    diag_id = "diag_landlord_master_orchestration"
    title = "SCRUM-125: MODULE 3 — LANDLORD MASTER ORCHESTRATION"
    pw = 1050
    ph = 1450

    nodes = [
        # START
        {"id": "node_start", "type": "start", "value": "START: Landlord Module Entry", "x": 420, "y": 80, "w": 160, "h": 50},

        # Auth Guard
        {"id": "node_auth_guard", "type": "decision", "value": "Landlord Authenticated\n& Session Valid?", "x": 410, "y": 170, "w": 180, "h": 80},
        {"id": "node_redirect_auth", "type": "offpage", "value": "Handoff to Auth Module\n(SCRUM-104 - 108)", "x": 180, "y": 182.5, "w": 180, "h": 55},

        # KYC Verified Check
        {"id": "node_kyc_eval", "type": "decision", "value": "Landlord KYC Status\nVerified / Approved?", "x": 410, "y": 290, "w": 180, "h": 80},
        {"id": "node_sub_kyc", "type": "offpage", "value": "Sub-Process 3.1:\nLandlord Onboarding & KYC", "x": 180, "y": 302.5, "w": 180, "h": 55},

        # Landlord Dashboard
        {"id": "node_dashboard", "type": "io", "value": "Landlord Dashboard Interface:\nView Properties, Listings, Status & Analytics", "x": 360, "y": 410, "w": 280, "h": 60},

        # Action Dispatch (Binary 1)
        {"id": "node_dispatch_draft", "type": "decision", "value": "Is Create / Edit\nListing Draft?", "x": 410, "y": 515, "w": 180, "h": 80},
        {"id": "node_sub_draft_submit", "type": "offpage", "value": "Sub-Process 3.2:\nListing Draft & Submission", "x": 180, "y": 527.5, "w": 190, "h": 55},

        # Action Dispatch (Binary 2)
        {"id": "node_dispatch_manage", "type": "decision", "value": "Is Manage Existing\nListing Outpost?", "x": 410, "y": 635, "w": 180, "h": 80},
        {"id": "node_sub_outcomes", "type": "offpage", "value": "Sub-Process 3.3:\nReview Outcomes & Maintenance", "x": 680, "y": 647.5, "w": 200, "h": 55},

        # Admin Moderation Handoff
        {"id": "node_admin_handoff", "type": "offpage", "value": "Handoff to Module 4:\nAdmin Listing Moderation (SCRUM-126)", "x": 360, "y": 760, "w": 280, "h": 60},

        # Moderation Result Check
        {"id": "node_moderation_eval", "type": "decision", "value": "Moderation Outcome\nApproved / Published?", "x": 410, "y": 860, "w": 180, "h": 80},
        {"id": "node_rejected_notice", "type": "io", "value": "Listing Paused / Rejected\nLandlord Notified with Feedback", "x": 180, "y": 872.5, "w": 180, "h": 55},

        # Spatial Publishing
        {"id": "node_publish_spatial", "type": "process", "value": "Listing Status -> 'active'\nCommit Spatial Geometries & Attributes", "x": 360, "y": 980, "w": 280, "h": 55},
        {"id": "node_db_listings", "type": "db", "value": "Database (Supabase)\nlistings & properties (RLS)", "x": 780, "y": 972.5, "w": 180, "h": 70},

        # Map Index Handoff
        {"id": "node_map_handoff", "type": "offpage", "value": "Sub-Process 2.2 / 2.3 Integration:\nIndexed Spatial Map Query (SCRUM-118)", "x": 350, "y": 1080, "w": 300, "h": 60, "bold": True},

        # Renter Engagement Handoff
        {"id": "node_renter_discover", "type": "offpage", "value": "Handoff to Module 5:\nRenter Discovery & Viewing (SCRUM-127)", "x": 350, "y": 1180, "w": 300, "h": 60},

        # END
        {"id": "node_end", "type": "end", "value": "END: Landlord Lifecycle\nCycle Complete", "x": 420, "y": 1285, "w": 160, "h": 50}
    ]

    edges = [
        # Start -> Auth Guard
        {"id": "e_start_auth", "source": "node_start", "target": "node_auth_guard", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # Auth Guard Branches
        {"id": "e_auth_no", "source": "node_auth_guard", "target": "node_redirect_auth", "value": "NO",
         "points": [(360, 210)], "svg_points": [(410, 210), (360, 210)], "label_pos": (375, 202), "exitX": 0.0, "exitY": 0.5, "entryX": 1.0, "entryY": 0.5},
        {"id": "e_auth_redir_end", "source": "node_redirect_auth", "target": "node_end",
         "points": [(100, 210), (100, 1310)], "svg_points": [(180, 210), (100, 210), (100, 1310), (420, 1310)], "exitX": 0.0, "exitY": 0.5, "entryX": 0.0, "entryY": 0.5},
        {"id": "e_auth_yes", "source": "node_auth_guard", "target": "node_kyc_eval", "value": "YES", "label_pos": (508, 265), "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # KYC Eval Branches
        {"id": "e_kyc_no", "source": "node_kyc_eval", "target": "node_sub_kyc", "value": "NO",
         "points": [(360, 330)], "svg_points": [(410, 330), (360, 330)], "label_pos": (375, 322), "exitX": 0.0, "exitY": 0.5, "entryX": 1.0, "entryY": 0.5},
        {"id": "e_kyc_dash", "source": "node_sub_kyc", "target": "node_dashboard",
         "points": [(270, 440)], "svg_points": [(270, 357.5), (270, 440), (360, 440)], "exitX": 0.5, "exitY": 1.0, "entryX": 0.0, "entryY": 0.5},
        {"id": "e_kyc_yes", "source": "node_kyc_eval", "target": "node_dashboard", "value": "YES", "label_pos": (508, 385), "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # Dashboard -> Dispatch Draft
        {"id": "e_dash_dispatch", "source": "node_dashboard", "target": "node_dispatch_draft", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # Dispatch Draft Branches
        {"id": "e_draft_yes", "source": "node_dispatch_draft", "target": "node_sub_draft_submit", "value": "YES",
         "points": [(370, 555)], "svg_points": [(410, 555), (370, 555)], "label_pos": (375, 547), "exitX": 0.0, "exitY": 0.5, "entryX": 1.0, "entryY": 0.5},
        {"id": "e_draft_admin", "source": "node_sub_draft_submit", "target": "node_admin_handoff",
         "points": [(275, 790)], "svg_points": [(275, 582.5), (275, 790), (360, 790)], "exitX": 0.5, "exitY": 1.0, "entryX": 0.0, "entryY": 0.5},
        {"id": "e_draft_no", "source": "node_dispatch_draft", "target": "node_dispatch_manage", "value": "NO", "label_pos": (508, 610), "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # Dispatch Manage Branches
        {"id": "e_manage_yes", "source": "node_dispatch_manage", "target": "node_sub_outcomes", "value": "YES",
         "points": [(680, 675)], "svg_points": [(590, 675), (680, 675)], "label_pos": (610, 667), "exitX": 1.0, "exitY": 0.5, "entryX": 0.0, "entryY": 0.5},
        {"id": "e_outcomes_end", "source": "node_sub_outcomes", "target": "node_end",
         "points": [(950, 675), (950, 1310)], "svg_points": [(880, 675), (950, 675), (950, 1310), (580, 1310)], "exitX": 1.0, "exitY": 0.5, "entryX": 1.0, "entryY": 0.5},
        {"id": "e_manage_no", "source": "node_dispatch_manage", "target": "node_admin_handoff", "value": "NO", "label_pos": (508, 730), "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # Admin Handoff -> Moderation Eval
        {"id": "e_admin_mod_eval", "source": "node_admin_handoff", "target": "node_moderation_eval", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # Moderation Eval Branches
        {"id": "e_mod_no", "source": "node_moderation_eval", "target": "node_rejected_notice", "value": "NO",
         "points": [(360, 900)], "svg_points": [(410, 900), (360, 900)], "label_pos": (375, 892), "exitX": 0.0, "exitY": 0.5, "entryX": 1.0, "entryY": 0.5},
        {"id": "e_rej_end", "source": "node_rejected_notice", "target": "node_end",
         "points": [(100, 900), (100, 1310)], "svg_points": [(180, 900), (100, 900), (100, 1310), (420, 1310)], "exitX": 0.0, "exitY": 0.5, "entryX": 0.0, "entryY": 0.5},
        {"id": "e_mod_yes", "source": "node_moderation_eval", "target": "node_publish_spatial", "value": "YES", "label_pos": (508, 955), "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # Spatial Publishing
        {"id": "e_pub_db", "source": "node_publish_spatial", "target": "node_db_listings", "value": "UPDATE active", "dashed": True,
         "points": [(780, 1007.5)], "svg_points": [(640, 1007.5), (780, 1007.5)], "label_pos": (675, 997), "exitX": 1.0, "exitY": 0.5, "entryX": 0.0, "entryY": 0.5},
        {"id": "e_pub_map", "source": "node_publish_spatial", "target": "node_map_handoff", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # Map Handoff -> Renter Discover -> End
        {"id": "e_map_renter", "source": "node_map_handoff", "target": "node_renter_discover", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},
        {"id": "e_renter_end", "source": "node_renter_discover", "target": "node_end", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0}
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


def build_admin_master_orchestration():
    name = "admin-master-orchestration"
    diag_id = "diag_admin_master_orchestration"
    title = "SCRUM-126: MODULE 4 — ADMIN MASTER ORCHESTRATION"
    pw = 1050
    ph = 1450

    nodes = [
        # START
        {"id": "node_start", "type": "start", "value": "START: Admin Session Initialized", "x": 420, "y": 80, "w": 160, "h": 50},

        # Role Gate
        {"id": "node_role_gate", "type": "decision", "value": "User Has Admin / SuperAdmin\nRole & Valid JWT Claims?", "x": 400, "y": 170, "w": 200, "h": 80},
        {"id": "node_access_denied", "type": "io", "value": "403 Forbidden / Access Denied\nLog Security Event & Terminate", "x": 180, "y": 182.5, "w": 180, "h": 55},

        # On-Page Connector A (Entry from Queue Loop)
        {"id": "node_conn_a_entry", "type": "connector", "value": "A", "sublabel": "Queue Loop", "x": 260, "y": 295, "w": 50, "h": 50},

        # Operations Portal
        {"id": "node_dashboard_queue", "type": "io", "value": "Admin Operations Portal:\nLoad Moderation Queues & Metric Summaries", "x": 360, "y": 290, "w": 280, "h": 60},
        {"id": "node_db_queues", "type": "db", "value": "Database (Supabase)\nkyc_queue / listing_queue", "x": 780, "y": 285, "w": 180, "h": 70},

        # Queue Selection
        {"id": "node_queue_selector", "type": "decision", "value": "Queue Selection:\nModerate Listings or KYC?", "x": 410, "y": 390, "w": 180, "h": 80},
        {"id": "node_sub_kyc_review", "type": "offpage", "value": "Sub-Process 4.1:\nAdmin KYC Verification Review", "x": 180, "y": 500, "w": 200, "h": 60},
        {"id": "node_sub_listing_mod", "type": "offpage", "value": "Sub-Process 4.2:\nAdmin Listing Moderation Flow", "x": 670, "y": 500, "w": 200, "h": 60},

        # Violation Evaluation
        {"id": "node_violation_eval", "type": "decision", "value": "Severe Violation Detected?\n(Fraud / Illegal / Repeated)", "x": 410, "y": 605, "w": 180, "h": 80},
        {"id": "node_suspension_protocol", "type": "process", "value": "Initiate Suspension Protocol:\nFreeze Entity & Account", "x": 180, "y": 617.5, "w": 180, "h": 55},
        {"id": "node_standard_decision", "type": "process", "value": "Record Standard Approve / Reject\nOutcome with Justification", "x": 400, "y": 725, "w": 200, "h": 55},

        # Audit Logging
        {"id": "node_commit_audit", "type": "process", "value": "Commit Decision to Immutable Audit Log\n(admin_decision_audit)", "x": 360, "y": 820, "w": 280, "h": 55},
        {"id": "node_audit_db", "type": "db", "value": "Audit Database (Append-Only)\nadmin_audit_logs (RLS)", "x": 780, "y": 812.5, "w": 180, "h": 70},

        # Event Dispatch
        {"id": "node_dispatch_events", "type": "process", "value": "Dispatch Real-Time Events & Notifications\n(Webhooks, In-App Alerts, Email)", "x": 360, "y": 915, "w": 280, "h": 55},

        # External Sync Decision
        {"id": "node_sync_type", "type": "decision", "value": "Target Entity Type:\nListing or User/KYC?", "x": 410, "y": 1010, "w": 180, "h": 80},
        {"id": "node_kyc_role_sync", "type": "offpage", "value": "Update Landlord Role State\nUnlock Submission (SCRUM-125)", "x": 180, "y": 1120, "w": 200, "h": 60},
        {"id": "node_map_cache_sync", "type": "offpage", "value": "Update Spatial Map Index\nInvalidate Cache (SCRUM-118)", "x": 670, "y": 1120, "w": 200, "h": 60},

        # Portal Session End Check
        {"id": "node_session_check", "type": "decision", "value": "Continue Reviewing Queue\nor Exit Portal?", "x": 410, "y": 1225, "w": 180, "h": 80},

        # On-Page Connector A (Return to Queue)
        {"id": "node_conn_a_return", "type": "connector", "value": "A", "sublabel": "Return to Queue", "x": 680, "y": 1240, "w": 50, "h": 50},

        # END
        {"id": "node_end", "type": "end", "value": "END: Admin Operations\nSession Terminated", "x": 420, "y": 1345, "w": 160, "h": 50}
    ]

    edges = [
        # Start -> Role Gate
        {"id": "e_start_role", "source": "node_start", "target": "node_role_gate", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # Role Gate Branches
        {"id": "e_role_no", "source": "node_role_gate", "target": "node_access_denied", "value": "NO",
         "points": [(360, 210)], "svg_points": [(400, 210), (360, 210)], "label_pos": (375, 202), "exitX": 0.0, "exitY": 0.5, "entryX": 1.0, "entryY": 0.5},
        {"id": "e_denied_end", "source": "node_access_denied", "target": "node_end",
         "points": [(100, 210), (100, 1370)], "svg_points": [(180, 210), (100, 210), (100, 1370), (420, 1370)], "exitX": 0.0, "exitY": 0.5, "entryX": 0.0, "entryY": 0.5},
        {"id": "e_role_yes", "source": "node_role_gate", "target": "node_dashboard_queue", "value": "YES", "label_pos": (508, 265), "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # On-Page Connector A entry -> Dashboard Queue
        {"id": "e_conn_a_queue", "source": "node_conn_a_entry", "target": "node_dashboard_queue", "exitX": 1.0, "exitY": 0.5, "entryX": 0.0, "entryY": 0.5},

        # DB Queues Fetch
        {"id": "e_dash_db", "source": "node_dashboard_queue", "target": "node_db_queues", "value": "SELECT pending", "dashed": True, "bidirectional": True,
         "points": [(780, 320)], "svg_points": [(640, 320), (780, 320)], "label_pos": (675, 310), "exitX": 1.0, "exitY": 0.5, "entryX": 0.0, "entryY": 0.5},
        {"id": "e_dash_select", "source": "node_dashboard_queue", "target": "node_queue_selector", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # Queue Selector Branches
        {"id": "e_queue_kyc", "source": "node_queue_selector", "target": "node_sub_kyc_review", "value": "KYC Review",
         "points": [(280, 430)], "svg_points": [(410, 430), (280, 430), (280, 500)], "label_pos": (315, 422), "exitX": 0.0, "exitY": 0.5, "entryX": 0.5, "entryY": 0.0},
        {"id": "e_queue_list", "source": "node_queue_selector", "target": "node_sub_listing_mod", "value": "Listing Review",
         "points": [(770, 430)], "svg_points": [(590, 430), (770, 430), (770, 500)], "label_pos": (645, 422), "exitX": 1.0, "exitY": 0.5, "entryX": 0.5, "entryY": 0.0},

        # Convergence into Violation Eval
        {"id": "e_kyc_violation", "source": "node_sub_kyc_review", "target": "node_violation_eval",
         "points": [(280, 645)], "svg_points": [(280, 560), (280, 645), (410, 645)], "exitX": 0.5, "exitY": 1.0, "entryX": 0.0, "entryY": 0.5},
        {"id": "e_list_violation", "source": "node_sub_listing_mod", "target": "node_violation_eval",
         "points": [(770, 645)], "svg_points": [(770, 560), (770, 645), (590, 645)], "exitX": 0.5, "exitY": 1.0, "entryX": 1.0, "entryY": 0.5},

        # Violation Eval Branches
        {"id": "e_violation_yes", "source": "node_violation_eval", "target": "node_suspension_protocol", "value": "YES (Severe)",
         "points": [(360, 645)], "svg_points": [(410, 645), (360, 645)], "label_pos": (365, 637), "exitX": 0.0, "exitY": 0.5, "entryX": 1.0, "entryY": 0.5},
        {"id": "e_suspension_audit", "source": "node_suspension_protocol", "target": "node_commit_audit",
         "points": [(270, 847.5)], "svg_points": [(270, 672.5), (270, 847.5), (360, 847.5)], "exitX": 0.5, "exitY": 1.0, "entryX": 0.0, "entryY": 0.5},
        {"id": "e_violation_no", "source": "node_violation_eval", "target": "node_standard_decision", "value": "NO (Standard)", "label_pos": (508, 695), "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # Standard Decision -> Commit Audit
        {"id": "e_std_audit", "source": "node_standard_decision", "target": "node_commit_audit", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # Audit Storage Write
        {"id": "e_audit_db_write", "source": "node_commit_audit", "target": "node_audit_db", "value": "INSERT log", "dashed": True,
         "points": [(780, 847.5)], "svg_points": [(640, 847.5), (780, 847.5)], "label_pos": (675, 837), "exitX": 1.0, "exitY": 0.5, "entryX": 0.0, "entryY": 0.5},
        {"id": "e_audit_dispatch", "source": "node_commit_audit", "target": "node_dispatch_events", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # Event Dispatch -> Sync Type
        {"id": "e_dispatch_sync", "source": "node_dispatch_events", "target": "node_sync_type", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # Sync Type Branches
        {"id": "e_sync_kyc", "source": "node_sync_type", "target": "node_kyc_role_sync", "value": "User / KYC",
         "points": [(280, 1050)], "svg_points": [(410, 1050), (280, 1050), (280, 1120)], "label_pos": (315, 1042), "exitX": 0.0, "exitY": 0.5, "entryX": 0.5, "entryY": 0.0},
        {"id": "e_sync_list", "source": "node_sync_type", "target": "node_map_cache_sync", "value": "Listing",
         "points": [(770, 1050)], "svg_points": [(590, 1050), (770, 1050), (770, 1120)], "label_pos": (645, 1042), "exitX": 1.0, "exitY": 0.5, "entryX": 0.5, "entryY": 0.0},

        # Convergence into Session Check
        {"id": "e_kyc_session", "source": "node_kyc_role_sync", "target": "node_session_check",
         "points": [(280, 1265)], "svg_points": [(280, 1180), (280, 1265), (410, 1265)], "exitX": 0.5, "exitY": 1.0, "entryX": 0.0, "entryY": 0.5},
        {"id": "e_list_session", "source": "node_map_cache_sync", "target": "node_session_check",
         "points": [(770, 1265)], "svg_points": [(770, 1180), (770, 1265), (590, 1265)], "exitX": 0.5, "exitY": 1.0, "entryX": 1.0, "entryY": 0.5},

        # Session Check Branches: Loopback via On-Page Connector A (eliminates collision with node_db_queues)
        {"id": "e_session_loop", "source": "node_session_check", "target": "node_conn_a_return", "value": "Continue",
         "label_pos": (625, 1255), "exitX": 1.0, "exitY": 0.5, "entryX": 0.0, "entryY": 0.5},
        {"id": "e_session_exit", "source": "node_session_check", "target": "node_end", "value": "Exit", "label_pos": (508, 1315), "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0}
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


def build_renter_master_orchestration():
    name = "renter-master-orchestration"
    diag_id = "diag_renter_master_orchestration"
    title = "SCRUM-127: MODULE 5 — RENTER MASTER ORCHESTRATION"
    pw = 1050
    ph = 1450

    nodes = [
        # START
        {"id": "node_start", "type": "start", "value": "START: Renter Discovery Entry", "x": 420, "y": 80, "w": 160, "h": 50},

        # Map Discovery Integration
        {"id": "node_browse_map", "type": "io", "value": "Integrated Map Discovery Interface\n(From Module 2: SCRUM-116 - 121)", "x": 360, "y": 170, "w": 280, "h": 55},

        # Listing Inspection
        {"id": "node_listing_select", "type": "io", "value": "Renter Selects Listing Pin / Drawer Card\nInspects Pricing, Photos, & Verification", "x": 350, "y": 265, "w": 300, "h": 60},

        # Intent Choice (Binary 1: Favorite vs Inquire/Contact)
        {"id": "node_intent_fav", "type": "decision", "value": "Is Action 'Save Favorite'\nor Contact Landlord?", "x": 400, "y": 365, "w": 200, "h": 85},
        {"id": "node_sub_fav", "type": "offpage", "value": "Sub-Process 5.1:\nSave / Remove Favorite Listing", "x": 180, "y": 377.5, "w": 190, "h": 60},

        # Contact Channel (Binary 2: Reveal Phone vs Request Viewing)
        {"id": "node_intent_contact", "type": "decision", "value": "Contact Channel:\nReveal Phone or Inquiry?", "x": 410, "y": 485, "w": 180, "h": 85},
        {"id": "node_sub_reveal", "type": "offpage", "value": "Sub-Process 5.2:\nLandlord Contact Reveal Flow", "x": 180, "y": 497.5, "w": 190, "h": 60},
        {"id": "node_sub_inquiry", "type": "offpage", "value": "Sub-Process 5.3:\nRenter Inquiry & Viewing Request", "x": 680, "y": 497.5, "w": 200, "h": 60},

        # Auth Interception Gatekeeper
        {"id": "node_auth_check", "type": "decision", "value": "User Authenticated?\n(Guest Session Intercept)", "x": 410, "y": 605, "w": 180, "h": 80},
        {"id": "node_gatekeeper_handoff", "type": "offpage", "value": "Handoff to Sub-Process 2.5:\nMap Auth Gatekeeper (SCRUM-121)", "x": 180, "y": 615, "w": 190, "h": 60},

        # Mutation Execution
        {"id": "node_execute_action", "type": "process", "value": "Execute Engagement Mutation with\nValidated User ID & Session Token", "x": 360, "y": 725, "w": 280, "h": 55},
        {"id": "node_db_renter", "type": "db", "value": "Database (Supabase)\nfavorites / inquiries / reveals", "x": 780, "y": 717.5, "w": 180, "h": 70},

        # Mutation Check
        {"id": "node_mutation_success", "type": "decision", "value": "Database Operation\nSucceeded?", "x": 410, "y": 820, "w": 180, "h": 80},
        {"id": "node_error_toast", "type": "io", "value": "Display Error Toast / Retry Notice\nPreserve Intent / Draft State", "x": 180, "y": 832.5, "w": 180, "h": 55},

        # Notification & Telemetry
        {"id": "node_dispatch_telemetry", "type": "process", "value": "Emit Engagement Telemetry &\nTrigger In-App / Push Alerts", "x": 360, "y": 940, "w": 280, "h": 55},

        # Landlord Dashboard Handoff
        {"id": "node_notify_landlord_step", "type": "offpage", "value": "Sub-Process 3.3 Handoff:\nDeliver Inquiry to Landlord (SCRUM-125)", "x": 350, "y": 1040, "w": 300, "h": 60},

        # Confirmation UI
        {"id": "node_renter_confirmation", "type": "io", "value": "Update Renter UI: Show Confirmed Status\nAdd to Activity Timeline & Saved Items", "x": 360, "y": 1145, "w": 280, "h": 55, "bold": True},

        # END
        {"id": "node_end", "type": "end", "value": "END: Renter Action\nCompleted", "x": 420, "y": 1250, "w": 160, "h": 50}
    ]

    edges = [
        # Start -> Browse Map -> Listing Select
        {"id": "e_start_browse", "source": "node_start", "target": "node_browse_map", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},
        {"id": "e_browse_select", "source": "node_browse_map", "target": "node_listing_select", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},
        {"id": "e_select_intent", "source": "node_listing_select", "target": "node_intent_fav", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # Intent Fav Branches
        {"id": "e_intent_fav_yes", "source": "node_intent_fav", "target": "node_sub_fav", "value": "Favorite",
         "points": [(370, 407.5)], "svg_points": [(400, 407.5), (370, 407.5)], "label_pos": (375, 399), "exitX": 0.0, "exitY": 0.5, "entryX": 1.0, "entryY": 0.5},
        {"id": "e_fav_auth", "source": "node_sub_fav", "target": "node_auth_check",
         "points": [(275, 645)], "svg_points": [(275, 437.5), (275, 645), (410, 645)], "exitX": 0.5, "exitY": 1.0, "entryX": 0.0, "entryY": 0.5},
        {"id": "e_intent_fav_no", "source": "node_intent_fav", "target": "node_intent_contact", "value": "Contact / Inquire", "label_pos": (508, 460), "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # Intent Contact Branches
        {"id": "e_contact_reveal", "source": "node_intent_contact", "target": "node_sub_reveal", "value": "Reveal Phone",
         "points": [(370, 527.5)], "svg_points": [(410, 527.5), (370, 527.5)], "label_pos": (375, 519), "exitX": 0.0, "exitY": 0.5, "entryX": 1.0, "entryY": 0.5},
        {"id": "e_reveal_auth", "source": "node_sub_reveal", "target": "node_auth_check",
         "points": [(275, 645)], "svg_points": [(275, 557.5), (275, 645), (410, 645)], "exitX": 0.5, "exitY": 1.0, "entryX": 0.0, "entryY": 0.5},
        {"id": "e_contact_inquiry", "source": "node_intent_contact", "target": "node_sub_inquiry", "value": "Viewing Request",
         "points": [(680, 527.5)], "svg_points": [(590, 527.5), (680, 527.5)], "label_pos": (615, 519), "exitX": 1.0, "exitY": 0.5, "entryX": 0.0, "entryY": 0.5},
        {"id": "e_inquiry_auth", "source": "node_sub_inquiry", "target": "node_auth_check",
         "points": [(780, 645)], "svg_points": [(780, 557.5), (780, 645), (590, 645)], "exitX": 0.5, "exitY": 1.0, "entryX": 1.0, "entryY": 0.5},

        # Auth Check Branches
        {"id": "e_auth_guest", "source": "node_auth_check", "target": "node_gatekeeper_handoff", "value": "NO (Guest)",
         "points": [(370, 645)], "svg_points": [(410, 645), (370, 645)], "label_pos": (375, 637), "exitX": 0.0, "exitY": 0.5, "entryX": 1.0, "entryY": 0.5},
        {"id": "e_gatekeeper_loop", "source": "node_gatekeeper_handoff", "target": "node_execute_action",
         "points": [(275, 752.5)], "svg_points": [(275, 675), (275, 752.5), (360, 752.5)], "exitX": 0.5, "exitY": 1.0, "entryX": 0.0, "entryY": 0.5},
        {"id": "e_auth_ok", "source": "node_auth_check", "target": "node_execute_action", "value": "YES (Auth)", "label_pos": (508, 695), "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # Execution DB Write
        {"id": "e_execute_db", "source": "node_execute_action", "target": "node_db_renter", "value": "INSERT / UPDATE", "dashed": True,
         "points": [(780, 752.5)], "svg_points": [(640, 752.5), (780, 752.5)], "label_pos": (675, 742), "exitX": 1.0, "exitY": 0.5, "entryX": 0.0, "entryY": 0.5},
        {"id": "e_execute_check", "source": "node_execute_action", "target": "node_mutation_success", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # Mutation Check Branches
        {"id": "e_mut_no", "source": "node_mutation_success", "target": "node_error_toast", "value": "NO",
         "points": [(360, 860)], "svg_points": [(410, 860), (360, 860)], "label_pos": (375, 852), "exitX": 0.0, "exitY": 0.5, "entryX": 1.0, "entryY": 0.5},
        {"id": "e_err_end", "source": "node_error_toast", "target": "node_end",
         "points": [(100, 860), (100, 1275)], "svg_points": [(180, 860), (100, 860), (100, 1275), (420, 1275)], "exitX": 0.0, "exitY": 0.5, "entryX": 0.0, "entryY": 0.5},
        {"id": "e_mut_yes", "source": "node_mutation_success", "target": "node_dispatch_telemetry", "value": "YES", "label_pos": (508, 910), "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},

        # Dispatch -> Handoff -> Confirmation -> End
        {"id": "e_disp_handoff", "source": "node_dispatch_telemetry", "target": "node_notify_landlord_step", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},
        {"id": "e_handoff_confirm", "source": "node_notify_landlord_step", "target": "node_renter_confirmation", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0},
        {"id": "e_confirm_end", "source": "node_renter_confirmation", "target": "node_end", "exitX": 0.5, "exitY": 1.0, "entryX": 0.5, "entryY": 0.0}
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
    build_landlord_onboarding_kyc()
    build_landlord_master_orchestration()
    build_admin_master_orchestration()
    build_renter_master_orchestration()

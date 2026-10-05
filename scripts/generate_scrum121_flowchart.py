#!/usr/bin/env python3
"""
Generates the SCRUM-121 Sub-Process 2.5: High-Intent Action Interception & Auth Gatekeeper Flowchart in 3 formats:
1. docs/flowcharts/map-auth-gatekeeper.drawio (Draw.io XML)
2. docs/pdf/map-auth-gatekeeper.pdf (Vector PDF via weasyprint)
3. docs/assets/flowcharts/map-auth-gatekeeper.png (High-Res 200 DPI PNG via pdftoppm)

Design Style:
- Strict Black & White: white fills (#FFFFFF), black strokes (#000000), black text (#000000).
- Standard classic flowchart shapes:
  * Terminal: Rounded Stadium / Pill
  * Process: Rectangle
  * Input/Output / Action Trigger: Parallelogram
  * Decision: Rhombus / Diamond (Strictly Binary YES / NO)
  * Database: 3D Cylinder with dashed query lines
  * Connector: Circle with letter (L: Login Flow Module 1 - SCRUM-105)
- Grid pattern background (#E2E8F0 20px grid).
- 100% Orthogonal routing with zero collisions, zero crossing lines, and generous clearances.
- Author: Hermar Centillas (Lead Architect)
- Reviewed & Audited by: Hermar Centillas (Lead / Scrum Master)
"""

import os
import shutil
import subprocess
import weasyprint

def build_drawio_xml():
    xml = '''<mxfile host="Electron" modified="2026-10-05T10:10:00.000Z" agent="Antigravity" version="21.0.0" type="device">
  <diagram id="scrum-121-map-auth-gatekeeper" name="Sub-Process 2.5: High-Intent Auth Gatekeeper">
    <mxGraphModel dx="1200" dy="1600" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1250" pageHeight="1450" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />

        <!-- Title -->
        <mxCell id="title" value="SCRUM-121: SUB-PROCESS 2.5 — HIGH-INTENT ACTION INTERCEPTION &amp; AUTH GATEKEEPER" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontFamily=Helvetica;fontSize=16;fontStyle=1;fontColor=#000000;" vertex="1" parent="1">
          <mxGeometry x="65" y="25" width="1120" height="35" as="geometry" />
        </mxCell>

        <!-- 1. START -->
        <mxCell id="node_start" value="START" style="rounded=1;arcSize=50;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=2;fontFamily=Helvetica;fontSize=14;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="545" y="75" width="160" height="45" as="geometry" />
        </mxCell>

        <!-- 2. User Action (Parallelogram) -->
        <mxCell id="node_trigger_action" value="User Triggers High-Intent Action on Card or Pin&#xa;(Click Favorite Heart, Reveal Phone, or Schedule Viewing)" style="shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fixedSize=1;size=20;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="425" y="150" width="400" height="55" as="geometry" />
        </mxCell>

        <!-- 3. Diamond 1: User Authenticated? -->
        <mxCell id="node_auth_decision" value="User&#xa;Authenticated?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="525" y="235" width="200" height="75" as="geometry" />
        </mxCell>

        <!-- LEFT COLUMN: AUTHENTICATED ACTIONS -->
        <!-- Diamond 2: Action: Schedule Viewing? -->
        <mxCell id="node_schedule_decision" value="Action: Schedule&#xa;Viewing?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="160" y="335" width="180" height="75" as="geometry" />
        </mxCell>

        <!-- Column 1: Schedule Viewing (YES of Diamond 2) -->
        <mxCell id="node_open_scheduler" value="Open In-App Viewing Scheduler Modal&#xa;(Landlord timeslots &amp; preferred date picker)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=10.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="150" y="440" width="200" height="50" as="geometry" />
        </mxCell>

        <mxCell id="node_dispatch_appointment" value="Dispatch Appointment to Database&#xa;(Insert pending viewing_appointments)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=10.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="150" y="520" width="200" height="50" as="geometry" />
        </mxCell>

        <!-- Diamond 3: Action: Favorite Rental Unit? (NO of Diamond 2) -->
        <mxCell id="node_favorite_decision" value="Action: Favorite&#xa;Rental Unit?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="440" y="335" width="180" height="75" as="geometry" />
        </mxCell>

        <!-- Column 2: Favorite Unit (YES of Diamond 3) -->
        <mxCell id="node_toggle_favorite" value="Toggle Saved Listing in DB&#xa;(Upsert / Delete saved_properties)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=10.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="430" y="440" width="200" height="50" as="geometry" />
        </mxCell>

        <mxCell id="node_update_heart" value="Update Heart Icon State&#xa;(Increment saved counter badge)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=10.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="430" y="520" width="200" height="50" as="geometry" />
        </mxCell>

        <!-- Column 3: Reveal Phone (NO of Diamond 3) -->
        <mxCell id="node_reveal_phone" value="Log Contact Impression &amp; Reveal&#xa;(Unmask verified phone 09XX-XXX-XXXX)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=10.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="690" y="440" width="210" height="50" as="geometry" />
        </mxCell>

        <!-- User & Rental Database Cylinder -->
        <mxCell id="node_database" value="User &amp; Rental DB&#xa;(appointments, saved_properties, logs)" style="shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=10.5;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="60" y="615" width="240" height="65" as="geometry" />
        </mxCell>

        <!-- Post-Action Feedback (Success Notice) -->
        <mxCell id="node_action_success" value="Display Contextual Confirmation Notice&#xa;(Heart active / Appointment requested toast banner)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="380" y="622" width="280" height="50" as="geometry" />
        </mxCell>

        <!-- RIGHT COLUMN: UNAUTHENTICATED GATEKEEPER PATH (NO) -->
        <mxCell id="node_serialize_intent" value="Capture Pending Action &amp; Viewport Context&#xa;(action_type, listing_id, [lng, lat], zoom, filters)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=10.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="960" y="340" width="260" height="50" as="geometry" />
        </mxCell>

        <mxCell id="node_store_session" value="Persist Intent to SessionStorage&#xa;(Key: abangcebu_pending_intent)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=10.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="960" y="420" width="260" height="50" as="geometry" />
        </mxCell>

        <mxCell id="node_launch_auth_modal" value="Launch Frictionless Auth Gatekeeper Modal&#xa;(Contextual prompt: 'Sign in to contact landlord')" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=10.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="960" y="500" width="260" height="50" as="geometry" />
        </mxCell>

        <!-- Connector L to Module 1 Login Flow -->
        <mxCell id="node_connector_l" value="L" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=2;fontFamily=Helvetica;fontSize=14;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="1070" y="575" width="40" height="40" as="geometry" />
        </mxCell>
        <mxCell id="label_connector_l" value="To Auth Login Module 1 (SCRUM-105)" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontFamily=Helvetica;fontSize=10;fontStyle=2;fontColor=#000000;" vertex="1" parent="1">
          <mxGeometry x="960" y="620" width="260" height="25" as="geometry" />
        </mxCell>

        <!-- Diamond 4: User Successfully Authenticates? -->
        <mxCell id="node_auth_result_decision" value="User Successfully&#xa;Authenticates?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="1000" y="660" width="180" height="75" as="geometry" />
        </mxCell>

        <!-- NO Branch: Dismiss Auth Modal -->
        <mxCell id="node_dismiss_auth" value="Dismiss Modal &amp; Retain Guest Map View&#xa;(Clear sessionStorage pending intent)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=10.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="980" y="765" width="230" height="50" as="geometry" />
        </mxCell>

        <!-- YES Branch: Hydrate & Resume Intent -->
        <mxCell id="node_resume_intent" value="Hydrate Session &amp; Resume Deferred Intent&#xa;(Read pending intent &amp; execute action)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=10.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="720" y="765" width="230" height="50" as="geometry" />
        </mxCell>

        <!-- END (Stadium) -->
        <mxCell id="node_end" value="END" style="rounded=1;arcSize=50;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=2;fontFamily=Helvetica;fontSize=14;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="545" y="880" width="160" height="45" as="geometry" />
        </mxCell>

        <!-- EDGES -->
        <!-- START -> Trigger Action -->
        <mxCell id="edge1" edge="1" parent="1" source="node_start" target="node_trigger_action" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Trigger Action -> Auth Decision -->
        <mxCell id="edge2" edge="1" parent="1" source="node_trigger_action" target="node_auth_decision" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Auth Decision -> YES -> Schedule Decision -->
        <mxCell id="edge_auth_yes" value="YES" edge="1" parent="1" source="node_auth_decision" target="node_schedule_decision" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="250" y="272.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Schedule Decision -> YES -> Open Scheduler -->
        <mxCell id="edge_sched_yes" value="YES" edge="1" parent="1" source="node_schedule_decision" target="node_open_scheduler" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Open Scheduler -> Dispatch Appointment -->
        <mxCell id="edge_sched_dispatch" edge="1" parent="1" source="node_open_scheduler" target="node_dispatch_appointment" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Schedule Decision -> NO -> Favorite Decision -->
        <mxCell id="edge_sched_no" value="NO" edge="1" parent="1" source="node_schedule_decision" target="node_favorite_decision" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Favorite Decision -> YES -> Toggle Favorite -->
        <mxCell id="edge_fav_yes" value="YES" edge="1" parent="1" source="node_favorite_decision" target="node_toggle_favorite" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Toggle Favorite -> Update Heart -->
        <mxCell id="edge_fav_heart" edge="1" parent="1" source="node_toggle_favorite" target="node_update_heart" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Favorite Decision -> NO -> Reveal Phone -->
        <mxCell id="edge_fav_no" value="NO" edge="1" parent="1" source="node_favorite_decision" target="node_reveal_phone" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="795" y="372.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Dashed lines to Database -->
        <mxCell id="edge_db_sched" edge="1" parent="1" source="node_dispatch_appointment" target="node_database" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;dashed=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="180" y="590" />
              <mxPoint x="180" y="615" />
            </Array>
          </mxGeometry>
        </mxCell>
        <mxCell id="edge_db_fav" edge="1" parent="1" source="node_update_heart" target="node_database" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;dashed=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="530" y="590" />
              <mxPoint x="240" y="590" />
              <mxPoint x="240" y="615" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Collector Bus for 3 Actions to Action Success -->
        <mxCell id="edge_succ_sched" edge="1" parent="1" source="node_dispatch_appointment" target="node_action_success" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="250" y="585" />
              <mxPoint x="520" y="585" />
            </Array>
          </mxGeometry>
        </mxCell>
        <mxCell id="edge_succ_fav" edge="1" parent="1" source="node_update_heart" target="node_action_success" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="530" y="585" />
              <mxPoint x="520" y="585" />
            </Array>
          </mxGeometry>
        </mxCell>
        <mxCell id="edge_succ_phone" edge="1" parent="1" source="node_reveal_phone" target="node_action_success" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="795" y="585" />
              <mxPoint x="520" y="585" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Action Success -> END -->
        <mxCell id="edge_success_end" edge="1" parent="1" source="node_action_success" target="node_end" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="520" y="710" />
              <mxPoint x="625" y="710" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Auth Decision -> NO -> Serialize Intent -->
        <mxCell id="edge_auth_no" value="NO" edge="1" parent="1" source="node_auth_decision" target="node_serialize_intent" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="1090" y="272.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Serialize Intent -> Store Session -->
        <mxCell id="edge_ser_store" edge="1" parent="1" source="node_serialize_intent" target="node_store_session" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Store Session -> Launch Auth Modal -->
        <mxCell id="edge_store_modal" edge="1" parent="1" source="node_store_session" target="node_launch_auth_modal" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Launch Modal -> Connector L -->
        <mxCell id="edge_modal_l" edge="1" parent="1" source="node_launch_auth_modal" target="node_connector_l" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Connector L -> Auth Result Decision -->
        <mxCell id="edge_l_decision" edge="1" parent="1" source="node_connector_l" target="node_auth_result_decision" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Auth Result Decision -> NO -> Dismiss Auth -->
        <mxCell id="edge_res_no" value="NO" edge="1" parent="1" source="node_auth_result_decision" target="node_dismiss_auth" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Dismiss Auth -> END -->
        <mxCell id="edge_dismiss_end" edge="1" parent="1" source="node_dismiss_auth" target="node_end" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="1090" y="902.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Auth Result Decision -> YES -> Resume Intent -->
        <mxCell id="edge_res_yes" value="YES" edge="1" parent="1" source="node_auth_result_decision" target="node_resume_intent" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="835" y="697.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Resume Intent -> Loop into Schedule Decision via Far-Left Bus -->
        <mxCell id="edge_resume_loop" edge="1" parent="1" source="node_resume_intent" target="node_schedule_decision" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="835" y="835" />
              <mxPoint x="30" y="835" />
              <mxPoint x="30" y="272.5" />
            </Array>
          </mxGeometry>
        </mxCell>

      </root>
    </mxGraphModel>
  </diagram>
</mxfile>'''
    return xml

def build_svg_vector():
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1250 980" width="1250" height="980" style="background:#FFFFFF; font-family:Helvetica, Arial, sans-serif;">
  <defs>
    <!-- 20px Grid Pattern -->
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E2E8F0" stroke-width="0.75"/>
    </pattern>
    <!-- Arrowhead Marker -->
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#000000"/>
    </marker>
  </defs>

  <!-- Background with Grid -->
  <rect width="100%" height="100%" fill="url(#grid)"/>

  <!-- Title -->
  <text x="625" y="45" text-anchor="middle" font-size="15" font-weight="bold" fill="#000000">SCRUM-121: SUB-PROCESS 2.5 — HIGH-INTENT ACTION INTERCEPTION &amp; AUTH GATEKEEPER</text>

  <!-- 1. START -->
  <rect x="545" y="75" width="160" height="45" rx="22.5" fill="#FFFFFF" stroke="#000000" stroke-width="2"/>
  <text x="625" y="103" text-anchor="middle" font-size="14" font-weight="bold" fill="#000000">START</text>

  <!-- Line 1: START -> Trigger Action -->
  <path d="M 625 120 L 625 150" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>

  <!-- 2. User Trigger Action (Parallelogram) -->
  <polygon points="445,150 835,150 805,205 415,205" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
  <text x="625" y="172" text-anchor="middle" font-size="12" fill="#000000">User Triggers High-Intent Action on Card or Pin</text>
  <text x="625" y="190" text-anchor="middle" font-size="11" fill="#4A5568">(Click Favorite Heart, Reveal Phone, or Schedule Viewing)</text>

  <!-- Line 2: Trigger -> Diamond 1 Auth Decision -->
  <path d="M 625 205 L 625 235" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>

  <!-- 3. Diamond 1: User Authenticated? -->
  <polygon points="625,235 725,272.5 625,310 525,272.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
  <text x="625" y="268" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">User</text>
  <text x="625" y="284" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Authenticated?</text>

  <!-- Auth YES -> Schedule Decision (Left Column) -->
  <path d="M 525 272.5 L 250 272.5 L 250 335" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="385" y="265" text-anchor="middle" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <!-- Diamond 2: Action: Schedule Viewing? -->
  <polygon points="250,335 340,372.5 250,410 160,372.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
  <text x="250" y="368" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#000000">Action: Schedule</text>
  <text x="250" y="384" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#000000">Viewing?</text>

  <!-- Schedule YES -> Column 1 (Straight Down) -->
  <path d="M 250 410 L 250 440" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="265" y="425" text-anchor="start" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <rect x="150" y="440" width="200" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
  <text x="250" y="461" text-anchor="middle" font-size="10.5" fill="#000000">Open In-App Scheduler Modal</text>
  <text x="250" y="477" text-anchor="middle" font-size="9.5" fill="#4A5568">(Landlord timeslots &amp; date picker)</text>

  <path d="M 250 490 L 250 520" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>

  <rect x="150" y="520" width="200" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
  <text x="250" y="541" text-anchor="middle" font-size="10.5" fill="#000000">Dispatch Appointment Request</text>
  <text x="250" y="557" text-anchor="middle" font-size="9.5" fill="#4A5568">(Insert viewing_appointments)</text>

  <!-- Schedule NO -> Diamond 3: Action: Favorite Rental? (Goes Right) -->
  <path d="M 340 372.5 L 440 372.5" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="390" y="365" text-anchor="middle" font-size="11" font-weight="bold" fill="#000000">NO</text>

  <polygon points="530,335 620,372.5 530,410 440,372.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
  <text x="530" y="368" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#000000">Action: Favorite</text>
  <text x="530" y="384" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#000000">Rental Unit?</text>

  <!-- Favorite YES -> Column 2 (Straight Down) -->
  <path d="M 530 410 L 530 440" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="545" y="425" text-anchor="start" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <rect x="430" y="440" width="200" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
  <text x="530" y="461" text-anchor="middle" font-size="10.5" fill="#000000">Toggle Saved Listing in DB</text>
  <text x="530" y="477" text-anchor="middle" font-size="9.5" fill="#4A5568">(Upsert / Delete saved_properties)</text>

  <path d="M 530 490 L 530 520" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>

  <rect x="430" y="520" width="200" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
  <text x="530" y="541" text-anchor="middle" font-size="10.5" fill="#000000">Update Heart Icon State</text>
  <text x="530" y="557" text-anchor="middle" font-size="9.5" fill="#4A5568">(Increment saved counter badge)</text>

  <!-- Favorite NO -> Column 3 (Goes Right and Down: Reveal Phone) -->
  <path d="M 620 372.5 L 795 372.5 L 795 440" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="705" y="365" text-anchor="middle" font-size="11" font-weight="bold" fill="#000000">NO</text>

  <rect x="690" y="440" width="210" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
  <text x="795" y="461" text-anchor="middle" font-size="10.5" fill="#000000">Log Contact Impression &amp; Reveal</text>
  <text x="795" y="477" text-anchor="middle" font-size="9.5" fill="#4A5568">(Unmask verified phone 09XX-XXX-XXXX)</text>

  <!-- Database Cylinder (Left side beneath Column 1) -->
  <path d="M 60 635 A 110 12 0 0 1 280 635 L 280 680 A 110 12 0 0 1 60 680 Z" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
  <ellipse cx="170" cy="635" rx="110" ry="12" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
  <text x="170" y="655" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#000000">User &amp; Rental DB</text>
  <text x="170" y="670" text-anchor="middle" font-size="9" fill="#4A5568">(appointments, saved_properties, logs)</text>

  <!-- Dashed lines to Database -->
  <path d="M 180 570 L 180 623" fill="none" stroke="#000000" stroke-width="1.5" stroke-dasharray="4,3" marker-end="url(#arrow)"/>
  <path d="M 450 570 L 450 600 L 240 600 L 240 623" fill="none" stroke="#000000" stroke-width="1.5" stroke-dasharray="4,3" marker-end="url(#arrow)"/>

  <!-- Collector Bus at y=585 for Authenticated Actions to Success Notice -->
  <path d="M 250 570 L 250 585 L 520 585" fill="none" stroke="#000000" stroke-width="1.5"/>
  <path d="M 530 570 L 530 585 L 520 585" fill="none" stroke="#000000" stroke-width="1.5"/>
  <path d="M 795 490 L 795 585 L 520 585" fill="none" stroke="#000000" stroke-width="1.5"/>

  <!-- Bus drops into Contextual Confirmation Notice -->
  <path d="M 520 585 L 520 622" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>

  <rect x="380" y="622" width="280" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
  <text x="520" y="643" text-anchor="middle" font-size="11" fill="#000000">Display Contextual Confirmation Notice</text>
  <text x="520" y="659" text-anchor="middle" font-size="9.5" fill="#4A5568">(Heart active / Appointment requested toast)</text>

  <!-- Confirmation Notice -> END -->
  <path d="M 520 672 L 520 710 L 625 710 L 625 880" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>

  <!-- Auth NO -> Right Column (Serialize Intent) -->
  <path d="M 725 272.5 L 1090 272.5 L 1090 340" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="910" y="265" text-anchor="middle" font-size="11" font-weight="bold" fill="#000000">NO</text>

  <rect x="960" y="340" width="260" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
  <text x="1090" y="361" text-anchor="middle" font-size="10.5" fill="#000000">Capture Pending Action &amp; Viewport</text>
  <text x="1090" y="377" text-anchor="middle" font-size="9.5" fill="#4A5568">(action_type, listing_id, [lng, lat], zoom, filters)</text>

  <path d="M 1090 390 L 1090 420" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>

  <rect x="960" y="420" width="260" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
  <text x="1090" y="441" text-anchor="middle" font-size="10.5" fill="#000000">Persist Intent to SessionStorage</text>
  <text x="1090" y="457" text-anchor="middle" font-size="9.5" fill="#4A5568">(Key: abangcebu_pending_intent)</text>

  <path d="M 1090 470 L 1090 500" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>

  <rect x="960" y="500" width="260" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
  <text x="1090" y="521" text-anchor="middle" font-size="10.5" fill="#000000">Launch Frictionless Auth Modal</text>
  <text x="1090" y="537" text-anchor="middle" font-size="9.5" fill="#4A5568">(Contextual prompt: 'Sign in to contact landlord')</text>

  <path d="M 1090 550 L 1090 575" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>

  <!-- Connector (L) Circle -->
  <circle cx="1090" cy="595" r="20" fill="#FFFFFF" stroke="#000000" stroke-width="2"/>
  <text x="1090" y="601" text-anchor="middle" font-size="14" font-weight="bold" fill="#000000">L</text>
  <text x="1090" y="630" text-anchor="middle" font-size="10" font-style="italic" fill="#000000">To Auth Login Module 1 (SCRUM-105)</text>

  <!-- Connector L -> Diamond 4 Auth Result Decision -->
  <path d="M 1090 635 L 1090 660" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>

  <!-- Diamond 4: User Successfully Authenticates? -->
  <polygon points="1090,660 1180,697.5 1090,735 1000,697.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
  <text x="1090" y="693" text-anchor="middle" font-size="11" font-weight="bold" fill="#000000">User Successfully</text>
  <text x="1090" y="709" text-anchor="middle" font-size="11" font-weight="bold" fill="#000000">Authenticates?</text>

  <!-- Result NO -> Dismiss Modal -->
  <path d="M 1090 735 L 1090 765" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="1105" y="750" text-anchor="start" font-size="11" font-weight="bold" fill="#000000">NO</text>

  <rect x="980" y="765" width="220" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
  <text x="1090" y="786" text-anchor="middle" font-size="10.5" fill="#000000">Dismiss Modal &amp; Retain View</text>
  <text x="1090" y="802" text-anchor="middle" font-size="9.5" fill="#4A5568">(Clear sessionStorage pending intent)</text>

  <!-- Dismiss Modal -> END -->
  <path d="M 1090 815 L 1090 902.5 L 705 902.5" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>

  <!-- Result YES -> Resume Intent -->
  <path d="M 1000 697.5 L 835 697.5 L 835 765" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="917" y="690" text-anchor="middle" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <rect x="720" y="765" width="230" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
  <text x="835" y="786" text-anchor="middle" font-size="10.5" fill="#000000">Hydrate Session &amp; Resume</text>
  <text x="835" y="802" text-anchor="middle" font-size="9.5" fill="#4A5568">(Read intent &amp; auto-execute)</text>

  <!-- Resume Intent -> Loop into Authenticated Branch via Far-Left Bus at x=30 -->
  <path d="M 835 815 L 835 835 L 30 835 L 30 272.5 L 525 272.5" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>

  <!-- END (Stadium) -->
  <rect x="545" y="880" width="160" height="45" rx="22.5" fill="#FFFFFF" stroke="#000000" stroke-width="2"/>
  <text x="625" y="908" text-anchor="middle" font-size="14" font-weight="bold" fill="#000000">END</text>

</svg>'''
    return svg

def main():
    print("Generating SCRUM-121 Sub-Process 2.5: High-Intent Action Interception & Auth Gatekeeper Deliverables...", flush=True)
    os.makedirs('docs/flowcharts', exist_ok=True)
    os.makedirs('docs/pdf', exist_ok=True)
    os.makedirs('docs/assets/flowcharts', exist_ok=True)

    # 1. Write Draw.io XML
    drawio_path = 'docs/flowcharts/map-auth-gatekeeper.drawio'
    with open(drawio_path, 'w', encoding='utf-8') as f:
        f.write(build_drawio_xml())
    print(f"Created: {drawio_path}", flush=True)

    # 2. Write SVG
    svg_path = 'docs/assets/flowcharts/map-auth-gatekeeper.svg'
    svg_content = build_svg_vector()
    with open(svg_path, 'w', encoding='utf-8') as f:
        f.write(svg_content)
    print(f"Created: {svg_path}", flush=True)

    # 3. Compile Vector PDF using WeasyPrint
    pdf_path = 'docs/pdf/map-auth-gatekeeper.pdf'
    html_content = f'''<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {{
    size: 1250px 980px;
    margin: 0;
  }}
  body {{
    margin: 0;
    padding: 0;
    background: #FFFFFF;
  }}
</style>
</head>
<body>
{svg_content}
</body>
</html>'''
    weasyprint.HTML(string=html_content).write_pdf(pdf_path)
    print(f"Created: {pdf_path}", flush=True)

    # 4. Rasterize High-Res PNG at 200 DPI via pdftoppm
    png_path = 'docs/assets/flowcharts/map-auth-gatekeeper.png'
    prefix = '/tmp/scrum121_render'
    cmd = ['pdftoppm', '-png', '-r', '200', pdf_path, prefix]
    subprocess.run(cmd, check=True)
    generated_png = f"{prefix}-1.png"
    if os.path.exists(generated_png):
        shutil.move(generated_png, png_path)
        print(f"Created: {png_path}", flush=True)

    # 5. Copy to brain artifact directory
    brain_dir = '/home/hrmr/.gemini/antigravity-cli/brain/e06feeb1-eae1-4d85-a539-8f5611d91249'
    brain_png = os.path.join(brain_dir, 'map-auth-gatekeeper.png')
    shutil.copyfile(png_path, brain_png)
    print(f"Copied to brain: {brain_png}", flush=True)

if __name__ == '__main__':
    main()

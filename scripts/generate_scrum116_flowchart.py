#!/usr/bin/env python3
"""
Generates the SCRUM-116 Landing Page & Map-First Spatial Discovery Master Orchestration Flowchart in 3 formats:
1. docs/flowcharts/map-master-orchestration.drawio (Draw.io XML)
2. docs/assets/flowcharts/map-master-orchestration.svg (Vector SVG)
3. docs/pdf/map-master-orchestration.pdf (Vector PDF via weasyprint)
4. docs/assets/flowcharts/map-master-orchestration.png (High-Res 200 DPI PNG via pdftoppm)

Design Style & Architecture Standards:
- Strict Black & White: white fills (#FFFFFF), black strokes (#000000), black text (#000000).
- Standard ANSI/ISO flowchart grammar:
  * Terminal: Stadium / Pill (START, END)
  * Process: Rectangle
  * Input/Output: Parallelogram
  * Decision: Strictly Binary Rhombus / Diamond (EXACTLY TWO outputs: YES / NO)
  * Database: 3D Cylinder with dashed query lines
  * Off-Page Connectors: Circle with letter (A: Ask AbangCebu AI, L: Login Flow)
- Grid background (#E2E8F0 20px grid).
- 100% Orthogonal rectilinear routing with zero arrowhead overlap, zero collision, and min 40px spacing.
"""

import os
import shutil
import subprocess
import weasyprint

def build_drawio_xml():
    xml = '''<mxfile host="Electron" modified="2026-10-03T13:40:00.000Z" agent="Antigravity" version="21.0.0" type="device">
  <diagram id="scrum-116-map-master-orchestration" name="Landing Page &amp; Spatial Discovery Master Orchestration">
    <mxGraphModel dx="1200" dy="1600" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1040" pageHeight="1480" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />

        <!-- Title -->
        <mxCell id="title" value="SCRUM-116: LANDING PAGE &amp; MAP-FIRST SPATIAL DISCOVERY MASTER ORCHESTRATION" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontFamily=Helvetica;fontSize=16;fontStyle=1;fontColor=#000000;" vertex="1" parent="1">
          <mxGeometry x="95" y="25" width="850" height="35" as="geometry" />
        </mxCell>

        <!-- 1. START -->
        <mxCell id="node_start" value="START" style="rounded=1;arcSize=50;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=2;fontFamily=Helvetica;fontSize=14;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="440" y="70" width="160" height="45" as="geometry" />
        </mxCell>

        <!-- 2. Visitor / User Accesses Landing Page (Parallelogram) -->
        <mxCell id="node_access" value="Visitor / User Accesses Landing Page&#xa;(GET / or /search)" style="shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fixedSize=1;size=20;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="350" y="145" width="340" height="55" as="geometry" />
        </mxCell>

        <!-- 3. Mount Full-Bleed Map Canvas -->
        <mxCell id="node_mount_map" value="Mount Full-Bleed Map Canvas&#xa;(MapLibre GL WebGL Canvas + OpenFreeMap Vector Tiles)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="330" y="230" width="380" height="55" as="geometry" />
        </mxCell>

        <!-- 4. GPS Geolocation Granted? -->
        <mxCell id="node_gps_decision" value="GPS Geolocation&#xa;Granted?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="415" y="315" width="210" height="75" as="geometry" />
        </mxCell>

        <!-- GPS Fly to User Coordinates -->
        <mxCell id="node_gps_fly" value="Fly to Live User GPS Coordinates&#xa;(Browser navigator.geolocation [lat, lng])" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="150" y="415" width="240" height="50" as="geometry" />
        </mxCell>

        <!-- GPS Fallback to Metro Cebu Centroid -->
        <mxCell id="node_gps_fallback" value="Fallback: Metro Cebu Default Centroid&#xa;(Fuente Osmeña [10.3157, 123.8854])" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="650" y="415" width="240" height="50" as="geometry" />
        </mxCell>

        <!-- 5. Execute Spatial Query -->
        <mxCell id="node_spatial_query" value="Execute Spatial Query&#xa;(ST_MakeEnvelope Bbox / ST_DWithin Proximity)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="330" y="510" width="380" height="55" as="geometry" />
        </mxCell>

        <!-- PostGIS Database Cylinder -->
        <mxCell id="node_postgis_db" value="PostGIS Database&#xa;(ST_MakeEnvelope Bbox &amp;&#xa;Active Verified Listings)" style="shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="790" y="500" width="175" height="75" as="geometry" />
        </mxCell>

        <!-- 6. Render Floating UI Surfaces -->
        <mxCell id="node_render_ui" value="Render Floating UI Surfaces &amp; Price Pins&#xa;(Search Card, Filter Pills, Results Drawer / 3-Snap Sheet, Live Price Pins)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="270" y="600" width="500" height="55" as="geometry" />
        </mxCell>

        <!-- Ask AbangCebu AI Trigger -->
        <mxCell id="node_ask_ai_trigger" value="&quot;Ask AbangCebu AI&quot;&#xa;Floating FAB Trigger" style="shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fixedSize=1;size=15;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=10.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="110" y="602.5" width="135" height="50" as="geometry" />
        </mxCell>

        <!-- Connector A: Ask AbangCebu AI -->
        <mxCell id="node_connector_a" value="A" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=2;fontFamily=Helvetica;fontSize=13;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="159.5" y="677" width="36" height="36" as="geometry" />
        </mxCell>
        <mxCell id="label_connector_a" value="Ask AbangCebu AI&#xa;(Module 4 NLP Assistant)" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=top;whiteSpace=wrap;rounded=0;fontFamily=Helvetica;fontSize=9.5;fontColor=#000000;" vertex="1" parent="1">
          <mxGeometry x="97.5" y="717" width="160" height="30" as="geometry" />
        </mxCell>

        <!-- 7. User Discovery Interaction (Parallelogram) -->
        <mxCell id="node_user_interaction" value="User Discovery Interaction&#xa;(Pan/Zoom Viewport, Landmark Search, Filter Pill Toggle, Card/Pin Hover)" style="shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fixedSize=1;size=20;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="300" y="690" width="440" height="55" as="geometry" />
        </mxCell>

        <!-- 8. High-Intent Action Triggered? (Strict Binary Diamond 1) -->
        <mxCell id="node_high_intent_decision" value="High-Intent Action&#xa;Triggered?&#xa;(Favorite / Phone / Schedule)" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="400" y="780" width="240" height="80" as="geometry" />
        </mxCell>

        <!-- 9. Spatial Re-Query Required? (Strict Binary Diamond 2 - NO Branch) -->
        <mxCell id="node_requery_decision" value="Spatial Re-Query&#xa;Required?&#xa;(Pan/Zoom or Landmark)" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="145" y="890" width="210" height="75" as="geometry" />
        </mxCell>

        <!-- 10. Bidirectional Pin Highlight & Drawer Sync -->
        <mxCell id="node_pin_highlight" value="Bidirectional Pin Highlight &amp; Drawer Sync&#xa;(Highlight Pin Marker, Auto-Scroll Drawer Card, Sync Category Filter)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="120" y="1020" width="260" height="55" as="geometry" />
        </mxCell>

        <!-- 11. Authenticated User? (Strict Binary Diamond 3 - YES Branch) -->
        <mxCell id="node_auth_check" value="Authenticated User?&#xa;(Check active Supabase session)" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="685" y="890" width="210" height="75" as="geometry" />
        </mxCell>

        <!-- NO: Save Viewport & Action -->
        <mxCell id="node_save_session" value="Save Viewport &amp; Action&#xa;(Store bbox, active pin &amp; intent in sessionStorage)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="530" y="1020" width="220" height="55" as="geometry" />
        </mxCell>

        <!-- Launch Auth Modal -->
        <mxCell id="node_launch_auth" value="Launch Auth Modal&#xa;(Prompt Login / Registration sheet)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="530" y="1115" width="220" height="50" as="geometry" />
        </mxCell>

        <!-- Connector L: Login Flow -->
        <mxCell id="node_connector_l" value="L" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=2;fontFamily=Helvetica;fontSize=13;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="622" y="1202" width="36" height="36" as="geometry" />
        </mxCell>
        <mxCell id="label_connector_l" value="Login Flow (SCRUM-105)&#xa;(Resume saved viewport &amp; intent upon auth)" style="text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontFamily=Helvetica;fontSize=10;fontColor=#000000;" vertex="1" parent="1">
          <mxGeometry x="665" y="1202" width="220" height="36" as="geometry" />
        </mxCell>

        <!-- YES: Unveil Landlord Contact / Viewing Scheduler -->
        <mxCell id="node_unveil_contact" value="Unveil Landlord Contact /&#xa;Launch Viewing Scheduler Modal" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="805" y="1020" width="210" height="55" as="geometry" />
        </mxCell>

        <!-- Commit Inquiry / Viewing Request -->
        <mxCell id="node_commit_inquiry" value="Dispatch Inquiry Record to Database&#xa;(Commit inquiry / viewing record to inquiries table)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=10.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="805" y="1115" width="210" height="50" as="geometry" />
        </mxCell>

        <!-- 12. END -->
        <mxCell id="node_end" value="END" style="rounded=1;arcSize=50;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=2;fontFamily=Helvetica;fontSize=14;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="440" y="1360" width="160" height="45" as="geometry" />
        </mxCell>

        <!-- ==================== EDGES ==================== -->

        <!-- START -> Access Landing Page -->
        <mxCell id="e_start_access" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_start" target="node_access" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Access Landing Page -> Mount Full-Bleed Map Canvas -->
        <mxCell id="e_access_mount" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_access" target="node_mount_map" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Mount Map -> GPS Geolocation Granted? -->
        <mxCell id="e_mount_gps" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_mount_map" target="node_gps_decision" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- GPS -> YES -> Fly to Coordinates -->
        <mxCell id="e_gps_yes" value="YES" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_gps_decision" target="node_gps_fly" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="270" y="352.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- GPS -> NO -> Fallback Centroid -->
        <mxCell id="e_gps_no" value="NO" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_gps_decision" target="node_gps_fallback" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="770" y="352.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Fly to Coordinates -> Execute Spatial Query -->
        <mxCell id="e_fly_spatial" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_gps_fly" target="node_spatial_query" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="270" y="485" />
              <mxPoint x="520" y="485" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Fallback Centroid -> Execute Spatial Query -->
        <mxCell id="e_fallback_spatial" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_gps_fallback" target="node_spatial_query" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="770" y="485" />
              <mxPoint x="520" y="485" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Spatial Query <---> PostGIS Database (Dashed) -->
        <mxCell id="e_query_db" value="Spatial Query / Bbox" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;dashed=1;startArrow=classic;endArrow=classic;fontFamily=Helvetica;fontSize=9.5;fontColor=#000000;" edge="1" source="node_spatial_query" target="node_postgis_db" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Execute Spatial Query -> Render Floating UI -->
        <mxCell id="e_spatial_render" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_spatial_query" target="node_render_ui" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Render Floating UI -> Ask AI Trigger -->
        <mxCell id="e_render_ask_ai" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_render_ui" target="node_ask_ai_trigger" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Ask AI Trigger -> Connector A -->
        <mxCell id="e_ask_connector_a" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_ask_ai_trigger" target="node_connector_a" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Render Floating UI -> User Discovery Interaction -->
        <mxCell id="e_render_interaction" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_render_ui" target="node_user_interaction" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- User Discovery Interaction -> High-Intent Action Triggered? -->
        <mxCell id="e_interaction_intent" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_user_interaction" target="node_high_intent_decision" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- High-Intent Action Triggered? -> NO -> Spatial Re-Query Required? -->
        <mxCell id="e_intent_no" value="NO" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_high_intent_decision" target="node_requery_decision" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="250" y="820" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- High-Intent Action Triggered? -> YES -> Authenticated User? -->
        <mxCell id="e_intent_yes" value="YES" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_high_intent_decision" target="node_auth_check" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="790" y="820" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Spatial Re-Query Required? -> YES -> Loopback to Spatial Query (Left Bus x=30) -->
        <mxCell id="e_requery_yes" value="YES" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_requery_decision" target="node_spatial_query" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="30" y="927.5" />
              <mxPoint x="30" y="537.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Spatial Re-Query Required? -> NO -> Bidirectional Pin Highlight -->
        <mxCell id="e_requery_no" value="NO" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_requery_decision" target="node_pin_highlight" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Bidirectional Pin Highlight -> Loopback to Render Floating UI (Bus x=70) -->
        <mxCell id="e_pin_loop" value="Sync UI State" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=9.5;endArrow=classic;" edge="1" source="node_pin_highlight" target="node_render_ui" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="70" y="1047.5" />
              <mxPoint x="70" y="582.5" />
              <mxPoint x="350" y="582.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Authenticated User? -> NO -> Save Viewport -->
        <mxCell id="e_auth_no" value="NO" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_auth_check" target="node_save_session" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="640" y="927.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Save Viewport -> Launch Auth Modal -->
        <mxCell id="e_save_launch" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_save_session" target="node_launch_auth" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Launch Auth Modal -> Connector L -->
        <mxCell id="e_launch_connector_l" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_launch_auth" target="node_connector_l" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Connector L -> END -->
        <mxCell id="e_connector_l_end" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_connector_l" target="node_end" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="640" y="1315" />
              <mxPoint x="520" y="1315" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Authenticated User? -> YES -> Unveil Landlord Contact -->
        <mxCell id="e_auth_yes" value="YES" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_auth_check" target="node_unveil_contact" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="910" y="927.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Unveil Contact -> Commit Inquiry -->
        <mxCell id="e_unveil_commit" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_unveil_contact" target="node_commit_inquiry" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Commit Inquiry -> END -->
        <mxCell id="e_commit_end" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_commit_inquiry" target="node_end" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="910" y="1315" />
              <mxPoint x="520" y="1315" />
            </Array>
          </mxGeometry>
        </mxCell>

      </root>
    </mxGraphModel>
  </diagram>
</mxfile>'''
    return xml

def build_vector_svg():
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1040 1480" width="1040" height="1480">
  <defs>
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E2E8F0" stroke-width="1"/>
    </pattern>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#000000" />
    </marker>
    <marker id="arrow-start" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 9 1.5 L 0 5 L 9 8.5 z" fill="#000000" />
    </marker>
  </defs>

  <!-- Background Grid -->
  <rect width="100%" height="100%" fill="url(#grid)" />

  <!-- Flowchart Title -->
  <text x="520" y="42" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="16" font-weight="bold" fill="#000000" letter-spacing="0.5">SCRUM-116: LANDING PAGE &amp; MAP-FIRST SPATIAL DISCOVERY MASTER ORCHESTRATION</text>

  <!-- ==================== FLOWCHART CONNECTING LINES ==================== -->

  <!-- START -> Access Landing Page -->
  <line x1="520" y1="115" x2="520" y2="145" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Access Landing Page -> Mount Full-Bleed Map Canvas -->
  <line x1="520" y1="200" x2="520" y2="230" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Mount Map -> GPS Geolocation Granted? -->
  <line x1="520" y1="285" x2="520" y2="315" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- GPS -> YES -> Fly to Coordinates -->
  <polyline points="415,352.5 270,352.5 270,415" fill="none" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <rect x="325" y="342" width="36" height="20" fill="#FFFFFF" stroke="#000000" stroke-width="1" rx="3" />
  <text x="343" y="356.5" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <!-- GPS -> NO -> Fallback Centroid -->
  <polyline points="625,352.5 770,352.5 770,415" fill="none" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <rect x="682" y="342" width="32" height="20" fill="#FFFFFF" stroke="#000000" stroke-width="1" rx="3" />
  <text x="698" y="356.5" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="bold" fill="#000000">NO</text>

  <!-- Fly to Coordinates -> Execute Spatial Query -->
  <polyline points="270,465 270,485 520,485 520,510" fill="none" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Fallback Centroid -> Execute Spatial Query -->
  <polyline points="770,465 770,485 520,485" fill="none" stroke="#000000" stroke-width="1.8" />

  <!-- Spatial Query <---> PostGIS Database (Dashed) -->
  <line x1="710" y1="537.5" x2="790" y2="537.5" stroke="#000000" stroke-width="1.8" stroke-dasharray="5,4" marker-start="url(#arrow-start)" marker-end="url(#arrow)" />
  <rect x="715" y="513" width="70" height="18" fill="#FFFFFF" />
  <text x="750" y="525" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="8.5" fill="#333333">Spatial Query</text>

  <!-- Execute Spatial Query -> Render Floating UI -->
  <line x1="520" y1="565" x2="520" y2="600" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Render Floating UI -> Ask AI Trigger -->
  <line x1="270" y1="627.5" x2="245" y2="627.5" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Ask AI Trigger -> Connector A -->
  <line x1="177.5" y1="652.5" x2="177.5" y2="677" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Render Floating UI -> User Discovery Interaction -->
  <line x1="520" y1="655" x2="520" y2="690" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- User Discovery Interaction -> High-Intent Action Triggered? -->
  <line x1="520" y1="745" x2="520" y2="780" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- High-Intent Action Triggered? -> NO -> Spatial Re-Query Required? -->
  <polyline points="400,820 250,820 250,890" fill="none" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <rect x="309" y="810" width="32" height="20" fill="#FFFFFF" stroke="#000000" stroke-width="1" rx="3" />
  <text x="325" y="824.5" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="bold" fill="#000000">NO</text>
  <text x="325" y="842" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="9" fill="#555555">(Spatial Exploration)</text>

  <!-- High-Intent Action Triggered? -> YES -> Authenticated User? -->
  <polyline points="640,820 790,820 790,890" fill="none" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <rect x="697" y="810" width="36" height="20" fill="#FFFFFF" stroke="#000000" stroke-width="1" rx="3" />
  <text x="715" y="824.5" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="bold" fill="#000000">YES</text>
  <text x="715" y="842" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="9" fill="#555555">(Gated Action)</text>

  <!-- Spatial Re-Query Required? -> YES -> Loopback via Bus x=30 to Execute Spatial Query -->
  <polyline points="145,927.5 30,927.5 30,537.5 330,537.5" fill="none" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <rect x="70" y="917.5" width="36" height="20" fill="#FFFFFF" stroke="#000000" stroke-width="1" rx="3" />
  <text x="88" y="932" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="bold" fill="#000000">YES</text>
  <text x="88" y="948" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="8.5" fill="#555555">(Pan/Zoom/Landmark)</text>
  <rect x="80" y="527" width="230" height="18" fill="#FFFFFF" />
  <text x="195" y="539" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="9" font-weight="bold" fill="#333333">Re-Query Viewport Bbox (ST_MakeEnvelope)</text>

  <!-- Spatial Re-Query Required? -> NO -> Bidirectional Pin Highlight -->
  <line x1="250" y1="965" x2="250" y2="1020" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <rect x="234" y="977" width="32" height="20" fill="#FFFFFF" stroke="#000000" stroke-width="1" rx="3" />
  <text x="250" y="991.5" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="bold" fill="#000000">NO</text>
  <text x="272" y="991.5" text-anchor="start" font-family="Helvetica, Arial, sans-serif" font-size="8.5" fill="#555555">(Card/Pin Hover / Pill Toggle)</text>

  <!-- Bidirectional Pin Highlight -> Loopback via Bus x=70 to Render Floating UI -->
  <polyline points="120,1047.5 70,1047.5 70,582.5 350,582.5 350,600" fill="none" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <rect x="150" y="573" width="160" height="16" fill="#FFFFFF" />
  <text x="230" y="585" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="9" fill="#333333">Sync Marker &amp; Drawer State</text>

  <!-- Authenticated User? -> NO -> Save Viewport -->
  <polyline points="685,927.5 640,927.5 640,1020" fill="none" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <rect x="647" y="917.5" width="32" height="20" fill="#FFFFFF" stroke="#000000" stroke-width="1" rx="3" />
  <text x="663" y="932" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="bold" fill="#000000">NO</text>

  <!-- Save Viewport -> Launch Auth Modal -->
  <line x1="640" y1="1075" x2="640" y2="1115" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Launch Auth Modal -> Connector L -->
  <line x1="640" y1="1165" x2="640" y2="1202" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Connector L -> END -->
  <polyline points="640,1238 640,1315 520,1315 520,1360" fill="none" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Authenticated User? -> YES -> Unveil Landlord Contact -->
  <polyline points="895,927.5 910,927.5 910,1020" fill="none" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <rect x="888" y="917.5" width="36" height="20" fill="#FFFFFF" stroke="#000000" stroke-width="1" rx="3" />
  <text x="906" y="932" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <!-- Unveil Contact -> Commit Inquiry -->
  <line x1="910" y1="1075" x2="910" y2="1115" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Commit Inquiry -> END -->
  <polyline points="910,1165 910,1315 520,1315" fill="none" stroke="#000000" stroke-width="1.8" />


  <!-- ==================== FLOWCHART NODES & SHAPES ==================== -->

  <!-- 1. START -->
  <rect x="440" y="70" width="160" height="45" rx="22.5" ry="22.5" fill="#FFFFFF" stroke="#000000" stroke-width="2.2" />
  <text x="520" y="98" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="14" font-weight="bold" fill="#000000">START</text>

  <!-- 2. Visitor / User Accesses Landing Page (Parallelogram) -->
  <polygon points="370,145 690,145 670,200 350,200" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="520" y="167" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="12" font-weight="bold" fill="#000000">Visitor / User Accesses Landing Page</text>
  <text x="520" y="186" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="10.5" fill="#333333">(GET / or /search)</text>

  <!-- 3. Mount Full-Bleed Map Canvas -->
  <rect x="330" y="230" width="380" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="520" y="253" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="12" font-weight="bold" fill="#000000">Mount Full-Bleed Map Canvas</text>
  <text x="520" y="271" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="10" fill="#333333">(MapLibre GL WebGL Canvas + OpenFreeMap Vector Tiles)</text>

  <!-- 4. GPS Geolocation Granted? -->
  <polygon points="520,315 625,352.5 520,390 415,352.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="520" y="347" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="11.5" font-weight="bold" fill="#000000">GPS Geolocation</text>
  <text x="520" y="363" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="11.5" font-weight="bold" fill="#000000">Granted?</text>

  <!-- GPS Fly to User Coordinates -->
  <rect x="150" y="415" width="240" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="270" y="437" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="bold" fill="#000000">Fly to Live User GPS Coordinates</text>
  <text x="270" y="453" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="9.5" fill="#333333">(Browser navigator.geolocation [lat, lng])</text>

  <!-- GPS Fallback to Metro Cebu Centroid -->
  <rect x="650" y="415" width="240" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="770" y="437" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="bold" fill="#000000">Fallback: Metro Cebu Centroid</text>
  <text x="770" y="453" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="9.5" fill="#333333">(Fuente Osmeña [10.3157, 123.8854])</text>

  <!-- 5. Execute Spatial Query -->
  <rect x="330" y="510" width="380" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="520" y="533" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="12" font-weight="bold" fill="#000000">Execute Spatial Query</text>
  <text x="520" y="551" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="9.5" fill="#333333">(ST_MakeEnvelope Bbox / ST_DWithin Proximity)</text>

  <!-- PostGIS Database Cylinder -->
  <g>
    <path d="M 790,512 A 87.5,12 0 0,0 965,512 L 965,562 A 87.5,12 0 0,1 790,562 Z" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
    <ellipse cx="877.5" cy="512" rx="87.5" ry="12" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
    <text x="877.5" y="537" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="10.5" font-weight="bold" fill="#000000">PostGIS Database</text>
    <text x="877.5" y="552" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="9" fill="#333333">(ST_MakeEnvelope Bbox)</text>
  </g>

  <!-- 6. Render Floating UI Surfaces -->
  <rect x="270" y="600" width="500" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="520" y="623" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="12" font-weight="bold" fill="#000000">Render Floating UI Surfaces &amp; Price Pins</text>
  <text x="520" y="641" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="9.5" fill="#333333">(Search Card, Filter Pills, Results Drawer / 3-Snap Sheet, Live Price Pins)</text>

  <!-- Ask AbangCebu AI Floating Trigger (Parallelogram) -->
  <polygon points="125,602.5 245,602.5 230,652.5 110,652.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="177.5" y="623" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="10.5" font-weight="bold" fill="#000000">&quot;Ask AbangCebu AI&quot;</text>
  <text x="177.5" y="639" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="9" fill="#333333">Floating FAB Trigger</text>

  <!-- Connector A: Ask AbangCebu AI -->
  <circle cx="177.5" cy="695" r="18" fill="#FFFFFF" stroke="#000000" stroke-width="2" />
  <text x="177.5" y="701" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="14" font-weight="bold" fill="#000000">A</text>
  <text x="177.5" y="725" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="9.5" font-weight="bold" fill="#000000">Ask AbangCebu AI</text>
  <text x="177.5" y="738" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="8.5" fill="#333333">(Module 4 NLP Assistant)</text>

  <!-- 7. User Discovery Interaction (Parallelogram) -->
  <polygon points="320,690 740,690 720,745 300,745" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="520" y="713" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="11.5" font-weight="bold" fill="#000000">User Discovery Interaction</text>
  <text x="520" y="731" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="9.5" fill="#333333">(Pan/Zoom Viewport, Landmark Search, Filter Pill Toggle, Card/Pin Hover)</text>

  <!-- 8. High-Intent Action Triggered? (Strict Binary Diamond 1) -->
  <polygon points="520,780 640,820 520,860 400,820" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="520" y="813" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="11.5" font-weight="bold" fill="#000000">High-Intent Action Triggered?</text>
  <text x="520" y="830" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="9" fill="#333333">(Favorite / Phone Unveil / Schedule Viewing)</text>

  <!-- 9. Spatial Re-Query Required? (Strict Binary Diamond 2 - NO Branch) -->
  <polygon points="250,890 355,927.5 250,965 145,927.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="250" y="922" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="11.5" font-weight="bold" fill="#000000">Spatial Re-Query</text>
  <text x="250" y="938" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="11.5" font-weight="bold" fill="#000000">Required?</text>

  <!-- 10. Bidirectional Pin Highlight & Drawer Sync -->
  <rect x="120" y="1020" width="260" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="250" y="1042" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="bold" fill="#000000">Bidirectional Pin Highlight &amp; Drawer Sync</text>
  <text x="250" y="1058" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="8.5" fill="#333333">(Highlight Pin Marker, Auto-Scroll Drawer Card, Sync Category Filter)</text>

  <!-- 11. Authenticated User? (Strict Binary Diamond 3 - YES Branch) -->
  <polygon points="790,890 895,927.5 790,965 685,927.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="790" y="922" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="11.5" font-weight="bold" fill="#000000">Authenticated User?</text>
  <text x="790" y="938" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="9" fill="#333333">(Check active Supabase session)</text>

  <!-- NO Branch: Save Viewport & Action -->
  <rect x="530" y="1020" width="220" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="640" y="1042" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="bold" fill="#000000">Save Viewport &amp; Action</text>
  <text x="640" y="1058" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="8.5" fill="#333333">(Store bbox, active pin &amp; intent in sessionStorage)</text>

  <!-- Launch Auth Modal -->
  <rect x="530" y="1115" width="220" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="640" y="1136" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="11.5" font-weight="bold" fill="#000000">Launch Auth Modal</text>
  <text x="640" y="1152" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="9.5" fill="#333333">(Prompt Login / Registration sheet)</text>

  <!-- Connector L: Login Flow -->
  <circle cx="640" cy="1220" r="18" fill="#FFFFFF" stroke="#000000" stroke-width="2" />
  <text x="640" y="1226" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="14" font-weight="bold" fill="#000000">L</text>
  <text x="670" y="1216" text-anchor="start" font-family="Helvetica, Arial, sans-serif" font-size="10.5" font-weight="bold" fill="#000000">Login Flow (SCRUM-105)</text>
  <text x="670" y="1230" text-anchor="start" font-family="Helvetica, Arial, sans-serif" font-size="9" fill="#333333">(Resume saved viewport &amp; intent upon auth)</text>

  <!-- YES Branch: Unveil Contact / Scheduler Modal -->
  <rect x="805" y="1020" width="210" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="910" y="1042" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="bold" fill="#000000">Unveil Landlord Contact /</text>
  <text x="910" y="1058" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="9" fill="#333333">Launch Viewing Scheduler Modal</text>

  <!-- Commit Inquiry / Viewing Request -->
  <rect x="805" y="1115" width="210" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="910" y="1036" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="10.5" font-weight="bold" fill="#000000"></text>
  <text x="910" y="1136" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="10.5" font-weight="bold" fill="#000000">Dispatch Inquiry Record to Db</text>
  <text x="910" y="1152" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="9" fill="#333333">(Commit to inquiries / viewings table)</text>

  <!-- 12. END -->
  <rect x="440" y="1360" width="160" height="45" rx="22.5" ry="22.5" fill="#FFFFFF" stroke="#000000" stroke-width="2.2" />
  <text x="520" y="1388" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="14" font-weight="bold" fill="#000000">END</text>

</svg>'''
    return svg

def main():
    os.makedirs("docs/flowcharts", exist_ok=True)
    os.makedirs("docs/pdf", exist_ok=True)
    os.makedirs("docs/assets/flowcharts", exist_ok=True)

    print("1. Generating Draw.io XML...")
    drawio_path = "docs/flowcharts/map-master-orchestration.drawio"
    with open(drawio_path, "w", encoding="utf-8") as f:
        f.write(build_drawio_xml())
    print(f"Saved: {drawio_path}")

    print("2. Generating Vector SVG and PDF...")
    svg_content = build_vector_svg()
    svg_path = "docs/assets/flowcharts/map-master-orchestration.svg"
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(svg_content)
    print(f"Saved: {svg_path}")

    pdf_path = "docs/pdf/map-master-orchestration.pdf"
    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page {{
      size: 1040px 1480px;
      margin: 0;
    }}
    body {{
      margin: 0;
      padding: 0;
      background: #FFFFFF;
      display: flex;
      justify-content: center;
    }}
  </style>
</head>
<body>
  {svg_content}
</body>
</html>"""
    weasyprint.HTML(string=html_content).write_pdf(pdf_path)
    print(f"Saved: {pdf_path}")

    print("3. Generating High-Res PNG via pdftoppm...")
    png_base = "/tmp/scrum116_render"
    subprocess.run(["pdftoppm", "-png", "-r", "200", pdf_path, png_base], check=True)
    rendered_png = f"{png_base}-1.png"
    target_png = "docs/assets/flowcharts/map-master-orchestration.png"
    shutil.move(rendered_png, target_png)
    print(f"Saved: {target_png}")

    # Copy to brain artifact directory
    brain_target = "/home/hrmr/.gemini/antigravity-cli/brain/e06feeb1-eae1-4d85-a539-8f5611d91249/map-master-orchestration.png"
    if os.path.exists(os.path.dirname(brain_target)):
        shutil.copyfile(target_png, brain_target)
        print(f"Copied to brain directory: {brain_target}")

    print("\nAll deliverables successfully generated!")

if __name__ == "__main__":
    main()

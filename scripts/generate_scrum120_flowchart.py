#!/usr/bin/env python3
"""
Generates the SCRUM-120 Sub-Process 2.4: Bidirectional Pin Marker & 3-Snap Gesture Drawer Flowchart in 3 formats:
1. docs/flowcharts/map-pin-drawer-sync.drawio (Draw.io XML)
2. docs/pdf/map-pin-drawer-sync.pdf (Vector PDF via weasyprint)
3. docs/assets/flowcharts/map-pin-drawer-sync.png (High-Res 200 DPI PNG via pdftoppm)

Design Style:
- Strict Black & White: white fills (#FFFFFF), black strokes (#000000), black text (#000000).
- Standard classic flowchart shapes:
  * Terminal: Rounded Stadium / Pill
  * Process: Rectangle
  * Input/Output / Action Trigger: Parallelogram
  * Decision: Rhombus / Diamond (Strictly Binary YES / NO)
  * Connector: Circle with letter (G: High-Intent Action Interception Sub-Process 2.5 - SCRUM-121)
- Grid pattern background (#E2E8F0 20px grid).
- 100% Orthogonal routing with zero collisions, zero crossing lines, and generous 60px clearances.
- Author: Karla Hiyas (Engineering Team) & Hermar Centillas (Lead Architect)
- Reviewed & Audited by: Hermar Centillas (Lead / Scrum Master)
"""

import os
import shutil
import subprocess
import weasyprint

def build_drawio_xml():
    xml = '''<mxfile host="Electron" modified="2026-10-05T09:50:00.000Z" agent="Antigravity" version="21.0.0" type="device">
  <diagram id="scrum-120-map-pin-drawer-sync" name="Sub-Process 2.4: Pin Marker &amp; 3-Snap Drawer">
    <mxGraphModel dx="1200" dy="1600" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1200" pageHeight="1450" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />

        <!-- Title -->
        <mxCell id="title" value="SCRUM-120: SUB-PROCESS 2.4 — BIDIRECTIONAL PIN MARKER &amp; 3-SNAP GESTURE DRAWER" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontFamily=Helvetica;fontSize=16;fontStyle=1;fontColor=#000000;" vertex="1" parent="1">
          <mxGeometry x="65" y="25" width="1070" height="35" as="geometry" />
        </mxCell>

        <!-- 1. START -->
        <mxCell id="node_start" value="START" style="rounded=1;arcSize=50;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=2;fontFamily=Helvetica;fontSize=14;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="470" y="75" width="160" height="45" as="geometry" />
        </mxCell>

        <!-- 2. User Interaction (Parallelogram) -->
        <mxCell id="node_user_interaction" value="User Interacts with Map Canvas, Marker Pin, or Result Card&#xa;(Hover / Click / Drag / Touch Gestures)" style="shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fixedSize=1;size=20;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="350" y="150" width="400" height="55" as="geometry" />
        </mxCell>

        <!-- 3. Diamond 1: Interaction on Marker Pin? -->
        <mxCell id="node_pin_decision" value="Interaction on&#xa;Marker Pin?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="450" y="235" width="200" height="75" as="geometry" />
        </mxCell>

        <!-- LEFT COLUMN: PIN TRIGGERED -->
        <mxCell id="node_pin_extract" value="Extract listing_id from SVG Price Pill Marker&#xa;(Target GeoJSON feature properties)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="80" y="340" width="280" height="50" as="geometry" />
        </mxCell>

        <!-- Diamond 2: Center Viewport on Pin? -->
        <mxCell id="node_fly_decision" value="Center Viewport&#xa;on Pin?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="120" y="420" width="200" height="75" as="geometry" />
        </mxCell>

        <mxCell id="node_pan_camera" value="Pan Camera to Pin Centroid&#xa;(map.easeTo({ center: [lng, lat], offset: [0, -80] }))" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=10.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="25" y="525" width="200" height="50" as="geometry" />
        </mxCell>

        <mxCell id="node_pin_sync_card" value="Invert SVG Pill &amp; Scroll Card into View&#xa;(scrollIntoView({ behavior: 'smooth', block: 'nearest' }))" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="80" y="605" width="280" height="50" as="geometry" />
        </mxCell>

        <!-- RIGHT COLUMN: CARD / DRAWER TRIGGERED -->
        <!-- Diamond 3: Interaction on Result Card? -->
        <mxCell id="node_card_decision" value="Interaction on&#xa;Result Card?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="640" y="325" width="200" height="75" as="geometry" />
        </mxCell>

        <!-- Card YES Branch -->
        <mxCell id="node_card_extract" value="Card Hover / Click Event Triggered&#xa;(Extract data-listing-id from card container)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="440" y="435" width="220" height="50" as="geometry" />
        </mxCell>

        <mxCell id="node_card_sync_pin" value="Pulse &amp; Invert Target Map Pin Marker&#xa;(setFeatureState({ hovered: true, active: true }))" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="440" y="525" width="220" height="50" as="geometry" />
        </mxCell>

        <!-- Card NO Branch (Gesture Drawer Drag / Resize) -->
        <!-- Diamond 4: Mobile Viewport Active? -->
        <mxCell id="node_mobile_decision" value="Mobile Viewport&#xa;Active?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="780" y="420" width="200" height="75" as="geometry" />
        </mxCell>

        <mxCell id="node_mobile_snap" value="Execute 3-Snap Gesture Transition&#xa;(Snap to Peek 88px, Mid 48dvh, or Full 88dvh)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=10;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="700" y="525" width="180" height="50" as="geometry" />
        </mxCell>

        <mxCell id="node_desktop_drawer" value="Toggle Desktop Floating Sidebar&#xa;(Expand / collapse 408px panel)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=10;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="900" y="525" width="180" height="50" as="geometry" />
        </mxCell>

        <!-- Diamond 5: High-Intent Action Triggered? -->
        <mxCell id="node_intent_decision" value="High-Intent Action&#xa;Triggered?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="450" y="700" width="200" height="75" as="geometry" />
        </mxCell>

        <!-- YES Branch of Diamond 5: Connector (G) to SCRUM-121 -->
        <mxCell id="node_connector_g" value="G" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=2;fontFamily=Helvetica;fontSize=14;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="200" y="805" width="40" height="40" as="geometry" />
        </mxCell>
        <mxCell id="label_connector_g" value="To High-Intent Action Sub-Process 2.5 (SCRUM-121)" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontFamily=Helvetica;fontSize=10.5;fontStyle=2;fontColor=#000000;" vertex="1" parent="1">
          <mxGeometry x="90" y="855" width="260" height="25" as="geometry" />
        </mxCell>

        <!-- NO Branch of Diamond 5: Diamond 6 User Dismisses / Pans? -->
        <mxCell id="node_dismiss_decision" value="User Dismisses&#xa;or Pans Map?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="450" y="805" width="200" height="75" as="geometry" />
        </mxCell>

        <!-- Dismiss YES -> Reset Highlights -->
        <mxCell id="node_reset_highlights" value="Reset Active Highlight States&#xa;(Revert pin &amp; card active borders)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="720" y="818" width="240" height="50" as="geometry" />
        </mxCell>

        <!-- Dismiss NO -> Retain Selection -->
        <mxCell id="node_retain_selection" value="Retain Active Selection &amp; Visible Details&#xa;(Keep current card &amp; pin highlighted)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="415" y="915" width="270" height="50" as="geometry" />
        </mxCell>

        <!-- END -->
        <mxCell id="node_end" value="END" style="rounded=1;arcSize=50;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=2;fontFamily=Helvetica;fontSize=14;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="470" y="1005" width="160" height="45" as="geometry" />
        </mxCell>

        <!-- EDGES -->
        <!-- START -> User Interaction -->
        <mxCell id="edge1" edge="1" parent="1" source="node_start" target="node_user_interaction" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- User Interaction -> Diamond 1 Pin Decision -->
        <mxCell id="edge2" edge="1" parent="1" source="node_user_interaction" target="node_pin_decision" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Pin Decision -> YES -> Pin Extract -->
        <mxCell id="edge_pin_yes" value="YES" edge="1" parent="1" source="node_pin_decision" target="node_pin_extract" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="220" y="272.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Pin Extract -> Diamond 2 Fly Decision -->
        <mxCell id="edge_pin_fly" edge="1" parent="1" source="node_pin_extract" target="node_fly_decision" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Fly Decision -> YES -> Pan Camera -->
        <mxCell id="edge_fly_yes" value="YES" edge="1" parent="1" source="node_fly_decision" target="node_pan_camera" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="125" y="457.5" />
              <mxPoint x="125" y="525" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Pan Camera -> Pin Sync Card -->
        <mxCell id="edge_pan_sync" edge="1" parent="1" source="node_pan_camera" target="node_pin_sync_card" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="125" y="590" />
              <mxPoint x="220" y="590" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Fly Decision -> NO -> Pin Sync Card -->
        <mxCell id="edge_fly_no" value="NO" edge="1" parent="1" source="node_fly_decision" target="node_pin_sync_card" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="310" y="457.5" />
              <mxPoint x="310" y="590" />
              <mxPoint x="220" y="590" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Pin Decision -> NO -> Diamond 3 Card Decision -->
        <mxCell id="edge_pin_no" value="NO" edge="1" parent="1" source="node_pin_decision" target="node_card_decision" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="740" y="272.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Card Decision -> YES -> Card Extract -->
        <mxCell id="edge_card_yes" value="YES" edge="1" parent="1" source="node_card_decision" target="node_card_extract" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="550" y="362.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Card Extract -> Card Sync Pin -->
        <mxCell id="edge_card_sync" edge="1" parent="1" source="node_card_extract" target="node_card_sync_pin" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Card Decision -> NO -> Diamond 4 Mobile Decision -->
        <mxCell id="edge_card_no" value="NO" edge="1" parent="1" source="node_card_decision" target="node_mobile_decision" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="880" y="362.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Mobile Decision -> YES -> Mobile Snap -->
        <mxCell id="edge_mob_yes" value="YES" edge="1" parent="1" source="node_mobile_decision" target="node_mobile_snap" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="790" y="457.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Mobile Decision -> NO -> Desktop Drawer -->
        <mxCell id="edge_mob_no" value="NO" edge="1" parent="1" source="node_mobile_decision" target="node_desktop_drawer" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="990" y="457.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Convergence to Diamond 5 Intent Decision (Collector bus at y=680) -->
        <mxCell id="edge_col_pin" edge="1" parent="1" source="node_pin_sync_card" target="node_intent_decision" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="220" y="680" />
              <mxPoint x="550" y="680" />
            </Array>
          </mxGeometry>
        </mxCell>

        <mxCell id="edge_col_card" edge="1" parent="1" source="node_card_sync_pin" target="node_intent_decision" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="550" y="680" />
            </Array>
          </mxGeometry>
        </mxCell>

        <mxCell id="edge_col_mob" edge="1" parent="1" source="node_mobile_snap" target="node_intent_decision" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="790" y="680" />
              <mxPoint x="550" y="680" />
            </Array>
          </mxGeometry>
        </mxCell>

        <mxCell id="edge_col_desk" edge="1" parent="1" source="node_desktop_drawer" target="node_intent_decision" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="990" y="680" />
              <mxPoint x="550" y="680" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Intent Decision -> YES -> Connector G -->
        <mxCell id="edge_intent_yes" value="YES" edge="1" parent="1" source="node_intent_decision" target="node_connector_g" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="220" y="737.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Connector G -> END -->
        <mxCell id="edge_g_end" edge="1" parent="1" source="node_connector_g" target="node_end" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="220" y="1027.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Intent Decision -> NO -> Diamond 6 Dismiss Decision (Straight Down) -->
        <mxCell id="edge_intent_no" value="NO" edge="1" parent="1" source="node_intent_decision" target="node_dismiss_decision" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Dismiss Decision -> YES -> Reset Highlights -->
        <mxCell id="edge_dismiss_yes" value="YES" edge="1" parent="1" source="node_dismiss_decision" target="node_reset_highlights" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Reset Highlights -> Loopback Bus to User Interaction -->
        <mxCell id="edge_reset_loop" edge="1" parent="1" source="node_reset_highlights" target="node_user_interaction" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="1140" y="843" />
              <mxPoint x="1140" y="177.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Dismiss Decision -> NO -> Retain Selection -->
        <mxCell id="edge_dismiss_no" value="NO" edge="1" parent="1" source="node_dismiss_decision" target="node_retain_selection" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Retain Selection -> END -->
        <mxCell id="edge_retain_end" edge="1" parent="1" source="node_retain_selection" target="node_end" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

      </root>
    </mxGraphModel>
  </diagram>
</mxfile>'''
    return xml

def build_svg_vector():
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1120" width="1200" height="1120" style="background:#FFFFFF; font-family:Helvetica, Arial, sans-serif;">
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
  <text x="600" y="45" text-anchor="middle" font-size="15" font-weight="bold" fill="#000000">SCRUM-120: SUB-PROCESS 2.4 — BIDIRECTIONAL PIN MARKER &amp; 3-SNAP GESTURE DRAWER</text>

  <!-- 1. START -->
  <rect x="520" y="75" width="160" height="45" rx="22.5" fill="#FFFFFF" stroke="#000000" stroke-width="2"/>
  <text x="600" y="103" text-anchor="middle" font-size="14" font-weight="bold" fill="#000000">START</text>

  <!-- Line 1: START -> User Interaction -->
  <path d="M 600 120 L 600 150" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>

  <!-- 2. User Interaction (Parallelogram) -->
  <polygon points="420,150 790,150 770,205 400,205" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
  <text x="595" y="172" text-anchor="middle" font-size="12" fill="#000000">User Interacts with Map Canvas, Marker Pin, or Result Card</text>
  <text x="595" y="190" text-anchor="middle" font-size="11" fill="#4A5568">(Hover / Click / Drag / Touch Gestures)</text>

  <!-- Line 2: User Interaction -> Diamond 1 -->
  <path d="M 595 205 L 595 235" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>

  <!-- 3. Diamond 1: Interaction on Marker Pin? -->
  <polygon points="595,235 695,272.5 595,310 495,272.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
  <text x="595" y="268" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Interaction on</text>
  <text x="595" y="284" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Marker Pin?</text>

  <!-- Line Pin YES -> Left Column -->
  <path d="M 495 272.5 L 220 272.5 L 220 340" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="355" y="265" text-anchor="middle" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <!-- Left Column Node 1: Extract listing_id from SVG Price Pill -->
  <rect x="80" y="340" width="280" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
  <text x="220" y="362" text-anchor="middle" font-size="11" fill="#000000">Extract listing_id from SVG Price Pill Marker</text>
  <text x="220" y="378" text-anchor="middle" font-size="10" fill="#4A5568">(Target GeoJSON feature properties)</text>

  <!-- Line Extract -> Diamond 2 -->
  <path d="M 220 390 L 220 420" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>

  <!-- Diamond 2: Center Viewport on Pin? -->
  <polygon points="220,420 320,457.5 220,495 120,457.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
  <text x="220" y="453" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Center Viewport</text>
  <text x="220" y="469" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">on Pin?</text>

  <!-- Fly YES -> Pan Camera -->
  <path d="M 120 457.5 L 110 457.5 L 110 525" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="114" y="445" text-anchor="middle" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <rect x="25" y="525" width="180" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
  <text x="115" y="546" text-anchor="middle" font-size="10.5" fill="#000000">Pan Camera to Centroid</text>
  <text x="115" y="562" text-anchor="middle" font-size="9.5" fill="#4A5568">(easeTo center &amp; offset)</text>

  <!-- Pan Camera -> Pin Sync Card -->
  <path d="M 115 575 L 115 590 L 220 590 L 220 605" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>

  <!-- Fly NO -> Pin Sync Card directly -->
  <path d="M 320 457.5 L 330 457.5 L 330 590 L 220 590" fill="none" stroke="#000000" stroke-width="1.5"/>
  <text x="326" y="445" text-anchor="middle" font-size="11" font-weight="bold" fill="#000000">NO</text>

  <rect x="80" y="605" width="280" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
  <text x="220" y="626" text-anchor="middle" font-size="11" fill="#000000">Invert SVG Pill &amp; Scroll Card into View</text>
  <text x="220" y="642" text-anchor="middle" font-size="10" fill="#4A5568">(scrollIntoView smooth nearest)</text>

  <!-- Line Pin NO -> Diamond 3 Card Decision -->
  <path d="M 695 272.5 L 750 272.5 L 750 325" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="715" y="265" text-anchor="middle" font-size="11" font-weight="bold" fill="#000000">NO</text>

  <!-- Diamond 3: Interaction on Result Card? -->
  <polygon points="750,325 850,362.5 750,400 650,362.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
  <text x="750" y="358" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Interaction on</text>
  <text x="750" y="374" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Result Card?</text>

  <!-- Card YES -> Card Extract -->
  <path d="M 650 362.5 L 550 362.5 L 550 435" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="595" y="355" text-anchor="middle" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <rect x="440" y="435" width="220" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
  <text x="550" y="456" text-anchor="middle" font-size="11" fill="#000000">Card Hover / Click Event</text>
  <text x="550" y="472" text-anchor="middle" font-size="10" fill="#4A5568">(Extract data-listing-id)</text>

  <path d="M 550 485 L 550 525" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>

  <rect x="440" y="525" width="220" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
  <text x="550" y="546" text-anchor="middle" font-size="11" fill="#000000">Pulse &amp; Invert Map Pin</text>
  <text x="550" y="562" text-anchor="middle" font-size="10" fill="#4A5568">(setFeatureState hovered=true)</text>

  <!-- Card NO -> Diamond 4 Mobile Decision -->
  <path d="M 850 362.5 L 890 362.5 L 890 420" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="870" y="355" text-anchor="middle" font-size="11" font-weight="bold" fill="#000000">NO</text>

  <!-- Diamond 4: Mobile Viewport Active? -->
  <polygon points="890,420 990,457.5 890,495 790,457.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
  <text x="890" y="453" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Mobile Viewport</text>
  <text x="890" y="469" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Active?</text>

  <!-- Mobile YES -> Mobile Snap -->
  <path d="M 790 457.5 L 775 457.5 L 775 525" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="782" y="445" text-anchor="middle" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <rect x="690" y="525" width="170" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
  <text x="775" y="546" text-anchor="middle" font-size="10" fill="#000000">Execute 3-Snap Gesture</text>
  <text x="775" y="562" text-anchor="middle" font-size="9" fill="#4A5568">(Peek 88px, Mid 48dvh, Full)</text>

  <!-- Mobile NO -> Desktop Drawer -->
  <path d="M 990 457.5 L 1005 457.5 L 1005 525" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="998" y="445" text-anchor="middle" font-size="11" font-weight="bold" fill="#000000">NO</text>

  <rect x="920" y="525" width="170" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
  <text x="1005" y="546" text-anchor="middle" font-size="10" fill="#000000">Toggle Desktop Sidebar</text>
  <text x="1005" y="562" text-anchor="middle" font-size="9" fill="#4A5568">(Expand / collapse 408px)</text>

  <!-- Convergence to Collector Bus at y=680 -->
  <!-- Left Column -> Bus -->
  <path d="M 220 655 L 220 680 L 595 680" fill="none" stroke="#000000" stroke-width="1.5"/>
  <!-- Middle Column -> Bus -->
  <path d="M 550 575 L 550 680" fill="none" stroke="#000000" stroke-width="1.5"/>
  <!-- Right Mobile -> Bus -->
  <path d="M 775 575 L 775 680" fill="none" stroke="#000000" stroke-width="1.5"/>
  <!-- Right Desktop -> Bus -->
  <path d="M 1005 575 L 1005 680 L 595 680" fill="none" stroke="#000000" stroke-width="1.5"/>

  <!-- Collector Bus drops into Diamond 5 -->
  <path d="M 595 680 L 595 700" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>

  <!-- Diamond 5: High-Intent Action Triggered? -->
  <polygon points="595,700 695,737.5 595,775 495,737.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
  <text x="595" y="733" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">High-Intent Action</text>
  <text x="595" y="749" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Triggered?</text>

  <!-- Intent YES -> Connector G -->
  <path d="M 495 737.5 L 220 737.5 L 220 805" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="350" y="730" text-anchor="middle" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <!-- Connector (G) Circle -->
  <circle cx="220" cy="825" r="20" fill="#FFFFFF" stroke="#000000" stroke-width="2"/>
  <text x="220" y="831" text-anchor="middle" font-size="14" font-weight="bold" fill="#000000">G</text>
  <text x="220" y="865" text-anchor="middle" font-size="10" font-style="italic" fill="#000000">To High-Intent Action Sub-Process 2.5 (SCRUM-121)</text>

  <!-- Connector G down to END -->
  <path d="M 220 875 L 220 1027.5 L 520 1027.5" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>

  <!-- Intent NO -> Diamond 6 Dismiss Decision (Straight Down) -->
  <path d="M 595 775 L 595 805" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="610" y="793" text-anchor="start" font-size="11" font-weight="bold" fill="#000000">NO</text>

  <!-- Diamond 6: User Dismisses or Pans Map? -->
  <polygon points="595,805 695,842.5 595,880 495,842.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
  <text x="595" y="838" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">User Dismisses</text>
  <text x="595" y="854" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">or Pans Map?</text>

  <!-- Dismiss YES -> Reset Highlights (Goes Right) -->
  <path d="M 695 842.5 L 750 842.5" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="720" y="835" text-anchor="middle" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <rect x="750" y="818" width="240" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
  <text x="870" y="839" text-anchor="middle" font-size="11" fill="#000000">Reset Active Highlight States</text>
  <text x="870" y="855" text-anchor="middle" font-size="10" fill="#4A5568">(Revert pin &amp; card active borders)</text>

  <!-- Loopback Bus: Reset Highlights -> User Interaction at x=1140 (Zero Collision!) -->
  <path d="M 990 842.5 L 1140 842.5 L 1140 177.5 L 780 177.5" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>

  <!-- Dismiss NO -> Retain Selection (Straight Down) -->
  <path d="M 595 880 L 595 915" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="610" y="900" text-anchor="start" font-size="11" font-weight="bold" fill="#000000">NO</text>

  <rect x="460" y="915" width="270" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
  <text x="595" y="936" text-anchor="middle" font-size="11" fill="#000000">Retain Active Selection &amp; Visible Details</text>
  <text x="595" y="952" text-anchor="middle" font-size="10" fill="#4A5568">(Keep current card &amp; pin active)</text>

  <!-- Retain Selection -> END (Straight Down) -->
  <path d="M 595 965 L 595 1005" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>

  <!-- END -->
  <rect x="515" y="1005" width="160" height="45" rx="22.5" fill="#FFFFFF" stroke="#000000" stroke-width="2"/>
  <text x="595" y="1033" text-anchor="middle" font-size="14" font-weight="bold" fill="#000000">END</text>

</svg>'''
    return svg

def main():
    print("Generating SCRUM-120 Sub-Process 2.4: Bidirectional Pin Marker & 3-Snap Gesture Drawer Deliverables...", flush=True)
    os.makedirs('docs/flowcharts', exist_ok=True)
    os.makedirs('docs/pdf', exist_ok=True)
    os.makedirs('docs/assets/flowcharts', exist_ok=True)

    # 1. Write Draw.io XML
    drawio_path = 'docs/flowcharts/map-pin-drawer-sync.drawio'
    with open(drawio_path, 'w', encoding='utf-8') as f:
        f.write(build_drawio_xml())
    print(f"Created: {drawio_path}", flush=True)

    # 2. Write SVG
    svg_path = 'docs/assets/flowcharts/map-pin-drawer-sync.svg'
    svg_content = build_svg_vector()
    with open(svg_path, 'w', encoding='utf-8') as f:
        f.write(svg_content)
    print(f"Created: {svg_path}", flush=True)

    # 3. Compile Vector PDF using WeasyPrint
    pdf_path = 'docs/pdf/map-pin-drawer-sync.pdf'
    html_content = f'''<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {{
    size: 1200px 1120px;
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
    png_path = 'docs/assets/flowcharts/map-pin-drawer-sync.png'
    prefix = '/tmp/scrum120_render'
    cmd = ['pdftoppm', '-png', '-r', '200', pdf_path, prefix]
    subprocess.run(cmd, check=True)
    generated_png = f"{prefix}-1.png"
    if os.path.exists(generated_png):
        shutil.move(generated_png, png_path)
        print(f"Created: {png_path}", flush=True)

    # 5. Copy to brain artifact directory
    brain_dir = '/home/hrmr/.gemini/antigravity-cli/brain/e06feeb1-eae1-4d85-a539-8f5611d91249'
    brain_png = os.path.join(brain_dir, 'map-pin-drawer-sync.png')
    shutil.copyfile(png_path, brain_png)
    print(f"Copied to brain: {brain_png}", flush=True)

if __name__ == '__main__':
    main()

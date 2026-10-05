#!/usr/bin/env python3
"""
Generates the SCRUM-119 Sub-Process 2.3: Multi-Criteria Filter Pills & URL State Sync Flowchart in 3 formats:
1. docs/flowcharts/map-filtering-url-sync.drawio (Draw.io XML)
2. docs/pdf/map-filtering-url-sync.pdf (Vector PDF via weasyprint)
3. docs/assets/flowcharts/map-filtering-url-sync.png (High-Res 200 DPI PNG via pdftoppm)

Design Style:
- Strict Black & White: white fills (#FFFFFF), black strokes (#000000), black text (#000000).
- Standard classic flowchart shapes:
  * Terminal: Rounded Stadium / Pill
  * Process: Rectangle
  * Input/Output / Action Trigger: Parallelogram
  * Decision: Rhombus / Diamond (Strictly Binary YES / NO)
  * Database: 3D Cylinder with dashed query lines
  * Connector: Circle with letter (D: Bidirectional Pin Marker & Drawer Sub-Process 2.4 - SCRUM-120)
- Grid pattern background (#E2E8F0 20px grid).
- 100% Orthogonal routing with zero collisions.
- Author: Joan Marie Inting (Engineering Team) & Hermar Centillas (Lead Architect)
- Reviewed & Audited by: Hermar Centillas (Lead / Scrum Master)
"""

import os
import shutil
import subprocess
import weasyprint

def build_drawio_xml():
    xml = '''<mxfile host="Electron" modified="2026-10-05T09:30:00.000Z" agent="Antigravity" version="21.0.0" type="device">
  <diagram id="scrum-119-map-filtering-sync" name="Sub-Process 2.3: Filter Pills &amp; URL Sync">
    <mxGraphModel dx="1200" dy="1600" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1050" pageHeight="1300" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />

        <!-- Title -->
        <mxCell id="title" value="SCRUM-119: SUB-PROCESS 2.3 — MULTI-CRITERIA FILTER PILLS &amp; URL STATE SYNC" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontFamily=Helvetica;fontSize=16;fontStyle=1;fontColor=#000000;" vertex="1" parent="1">
          <mxGeometry x="65" y="25" width="870" height="35" as="geometry" />
        </mxCell>

        <!-- 1. START -->
        <mxCell id="node_start" value="START" style="rounded=1;arcSize=50;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=2;fontFamily=Helvetica;fontSize=14;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="420" y="70" width="160" height="45" as="geometry" />
        </mxCell>

        <!-- 2. User Filter Interaction (Parallelogram) -->
        <mxCell id="node_filter_entry" value="User Toggles Filter Pill or Submits Filter Sheet&#xa;(Property Type, Price Range, Gender Policy, Amenities, Curfew)" style="shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fixedSize=1;size=20;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="315" y="145" width="370" height="55" as="geometry" />
        </mxCell>

        <!-- 3. Valid Filter Criteria? (Strict Binary Diamond 1) -->
        <mxCell id="node_criteria_decision" value="Valid Filter&#xa;Criteria?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="400" y="230" width="200" height="75" as="geometry" />
        </mxCell>

        <!-- NO Branch: Filter Error / Reset -->
        <mxCell id="node_filter_error" value="Display Validation Notice &amp; Reset Field&#xa;(&quot;Min rent cannot exceed Max rent&quot;)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="670" y="335" width="270" height="50" as="geometry" />
        </mxCell>

        <!-- 4. Filter State Changed? (Strict Binary Diamond 2) -->
        <mxCell id="node_changed_decision" value="Filter State&#xa;Changed?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="400" y="335" width="200" height="75" as="geometry" />
        </mxCell>

        <!-- NO Branch: Retain Current Viewport -->
        <mxCell id="node_no_op" value="Retain Active Viewport State&#xa;(Skip redundant network re-fetch)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="90" y="440" width="260" height="50" as="geometry" />
        </mxCell>

        <!-- 5. Construct Predicate & URL Params -->
        <mxCell id="node_build_predicate" value="Construct Filter Predicate &amp; Sync URL&#xa;(Update ?type=..&amp;maxRent=..&amp;aircon=.. via replaceState)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="315" y="440" width="370" height="55" as="geometry" />
        </mxCell>

        <!-- 6. Execute Filtered PostGIS Query -->
        <mxCell id="node_query_filtered" value="Execute Filtered PostGIS Spatial Query&#xa;(ST_Intersects Bbox + WHERE property_type, rent, amenities)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="315" y="525" width="370" height="55" as="geometry" />
        </mxCell>

        <!-- PostGIS Database Cylinder -->
        <mxCell id="node_postgis_db" value="PostGIS Database&#xa;(properties, rental_units,&#xa;property_amenities)" style="shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="740" y="515" width="170" height="75" as="geometry" />
        </mxCell>

        <!-- 7. Matching Units Found? (Strict Binary Diamond 3) -->
        <mxCell id="node_match_decision" value="Matching Units&#xa;Found?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="400" y="610" width="200" height="75" as="geometry" />
        </mxCell>

        <!-- NO Branch: Empty State Sheet -->
        <mxCell id="node_empty_filter" value="Render Empty State with &quot;Reset Filters&quot; CTA&#xa;(&quot;No units match criteria. Try clearing filters.&quot;)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="670" y="715" width="270" height="55" as="geometry" />
        </mxCell>

        <!-- 8. Update Map Marker Layer -->
        <mxCell id="node_update_pins" value="Update Map Marker Layer &amp; Price Pills&#xa;(Filter GeoJSON client source: remove/add markers)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="315" y="715" width="370" height="55" as="geometry" />
        </mxCell>

        <!-- 9. Refresh Results Drawer Counter -->
        <mxCell id="node_update_drawer" value="Refresh Results Drawer &amp; Counter&#xa;(Display &quot;Showing X verified rentals in this area&quot;)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="315" y="800" width="370" height="55" as="geometry" />
        </mxCell>

        <!-- 10. Persist Active Filters in SessionStorage -->
        <mxCell id="node_cache_state" value="Persist Active Filters to SessionStorage&#xa;(Key: abangcebu_active_filters for multi-tab sync)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="315" y="885" width="370" height="50" as="geometry" />
        </mxCell>

        <!-- 11. Connector D: Pin Marker & Drawer Sub-Process -->
        <mxCell id="node_connector_d" value="D" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=2;fontFamily=Helvetica;fontSize=14;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="480" y="965" width="40" height="40" as="geometry" />
        </mxCell>
        <mxCell id="label_connector_d" value="To Pin Marker &amp; 3-Snap Drawer Sub-Process 2.4 (SCRUM-120)" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontFamily=Helvetica;fontSize=11;fontStyle=2;fontColor=#000000;" vertex="1" parent="1">
          <mxGeometry x="530" y="970" width="340" height="30" as="geometry" />
        </mxCell>

        <!-- 12. END -->
        <mxCell id="node_end" value="END" style="rounded=1;arcSize=50;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=2;fontFamily=Helvetica;fontSize=14;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="420" y="1045" width="160" height="45" as="geometry" />
        </mxCell>

        <!-- EDGES -->
        <!-- START -> Filter Entry -->
        <mxCell id="edge1" edge="1" parent="1" source="node_start" target="node_filter_entry" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Filter Entry -> Criteria Decision -->
        <mxCell id="edge2" edge="1" parent="1" source="node_filter_entry" target="node_criteria_decision" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Criteria Decision -> NO -> Filter Error -->
        <mxCell id="edge_crit_no" value="NO" edge="1" parent="1" source="node_criteria_decision" target="node_filter_error" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="805" y="267.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Filter Error -> Loopback to Filter Entry -->
        <mxCell id="edge_error_loop" edge="1" parent="1" source="node_filter_error" target="node_filter_entry" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="960" y="360" />
              <mxPoint x="960" y="172.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Criteria Decision -> YES -> Changed Decision -->
        <mxCell id="edge_crit_yes" value="YES" edge="1" parent="1" source="node_criteria_decision" target="node_changed_decision" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Changed Decision -> NO -> No-Op Retain -->
        <mxCell id="edge_change_no" value="NO" edge="1" parent="1" source="node_changed_decision" target="node_no_op" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="220" y="372.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- No-Op Retain -> END (Left bypass) -->
        <mxCell id="edge_noop_to_end" edge="1" parent="1" source="node_no_op" target="node_end" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="220" y="1067.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Changed Decision -> YES -> Build Predicate -->
        <mxCell id="edge_change_yes" value="YES" edge="1" parent="1" source="node_changed_decision" target="node_build_predicate" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Build Predicate -> Query Filtered -->
        <mxCell id="edge_pred_query" edge="1" parent="1" source="node_build_predicate" target="node_query_filtered" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Query Filtered <---> Database (Dashed) -->
        <mxCell id="edge_query_db" value="SQL Predicate" edge="1" parent="1" source="node_query_filtered" target="node_postgis_db" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;dashed=1;fontFamily=Helvetica;fontSize=9.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Query Filtered -> Match Decision -->
        <mxCell id="edge_query_match" edge="1" parent="1" source="node_query_filtered" target="node_match_decision" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Match Decision -> NO -> Empty Filter -->
        <mxCell id="edge_match_no" value="NO" edge="1" parent="1" source="node_match_decision" target="node_empty_filter" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="805" y="647.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Empty Filter -> END (Right bypass) -->
        <mxCell id="edge_empty_to_end" edge="1" parent="1" source="node_empty_filter" target="node_end" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="805" y="1067.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Match Decision -> YES -> Update Pins -->
        <mxCell id="edge_match_yes" value="YES" edge="1" parent="1" source="node_match_decision" target="node_update_pins" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Update Pins -> Update Drawer -->
        <mxCell id="edge_pins_drawer" edge="1" parent="1" source="node_update_pins" target="node_update_drawer" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Update Drawer -> Cache State -->
        <mxCell id="edge_drawer_cache" edge="1" parent="1" source="node_update_drawer" target="node_cache_state" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Cache State -> Connector D -->
        <mxCell id="edge_cache_conn" edge="1" parent="1" source="node_cache_state" target="node_connector_d" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Connector D -> END -->
        <mxCell id="edge_conn_end" edge="1" parent="1" source="node_connector_d" target="node_end" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

      </root>
    </mxGraphModel>
  </diagram>
</mxfile>'''
    return xml

def build_svg():
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1050 1300" width="1050" height="1300" style="background-color: #ffffff; font-family: Helvetica, Arial, sans-serif;">
  <defs>
    <!-- 20px Grid Pattern -->
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E2E8F0" stroke-width="0.8" />
    </pattern>
    <!-- Arrow Marker -->
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#000000" />
    </marker>
    <marker id="arrow-start" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 8 1.5 L 0 5 L 8 8.5 z" fill="#000000" />
    </marker>
  </defs>

  <!-- Background Grid -->
  <rect width="1050" height="1300" fill="url(#grid)" />

  <!-- Title Banner -->
  <text x="525" y="48" font-size="15" font-weight="bold" text-anchor="middle" fill="#000000" letter-spacing="0.5">
    SCRUM-119: SUB-PROCESS 2.3 — MULTI-CRITERIA FILTER PILLS &amp; URL STATE SYNC
  </text>

  <!-- CONNECTING LINES -->
  <!-- START -> Filter Entry -->
  <path d="M 500 115 L 500 145" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- Filter Entry -> Criteria Decision -->
  <path d="M 500 200 L 500 230" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- Criteria Decision -> NO -> Filter Error -->
  <path d="M 600 267.5 L 805 267.5 L 805 335" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />
  <rect x="690" y="256" width="32" height="20" fill="#FFFFFF" stroke="#000000" stroke-width="1" rx="3" />
  <text x="706" y="270" font-size="11" font-weight="bold" text-anchor="middle" fill="#000000">NO</text>

  <!-- Filter Error -> Loopback to Filter Entry (Right Loop) -->
  <path d="M 805 385 L 805 405 L 970 405 L 970 172.5 L 685 172.5" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- Criteria Decision -> YES -> Changed Decision -->
  <path d="M 500 305 L 500 335" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />
  <rect x="505" y="308" width="36" height="20" fill="#FFFFFF" stroke="#000000" stroke-width="1" rx="3" />
  <text x="523" y="322" font-size="11" font-weight="bold" text-anchor="middle" fill="#000000">YES</text>

  <!-- Changed Decision -> NO -> No-Op Retain -->
  <path d="M 400 372.5 L 220 372.5 L 220 440" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />
  <rect x="290" y="361" width="32" height="20" fill="#FFFFFF" stroke="#000000" stroke-width="1" rx="3" />
  <text x="306" y="375" font-size="11" font-weight="bold" text-anchor="middle" fill="#000000">NO</text>

  <!-- No-Op Retain -> END (Left bypass) -->
  <path d="M 220 490 L 220 1067.5 L 420 1067.5" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- Changed Decision -> YES -> Build Predicate -->
  <path d="M 500 410 L 500 440" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />
  <rect x="505" y="413" width="36" height="20" fill="#FFFFFF" stroke="#000000" stroke-width="1" rx="3" />
  <text x="523" y="427" font-size="11" font-weight="bold" text-anchor="middle" fill="#000000">YES</text>

  <!-- Build Predicate -> Query Filtered -->
  <path d="M 500 495 L 500 525" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- Query Filtered <---> Database (Dashed) -->
  <path d="M 685 552.5 L 740 552.5" fill="none" stroke="#000000" stroke-width="1.5" stroke-dasharray="4,3" marker-start="url(#arrow-start)" marker-end="url(#arrow)" />
  <rect x="688" y="538" width="50" height="15" fill="#FFFFFF" />
  <text x="713" y="549" font-size="8.5" text-anchor="middle" fill="#333333">SQL Filter</text>

  <!-- Query Filtered -> Match Decision -->
  <path d="M 500 580 L 500 610" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- Match Decision -> NO -> Empty Filter -->
  <path d="M 600 647.5 L 805 647.5 L 805 715" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />
  <rect x="690" y="636" width="32" height="20" fill="#FFFFFF" stroke="#000000" stroke-width="1" rx="3" />
  <text x="706" y="650" font-size="11" font-weight="bold" text-anchor="middle" fill="#000000">NO</text>

  <!-- Empty Filter -> END (Right bypass) -->
  <path d="M 805 770 L 805 1067.5 L 580 1067.5" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- Match Decision -> YES -> Update Pins -->
  <path d="M 500 685 L 500 715" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />
  <rect x="505" y="688" width="36" height="20" fill="#FFFFFF" stroke="#000000" stroke-width="1" rx="3" />
  <text x="523" y="702" font-size="11" font-weight="bold" text-anchor="middle" fill="#000000">YES</text>

  <!-- Update Pins -> Update Drawer -->
  <path d="M 500 770 L 500 800" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- Update Drawer -> Cache State -->
  <path d="M 500 855 L 500 885" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- Cache State -> Connector D -->
  <path d="M 500 935 L 500 965" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- Connector D -> END -->
  <path d="M 500 1005 L 500 1045" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />


  <!-- NODES -->

  <!-- 1. START (Stadium) -->
  <rect x="420" y="70" width="160" height="45" rx="22.5" ry="22.5" fill="#FFFFFF" stroke="#000000" stroke-width="2" />
  <text x="500" y="98" font-size="14" font-weight="bold" text-anchor="middle" fill="#000000">START</text>

  <!-- 2. User Filter Interaction (Parallelogram) -->
  <polygon points="335,145 685,145 665,200 315,200" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="500" y="168" font-size="12" font-weight="bold" text-anchor="middle" fill="#000000">User Toggles Filter Pill or Submits Filter Sheet</text>
  <text x="500" y="186" font-size="11" text-anchor="middle" fill="#000000">(Property Type, Price Range, Gender Policy, Amenities, Curfew)</text>

  <!-- 3. Valid Filter Criteria? (Diamond) -->
  <polygon points="500,230 600,267.5 500,305 400,267.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="500" y="263" font-size="12" font-weight="bold" text-anchor="middle" fill="#000000">Valid Filter</text>
  <text x="500" y="278" font-size="12" font-weight="bold" text-anchor="middle" fill="#000000">Criteria?</text>

  <!-- Filter Error / Notice (Rectangle) -->
  <rect x="670" y="335" width="270" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="805" y="356" font-size="11.5" font-weight="bold" text-anchor="middle" fill="#000000">Display Validation Notice &amp; Reset Field</text>
  <text x="805" y="373" font-size="10" text-anchor="middle" fill="#000000">(&quot;Min rent cannot exceed Max rent&quot;)</text>

  <!-- 4. Filter State Changed? (Diamond) -->
  <polygon points="500,335 600,372.5 500,410 400,372.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="500" y="368" font-size="12" font-weight="bold" text-anchor="middle" fill="#000000">Filter State</text>
  <text x="500" y="383" font-size="12" font-weight="bold" text-anchor="middle" fill="#000000">Changed?</text>

  <!-- Retain Current State (Rectangle) -->
  <rect x="90" y="440" width="260" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="220" y="461" font-size="11.5" font-weight="bold" text-anchor="middle" fill="#000000">Retain Active Viewport State</text>
  <text x="220" y="478" font-size="10" text-anchor="middle" fill="#000000">(Skip redundant network re-fetch)</text>

  <!-- 5. Construct Predicate & URL Params (Rectangle) -->
  <rect x="315" y="440" width="370" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="500" y="463" font-size="12" font-weight="bold" text-anchor="middle" fill="#000000">Construct Filter Predicate &amp; Sync URL</text>
  <text x="500" y="481" font-size="10.5" text-anchor="middle" fill="#000000">(Update ?type=..&amp;maxRent=..&amp;aircon=.. via replaceState)</text>

  <!-- 6. Execute Filtered PostGIS Query (Rectangle) -->
  <rect x="315" y="525" width="370" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="500" y="548" font-size="12" font-weight="bold" text-anchor="middle" fill="#000000">Execute Filtered PostGIS Spatial Query</text>
  <text x="500" y="566" font-size="10.5" text-anchor="middle" fill="#000000">(ST_Intersects Bbox + WHERE property_type, rent, amenities)</text>

  <!-- PostGIS Database Cylinder -->
  <g>
    <path d="M 740,527 A 85,12 0 0,0 910,527 L 910,577 A 85,12 0 0,1 740,577 Z" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
    <ellipse cx="825" cy="527" rx="85" ry="12" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
    <text x="825" y="552" font-size="11" font-weight="bold" text-anchor="middle" fill="#000000">PostGIS Database</text>
    <text x="825" y="566" font-size="9" text-anchor="middle" fill="#333333">(properties, rental_units)</text>
    <text x="825" y="578" font-size="8.5" text-anchor="middle" fill="#333333">(property_amenities)</text>
  </g>

  <!-- 7. Matching Units Found? (Diamond) -->
  <polygon points="500,610 600,647.5 500,685 400,647.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="500" y="643" font-size="12" font-weight="bold" text-anchor="middle" fill="#000000">Matching Units</text>
  <text x="500" y="658" font-size="12" font-weight="bold" text-anchor="middle" fill="#000000">Found?</text>

  <!-- Empty State Sheet (Rectangle) -->
  <rect x="670" y="715" width="270" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="805" y="738" font-size="11.5" font-weight="bold" text-anchor="middle" fill="#000000">Render Empty State with &quot;Reset Filters&quot; CTA</text>
  <text x="805" y="756" font-size="10" text-anchor="middle" fill="#000000">(&quot;No units match criteria. Try clearing filters.&quot;)</text>

  <!-- 8. Update Map Marker Layer (Rectangle) -->
  <rect x="315" y="715" width="370" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="500" y="738" font-size="12" font-weight="bold" text-anchor="middle" fill="#000000">Update Map Marker Layer &amp; Price Pills</text>
  <text x="500" y="756" font-size="10.5" text-anchor="middle" fill="#000000">(Filter GeoJSON client source: remove/add markers)</text>

  <!-- 9. Refresh Results Drawer Counter (Rectangle) -->
  <rect x="315" y="800" width="370" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="500" y="823" font-size="12" font-weight="bold" text-anchor="middle" fill="#000000">Refresh Results Drawer &amp; Counter</text>
  <text x="500" y="841" font-size="10.5" text-anchor="middle" fill="#000000">(Display &quot;Showing X verified rentals in this area&quot;)</text>

  <!-- 10. Persist Active Filters in SessionStorage (Rectangle) -->
  <rect x="315" y="885" width="370" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="500" y="907" font-size="11.5" font-weight="bold" text-anchor="middle" fill="#000000">Persist Active Filters to SessionStorage</text>
  <text x="500" y="924" font-size="10" text-anchor="middle" fill="#000000">(Key: abangcebu_active_filters for multi-tab sync)</text>

  <!-- 11. Connector D (Circle) -->
  <circle cx="500" cy="985" r="20" fill="#FFFFFF" stroke="#000000" stroke-width="2" />
  <text x="500" y="991" font-size="14" font-weight="bold" text-anchor="middle" fill="#000000">D</text>
  <text x="680" y="990" font-size="11" font-style="italic" text-anchor="middle" fill="#000000">
    To Pin Marker &amp; 3-Snap Drawer Sub-Process 2.4 (SCRUM-120)
  </text>

  <!-- 12. END (Stadium) -->
  <rect x="420" y="1045" width="160" height="45" rx="22.5" ry="22.5" fill="#FFFFFF" stroke="#000000" stroke-width="2" />
  <text x="500" y="1073" font-size="14" font-weight="bold" text-anchor="middle" fill="#000000">END</text>

  <!-- Footer Info -->
  <text x="50" y="1270" font-size="9" fill="#555555">AbangCebu AI — Sprint 2 Architecture Specification | Sub-Process 2.3 Filter Pills &amp; URL Sync</text>
  <text x="1000" y="1270" font-size="9" fill="#555555" text-anchor="end">Engineered for Metro Cebu Spatial Discovery</text>
</svg>'''
    return svg

def main():
    print("1. Generating Draw.io XML...", flush=True)
    xml_content = build_drawio_xml()
    drawio_path = "docs/flowcharts/map-filtering-url-sync.drawio"
    os.makedirs(os.path.dirname(drawio_path), exist_ok=True)
    with open(drawio_path, "w", encoding="utf-8") as f:
        f.write(xml_content)
    print(f"Saved: {drawio_path}", flush=True)

    print("2. Generating Vector SVG and PDF...", flush=True)
    svg_content = build_svg()
    svg_path = "docs/assets/flowcharts/map-filtering-url-sync.svg"
    os.makedirs(os.path.dirname(svg_path), exist_ok=True)
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(svg_content)
    print(f"Saved: {svg_path}", flush=True)

    pdf_path = "docs/pdf/map-filtering-url-sync.pdf"
    os.makedirs(os.path.dirname(pdf_path), exist_ok=True)

    html_content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {{
    size: 1050px 1300px;
    margin: 0;
  }}
  body {{
    margin: 0;
    padding: 0;
    background: #ffffff;
  }}
</style>
</head>
<body>
{svg_content}
</body>
</html>"""

    weasyprint.HTML(string=html_content).write_pdf(pdf_path)
    print(f"Saved: {pdf_path}", flush=True)

    print("3. Generating High-Res PNG via pdftoppm...", flush=True)
    png_base = "docs/assets/flowcharts/map-filtering-url-sync-temp"
    subprocess.run(["pdftoppm", "-png", "-r", "200", pdf_path, png_base], check=True)
    generated_png = f"{png_base}-1.png"
    final_png_path = "docs/assets/flowcharts/map-filtering-url-sync.png"
    if os.path.exists(generated_png):
        shutil.move(generated_png, final_png_path)
        print(f"Saved: {final_png_path}", flush=True)
    
    # Brain artifact copy
    brain_dir = "/home/hrmr/.gemini/antigravity-cli/brain/e06feeb1-eae1-4d85-a539-8f5611d91249"
    brain_png = os.path.join(brain_dir, "map-filtering-url-sync.png")
    shutil.copyfile(final_png_path, brain_png)
    print(f"Copied to brain directory: {brain_png}", flush=True)

    print("\nAll deliverables for SCRUM-119 successfully generated!", flush=True)

if __name__ == "__main__":
    main()

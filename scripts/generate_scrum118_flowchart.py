#!/usr/bin/env python3
"""
Generates the SCRUM-118 Sub-Process 2.2: Spatial Search, Landmark Auto-Suggest & PostGIS Query Flowchart in 3 formats:
1. docs/flowcharts/map-search-spatial-query.drawio (Draw.io XML)
2. docs/pdf/map-search-spatial-query.pdf (Vector PDF via weasyprint)
3. docs/assets/flowcharts/map-search-spatial-query.png (High-Res 200 DPI PNG via pdftoppm)

Design Style:
- Strict Black & White: white fills (#FFFFFF), black strokes (#000000), black text (#000000).
- Standard classic flowchart shapes:
  * Terminal: Rounded Stadium / Pill
  * Process: Rectangle
  * Input/Output / Action Trigger: Parallelogram
  * Decision: Rhombus / Diamond (Strictly Binary YES / NO)
  * Database: 3D Cylinder with dashed query lines
  * Connector: Circle with letter (F: Filter Pills Sub-Process 2.3 - SCRUM-119)
- Grid pattern background (#E2E8F0 20px grid).
- 100% Orthogonal routing with zero collisions.
- Author: John Lloyd Ando (Engineering Team) & Hermar Centillas (Lead Architect)
- Reviewed & Audited by: Hermar Centillas (Lead / Scrum Master)
"""

import os
import shutil
import subprocess
import weasyprint

def build_drawio_xml():
    xml = '''<mxfile host="Electron" modified="2026-10-05T09:15:00.000Z" agent="Antigravity" version="21.0.0" type="device">
  <diagram id="scrum-118-map-search-query" name="Sub-Process 2.2: Spatial Search &amp; PostGIS Query">
    <mxGraphModel dx="1200" dy="1600" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1050" pageHeight="1450" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />

        <!-- Title -->
        <mxCell id="title" value="SCRUM-118: SUB-PROCESS 2.2 — SPATIAL SEARCH, LANDMARK AUTO-SUGGEST &amp; POSTGIS QUERY" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontFamily=Helvetica;fontSize=16;fontStyle=1;fontColor=#000000;" vertex="1" parent="1">
          <mxGeometry x="65" y="25" width="870" height="35" as="geometry" />
        </mxCell>

        <!-- 1. START -->
        <mxCell id="node_start" value="START" style="rounded=1;arcSize=50;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=2;fontFamily=Helvetica;fontSize=14;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="420" y="70" width="160" height="45" as="geometry" />
        </mxCell>

        <!-- 2. User Search Interaction (Parallelogram) -->
        <mxCell id="node_search_entry" value="User Interacts with Spatial Search Bar&#xa;(Type text, select landmark suggestion, or pan viewport)" style="shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fixedSize=1;size=20;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="315" y="145" width="370" height="55" as="geometry" />
        </mxCell>

        <!-- 3. Landmark Selected? (Strict Binary Diamond 1) -->
        <mxCell id="node_landmark_decision" value="Landmark&#xa;Selected?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="400" y="230" width="200" height="75" as="geometry" />
        </mxCell>

        <!-- YES Branch (Left): Resolve Landmark Coordinates -->
        <mxCell id="node_resolve_landmark" value="Resolve Landmark Geocoding &amp; Centroid&#xa;(Cebu IT Park, USC-TC, CIT-U, Ayala Center, UC Main)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="70" y="335" width="290" height="55" as="geometry" />
        </mxCell>

        <!-- Fly Camera to Landmark -->
        <mxCell id="node_fly_landmark" value="Fly Camera to Landmark Centroid&#xa;(map.flyTo({ center: [lng, lat], zoom: 15.0 }))" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="70" y="420" width="290" height="50" as="geometry" />
        </mxCell>

        <!-- Proximity Query -->
        <mxCell id="node_query_proximity" value="Execute ST_DWithin Proximity Query&#xa;(ST_DWithin(coordinates, ST_Point(lng,lat), 1500m))" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="70" y="500" width="290" height="55" as="geometry" />
        </mxCell>

        <!-- NO Branch (Right): Extract Viewport Bbox -->
        <mxCell id="node_extract_bbox" value="Extract Active Viewport Bounding Box&#xa;(map.getBounds() -&gt; [minLng, minLat, maxLng, maxLat])" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="640" y="335" width="290" height="55" as="geometry" />
        </mxCell>

        <!-- Viewport Bbox Query -->
        <mxCell id="node_query_bbox" value="Execute ST_MakeEnvelope Bbox Query&#xa;(ST_Intersects(coordinates, ST_MakeEnvelope(...)))" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="640" y="500" width="290" height="55" as="geometry" />
        </mxCell>

        <!-- PostGIS Database Cylinder -->
        <mxCell id="node_postgis_db" value="PostGIS Database&#xa;(properties, rental_units,&#xa;GiST spatial indexes)" style="shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="415" y="490" width="170" height="75" as="geometry" />
        </mxCell>

        <!-- 4. Active Listings Found? (Strict Binary Diamond 2) -->
        <mxCell id="node_results_decision" value="Active Listings&#xa;Found?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="400" y="605" width="200" height="75" as="geometry" />
        </mxCell>

        <!-- NO Branch: Empty State Drawer -->
        <mxCell id="node_empty_state" value="Render Empty State Sheet &amp; Guidance&#xa;(&quot;No rentals found. Expand radius or pan map.&quot;)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="670" y="700" width="270" height="55" as="geometry" />
        </mxCell>

        <!-- 5. Density > 15 Units? (Strict Binary Diamond 3) -->
        <mxCell id="node_density_decision" value="Cluster Density&#xa;&gt; 15 Units in Cell?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="390" y="710" width="220" height="75" as="geometry" />
        </mxCell>

        <!-- YES: Render Cluster Bubbles -->
        <mxCell id="node_render_clusters" value="Render Clustered Bubble Markers&#xa;(Numeric count [15+], spiderfy on tap)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="110" y="815" width="260" height="55" as="geometry" />
        </mxCell>

        <!-- NO: Render Price Pins -->
        <mxCell id="node_render_price_pins" value="Render Custom SVG Price Pins&#xa;(Individual listing pills e.g. &quot;₱4,500/mo&quot;)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="490" y="815" width="260" height="55" as="geometry" />
        </mxCell>

        <!-- 6. Populate Floating Results Drawer -->
        <mxCell id="node_populate_drawer" value="Populate Floating Results Drawer / 3-Snap Sheet&#xa;(Rental cards, verified badges, monthly rent, distance tags)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="315" y="905" width="370" height="55" as="geometry" />
        </mxCell>

        <!-- 7. Sync Spatial Query State to URL -->
        <mxCell id="node_url_sync" value="Sync Spatial Query State to URL SearchParams&#xa;(Update ?landmark=.. or ?bbox=.. via window.history.replaceState)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="315" y="990" width="370" height="55" as="geometry" />
        </mxCell>

        <!-- 8. Register Viewport Settle Listener -->
        <mxCell id="node_attach_listeners" value="Register Viewport Settle &amp; Idle Listener&#xa;(Trigger debounced spatial re-query on user pan/drag settle)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="315" y="1075" width="370" height="50" as="geometry" />
        </mxCell>

        <!-- 9. Connector F: Filter Pills Sub-Process -->
        <mxCell id="node_connector_f" value="F" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=2;fontFamily=Helvetica;fontSize=14;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="480" y="1155" width="40" height="40" as="geometry" />
        </mxCell>
        <mxCell id="label_connector_f" value="To Multi-Criteria Filter Pills Sub-Process 2.3 (SCRUM-119)" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontFamily=Helvetica;fontSize=11;fontStyle=2;fontColor=#000000;" vertex="1" parent="1">
          <mxGeometry x="530" y="1160" width="320" height="30" as="geometry" />
        </mxCell>

        <!-- 10. END -->
        <mxCell id="node_end" value="END" style="rounded=1;arcSize=50;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=2;fontFamily=Helvetica;fontSize=14;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="420" y="1235" width="160" height="45" as="geometry" />
        </mxCell>

        <!-- EDGES -->
        <!-- START -> Search Entry -->
        <mxCell id="edge1" edge="1" parent="1" source="node_start" target="node_search_entry" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Search Entry -> Landmark Decision -->
        <mxCell id="edge2" edge="1" parent="1" source="node_search_entry" target="node_landmark_decision" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Landmark Decision -> YES -> Resolve Landmark -->
        <mxCell id="edge_landmark_yes" value="YES" edge="1" parent="1" source="node_landmark_decision" target="node_resolve_landmark" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="215" y="267.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Resolve Landmark -> Fly Landmark -->
        <mxCell id="edge_res_fly" edge="1" parent="1" source="node_resolve_landmark" target="node_fly_landmark" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Fly Landmark -> Proximity Query -->
        <mxCell id="edge_fly_prox" edge="1" parent="1" source="node_fly_landmark" target="node_query_proximity" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Landmark Decision -> NO -> Extract Viewport Bbox -->
        <mxCell id="edge_landmark_no" value="NO" edge="1" parent="1" source="node_landmark_decision" target="node_extract_bbox" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="785" y="267.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Extract Bbox -> Bbox Query -->
        <mxCell id="edge_extract_bbox_query" edge="1" parent="1" source="node_extract_bbox" target="node_query_bbox" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Proximity Query <---> Database (Dashed) -->
        <mxCell id="edge_prox_db" value="ST_DWithin" edge="1" parent="1" source="node_query_proximity" target="node_postgis_db" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;dashed=1;fontFamily=Helvetica;fontSize=9.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Database <---> Bbox Query (Dashed) -->
        <mxCell id="edge_db_bbox" value="ST_Intersects" edge="1" parent="1" source="node_postgis_db" target="node_query_bbox" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;dashed=1;fontFamily=Helvetica;fontSize=9.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Proximity Query -> Results Decision -->
        <mxCell id="edge_prox_results" edge="1" parent="1" source="node_query_proximity" target="node_results_decision" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="215" y="575" />
              <mxPoint x="500" y="575" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Bbox Query -> Results Decision -->
        <mxCell id="edge_bbox_results" edge="1" parent="1" source="node_query_bbox" target="node_results_decision" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="785" y="575" />
              <mxPoint x="500" y="575" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Results Decision -> NO -> Empty State -->
        <mxCell id="edge_results_no" value="NO" edge="1" parent="1" source="node_results_decision" target="node_empty_state" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="805" y="642.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Empty State -> END (Bypass down right) -->
        <mxCell id="edge_empty_to_end" edge="1" parent="1" source="node_empty_state" target="node_end" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="805" y="1257.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Results Decision -> YES -> Density Decision -->
        <mxCell id="edge_results_yes" value="YES" edge="1" parent="1" source="node_results_decision" target="node_density_decision" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Density Decision -> YES -> Render Clusters -->
        <mxCell id="edge_density_yes" value="YES" edge="1" parent="1" source="node_density_decision" target="node_render_clusters" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="240" y="747.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Density Decision -> NO -> Render Price Pins -->
        <mxCell id="edge_density_no" value="NO" edge="1" parent="1" source="node_density_decision" target="node_render_price_pins" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="620" y="747.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Clusters -> Populate Drawer -->
        <mxCell id="edge_cluster_drawer" edge="1" parent="1" source="node_render_clusters" target="node_populate_drawer" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="240" y="885" />
              <mxPoint x="500" y="885" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Price Pins -> Populate Drawer -->
        <mxCell id="edge_pins_drawer" edge="1" parent="1" source="node_render_price_pins" target="node_populate_drawer" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="620" y="885" />
              <mxPoint x="500" y="885" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Populate Drawer -> URL Sync -->
        <mxCell id="edge8" edge="1" parent="1" source="node_populate_drawer" target="node_url_sync" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- URL Sync -> Attach Listeners -->
        <mxCell id="edge9" edge="1" parent="1" source="node_url_sync" target="node_attach_listeners" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Attach Listeners -> Connector F -->
        <mxCell id="edge10" edge="1" parent="1" source="node_attach_listeners" target="node_connector_f" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Connector F -> END -->
        <mxCell id="edge11" edge="1" parent="1" source="node_connector_f" target="node_end" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

      </root>
    </mxGraphModel>
  </diagram>
</mxfile>'''
    return xml

def build_svg():
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1050 1450" width="1050" height="1450" style="background-color: #ffffff; font-family: Helvetica, Arial, sans-serif;">
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
  <rect width="1050" height="1450" fill="url(#grid)" />

  <!-- Title Banner -->
  <text x="525" y="48" font-size="15" font-weight="bold" text-anchor="middle" fill="#000000" letter-spacing="0.5">
    SCRUM-118: SUB-PROCESS 2.2 — SPATIAL SEARCH, LANDMARK AUTO-SUGGEST &amp; POSTGIS QUERY
  </text>

  <!-- CONNECTING LINES -->
  <!-- START -> Search Entry -->
  <path d="M 500 115 L 500 145" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- Search Entry -> Landmark Decision -->
  <path d="M 500 200 L 500 230" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- Landmark Decision -> YES -> Resolve Landmark -->
  <path d="M 400 267.5 L 215 267.5 L 215 335" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />
  <rect x="290" y="256" width="36" height="20" fill="#FFFFFF" stroke="#000000" stroke-width="1" rx="3" />
  <text x="308" y="270" font-size="11" font-weight="bold" text-anchor="middle" fill="#000000">YES</text>

  <!-- Resolve Landmark -> Fly Landmark -->
  <path d="M 215 390 L 215 420" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- Fly Landmark -> Proximity Query -->
  <path d="M 215 470 L 215 500" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- Landmark Decision -> NO -> Extract Viewport Bbox -->
  <path d="M 600 267.5 L 785 267.5 L 785 335" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />
  <rect x="675" y="256" width="32" height="20" fill="#FFFFFF" stroke="#000000" stroke-width="1" rx="3" />
  <text x="691" y="270" font-size="11" font-weight="bold" text-anchor="middle" fill="#000000">NO</text>

  <!-- Extract Bbox -> Bbox Query -->
  <path d="M 785 390 L 785 500" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- Proximity Query <---> Database (Dashed) -->
  <path d="M 360 527.5 L 415 527.5" fill="none" stroke="#000000" stroke-width="1.5" stroke-dasharray="4,3" marker-start="url(#arrow-start)" marker-end="url(#arrow)" />
  <rect x="365" y="512" width="45" height="15" fill="#FFFFFF" />
  <text x="387.5" y="523" font-size="8.5" text-anchor="middle" fill="#333333">ST_DWithin</text>

  <!-- Database <---> Bbox Query (Dashed) -->
  <path d="M 585 527.5 L 640 527.5" fill="none" stroke="#000000" stroke-width="1.5" stroke-dasharray="4,3" marker-start="url(#arrow-start)" marker-end="url(#arrow)" />
  <rect x="588" y="512" width="48" height="15" fill="#FFFFFF" />
  <text x="612" y="523" font-size="8.5" text-anchor="middle" fill="#333333">ST_Intersects</text>

  <!-- Proximity Query -> Results Decision -->
  <path d="M 215 555 L 215 575 L 500 575 L 500 605" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- Bbox Query -> Results Decision -->
  <path d="M 785 555 L 785 575 L 500 575" fill="none" stroke="#000000" stroke-width="1.5" />

  <!-- Results Decision -> NO -> Empty State -->
  <path d="M 600 642.5 L 805 642.5 L 805 700" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />
  <rect x="690" y="632" width="32" height="20" fill="#FFFFFF" stroke="#000000" stroke-width="1" rx="3" />
  <text x="706" y="646" font-size="11" font-weight="bold" text-anchor="middle" fill="#000000">NO</text>

  <!-- Empty State -> END (Bypass down right) -->
  <path d="M 805 755 L 805 1257.5 L 580 1257.5" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- Results Decision -> YES -> Density Decision -->
  <path d="M 500 680 L 500 710" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />
  <rect x="505" y="683" width="36" height="20" fill="#FFFFFF" stroke="#000000" stroke-width="1" rx="3" />
  <text x="523" y="697" font-size="11" font-weight="bold" text-anchor="middle" fill="#000000">YES</text>

  <!-- Density Decision -> YES -> Render Clusters -->
  <path d="M 390 747.5 L 240 747.5 L 240 815" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />
  <rect x="300" y="736" width="36" height="20" fill="#FFFFFF" stroke="#000000" stroke-width="1" rx="3" />
  <text x="318" y="750" font-size="11" font-weight="bold" text-anchor="middle" fill="#000000">YES</text>

  <!-- Density Decision -> NO -> Render Price Pins -->
  <path d="M 610 747.5 L 620 747.5 L 620 815" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />
  <rect x="630" y="736" width="32" height="20" fill="#FFFFFF" stroke="#000000" stroke-width="1" rx="3" />
  <text x="646" y="750" font-size="11" font-weight="bold" text-anchor="middle" fill="#000000">NO</text>

  <!-- Clusters -> Populate Drawer -->
  <path d="M 240 870 L 240 885 L 500 885 L 500 905" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- Price Pins -> Populate Drawer -->
  <path d="M 620 870 L 620 885 L 500 885" fill="none" stroke="#000000" stroke-width="1.5" />

  <!-- Populate Drawer -> URL Sync -->
  <path d="M 500 960 L 500 990" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- URL Sync -> Attach Listeners -->
  <path d="M 500 1045 L 500 1075" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- Attach Listeners -> Connector F -->
  <path d="M 500 1125 L 500 1155" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- Connector F -> END -->
  <path d="M 500 1195 L 500 1235" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />


  <!-- NODES -->

  <!-- 1. START (Stadium) -->
  <rect x="420" y="70" width="160" height="45" rx="22.5" ry="22.5" fill="#FFFFFF" stroke="#000000" stroke-width="2" />
  <text x="500" y="98" font-size="14" font-weight="bold" text-anchor="middle" fill="#000000">START</text>

  <!-- 2. User Search Interaction (Parallelogram) -->
  <polygon points="335,145 685,145 665,200 315,200" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="500" y="168" font-size="12" font-weight="bold" text-anchor="middle" fill="#000000">User Interacts with Spatial Search Bar</text>
  <text x="500" y="186" font-size="11" text-anchor="middle" fill="#000000">(Type text, select landmark suggestion, or pan viewport)</text>

  <!-- 3. Landmark Selected? (Diamond) -->
  <polygon points="500,230 600,267.5 500,305 400,267.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="500" y="263" font-size="12" font-weight="bold" text-anchor="middle" fill="#000000">Landmark</text>
  <text x="500" y="278" font-size="12" font-weight="bold" text-anchor="middle" fill="#000000">Selected?</text>

  <!-- Resolve Landmark Coordinates (Rectangle) -->
  <rect x="70" y="335" width="290" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="215" y="358" font-size="11.5" font-weight="bold" text-anchor="middle" fill="#000000">Resolve Landmark Geocoding &amp; Centroid</text>
  <text x="215" y="376" font-size="10.5" text-anchor="middle" fill="#000000">(Cebu IT Park, USC-TC, CIT-U, Ayala Center, UC Main)</text>

  <!-- Fly Camera to Landmark (Rectangle) -->
  <rect x="70" y="420" width="290" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="215" y="441" font-size="11.5" font-weight="bold" text-anchor="middle" fill="#000000">Fly Camera to Landmark Centroid</text>
  <text x="215" y="458" font-size="10.5" text-anchor="middle" fill="#000000">(map.flyTo({ center: [lng, lat], zoom: 15.0 }))</text>

  <!-- Proximity Query (Rectangle) -->
  <rect x="70" y="500" width="290" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="215" y="523" font-size="11.5" font-weight="bold" text-anchor="middle" fill="#000000">Execute ST_DWithin Proximity Query</text>
  <text x="215" y="541" font-size="10.5" text-anchor="middle" fill="#000000">(ST_DWithin(coordinates, ST_Point(lng,lat), 1500m))</text>

  <!-- Extract Viewport Bbox (Rectangle) -->
  <rect x="640" y="335" width="290" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="785" y="358" font-size="11.5" font-weight="bold" text-anchor="middle" fill="#000000">Extract Active Viewport Bounding Box</text>
  <text x="785" y="376" font-size="10.5" text-anchor="middle" fill="#000000">(map.getBounds() -&gt; [minLng, minLat, maxLng, maxLat])</text>

  <!-- Viewport Bbox Query (Rectangle) -->
  <rect x="640" y="500" width="290" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="785" y="523" font-size="11.5" font-weight="bold" text-anchor="middle" fill="#000000">Execute ST_MakeEnvelope Bbox Query</text>
  <text x="785" y="541" font-size="10.5" text-anchor="middle" fill="#000000">(ST_Intersects(coordinates, ST_MakeEnvelope(...)))</text>

  <!-- PostGIS Database Cylinder -->
  <g>
    <path d="M 415,502 A 85,12 0 0,0 585,502 L 585,552 A 85,12 0 0,1 415,552 Z" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
    <ellipse cx="500" cy="502" rx="85" ry="12" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
    <text x="500" y="527" font-size="11" font-weight="bold" text-anchor="middle" fill="#000000">PostGIS Database</text>
    <text x="500" y="541" font-size="9" text-anchor="middle" fill="#333333">(properties, rental_units)</text>
    <text x="500" y="553" font-size="8.5" text-anchor="middle" fill="#333333">(GiST spatial indexes)</text>
  </g>

  <!-- 4. Active Listings Found? (Diamond) -->
  <polygon points="500,605 600,642.5 500,680 400,642.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="500" y="638" font-size="12" font-weight="bold" text-anchor="middle" fill="#000000">Active Listings</text>
  <text x="500" y="653" font-size="12" font-weight="bold" text-anchor="middle" fill="#000000">Found?</text>

  <!-- Empty State Sheet (Rectangle) -->
  <rect x="670" y="700" width="270" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="805" y="723" font-size="11.5" font-weight="bold" text-anchor="middle" fill="#000000">Render Empty State Sheet &amp; Guidance</text>
  <text x="805" y="741" font-size="10" text-anchor="middle" fill="#000000">(&quot;No rentals found. Expand radius or pan map.&quot;)</text>

  <!-- 5. Cluster Density > 15 Units? (Diamond) -->
  <polygon points="500,710 610,747.5 500,785 390,747.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="500" y="743" font-size="11.5" font-weight="bold" text-anchor="middle" fill="#000000">Cluster Density</text>
  <text x="500" y="758" font-size="11.5" font-weight="bold" text-anchor="middle" fill="#000000">&gt; 15 Units in Cell?</text>

  <!-- Render Cluster Bubbles (Rectangle) -->
  <rect x="110" y="815" width="260" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="240" y="838" font-size="11.5" font-weight="bold" text-anchor="middle" fill="#000000">Render Clustered Bubble Markers</text>
  <text x="240" y="856" font-size="10.5" text-anchor="middle" fill="#000000">(Numeric count [15+], spiderfy on tap)</text>

  <!-- Render Price Pins (Rectangle) -->
  <rect x="490" y="815" width="260" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="620" y="838" font-size="11.5" font-weight="bold" text-anchor="middle" fill="#000000">Render Custom SVG Price Pins</text>
  <text x="620" y="856" font-size="10.5" text-anchor="middle" fill="#000000">(Individual listing pills e.g. &quot;₱4,500/mo&quot;)</text>

  <!-- 6. Populate Floating Results Drawer (Rectangle) -->
  <rect x="315" y="905" width="370" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="500" y="928" font-size="12" font-weight="bold" text-anchor="middle" fill="#000000">Populate Floating Results Drawer / 3-Snap Sheet</text>
  <text x="500" y="946" font-size="10.5" text-anchor="middle" fill="#000000">(Rental cards, verified badges, monthly rent, distance tags)</text>

  <!-- 7. Sync Spatial Query State to URL (Rectangle) -->
  <rect x="315" y="990" width="370" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="500" y="1013" font-size="11.5" font-weight="bold" text-anchor="middle" fill="#000000">Sync Spatial Query State to URL SearchParams</text>
  <text x="500" y="1031" font-size="10.5" text-anchor="middle" fill="#000000">(Update ?landmark=.. or ?bbox=.. via replaceState)</text>

  <!-- 8. Register Viewport Settle Listener (Rectangle) -->
  <rect x="315" y="1075" width="370" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="500" y="1097" font-size="11.5" font-weight="bold" text-anchor="middle" fill="#000000">Register Viewport Settle &amp; Idle Listener</text>
  <text x="500" y="1114" font-size="10.5" text-anchor="middle" fill="#000000">(Trigger debounced spatial re-query on user pan/drag settle)</text>

  <!-- 9. Connector F (Circle) -->
  <circle cx="500" cy="1175" r="20" fill="#FFFFFF" stroke="#000000" stroke-width="2" />
  <text x="500" y="1181" font-size="14" font-weight="bold" text-anchor="middle" fill="#000000">F</text>
  <text x="670" y="1180" font-size="11" font-style="italic" text-anchor="middle" fill="#000000">
    To Multi-Criteria Filter Pills Sub-Process 2.3 (SCRUM-119)
  </text>

  <!-- 10. END (Stadium) -->
  <rect x="420" y="1235" width="160" height="45" rx="22.5" ry="22.5" fill="#FFFFFF" stroke="#000000" stroke-width="2" />
  <text x="500" y="1263" font-size="14" font-weight="bold" text-anchor="middle" fill="#000000">END</text>

  <!-- Footer Info -->
  <text x="50" y="1420" font-size="9" fill="#555555">AbangCebu AI — Sprint 2 Architecture Specification | Sub-Process 2.2 Spatial Search &amp; PostGIS Query</text>
  <text x="1000" y="1420" font-size="9" fill="#555555" text-anchor="end">Engineered for Metro Cebu Spatial Discovery</text>
</svg>'''
    return svg

def main():
    print("1. Generating Draw.io XML...", flush=True)
    xml_content = build_drawio_xml()
    drawio_path = "docs/flowcharts/map-search-spatial-query.drawio"
    os.makedirs(os.path.dirname(drawio_path), exist_ok=True)
    with open(drawio_path, "w", encoding="utf-8") as f:
        f.write(xml_content)
    print(f"Saved: {drawio_path}", flush=True)

    print("2. Generating Vector SVG and PDF...", flush=True)
    svg_content = build_svg()
    svg_path = "docs/assets/flowcharts/map-search-spatial-query.svg"
    os.makedirs(os.path.dirname(svg_path), exist_ok=True)
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(svg_content)
    print(f"Saved: {svg_path}", flush=True)

    pdf_path = "docs/pdf/map-search-spatial-query.pdf"
    os.makedirs(os.path.dirname(pdf_path), exist_ok=True)

    html_content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {{
    size: 1050px 1450px;
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
    png_base = "docs/assets/flowcharts/map-search-spatial-query-temp"
    subprocess.run(["pdftoppm", "-png", "-r", "200", pdf_path, png_base], check=True)
    generated_png = f"{png_base}-1.png"
    final_png_path = "docs/assets/flowcharts/map-search-spatial-query.png"
    if os.path.exists(generated_png):
        shutil.move(generated_png, final_png_path)
        print(f"Saved: {final_png_path}", flush=True)
    
    # Brain artifact copy
    brain_dir = "/home/hrmr/.gemini/antigravity-cli/brain/e06feeb1-eae1-4d85-a539-8f5611d91249"
    brain_png = os.path.join(brain_dir, "map-search-spatial-query.png")
    shutil.copyfile(final_png_path, brain_png)
    print(f"Copied to brain directory: {brain_png}", flush=True)

    print("\nAll deliverables for SCRUM-118 successfully generated!", flush=True)

if __name__ == "__main__":
    main()

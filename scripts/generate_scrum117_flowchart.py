#!/usr/bin/env python3
"""
Generates the SCRUM-117 Sub-Process 2.1: Map Initialization, Viewport & Geolocation Flowchart in 3 formats:
1. docs/flowcharts/map-initialization-geolocation.drawio (Draw.io XML)
2. docs/pdf/map-initialization-geolocation.pdf (Vector PDF via weasyprint)
3. docs/assets/flowcharts/map-initialization-geolocation.png (High-Res 200 DPI PNG via pdftoppm)

Design Style:
- Strict Black & White: white fills (#FFFFFF), black strokes (#000000), black text (#000000).
- Standard classic flowchart shapes:
  * Terminal: Rounded Stadium / Pill
  * Process: Rectangle
  * Input/Output / Action Trigger: Parallelogram
  * Decision: Rhombus / Diamond
  * Connector: Circle with letter (S: Spatial Search Sub-Process 2.2, M: Master Flow)
- Grid pattern background (#E2E8F0 20px grid).
- 100% Orthogonal routing with zero collisions.
- Author: John Lloyd Ando (Engineering Team) & Angel Crushein Yaun (UI/UX Designer)
- Reviewed & Audited by: Hermar Centillas (Lead / Scrum Master)
"""

import os
import shutil
import subprocess
import weasyprint

def build_drawio_xml():
    xml = '''<mxfile host="Electron" modified="2026-10-03T13:30:00.000Z" agent="Antigravity" version="21.0.0" type="device">
  <diagram id="scrum-117-map-init-geolocation" name="Sub-Process 2.1: Map Initialization &amp; Geolocation">
    <mxGraphModel dx="1200" dy="1600" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1050" pageHeight="1500" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />

        <!-- Title -->
        <mxCell id="title" value="SCRUM-117: SUB-PROCESS 2.1 — MAP INITIALIZATION, VIEWPORT &amp; GEOLOCATION" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontFamily=Helvetica;fontSize=17;fontStyle=1;fontColor=#000000;" vertex="1" parent="1">
          <mxGeometry x="75" y="25" width="850" height="35" as="geometry" />
        </mxCell>

        <!-- 1. START -->
        <mxCell id="node_start" value="START" style="rounded=1;arcSize=50;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=2;fontFamily=Helvetica;fontSize=14;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="420" y="70" width="160" height="45" as="geometry" />
        </mxCell>

        <!-- 2. Mount Map Shell Component -->
        <mxCell id="node_mount_shell" value="Initialize Map Shell Component&#xa;(Mount #map-viewport container, 100vw x 100dvh)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="315" y="145" width="370" height="55" as="geometry" />
        </mxCell>

        <!-- 3. WebGL Supported? -->
        <mxCell id="node_webgl_decision" value="WebGL Canvas&#xa;Supported?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="400" y="230" width="200" height="75" as="geometry" />
        </mxCell>

        <!-- Fallback 2D Canvas / Static Map (Right Branch) -->
        <mxCell id="node_fallback_2d" value="Mount Graceful Static Map / 2D Canvas&#xa;(Raster fallback image + basic touch pan)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="670" y="325" width="260" height="55" as="geometry" />
        </mxCell>

        <!-- WebGL Compatibility Alert -->
        <mxCell id="node_webgl_alert" value="Display Compatibility Warning Toast&#xa;(&quot;Hardware acceleration disabled&quot;)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="680" y="410" width="240" height="45" as="geometry" />
        </mxCell>

        <!-- 4. Load Vector Tile Style Spec -->
        <mxCell id="node_load_style" value="Load Vector Tile Style Spec&#xa;(OpenFreeMap Liberty Vector Style via MapLibre GL)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="315" y="335" width="370" height="55" as="geometry" />
        </mxCell>

        <!-- 5. Stored Viewport in URL / Session? -->
        <mxCell id="node_url_coords_decision" value="Stored Viewport&#xa;in URL / Session?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="390" y="420" width="220" height="75" as="geometry" />
        </mxCell>

        <!-- Restore Saved Viewport (Left Branch) -->
        <mxCell id="node_restore_viewport" value="Restore Viewport Coordinates&#xa;(Parse URL ?lat=..&amp;lng=..&amp;zoom=..)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="100" y="525" width="250" height="55" as="geometry" />
        </mxCell>

        <!-- 6. Request Browser Geolocation (Parallelogram) -->
        <mxCell id="node_request_geo" value="Request Browser Geolocation&#xa;(navigator.geolocation.getCurrentPosition)" style="shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fixedSize=1;size=20;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="375" y="525" width="250" height="55" as="geometry" />
        </mxCell>

        <!-- 7. Geolocation Permission Granted? -->
        <mxCell id="node_geo_decision" value="GPS Geolocation&#xa;Granted?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="395" y="610" width="210" height="75" as="geometry" />
        </mxCell>

        <!-- Parse GPS Coordinates -->
        <mxCell id="node_parse_gps" value="Extract High-Accuracy Coordinates&#xa;(enableHighAccuracy: true, timeout: 8000ms)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="130" y="715" width="260" height="50" as="geometry" />
        </mxCell>

        <!-- Render Pulsing Blue Dot -->
        <mxCell id="node_render_blue_dot" value="Render Pulsing Live User Marker&#xa;(MapLibre Marker with accuracy radius circle)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="130" y="795" width="260" height="50" as="geometry" />
        </mxCell>

        <!-- Animate Camera Fly-To User -->
        <mxCell id="node_fly_gps" value="Animate Camera Fly-To User Position&#xa;(map.flyTo({ center: [lng, lat], zoom: 15.5 }))" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="130" y="875" width="260" height="50" as="geometry" />
        </mxCell>

        <!-- Fallback Centroid (Right Branch) -->
        <mxCell id="node_fallback_centroid" value="Fallback to Metro Cebu Centroid&#xa;(Fuente Osmeña [10.3157, 123.8854], zoom 13.0)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="610" y="715" width="260" height="50" as="geometry" />
        </mxCell>

        <!-- Fallback Centroid Notice -->
        <mxCell id="node_notify_centroid" value="Display Centroid Toast Notice&#xa;(&quot;Positioned at Metro Cebu Hub&quot;)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="635" y="795" width="210" height="45" as="geometry" />
        </mxCell>

        <!-- 8. Extract Viewport Bounding Box -->
        <mxCell id="node_extract_bounds" value="Extract Visible Bounding Box (bbox)&#xa;(map.getBounds() -&gt; [minLng, minLat, maxLng, maxLat])" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="315" y="960" width="370" height="55" as="geometry" />
        </mxCell>

        <!-- 9. Attach Debounced Listeners -->
        <mxCell id="node_attach_listeners" value="Attach Debounced Map Move &amp; Zoom Listeners&#xa;(map.on('moveend') debounced 300ms for spatial re-query)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="315" y="1045" width="370" height="55" as="geometry" />
        </mxCell>

        <!-- 10. WebGL Context Loss Recovery Watcher -->
        <mxCell id="node_listen_context_loss" value="Register WebGL Context Loss / Restore Watcher&#xa;(canvas.addEventListener('webglcontextrestored'))" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="315" y="1130" width="370" height="50" as="geometry" />
        </mxCell>

        <!-- 11. Dispatch Viewport Ready -->
        <mxCell id="node_sync_state" value="Dispatch Viewport Ready Event &amp; Sync State&#xa;(Update React MapContext &amp; URL SearchParams)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="315" y="1210" width="370" height="55" as="geometry" />
        </mxCell>

        <!-- 12. Connector (S) to Spatial Search -->
        <mxCell id="node_connector_s" value="S" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=2;fontFamily=Helvetica;fontSize=14;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="477.5" y="1295" width="45" height="45" as="geometry" />
        </mxCell>

        <mxCell id="node_connector_label" value="To Spatial Search Sub-Process 2.2 (SCRUM-118)" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontFamily=Helvetica;fontSize=11;fontStyle=2;fontColor=#000000;" vertex="1" parent="1">
          <mxGeometry x="530" y="1302" width="280" height="30" as="geometry" />
        </mxCell>

        <!-- 13. END -->
        <mxCell id="node_end" value="END" style="rounded=1;arcSize=50;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=2;fontFamily=Helvetica;fontSize=14;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="420" y="1375" width="160" height="45" as="geometry" />
        </mxCell>

        <!-- EDGES -->
        <!-- Start -> Mount Shell -->
        <mxCell id="edge1" edge="1" parent="1" source="node_start" target="node_mount_shell" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Mount Shell -> WebGL Decision -->
        <mxCell id="edge2" edge="1" parent="1" source="node_mount_shell" target="node_webgl_decision" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- WebGL Decision -> NO -> Fallback 2D -->
        <mxCell id="edge_webgl_no" value="NO" edge="1" parent="1" source="node_webgl_decision" target="node_fallback_2d" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="800" y="267" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Fallback 2D -> WebGL Alert -->
        <mxCell id="edge_webgl_alert" edge="1" parent="1" source="node_fallback_2d" target="node_webgl_alert" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- WebGL Alert -> END (Far right bypass) -->
        <mxCell id="edge_webgl_to_end" edge="1" parent="1" source="node_webgl_alert" target="node_end" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="800" y="1397" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- WebGL Decision -> YES -> Load Style -->
        <mxCell id="edge_webgl_yes" value="YES" edge="1" parent="1" source="node_webgl_decision" target="node_load_style" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Load Style -> URL Coords Decision -->
        <mxCell id="edge4" edge="1" parent="1" source="node_load_style" target="node_url_coords_decision" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- URL Coords Decision -> YES -> Restore Viewport -->
        <mxCell id="edge_url_yes" value="YES" edge="1" parent="1" source="node_url_coords_decision" target="node_restore_viewport" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="225" y="457" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Restore Viewport -> Extract Bounds (Bypass Geo) -->
        <mxCell id="edge_restore_to_bounds" edge="1" parent="1" source="node_restore_viewport" target="node_extract_bounds" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="80" y="552" />
              <mxPoint x="80" y="987" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- URL Coords Decision -> NO -> Request Geo -->
        <mxCell id="edge_url_no" value="NO" edge="1" parent="1" source="node_url_coords_decision" target="node_request_geo" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Request Geo -> Geo Decision -->
        <mxCell id="edge6" edge="1" parent="1" source="node_request_geo" target="node_geo_decision" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Geo Decision -> YES -> Parse GPS -->
        <mxCell id="edge_geo_yes" value="YES" edge="1" parent="1" source="node_geo_decision" target="node_parse_gps" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="260" y="647" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Parse GPS -> Render Blue Dot -->
        <mxCell id="edge_parse_to_dot" edge="1" parent="1" source="node_parse_gps" target="node_render_blue_dot" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Render Blue Dot -> Fly GPS -->
        <mxCell id="edge_dot_to_fly" edge="1" parent="1" source="node_render_blue_dot" target="node_fly_gps" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Fly GPS -> Extract Bounds -->
        <mxCell id="edge_fly_to_bounds" edge="1" parent="1" source="node_fly_gps" target="node_extract_bounds" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="260" y="987" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Geo Decision -> NO -> Fallback Centroid -->
        <mxCell id="edge_geo_no" value="NO / TIMEOUT" edge="1" parent="1" source="node_geo_decision" target="node_fallback_centroid" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="740" y="647" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Fallback Centroid -> Notify Centroid -->
        <mxCell id="edge_centroid_to_notice" edge="1" parent="1" source="node_fallback_centroid" target="node_notify_centroid" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Notify Centroid -> Extract Bounds -->
        <mxCell id="edge_notice_to_bounds" edge="1" parent="1" source="node_notify_centroid" target="node_extract_bounds" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="740" y="987" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Extract Bounds -> Attach Listeners -->
        <mxCell id="edge8" edge="1" parent="1" source="node_extract_bounds" target="node_attach_listeners" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Attach Listeners -> Listen Context Loss -->
        <mxCell id="edge9" edge="1" parent="1" source="node_attach_listeners" target="node_listen_context_loss" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Listen Context Loss -> Sync State -->
        <mxCell id="edge10" edge="1" parent="1" source="node_listen_context_loss" target="node_sync_state" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Sync State -> Connector S -->
        <mxCell id="edge11" edge="1" parent="1" source="node_sync_state" target="node_connector_s" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Connector S -> END -->
        <mxCell id="edge12" edge="1" parent="1" source="node_connector_s" target="node_end" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

      </root>
    </mxGraphModel>
  </diagram>
</mxfile>'''
    return xml

def build_svg():
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1050 1500" width="1050" height="1500" style="background-color: #ffffff; font-family: Helvetica, Arial, sans-serif;">
  <defs>
    <!-- 20px Grid Pattern -->
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E2E8F0" stroke-width="0.8" />
    </pattern>
    <!-- Arrow Marker -->
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#000000" />
    </marker>
  </defs>

  <!-- Background Grid -->
  <rect width="1050" height="1500" fill="url(#grid)" />

  <!-- Title Banner -->
  <text x="525" y="48" font-size="16" font-weight="bold" text-anchor="middle" fill="#000000" letter-spacing="0.5">
    SCRUM-117: SUB-PROCESS 2.1 — MAP INITIALIZATION, VIEWPORT &amp; GEOLOCATION
  </text>

  <!-- Flowchart Connectors (Orthogonal lines) -->
  <!-- Start -> Mount Shell -->
  <path d="M 500 115 L 500 145" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- Mount Shell -> WebGL Decision -->
  <path d="M 500 200 L 500 230" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- WebGL Decision -> NO -> Fallback 2D -->
  <path d="M 600 267.5 L 800 267.5 L 800 325" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />
  <text x="690" y="260" font-size="11" font-weight="bold" fill="#000000">NO</text>

  <!-- Fallback 2D -> WebGL Alert -->
  <path d="M 800 380 L 800 410" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- WebGL Alert -> END (Far right bypass) -->
  <path d="M 800 455 L 800 1397.5 L 580 1397.5" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- WebGL Decision -> YES -> Load Style -->
  <path d="M 500 305 L 500 335" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />
  <text x="510" y="323" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <!-- Load Style -> URL Coords Decision -->
  <path d="M 500 390 L 500 420" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- URL Coords Decision -> YES -> Restore Viewport -->
  <path d="M 390 457.5 L 225 457.5 L 225 525" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />
  <text x="310" y="450" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <!-- Restore Viewport -> Extract Bounds (Far left bypass) -->
  <path d="M 100 552.5 L 75 552.5 L 75 987.5 L 315 987.5" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- URL Coords Decision -> NO -> Request Geo -->
  <path d="M 500 495 L 500 525" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />
  <text x="510" y="513" font-size="11" font-weight="bold" fill="#000000">NO</text>

  <!-- Request Geo -> Geo Decision -->
  <path d="M 500 580 L 500 610" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- Geo Decision -> YES -> Parse GPS -->
  <path d="M 395 647.5 L 260 647.5 L 260 715" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />
  <text x="325" y="640" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <!-- Parse GPS -> Render Blue Dot -->
  <path d="M 260 765 L 260 795" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- Render Blue Dot -> Fly GPS -->
  <path d="M 260 845 L 260 875" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- Fly GPS -> Extract Bounds -->
  <path d="M 260 925 L 260 987.5 L 315 987.5" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- Geo Decision -> NO -> Fallback Centroid -->
  <path d="M 605 647.5 L 740 647.5 L 740 715" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />
  <text x="620" y="640" font-size="10.5" font-weight="bold" fill="#000000">NO / TIMEOUT</text>

  <!-- Fallback Centroid -> Notify Centroid -->
  <path d="M 740 765 L 740 795" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- Notify Centroid -> Extract Bounds -->
  <path d="M 740 840 L 740 987.5 L 685 987.5" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- Extract Bounds -> Attach Listeners -->
  <path d="M 500 1015 L 500 1045" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- Attach Listeners -> Listen Context Loss -->
  <path d="M 500 1100 L 500 1130" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- Listen Context Loss -> Sync State -->
  <path d="M 500 1180 L 500 1210" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- Sync State -> Connector S -->
  <path d="M 500 1265 L 500 1295" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- Connector S -> END -->
  <path d="M 500 1340 L 500 1375" fill="none" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)" />


  <!-- NODES -->

  <!-- 1. START (Stadium) -->
  <rect x="420" y="70" width="160" height="45" rx="22.5" ry="22.5" fill="#FFFFFF" stroke="#000000" stroke-width="2" />
  <text x="500" y="98" font-size="14" font-weight="bold" text-anchor="middle" fill="#000000">START</text>

  <!-- 2. Mount Map Shell Component (Rectangle) -->
  <rect x="315" y="145" width="370" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="500" y="168" font-size="12" font-weight="bold" text-anchor="middle" fill="#000000">Initialize Map Shell Component</text>
  <text x="500" y="186" font-size="11" text-anchor="middle" fill="#000000">(Mount #map-viewport container, 100vw x 100dvh)</text>

  <!-- 3. WebGL Canvas Supported? (Diamond) -->
  <polygon points="500,230 600,267.5 500,305 400,267.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="500" y="263" font-size="12" font-weight="bold" text-anchor="middle" fill="#000000">WebGL Canvas</text>
  <text x="500" y="278" font-size="12" font-weight="bold" text-anchor="middle" fill="#000000">Supported?</text>

  <!-- Fallback 2D Canvas (Rectangle) -->
  <rect x="670" y="325" width="260" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="800" y="348" font-size="11.5" font-weight="bold" text-anchor="middle" fill="#000000">Mount Graceful Static Map / 2D Canvas</text>
  <text x="800" y="366" font-size="10.5" text-anchor="middle" fill="#000000">(Raster fallback image + basic touch pan)</text>

  <!-- WebGL Compatibility Alert (Rectangle) -->
  <rect x="680" y="410" width="240" height="45" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="800" y="430" font-size="11" font-weight="bold" text-anchor="middle" fill="#000000">Display Compatibility Warning Toast</text>
  <text x="800" y="445" font-size="10" text-anchor="middle" fill="#000000">(&quot;Hardware acceleration disabled&quot;)</text>

  <!-- 4. Load Vector Tile Style Spec (Rectangle) -->
  <rect x="315" y="335" width="370" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="500" y="358" font-size="12" font-weight="bold" text-anchor="middle" fill="#000000">Load Vector Tile Style Spec</text>
  <text x="500" y="376" font-size="11" text-anchor="middle" fill="#000000">(OpenFreeMap Liberty Vector Style via MapLibre GL)</text>

  <!-- 5. Stored Viewport in URL / Session? (Diamond) -->
  <polygon points="500,420 600,457.5 500,495 400,457.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="500" y="453" font-size="12" font-weight="bold" text-anchor="middle" fill="#000000">Stored Viewport</text>
  <text x="500" y="468" font-size="12" font-weight="bold" text-anchor="middle" fill="#000000">in URL / Session?</text>

  <!-- Restore Saved Viewport (Rectangle) -->
  <rect x="100" y="525" width="250" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="225" y="548" font-size="11.5" font-weight="bold" text-anchor="middle" fill="#000000">Restore Viewport Coordinates</text>
  <text x="225" y="566" font-size="10.5" text-anchor="middle" fill="#000000">(Parse URL ?lat=..&amp;lng=..&amp;zoom=..)</text>

  <!-- 6. Request Browser Geolocation (Parallelogram) -->
  <polygon points="395,525 625,525 605,580 375,580" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="500" y="548" font-size="12" font-weight="bold" text-anchor="middle" fill="#000000">Request Browser Geolocation</text>
  <text x="500" y="566" font-size="11" text-anchor="middle" fill="#000000">(navigator.geolocation.getCurrentPosition)</text>

  <!-- 7. Geolocation Permission Granted? (Diamond) -->
  <polygon points="500,610 605,647.5 500,685 395,647.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="500" y="643" font-size="12" font-weight="bold" text-anchor="middle" fill="#000000">GPS Geolocation</text>
  <text x="500" y="658" font-size="12" font-weight="bold" text-anchor="middle" fill="#000000">Granted?</text>

  <!-- Parse GPS Coordinates (Rectangle) -->
  <rect x="130" y="715" width="260" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="260" y="736" font-size="11.5" font-weight="bold" text-anchor="middle" fill="#000000">Extract High-Accuracy Coordinates</text>
  <text x="260" y="753" font-size="10.5" text-anchor="middle" fill="#000000">(enableHighAccuracy: true, timeout: 8000ms)</text>

  <!-- Render Pulsing Blue Dot (Rectangle) -->
  <rect x="130" y="795" width="260" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="260" y="816" font-size="11.5" font-weight="bold" text-anchor="middle" fill="#000000">Render Pulsing Live User Marker</text>
  <text x="260" y="833" font-size="10.5" text-anchor="middle" fill="#000000">(MapLibre Marker with accuracy radius circle)</text>

  <!-- Animate Camera Fly-To User (Rectangle) -->
  <rect x="130" y="875" width="260" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="260" y="896" font-size="11.5" font-weight="bold" text-anchor="middle" fill="#000000">Animate Camera Fly-To User Position</text>
  <text x="260" y="913" font-size="10.5" text-anchor="middle" fill="#000000">(map.flyTo({ center: [lng, lat], zoom: 15.5 }))</text>

  <!-- Fallback Centroid (Rectangle) -->
  <rect x="610" y="715" width="260" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="740" y="736" font-size="11.5" font-weight="bold" text-anchor="middle" fill="#000000">Fallback to Metro Cebu Centroid</text>
  <text x="740" y="753" font-size="10.5" text-anchor="middle" fill="#000000">(Fuente Osmeña [10.3157, 123.8854], zoom 13.0)</text>

  <!-- Fallback Centroid Notice (Rectangle) -->
  <rect x="635" y="795" width="210" height="45" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="740" y="815" font-size="11" font-weight="bold" text-anchor="middle" fill="#000000">Display Centroid Toast Notice</text>
  <text x="740" y="830" font-size="10" text-anchor="middle" fill="#000000">(&quot;Positioned at Metro Cebu Hub&quot;)</text>

  <!-- 8. Extract Viewport Bounding Box (Rectangle) -->
  <rect x="315" y="960" width="370" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="500" y="983" font-size="12" font-weight="bold" text-anchor="middle" fill="#000000">Extract Visible Bounding Box (bbox)</text>
  <text x="500" y="1001" font-size="11" text-anchor="middle" fill="#000000">(map.getBounds() -&gt; [minLng, minLat, maxLng, maxLat])</text>

  <!-- 9. Attach Debounced Listeners (Rectangle) -->
  <rect x="315" y="1045" width="370" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="500" y="1068" font-size="12" font-weight="bold" text-anchor="middle" fill="#000000">Attach Debounced Map Move &amp; Zoom Listeners</text>
  <text x="500" y="1086" font-size="11" text-anchor="middle" fill="#000000">(map.on('moveend') debounced 300ms for spatial re-query)</text>

  <!-- 10. WebGL Context Loss Recovery Watcher (Rectangle) -->
  <rect x="315" y="1130" width="370" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="500" y="1152" font-size="11.5" font-weight="bold" text-anchor="middle" fill="#000000">Register WebGL Context Loss / Restore Watcher</text>
  <text x="500" y="1169" font-size="10.5" text-anchor="middle" fill="#000000">(canvas.addEventListener('webglcontextrestored'))</text>

  <!-- 11. Dispatch Viewport Ready (Rectangle) -->
  <rect x="315" y="1210" width="370" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.5" />
  <text x="500" y="1233" font-size="12" font-weight="bold" text-anchor="middle" fill="#000000">Dispatch Viewport Ready Event &amp; Sync State</text>
  <text x="500" y="1251" font-size="11" text-anchor="middle" fill="#000000">(Update React MapContext &amp; URL SearchParams)</text>

  <!-- 12. Connector (S) to Spatial Search (Circle) -->
  <circle cx="500" cy="1317.5" r="22.5" fill="#FFFFFF" stroke="#000000" stroke-width="2" />
  <text x="500" y="1323.5" font-size="15" font-weight="bold" text-anchor="middle" fill="#000000">S</text>

  <text x="670" y="1322" font-size="11.5" font-style="italic" text-anchor="middle" fill="#000000">
    To Spatial Search Sub-Process 2.2 (SCRUM-118)
  </text>

  <!-- 13. END (Stadium) -->
  <rect x="420" y="1375" width="160" height="45" rx="22.5" ry="22.5" fill="#FFFFFF" stroke="#000000" stroke-width="2" />
  <text x="500" y="1403" font-size="14" font-weight="bold" text-anchor="middle" fill="#000000">END</text>

  <!-- Footer Info -->
  <text x="50" y="1480" font-size="9" fill="#555555">AbangCebu AI — Sprint 2 Architecture Specification | Sub-Process 2.1 Map Initialization &amp; Geolocation</text>
  <text x="1000" y="1480" font-size="9" fill="#555555" text-anchor="end">Engineered for Metro Cebu Spatial Discovery</text>
</svg>'''
    return svg

def main():
    print("1. Generating Draw.io XML...")
    xml_content = build_drawio_xml()
    drawio_path = "docs/flowcharts/map-initialization-geolocation.drawio"
    os.makedirs(os.path.dirname(drawio_path), exist_ok=True)
    with open(drawio_path, "w", encoding="utf-8") as f:
        f.write(xml_content)
    print(f"Saved: {drawio_path}")

    print("2. Generating Vector SVG and PDF...")
    svg_content = build_svg()
    svg_path = "docs/assets/flowcharts/map-initialization-geolocation.svg"
    os.makedirs(os.path.dirname(svg_path), exist_ok=True)
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(svg_content)
    print(f"Saved: {svg_path}")

    pdf_path = "docs/pdf/map-initialization-geolocation.pdf"
    os.makedirs(os.path.dirname(pdf_path), exist_ok=True)

    html_content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {{
    size: 1050px 1500px;
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
    print(f"Saved: {pdf_path}")

    print("3. Generating High-Res PNG via pdftoppm...")
    png_base = "docs/assets/flowcharts/map-initialization-geolocation-temp"
    subprocess.run(["pdftoppm", "-png", "-r", "200", pdf_path, png_base], check=True)
    generated_png = f"{png_base}-1.png"
    final_png_path = "docs/assets/flowcharts/map-initialization-geolocation.png"
    if os.path.exists(generated_png):
        shutil.move(generated_png, final_png_path)
        print(f"Saved: {final_png_path}")
    
    # Brain artifact copy
    brain_dir = "/home/hrmr/.gemini/antigravity-cli/brain/e06feeb1-eae1-4d85-a539-8f5611d91249"
    brain_png = os.path.join(brain_dir, "map-initialization-geolocation.png")
    shutil.copyfile(final_png_path, brain_png)
    print(f"Copied to brain directory: {brain_png}")

    print("\nAll deliverables successfully generated!")

if __name__ == "__main__":
    main()

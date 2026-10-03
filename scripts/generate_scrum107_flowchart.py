#!/usr/bin/env python3
"""
Generates the SCRUM-107 User Sign-Out & Multi-Tab Synchronization Flowchart in 3 formats:
1. docs/flowcharts/auth-signout-multitab.drawio (Draw.io XML)
2. docs/pdf/auth-signout-multitab.pdf (Vector PDF via weasyprint)
3. docs/assets/flowcharts/auth-signout-multitab.png (High-Res 200 DPI PNG via pdftoppm)

Design Style:
- Strict Black & White: white fills (#FFFFFF), black strokes (#000000), black text (#000000).
- Standard classic flowchart shapes:
  * Terminal: Rounded Stadium / Pill
  * Process: Rectangle
  * Input/Output: Parallelogram
  * Decision: Rhombus / Diamond
  * Database: Cylinder
  * Connector: Circle with letter (L)
  * Step: Arrow banner
- Grid pattern background.
- Clean, balanced, standardized flowchart terminology.
- Parallel multi-tab coordination for Primary Tab vs Peer Tabs.
"""

import os
import shutil
import subprocess
import weasyprint

def build_drawio_xml():
    xml = '''<mxfile host="Electron" modified="2026-10-03T11:35:00.000Z" agent="Antigravity" version="21.0.0" type="device">
  <diagram id="scrum-107-signout-multitab" name="User Sign-Out &amp; Multi-Tab Synchronization Flow">
    <mxGraphModel dx="1200" dy="1800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1050" pageHeight="1760" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />

        <!-- Title -->
        <mxCell id="title" value="SCRUM-107: USER SIGN-OUT &amp; MULTI-TAB SYNCHRONIZATION WORKFLOW" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontFamily=Helvetica;fontSize=18;fontStyle=1;fontColor=#000000;" vertex="1" parent="1">
          <mxGeometry x="175" y="25" width="700" height="35" as="geometry" />
        </mxCell>

        <!-- 1. START -->
        <mxCell id="node_start" value="START" style="rounded=1;arcSize=50;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=2;fontFamily=Helvetica;fontSize=14;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="420" y="80" width="160" height="50" as="geometry" />
        </mxCell>

        <!-- 2. Authenticated Viewport -->
        <mxCell id="node_auth_viewport" value="Authenticated Viewport&#xa;(/dashboard, /landlord/*, /profile, /search)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="350" y="165" width="300" height="55" as="geometry" />
        </mxCell>

        <!-- 3. User Clicks "Sign Out" (Parallelogram) -->
        <mxCell id="node_click_signout" value="User Clicks &quot;Sign Out&quot;&#xa;(Profile menu / Navbar action)" style="shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fixedSize=1;size=20;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="355" y="255" width="290" height="60" as="geometry" />
        </mxCell>

        <!-- 4. Confirm Sign Out? -->
        <mxCell id="node_confirm_signout" value="Confirm Sign Out?&#xa;(Modal dialog)" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="405" y="350" width="190" height="90" as="geometry" />
        </mxCell>

        <!-- 5. Scope: All Devices? -->
        <mxCell id="node_scope_fork" value="Scope: All Devices?&#xa;(Global vs Local)" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="400" y="475" width="200" height="90" as="geometry" />
        </mxCell>

        <!-- Set Scope: 'global' -->
        <mxCell id="node_scope_global" value="Set Scope: 'global'" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="210" y="580" width="180" height="45" as="geometry" />
        </mxCell>

        <!-- Set Scope: 'local' -->
        <mxCell id="node_scope_local" value="Set Scope: 'local'" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="610" y="580" width="180" height="45" as="geometry" />
        </mxCell>

        <!-- 6. Network Available? -->
        <mxCell id="node_network_avail" value="Network Available?&#xa;(Offline check)" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="405" y="665" width="190" height="90" as="geometry" />
        </mxCell>

        <!-- Client Offline Fallback -->
        <mxCell id="node_offline_fallback" value="Client Offline Fallback&#xa;(Purge local credentials immediately)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="120" y="685" width="220" height="50" as="geometry" />
        </mxCell>

        <!-- 7. Execute Server Action -->
        <mxCell id="node_server_action" value="Execute Server Action&#xa;(POST /auth/signout via @supabase/ssr)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="340" y="785" width="320" height="50" as="geometry" />
        </mxCell>

        <!-- 8. Supabase GoTrue Revocation -->
        <mxCell id="node_gotrue_revoke" value="Supabase GoTrue Revocation&#xa;(Invalidate auth.sessions &amp; refresh token family)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="330" y="865" width="340" height="55" as="geometry" />
        </mxCell>

        <!-- Database: User & Session Db -->
        <mxCell id="node_session_db" value="User &amp; Session Db&#xa;(auth.sessions &amp;&#xa;auth.refresh_tokens)" style="shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="780" y="847.5" width="140" height="90" as="geometry" />
        </mxCell>

        <!-- 9. Iterative Cookie Purge -->
        <mxCell id="node_cookie_purge" value="Iterative Cookie Purge&#xa;(Scan cookie jar for sb-*-auth-token.0...N&#xa;with Max-Age=0, Expires=1970)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="320" y="955" width="360" height="55" as="geometry" />
        </mxCell>

        <!-- 10. Emit Security & Cache Headers -->
        <mxCell id="node_emit_headers" value="Emit Security &amp; Cache Headers&#xa;(Clear-Site-Data: &quot;cache&quot;, &quot;cookies&quot;, &quot;storage&quot;,&#xa;Cache-Control: no-store)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="320" y="1045" width="360" height="55" as="geometry" />
        </mxCell>

        <!-- 11. Emit BroadcastChannel Event -->
        <mxCell id="node_broadcast_emit" value="Emit BroadcastChannel Event&#xa;(BroadcastChannel('supabase.auth.token')&#xa;.postMessage({ event: 'SIGNED_OUT' }))" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="310" y="1135" width="380" height="55" as="geometry" />
        </mxCell>

        <!-- Fork Header: Primary Tab -->
        <mxCell id="label_primary_tab" value="PRIMARY TAB A" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;fontFamily=Helvetica;fontSize=12;fontStyle=1;fontColor=#000000;" vertex="1" parent="1">
          <mxGeometry x="220" y="1210" width="160" height="25" as="geometry" />
        </mxCell>

        <!-- Fork Header: Peer Tabs -->
        <mxCell id="label_peer_tabs" value="PEER TABS B, C" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;fontFamily=Helvetica;fontSize=12;fontStyle=1;fontColor=#000000;" vertex="1" parent="1">
          <mxGeometry x="620" y="1210" width="160" height="25" as="geometry" />
        </mxCell>

        <!-- Primary Tab: Flush Cache -->
        <mxCell id="node_flush_primary" value="Flush Primary Tab Cache&#xa;(Clear React Query / SWR / memory tokens&#xa;&amp; router.refresh())" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="155" y="1245" width="290" height="55" as="geometry" />
        </mxCell>

        <!-- Primary Tab: Purge In-Memory State -->
        <mxCell id="node_purge_primary_mem" value="Purge In-Memory State&#xa;(Zero memory tokens &amp; reset auth context)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="155" y="1335" width="290" height="55" as="geometry" />
        </mxCell>

        <!-- Primary Tab: Redirect Step Banner -->
        <mxCell id="node_redirect_primary" value="Redirect Primary Tab&#xa;(/login?reason=signed_out)" style="shape=step;perimeter=stepPerimeter;whiteSpace=wrap;html=1;fixedSize=1;size=15;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="155" y="1425" width="290" height="50" as="geometry" />
        </mxCell>

        <!-- Peer Tabs: Receive Event (Parallelogram) -->
        <mxCell id="node_peer_receive" value="Peer Tabs Receive Event&#xa;(Active listener receives SIGNED_OUT)" style="shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fixedSize=1;size=20;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="555" y="1245" width="290" height="55" as="geometry" />
        </mxCell>

        <!-- Peer Tabs: Flush Cache -->
        <mxCell id="node_flush_peer" value="Flush Peer Tab Cache&#xa;(Invalidate queries, memory tokens &amp; state)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="555" y="1335" width="290" height="55" as="geometry" />
        </mxCell>

        <!-- Peer Tabs: Redirect Step Banner -->
        <mxCell id="node_redirect_peer" value="Redirect Peer Tabs&#xa;(/login?reason=signed_out)" style="shape=step;perimeter=stepPerimeter;whiteSpace=wrap;html=1;fixedSize=1;size=15;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="555" y="1425" width="290" height="50" as="geometry" />
        </mxCell>

        <!-- 12. Connector (L) -->
        <mxCell id="node_connector_l" value="L" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=14;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="477.5" y="1510" width="45" height="45" as="geometry" />
        </mxCell>
        <mxCell id="label_connector_l_desc" value="Login Flow&#xa;(SCRUM-105)" style="text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;whiteSpace=wrap;fontFamily=Helvetica;fontSize=10;fontStyle=1;fontColor=#000000;" vertex="1" parent="1">
          <mxGeometry x="515" y="1565" width="120" height="28" as="geometry" />
        </mxCell>

        <!-- 13. END -->
        <mxCell id="node_end" value="END" style="rounded=1;arcSize=50;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=2;fontFamily=Helvetica;fontSize=14;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="420" y="1615" width="160" height="50" as="geometry" />
        </mxCell>


        <!-- EDGES / CONNECTORS -->

        <!-- Start -> Authenticated Viewport -->
        <mxCell id="e_start_viewport" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_start" target="node_auth_viewport" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Authenticated Viewport -> User Clicks Sign Out -->
        <mxCell id="e_viewport_click" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_auth_viewport" target="node_click_signout" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- User Clicks Sign Out -> Confirm Sign Out? -->
        <mxCell id="e_click_confirm" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_click_signout" target="node_confirm_signout" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Confirm Sign Out? -> NO -> Loop back to Viewport -->
        <mxCell id="e_confirm_no" value="NO (Cancel)" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_confirm_signout" target="node_auth_viewport" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="260" y="395" />
              <mxPoint x="260" y="192.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Confirm Sign Out? -> YES -> Scope: All Devices? -->
        <mxCell id="e_confirm_yes" value="YES" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_confirm_signout" target="node_scope_fork" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Scope: All Devices? -> YES -> Set Scope: 'global' -->
        <mxCell id="e_scope_global" value="YES" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_scope_fork" target="node_scope_global" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Scope: All Devices? -> NO -> Set Scope: 'local' -->
        <mxCell id="e_scope_local" value="NO" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_scope_fork" target="node_scope_local" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Set Scope: 'global' -> Network Available? -->
        <mxCell id="e_global_net" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_scope_global" target="node_network_avail" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="300" y="645" />
              <mxPoint x="500" y="645" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Set Scope: 'local' -> Network Available? -->
        <mxCell id="e_local_net" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_scope_local" target="node_network_avail" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="700" y="645" />
              <mxPoint x="500" y="645" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Network Available? -> NO -> Client Offline Fallback -->
        <mxCell id="e_net_no" value="NO" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_network_avail" target="node_offline_fallback" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Client Offline Fallback -> Iterative Cookie Purge -->
        <mxCell id="e_fallback_cookie" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_offline_fallback" target="node_cookie_purge" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="230" y="982.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Network Available? -> YES -> Execute Server Action -->
        <mxCell id="e_net_yes" value="YES" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_network_avail" target="node_server_action" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Execute Server Action -> Supabase GoTrue Revocation -->
        <mxCell id="e_action_gotrue" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_server_action" target="node_gotrue_revoke" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Supabase GoTrue Revocation <-> dashed Verify/Revoke <-> User & Session Db -->
        <mxCell id="e_gotrue_db" value="Verify / Revoke" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;dashed=1;startArrow=classic;endArrow=classic;fontColor=#000000;fontSize=10.5;" edge="1" source="node_gotrue_revoke" target="node_session_db" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Supabase GoTrue Revocation -> Iterative Cookie Purge -->
        <mxCell id="e_gotrue_cookies" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_gotrue_revoke" target="node_cookie_purge" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Iterative Cookie Purge -> Emit Security & Cache Headers -->
        <mxCell id="e_cookie_headers" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_cookie_purge" target="node_emit_headers" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Emit Security & Cache Headers -> Emit BroadcastChannel Event -->
        <mxCell id="e_headers_broadcast" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_emit_headers" target="node_broadcast_emit" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Emit BroadcastChannel Event -> Fork to Primary Tab -->
        <mxCell id="e_broadcast_primary" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_broadcast_emit" target="node_flush_primary" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="500" y="1215" />
              <mxPoint x="300" y="1215" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Emit BroadcastChannel Event -> Fork to Peer Tabs -->
        <mxCell id="e_broadcast_peer" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_broadcast_emit" target="node_peer_receive" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="500" y="1215" />
              <mxPoint x="700" y="1215" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Primary Tab: Flush Cache -> Purge In-Memory State -->
        <mxCell id="e_flush_primary_mem" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_flush_primary" target="node_purge_primary_mem" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Primary Tab: Purge In-Memory State -> Redirect Primary Tab -->
        <mxCell id="e_mem_redirect_primary" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_purge_primary_mem" target="node_redirect_primary" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Peer Tabs: Receive Event -> Flush Peer Tab Cache -->
        <mxCell id="e_peer_flush" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_peer_receive" target="node_flush_peer" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Peer Tabs: Flush Peer Tab Cache -> Redirect Peer Tabs -->
        <mxCell id="e_flush_redirect_peer" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_flush_peer" target="node_redirect_peer" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Primary Tab: Redirect -> Connector (L) -->
        <mxCell id="e_primary_connector" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_redirect_primary" target="node_connector_l" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="300" y="1532.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Peer Tabs: Redirect -> Connector (L) -->
        <mxCell id="e_peer_connector" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_redirect_peer" target="node_connector_l" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="700" y="1532.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Connector (L) -> END -->
        <mxCell id="e_connector_end" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_connector_l" target="node_end" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
'''
    return xml

def build_vector_svg():
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1740" width="1000" height="1740" style="background:#ffffff; font-family:Helvetica, Arial, sans-serif;">
  <defs>
    <!-- Arrow marker for end of lines -->
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#000000" />
    </marker>
    <!-- Arrow marker for start of lines (bidirectional) -->
    <marker id="arrow-start" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 8 1.5 L 0 5 L 8 8.5 z" fill="#000000" />
    </marker>
    <!-- Pattern for grid background -->
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E2E8F0" stroke-width="0.8"/>
    </pattern>
  </defs>

  <!-- Grid Background -->
  <rect width="100%" height="100%" fill="url(#grid)" />

  <!-- Flowchart Title -->
  <text x="500" y="45" text-anchor="middle" font-size="18" font-weight="bold" fill="#000000" letter-spacing="1">SCRUM-107: USER SIGN-OUT &amp; MULTI-TAB SYNCHRONIZATION WORKFLOW</text>

  <!-- ==================== CONNECTING EDGES ==================== -->

  <!-- START -> Authenticated Viewport -->
  <line x1="500" y1="130" x2="500" y2="165" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Authenticated Viewport -> User Clicks Sign Out -->
  <line x1="500" y1="220" x2="500" y2="255" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- User Clicks Sign Out -> Confirm Sign Out? -->
  <line x1="500" y1="315" x2="500" y2="350" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Confirm Sign Out? -> NO -> Loop back to Authenticated Viewport -->
  <path d="M 405 395 L 260 395 L 260 192.5 L 350 192.5" fill="none" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="332" y="387" font-size="11" font-weight="bold" fill="#000000">NO (Cancel)</text>

  <!-- Confirm Sign Out? -> YES -> Scope: All Devices? -->
  <line x1="500" y1="440" x2="500" y2="475" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="508" y="460" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <!-- Scope: All Devices? -> YES -> Set Scope: 'global' -->
  <path d="M 400 520 L 300 520 L 300 580" fill="none" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="350" y="512" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <!-- Scope: All Devices? -> NO -> Set Scope: 'local' -->
  <path d="M 600 520 L 700 520 L 700 580" fill="none" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="650" y="512" font-size="11" font-weight="bold" fill="#000000">NO</text>

  <!-- Scope global and local -> converge into Network Available? -->
  <path d="M 300 625 L 300 645 L 700 645 L 700 625" fill="none" stroke="#000000" stroke-width="1.8" />
  <line x1="500" y1="645" x2="500" y2="665" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Network Available? -> NO -> Client Offline Fallback -->
  <line x1="405" y1="710" x2="340" y2="710" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="375" y="702" font-size="11" font-weight="bold" fill="#000000">NO</text>

  <!-- Client Offline Fallback -> Iterative Cookie Purge -->
  <path d="M 230 735 L 230 982.5 L 320 982.5" fill="none" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Network Available? -> YES -> Execute Server Action -->
  <line x1="500" y1="755" x2="500" y2="785" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="508" y="772" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <!-- Execute Server Action -> Supabase GoTrue Revocation -->
  <line x1="500" y1="835" x2="500" y2="865" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Supabase GoTrue Revocation <-> dashed Verify/Revoke <-> User & Session Db -->
  <line x1="670" y1="892.5" x2="780" y2="892.5" stroke="#000000" stroke-width="1.8" stroke-dasharray="6,4" marker-start="url(#arrow-start)" marker-end="url(#arrow)" />
  <text x="725" y="885" text-anchor="middle" font-size="10.5" fill="#000000">Verify / Revoke</text>

  <!-- Supabase GoTrue Revocation -> Iterative Cookie Purge -->
  <line x1="500" y1="920" x2="500" y2="955" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Iterative Cookie Purge -> Emit Security & Cache Headers -->
  <line x1="500" y1="1010" x2="500" y2="1045" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Emit Security & Cache Headers -> Emit BroadcastChannel Event -->
  <line x1="500" y1="1100" x2="500" y2="1135" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Emit BroadcastChannel Event -> Fork to Primary Tab & Peer Tabs -->
  <line x1="500" y1="1190" x2="500" y2="1215" stroke="#000000" stroke-width="1.8" />
  <path d="M 500 1215 L 300 1215 L 300 1245" fill="none" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <path d="M 500 1215 L 700 1215 L 700 1245" fill="none" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Primary Tab: Flush Cache -> Purge In-Memory State -->
  <line x1="300" y1="1300" x2="300" y2="1335" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Primary Tab: Purge In-Memory State -> Redirect Primary Tab -->
  <line x1="300" y1="1390" x2="300" y2="1425" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Peer Tabs: Receive Event -> Flush Peer Tab Cache -->
  <line x1="700" y1="1300" x2="700" y2="1335" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Peer Tabs: Flush Peer Tab Cache -> Redirect Peer Tabs -->
  <line x1="700" y1="1390" x2="700" y2="1425" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Primary Tab & Peer Tabs Redirect -> Converge to Connector (L) -->
  <path d="M 300 1475 L 300 1495 L 700 1495 L 700 1475" fill="none" stroke="#000000" stroke-width="1.8" />
  <line x1="500" y1="1495" x2="500" y2="1510" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Connector (L) -> END -->
  <line x1="500" y1="1555" x2="500" y2="1615" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />


  <!-- ==================== FLOWCHART NODES ==================== -->

  <!-- 1. START -->
  <rect x="420" y="80" width="160" height="50" rx="25" ry="25" fill="#FFFFFF" stroke="#000000" stroke-width="2.2" />
  <text x="500" y="111" text-anchor="middle" font-size="14" font-weight="bold" fill="#000000">START</text>

  <!-- 2. Authenticated Viewport -->
  <rect x="350" y="165" width="300" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="189" text-anchor="middle" font-size="13" font-weight="bold" fill="#000000">Authenticated Viewport</text>
  <text x="500" y="206" text-anchor="middle" font-size="11" fill="#333333">(/dashboard, /landlord/*, /profile, /search)</text>

  <!-- 3. User Clicks "Sign Out" (Parallelogram) -->
  <polygon points="375,255 645,255 625,315 355,315" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="280" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">User Clicks "Sign Out"</text>
  <text x="500" y="297" text-anchor="middle" font-size="10.5" fill="#333333">(Profile menu / Navbar action)</text>

  <!-- 4. Confirm Sign Out? -->
  <polygon points="500,350 595,395 500,440 405,395" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="390" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Confirm Sign Out?</text>
  <text x="500" y="406" text-anchor="middle" font-size="10.5" fill="#333333">(Modal dialog)</text>

  <!-- 5. Scope: All Devices? -->
  <polygon points="500,475 600,520 500,565 400,520" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="515" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Scope: All Devices?</text>
  <text x="500" y="531" text-anchor="middle" font-size="10.5" fill="#333333">(Global vs Local)</text>

  <!-- Set Scope: 'global' -->
  <rect x="210" y="580" width="180" height="45" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="300" y="608" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Set Scope: 'global'</text>

  <!-- Set Scope: 'local' -->
  <rect x="610" y="580" width="180" height="45" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="700" y="608" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Set Scope: 'local'</text>

  <!-- 6. Network Available? -->
  <polygon points="500,665 595,710 500,755 405,710" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="705" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Network Available?</text>
  <text x="500" y="721" text-anchor="middle" font-size="10.5" fill="#333333">(Offline check)</text>

  <!-- Client Offline Fallback -->
  <rect x="120" y="685" width="220" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="230" y="705" text-anchor="middle" font-size="11" font-weight="bold" fill="#000000">Client Offline Fallback</text>
  <text x="230" y="721" text-anchor="middle" font-size="9.5" fill="#333333">(Purge local credentials)</text>

  <!-- 7. Execute Server Action -->
  <rect x="340" y="785" width="320" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="806" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Execute Server Action</text>
  <text x="500" y="822" text-anchor="middle" font-size="10.5" fill="#333333">(POST /auth/signout via @supabase/ssr)</text>

  <!-- 8. Supabase GoTrue Revocation -->
  <rect x="330" y="865" width="340" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="888" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Supabase GoTrue Revocation</text>
  <text x="500" y="905" text-anchor="middle" font-size="10" fill="#333333">(Invalidate auth.sessions &amp; refresh token family)</text>

  <!-- Database: User & Session Db (Cylinder) -->
  <g>
    <path d="M 780 862.5 A 70 15 0 0 0 920 862.5 A 70 15 0 0 0 780 862.5 Z" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
    <path d="M 780 862.5 L 780 922.5 A 70 15 0 0 0 920 922.5 L 920 862.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
    <path d="M 780 922.5 A 70 15 0 0 0 920 922.5" fill="none" stroke="#000000" stroke-width="1.8" />
    <text x="850" y="890" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#000000">User &amp; Session Db</text>
    <text x="850" y="904" text-anchor="middle" font-size="9" fill="#333333">(auth.sessions &amp;</text>
    <text x="850" y="916" text-anchor="middle" font-size="9" fill="#333333">auth.refresh_tokens)</text>
  </g>

  <!-- 9. Iterative Cookie Purge -->
  <rect x="320" y="955" width="360" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="977" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Iterative Cookie Purge</text>
  <text x="500" y="995" text-anchor="middle" font-size="10" fill="#333333">(Scan jar: sb-*-auth-token.0...N -> Max-Age=0, Exp: 1970)</text>

  <!-- 10. Emit Security & Cache Headers -->
  <rect x="320" y="1045" width="360" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="1067" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Emit Security &amp; Cache Headers</text>
  <text x="500" y="1084" text-anchor="middle" font-size="9.5" fill="#333333">(Clear-Site-Data: "cache","cookies","storage" | Cache-Control: no-store)</text>

  <!-- 11. Emit BroadcastChannel Event -->
  <rect x="310" y="1135" width="380" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="1157" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Emit BroadcastChannel Event</text>
  <text x="500" y="1174" text-anchor="middle" font-size="9.5" fill="#333333">(BroadcastChannel('supabase.auth.token').postMessage('SIGNED_OUT'))</text>

  <!-- Fork Column Headers -->
  <text x="300" y="1210" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000" letter-spacing="0.5">[ PRIMARY TAB A ]</text>
  <text x="700" y="1210" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000" letter-spacing="0.5">[ PEER TABS B, C ]</text>

  <!-- Primary Tab: Flush Cache -->
  <rect x="155" y="1245" width="290" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="300" y="1267" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#000000">Flush Primary Tab Cache</text>
  <text x="300" y="1284" text-anchor="middle" font-size="9.5" fill="#333333">(Clear React Query / SWR &amp; router.refresh())</text>

  <!-- Primary Tab: Purge In-Memory State -->
  <rect x="155" y="1335" width="290" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="300" y="1357" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#000000">Purge In-Memory State</text>
  <text x="300" y="1374" text-anchor="middle" font-size="9.5" fill="#333333">(Zero memory tokens &amp; reset auth context)</text>

  <!-- Primary Tab: Redirect Step Banner -->
  <polygon points="155,1425 430,1425 445,1450 430,1475 155,1475 170,1450" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="300" y="1446" text-anchor="middle" font-size="11" font-weight="bold" fill="#000000">Redirect Primary Tab</text>
  <text x="300" y="1462" text-anchor="middle" font-size="9.5" fill="#333333">(/login?reason=signed_out)</text>

  <!-- Peer Tabs: Receive Event (Parallelogram) -->
  <polygon points="575,1245 845,1245 825,1300 555,1300" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="700" y="1268" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#000000">Peer Tabs Receive Event</text>
  <text x="700" y="1285" text-anchor="middle" font-size="10" fill="#333333">(Active listener receives SIGNED_OUT)</text>

  <!-- Peer Tabs: Flush Cache -->
  <rect x="555" y="1335" width="290" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="700" y="1357" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#000000">Flush Peer Tab Cache</text>
  <text x="700" y="1374" text-anchor="middle" font-size="10" fill="#333333">(Invalidate queries, memory tokens &amp; state)</text>

  <!-- Peer Tabs: Redirect Step Banner -->
  <polygon points="555,1425 830,1425 845,1450 830,1475 555,1475 570,1450" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="700" y="1446" text-anchor="middle" font-size="11" font-weight="bold" fill="#000000">Redirect Peer Tabs</text>
  <text x="700" y="1462" text-anchor="middle" font-size="9.5" fill="#333333">(/login?reason=signed_out)</text>

  <!-- 12. Connector (L) -->
  <circle cx="500" cy="1532.5" r="22.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="1538.5" text-anchor="middle" font-size="14" font-weight="bold" fill="#000000">L</text>
  <text x="535" y="1528" text-anchor="start" font-size="11" font-weight="bold" fill="#000000">Login Flow</text>
  <text x="535" y="1542" text-anchor="start" font-size="9.5" fill="#333333">(SCRUM-105)</text>

  <!-- 13. END -->
  <rect x="420" y="1615" width="160" height="50" rx="25" ry="25" fill="#FFFFFF" stroke="#000000" stroke-width="2.2" />
  <text x="500" y="1646" text-anchor="middle" font-size="14" font-weight="bold" fill="#000000">END</text>

</svg>'''
    return svg

def main():
    print("1. Generating Draw.io XML...")
    drawio_path = "docs/flowcharts/auth-signout-multitab.drawio"
    with open(drawio_path, "w", encoding="utf-8") as f:
        f.write(build_drawio_xml())
    print(f"Saved: {drawio_path}")

    print("2. Generating Vector SVG and PDF...")
    svg_content = build_vector_svg()
    svg_path = "docs/assets/flowcharts/auth-signout-multitab.svg"
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(svg_content)
    print(f"Saved: {svg_path}")

    pdf_path = "docs/pdf/auth-signout-multitab.pdf"
    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page {{
      size: 1040px 1780px;
      margin: 0;
    }}
    body {{
      margin: 0;
      padding: 20px;
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
    png_base = "/tmp/scrum107_render"
    subprocess.run(["pdftoppm", "-png", "-r", "200", pdf_path, png_base], check=True)
    rendered_png = f"{png_base}-1.png"
    target_png = "docs/assets/flowcharts/auth-signout-multitab.png"
    shutil.move(rendered_png, target_png)
    print(f"Saved: {target_png}")

    # Copy to brain artifact directory if specified
    brain_target = "/home/hrmr/.gemini/antigravity-cli/brain/e06feeb1-eae1-4d85-a539-8f5611d91249/auth-signout-multitab.png"
    if os.path.exists(os.path.dirname(brain_target)):
        shutil.copyfile(target_png, brain_target)
        print(f"Copied to brain directory: {brain_target}")

    print("\nAll deliverables successfully generated!")

if __name__ == "__main__":
    main()

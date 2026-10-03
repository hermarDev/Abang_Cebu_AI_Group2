#!/usr/bin/env python3
"""
Generates the SCRUM-108 Authentication Error Handling & Account Suspension Flowchart in 3 formats:
1. docs/flowcharts/auth-error-handling-suspension.drawio (Draw.io XML)
2. docs/pdf/auth-error-handling-suspension.pdf (Vector PDF via weasyprint)
3. docs/assets/flowcharts/auth-error-handling-suspension.png (High-Res 200 DPI PNG via pdftoppm)

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
- Complete Failure Mode Taxonomy (inline, toast, banner, boundary) & Administrative Suspension Pipeline.
"""

import os
import shutil
import subprocess
import weasyprint

def build_drawio_xml():
    xml = '''<mxfile host="Electron" modified="2026-10-03T11:45:00.000Z" agent="Antigravity" version="21.0.0" type="device">
  <diagram id="scrum-108-error-handling-suspension" name="Authentication Error Handling &amp; Account Suspension Flow">
    <mxGraphModel dx="1200" dy="1600" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1050" pageHeight="1380" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />

        <!-- Title -->
        <mxCell id="title" value="SCRUM-108: AUTHENTICATION ERROR HANDLING &amp; ACCOUNT SUSPENSION WORKFLOW" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontFamily=Helvetica;fontSize=18;fontStyle=1;fontColor=#000000;" vertex="1" parent="1">
          <mxGeometry x="125" y="25" width="800" height="35" as="geometry" />
        </mxCell>

        <!-- 1. START -->
        <mxCell id="node_start" value="START" style="rounded=1;arcSize=50;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=2;fontFamily=Helvetica;fontSize=14;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="420" y="80" width="160" height="50" as="geometry" />
        </mxCell>

        <!-- 2. Auth Event Trigger (Parallelogram) -->
        <mxCell id="node_trigger" value="Auth Event Trigger&#xa;(User Action: Login, Register, Refresh,&#xa;or Protected Page Access)" style="shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fixedSize=1;size=20;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="340" y="165" width="320" height="60" as="geometry" />
        </mxCell>

        <!-- 3. Error Intercepted? -->
        <mxCell id="node_error_intercepted" value="Error Intercepted?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="405" y="260" width="190" height="85" as="geometry" />
        </mxCell>

        <!-- Normal Execution Flow -->
        <mxCell id="node_normal_flow" value="Normal Execution Flow&#xa;(Render requested view / 200 OK)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="680" y="275" width="220" height="55" as="geometry" />
        </mxCell>

        <!-- 4. Translate GoTrue / System Error -->
        <mxCell id="node_translate_error" value="Translate GoTrue / System Error&#xa;(Map to AuthErrorCode &amp; HTTP: 400, 401, 403, 422, 429, 500)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="320" y="380" width="360" height="55" as="geometry" />
        </mxCell>

        <!-- 5. Account Suspended? -->
        <mxCell id="node_account_suspended" value="Account Suspended?&#xa;(403 Forbidden or is_suspended == true)" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="395" y="470" width="210" height="85" as="geometry" />
        </mxCell>

        <!-- Database: User & Profile Db -->
        <mxCell id="node_db_profile" value="User &amp; Profile Db&#xa;(profiles.is_suspended &amp;&#xa;auth.users)" style="shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="810" y="465" width="130" height="90" as="geometry" />
        </mxCell>

        <!-- Immediate Session Expulsion -->
        <mxCell id="node_expel_session" value="Immediate Session Expulsion&#xa;(Purge memory &amp; zero session cookies Max-Age=0)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="670" y="580" width="240" height="55" as="geometry" />
        </mxCell>

        <!-- Dispatch to Suspended View (Step Banner) -->
        <mxCell id="node_dispatch_suspended" value="Dispatch to Suspended View&#xa;(/suspended?code=AUTH_ACCOUNT_SUSPENDED)" style="shape=step;perimeter=stepPerimeter;whiteSpace=wrap;html=1;fixedSize=1;size=15;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=10.5;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="660" y="665" width="260" height="50" as="geometry" />
        </mxCell>

        <!-- Render Suspension & Appeals UI -->
        <mxCell id="node_render_appeals" value="Render Suspension &amp; Appeals UI&#xa;(Display account suspension notice &amp; support appeal form)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="650" y="745" width="280" height="55" as="geometry" />
        </mxCell>

        <!-- Evaluate Feedback Mode? -->
        <mxCell id="node_eval_mode" value="Evaluate Feedback Mode?&#xa;(UX presentation surface contract)" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="385" y="840" width="230" height="85" as="geometry" />
        </mxCell>

        <!-- Branch 1: Inline Field Error -->
        <mxCell id="node_inline_err" value="Inline Field Error&#xa;(form field validation)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="65" y="960" width="170" height="55" as="geometry" />
        </mxCell>
        <mxCell id="node_user_corrects" value="User Corrects Input&#xa;(re-enters field data)" style="shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fixedSize=1;size=15;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="65" y="1045" width="170" height="55" as="geometry" />
        </mxCell>

        <!-- Branch 2: Ephemeral Toast Alert -->
        <mxCell id="node_toast_err" value="Ephemeral Toast Alert&#xa;(rate limit / offline)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="285" y="960" width="170" height="55" as="geometry" />
        </mxCell>
        <mxCell id="node_backoff_timer" value="Exponential Backoff Timer&#xa;(retry cooldown countdown)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="285" y="1045" width="170" height="55" as="geometry" />
        </mxCell>

        <!-- Branch 3: Docked Alert Banner -->
        <mxCell id="node_banner_err" value="Docked Alert Banner&#xa;(unconfirmed email / expired link)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="505" y="960" width="170" height="55" as="geometry" />
        </mxCell>
        <mxCell id="node_resend_action" value="Action: Resend Verification&#xa;(request new PKCE link)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="505" y="1045" width="170" height="55" as="geometry" />
        </mxCell>
        <mxCell id="node_connector_l" value="L" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=13;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="570" y="1135" width="40" height="40" as="geometry" />
        </mxCell>
        <mxCell id="label_connector_l_desc" value="Login Flow&#xa;(SCRUM-105)" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;fontFamily=Helvetica;fontSize=9.5;fontStyle=1;fontColor=#000000;" vertex="1" parent="1">
          <mxGeometry x="615" y="1140" width="85" height="30" as="geometry" />
        </mxCell>

        <!-- Branch 4: React Error Boundary Fallback -->
        <mxCell id="node_boundary_err" value="React Error Boundary Fallback&#xa;(fatal system error card)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="725" y="960" width="170" height="55" as="geometry" />
        </mxCell>
        <mxCell id="node_reload_action" value="Action: Reload App&#xa;(hard reload viewport)" style="shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fixedSize=1;size=15;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="725" y="1045" width="170" height="55" as="geometry" />
        </mxCell>

        <!-- 6. END -->
        <mxCell id="node_end" value="END" style="rounded=1;arcSize=50;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=2;fontFamily=Helvetica;fontSize=14;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="420" y="1225" width="160" height="50" as="geometry" />
        </mxCell>


        <!-- EDGES / CONNECTORS -->

        <!-- Start -> Auth Event Trigger -->
        <mxCell id="e_start_trigger" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_start" target="node_trigger" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Auth Event Trigger -> Error Intercepted? -->
        <mxCell id="e_trigger_intercept" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_trigger" target="node_error_intercepted" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Error Intercepted? -> NO -> Normal Execution Flow -->
        <mxCell id="e_intercept_no" value="NO" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_error_intercepted" target="node_normal_flow" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Normal Execution Flow -> Right Rail -> END -->
        <mxCell id="e_normal_end" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_normal_flow" target="node_end" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="965" y="302.5" />
              <mxPoint x="965" y="1250" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Error Intercepted? -> YES -> Translate GoTrue / System Error -->
        <mxCell id="e_intercept_yes" value="YES" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_error_intercepted" target="node_translate_error" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Translate Error -> Account Suspended? -->
        <mxCell id="e_translate_suspended" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_translate_error" target="node_account_suspended" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Account Suspended? <-> dashed Verify Status <-> User & Profile Db -->
        <mxCell id="e_suspended_db" value="Verify Status" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;dashed=1;startArrow=classic;endArrow=classic;fontColor=#000000;fontSize=10.5;exitX=0.75;exitY=0.25;entryX=0;entryY=0.28;" edge="1" source="node_account_suspended" target="node_db_profile" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="700" y="490" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Account Suspended? -> YES -> Immediate Session Expulsion -->
        <mxCell id="e_suspended_yes" value="YES" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;exitX=0.75;exitY=0.75;entryX=0.5;entryY=0;" edge="1" source="node_account_suspended" target="node_expel_session" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="790" y="535" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Immediate Session Expulsion -> Dispatch to Suspended View -->
        <mxCell id="e_expel_dispatch" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_expel_session" target="node_dispatch_suspended" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Dispatch to Suspended View -> Render Suspension & Appeals UI -->
        <mxCell id="e_dispatch_render" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_dispatch_suspended" target="node_render_appeals" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Render Appeals UI -> Right Rail -> END -->
        <mxCell id="e_appeals_end" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_render_appeals" target="node_end" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="790" y="820" />
              <mxPoint x="965" y="820" />
              <mxPoint x="965" y="1250" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Account Suspended? -> NO -> Evaluate Feedback Mode? -->
        <mxCell id="e_suspended_no" value="NO" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_account_suspended" target="node_eval_mode" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Evaluate Mode -> Branch 1: inline (422/400) -->
        <mxCell id="e_mode_inline" value="inline (422/400)" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=10;fontStyle=1;endArrow=classic;" edge="1" source="node_eval_mode" target="node_inline_err" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="500" y="945" />
              <mxPoint x="150" y="945" />
            </Array>
          </mxGeometry>
        </mxCell>
        <mxCell id="e_inline_user" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_inline_err" target="node_user_corrects" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e_user_trigger_loop" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_user_corrects" target="node_trigger" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="150" y="1120" />
              <mxPoint x="35" y="1120" />
              <mxPoint x="35" y="195" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Evaluate Mode -> Branch 2: toast (429/Offline) -->
        <mxCell id="e_mode_toast" value="toast (429/Offline)" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=10;fontStyle=1;endArrow=classic;" edge="1" source="node_eval_mode" target="node_toast_err" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="500" y="945" />
              <mxPoint x="370" y="945" />
            </Array>
          </mxGeometry>
        </mxCell>
        <mxCell id="e_toast_backoff" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_toast_err" target="node_backoff_timer" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e_backoff_trigger_loop" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_backoff_timer" target="node_trigger" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="370" y="1120" />
              <mxPoint x="255" y="1120" />
              <mxPoint x="255" y="195" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Evaluate Mode -> Branch 3: banner (401/403) -->
        <mxCell id="e_mode_banner" value="banner (401/403)" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=10;fontStyle=1;endArrow=classic;" edge="1" source="node_eval_mode" target="node_banner_err" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="500" y="945" />
              <mxPoint x="590" y="945" />
            </Array>
          </mxGeometry>
        </mxCell>
        <mxCell id="e_banner_resend" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_banner_err" target="node_resend_action" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e_resend_connector" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_resend_action" target="node_connector_l" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e_connector_end" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_connector_l" target="node_end" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="590" y="1195" />
              <mxPoint x="500" y="1195" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Evaluate Mode -> Branch 4: boundary (500) -->
        <mxCell id="e_mode_boundary" value="boundary (500)" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=10;fontStyle=1;endArrow=classic;" edge="1" source="node_eval_mode" target="node_boundary_err" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="500" y="945" />
              <mxPoint x="810" y="945" />
            </Array>
          </mxGeometry>
        </mxCell>
        <mxCell id="e_boundary_reload" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_boundary_err" target="node_reload_action" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e_reload_trigger_loop" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_reload_action" target="node_trigger" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="810" y="1120" />
              <mxPoint x="915" y="1120" />
              <mxPoint x="915" y="195" />
            </Array>
          </mxGeometry>
        </mxCell>

      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
'''
    return xml

def build_vector_svg():
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1340" width="1000" height="1340" style="background:#ffffff; font-family:Helvetica, Arial, sans-serif;">
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
  <text x="500" y="45" text-anchor="middle" font-size="17" font-weight="bold" fill="#000000" letter-spacing="0.8">SCRUM-108: AUTHENTICATION ERROR HANDLING &amp; ACCOUNT SUSPENSION WORKFLOW</text>

  <!-- ==================== CONNECTING EDGES ==================== -->

  <!-- START -> Auth Event Trigger -->
  <line x1="500" y1="130" x2="500" y2="165" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Auth Event Trigger -> Error Intercepted? -->
  <line x1="500" y1="225" x2="500" y2="260" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Error Intercepted? -> NO -> Normal Execution Flow -->
  <line x1="595" y1="302.5" x2="680" y2="302.5" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="635" y="295" font-size="11" font-weight="bold" fill="#000000">NO</text>

  <!-- Normal Execution Flow -> Right Rail -> END -->
  <path d="M 900 302.5 L 965 302.5 L 965 1250 L 580 1250" fill="none" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Error Intercepted? -> YES -> Translate GoTrue / System Error -->
  <line x1="500" y1="345" x2="500" y2="380" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="508" y="365" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <!-- Translate Error -> Account Suspended? -->
  <line x1="500" y1="435" x2="500" y2="470" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Account Suspended? <-> dashed Verify Status <-> User & Profile Db -->
  <line x1="550" y1="490" x2="810" y2="490" stroke="#000000" stroke-width="1.8" stroke-dasharray="6,4" marker-start="url(#arrow-start)" marker-end="url(#arrow)" />
  <text x="685" y="482" text-anchor="middle" font-size="10.5" fill="#000000">Verify Status</text>

  <!-- Account Suspended? -> YES -> Immediate Session Expulsion -->
  <path d="M 550 535 L 790 535 L 790 580" fill="none" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="635" y="527" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <!-- Immediate Session Expulsion -> Dispatch to Suspended View -->
  <line x1="790" y1="635" x2="790" y2="665" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Dispatch to Suspended View -> Render Suspension & Appeals UI -->
  <line x1="790" y1="715" x2="790" y2="745" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Render Appeals UI -> Right Rail into END -->
  <path d="M 790 800 L 790 820 L 965 820" fill="none" stroke="#000000" stroke-width="1.8" />

  <!-- Account Suspended? -> NO -> Evaluate Feedback Mode? -->
  <line x1="500" y1="555" x2="500" y2="840" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="508" y="578" font-size="11" font-weight="bold" fill="#000000">NO</text>

  <!-- Evaluate Mode -> Distribution Bus to 4 branches -->
  <line x1="500" y1="925" x2="500" y2="945" stroke="#000000" stroke-width="1.8" />
  <path d="M 150 960 L 150 945 L 810 945 L 810 960" fill="none" stroke="#000000" stroke-width="1.8" marker-start="url(#arrow)" marker-end="url(#arrow)" />
  <line x1="370" y1="945" x2="370" y2="960" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <line x1="590" y1="945" x2="590" y2="960" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Branch Labels above boxes -->
  <text x="150" y="940" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#000000">inline (422/400)</text>
  <text x="370" y="940" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#000000">toast (429/Offline)</text>
  <text x="590" y="940" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#000000">banner (401/403)</text>
  <text x="810" y="940" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#000000">boundary (500)</text>

  <!-- Branch 1: Inline -> User Corrects Input -->
  <line x1="150" y1="1015" x2="150" y2="1045" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Branch 1 Loopback: User Corrects -> Auth Event Trigger -->
  <path d="M 150 1100 L 150 1120 L 35 1120 L 35 195 L 340 195" fill="none" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Branch 2: Toast -> Exponential Backoff -->
  <line x1="370" y1="1015" x2="370" y2="1045" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Branch 2 Loopback: Backoff Timer -> Auth Event Trigger -->
  <path d="M 370 1100 L 370 1120 L 255 1120 L 255 195 L 340 195" fill="none" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Branch 3: Banner -> Action: Resend Verification -->
  <line x1="590" y1="1015" x2="590" y2="1045" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Branch 3: Resend Action -> Connector (L) -->
  <line x1="590" y1="1100" x2="590" y2="1135" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Connector (L) -> END -->
  <path d="M 590 1175 L 590 1195 L 500 1195 L 500 1225" fill="none" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Branch 4: Boundary -> Action: Reload App -->
  <line x1="810" y1="1015" x2="810" y2="1045" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Branch 4 Loopback: Reload App -> Auth Event Trigger -->
  <path d="M 810 1100 L 810 1120 L 915 1120 L 915 195 L 660 195" fill="none" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />


  <!-- ==================== FLOWCHART NODES ==================== -->

  <!-- 1. START -->
  <rect x="420" y="80" width="160" height="50" rx="25" ry="25" fill="#FFFFFF" stroke="#000000" stroke-width="2.2" />
  <text x="500" y="111" text-anchor="middle" font-size="14" font-weight="bold" fill="#000000">START</text>

  <!-- 2. Auth Event Trigger (Parallelogram) -->
  <polygon points="360,165 660,165 640,225 340,225" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="189" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Auth Event Trigger</text>
  <text x="500" y="206" text-anchor="middle" font-size="10" fill="#333333">(User Action: Login, Register, Refresh, or Page Access)</text>

  <!-- 3. Error Intercepted? -->
  <polygon points="500,260 595,302.5 500,345 405,302.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="299" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Error</text>
  <text x="500" y="315" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Intercepted?</text>

  <!-- Normal Execution Flow -->
  <rect x="680" y="275" width="220" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="790" y="299" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Normal Execution Flow</text>
  <text x="790" y="316" text-anchor="middle" font-size="10" fill="#333333">(Render requested view / 200 OK)</text>

  <!-- 4. Translate GoTrue / System Error -->
  <rect x="320" y="380" width="360" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="402" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Translate GoTrue / System Error</text>
  <text x="500" y="419" text-anchor="middle" font-size="10" fill="#333333">(Map to AuthErrorCode &amp; HTTP: 400, 401, 403, 422, 429, 500)</text>

  <!-- 5. Account Suspended? -->
  <polygon points="500,470 605,512.5 500,555 395,512.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="508" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Account</text>
  <text x="500" y="524" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Suspended?</text>

  <!-- Database: User & Profile Db (Cylinder) -->
  <g>
    <path d="M 810 480 A 65 15 0 0 0 940 480 A 65 15 0 0 0 810 480 Z" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
    <path d="M 810 480 L 810 540 A 65 15 0 0 0 940 540 L 940 480" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
    <path d="M 810 540 A 65 15 0 0 0 940 540" fill="none" stroke="#000000" stroke-width="1.8" />
    <text x="875" y="506" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#000000">User &amp; Profile Db</text>
    <text x="875" y="520" text-anchor="middle" font-size="9" fill="#333333">(profiles.is_suspended &amp;</text>
    <text x="875" y="532" text-anchor="middle" font-size="9" fill="#333333">auth.users)</text>
  </g>

  <!-- Immediate Session Expulsion -->
  <rect x="670" y="580" width="240" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="790" y="602" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#000000">Immediate Session Expulsion</text>
  <text x="790" y="619" text-anchor="middle" font-size="9" fill="#333333">(Purge memory &amp; zero session cookies Max-Age=0)</text>

  <!-- Dispatch to Suspended View (Step Banner) -->
  <polygon points="660,665 905,665 920,690 905,715 660,715 675,690" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="790" y="686" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#000000">Dispatch to Suspended View</text>
  <text x="790" y="702" text-anchor="middle" font-size="9" fill="#333333">(/suspended?code=AUTH_ACCOUNT_SUSPENDED)</text>

  <!-- Render Suspension & Appeals UI -->
  <rect x="650" y="745" width="280" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="790" y="767" text-anchor="middle" font-size="11" font-weight="bold" fill="#000000">Render Suspension &amp; Appeals UI</text>
  <text x="790" y="784" text-anchor="middle" font-size="9" fill="#333333">(Display suspension notice &amp; support appeal form)</text>

  <!-- Evaluate Feedback Mode? (Decision Diamond) -->
  <polygon points="500,840 615,882.5 500,925 385,882.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="878" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Evaluate Feedback Mode?</text>
  <text x="500" y="895" text-anchor="middle" font-size="10" fill="#333333">(UX presentation surface)</text>

  <!-- Branch 1: Inline Field Error -->
  <rect x="65" y="960" width="170" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="150" y="982" text-anchor="middle" font-size="11" font-weight="bold" fill="#000000">Inline Field Error</text>
  <text x="150" y="999" text-anchor="middle" font-size="9.5" fill="#333333">(form field validation)</text>

  <polygon points="80,1045 235,1045 220,1100 65,1100" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="150" y="1067" text-anchor="middle" font-size="11" font-weight="bold" fill="#000000">User Corrects Input</text>
  <text x="150" y="1084" text-anchor="middle" font-size="9.5" fill="#333333">(re-enters field data)</text>

  <!-- Branch 2: Ephemeral Toast Alert -->
  <rect x="285" y="960" width="170" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="370" y="982" text-anchor="middle" font-size="11" font-weight="bold" fill="#000000">Ephemeral Toast Alert</text>
  <text x="370" y="999" text-anchor="middle" font-size="9.5" fill="#333333">(rate limit / offline)</text>

  <rect x="285" y="1045" width="170" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="370" y="1067" text-anchor="middle" font-size="11" font-weight="bold" fill="#000000">Exponential Backoff</text>
  <text x="370" y="1084" text-anchor="middle" font-size="9.5" fill="#333333">(retry cooldown countdown)</text>

  <!-- Branch 3: Docked Alert Banner -->
  <rect x="505" y="960" width="170" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="590" y="982" text-anchor="middle" font-size="11" font-weight="bold" fill="#000000">Docked Alert Banner</text>
  <text x="590" y="999" text-anchor="middle" font-size="9" fill="#333333">(unconfirmed / expired link)</text>

  <rect x="505" y="1045" width="170" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="590" y="1067" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#000000">Action: Resend Email</text>
  <text x="590" y="1084" text-anchor="middle" font-size="9" fill="#333333">(request new PKCE link)</text>

  <circle cx="590" cy="1155" r="20" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="590" y="1161" text-anchor="middle" font-size="13" font-weight="bold" fill="#000000">L</text>
  <text x="618" y="1151" text-anchor="start" font-size="10" font-weight="bold" fill="#000000">Login Flow</text>
  <text x="618" y="1164" text-anchor="start" font-size="8.5" fill="#333333">(SCRUM-105)</text>

  <!-- Branch 4: React Error Boundary Fallback -->
  <rect x="725" y="960" width="170" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="810" y="982" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#000000">React Error Boundary</text>
  <text x="810" y="999" text-anchor="middle" font-size="9" fill="#333333">(fatal system error card)</text>

  <polygon points="740,1045 895,1045 880,1100 725,1100" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="810" y="1067" text-anchor="middle" font-size="11" font-weight="bold" fill="#000000">Action: Reload App</text>
  <text x="810" y="1084" text-anchor="middle" font-size="9.5" fill="#333333">(hard reload viewport)</text>

  <!-- 6. END -->
  <rect x="420" y="1225" width="160" height="50" rx="25" ry="25" fill="#FFFFFF" stroke="#000000" stroke-width="2.2" />
  <text x="500" y="1256" text-anchor="middle" font-size="14" font-weight="bold" fill="#000000">END</text>

</svg>'''
    return svg

def main():
    print("1. Generating Draw.io XML...")
    drawio_path = "docs/flowcharts/auth-error-handling-suspension.drawio"
    with open(drawio_path, "w", encoding="utf-8") as f:
        f.write(build_drawio_xml())
    print(f"Saved: {drawio_path}")

    print("2. Generating Vector SVG and PDF...")
    svg_content = build_vector_svg()
    svg_path = "docs/assets/flowcharts/auth-error-handling-suspension.svg"
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(svg_content)
    print(f"Saved: {svg_path}")

    pdf_path = "docs/pdf/auth-error-handling-suspension.pdf"
    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page {{
      size: 1040px 1380px;
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
    png_base = "/tmp/scrum108_render"
    subprocess.run(["pdftoppm", "-png", "-r", "200", pdf_path, png_base], check=True)
    rendered_png = f"{png_base}-1.png"
    target_png = "docs/assets/flowcharts/auth-error-handling-suspension.png"
    shutil.move(rendered_png, target_png)
    print(f"Saved: {target_png}")

    # Copy to brain artifact directory if specified
    brain_target = "/home/hrmr/.gemini/antigravity-cli/brain/e06feeb1-eae1-4d85-a539-8f5611d91249/auth-error-handling-suspension.png"
    if os.path.exists(os.path.dirname(brain_target)):
        shutil.copyfile(target_png, brain_target)
        print(f"Copied to brain directory: {brain_target}")

    print("\nAll deliverables successfully generated!")

if __name__ == "__main__":
    main()

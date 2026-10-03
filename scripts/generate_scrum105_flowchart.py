#!/usr/bin/env python3
"""
Generates the SCRUM-105 User Login & Session Token Lifecycle Flowchart in 3 formats:
1. docs/flowcharts/auth-login-session-rtr.drawio (Draw.io XML)
2. docs/pdf/auth-login-session-rtr.pdf (Vector PDF via weasyprint)
3. docs/assets/flowcharts/auth-login-session-rtr.png (High-Res 200 DPI PNG via pdftoppm)

Design Style:
- Strict Black & White: white fills (#FFFFFF), black strokes (#000000), black text (#000000).
- Standard classic flowchart shapes:
  * Terminal: Rounded Stadium / Pill
  * Process: Rectangle
  * Input/Output: Parallelogram
  * Decision: Rhombus / Diamond
  * Database: Cylinder
  * Connector: Circle with letter (S, FP)
  * Step: Arrow banner
- Grid pattern background.
- Clean, balanced, standardized flowchart terminology.
"""

import os
import shutil
import subprocess
import weasyprint

def build_drawio_xml():
    xml = '''<mxfile host="Electron" modified="2026-10-03T11:15:00.000Z" agent="Antigravity" version="21.0.0" type="device">
  <diagram id="scrum-105-login-session-rtr" name="User Login &amp; Session Token Lifecycle Flow">
    <mxGraphModel dx="1200" dy="1600" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1050" pageHeight="1520" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />

        <!-- Title -->
        <mxCell id="title" value="SCRUM-105: USER LOGIN &amp; SESSION TOKEN LIFECYCLE FLOW" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontFamily=Helvetica;fontSize=18;fontStyle=1;fontColor=#000000;" vertex="1" parent="1">
          <mxGeometry x="250" y="25" width="550" height="35" as="geometry" />
        </mxCell>

        <!-- 1. START -->
        <mxCell id="node_start" value="START" style="rounded=1;arcSize=50;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=2;fontFamily=Helvetica;fontSize=14;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="420" y="80" width="160" height="50" as="geometry" />
        </mxCell>

        <!-- 2. Login Page -->
        <mxCell id="node_login_page" value="Login Page" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=13;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="400" y="170" width="200" height="55" as="geometry" />
        </mxCell>

        <!-- 3. have an Account? -->
        <mxCell id="node_have_account" value="have an&#xa;Account?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=13;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="420" y="265" width="160" height="90" as="geometry" />
        </mxCell>

        <!-- Connector (S) -->
        <mxCell id="node_connector_s" value="S" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=14;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="220" y="287.5" width="45" height="45" as="geometry" />
        </mxCell>
        <mxCell id="label_signup_desc" value="Signup Flow&#xa;(SCRUM-104)" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;fontFamily=Helvetica;fontSize=11;fontStyle=1;fontColor=#000000;" vertex="1" parent="1">
          <mxGeometry x="160" y="337.5" width="165" height="30" as="geometry" />
        </mxCell>

        <!-- 4. Input Login details (Parallelogram) -->
        <mxCell id="node_input_details" value="Input Login details&#xa;(Email / Phone, Password,&#xa;Remember Me)" style="shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fixedSize=1;size=20;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="360" y="405" width="280" height="65" as="geometry" />
        </mxCell>

        <!-- 5. Valid Credentials? -->
        <mxCell id="node_valid_creds" value="Valid&#xa;Credentials?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=13;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="420" y="515" width="160" height="90" as="geometry" />
        </mxCell>

        <!-- Database: User DB -->
        <mxCell id="node_user_db" value="User Db" style="shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=13;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="780" y="630" width="120" height="90" as="geometry" />
        </mxCell>

        <!-- Forgot Password? -->
        <mxCell id="node_forgot_password" value="Forgot&#xa;Password?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="190" y="520" width="140" height="80" as="geometry" />
        </mxCell>

        <!-- Connector (FP) -->
        <mxCell id="node_connector_fp" value="FP" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=13;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="90" y="537.5" width="45" height="45" as="geometry" />
        </mxCell>
        <mxCell id="label_fp_desc" value="Password Reset Recovery&#xa;(SCRUM-106)" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;fontFamily=Helvetica;fontSize=10;fontStyle=1;fontColor=#000000;" vertex="1" parent="1">
          <mxGeometry x="35" y="587.5" width="155" height="30" as="geometry" />
        </mxCell>

        <!-- 6. Account Suspended? -->
        <mxCell id="node_account_suspended" value="Account&#xa;Suspended?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=13;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="420" y="650" width="160" height="80" as="geometry" />
        </mxCell>

        <!-- Show Error (Account Suspended - 403) -->
        <mxCell id="node_error_suspended" value="Show Error&#xa;(Account Suspended - 403)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="150" y="665" width="190" height="50" as="geometry" />
        </mxCell>

        <!-- 7. Email Confirmed? -->
        <mxCell id="node_email_confirmed" value="Email&#xa;Confirmed?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=13;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="420" y="770" width="160" height="80" as="geometry" />
        </mxCell>

        <!-- Prompt "Verify Email" -->
        <mxCell id="node_prompt_verify" value="Prompt &quot;Verify Email&quot;&#xa;(Resend Link Banner - 403)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="150" y="785" width="190" height="50" as="geometry" />
        </mxCell>

        <!-- 8. Generate Tokens & Set Cookies -->
        <mxCell id="node_generate_tokens" value="Generate Tokens &amp; Set Cookies&#xa;(Refresh Token Rotation [RTR],&#xa;30s grace period, 30d vs Session)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="360" y="890" width="280" height="65" as="geometry" />
        </mxCell>

        <!-- 9. Admin? -->
        <mxCell id="node_is_admin" value="Admin?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=13;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="425" y="995" width="150" height="80" as="geometry" />
        </mxCell>

        <!-- ADMIN_DASHBOARD -->
        <mxCell id="node_admin_dash" value="ADMIN_DASHBOARD&#xa;(/admin)" style="shape=step;perimeter=stepPerimeter;whiteSpace=wrap;html=1;fixedSize=1;size=15;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="650" y="1010" width="240" height="50" as="geometry" />
        </mxCell>

        <!-- Landlord? -->
        <mxCell id="node_is_landlord" value="Landlord?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=13;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="425" y="1115" width="150" height="80" as="geometry" />
        </mxCell>

        <!-- LANDLORD_DASHBOARD -->
        <mxCell id="node_landlord_dash" value="LANDLORD_DASHBOARD&#xa;(/landlord/dashboard)" style="shape=step;perimeter=stepPerimeter;whiteSpace=wrap;html=1;fixedSize=1;size=15;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="650" y="1130" width="240" height="50" as="geometry" />
        </mxCell>

        <!-- RENTER_EXPLORER -->
        <mxCell id="node_renter_explorer" value="RENTER_EXPLORER&#xa;(/search)" style="shape=step;perimeter=stepPerimeter;whiteSpace=wrap;html=1;fixedSize=1;size=15;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="380" y="1235" width="240" height="50" as="geometry" />
        </mxCell>

        <!-- 10. END -->
        <mxCell id="node_end" value="END" style="rounded=1;arcSize=50;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=2;fontFamily=Helvetica;fontSize=14;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="420" y="1380" width="160" height="50" as="geometry" />
        </mxCell>


        <!-- EDGES / CONNECTORS -->

        <!-- Start -> Login Page -->
        <mxCell id="e_start_page" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_start" target="node_login_page" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Login Page -> have an Account? -->
        <mxCell id="e_page_have" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_login_page" target="node_have_account" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- have an Account? -> NO -> (S) -->
        <mxCell id="e_have_no" value="NO" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_have_account" target="node_connector_s" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- have an Account? -> YES -> Input Login details -->
        <mxCell id="e_have_yes" value="YES" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_have_account" target="node_input_details" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Input Login details -> Valid Credentials? -->
        <mxCell id="e_input_valid" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_input_details" target="node_valid_creds" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Valid Credentials? <-> Verify (dashed) <-> User DB -->
        <mxCell id="e_valid_user_db" value="Verify" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;dashed=1;startArrow=classic;endArrow=classic;fontColor=#000000;fontSize=11;" edge="1" source="node_valid_creds" target="node_user_db" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="840" y="560" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Valid Credentials? -> NO -> Forgot Password? -->
        <mxCell id="e_valid_no" value="NO" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_valid_creds" target="node_forgot_password" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Forgot Password? -> YES -> Connector (FP) -->
        <mxCell id="e_fp_yes" value="YES" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_forgot_password" target="node_connector_fp" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Forgot Password? -> NO -> loop back to Input details -->
        <mxCell id="e_fp_no" value="NO" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_forgot_password" target="node_input_details" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="260" y="437.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Valid Credentials? -> YES -> Account Suspended? -->
        <mxCell id="e_valid_yes" value="YES" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_valid_creds" target="node_account_suspended" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Account Suspended? -> YES -> Show Error -->
        <mxCell id="e_susp_yes" value="YES" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_account_suspended" target="node_error_suspended" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Show Error -> Left bypass to END -->
        <mxCell id="e_error_bypass_end" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_error_suspended" target="node_end" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="70" y="690" />
              <mxPoint x="70" y="1405" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Account Suspended? -> NO -> Email Confirmed? -->
        <mxCell id="e_susp_no" value="NO" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_account_suspended" target="node_email_confirmed" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Email Confirmed? -> NO -> Prompt "Verify Email" -->
        <mxCell id="e_conf_no" value="NO" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_email_confirmed" target="node_prompt_verify" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Prompt "Verify Email" -> Left bypass to END -->
        <mxCell id="e_prompt_bypass_end" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_prompt_verify" target="node_end" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="70" y="810" />
              <mxPoint x="70" y="1405" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Email Confirmed? -> YES -> Generate Tokens & Set Cookies -->
        <mxCell id="e_conf_yes" value="YES" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_email_confirmed" target="node_generate_tokens" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Generate Tokens -> Update Session (dashed) -> User DB -->
        <mxCell id="e_update_session_db" value="Update Session" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;dashed=1;endArrow=classic;fontColor=#000000;fontSize=11;" edge="1" source="node_generate_tokens" target="node_user_db" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="840" y="922.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Generate Tokens -> Admin? -->
        <mxCell id="e_tokens_admin" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_generate_tokens" target="node_is_admin" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Admin? -> YES -> ADMIN_DASHBOARD -->
        <mxCell id="e_admin_yes" value="YES" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_is_admin" target="node_admin_dash" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- ADMIN_DASHBOARD -> Right drop to END -->
        <mxCell id="e_admin_drop_end" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_admin_dash" target="node_end" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="930" y="1035" />
              <mxPoint x="930" y="1405" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Admin? -> NO -> Landlord? -->
        <mxCell id="e_admin_no" value="NO" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_is_admin" target="node_is_landlord" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Landlord? -> YES -> LANDLORD_DASHBOARD -->
        <mxCell id="e_landlord_yes" value="YES" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_is_landlord" target="node_landlord_dash" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- LANDLORD_DASHBOARD -> Right drop to END -->
        <mxCell id="e_landlord_drop_end" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_landlord_dash" target="node_end" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="930" y="1155" />
              <mxPoint x="930" y="1405" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Landlord? -> NO -> RENTER_EXPLORER -->
        <mxCell id="e_landlord_no" value="NO" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_is_landlord" target="node_renter_explorer" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- RENTER_EXPLORER -> Center drop to END -->
        <mxCell id="e_renter_end" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_renter_explorer" target="node_end" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
'''
    return xml

def build_vector_svg():
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1480" width="1000" height="1480" style="background:#ffffff; font-family:Helvetica, Arial, sans-serif;">
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
  <text x="500" y="45" text-anchor="middle" font-size="18" font-weight="bold" fill="#000000" letter-spacing="1">SCRUM-105: USER LOGIN &amp; SESSION TOKEN LIFECYCLE FLOW</text>

  <!-- ==================== CONNECTING EDGES ==================== -->

  <!-- START -> Login Page -->
  <line x1="500" y1="130" x2="500" y2="170" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Login Page -> have an Account? -->
  <line x1="500" y1="225" x2="500" y2="265" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- have an Account? -> NO -> Connector (S) -->
  <line x1="420" y1="310" x2="265" y2="310" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="340" y="303" font-size="11" font-weight="bold" fill="#000000">NO</text>

  <!-- have an Account? -> YES -> Input Login details -->
  <line x1="500" y1="355" x2="500" y2="405" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="508" y="380" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <!-- Input Login details -> Valid Credentials? -->
  <line x1="500" y1="470" x2="500" y2="515" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Valid Credentials? <-> Verify (dashed) <-> User DB -->
  <path d="M 580 560 L 840 560 L 840 630" fill="none" stroke="#000000" stroke-width="1.8" stroke-dasharray="6,4" marker-start="url(#arrow-start)" marker-end="url(#arrow)" />
  <text x="710" y="552" text-anchor="middle" font-size="11" fill="#000000">Verify</text>

  <!-- Valid Credentials? -> NO -> Forgot Password? -->
  <line x1="420" y1="560" x2="330" y2="560" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="375" y="552" font-size="11" font-weight="bold" fill="#000000">NO</text>

  <!-- Forgot Password? -> YES -> Connector (FP) -->
  <line x1="190" y1="560" x2="135" y2="560" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="162" y="552" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <!-- Forgot Password? -> NO -> loop back to Input details -->
  <path d="M 260 520 L 260 437.5 L 360 437.5" fill="none" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="248" y="490" text-anchor="end" font-size="11" font-weight="bold" fill="#000000">NO</text>

  <!-- Valid Credentials? -> YES -> Account Suspended? -->
  <line x1="500" y1="605" x2="500" y2="650" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="508" y="628" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <!-- Account Suspended? -> YES -> Show Error -->
  <line x1="420" y1="690" x2="340" y2="690" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="375" y="682" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <!-- Show Error -> Left bypass to END -->
  <path d="M 150 690 L 70 690 L 70 1405 L 420 1405" fill="none" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Account Suspended? -> NO -> Email Confirmed? -->
  <line x1="500" y1="730" x2="500" y2="770" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="508" y="752" font-size="11" font-weight="bold" fill="#000000">NO</text>

  <!-- Email Confirmed? -> NO -> Prompt "Verify Email" -->
  <line x1="420" y1="810" x2="340" y2="810" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="375" y="802" font-size="11" font-weight="bold" fill="#000000">NO</text>

  <!-- Prompt "Verify Email" -> Left bypass into drop -->
  <line x1="150" y1="810" x2="70" y2="810" stroke="#000000" stroke-width="1.8" />

  <!-- Email Confirmed? -> YES -> Generate Tokens & Set Cookies -->
  <line x1="500" y1="850" x2="500" y2="890" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="508" y="872" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <!-- Generate Tokens -> Update Session (dashed) -> User DB -->
  <path d="M 640 922.5 L 840 922.5 L 840 720" fill="none" stroke="#000000" stroke-width="1.8" stroke-dasharray="6,4" marker-end="url(#arrow)" />
  <text x="740" y="915" text-anchor="middle" font-size="11" fill="#000000">Update Session</text>

  <!-- Generate Tokens -> Admin? -->
  <line x1="500" y1="955" x2="500" y2="995" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Admin? -> YES -> ADMIN_DASHBOARD -->
  <line x1="575" y1="1035" x2="650" y2="1035" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="610" y="1027" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <!-- ADMIN_DASHBOARD -> Right drop to END -->
  <path d="M 890 1035 L 930 1035 L 930 1405 L 580 1405" fill="none" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Admin? -> NO -> Landlord? -->
  <line x1="500" y1="1075" x2="500" y2="1115" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="508" y="1097" font-size="11" font-weight="bold" fill="#000000">NO</text>

  <!-- Landlord? -> YES -> LANDLORD_DASHBOARD -->
  <line x1="575" y1="1155" x2="650" y2="1155" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="610" y="1147" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <!-- LANDLORD_DASHBOARD -> Right drop into drop line -->
  <line x1="890" y1="1155" x2="930" y2="1155" stroke="#000000" stroke-width="1.8" />

  <!-- Landlord? -> NO -> RENTER_EXPLORER -->
  <line x1="500" y1="1195" x2="500" y2="1235" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="508" y="1217" font-size="11" font-weight="bold" fill="#000000">NO</text>

  <!-- RENTER_EXPLORER -> Center drop to END -->
  <line x1="500" y1="1285" x2="500" y2="1380" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />


  <!-- ==================== FLOWCHART NODES ==================== -->

  <!-- 1. START -->
  <rect x="420" y="80" width="160" height="50" rx="25" ry="25" fill="#FFFFFF" stroke="#000000" stroke-width="2.2" />
  <text x="500" y="111" text-anchor="middle" font-size="14" font-weight="bold" fill="#000000">START</text>

  <!-- 2. Login Page -->
  <rect x="400" y="170" width="200" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="203" text-anchor="middle" font-size="13" fill="#000000">Login Page</text>

  <!-- 3. have an Account? -->
  <polygon points="500,265 580,310 500,355 420,310" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="306" text-anchor="middle" font-size="12" fill="#000000">have an</text>
  <text x="500" y="322" text-anchor="middle" font-size="12" fill="#000000">Account?</text>

  <!-- Connector (S) -->
  <circle cx="242.5" cy="310" r="22.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="242.5" y="316" text-anchor="middle" font-size="14" font-weight="bold" fill="#000000">S</text>
  <text x="210" y="307" text-anchor="end" font-size="11" font-weight="bold" fill="#000000">Signup Flow</text>
  <text x="210" y="321" text-anchor="end" font-size="9.5" fill="#333333">(SCRUM-104)</text>

  <!-- 4. Input Login details (Parallelogram) -->
  <polygon points="385,405 645,405 615,470 355,470" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="427" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Input Login details</text>
  <text x="500" y="444" text-anchor="middle" font-size="10.5" fill="#333333">(Email / Phone, Password,</text>
  <text x="500" y="459" text-anchor="middle" font-size="10.5" fill="#333333">Remember Me)</text>

  <!-- 5. Valid Credentials? -->
  <polygon points="500,515 580,560 500,605 420,560" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="555" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Valid</text>
  <text x="500" y="571" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Credentials?</text>

  <!-- Database: User DB (Cylinder) -->
  <g>
    <path d="M 780 645 A 60 15 0 0 0 900 645 A 60 15 0 0 0 780 645 Z" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
    <path d="M 780 645 L 780 705 A 60 15 0 0 0 900 705 L 900 645" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
    <path d="M 780 705 A 60 15 0 0 0 900 705" fill="none" stroke="#000000" stroke-width="1.8" />
    <text x="840" y="685" text-anchor="middle" font-size="13" font-weight="bold" fill="#000000">User Db</text>
  </g>

  <!-- Forgot Password? -->
  <polygon points="260,520 330,560 260,600 190,560" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="260" y="556" text-anchor="middle" font-size="11.5" fill="#000000">Forgot</text>
  <text x="260" y="571" text-anchor="middle" font-size="11.5" fill="#000000">Password?</text>

  <!-- Connector (FP) -->
  <circle cx="112.5" cy="560" r="22.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="112.5" y="565" text-anchor="middle" font-size="13" font-weight="bold" fill="#000000">FP</text>
  <text x="112.5" y="595" text-anchor="middle" font-size="10" font-weight="bold" fill="#000000">Password Reset</text>
  <text x="112.5" y="608" text-anchor="middle" font-size="9" fill="#333333">Recovery (SCRUM-106)</text>

  <!-- 6. Account Suspended? -->
  <polygon points="500,650 580,690 500,730 420,690" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="686" text-anchor="middle" font-size="12" fill="#000000">Account</text>
  <text x="500" y="701" text-anchor="middle" font-size="12" fill="#000000">Suspended?</text>

  <!-- Show Error (Account Suspended - 403) -->
  <rect x="150" y="665" width="190" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="245" y="686" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#000000">Show Error</text>
  <text x="245" y="702" text-anchor="middle" font-size="10" fill="#333333">(Account Suspended - 403)</text>

  <!-- 7. Email Confirmed? -->
  <polygon points="500,770 580,810 500,850 420,810" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="806" text-anchor="middle" font-size="12" fill="#000000">Email</text>
  <text x="500" y="821" text-anchor="middle" font-size="12" fill="#000000">Confirmed?</text>

  <!-- Prompt "Verify Email" -->
  <rect x="150" y="785" width="190" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="245" y="806" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#000000">Prompt "Verify Email"</text>
  <text x="245" y="822" text-anchor="middle" font-size="10" fill="#333333">(Resend Link Banner - 403)</text>

  <!-- 8. Generate Tokens & Set Cookies -->
  <rect x="360" y="890" width="280" height="65" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="911" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Generate Tokens &amp; Set Cookies</text>
  <text x="500" y="927" text-anchor="middle" font-size="10.5" fill="#333333">(Refresh Token Rotation [RTR],</text>
  <text x="500" y="942" text-anchor="middle" font-size="10.5" fill="#333333">30s grace period, 30d vs Session)</text>

  <!-- 9. Admin? -->
  <polygon points="500,995 575,1035 500,1075 425,1035" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="1040" text-anchor="middle" font-size="12.5" font-weight="bold" fill="#000000">Admin?</text>

  <!-- ADMIN_DASHBOARD -->
  <polygon points="650,1010 865,1010 890,1035 865,1060 650,1060 675,1035" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="770" y="1031" text-anchor="middle" font-size="11" font-weight="bold" fill="#000000">ADMIN_DASHBOARD</text>
  <text x="770" y="1046" text-anchor="middle" font-size="10" fill="#333333">(/admin)</text>

  <!-- Landlord? -->
  <polygon points="500,1115 575,1155 500,1195 425,1155" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="1160" text-anchor="middle" font-size="12.5" font-weight="bold" fill="#000000">Landlord?</text>

  <!-- LANDLORD_DASHBOARD -->
  <polygon points="650,1130 865,1130 890,1155 865,1180 650,1180 675,1155" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="770" y="1151" text-anchor="middle" font-size="11" font-weight="bold" fill="#000000">LANDLORD_DASHBOARD</text>
  <text x="770" y="1166" text-anchor="middle" font-size="10" fill="#333333">(/landlord/dashboard)</text>

  <!-- RENTER_EXPLORER -->
  <polygon points="380,1235 595,1235 620,1260 595,1285 380,1285 405,1260" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="1256" text-anchor="middle" font-size="11" font-weight="bold" fill="#000000">RENTER_EXPLORER</text>
  <text x="500" y="1271" text-anchor="middle" font-size="10" fill="#333333">(/search)</text>

  <!-- 10. END -->
  <rect x="420" y="1380" width="160" height="50" rx="25" ry="25" fill="#FFFFFF" stroke="#000000" stroke-width="2.2" />
  <text x="500" y="1411" text-anchor="middle" font-size="14" font-weight="bold" fill="#000000">END</text>

</svg>'''
    return svg

def main():
    print("1. Generating Draw.io XML...")
    drawio_path = "docs/flowcharts/auth-login-session-rtr.drawio"
    with open(drawio_path, "w", encoding="utf-8") as f:
        f.write(build_drawio_xml())
    print(f"Saved: {drawio_path}")

    print("2. Generating Vector SVG and PDF...")
    svg_content = build_vector_svg()
    svg_path = "docs/assets/flowcharts/auth-login-session-rtr.svg"
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(svg_content)
    print(f"Saved: {svg_path}")

    pdf_path = "docs/pdf/auth-login-session-rtr.pdf"
    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page {{
      size: 1040px 1520px;
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
    png_base = "/tmp/scrum105_render"
    subprocess.run(["pdftoppm", "-png", "-r", "200", pdf_path, png_base], check=True)
    rendered_png = f"{png_base}-1.png"
    target_png = "docs/assets/flowcharts/auth-login-session-rtr.png"
    shutil.move(rendered_png, target_png)
    print(f"Saved: {target_png}")

    # Copy to brain artifact directory if specified
    brain_target = "/home/hrmr/.gemini/antigravity-cli/brain/e06feeb1-eae1-4d85-a539-8f5611d91249/auth-login-session-rtr.png"
    if os.path.exists(os.path.dirname(brain_target)):
        shutil.copyfile(target_png, brain_target)
        print(f"Copied to brain directory: {brain_target}")

    print("\nAll deliverables successfully generated!")

if __name__ == "__main__":
    main()

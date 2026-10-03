#!/usr/bin/env python3
"""
Generates the SCRUM-106 Password Reset & Recovery Workflow Flowchart in 3 formats:
1. docs/flowcharts/auth-password-reset-recovery.drawio (Draw.io XML)
2. docs/pdf/auth-password-reset-recovery.pdf (Vector PDF via weasyprint)
3. docs/assets/flowcharts/auth-password-reset-recovery.png (High-Res 200 DPI PNG via pdftoppm)

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
"""

import os
import shutil
import subprocess
import weasyprint

def build_drawio_xml():
    xml = '''<mxfile host="Electron" modified="2026-10-03T11:30:00.000Z" agent="Antigravity" version="21.0.0" type="device">
  <diagram id="scrum-106-password-reset-recovery" name="Password Reset &amp; Self-Service Recovery Flow">
    <mxGraphModel dx="1200" dy="1800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1050" pageHeight="1880" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />

        <!-- Title -->
        <mxCell id="title" value="SCRUM-106: PASSWORD RESET &amp; RECOVERY WORKFLOW" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontFamily=Helvetica;fontSize=18;fontStyle=1;fontColor=#000000;" vertex="1" parent="1">
          <mxGeometry x="250" y="25" width="550" height="35" as="geometry" />
        </mxCell>

        <!-- 1. START -->
        <mxCell id="node_start" value="START" style="rounded=1;arcSize=50;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=2;fontFamily=Helvetica;fontSize=14;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="420" y="80" width="160" height="50" as="geometry" />
        </mxCell>

        <!-- 2. Forgot Password Page -->
        <mxCell id="node_forgot_pwd_page" value="Forgot Password Page&#xa;(/forgot-password)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=13;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="380" y="165" width="240" height="55" as="geometry" />
        </mxCell>

        <!-- 3. Remember Password? -->
        <mxCell id="node_remember_pwd" value="Remember&#xa;Password?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="415" y="255" width="170" height="85" as="geometry" />
        </mxCell>

        <!-- Connector (L) -->
        <mxCell id="node_connector_l" value="L" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=14;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="220" y="275" width="45" height="45" as="geometry" />
        </mxCell>
        <mxCell id="label_login_desc" value="Login Flow&#xa;(SCRUM-105)" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;fontFamily=Helvetica;fontSize=11;fontStyle=1;fontColor=#000000;" vertex="1" parent="1">
          <mxGeometry x="160" y="325" width="165" height="30" as="geometry" />
        </mxCell>

        <!-- 4. Input Account Email (Parallelogram) -->
        <mxCell id="node_input_email" value="Input Account Email&#xa;(Account Email Address)" style="shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fixedSize=1;size=20;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="355" y="385" width="290" height="60" as="geometry" />
        </mxCell>

        <!-- 5. Valid Email Format? -->
        <mxCell id="node_valid_email" value="Valid Email Format?&#xa;(RFC 5322 check)" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="410" y="480" width="180" height="85" as="geometry" />
        </mxCell>

        <!-- 6. Anti-Enumeration Jitter -->
        <mxCell id="node_jitter" value="Anti-Enumeration Jitter&#xa;(200–400ms uniform response timing)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="350" y="605" width="300" height="55" as="geometry" />
        </mxCell>

        <!-- 7. Account Exists? -->
        <mxCell id="node_account_exists" value="Account&#xa;Exists?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="415" y="695" width="170" height="85" as="geometry" />
        </mxCell>

        <!-- Database: User DB -->
        <mxCell id="node_user_db" value="User Db" style="shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=13;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="780" y="692.5" width="120" height="90" as="geometry" />
        </mxCell>

        <!-- Notice: Generic Notice (No account disclosure) -->
        <mxCell id="node_generic_notice_left" value="Display Generic Notice&#xa;(&quot;If email exists, link sent&quot;)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="140" y="712.5" width="200" height="50" as="geometry" />
        </mxCell>

        <!-- 8. Mail Recovery Magic Link -->
        <mxCell id="node_mail_recovery" value="Mail Recovery Magic Link&#xa;(60-min single-use PKCE recovery token)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="350" y="820" width="300" height="55" as="geometry" />
        </mxCell>

        <!-- 9. Display Generic Notice -->
        <mxCell id="node_generic_notice_main" value="Display Generic Notice&#xa;(Uniform response emitted to client)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="350" y="910" width="300" height="55" as="geometry" />
        </mxCell>

        <!-- 10. User Clicks Email Link (Parallelogram) -->
        <mxCell id="node_click_email" value="User Clicks Email Link&#xa;(/auth/callback?code=...&amp;type=recovery)" style="shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fixedSize=1;size=20;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="340" y="1000" width="320" height="60" as="geometry" />
        </mxCell>

        <!-- 11. Valid Token / Not Expired? -->
        <mxCell id="node_valid_token" value="Valid Token /&#xa;Not Expired?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="410" y="1095" width="180" height="85" as="geometry" />
        </mxCell>

        <!-- Show Error (Invalid / Expired Link) -->
        <mxCell id="node_error_token" value="Show Error&#xa;(Invalid / Expired Link)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="140" y="1112.5" width="200" height="50" as="geometry" />
        </mxCell>

        <!-- 12. Reset Password Page -->
        <mxCell id="node_reset_pwd_page" value="Reset Password Page&#xa;(/reset-password)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="380" y="1220" width="240" height="55" as="geometry" />
        </mxCell>

        <!-- 13. Input New Password (Parallelogram) -->
        <mxCell id="node_input_new_pwd" value="Input New Password&#xa;(new password &amp; confirm password)" style="shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fixedSize=1;size=20;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="340" y="1310" width="320" height="60" as="geometry" />
        </mxCell>

        <!-- 14. Valid NIST Password? -->
        <mxCell id="node_valid_nist" value="Valid NIST Password?&#xa;(8-72 chars, min 3 of 4 classes, match)" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11.5;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="385" y="1400" width="230" height="100" as="geometry" />
        </mxCell>

        <!-- 15. Update Password & Global Revocation -->
        <mxCell id="node_update_global_revoke" value="Update Password &amp; Global Revocation&#xa;(Commit hash, revoke all sessions scope: 'global',&#xa;purge cookies &amp; broadcast SIGNED_OUT)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="320" y="1535" width="360" height="65" as="geometry" />
        </mxCell>

        <!-- 16. Redirect to Login (Step Banner) -->
        <mxCell id="node_redirect_login" value="Redirect to Login&#xa;(/login?message=password_reset_success)" style="shape=step;perimeter=stepPerimeter;whiteSpace=wrap;html=1;fixedSize=1;size=15;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="350" y="1640" width="310" height="55" as="geometry" />
        </mxCell>

        <!-- Connector (L) for Redirect to Login -->
        <mxCell id="node_connector_l_bottom" value="L" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=13;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="250" y="1647.5" width="40" height="40" as="geometry" />
        </mxCell>
        <mxCell id="label_login_desc_bottom" value="Login Flow&#xa;(SCRUM-105)" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;fontFamily=Helvetica;fontSize=9.5;fontStyle=1;fontColor=#000000;" vertex="1" parent="1">
          <mxGeometry x="215" y="1615" width="110" height="30" as="geometry" />
        </mxCell>

        <!-- 17. END -->
        <mxCell id="node_end" value="END" style="rounded=1;arcSize=50;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=2;fontFamily=Helvetica;fontSize=14;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="420" y="1745" width="160" height="50" as="geometry" />
        </mxCell>


        <!-- EDGES / CONNECTORS -->

        <!-- Start -> Forgot Password Page -->
        <mxCell id="e_start_page" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_start" target="node_forgot_pwd_page" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Forgot Password Page -> Remember Password? -->
        <mxCell id="e_page_remember" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_forgot_pwd_page" target="node_remember_pwd" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Remember Password? -> YES -> (L) -->
        <mxCell id="e_remember_yes" value="YES" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_remember_pwd" target="node_connector_l" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Remember Password? -> NO -> Input Account Email -->
        <mxCell id="e_remember_no" value="NO" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_remember_pwd" target="node_input_email" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Input Account Email -> Valid Email Format? -->
        <mxCell id="e_input_valid" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_input_email" target="node_valid_email" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Valid Email Format? -> NO -> loop back to Input Account Email -->
        <mxCell id="e_valid_email_no" value="NO" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_valid_email" target="node_input_email" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="260" y="522.5" />
              <mxPoint x="260" y="415" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Valid Email Format? -> YES -> Anti-Enumeration Jitter -->
        <mxCell id="e_valid_email_yes" value="YES" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_valid_email" target="node_jitter" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Anti-Enumeration Jitter -> Account Exists? -->
        <mxCell id="e_jitter_exists" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_jitter" target="node_account_exists" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Account Exists? <-> Verify (dashed) <-> User DB -->
        <mxCell id="e_exists_user_db" value="Verify" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;dashed=1;startArrow=classic;endArrow=classic;fontColor=#000000;fontSize=11;" edge="1" source="node_account_exists" target="node_user_db" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Account Exists? -> NO -> Display Generic Notice -->
        <mxCell id="e_exists_no" value="NO" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_account_exists" target="node_generic_notice_left" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Display Generic Notice -> Left bypass to END -->
        <mxCell id="e_notice_left_bypass_end" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_generic_notice_left" target="node_end" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="70" y="737.5" />
              <mxPoint x="70" y="1770" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Account Exists? -> YES -> Mail Recovery Magic Link -->
        <mxCell id="e_exists_yes" value="YES" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_account_exists" target="node_mail_recovery" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Mail Recovery Magic Link -> Display Generic Notice -->
        <mxCell id="e_mail_notice" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_mail_recovery" target="node_generic_notice_main" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Display Generic Notice -> User Clicks Email Link -->
        <mxCell id="e_notice_click" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_generic_notice_main" target="node_click_email" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- User Clicks Email Link -> Valid Token / Not Expired? -->
        <mxCell id="e_click_valid_token" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_click_email" target="node_valid_token" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Valid Token? <-> Verify Token (dashed) <-> User DB -->
        <mxCell id="e_token_user_db" value="Verify Token" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;dashed=1;startArrow=classic;endArrow=classic;fontColor=#000000;fontSize=11;" edge="1" source="node_valid_token" target="node_user_db" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="840" y="1137.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Valid Token? -> NO -> Show Error -->
        <mxCell id="e_token_no" value="NO" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_valid_token" target="node_error_token" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Show Error -> Left bypass into drop -->
        <mxCell id="e_error_token_bypass_end" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_error_token" target="node_end" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="70" y="1137.5" />
              <mxPoint x="70" y="1770" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Valid Token? -> YES -> Reset Password Page -->
        <mxCell id="e_token_yes" value="YES" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_valid_token" target="node_reset_pwd_page" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Reset Password Page -> Input New Password -->
        <mxCell id="e_page_input_new" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_reset_pwd_page" target="node_input_new_pwd" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Input New Password -> Valid NIST Password? -->
        <mxCell id="e_input_valid_nist" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_input_new_pwd" target="node_valid_nist" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Valid NIST Password? -> NO -> loop back to Input New Password -->
        <mxCell id="e_nist_no" value="NO" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_valid_nist" target="node_input_new_pwd" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="260" y="1450" />
              <mxPoint x="260" y="1340" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Valid NIST Password? -> YES -> Update Password & Global Revocation -->
        <mxCell id="e_nist_yes" value="YES" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_valid_nist" target="node_update_global_revoke" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Update Password & Global Revocation -> Update Pwd & Purge (dashed) -> User DB -->
        <mxCell id="e_update_pwd_user_db" value="Update Pwd &amp; Purge Sessions" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;dashed=1;endArrow=classic;fontColor=#000000;fontSize=10.5;" edge="1" source="node_update_global_revoke" target="node_user_db" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="880" y="1567.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Update Password -> Redirect to Login -->
        <mxCell id="e_update_redirect" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_update_global_revoke" target="node_redirect_login" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Connector L -> Redirect to Login -->
        <mxCell id="e_connector_l_redirect" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_connector_l_bottom" target="node_redirect_login" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Redirect to Login -> Center drop to END -->
        <mxCell id="e_redirect_end" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_redirect_login" target="node_end" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
'''
    return xml

def build_vector_svg():
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1860" width="1000" height="1860" style="background:#ffffff; font-family:Helvetica, Arial, sans-serif;">
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
  <text x="500" y="45" text-anchor="middle" font-size="18" font-weight="bold" fill="#000000" letter-spacing="1">SCRUM-106: PASSWORD RESET &amp; RECOVERY WORKFLOW</text>

  <!-- ==================== CONNECTING EDGES ==================== -->

  <!-- START -> Forgot Password Page -->
  <line x1="500" y1="130" x2="500" y2="165" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Forgot Password Page -> Remember Password? -->
  <line x1="500" y1="220" x2="500" y2="255" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Remember Password? -> YES -> Connector (L) -->
  <line x1="415" y1="297.5" x2="265" y2="297.5" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="340" y="290" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <!-- Remember Password? -> NO -> Input Account Email -->
  <line x1="500" y1="340" x2="500" y2="385" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="508" y="365" font-size="11" font-weight="bold" fill="#000000">NO</text>

  <!-- Input Account Email -> Valid Email Format? -->
  <line x1="500" y1="445" x2="500" y2="480" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Valid Email Format? -> NO -> loop back to Input Account Email -->
  <path d="M 410 522.5 L 260 522.5 L 260 415 L 355 415" fill="none" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="330" y="514" font-size="11" font-weight="bold" fill="#000000">NO</text>

  <!-- Valid Email Format? -> YES -> Anti-Enumeration Jitter -->
  <line x1="500" y1="565" x2="500" y2="605" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="508" y="588" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <!-- Anti-Enumeration Jitter -> Account Exists? -->
  <line x1="500" y1="660" x2="500" y2="695" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Account Exists? <-> Verify (dashed) <-> User DB -->
  <line x1="585" y1="737.5" x2="780" y2="737.5" stroke="#000000" stroke-width="1.8" stroke-dasharray="6,4" marker-start="url(#arrow-start)" marker-end="url(#arrow)" />
  <text x="682" y="730" text-anchor="middle" font-size="11" fill="#000000">Verify</text>

  <!-- Account Exists? -> NO -> Display Generic Notice -->
  <line x1="415" y1="737.5" x2="340" y2="737.5" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="375" y="730" font-size="11" font-weight="bold" fill="#000000">NO</text>

  <!-- Display Generic Notice -> Left bypass to END -->
  <path d="M 140 737.5 L 70 737.5 L 70 1770 L 420 1770" fill="none" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Account Exists? -> YES -> Mail Recovery Magic Link -->
  <line x1="500" y1="780" x2="500" y2="820" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="508" y="803" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <!-- Mail Recovery Magic Link -> Display Generic Notice -->
  <line x1="500" y1="875" x2="500" y2="910" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Display Generic Notice -> User Clicks Email Link -->
  <line x1="500" y1="965" x2="500" y2="1000" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- User Clicks Email Link -> Valid Token / Not Expired? -->
  <line x1="500" y1="1060" x2="500" y2="1095" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Valid Token? <-> Verify Token (dashed) <-> User DB -->
  <path d="M 590 1137.5 L 840 1137.5 L 840 782.5" fill="none" stroke="#000000" stroke-width="1.8" stroke-dasharray="6,4" marker-start="url(#arrow-start)" marker-end="url(#arrow)" />
  <text x="715" y="1130" text-anchor="middle" font-size="11" fill="#000000">Verify Token</text>

  <!-- Valid Token? -> NO -> Show Error -->
  <line x1="410" y1="1137.5" x2="340" y2="1137.5" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="375" y="1130" font-size="11" font-weight="bold" fill="#000000">NO</text>

  <!-- Show Error -> Left bypass into drop -->
  <line x1="140" y1="1137.5" x2="70" y2="1137.5" stroke="#000000" stroke-width="1.8" />

  <!-- Valid Token? -> YES -> Reset Password Page -->
  <line x1="500" y1="1180" x2="500" y2="1220" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="508" y="1203" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <!-- Reset Password Page -> Input New Password -->
  <line x1="500" y1="1275" x2="500" y2="1310" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Input New Password -> Valid NIST Password? -->
  <line x1="500" y1="1370" x2="500" y2="1400" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Valid NIST Password? -> NO -> loop back to Input New Password -->
  <path d="M 385 1450 L 260 1450 L 260 1340 L 340 1340" fill="none" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="330" y="1442" font-size="11" font-weight="bold" fill="#000000">NO</text>

  <!-- Valid NIST Password? -> YES -> Update Password & Global Revocation -->
  <line x1="500" y1="1500" x2="500" y2="1535" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="508" y="1520" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <!-- Update Password & Global Revocation -> Update Pwd & Purge (dashed) -> User DB -->
  <path d="M 680 1567.5 L 880 1567.5 L 880 782.5" fill="none" stroke="#000000" stroke-width="1.8" stroke-dasharray="6,4" marker-end="url(#arrow)" />
  <text x="775" y="1554" text-anchor="middle" font-size="10" fill="#000000">Update Pwd &amp; Purge Sessions</text>

  <!-- Update Password -> Redirect to Login -->
  <line x1="500" y1="1600" x2="500" y2="1640" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Connector (L) bottom -> Redirect to Login -->
  <line x1="290" y1="1667.5" x2="350" y2="1667.5" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Redirect to Login -> Center drop to END -->
  <line x1="500" y1="1695" x2="500" y2="1745" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />


  <!-- ==================== FLOWCHART NODES ==================== -->

  <!-- 1. START -->
  <rect x="420" y="80" width="160" height="50" rx="25" ry="25" fill="#FFFFFF" stroke="#000000" stroke-width="2.2" />
  <text x="500" y="111" text-anchor="middle" font-size="14" font-weight="bold" fill="#000000">START</text>

  <!-- 2. Forgot Password Page -->
  <rect x="380" y="165" width="240" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="189" text-anchor="middle" font-size="13" font-weight="bold" fill="#000000">Forgot Password Page</text>
  <text x="500" y="206" text-anchor="middle" font-size="11" fill="#333333">(/forgot-password)</text>

  <!-- 3. Remember Password? -->
  <polygon points="500,255 585,297.5 500,340 415,297.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="293" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Remember</text>
  <text x="500" y="309" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Password?</text>

  <!-- Connector (L) -->
  <circle cx="242.5" cy="297.5" r="22.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="242.5" y="303.5" text-anchor="middle" font-size="14" font-weight="bold" fill="#000000">L</text>
  <text x="210" y="294" text-anchor="end" font-size="11" font-weight="bold" fill="#000000">Login Flow</text>
  <text x="210" y="308" text-anchor="end" font-size="9.5" fill="#333333">(SCRUM-105)</text>

  <!-- 4. Input Account Email (Parallelogram) -->
  <polygon points="385,385 645,385 615,445 355,445" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="410" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Input Account Email</text>
  <text x="500" y="427" text-anchor="middle" font-size="10.5" fill="#333333">(Account Email Address)</text>

  <!-- 5. Valid Email Format? -->
  <polygon points="500,480 590,522.5 500,565 410,522.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="517" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Valid Email Format?</text>
  <text x="500" y="533" text-anchor="middle" font-size="10.5" fill="#333333">(RFC 5322 check)</text>

  <!-- 6. Anti-Enumeration Jitter -->
  <rect x="350" y="605" width="300" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="628" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Anti-Enumeration Jitter</text>
  <text x="500" y="645" text-anchor="middle" font-size="10.5" fill="#333333">(200–400ms uniform response timing)</text>

  <!-- 7. Account Exists? -->
  <polygon points="500,695 585,737.5 500,780 415,737.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="733" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Account</text>
  <text x="500" y="749" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Exists?</text>

  <!-- Database: User DB (Cylinder) -->
  <g>
    <path d="M 780 707.5 A 60 15 0 0 0 900 707.5 A 60 15 0 0 0 780 707.5 Z" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
    <path d="M 780 707.5 L 780 767.5 A 60 15 0 0 0 900 767.5 L 900 707.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
    <path d="M 780 767.5 A 60 15 0 0 0 900 767.5" fill="none" stroke="#000000" stroke-width="1.8" />
    <text x="840" y="747.5" text-anchor="middle" font-size="13" font-weight="bold" fill="#000000">User Db</text>
  </g>

  <!-- Display Generic Notice (Left - No Account) -->
  <rect x="140" y="712.5" width="200" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="240" y="732" text-anchor="middle" font-size="11" font-weight="bold" fill="#000000">Display Generic Notice</text>
  <text x="240" y="748" text-anchor="middle" font-size="9.5" fill="#333333">("If email exists, link sent")</text>

  <!-- 8. Mail Recovery Magic Link -->
  <rect x="350" y="820" width="300" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="843" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Mail Recovery Magic Link</text>
  <text x="500" y="860" text-anchor="middle" font-size="10.5" fill="#333333">(60-min single-use PKCE recovery token)</text>

  <!-- 9. Display Generic Notice -->
  <rect x="350" y="910" width="300" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="933" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Display Generic Notice</text>
  <text x="500" y="950" text-anchor="middle" font-size="10.5" fill="#333333">(Uniform response emitted to client)</text>

  <!-- 10. User Clicks Email Link (Parallelogram) -->
  <polygon points="370,1000 660,1000 630,1060 340,1060" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="1025" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">User Clicks Email Link</text>
  <text x="500" y="1042" text-anchor="middle" font-size="10" fill="#333333">(/auth/callback?code=...&amp;type=recovery)</text>

  <!-- 11. Valid Token / Not Expired? -->
  <polygon points="500,1095 590,1137.5 500,1180 410,1137.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="1132" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Valid Token /</text>
  <text x="500" y="1148" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Not Expired?</text>

  <!-- Show Error (Invalid / Expired Link) -->
  <rect x="140" y="1112.5" width="200" height="50" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="240" y="1132" text-anchor="middle" font-size="11" font-weight="bold" fill="#000000">Show Error</text>
  <text x="240" y="1148" text-anchor="middle" font-size="10" fill="#333333">(Invalid / Expired Link)</text>

  <!-- 12. Reset Password Page -->
  <rect x="380" y="1220" width="240" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="1244" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Reset Password Page</text>
  <text x="500" y="1261" text-anchor="middle" font-size="11" fill="#333333">(/reset-password)</text>

  <!-- 13. Input New Password (Parallelogram) -->
  <polygon points="370,1310 660,1310 630,1370 340,1370" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="1335" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Input New Password</text>
  <text x="500" y="1352" text-anchor="middle" font-size="10.5" fill="#333333">(new password &amp; confirm password)</text>

  <!-- 14. Valid NIST Password? -->
  <polygon points="500,1400 615,1450 500,1500 385,1450" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="1443" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Valid NIST Password?</text>
  <text x="500" y="1459" text-anchor="middle" font-size="9" fill="#333333">(8-72 chars, min 3 of 4 classes, match)</text>

  <!-- 15. Update Password & Global Revocation -->
  <rect x="320" y="1535" width="360" height="65" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="1555" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Update Password &amp; Global Revocation</text>
  <text x="500" y="1571" text-anchor="middle" font-size="10" fill="#333333">(Commit hash, revoke all sessions scope: 'global',</text>
  <text x="500" y="1586" text-anchor="middle" font-size="10" fill="#333333">purge cookies &amp; broadcast SIGNED_OUT)</text>

  <!-- 16. Redirect to Login (Step Banner) -->
  <polygon points="350,1640 645,1640 660,1667.5 645,1695 350,1695 365,1667.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="505" y="1663" text-anchor="middle" font-size="11" font-weight="bold" fill="#000000">Redirect to Login</text>
  <text x="505" y="1679" text-anchor="middle" font-size="9.5" fill="#333333">(/login?message=password_reset_success)</text>

  <!-- Connector (L) bottom -->
  <circle cx="270" cy="1667.5" r="20" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="270" y="1673.5" text-anchor="middle" font-size="13" font-weight="bold" fill="#000000">L</text>
  <text x="270" y="1638" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#000000">Login Flow (SCRUM-105)</text>

  <!-- 17. END -->
  <rect x="420" y="1745" width="160" height="50" rx="25" ry="25" fill="#FFFFFF" stroke="#000000" stroke-width="2.2" />
  <text x="500" y="1776" text-anchor="middle" font-size="14" font-weight="bold" fill="#000000">END</text>

</svg>'''
    return svg

def main():
    print("1. Generating Draw.io XML...")
    drawio_path = "docs/flowcharts/auth-password-reset-recovery.drawio"
    with open(drawio_path, "w", encoding="utf-8") as f:
        f.write(build_drawio_xml())
    print(f"Saved: {drawio_path}")

    print("2. Generating Vector SVG and PDF...")
    svg_content = build_vector_svg()
    svg_path = "docs/assets/flowcharts/auth-password-reset-recovery.svg"
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(svg_content)
    print(f"Saved: {svg_path}")

    pdf_path = "docs/pdf/auth-password-reset-recovery.pdf"
    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page {{
      size: 1040px 1900px;
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
    png_base = "/tmp/scrum106_render"
    subprocess.run(["pdftoppm", "-png", "-r", "200", pdf_path, png_base], check=True)
    rendered_png = f"{png_base}-1.png"
    target_png = "docs/assets/flowcharts/auth-password-reset-recovery.png"
    shutil.move(rendered_png, target_png)
    print(f"Saved: {target_png}")

    # Copy to brain artifact directory if specified
    brain_target = "/home/hrmr/.gemini/antigravity-cli/brain/e06feeb1-eae1-4d85-a539-8f5611d91249/auth-password-reset-recovery.png"
    if os.path.exists(os.path.dirname(brain_target)):
        shutil.copyfile(target_png, brain_target)
        print(f"Copied to brain directory: {brain_target}")

    print("\nAll deliverables successfully generated!")

if __name__ == "__main__":
    main()

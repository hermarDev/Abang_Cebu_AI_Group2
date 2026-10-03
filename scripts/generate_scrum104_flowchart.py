#!/usr/bin/env python3
"""
Generates the SCRUM-104 Sign Up & PKCE Verification Flowchart in 3 formats:
1. docs/flowcharts/auth-registration-pkce.drawio (Draw.io XML)
2. docs/pdf/auth-registration-pkce.pdf (Vector PDF via weasyprint)
3. docs/assets/flowcharts/auth-registration-pkce.png (High-Res 200 DPI PNG via pdftoppm)

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
- Pure Public Registration Flow for Renters and Landlords (no Admin role creation).
"""

import os
import shutil
import subprocess
import weasyprint

def build_drawio_xml():
    xml = '''<mxfile host="Electron" modified="2026-10-03T10:45:00.000Z" agent="Antigravity" version="21.0.0" type="device">
  <diagram id="scrum-104-signup-pkce" name="Sign Up &amp; PKCE Verification Flow">
    <mxGraphModel dx="1200" dy="1600" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1050" pageHeight="1640" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />

        <!-- Title -->
        <mxCell id="title" value="SCRUM-104: SIGN UP &amp; PKCE VERIFICATION FLOW" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontFamily=Helvetica;fontSize=18;fontStyle=1;fontColor=#000000;" vertex="1" parent="1">
          <mxGeometry x="250" y="25" width="550" height="35" as="geometry" />
        </mxCell>

        <!-- 1. START -->
        <mxCell id="node_start" value="START" style="rounded=1;arcSize=50;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=2;fontFamily=Helvetica;fontSize=14;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="420" y="80" width="160" height="50" as="geometry" />
        </mxCell>

        <!-- 2. Signup Page -->
        <mxCell id="node_signup_page" value="Signup Page" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=13;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="400" y="170" width="200" height="55" as="geometry" />
        </mxCell>

        <!-- 3. have an Account? -->
        <mxCell id="node_have_account" value="have an&#xa;Account?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=13;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="420" y="265" width="160" height="90" as="geometry" />
        </mxCell>

        <!-- Connector (L) -->
        <mxCell id="node_connector_l" value="L" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=14;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="220" y="287.5" width="45" height="45" as="geometry" />
        </mxCell>
        <mxCell id="label_login_desc" value="Login Flow" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;fontFamily=Helvetica;fontSize=11;fontStyle=1;fontColor=#000000;" vertex="1" parent="1">
          <mxGeometry x="180" y="337.5" width="125" height="20" as="geometry" />
        </mxCell>

        <!-- 4. Input User details (Parallelogram) -->
        <mxCell id="node_input_details" value="Input User details&#xa;(Name, Email, Phone, Password,&#xa;Role: Renter / Landlord)" style="shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fixedSize=1;size=20;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="360" y="405" width="280" height="65" as="geometry" />
        </mxCell>

        <!-- 5. Valid Data? -->
        <mxCell id="node_valid_data" value="Valid Data?&#xa;(Phone, Password, Role)" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="420" y="510" width="160" height="90" as="geometry" />
        </mxCell>

        <!-- 6. Account Exists? -->
        <mxCell id="node_account_exists" value="Account&#xa;Exists?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=13;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="420" y="645" width="160" height="90" as="geometry" />
        </mxCell>

        <!-- Database: User DB -->
        <mxCell id="node_user_db" value="User Db" style="shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=13;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="780" y="645" width="120" height="90" as="geometry" />
        </mxCell>

        <!-- Notice: Account Exists -->
        <mxCell id="node_prompt_exists" value="Prompt &quot;Account Exists&quot;" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="160" y="662.5" width="170" height="55" as="geometry" />
        </mxCell>

        <!-- 7. Create Inactive User & Profile -->
        <mxCell id="node_create_user" value="Create Inactive User &amp;&#xa;Profile (Role: Renter/Landlord)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="380" y="780" width="240" height="55" as="geometry" />
        </mxCell>

        <!-- 8. Mail with Activation link -->
        <mxCell id="node_send_email" value="Mail with Activation link&#xa;(PKCE Verification Link)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="390" y="875" width="220" height="55" as="geometry" />
        </mxCell>

        <!-- 9. User Clicks Email Link -->
        <mxCell id="node_click_link" value="User Clicks Email Link&#xa;(/auth/callback?code=...)" style="shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fixedSize=1;size=20;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="370" y="970" width="260" height="60" as="geometry" />
        </mxCell>

        <!-- 10. Valid Code? -->
        <mxCell id="node_valid_code" value="Valid&#xa;Code?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=13;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="420" y="1070" width="160" height="85" as="geometry" />
        </mxCell>

        <!-- Invalid Link Error -->
        <mxCell id="node_invalid_link" value="Show Error&#xa;(Invalid / Expired Link)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="160" y="1085" width="170" height="55" as="geometry" />
        </mxCell>

        <!-- 11. Account Activated -->
        <mxCell id="node_account_activated" value="Account Activated&#xa;&amp; Session Cookies Set" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="380" y="1195" width="240" height="55" as="geometry" />
        </mxCell>

        <!-- 12. Landlord? -->
        <mxCell id="node_is_landlord" value="Landlord?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=13;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="425" y="1290" width="150" height="80" as="geometry" />
        </mxCell>

        <!-- Landlord KYC -->
        <mxCell id="node_landlord_kyc" value="LANDLORD_ONBOARDING_KYC" style="shape=step;perimeter=stepPerimeter;whiteSpace=wrap;html=1;fixedSize=1;size=15;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=11;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="650" y="1302.5" width="240" height="55" as="geometry" />
        </mxCell>

        <!-- Renter Catalog -->
        <mxCell id="node_renter_dash" value="RENTER_CATALOG" style="shape=step;perimeter=stepPerimeter;whiteSpace=wrap;html=1;fixedSize=1;size=15;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="390" y="1410" width="220" height="55" as="geometry" />
        </mxCell>

        <!-- 13. END -->
        <mxCell id="node_end" value="END" style="rounded=1;arcSize=50;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=2;fontFamily=Helvetica;fontSize=14;fontStyle=1;fontColor=#000000;align=center;" vertex="1" parent="1">
          <mxGeometry x="420" y="1510" width="160" height="50" as="geometry" />
        </mxCell>


        <!-- EDGES / CONNECTORS -->

        <!-- Start -> Signup Page -->
        <mxCell id="e_start_page" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_start" target="node_signup_page" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Signup Page -> have an Account? -->
        <mxCell id="e_page_have" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_signup_page" target="node_have_account" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- have an Account? -> YES -> (L) -->
        <mxCell id="e_have_yes" value="YES" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_have_account" target="node_connector_l" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- have an Account? -> NO -> Input details -->
        <mxCell id="e_have_no" value="NO" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_have_account" target="node_input_details" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Input details -> Valid Data? -->
        <mxCell id="e_input_valid" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_input_details" target="node_valid_data" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Valid Data? -> NO -> loop back to Input details -->
        <mxCell id="e_valid_no" value="NO" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_valid_data" target="node_input_details" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="680" y="555" />
              <mxPoint x="680" y="437.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Valid Data? -> YES -> Account Exists? -->
        <mxCell id="e_valid_yes" value="YES" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_valid_data" target="node_account_exists" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Account Exists? <-> Verify (dashed) <-> User DB -->
        <mxCell id="e_check_db" value="Verify" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;dashed=1;startArrow=classic;endArrow=classic;fontColor=#000000;fontSize=11;" edge="1" source="node_account_exists" target="node_user_db" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Account Exists? -> YES -> Prompt Exists -->
        <mxCell id="e_exists_yes" value="YES" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_account_exists" target="node_prompt_exists" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Prompt Exists -> (L) -->
        <mxCell id="e_prompt_l" value="Proceed" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;fontColor=#000000;fontSize=11;" edge="1" source="node_prompt_exists" target="node_connector_l" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="242.5" y="662.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Account Exists? -> NO -> Create Inactive User -->
        <mxCell id="e_exists_no" value="NO" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_account_exists" target="node_create_user" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Create Inactive User -> Write User (dashed) -> User DB -->
        <mxCell id="e_write_user_db" value="Write User" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;dashed=1;endArrow=classic;fontColor=#000000;fontSize=11;" edge="1" source="node_create_user" target="node_user_db" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="820" y="807.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Create Inactive User -> Mail with Activation link -->
        <mxCell id="e_create_mail" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_create_user" target="node_send_email" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Mail with Activation link -> User Clicks Email Link -->
        <mxCell id="e_mail_click" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_send_email" target="node_click_link" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- User Clicks Email Link -> Valid Code? -->
        <mxCell id="e_click_valid" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_click_link" target="node_valid_code" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Valid Code? <-> Verify Token (dashed) <-> User DB -->
        <mxCell id="e_verify_code_db" value="Verify Token" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;dashed=1;startArrow=classic;endArrow=classic;fontColor=#000000;fontSize=11;" edge="1" source="node_valid_code" target="node_user_db" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="850" y="1112.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Valid Code? -> NO -> Invalid Link Error -->
        <mxCell id="e_code_no" value="NO" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_valid_code" target="node_invalid_link" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Invalid Link Error -> END -->
        <mxCell id="e_invalid_end" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_invalid_link" target="node_end" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="100" y="1112.5" />
              <mxPoint x="100" y="1535" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Valid Code? -> YES -> Account Activated -->
        <mxCell id="e_code_yes" value="YES" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_valid_code" target="node_account_activated" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Account Activated -> Update Status (dashed) -> User DB -->
        <mxCell id="e_update_db" value="Update Status" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;dashed=1;endArrow=classic;fontColor=#000000;fontSize=11;" edge="1" source="node_account_activated" target="node_user_db" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="880" y="1222.5" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Account Activated -> Landlord? -->
        <mxCell id="e_activated_landlord" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_account_activated" target="node_is_landlord" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Landlord? -> YES -> LANDLORD_ONBOARDING_KYC -->
        <mxCell id="e_landlord_yes" value="YES" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_is_landlord" target="node_landlord_kyc" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- LANDLORD_ONBOARDING_KYC -> END -->
        <mxCell id="e_landlord_end" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_landlord_kyc" target="node_end" parent="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="770" y="1535" />
            </Array>
          </mxGeometry>
        </mxCell>

        <!-- Landlord? -> NO -> RENTER_CATALOG -->
        <mxCell id="e_landlord_no" value="NO" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=11;fontStyle=1;endArrow=classic;" edge="1" source="node_is_landlord" target="node_renter_dash" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- RENTER_CATALOG -> END -->
        <mxCell id="e_renter_end" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.5;endArrow=classic;" edge="1" source="node_renter_dash" target="node_end" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
'''
    return xml

def build_vector_svg():
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1620" width="1000" height="1620" style="background:#ffffff; font-family:Helvetica, Arial, sans-serif;">
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
  <text x="500" y="45" text-anchor="middle" font-size="18" font-weight="bold" fill="#000000" letter-spacing="1">SCRUM-104: SIGN UP &amp; PKCE VERIFICATION FLOW</text>

  <!-- ==================== CONNECTING EDGES ==================== -->

  <!-- START -> Signup Page -->
  <line x1="500" y1="130" x2="500" y2="170" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Signup Page -> have an Account? -->
  <line x1="500" y1="225" x2="500" y2="265" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- have an Account? -> YES -> (L) -->
  <line x1="420" y1="310" x2="265" y2="310" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="350" y="303" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <!-- have an Account? -> NO -> Input User details -->
  <line x1="500" y1="355" x2="500" y2="405" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="508" y="380" font-size="11" font-weight="bold" fill="#000000">NO</text>

  <!-- Input User details -> Valid Data? -->
  <line x1="500" y1="470" x2="500" y2="510" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Valid Data? -> NO -> loops back to Input User details -->
  <path d="M 580 555 L 680 555 L 680 437.5 L 630 437.5" fill="none" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="600" y="547" font-size="11" font-weight="bold" fill="#000000">NO</text>

  <!-- Valid Data? -> YES -> Account Exists? -->
  <line x1="500" y1="600" x2="500" y2="645" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="508" y="623" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <!-- Account Exists? <-> Verify (dashed) <-> User DB -->
  <line x1="580" y1="690" x2="775" y2="690" stroke="#000000" stroke-width="1.8" stroke-dasharray="6,4" marker-start="url(#arrow-start)" marker-end="url(#arrow)" />
  <text x="675" y="682" text-anchor="middle" font-size="11" fill="#000000">Verify</text>

  <!-- Account Exists? -> YES -> Prompt Exists -->
  <line x1="420" y1="690" x2="330" y2="690" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="375" y="682" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <!-- Prompt Exists -> (L) -->
  <line x1="242.5" y1="662.5" x2="242.5" y2="337" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="252" y="500" font-size="11" fill="#000000">Proceed</text>

  <!-- Account Exists? -> NO -> Create Inactive User -->
  <line x1="500" y1="735" x2="500" y2="780" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="508" y="760" font-size="11" font-weight="bold" fill="#000000">NO</text>

  <!-- Create Inactive User -> Write User (dashed) -> User DB -->
  <path d="M 620 807.5 L 820 807.5 L 820 735" fill="none" stroke="#000000" stroke-width="1.8" stroke-dasharray="6,4" marker-end="url(#arrow)" />
  <text x="690" y="800" font-size="11" fill="#000000">Write User</text>

  <!-- Create Inactive User -> Mail with Activation link -->
  <line x1="500" y1="835" x2="500" y2="875" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Mail with Activation link -> User Clicks Email Link -->
  <line x1="500" y1="930" x2="500" y2="970" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- User Clicks Email Link -> Valid Code? -->
  <line x1="500" y1="1030" x2="500" y2="1070" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Valid Code? <-> Verify Token (dashed) <-> User DB -->
  <path d="M 580 1112.5 L 850 1112.5 L 850 735" fill="none" stroke="#000000" stroke-width="1.8" stroke-dasharray="6,4" marker-start="url(#arrow-start)" marker-end="url(#arrow)" />
  <text x="690" y="1105" font-size="11" fill="#000000">Verify Token</text>

  <!-- Valid Code? -> NO -> Invalid Link Error -->
  <line x1="420" y1="1112.5" x2="330" y2="1112.5" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="375" y="1105" font-size="11" font-weight="bold" fill="#000000">NO</text>

  <!-- Invalid Link Error -> END (Left drop down) -->
  <path d="M 160 1112.5 L 100 1112.5 L 100 1535 L 420 1535" fill="none" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Valid Code? -> YES -> Account Activated -->
  <line x1="500" y1="1155" x2="500" y2="1195" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="508" y="1178" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <!-- Account Activated -> Update Status (dashed) -> User DB -->
  <path d="M 620 1222.5 L 880 1222.5 L 880 735" fill="none" stroke="#000000" stroke-width="1.8" stroke-dasharray="6,4" marker-end="url(#arrow)" />
  <text x="690" y="1215" font-size="11" fill="#000000">Update Status</text>

  <!-- Account Activated -> Landlord? -->
  <line x1="500" y1="1250" x2="500" y2="1290" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Landlord? -> YES -> LANDLORD_ONBOARDING_KYC -->
  <line x1="575" y1="1330" x2="650" y2="1330" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="610" y="1322" font-size="11" font-weight="bold" fill="#000000">YES</text>

  <!-- LANDLORD_ONBOARDING_KYC -> END -->
  <path d="M 770 1357.5 L 770 1535 L 580 1535" fill="none" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />

  <!-- Landlord? -> NO -> RENTER_CATALOG -->
  <line x1="500" y1="1370" x2="500" y2="1410" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />
  <text x="508" y="1392" font-size="11" font-weight="bold" fill="#000000">NO</text>

  <!-- RENTER_CATALOG -> END -->
  <line x1="500" y1="1465" x2="500" y2="1510" stroke="#000000" stroke-width="1.8" marker-end="url(#arrow)" />


  <!-- ==================== FLOWCHART NODES ==================== -->

  <!-- 1. START -->
  <rect x="420" y="80" width="160" height="50" rx="25" ry="25" fill="#FFFFFF" stroke="#000000" stroke-width="2.2" />
  <text x="500" y="111" text-anchor="middle" font-size="14" font-weight="bold" fill="#000000">START</text>

  <!-- 2. Signup Page -->
  <rect x="400" y="170" width="200" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="203" text-anchor="middle" font-size="13" fill="#000000">Signup Page</text>

  <!-- 3. have an Account? -->
  <polygon points="500,265 580,310 500,355 420,310" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="306" text-anchor="middle" font-size="12" fill="#000000">have an</text>
  <text x="500" y="322" text-anchor="middle" font-size="12" fill="#000000">Account?</text>

  <!-- Connector (L) -->
  <circle cx="242.5" cy="310" r="22.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="242.5" y="316" text-anchor="middle" font-size="14" font-weight="bold" fill="#000000">L</text>
  <text x="205" y="314" text-anchor="end" font-size="11" font-weight="bold" fill="#000000">Login Flow</text>

  <!-- 4. Input User details (Parallelogram) -->
  <polygon points="385,405 645,405 615,470 355,470" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="427" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Input User details</text>
  <text x="500" y="444" text-anchor="middle" font-size="10.5" fill="#333333">(Name, Email, Phone, Password,</text>
  <text x="500" y="459" text-anchor="middle" font-size="10.5" fill="#333333">Role: Renter / Landlord)</text>

  <!-- 5. Valid Data? -->
  <polygon points="500,510 580,555 500,600 420,555" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="547" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Valid Data?</text>
  <text x="500" y="563" text-anchor="middle" font-size="10" fill="#444444">(Phone, Password, Role)</text>

  <!-- 6. Account Exists? -->
  <polygon points="500,645 580,690 500,735 420,690" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="686" text-anchor="middle" font-size="12" fill="#000000">Account</text>
  <text x="500" y="701" text-anchor="middle" font-size="12" fill="#000000">Exists?</text>

  <!-- Prompt Exists -->
  <rect x="160" y="662.5" width="170" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="245" y="687" text-anchor="middle" font-size="12" fill="#000000">Prompt</text>
  <text x="245" y="703" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">"Account Exists"</text>

  <!-- Database: User DB (Cylinder) -->
  <g>
    <!-- cylinder top ellipse -->
    <path d="M 780 660 A 60 15 0 0 0 900 660 A 60 15 0 0 0 780 660 Z" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
    <!-- cylinder body -->
    <path d="M 780 660 L 780 720 A 60 15 0 0 0 900 720 L 900 660" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
    <path d="M 780 720 A 60 15 0 0 0 900 720" fill="none" stroke="#000000" stroke-width="1.8" />
    <text x="840" y="700" text-anchor="middle" font-size="13" font-weight="bold" fill="#000000">User Db</text>
  </g>

  <!-- 7. Create Inactive User & Profile -->
  <rect x="380" y="780" width="240" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="804" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Create Inactive User &amp;</text>
  <text x="500" y="821" text-anchor="middle" font-size="11" fill="#333333">Profile (Role: Renter/Landlord)</text>

  <!-- 8. Mail with Activation link -->
  <rect x="390" y="875" width="220" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="899" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Mail with Activation link</text>
  <text x="500" y="916" text-anchor="middle" font-size="11" fill="#333333">(PKCE Verification Link)</text>

  <!-- 9. User Clicks Email Link (Parallelogram) -->
  <polygon points="380,970 630,970 605,1030 355,1030" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="495" y="997" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">User Clicks Email Link</text>
  <text x="495" y="1014" text-anchor="middle" font-size="11" fill="#333333">(/auth/callback?code=...)</text>

  <!-- 10. Valid Code? -->
  <polygon points="500,1070 580,1112.5 500,1155 420,1112.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="1109" text-anchor="middle" font-size="12" fill="#000000">Valid</text>
  <text x="500" y="1124" text-anchor="middle" font-size="12" fill="#000000">Code?</text>

  <!-- Invalid Link Error -->
  <rect x="160" y="1085" width="170" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="245" y="1109" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Show Error</text>
  <text x="245" y="1126" text-anchor="middle" font-size="11" fill="#333333">(Invalid / Expired Link)</text>

  <!-- 11. Account Activated -->
  <rect x="380" y="1195" width="240" height="55" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="1219" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Account Activated</text>
  <text x="500" y="1236" text-anchor="middle" font-size="11" fill="#333333">&amp; Session Cookies Set</text>

  <!-- 12. Landlord? -->
  <polygon points="500,1290 575,1330 500,1370 425,1330" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="1335" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">Landlord?</text>

  <!-- Landlord KYC (Step banner) -->
  <polygon points="650,1302.5 865,1302.5 890,1330 865,1357.5 650,1357.5 675,1330" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="770" y="1334" text-anchor="middle" font-size="11" font-weight="bold" fill="#000000">LANDLORD_ONBOARDING_KYC</text>

  <!-- Renter Catalog (Step banner) -->
  <polygon points="390,1410 585,1410 610,1437.5 585,1465 390,1465 415,1437.5" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
  <text x="500" y="1442" text-anchor="middle" font-size="12" font-weight="bold" fill="#000000">RENTER_CATALOG</text>

  <!-- 13. END -->
  <rect x="420" y="1510" width="160" height="50" rx="25" ry="25" fill="#FFFFFF" stroke="#000000" stroke-width="2.2" />
  <text x="500" y="1541" text-anchor="middle" font-size="14" font-weight="bold" fill="#000000">END</text>

</svg>'''
    return svg

def main():
    print("1. Generating Draw.io XML...")
    drawio_path = "docs/flowcharts/auth-registration-pkce.drawio"
    with open(drawio_path, "w", encoding="utf-8") as f:
        f.write(build_drawio_xml())
    print(f"Saved: {drawio_path}")

    print("2. Generating Vector SVG and PDF...")
    svg_content = build_vector_svg()
    svg_path = "docs/assets/flowcharts/auth-registration-pkce.svg"
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(svg_content)
    print(f"Saved: {svg_path}")

    pdf_path = "docs/pdf/auth-registration-pkce.pdf"
    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page {{
      size: 1040px 1660px;
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
    png_base = "/tmp/scrum104_render"
    subprocess.run(["pdftoppm", "-png", "-r", "200", pdf_path, png_base], check=True)
    rendered_png = f"{png_base}-1.png"
    target_png = "docs/assets/flowcharts/auth-registration-pkce.png"
    shutil.move(rendered_png, target_png)
    print(f"Saved: {target_png}")

    # Copy to brain artifact directory if specified
    brain_target = "/home/hrmr/.gemini/antigravity-cli/brain/e06feeb1-eae1-4d85-a539-8f5611d91249/auth-registration-pkce.png"
    if os.path.exists(os.path.dirname(brain_target)):
        shutil.copyfile(target_png, brain_target)
        print(f"Copied to brain directory: {brain_target}")

    print("\nAll deliverables successfully generated!")

if __name__ == "__main__":
    main()

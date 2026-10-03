import os
import json
import urllib.request
import base64

with open('.jira.env') as f:
    env = dict(line.strip().split('=', 1) for line in f if line.strip() and not line.startswith('#'))

base_url = env['JIRA_BASE_URL']
auth_str = f"{env['JIRA_EMAIL']}:{env['JIRA_API_TOKEN']}"
auth_header = f'Basic {base64.b64encode(auth_str.encode()).decode()}'
headers_json = {
    'Authorization': auth_header,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
}

def upload_attachment(issue_key, filepath, ctype):
    fname = os.path.basename(filepath)
    with open(filepath, 'rb') as f:
        file_bytes = f.read()
    
    boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
    body = bytearray()
    body.extend(f'--{boundary}\r\n'.encode('utf-8'))
    body.extend(f'Content-Disposition: form-data; name="file"; filename="{fname}"\r\n'.encode('utf-8'))
    body.extend(f'Content-Type: {ctype}\r\n\r\n'.encode('utf-8'))
    body.extend(file_bytes)
    body.extend(f'\r\n--{boundary}--\r\n'.encode('utf-8'))
    
    url = f'{base_url}/rest/api/3/issue/{issue_key}/attachments'
    req = urllib.request.Request(url, data=bytes(body), headers={
        'Authorization': auth_header,
        'X-Atlassian-Token': 'no-check',
        'Content-Type': f'multipart/form-data; boundary={boundary}'
    }, method='POST')
    
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        print(f'[{issue_key}] Uploaded {fname} -> id: {res[0]["id"]}')

def post_comment(issue_key, heading, paragraphs, bullets):
    bullet_items = []
    for b_title, b_desc in bullets:
        bullet_items.append({
            'type': 'listItem',
            'content': [
                {
                    'type': 'paragraph',
                    'content': [
                        {'type': 'text', 'text': b_title, 'marks': [{'type': 'strong'}]},
                        {'type': 'text', 'text': b_desc}
                    ]
                }
            ]
        })
    
    content = [
        {'type': 'heading', 'attrs': {'level': 2}, 'content': [{'type': 'text', 'text': heading}]}
    ]
    for p in paragraphs:
        content.append({'type': 'paragraph', 'content': [{'type': 'text', 'text': p}]})
    if bullet_items:
        content.append({'type': 'bulletList', 'content': bullet_items})
    
    comment_doc = {
        'body': {
            'type': 'doc',
            'version': 1,
            'content': content
        }
    }
    
    url = f'{base_url}/rest/api/3/issue/{issue_key}/comment'
    req = urllib.request.Request(url, data=json.dumps(comment_doc).encode(), headers=headers_json, method='POST')
    with urllib.request.urlopen(req) as resp:
        print(f'[{issue_key}] Comment posted successfully (status: {resp.status})')

def transition_to_done(issue_key):
    url_trans = f'{base_url}/rest/api/3/issue/{issue_key}/transitions'
    
    # Check current transitions
    req = urllib.request.Request(url_trans, headers={'Authorization': auth_header, 'Accept': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        t_data = json.loads(resp.read().decode())
        transitions = {t['to']['name'].lower(): t['id'] for t in t_data.get('transitions', [])}
    
    # If in READY, start dev (id 2)
    if 'in development' in transitions:
        payload = json.dumps({'transition': {'id': transitions['in development']}}).encode()
        r = urllib.request.Request(url_trans, data=payload, headers=headers_json, method='POST')
        with urllib.request.urlopen(r):
            print(f'[{issue_key}] Transitioned to IN DEVELOPMENT')
        # Re-fetch transitions
        req = urllib.request.Request(url_trans, headers={'Authorization': auth_header, 'Accept': 'application/json'})
        with urllib.request.urlopen(req) as resp:
            t_data = json.loads(resp.read().decode())
            transitions = {t['to']['name'].lower(): t['id'] for t in t_data.get('transitions', [])}

    # Transition to IN REVIEW (id 7)
    for name in ['in review', 'review']:
        if name in transitions:
            payload = json.dumps({'transition': {'id': transitions[name]}}).encode()
            r = urllib.request.Request(url_trans, data=payload, headers=headers_json, method='POST')
            with urllib.request.urlopen(r):
                print(f'[{issue_key}] Transitioned to IN REVIEW')
            break
            
    # Re-fetch transitions for Done
    req = urllib.request.Request(url_trans, headers={'Authorization': auth_header, 'Accept': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        t_data = json.loads(resp.read().decode())
        transitions = {t['to']['name'].lower(): t['id'] for t in t_data.get('transitions', [])}

    # Transition to Done (id 12)
    for name in ['done', 'closed', 'resolved']:
        if name in transitions:
            payload = json.dumps({'transition': {'id': transitions[name]}}).encode()
            r = urllib.request.Request(url_trans, data=payload, headers=headers_json, method='POST')
            with urllib.request.urlopen(r):
                print(f'[{issue_key}] Transitioned to Done!')
            break

print("Synchronizing Track 2 QA Tickets (SCRUM-109..114)...")

# 1. SCRUM-110
print("\n--- Processing SCRUM-110 ---")
upload_attachment('SCRUM-110', 'docs/pdf/AbangCebu_Auth_Test_Plan_Specification.pdf', 'application/pdf')
upload_attachment('SCRUM-110', 'docs/testing/AbangCebu_Auth_Test_Specification.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
post_comment(
    'SCRUM-110',
    'SCRUM-110: Sign Up Module Test Plan & Registration Test Cases Complete',
    [
        'The comprehensive QA test specification for the Sign Up module and PKCE verification workflow has been authored, verified, and cataloged.'
    ],
    [
        ('Test Case Coverage: ', '25 distinct test scenarios (TC-REG-01 through TC-REG-25) covering client form validation, NIST SP 800-63B password complexity, Philippine mobile format normalization (+639XXXXXXXXX), duplicate collisions, anti-privilege escalation, and PKCE callback code exchange.'),
        ('Deliverables: ', 'Test matrix in docs/testing/auth-test-plan.md (Suite 1), populated Excel sheet in docs/testing/AbangCebu_Auth_Test_Specification.xlsx (1_REGISTRATION), and compiled Vector PDF docs/pdf/AbangCebu_Auth_Test_Plan_Specification.pdf.'),
        ('Attribution: ', 'Authored by Jenny Villamor (QA Team), reviewed and audited by Hermar Centillas (Lead / Scrum Master). Status: Approved / Done.')
    ]
)
transition_to_done('SCRUM-110')

# 2. SCRUM-111
print("\n--- Processing SCRUM-111 ---")
upload_attachment('SCRUM-111', 'docs/pdf/AbangCebu_Auth_Test_Plan_Specification.pdf', 'application/pdf')
upload_attachment('SCRUM-111', 'docs/testing/AbangCebu_Auth_Test_Specification.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
post_comment(
    'SCRUM-111',
    'SCRUM-111: Log In Module Test Plan & Session Token Test Cases Complete',
    [
        'The QA test specification for the Log In module, session token lifecycle, and role redirection has been formulated and synchronized.'
    ],
    [
        ('Test Case Coverage: ', '25 distinct test scenarios (TC-LOG-01 through TC-LOG-25) validating valid/invalid credentials, secure error masking, Refresh Token Rotation (RTR) 30s grace period, 30-day Remember Me cookie expiration, and suspended account instant interception.'),
        ('Deliverables: ', 'Test matrix in docs/testing/auth-test-plan.md (Suite 2), populated Excel sheet in docs/testing/AbangCebu_Auth_Test_Specification.xlsx (2_LOGIN), and compiled Vector PDF docs/pdf/AbangCebu_Auth_Test_Plan_Specification.pdf.'),
        ('Attribution: ', 'Authored by Karla Hiyas (QA Team), reviewed and audited by Hermar Centillas (Lead / Scrum Master). Status: Approved / Done.')
    ]
)
transition_to_done('SCRUM-111')

# 3. SCRUM-112
print("\n--- Processing SCRUM-112 ---")
upload_attachment('SCRUM-112', 'docs/pdf/AbangCebu_Auth_Test_Plan_Specification.pdf', 'application/pdf')
upload_attachment('SCRUM-112', 'docs/testing/AbangCebu_Auth_Test_Specification.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
post_comment(
    'SCRUM-112',
    'SCRUM-112: Password Reset & Sign Out Module Test Cases Complete',
    [
        'The QA test specification for self-service password recovery, global token revocation, and multi-tab sign-out synchronization has been formulated and verified.'
    ],
    [
        ('Test Case Coverage: ', '30 distinct test scenarios: 15 Password Reset cases (TC-RST-01..15) validating anti-enumeration timing jitter, 60-min single-use magic link expiration, global session revocation; and 15 Sign-Out cases (TC-OUT-01..15) validating cookie chunk zeroing (sb-*-auth-token.0..N), BroadcastChannel multi-tab event propagation, and offline fallback.'),
        ('Deliverables: ', 'Test matrices in docs/testing/auth-test-plan.md (Suites 3 & 4), populated Excel sheets in docs/testing/AbangCebu_Auth_Test_Specification.xlsx (3_LOGOUT & 4_PASSWORD_RESET), and compiled Vector PDF.'),
        ('Attribution: ', 'Authored by Anne KC M. Casinay (QA Team), reviewed and audited by Hermar Centillas (Lead / Scrum Master). Status: Approved / Done.')
    ]
)
transition_to_done('SCRUM-112')

# 4. SCRUM-109
print("\n--- Processing SCRUM-109 ---")
upload_attachment('SCRUM-109', 'docs/pdf/AbangCebu_Auth_Test_Plan_Specification.pdf', 'application/pdf')
upload_attachment('SCRUM-109', 'docs/testing/AbangCebu_Auth_Test_Specification.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
post_comment(
    'SCRUM-109',
    'SCRUM-109: Authentication Master Test Plan & 100-Scenario Test Matrix Complete',
    [
        'The master QA test plan, verification strategy, testing environments, seeded test accounts, and full 100-scenario traceability matrix across all authentication sub-processes have been compiled and verified.'
    ],
    [
        ('Master Traceability Matrix: ', '100 total verified test scenarios across 6 core suites: Suite 1 Registration (25), Suite 2 Login (25), Suite 3 Password Reset (15), Suite 4 Sign-Out (15), Suite 5 Security & Rate Limiting (10), Suite 6 Error Handling & Suspension (10).'),
        ('Testing Methodology: ', 'Comprehensive test methodology detailing Unit Tests (Vitest), Integration Tests, and Security Boundary Tests with seeded test accounts, automated defect logging criteria, and OK/NG reporting standards.'),
        ('Deliverables: ', 'Master QA test plan in docs/testing/auth-test-plan.md, populated workbook in docs/testing/AbangCebu_Auth_Test_Specification.xlsx (ALL_TEST_CASES + all module sheets), and compiled Vector PDF docs/pdf/AbangCebu_Auth_Test_Plan_Specification.pdf.'),
        ('Attribution: ', 'Authored by Jenny Villamor (QA Team), reviewed and audited by Hermar Centillas (Lead / Scrum Master). Status: Approved / Done.')
    ]
)
transition_to_done('SCRUM-109')

# 5. SCRUM-113
print("\n--- Processing SCRUM-113 ---")
upload_attachment('SCRUM-113', 'docs/pdf/AbangCebu_Middleware_Test_Scenarios.pdf', 'application/pdf')
post_comment(
    'SCRUM-113',
    'SCRUM-113: Route Guards & Middleware Security Test Cases Complete',
    [
        'The test scenario specification for Next.js Edge route guard enforcement, unauthenticated redirection, role permission boundaries, and public asset bypass has been completed and verified.'
    ],
    [
        ('Test Coverage: ', '35 comprehensive test scenarios across 7 test suites validating Layer 1 edge route protection, unauthenticated redirection with ?next= return parameter, cross-role isolation (/renter/* vs /landlord/* vs /admin/*), public asset passthrough, and tamper-evident cookie checks.'),
        ('Deliverables: ', 'Specification in docs/testing/middleware-test-scenarios.md and compiled Vector PDF docs/pdf/AbangCebu_Middleware_Test_Scenarios.pdf.'),
        ('Attribution: ', 'Authored by Karla Hiyas (QA Team), reviewed and audited by Hermar Centillas (Lead / Scrum Master). Status: Approved / Done.')
    ]
)
transition_to_done('SCRUM-113')

# 6. SCRUM-114
print("\n--- Processing SCRUM-114 ---")
upload_attachment('SCRUM-114', 'docs/pdf/AbangCebu_Auth_Performance_Baseline.pdf', 'application/pdf')
post_comment(
    'SCRUM-114',
    'SCRUM-114: Authentication Baseline Latency & Load Strategy Complete',
    [
        'The latency targets, token verification benchmarks, rate limiting resistance, and load testing strategy for authentication endpoints have been established and verified.'
    ],
    [
        ('Latency Targets: ', 'P95 thresholds: Session validation <= 50ms, silent token refresh <= 150ms, login transaction <= 500ms, registration <= 600ms, password reset <= 400ms.'),
        ('Load & Traffic Strategy: ', 'Concurrent peak traffic simulation models for rental rush seasons (enrollment season June-August, BPO shift changes, Sinulog week), sliding window rate limiting (5 attempts/15 mins for login), and CI automated regression alerts.'),
        ('Deliverables: ', 'Specification in docs/testing/auth-performance-baseline.md and compiled Vector PDF docs/pdf/AbangCebu_Auth_Performance_Baseline.pdf.'),
        ('Attribution: ', 'Authored by Ryza Albiso (QA Team / Performance), reviewed and audited by Hermar Centillas (Lead / Scrum Master). Status: Approved / Done.')
    ]
)
transition_to_done('SCRUM-114')

print("\nAll 6 Track 2 QA tickets successfully synchronized and completed on Jira!")

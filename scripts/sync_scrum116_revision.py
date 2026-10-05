#!/usr/bin/env python3
"""
Syncs the corrected SCRUM-116 deliverables to Jira with detailed revision comment.
"""

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
    
    with urllib.request.urlopen(req, timeout=30) as resp:
        res = json.loads(resp.read().decode())
        print(f'[{issue_key}] Uploaded {fname} -> id: {res[0]["id"]}', flush=True)

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
    with urllib.request.urlopen(req, timeout=30) as resp:
        print(f'[{issue_key}] Comment posted successfully (status: {resp.status})', flush=True)

print("1. Uploading revised attachments for SCRUM-116...", flush=True)
upload_attachment('SCRUM-116', 'docs/flowcharts/map-master-orchestration.drawio', 'application/xml')
upload_attachment('SCRUM-116', 'docs/pdf/map-master-orchestration.pdf', 'application/pdf')
upload_attachment('SCRUM-116', 'docs/assets/flowcharts/map-master-orchestration.png', 'image/png')

print("2. Posting revision comment...", flush=True)
post_comment(
    'SCRUM-116',
    'Architectural Flowchart Revision Sign-Off (Strict Binary Decision Geometry)',
    [
        'Engineering revision sign-off for SCRUM-116: The Landing Page & Map-First Spatial Discovery Master Orchestration flowchart has been re-engineered to resolve visual arrow clipping and enforce strict standard ANSI/ISO binary decision diamonds.',
        'All multi-branch decision patterns have been eliminated. Interactive discovery choices are now structured via sequential binary evaluations (Free Spatial Exploration vs. High-Intent Gated Conversion).'
    ],
    [
        ('Strict Binary Decision Diamonds: ', 'Enforced exactly two outputs (bold YES / NO) on High-Intent Action Triggered?, Spatial Re-Query Required?, and Authenticated User? diamonds.'),
        ('Arrowhead Clearance & Bus Unification: ', 'Consolidated spatial query loopbacks into an isolated left bus with 40px+ clearance, completely eliminating overlapping or clipped arrowheads.'),
        ('Re-Generated Deliverables: ', 'Updated docs/flowcharts/map-master-orchestration.drawio, docs/pdf/map-master-orchestration.pdf, and docs/assets/flowcharts/map-master-orchestration.png (2167 x 3084 px, 200 DPI).'),
        ('Specification Synchronized: ', 'docs/specifications/map/map-master-orchestration-spec.md Section 2 updated with the revised binary state machine and ASCII pipeline.')
    ]
)

print("SCRUM-116 revision sync complete!", flush=True)

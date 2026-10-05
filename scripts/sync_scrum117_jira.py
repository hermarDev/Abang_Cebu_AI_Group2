#!/usr/bin/env python3
"""
Syncs SCRUM-117 deliverables to Jira, posts architecture sign-off comment, and transitions to DONE.
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

def transition_to_done(issue_key):
    url_trans = f'{base_url}/rest/api/3/issue/{issue_key}/transitions'
    
    req = urllib.request.Request(url_trans, headers={'Authorization': auth_header, 'Accept': 'application/json'})
    with urllib.request.urlopen(req, timeout=30) as resp:
        t_data = json.loads(resp.read().decode())
        transitions = {t['to']['name'].lower(): t['id'] for t in t_data.get('transitions', [])}
    
    if 'in development' in transitions:
        payload = json.dumps({'transition': {'id': transitions['in development']}}).encode()
        r = urllib.request.Request(url_trans, data=payload, headers=headers_json, method='POST')
        with urllib.request.urlopen(r, timeout=30):
            print(f'[{issue_key}] Transitioned to IN DEVELOPMENT', flush=True)
        req = urllib.request.Request(url_trans, headers={'Authorization': auth_header, 'Accept': 'application/json'})
        with urllib.request.urlopen(req, timeout=30) as resp:
            t_data = json.loads(resp.read().decode())
            transitions = {t['to']['name'].lower(): t['id'] for t in t_data.get('transitions', [])}

    for name in ['in review', 'review']:
        if name in transitions:
            payload = json.dumps({'transition': {'id': transitions[name]}}).encode()
            r = urllib.request.Request(url_trans, data=payload, headers=headers_json, method='POST')
            with urllib.request.urlopen(r, timeout=30):
                print(f'[{issue_key}] Transitioned to IN REVIEW', flush=True)
            break
            
    req = urllib.request.Request(url_trans, headers={'Authorization': auth_header, 'Accept': 'application/json'})
    with urllib.request.urlopen(req, timeout=30) as resp:
        t_data = json.loads(resp.read().decode())
        transitions = {t['to']['name'].lower(): t['id'] for t in t_data.get('transitions', [])}
        
    for name in ['done', 'closed', 'completed']:
        if name in transitions:
            payload = json.dumps({'transition': {'id': transitions[name]}}).encode()
            r = urllib.request.Request(url_trans, data=payload, headers=headers_json, method='POST')
            with urllib.request.urlopen(r, timeout=30):
                print(f'[{issue_key}] Transitioned to DONE', flush=True)
            break

print("1. Uploading attachments for SCRUM-117...", flush=True)
upload_attachment('SCRUM-117', 'docs/flowcharts/map-initialization-geolocation.drawio', 'application/xml')
upload_attachment('SCRUM-117', 'docs/pdf/map-initialization-geolocation.pdf', 'application/pdf')
upload_attachment('SCRUM-117', 'docs/assets/flowcharts/map-initialization-geolocation.png', 'image/png')

print("2. Posting architecture sign-off comment for SCRUM-117...", flush=True)
post_comment(
    'SCRUM-117',
    'Sub-Process 2.1: Map Initialization, Viewport & Geolocation Flowchart Delivery',
    [
        'Engineering deliverable sign-off for SCRUM-117: Sub-Process 2.1 flowchart and technical architecture specification covering MapLibre WebGL canvas mount, OpenFreeMap vector tile loading, browser geolocation handling, and fallback centroid recovery.',
        'Implements resilient handling for hardware acceleration checks (2D static fallback), URL/session stored coordinate restoration, high-accuracy GPS with accuracy radius circle, fallback to Metro Cebu Centroid (Fuente Osmeña [10.3157, 123.8854]), debounced viewport change listeners (300ms), and WebGL context loss recovery.'
    ],
    [
        ('Draw.io XML: ', 'docs/flowcharts/map-initialization-geolocation.drawio (100% orthogonal routing, strict B&W grid styling)'),
        ('Vector PDF: ', 'docs/pdf/map-initialization-geolocation.pdf (vector architecture artifact)'),
        ('High-Res PNG: ', 'docs/assets/flowcharts/map-initialization-geolocation.png (2188 x 3125 px, 200 DPI)'),
        ('Specification Document: ', 'docs/specifications/map/map-initialization-geolocation-spec.md (complete node dictionary, geodetic contract, state machine)'),
        ('Connector S: ', 'Hands off bounding box state to Sub-Process 2.2 Spatial Search & PostGIS Query (SCRUM-118).')
    ]
)

print("3. Transitioning SCRUM-117 to DONE...", flush=True)
transition_to_done('SCRUM-117')
print("SCRUM-117 successfully completed!", flush=True)

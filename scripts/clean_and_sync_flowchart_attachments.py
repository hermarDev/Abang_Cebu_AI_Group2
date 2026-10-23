#!/usr/bin/env python3
"""
Clean obsolete and collision flowchart attachments from SCRUM-125, SCRUM-126, and SCRUM-127,
and upload pristine .drawio, .png, and .pdf files generated according to the
auth-registration-pkce (1).drawio reference standard.
"""

import os
import json
import urllib.request
import base64
import mimetypes

with open('.jira.env') as f:
    env = dict(line.strip().split('=', 1) for line in f if line.strip() and not line.startswith('#'))

base_url = env['JIRA_BASE_URL']
auth_header = 'Basic ' + base64.b64encode(f"{env['JIRA_EMAIL']}:{env['JIRA_API_TOKEN']}".encode()).decode()

TICKETS = {
    'SCRUM-125': [
        'docs/flowcharts/landlord-master-orchestration.drawio',
        'docs/assets/flowcharts/landlord-master-orchestration.png',
        'docs/pdf/landlord-master-orchestration.pdf',
        'docs/flowcharts/landlord-onboarding-kyc.drawio',
        'docs/assets/flowcharts/landlord-onboarding-kyc.png',
        'docs/pdf/landlord-onboarding-kyc.pdf',
        'docs/flowcharts/landlord-listing-draft-submit.drawio',
        'docs/assets/flowcharts/landlord-listing-draft-submit.png',
        'docs/pdf/landlord-listing-draft-submit.pdf',
        'docs/flowcharts/landlord-listing-review-outcomes.drawio',
        'docs/assets/flowcharts/landlord-listing-review-outcomes.png',
        'docs/pdf/landlord-listing-review-outcomes.pdf',
    ],
    'SCRUM-126': [
        'docs/flowcharts/admin-master-orchestration.drawio',
        'docs/assets/flowcharts/admin-master-orchestration.png',
        'docs/pdf/admin-master-orchestration.pdf',
        'docs/flowcharts/admin-listing-moderation.drawio',
        'docs/assets/flowcharts/admin-listing-moderation.png',
        'docs/pdf/admin-listing-moderation.pdf',
        'docs/flowcharts/admin-kyc-review.drawio',
        'docs/assets/flowcharts/admin-kyc-review.png',
        'docs/pdf/admin-kyc-review.pdf',
    ],
    'SCRUM-127': [
        'docs/flowcharts/renter-master-orchestration.drawio',
        'docs/assets/flowcharts/renter-master-orchestration.png',
        'docs/pdf/renter-master-orchestration.pdf',
        'docs/flowcharts/renter-favorites.drawio',
        'docs/assets/flowcharts/renter-favorites.png',
        'docs/pdf/renter-favorites.pdf',
        'docs/flowcharts/renter-contact-reveal.drawio',
        'docs/assets/flowcharts/renter-contact-reveal.png',
        'docs/pdf/renter-contact-reveal.pdf',
        'docs/flowcharts/renter-inquiry-viewing.drawio',
        'docs/assets/flowcharts/renter-inquiry-viewing.png',
        'docs/pdf/renter-inquiry-viewing.pdf',
    ]
}

def get_attachments(issue_key):
    req = urllib.request.Request(f'{base_url}/rest/api/3/issue/{issue_key}?fields=attachment', headers={
        'Authorization': auth_header,
        'Accept': 'application/json'
    })
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        return data['fields'].get('attachment', [])

def delete_attachment(att_id, filename):
    req = urllib.request.Request(f'{base_url}/rest/api/3/attachment/{att_id}', headers={
        'Authorization': auth_header
    }, method='DELETE')
    with urllib.request.urlopen(req) as resp:
        if resp.status == 204:
            print(f'  [DELETED] ID: {att_id} | Name: {filename}', flush=True)
        else:
            print(f'  [WARN] ID: {att_id} | Status: {resp.status}', flush=True)

def upload_attachment(issue_key, filepath):
    fname = os.path.basename(filepath)
    ctype, _ = mimetypes.guess_type(fname)
    if fname.endswith('.drawio'):
        ctype = 'application/octet-stream'
    elif not ctype:
        ctype = 'application/octet-stream'

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
        print(f'  [UPLOADED] {fname} -> ID: {res[0]["id"]} ({len(file_bytes)} bytes)', flush=True)

def main():
    for issue_key, upload_files in TICKETS.items():
        print(f'\n==================== Processing {issue_key} ====================', flush=True)
        current_atts = get_attachments(issue_key)

        # Remove all current files as mandated by user (PNG, PDF, DRAW.io files only will be uploaded)
        for a in current_atts:
            fname = a['filename']
            aid = a['id']
            delete_attachment(aid, fname)

        # Upload fresh files
        print(f'--- Uploading standardized files to {issue_key} ---', flush=True)
        for fpath in upload_files:
            upload_attachment(issue_key, fpath)

        # Verify final attachments
        final_atts = get_attachments(issue_key)
        print(f'--- Final Attachment Inventory for {issue_key} ({len(final_atts)} files) ---', flush=True)
        for a in final_atts:
            print(f'  ID: {a["id"]} | Name: {a["filename"]} | Size: {a["size"]}', flush=True)

if __name__ == '__main__':
    main()

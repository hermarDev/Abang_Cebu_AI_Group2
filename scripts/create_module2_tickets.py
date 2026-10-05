import os
import json
import urllib.request
import base64

with open('.jira.env') as f:
    env = dict(line.strip().split('=', 1) for line in f if line.strip() and not line.startswith('#'))

base_url = env['JIRA_BASE_URL']
auth_str = f"{env['JIRA_EMAIL']}:{env['JIRA_API_TOKEN']}"
auth_header = f'Basic {base64.b64encode(auth_str.encode()).decode()}'
headers = {'Authorization': auth_header, 'Content-Type': 'application/json', 'Accept': 'application/json'}

tickets_to_create = [
    {
        'summary': 'Sub-Process 2.1: Map Initialization, Viewport & Geolocation Flowchart',
        'desc': 'Plan and author the sub-process flowchart for MapLibre WebGL canvas mount, Metro Cebu initial bounding box, GPS Locate Me permission flow, and fallback centroid recovery. Deliverables: docs/flowcharts/map-initialization-geolocation.drawio, PDF, and high-res PNG.'
    },
    {
        'summary': 'Sub-Process 2.2: Spatial Search, Landmark Auto-Suggest & PostGIS Query Flowchart',
        'desc': 'Plan and author the sub-process flowchart for floating search bar, debounced landmark auto-suggest (USC, IT Park, UC, CIT-U, Ayala, SM), PostGIS ST_MakeEnvelope bounding box query, and spatial cluster aggregation. Deliverables: docs/flowcharts/map-search-spatial-query.drawio, PDF, and high-res PNG.'
    },
    {
        'summary': 'Sub-Process 2.3: Multi-Criteria Filter Pills & URL State Sync Flowchart',
        'desc': 'Plan and author the sub-process flowchart for horizontal category filter pills, price/amenities filter modal, and URL SearchParams bidirectional synchronization with zero-reload re-querying. Deliverables: docs/flowcharts/map-filtering-url-sync.drawio, PDF, and high-res PNG.'
    },
    {
        'summary': 'Sub-Process 2.4: Bidirectional Pin Marker & 3-Snap Gesture Drawer Flowchart',
        'desc': 'Plan and author the sub-process flowchart for custom SVG price pill markers, bidirectional card-to-pin hover/click highlight synchronization, desktop floating drawer, and mobile 3-snap gesture bottom sheet (Peek 88px, Mid 48dvh, Full 88dvh). Deliverables: docs/flowcharts/map-pin-drawer-sync.drawio, PDF, and high-res PNG.'
    },
    {
        'summary': 'Sub-Process 2.5: High-Intent Action Interception & Auth Gatekeeper Flowchart',
        'desc': 'Plan and author the sub-process flowchart for public guest browsing boundaries, high-intent action interception (Favorites, View Phone Number, Schedule Viewing), sessionStorage coordinate preservation, and modal auth dispatch to Module 1 (SCRUM-105). Deliverables: docs/flowcharts/map-auth-gatekeeper.drawio, PDF, and high-res PNG.'
    }
]

created_keys = []
for t in tickets_to_create:
    issue_data = {
        'fields': {
            'project': {'key': 'SCRUM'},
            'issuetype': {'id': '10004'},
            'summary': t['summary'],
            'customfield_10020': 70,
            'description': {
                'type': 'doc',
                'version': 1,
                'content': [
                    {
                        'type': 'paragraph',
                        'content': [{'type': 'text', 'text': t['desc']}]
                    }
                ]
            }
        }
    }
    url = f'{base_url}/rest/api/3/issue'
    req = urllib.request.Request(url, data=json.dumps(issue_data).encode(), headers=headers, method='POST')
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        created_keys.append((res['key'], t['summary']))
        print(f"Created {res['key']}: {t['summary']}")

print("\nAll Module 2 tickets created successfully on Jira!")

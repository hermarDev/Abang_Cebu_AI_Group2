import re
import markdown
import weasyprint

# 1. Update and compile middleware-test-scenarios.md
with open('docs/testing/middleware-test-scenarios.md', 'r') as f:
    mid_content = f.read()

mid_content = re.sub(
    r'\*\*Jira Ticket Reference:\*\*.*?\n',
    '**Jira Ticket References:** [SCRUM-71](https://abangcebuai.atlassian.net/browse/SCRUM-71), [SCRUM-113](https://abangcebuai.atlassian.net/browse/SCRUM-113) (Route Guards & Middleware Security Test Cases)\n',
    mid_content
)

with open('docs/testing/middleware-test-scenarios.md', 'w') as f:
    f.write(mid_content)

mid_html_body = markdown.markdown(mid_content, extensions=['tables', 'fenced_code'])
mid_full_html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {{
    size: A4 portrait;
    margin: 18mm 15mm 20mm 15mm;
    @bottom-right {{
      content: "Page " counter(page) " of " counter(pages);
      font-size: 8pt;
      font-family: Helvetica, sans-serif;
      color: #71717A;
    }}
    @bottom-left {{
      content: "AbangCebu AI — Middleware Test Scenarios (SCRUM-113)";
      font-size: 8pt;
      font-family: Helvetica, sans-serif;
      color: #71717A;
    }}
  }}
  body {{
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 9pt;
    line-height: 1.45;
    color: #18181B;
  }}
  h1 {{ font-size: 17pt; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 6px; margin-top: 0; }}
  h2 {{ font-size: 13pt; font-weight: bold; border-bottom: 1px solid #E4E4E7; padding-bottom: 4px; margin-top: 18px; }}
  h3 {{ font-size: 10.5pt; font-weight: bold; margin-top: 12px; margin-bottom: 4px; }}
  table {{
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0;
    font-size: 8pt;
    page-break-inside: auto;
  }}
  tr {{ page-break-inside: avoid; page-break-after: auto; }}
  th, td {{
    border: 1px solid #D4D4D8;
    padding: 5px 7px;
    vertical-align: top;
  }}
  th {{
    background-color: #F4F4F5;
    font-weight: bold;
    text-align: left;
  }}
  code {{
    font-family: Monaco, Consolas, monospace;
    font-size: 7.5pt;
    background-color: #F4F4F5;
    padding: 1px 3px;
    border-radius: 2px;
  }}
  pre {{
    background-color: #F4F4F5;
    padding: 8px;
    border-radius: 3px;
    font-size: 7.5pt;
    overflow-x: auto;
  }}
  hr {{ border: none; border-top: 1px solid #E4E4E7; margin: 15px 0; }}
</style>
</head>
<body>
{mid_html_body}
</body>
</html>
"""

weasyprint.HTML(string=mid_full_html).write_pdf('docs/pdf/AbangCebu_Middleware_Test_Scenarios.pdf')
print("Compiled docs/pdf/AbangCebu_Middleware_Test_Scenarios.pdf successfully!")

# 2. Update and compile auth-performance-baseline.md
with open('docs/testing/auth-performance-baseline.md', 'r') as f:
    perf_content = f.read()

perf_content = re.sub(
    r'\*\*Jira Ticket Reference:\*\*.*?\n',
    '**Jira Ticket References:** [SCRUM-72](https://abangcebuai.atlassian.net/browse/SCRUM-72), [SCRUM-114](https://abangcebuai.atlassian.net/browse/SCRUM-114) (Authentication Baseline Latency & Load Strategy)\n',
    perf_content
)

with open('docs/testing/auth-performance-baseline.md', 'w') as f:
    f.write(perf_content)

perf_html_body = markdown.markdown(perf_content, extensions=['tables', 'fenced_code'])
perf_full_html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {{
    size: A4 portrait;
    margin: 18mm 15mm 20mm 15mm;
    @bottom-right {{
      content: "Page " counter(page) " of " counter(pages);
      font-size: 8pt;
      font-family: Helvetica, sans-serif;
      color: #71717A;
    }}
    @bottom-left {{
      content: "AbangCebu AI — Authentication Baseline Latency & Load Strategy (SCRUM-114)";
      font-size: 8pt;
      font-family: Helvetica, sans-serif;
      color: #71717A;
    }}
  }}
  body {{
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 9pt;
    line-height: 1.45;
    color: #18181B;
  }}
  h1 {{ font-size: 17pt; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 6px; margin-top: 0; }}
  h2 {{ font-size: 13pt; font-weight: bold; border-bottom: 1px solid #E4E4E7; padding-bottom: 4px; margin-top: 18px; }}
  h3 {{ font-size: 10.5pt; font-weight: bold; margin-top: 12px; margin-bottom: 4px; }}
  table {{
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0;
    font-size: 8pt;
    page-break-inside: auto;
  }}
  tr {{ page-break-inside: avoid; page-break-after: auto; }}
  th, td {{
    border: 1px solid #D4D4D8;
    padding: 5px 7px;
    vertical-align: top;
  }}
  th {{
    background-color: #F4F4F5;
    font-weight: bold;
    text-align: left;
  }}
  code {{
    font-family: Monaco, Consolas, monospace;
    font-size: 7.5pt;
    background-color: #F4F4F5;
    padding: 1px 3px;
    border-radius: 2px;
  }}
  pre {{
    background-color: #F4F4F5;
    padding: 8px;
    border-radius: 3px;
    font-size: 7.5pt;
    overflow-x: auto;
  }}
  hr {{ border: none; border-top: 1px solid #E4E4E7; margin: 15px 0; }}
</style>
</head>
<body>
{perf_html_body}
</body>
</html>
"""

weasyprint.HTML(string=perf_full_html).write_pdf('docs/pdf/AbangCebu_Auth_Performance_Baseline.pdf')
print("Compiled docs/pdf/AbangCebu_Auth_Performance_Baseline.pdf successfully!")

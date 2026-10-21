# EC2 staging runbook proposal (SCRUM-134)

Status: unapplied staging design. This document does not establish that an EC2 instance, domain, certificate, DNS record, HTTPS endpoint, or working staging URL exists. Deploying `infra/aws/staging/template.yaml` creates billable resources and is outside this DEV session's authorization. It also does not grant approval to deploy to production.

## Architecture and prerequisites

The CloudFormation template proposes one encrypted gp3-backed AL2023 EC2 host in an existing subnet, with IMDSv2 required, SSH ingress absent, HTTPS ingress restricted to an owner-supplied IPv4 CIDR, and an existing least-privilege instance profile. It does not create a VPC, public IP, IAM roles, email alarms, DNS, TLS certificate, or application deployment. The security group egress proposal is HTTPS-only but remains an owner/security review item because operating-system/package/update and application egress requirements must be known before narrowing or deploying it. The bootstrap hardens SSH configuration, disables sshd, and enables Nginx with a disabled placeholder vhost. It reports the whole bootstrap exit status to CloudFormation via an `EXIT` trap; package or service failures are not reported as success. It does not configure a live site or expose an HTTP application endpoint.

Before any deployment, a staging owner/platform administrator must supply and verify: AWS account and region; cost owner and written approval; private subnet/VPC and route strategy (including approved outbound access); patched, region-valid AL2023 x86_64 AMI/release; instance type and cost limit; approvable ingress CIDR; pre-created instance profile with only necessary SSM/CloudWatch permissions; approved DNS name, certificate/TLS termination design and email; Next.js build/runtime configuration; Supabase staging project URL/anon public key and allowed callback URLs; approved server-only secrets via a secret manager; rollback operator; and an authorized account with CloudFormation permissions. Never put real credentials in this repository or example parameter file.

`AmiId` is a region-valid, owner-approved AL2023 x86_64 image input; inspect its operating-system release and patch level before use. The template expects the application service port as an owner-supplied parameter, but the present bootstrap does not configure an Nginx upstream or install the app.

## Review before deployment

1. Review the template and example inputs; replace no placeholder with a guessed resource value.
2. Confirm the selected subnet, VPC, route table, egress, and CIDR with the staging/network owner; confirm the chosen AMI/release and instance type are valid for the region and budget.
3. Review instance-profile trust/policy, SSM access path, patch management, log shipping/retention, CloudFormation signal behavior and ingress/egress against the actual application architecture. The selected AMI is supplied through `AmiId`; verify its release and region before using it. `AppPort` is an input for the future app contract but is not yet consumed by the host bootstrap.
4. Approve the HTTPS termination architecture. This template has no certificate, hostname, DNS, load balancer or TLS listener configuration, so it is not a complete HTTPS staging deployment.
5. Obtain explicit cost/deployment authorization and have an authorized infrastructure operator execute the change set. DEV-1 did not deploy or create AWS resources.

## Approved operator deployment (not executed)

Use a non-secret parameter file completed by the authorized staging owner. `infra/aws/staging/parameters.example.json` is deliberately placeholder-only and must not be passed directly to a deployment command. Review a CloudFormation change set before applying it, then record its stack/event IDs in the project ticket. Do not pass secrets as CloudFormation parameters. Any HTTPS certificate, DNS, secret-manager, or application-release setup is a separate approved operation.

## Validation once a real endpoint exists (not executed)

- Confirm deployment, Nginx, and application health via approved operator evidence; verify HTTPS certificate chain/hostname and redirects using the owner-provided domain.
- Verify the app loads over HTTPS and `GET /` and `/login` return the intended status.
- Inspect built client assets and browser network output for server-only variables; only explicitly approved `NEXT_PUBLIC_*` values may be present.
- Have a second team member follow the approved redeploy/rollback procedure and record exact command, release ID and outcome. This has not been demonstrated here.
- Never infer successful live acceptance from YAML parsing, static tests, PR CI, or this runbook.

## Rollback

Because this proposal is unapplied, no rollback operation has been performed. If later approved and deployed, the platform owner must define and test rollback before traffic is switched: retain the last known-good application artifact/configuration, restore it through the reviewed release process, confirm HTTPS health, and then remove newly created stack resources only under the approved change set and resource-retention policy. Do not delete or alter an existing shared VPC, subnet, IAM profile, logs, DNS, or certificate as a template cleanup shortcut.

## Current validation and limits

The repository has no verified staging URL or staging AWS inventory accessible from the current caller. AWS read-only calls previously denied `ec2:DescribeInstances`; CloudFormation `ValidateTemplate` was also denied. Local syntax checks, if later run, will validate structure only—not template semantics, instance creation, cost, Nginx startup, HTTPS, application readiness, secret exposure, or a second-member redeploy.

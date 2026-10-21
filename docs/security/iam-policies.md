# SCRUM-137 — Staging IAM least-privilege proposal

Status: unapplied proposal. No AWS IAM policies or roles have been installed or live-tested.

`infra/aws/iam/roles.template.json` contains separate staging deployer, monitoring, and security-auditor role templates with explicit principals and resource ARNs. Scope, account, instance, log group/stream, and principal parameters are mandatory and have no defaults. Human-operated monitoring and auditor roles require MFA; the deployer trusts a dedicated IAM CI role rather than a user or account root. The monitoring role reads only the named logs; the security auditor reads only the three named staging role policies. The template does not create an admin role or alter the shared developer group. Permission actions/resources contain no wildcards.

## Administrator MFA boundary

Require MFA for human IAM administrators through the account's approved identity/IAM guardrail (such as an existing permission boundary or organization control), and test both MFA-present and MFA-absent requests before rollout. This proposal does not create an admin role or change a shared developer group because the caller cannot inspect the existing `AbangCebu-Developers` group; an IAM owner must review its current effective permissions and choose the least-disruptive enforcement point. The template's MFA trust conditions cover its human-operated monitoring and auditor roles; CI deploy uses a dedicated role principal rather than a human MFA session.

## Preconditions before any live use

1. A staging owner supplies verified account/region, instance ARN, exact app/Nginx CloudWatch log group ARNs, and named CI/operator principals through an approved secure process (never commit credentials or substitute these parameters in source).
2. The platform owner verifies the existing `AbangCebu-Developers` group and staging inventory. The current caller cannot perform `iam:ListGroups` or `ec2:DescribeInstances`; therefore this proposal makes no claim about replacing existing access or being the complete account permission set.
3. AWS/security review checks role trust, SSM document/resource authorization, `SendCommand` input controls, CloudWatch Logs resource scoping and required read operations, and MFA enforcement. Revise only with the owner-approved resource model.
4. An authorized AWS administrator deploys the reviewed stack after cost/security approval; DEV-1 will not provision it.
5. In a designated test account, an authorized principal tests at least one expected allowed and one expected denied action/resource for each role using the IAM policy simulator or an approved test session, and records the caller, policy/stack revision, exact action/resource, and result. This template does not grant simulator permissions; any simulator access must be separately authorized and scoped. Static template checks are not a substitute.

The deploy role is limited to SSM command delivery for one staging instance and the AWS-managed shell document; this still permits arbitrary shell commands on that instance and must be limited to a trusted deployment principal. Monitoring reads only the named app/Nginx log groups and streams; note that other AWS read APIs can require broader resource scope, so confirm CloudWatch Logs authorization against the selected actions before deployment. The auditor can read only the three named role policies. The offline validator checks JSON syntax, required/no-default parameters, explicit trust principals, MFA for human roles, absence of wildcard actions/resources, and expected allow plus deny-by-omission cases. It does not validate CloudFormation or IAM semantics against AWS or establish effective live permissions. Run `python3 -m unittest scripts/validate_scrum137_iam.py`. The live allow/deny acceptance criterion remains BLOCKED until the reviewed roles are deployed and an authorized principal records actual allow/deny results. Do not deploy until independent security review approves it.

## Rollback

Because this is unapplied, rollback is not applicable. If later deployed by an authorized administrator, rollback must follow the reviewed CloudFormation change set and restore the prior IAM policy attachments; do not manually remove pre-existing group permissions based on this proposal.

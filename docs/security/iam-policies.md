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

The deploy role can issue arbitrary shell commands on the single named instance through `AWS-RunShellScript`, so its trust must be restricted to an approved deployment principal and its command source protected. CloudWatch documents `logs:DescribeLogStreams` as a log-group action and `logs:GetLogEvents` as log-stream-scoped. Accordingly, the group ARN parameters accept only concrete group ARNs without suffixes or wildcards, while the stream resource parameters accept either a concrete stream ARN or the exact `:*` suffix for all streams of one explicitly selected group (the CloudWatch resource ARN form, not a partial wildcard). Wildcard characters are rejected in group names and stream names, so a permissive path must not be supplied. Use values from the approved staging inventory. The template separately supplies group and stream resource ARNs; shape checks do not establish that the two ARNs refer to the same account, region, or intended app/Nginx group, so verify that relationship during owner/security review. CloudFormation AllowedPattern is documented as Java regular-expression syntax. The Python negative/positive cases verify intent, not full regex engine equivalence. Confirming AWS applies this pattern as expected is part of the native CloudFormation validation gate, which remains NOT RUN/blocked here.

## Rollback

Because this is unapplied, rollback is not applicable. If later deployed by an authorized administrator, rollback must follow the reviewed CloudFormation change set and restore the prior IAM policy attachments; do not manually remove pre-existing group permissions based on this proposal.

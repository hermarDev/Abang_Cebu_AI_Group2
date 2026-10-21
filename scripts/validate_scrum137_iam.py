#!/usr/bin/env python3
"""Offline structural/security checks for the unapplied SCRUM-137 IAM proposal."""

import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE_PATH = ROOT / "infra/aws/iam/roles.template.json"

GROUP_ARN_PATTERN = (
    r"^arn:aws(?:-[a-z0-9-]+)?:logs:[a-z0-9-]+:[0-9]{12}:"
    r"log-group:[A-Za-z0-9_.#/-]{1,512}$"
)
STREAM_ARN_PATTERN = (
    r"^arn:aws(?:-[a-z0-9-]+)?:logs:[a-z0-9-]+:[0-9]{12}:"
    r"log-group:[A-Za-z0-9_.#/-]{1,512}:(?:log-stream:[A-Za-z0-9_.#/-]{1,512}|\*)$"
)
GROUP_ARN_RE = re.compile(GROUP_ARN_PATTERN)
STREAM_ARN_RE = re.compile(STREAM_ARN_PATTERN)


def load_template():
    return json.loads(TEMPLATE_PATH.read_text(encoding="utf-8"))


def policy_statements(resource):
    for policy in resource["Properties"].get("Policies", []):
        yield from policy["PolicyDocument"]["Statement"]


def has_wildcard(value):
    if isinstance(value, str):
        return "*" in value
    if isinstance(value, list):
        return any(has_wildcard(item) for item in value)
    if isinstance(value, dict):
        return any(has_wildcard(item) for item in value.values())
    return False


class TemplateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.template = load_template()
        cls.resources = cls.template["Resources"]
        cls.parameters = cls.template["Parameters"]

    def test_required_scope_parameters_have_no_defaults(self):
        self.assertEqual(len(self.parameters), 8)
        for name, parameter in self.parameters.items():
            with self.subTest(parameter=name):
                self.assertNotIn("Default", parameter)

    def test_trust_principals_are_explicit_and_human_roles_require_mfa(self):
        expected = {
            "StagingDeployerRole": "DeployTrustedPrincipalArn",
            "StagingMonitoringRole": "MonitoringTrustedPrincipalArn",
            "StagingSecurityAuditorRole": "AuditorTrustedPrincipalArn",
        }
        for role_name, parameter_name in expected.items():
            with self.subTest(role=role_name):
                statements = self.resources[role_name]["Properties"]["AssumeRolePolicyDocument"]["Statement"]
                self.assertEqual(len(statements), 1)
                statement = statements[0]
                self.assertEqual(statement["Action"], "sts:AssumeRole")
                self.assertEqual(statement["Principal"]["AWS"], {"Ref": parameter_name})
                if role_name == "StagingDeployerRole":
                    self.assertNotIn("Condition", statement)
                else:
                    self.assertEqual(statement["Condition"]["Bool"]["aws:MultiFactorAuthPresent"], "true")

    def test_policy_actions_and_resources_have_no_wildcards(self):
        for role_name, resource in self.resources.items():
            with self.subTest(role=role_name):
                for statement in policy_statements(resource):
                    self.assertFalse(has_wildcard(statement["Action"]))
                    if statement["Sid"] == "InspectOnlyNamedStagingRoles":
                        self.assertEqual(len(statement["Resource"]), 3)
                        self.assertTrue(all("Staging" in arn["Fn::Sub"] for arn in statement["Resource"]))
                    else:
                        self.assertFalse(has_wildcard(statement["Resource"]))

    def test_deployer_role_has_no_permissions_until_fixed_command_contract_exists(self):
        role = self.resources["StagingDeployerRole"]["Properties"]
        self.assertNotIn("Policies", role)
        self.assertNotIn("ManagedPolicyArns", role)
        self.assertNotIn("ssm:SendCommand", json.dumps(self.resources))
        self.assertNotIn("AWS-RunShellScript", json.dumps(self.resources))
        self.assertEqual(
            role["AssumeRolePolicyDocument"]["Statement"][0]["Principal"]["AWS"],
            {"Ref": "DeployTrustedPrincipalArn"},
        )

    def test_monitor_reads_named_logs_without_mutation_permissions(self):
        statements = list(policy_statements(self.resources["StagingMonitoringRole"]))
        actions = {action for statement in statements for action in ([statement["Action"]] if isinstance(statement["Action"], str) else statement["Action"])}
        self.assertEqual(actions, {"logs:DescribeLogStreams", "logs:FilterLogEvents", "logs:GetLogEvents"})
        resources = [resource for statement in statements for resource in statement["Resource"]]
        for name in ("AppLogGroupArn", "NginxLogGroupArn", "AppLogStreamArn", "NginxLogStreamArn"):
            with self.subTest(resource=name):
                self.assertIn({"Ref": name}, resources)
        self.assertNotIn("logs:DeleteLogGroup", actions)

    def test_each_policy_role_has_expected_allow_and_denied_action_omission(self):
        cases = {
            "StagingMonitoringRole": ("logs:GetLogEvents", {"Ref": "AppLogStreamArn"}, "logs:DeleteLogGroup"),
            "StagingSecurityAuditorRole": ("iam:GetRole", {"Fn::Sub": "arn:${AWS::Partition}:iam::${StagingAccountId}:role/AbangCebuStagingDeployer"}, "iam:DeleteRole"),
        }
        for role_name, (allowed_action, allowed_resource, denied_action) in cases.items():
            with self.subTest(role=role_name):
                statements = list(policy_statements(self.resources[role_name]))
                self.assertTrue(any(
                    statement["Effect"] == "Allow"
                    and allowed_action in ([statement["Action"]] if isinstance(statement["Action"], str) else statement["Action"])
                    and allowed_resource in statement["Resource"]
                    for statement in statements
                ))
                actions = {action for statement in statements for action in ([statement["Action"]] if isinstance(statement["Action"], str) else statement["Action"])}
                self.assertNotIn(denied_action, actions)

    def test_auditor_can_read_but_not_mutate_named_staging_roles(self):
        statements = list(policy_statements(self.resources["StagingSecurityAuditorRole"]))
        actions = {action for statement in statements for action in ([statement["Action"]] if isinstance(statement["Action"], str) else statement["Action"])}
        self.assertEqual(actions, {"iam:GetRole", "iam:GetRolePolicy", "iam:ListRolePolicies"})
        self.assertNotIn("*", statements[0]["Resource"])
        self.assertTrue(all("Staging" in arn["Fn::Sub"] for arn in statements[0]["Resource"]))

    def test_log_arn_parameters_constrain_exact_resource_shapes(self):
        expected_patterns = {
            "AppLogGroupArn": GROUP_ARN_PATTERN,
            "NginxLogGroupArn": GROUP_ARN_PATTERN,
            "AppLogStreamArn": STREAM_ARN_PATTERN,
            "NginxLogStreamArn": STREAM_ARN_PATTERN,
        }
        for name, pattern in expected_patterns.items():
            with self.subTest(parameter=name):
                parameter = self.parameters[name]
                self.assertEqual(parameter["AllowedPattern"], pattern)
                expected_constraint = (
                    "Supply a specific CloudWatch log stream ARN or one exact log-group wildcard suffix; partial patterns are not permitted."
                    if name.endswith("LogStreamArn")
                    else "Supply one exact CloudWatch Logs resource ARN; wildcard characters are not permitted."
                )
                self.assertEqual(parameter["ConstraintDescription"], expected_constraint)
                self.assertNotIn("Default", parameter)

    def test_log_arn_patterns_reject_wildcards_wrong_resource_type_and_malformed_arns(self):
        valid_group = "arn:aws:logs:ap-southeast-1:123456789012:log-group:/abang/staging/app"
        exact_stream = f"{valid_group}:log-stream:production-host"
        group_wildcard_stream_resource = f"{valid_group}:*"
        valid_partition_group = "arn:aws-us-gov:logs:us-gov-west-1:123456789012:log-group:app"
        for candidate in (valid_group, valid_partition_group):
            self.assertRegex(candidate, GROUP_ARN_RE)
        self.assertRegex(exact_stream, STREAM_ARN_RE)
        self.assertRegex(group_wildcard_stream_resource, STREAM_ARN_RE)
        self.assertNotRegex(exact_stream, GROUP_ARN_RE)
        self.assertNotRegex(group_wildcard_stream_resource, GROUP_ARN_RE)
        for candidate in (
            "arn:aws:logs:ap-southeast-1:123456789012:log-group:/abang/staging/*",
            "arn:aws:logs:ap-southeast-1:123456789012:log-group:*",
            "arn:aws:logs:ap-southeast-1:123456789012:log-group:/abang/staging/app:log-stream:*",
            "arn:aws:logs:ap-southeast-1:123456789012:log-group:/abang/staging/app:log-stream:stream*",
            "arn:aws:logs:ap-southeast-1:123456789012:log-group:/abang/staging/*:*",
            "arn:aws:logs:ap-southeast-1:123456789012:log-group:/abang/staging/app:log-stream:stream*:*",
            "arn:aws:logs:ap-southeast-1:12345678901:log-group:app",
            "https://example.invalid/log-group/app",
            "arn:aws:logs:ap-southeast-1:123456789012:log-stream:stream",
        ):
            with self.subTest(candidate=candidate):
                self.assertNotRegex(candidate, GROUP_ARN_RE)
                self.assertNotRegex(candidate, STREAM_ARN_RE)


if __name__ == "__main__":
    unittest.main(verbosity=2)

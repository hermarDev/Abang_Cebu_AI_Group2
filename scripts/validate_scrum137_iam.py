#!/usr/bin/env python3
"""Offline structural checks for the unapplied SCRUM-137 IAM proposal."""

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE_PATH = ROOT / "infra/aws/iam/roles.template.json"


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

    def test_required_scope_parameters_have_no_defaults(self):
        self.assertEqual(len(self.template["Parameters"]), 10)
        for name, parameter in self.template["Parameters"].items():
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

    def test_deployer_allows_named_instance_command_only(self):
        statements = list(policy_statements(self.resources["StagingDeployerRole"]))
        self.assertEqual(len(statements), 1)
        self.assertEqual(statements[0]["Effect"], "Allow")
        self.assertEqual(statements[0]["Action"], "ssm:SendCommand")
        self.assertEqual(statements[0]["Resource"][0], {"Ref": "StagingInstanceArn"})
        self.assertIn("AWS-RunShellScript", statements[0]["Resource"][1]["Fn::Sub"])

    def test_monitor_reads_named_logs_without_mutation_permissions(self):
        statements = list(policy_statements(self.resources["StagingMonitoringRole"]))
        actions = {action for statement in statements for action in ([statement["Action"]] if isinstance(statement["Action"], str) else statement["Action"])}
        self.assertEqual(actions, {"logs:DescribeLogStreams", "logs:FilterLogEvents", "logs:GetLogEvents"})
        resources = [resource for statement in statements for resource in statement["Resource"]]
        for name in ("AppLogGroupArn", "NginxLogGroupArn", "AppLogStreamArn", "NginxLogStreamArn"):
            with self.subTest(resource=name):
                self.assertIn({"Ref": name}, resources)
        self.assertNotIn("logs:DeleteLogGroup", actions)

    def test_each_role_has_an_expected_allow_and_sensitive_action_is_denied_by_omission(self):
        cases = {
            "StagingDeployerRole": ("ssm:SendCommand", {"Ref": "StagingInstanceArn"}, "ec2:StartInstances"),
            "StagingMonitoringRole": ("logs:GetLogEvents", {"Ref": "AppLogStreamArn"}, "logs:DeleteLogGroup"),
            "StagingSecurityAuditorRole": ("iam:GetRole", {"Fn::Sub": "arn:${AWS::Partition}:iam::${StagingAccountId}:role/AbangCebuStagingDeployer"}, "iam:DeleteRole"),
        }
        for role_name, (allowed_action, allowed_resource, denied_action) in cases.items():
            with self.subTest(role=role_name):
                statements = list(policy_statements(self.resources[role_name]))
                self.assertTrue(any(
                    statement["Effect"] == "Allow"
                    and allowed_action in ([statement["Action"]] if isinstance(statement["Action"], str) else statement["Action"])
                    and (allowed_resource in statement["Resource"] or allowed_resource in statement.get("Condition", {}).get("ArnEquals", {}).get("iam:ResourceArn", []))
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


if __name__ == "__main__":
    unittest.main(verbosity=2)

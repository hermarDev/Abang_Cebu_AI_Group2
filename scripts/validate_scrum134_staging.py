import json
import unittest
from pathlib import Path

from ruamel.yaml import YAML
from ruamel.yaml.nodes import ScalarNode, SequenceNode

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE_PATH = ROOT / "infra/aws/staging/template.yaml"
PARAMETERS_PATH = ROOT / "infra/aws/staging/parameters.example.json"


def load_template():
    parser = YAML(typ="safe")

    def construct_tag(constructor, tag_suffix, node):
        if isinstance(node, ScalarNode):
            value = constructor.construct_scalar(node)
        elif isinstance(node, SequenceNode):
            value = constructor.construct_sequence(node)
        else:
            value = constructor.construct_mapping(node)
        return {tag_suffix.removeprefix("!"): value}

    parser.constructor.add_multi_constructor("!", construct_tag)
    return parser.load(TEMPLATE_PATH.read_text(encoding="utf-8"))


class StagingTemplateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.template = load_template()
        cls.parameters = json.loads(PARAMETERS_PATH.read_text(encoding="utf-8"))["Parameters"]
        cls.resources = cls.template["Resources"]

    def test_example_parameters_are_placeholders_without_secrets(self):
        self.assertEqual(set(self.parameters), set(self.template["Parameters"]))
        for name, value in self.parameters.items():
            with self.subTest(parameter=name):
                self.assertIsInstance(value, (str, int))
                if isinstance(value, str):
                    self.assertTrue("<" in value and ">" in value or name in {"ProjectName", "EnvironmentName"})

    def test_required_cloud_resources_have_no_defaults(self):
        for name, parameter in self.template["Parameters"].items():
            with self.subTest(parameter=name):
                if name not in {"ProjectName", "EnvironmentName"}:
                    self.assertNotIn("Default", parameter)

    def test_security_group_has_no_ssh_or_http_ingress(self):
        ingress = self.resources["StagingSecurityGroup"]["Properties"]["SecurityGroupIngress"]
        self.assertEqual(len(ingress), 1)
        self.assertEqual(ingress[0]["IpProtocol"], "tcp")
        self.assertEqual(ingress[0]["FromPort"], 443)
        self.assertEqual(ingress[0]["ToPort"], 443)
        self.assertEqual(ingress[0]["CidrIp"], {"Ref": "AllowedHttpsCidr"})

    def test_https_ingress_cidr_pattern_is_strict_ipv4_with_valid_prefix(self):
        from ipaddress import IPv4Network
        import re

        pattern = re.compile(self.template["Parameters"]["AllowedHttpsCidr"]["AllowedPattern"])
        for value in ("192.168.1.1/24", "0.0.0.0/0", "255.255.255.255/32"):
            with self.subTest(value=value):
                self.assertRegex(value, pattern)
                IPv4Network(value, strict=False)
        for value in ("999.1.1.1/24", "192.168.1/24", "192.168.1.1/33", "192.168.1.1/-1", "192.168.001.1/24"):
            with self.subTest(value=value):
                self.assertNotRegex(value, pattern)

    def test_instance_uses_imdsv2_and_encrypted_ephemeral_ebs(self):
        props = self.resources["StagingInstance"]["Properties"]
        self.assertEqual(props["MetadataOptions"]["HttpTokens"], "required")
        self.assertEqual(props["MetadataOptions"]["HttpPutResponseHopLimit"], 1)
        ebs = props["BlockDeviceMappings"][0]["Ebs"]
        self.assertTrue(ebs["Encrypted"])
        self.assertTrue(ebs["DeleteOnTermination"])
        self.assertEqual(ebs["VolumeType"], "gp3")

    def test_ami_and_application_port_are_explicit_parameters(self):
        props = self.resources["StagingInstance"]["Properties"]
        self.assertEqual(props["ImageId"], {"Ref": "AmiId"})
        self.assertIn("AppPort", self.template["Parameters"])

    def test_ami_requires_cloudformation_signal_helper(self):
        ami = self.template["Parameters"]["AmiId"]["Description"]
        runbook = (ROOT / "docs/infrastructure/ec2-staging.md").read_text(encoding="utf-8")
        self.assertIn("aws-cfn-bootstrap", ami)
        self.assertIn("/opt/aws/bin/cfn-signal", ami)
        self.assertIn("/opt/aws/bin/cfn-signal", runbook)

    def test_runbook_changes_trigger_staging_validation_workflow(self):
        workflow = (ROOT / ".github/workflows/scrum134-staging-validation.yml").read_text(encoding="utf-8")
        self.assertIn("docs/infrastructure/ec2-staging.md", workflow)

    def test_instance_primary_interface_disables_public_ipv4_auto_assignment(self):
        props = self.resources["StagingInstance"]["Properties"]
        self.assertIn("NetworkInterfaces", props)
        interfaces = props["NetworkInterfaces"]
        self.assertEqual(len(interfaces), 1)
        self.assertEqual(interfaces[0]["DeviceIndex"], "0")
        self.assertEqual(interfaces[0]["SubnetId"], {"Ref": "SubnetId"})
        self.assertEqual(
            interfaces[0]["GroupSet"],
            [{"GetAtt": "StagingSecurityGroup.GroupId"}],
        )
        self.assertIs(interfaces[0]["AssociatePublicIpAddress"], False)
        self.assertTrue(interfaces[0]["DeleteOnTermination"])
        self.assertNotIn("SubnetId", props)
        self.assertNotIn("SecurityGroupIds", props)

    def test_no_public_ip_ssh_key_or_inline_iam_role_is_created(self):
        props = self.resources["StagingInstance"]["Properties"]
        self.assertNotIn("KeyName", props)
        self.assertNotIn("AssociatePublicIpAddress", props)
        self.assertNotIn("PublicIp", props)
        self.assertNotIn("AWS::IAM::Role", {item["Type"] for item in self.resources.values()})
        self.assertNotIn("AWS::EC2::EIP", {item["Type"] for item in self.resources.values()})

    def test_runbook_documents_parameter_file_format_supported_by_aws_cli(self):
        runbook = (ROOT / "docs/infrastructure/ec2-staging.md").read_text(encoding="utf-8")
        self.assertIn("--parameter-overrides file://<private-parameter-file.json>", runbook)
        self.assertIn("ParameterKey", runbook)
        self.assertIn("ParameterValue", runbook)
        self.assertIn("template-oriented wrapper", runbook)
        self.assertIn("--no-execute-changeset", runbook)

    def test_parameter_overrides_json_file_has_supported_cli_shape(self):
        example = json.loads((ROOT / "infra/aws/staging/parameters.example.json").read_text(encoding="utf-8"))
        template_parameters = set(self.template["Parameters"])
        self.assertEqual(set(example["Parameters"]), template_parameters)
        cli_overrides = [
            {"ParameterKey": key, "ParameterValue": str(value)}
            for key, value in example["Parameters"].items()
        ]
        self.assertEqual(set(cli_overrides[0]), {"ParameterKey", "ParameterValue"})
        self.assertEqual({item["ParameterKey"] for item in cli_overrides}, template_parameters)

    def test_bootstrap_reports_failure_to_cloudformation(self):
        user_data = self.resources["StagingInstance"]["Properties"]["UserData"]["Fn::Base64"]["Sub"]
        self.assertIn("trap 'rc=$?; /opt/aws/bin/cfn-signal -e $rc", user_data)
        self.assertNotIn("systemctl disable --now sshd || true", user_data)

    def test_ami_description_does_not_reference_removed_parameter(self):
        ami = self.template["Parameters"]["AmiId"]
        self.assertNotIn("AmiReleaseVersion", ami["Description"])
        self.assertNotIn("AmiReleaseVersion", self.template["Parameters"])

    def test_template_does_not_claim_https_app_readiness(self):
        template_text = TEMPLATE_PATH.read_text(encoding="utf-8")
        self.assertIn("nginx -t", template_text)
        self.assertIn(".disabled", template_text)
        self.assertNotIn("listen 443", template_text)
        self.assertNotIn("certbot", template_text)
        self.assertNotIn("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY", template_text)


if __name__ == "__main__":
    unittest.main(verbosity=2)

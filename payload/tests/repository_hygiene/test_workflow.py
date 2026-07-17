from pathlib import Path
import unittest
from tools.repository_hygiene.workflow import route_registry_command

ROOT=Path(__file__).resolve().parents[2]

class WorkflowTests(unittest.TestCase):
    def test_route_registry_command_uses_policy(self):
        command=route_registry_command(ROOT)
        self.assertIn("243",command)
        self.assertIn("data/site-routes-effective-overrides.json",command)

if __name__ == "__main__":
    unittest.main()

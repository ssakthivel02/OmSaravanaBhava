import unittest
from tools.release_closure.plan import validate_plan
class PlanTests(unittest.TestCase):
    def plan(self):
        return {"release":240,"expectedCount":14,"paths":["assets/js/site-directory.js",*[f"x/__pycache__/c{i}.pyc" for i in range(13)]]}
    def test_minimal_forbidden_plan_passes(self): self.assertEqual(validate_plan(self.plan(),{"maximumFinalChangedFiles":500}),[])
    def test_duplicate_fails(self):
        p=self.plan(); p["paths"][-1]=p["paths"][0]; self.assertTrue(validate_plan(p,{"maximumFinalChangedFiles":500}))
if __name__=="__main__": unittest.main()

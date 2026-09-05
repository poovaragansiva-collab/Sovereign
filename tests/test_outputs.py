import unittest
import os
import shutil
from outputs import JSONOutputGenerator, TXTOutputGenerator, DOCXOutputGenerator, PDFOutputGenerator, XLSXOutputGenerator

class TestOutputs(unittest.TestCase):
    def setUp(self):
        self.output_dir = "test_outputs"
        os.makedirs(self.output_dir, exist_ok=True)
        self.generators = {
            "json": JSONOutputGenerator(output_dir=self.output_dir),
            "txt": TXTOutputGenerator(output_dir=self.output_dir),
            "docx": DOCXOutputGenerator(output_dir=self.output_dir),
            "pdf": PDFOutputGenerator(output_dir=self.output_dir),
            "xlsx": XLSXOutputGenerator(output_dir=self.output_dir)
        }

    def tearDown(self):
        if os.path.exists(self.output_dir):
            shutil.rmtree(self.output_dir)

    def test_txt_generation(self):
        gen = self.generators["txt"]
        result = gen.generate("Hello world", "test.txt")
        self.assertEqual(result["status"], "success")
        self.assertTrue(os.path.exists(result["path"]))

    def test_json_generation(self):
        gen = self.generators["json"]
        result = gen.generate({"message": "Hello world"}, "test.json")
        self.assertEqual(result["status"], "success")
        self.assertTrue(os.path.exists(result["path"]))
        
    def test_docx_generation(self):
        gen = self.generators["docx"]
        result = gen.generate(["Hello world", "Test paragraph"], "test.docx")
        self.assertEqual(result["status"], "success")
        self.assertTrue(os.path.exists(result["path"]))
        
    def test_pdf_generation(self):
        gen = self.generators["pdf"]
        result = gen.generate({"Heading": "Hello world"}, "test.pdf")
        self.assertEqual(result["status"], "success")
        self.assertTrue(os.path.exists(result["path"]))
        
    def test_xlsx_generation(self):
        gen = self.generators["xlsx"]
        result = gen.generate([{"col1": "val1", "col2": "val2"}], "test.xlsx")
        self.assertEqual(result["status"], "success")
        self.assertTrue(os.path.exists(result["path"]))

    def test_path_traversal_protection(self):
        gen = self.generators["txt"]
        result = gen.generate("Hello world", "../../../test.txt")
        self.assertEqual(result["status"], "success")
        # Should not have traversed up, instead created inside output_dir with a safe name
        self.assertTrue(result["path"].startswith(os.path.abspath(self.output_dir)))
        self.assertNotIn("..", result["path"])
        
    def test_auto_append_extension(self):
        gen = self.generators["json"]
        result = gen.generate({"message": "Hello world"}, "test_no_ext")
        self.assertEqual(result["status"], "success")
        self.assertTrue(result["filename"].endswith(".json"))
        self.assertTrue(result["path"].endswith(".json"))

if __name__ == '__main__':
    unittest.main()

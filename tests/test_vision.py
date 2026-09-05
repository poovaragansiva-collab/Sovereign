import unittest
import os
import tempfile
from unittest.mock import MagicMock, patch

from vision import LocalOCR, OllamaVisionClient

class TestVision(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.test_image_path = os.path.join(self.temp_dir.name, "test_img.png")
        # Create a dummy file
        with open(self.test_image_path, "wb") as f:
            f.write(b"dummy image data")

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_ocr_missing_image(self):
        ocr = LocalOCR()
        with self.assertRaises(FileNotFoundError):
            ocr.extract_text(os.path.join(self.temp_dir.name, "missing.png"))

    @patch('vision.ocr.Image')
    @patch('vision.ocr.pytesseract')
    def test_ocr_extraction(self, mock_pytesseract, mock_image):
        mock_pytesseract.image_to_string.return_value = "Extracted test text"
        ocr = LocalOCR()
        
        text = ocr.extract_text(self.test_image_path)
        self.assertEqual(text, "Extracted test text")
        mock_image.open.assert_called_once_with(self.test_image_path)
        
    def test_vision_client_missing_image(self):
        mock_ai_client = MagicMock()
        client = OllamaVisionClient(ai_client=mock_ai_client)
        
        with self.assertRaises(FileNotFoundError):
            client.analyze_image(os.path.join(self.temp_dir.name, "missing.png"), "Describe this", "llava")

    def test_vision_client_analysis(self):
        mock_ai_client = MagicMock()
        mock_ai_client.generate.return_value = {"response": "This is a dummy image."}
        client = OllamaVisionClient(ai_client=mock_ai_client)
        
        result = client.analyze_image(self.test_image_path, "Describe this", "llava")
        
        self.assertEqual(result["response"], "This is a dummy image.")
        mock_ai_client.generate.assert_called_once()
        kwargs = mock_ai_client.generate.call_args.kwargs
        self.assertEqual(kwargs["prompt"], "Describe this")
        self.assertEqual(kwargs["model"], "llava")
        self.assertIn("images", kwargs)
        self.assertEqual(len(kwargs["images"]), 1)

if __name__ == '__main__':
    unittest.main()

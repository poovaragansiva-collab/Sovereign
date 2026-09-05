import unittest
import tempfile
import os
from unittest.mock import MagicMock, patch

from rag import TextLoader, TextSplitter, LocalEmbeddings, LocalVectorStore, RAGRetriever

class TestRAG(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.test_file_path = os.path.join(self.temp_dir.name, "test_doc.txt")
        with open(self.test_file_path, "w", encoding="utf-8") as f:
            f.write("Sovereign AI workbench is a local-first application.")

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_text_loader(self):
        loader = TextLoader()
        docs = loader.load(self.test_file_path)
        self.assertEqual(len(docs), 1)
        self.assertEqual(docs[0]["text"], "Sovereign AI workbench is a local-first application.")
        self.assertEqual(docs[0]["metadata"]["source"], self.test_file_path)

    def test_text_loader_missing_file(self):
        loader = TextLoader()
        with self.assertRaises(FileNotFoundError):
            loader.load(os.path.join(self.temp_dir.name, "missing.txt"))

    def test_text_splitter(self):
        splitter = TextSplitter(chunk_size=10, chunk_overlap=2)
        docs = [{"text": "0123456789abcdef", "metadata": {"source": "test"}}]
        chunks = splitter.split_documents(docs)
        self.assertEqual(len(chunks), 2)
        self.assertEqual(chunks[0]["text"], "0123456789")
        self.assertEqual(chunks[1]["text"], "89abcdef")

    @patch('rag.embeddings.SentenceTransformer')
    def test_local_embeddings(self, mock_transformer):
        mock_model = MagicMock()
        mock_model.encode.return_value = [[0.1, 0.2, 0.3]]
        mock_transformer.return_value = mock_model
        
        # We need to bypass the ImportError check for the test
        with patch('rag.embeddings.SentenceTransformer', mock_transformer):
            embeddings = LocalEmbeddings(model_name="test-model")
            
            result = embeddings.embed_documents(["test text"])
            self.assertEqual(len(result), 1)
            self.assertEqual(result[0], [0.1, 0.2, 0.3])
            
            mock_model.encode.assert_called_once_with(["test text"], convert_to_numpy=True)

    @patch('rag.vectorstore.chromadb')
    def test_local_vectorstore(self, mock_chromadb):
        mock_client = MagicMock()
        mock_collection = MagicMock()
        mock_client.get_or_create_collection.return_value = mock_collection
        mock_chromadb.PersistentClient.return_value = mock_client
        
        with patch('rag.vectorstore.chromadb', mock_chromadb):
            store = LocalVectorStore(persist_directory=self.temp_dir.name)
            
            # Add texts
            store.add_texts(["test text"], [{"source": "test"}], [[0.1, 0.2, 0.3]])
            mock_collection.add.assert_called_once()
            
            # Similarity search
            mock_collection.query.return_value = {
                'ids': [['id1']],
                'documents': [['test text']],
                'metadatas': [[{'source': 'test'}]],
                'distances': [[0.05]]
            }
            results = store.similarity_search([0.1, 0.2, 0.3], k=1)
            self.assertEqual(len(results), 1)
            self.assertEqual(results[0]["text"], "test text")

if __name__ == '__main__':
    unittest.main()

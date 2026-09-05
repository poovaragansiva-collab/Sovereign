import sys
from ai import get_ollama_base_url, OllamaClient, OllamaConnectionError, OllamaRequestError

def main():
    base_url = get_ollama_base_url()
    print(f"Connecting to Ollama at: {base_url}")
    
    # We use a commonly available model like 'llama3' for testing.
    # The user may need to change this if they use a different model.
    model_name = "llama3"
    print(f"Attempting to generate text using model: '{model_name}'")
    
    client = OllamaClient(base_url)
    
    try:
        response = client.generate(
            prompt="Hello, this is a test from the Sovereign AI Workbench. Respond with 'Test successful'.",
            model=model_name
        )
        print("\n--- Request Successful ---")
        print("Response received from Ollama:")
        print(response.get("response", ""))
        print("--------------------------")
    except OllamaConnectionError as e:
        print(f"\n[ERROR] Connection failed: {e}")
        print("Please ensure that Ollama is running.")
        sys.exit(1)
    except OllamaRequestError as e:
        print(f"\n[ERROR] Request failed: {e}")
        print(f"Check if the model '{model_name}' is installed via 'ollama run {model_name}'.")
        sys.exit(1)
    except Exception as e:
        print(f"\n[ERROR] An unexpected error occurred: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

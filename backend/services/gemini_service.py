import os
import time
import json
import logging
from google import genai
from google.genai import types
from google.genai.errors import APIError
import pydantic
from dotenv import load_dotenv

load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("locflow.gemini")

# Pydantic schemas to enforce structured JSON output from Gemini
class TranslationItem(pydantic.BaseModel):
    id: int
    translation: str

class TranslationResponse(pydantic.BaseModel):
    translations: list[TranslationItem]

class GeminiService:
    def __init__(self):
        # genai.Client automatically reads GEMINI_API_KEY from environment variables
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key or api_key == "your_api_key_here":
            logger.warning("GEMINI_API_KEY environment variable is missing or placeholder.")
        
        # Pass the key explicitly to be safe
        self.client = genai.Client(api_key=api_key)
        self.model = "gemini-2.5-flash"

    def translate_batch(self, texts: list[str], glossary_pairs: list[tuple[str, str]] = None) -> list[str]:
        """
        Translates a list of Chinese texts to Vietnamese in a single batch API call.
        Enforces glossary mapping and ensures outputs are aligned with input order.
        """
        if not texts:
            return []

        # 1. Format the glossary context if available
        glossary_ctx = ""
        if glossary_pairs:
            glossary_lines = [f"- \"{src}\" translates to \"{tgt}\"" for src, tgt in glossary_pairs]
            glossary_ctx = "GLOSSARY TERMINOLOGY TO ENFORCE STRICTLY:\n" + "\n".join(glossary_lines) + "\n\n"

        # 2. Build the structured payload
        input_items = [{"id": idx, "text": text} for idx, text in enumerate(texts)]
        
        # 3. Design prompt instructions
        prompt = (
            "You are a professional game operations localization specialist translating from Chinese (zh) to Vietnamese (vi).\n\n"
            "INSTRUCTIONS:\n"
            "1. Translate each of the text strings provided in the JSON input.\n"
            "2. Preserve all placeholders, variables (e.g. {0}, %s, [player_name], \\n), HTML/formatting tags, and special symbols exactly. Do not translate them.\n"
            "3. Maintain consistency in tone and vocabulary across all translations.\n"
            "4. Strictly adhere to the glossary terms provided below.\n\n"
            f"{glossary_ctx}"
            "Input text data in JSON format:\n"
            f"{json.dumps(input_items, ensure_ascii=False)}\n\n"
            "Return the translations matching the provided schema."
        )

        max_retries = 3
        backoff = 2.0

        for attempt in range(max_retries):
            try:
                # Call Gemini API with structured schema validation
                response = self.client.models.generate_content(
                    model=self.model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=TranslationResponse,
                        temperature=0.1,  # Low temperature for precise, non-creative translations
                    )
                )

                # Parse JSON response
                response_data = json.loads(response.text)
                translations_map = {item["id"]: item["translation"] for item in response_data.get("translations", [])}

                # Construct result array matching input index order
                translated_texts = []
                for idx in range(len(texts)):
                    if idx in translations_map:
                        translated_texts.append(translations_map[idx])
                    else:
                        logger.warning(f"Missing index {idx} in translation. Defaulting to source text.")
                        translated_texts.append("")
                
                return translated_texts

            except APIError as e:
                logger.error(f"Gemini API Error (Attempt {attempt+1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    time.sleep(backoff)
                    backoff *= 2
                else:
                    raise e
            except Exception as e:
                logger.error(f"Parsing error or unexpected failure (Attempt {attempt+1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    time.sleep(backoff)
                    backoff *= 2
                else:
                    raise e

        # Fallback in case of failure
        return [""] * len(texts)

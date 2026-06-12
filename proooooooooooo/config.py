"""
Configuration module for the AI Travel Concierge Agent.
Loads environment variables and validates required API keys.
"""

import os
import sys
from dotenv import load_dotenv

# Load .env file
load_dotenv()


class Config:
    """Centralized configuration loaded from environment variables."""

    # --- OpenAI ---
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gpt-4o-mini")
    LLM_TEMPERATURE: float = float(os.getenv("LLM_TEMPERATURE", "0.3"))

    # --- OpenWeatherMap ---
    OPENWEATHER_API_KEY: str = os.getenv("OPENWEATHER_API_KEY", "")
    OPENWEATHER_BASE_URL: str = "https://api.openweathermap.org"

    # --- Google Places ---
    GOOGLE_PLACES_API_KEY: str = os.getenv("GOOGLE_PLACES_API_KEY", "")

    # --- Amadeus ---
    AMADEUS_CLIENT_ID: str = os.getenv("AMADEUS_CLIENT_ID", "")
    AMADEUS_CLIENT_SECRET: str = os.getenv("AMADEUS_CLIENT_SECRET", "")

    @classmethod
    def get_api_status(cls) -> dict:
        """Return a dict showing which API keys are configured."""
        return {
            "OpenAI": bool(cls.OPENAI_API_KEY and cls.OPENAI_API_KEY != "your_openai_api_key_here"),
            "OpenWeatherMap": bool(cls.OPENWEATHER_API_KEY and cls.OPENWEATHER_API_KEY != "your_openweather_api_key_here"),
            "Google Places": bool(cls.GOOGLE_PLACES_API_KEY and cls.GOOGLE_PLACES_API_KEY != "your_google_places_api_key_here"),
            "Amadeus": bool(
                cls.AMADEUS_CLIENT_ID
                and cls.AMADEUS_CLIENT_ID != "your_amadeus_client_id_here"
                and cls.AMADEUS_CLIENT_SECRET
                and cls.AMADEUS_CLIENT_SECRET != "your_amadeus_client_secret_here"
            ),
        }

    @classmethod
    def validate(cls) -> list[str]:
        """Validate configuration. Returns list of warnings for missing keys."""
        warnings = []
        status = cls.get_api_status()

        if not status["OpenAI"]:
            warnings.append("⚠️ OpenAI API key is missing — the agent cannot function without it.")
        if not status["OpenWeatherMap"]:
            warnings.append("⚠️ OpenWeatherMap API key is missing — weather features disabled.")
        if not status["Google Places"]:
            warnings.append("⚠️ Google Places API key is missing — attraction search disabled.")
        if not status["Amadeus"]:
            warnings.append("⚠️ Amadeus credentials missing — hotel & flight search disabled.")

        return warnings

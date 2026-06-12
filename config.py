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

    # --- Google Gemini ---
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gemini-2.5-flash")
    LLM_TEMPERATURE: float = float(os.getenv("LLM_TEMPERATURE", "0.3"))

    # --- OpenWeatherMap ---
    OPENWEATHER_API_KEY: str = os.getenv("OPENWEATHER_API_KEY", "")
    OPENWEATHER_BASE_URL: str = "https://api.openweathermap.org"

    # --- Google Places ---
    GOOGLE_PLACES_API_KEY: str = os.getenv("GOOGLE_PLACES_API_KEY", "")

    # --- Aviationstack ---
    AVIATIONSTACK_API_KEY: str = os.getenv("AVIATIONSTACK_API_KEY", "")

    # --- Foursquare ---
    FOURSQUARE_API_KEY: str = os.getenv("FOURSQUARE_API_KEY", "")

    @classmethod
    def get_api_status(cls) -> dict:
        """Return a dict showing which API keys are configured."""
        return {
            "Gemini": bool(cls.GOOGLE_API_KEY and cls.GOOGLE_API_KEY != "your_gemini_api_key_here"),
            "OpenWeatherMap": bool(cls.OPENWEATHER_API_KEY and cls.OPENWEATHER_API_KEY != "your_openweather_api_key_here"),
            "Google Places": bool(cls.GOOGLE_PLACES_API_KEY and cls.GOOGLE_PLACES_API_KEY != "your_google_places_api_key_here"),
            "Aviationstack": bool(cls.AVIATIONSTACK_API_KEY and cls.AVIATIONSTACK_API_KEY != "your_aviationstack_api_key_here"),
            "Foursquare": bool(cls.FOURSQUARE_API_KEY and cls.FOURSQUARE_API_KEY != "your_foursquare_api_key_here"),
        }

    @classmethod
    def validate(cls) -> list[str]:
        """Validate configuration. Returns list of warnings for missing keys."""
        warnings = []
        status = cls.get_api_status()

        if not status["Gemini"]:
            warnings.append("⚠️ Google Gemini API key is missing — the agent cannot function without it.")
        if not status["OpenWeatherMap"]:
            warnings.append("⚠️ OpenWeatherMap API key is missing — weather features disabled.")
        if not status["Google Places"]:
            warnings.append("⚠️ Google Places API key is missing — attraction search disabled.")
        if not status["Aviationstack"]:
            warnings.append("⚠️ Aviationstack API key missing — flight tracking disabled.")
        if not status["Foursquare"]:
            warnings.append("⚠️ Foursquare API key missing — hotel search disabled.")

        return warnings

"""
OpenWeatherMap tool for the AI Travel Concierge Agent.
Provides current weather conditions and 5-day forecast for any city.
"""

import requests
from langchain.tools import tool
from config import Config


def _geocode_city(city: str, country_code: str = "") -> dict | None:
    """Convert a city name to latitude/longitude using OpenWeatherMap Geocoding API."""
    query = f"{city},{country_code}" if country_code else city
    url = f"{Config.OPENWEATHER_BASE_URL}/geo/1.0/direct"
    params = {"q": query, "limit": 1, "appid": Config.OPENWEATHER_API_KEY}

    try:
        resp = requests.get(url, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        if data:
            return {
                "lat": data[0]["lat"],
                "lon": data[0]["lon"],
                "name": data[0].get("name", city),
                "country": data[0].get("country", ""),
            }
    except Exception:
        pass
    return None


def _get_current_weather(lat: float, lon: float) -> dict | None:
    """Fetch current weather conditions."""
    url = f"{Config.OPENWEATHER_BASE_URL}/data/2.5/weather"
    params = {"lat": lat, "lon": lon, "appid": Config.OPENWEATHER_API_KEY, "units": "metric"}

    try:
        resp = requests.get(url, params=params, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception:
        return None


def _get_forecast(lat: float, lon: float) -> dict | None:
    """Fetch 5-day / 3-hour forecast."""
    url = f"{Config.OPENWEATHER_BASE_URL}/data/2.5/forecast"
    params = {"lat": lat, "lon": lon, "appid": Config.OPENWEATHER_API_KEY, "units": "metric"}

    try:
        resp = requests.get(url, params=params, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception:
        return None


def _format_current(data: dict) -> str:
    """Format current weather data into readable text."""
    main = data.get("main", {})
    weather = data.get("weather", [{}])[0]
    wind = data.get("wind", {})

    return (
        f"🌡️ Temperature: {main.get('temp', 'N/A')}°C (feels like {main.get('feels_like', 'N/A')}°C)\n"
        f"☁️ Conditions: {weather.get('description', 'N/A').title()}\n"
        f"💧 Humidity: {main.get('humidity', 'N/A')}%\n"
        f"💨 Wind: {wind.get('speed', 'N/A')} m/s\n"
        f"👁️ Visibility: {data.get('visibility', 'N/A')}m\n"
        f"🌡️ Min/Max: {main.get('temp_min', 'N/A')}°C / {main.get('temp_max', 'N/A')}°C"
    )


def _format_forecast(data: dict) -> str:
    """Summarize 5-day forecast by day."""
    if not data or "list" not in data:
        return "Forecast data not available."

    daily: dict[str, list] = {}
    for entry in data["list"]:
        date = entry["dt_txt"].split(" ")[0]
        daily.setdefault(date, []).append(entry)

    lines = []
    for date, entries in list(daily.items())[:5]:
        temps = [e["main"]["temp"] for e in entries]
        descriptions = [e["weather"][0]["description"] for e in entries]
        # Pick the most common weather description for the day
        most_common = max(set(descriptions), key=descriptions.count)
        lines.append(
            f"📅 {date}: {min(temps):.0f}°C – {max(temps):.0f}°C | {most_common.title()}"
        )

    return "\n".join(lines)


@tool
def get_weather(city: str, country_code: str = "") -> str:
    """Get current weather conditions and a 5-day forecast for a city.

    Args:
        city: Name of the city (e.g., "Paris", "Tokyo", "New York")
        country_code: Optional ISO 3166 country code (e.g., "FR", "JP", "US")

    Returns:
        A formatted string with current weather and 5-day forecast.
    """
    if not Config.OPENWEATHER_API_KEY or Config.OPENWEATHER_API_KEY == "your_openweather_api_key_here":
        return "❌ OpenWeatherMap API key is not configured. Please add it to your .env file."

    # Geocode the city
    location = _geocode_city(city, country_code)
    if not location:
        return f"❌ Could not find location: {city}. Please check the city name and try again."

    city_label = f"{location['name']}, {location['country']}"

    # Get current weather
    current = _get_current_weather(location["lat"], location["lon"])
    current_text = _format_current(current) if current else "Current weather data unavailable."

    # Get forecast
    forecast = _get_forecast(location["lat"], location["lon"])
    forecast_text = _format_forecast(forecast) if forecast else "Forecast data unavailable."

    return (
        f"🌍 Weather for {city_label}\n"
        f"{'═' * 40}\n\n"
        f"📍 CURRENT CONDITIONS\n{current_text}\n\n"
        f"📊 5-DAY FORECAST\n{forecast_text}"
    )

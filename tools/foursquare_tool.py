"""
Foursquare travel tool for the AI Travel Concierge Agent.
Search for hotels using the Foursquare Places API.
"""

import requests
from langchain.tools import tool
from config import Config


@tool
def search_hotels(city_name: str) -> str:
    """Search for hotels in a city using the city name.

    Args:
        city_name: The name of the city to search for hotels in (e.g., "Paris", "New York").

    Returns:
        A formatted list of available hotels with names and details.
    """
    if not Config.FOURSQUARE_API_KEY or Config.FOURSQUARE_API_KEY == "your_foursquare_api_key_here":
        return "❌ Foursquare API credentials are not configured. Please add them to your .env file."

    try:
        url = "https://api.foursquare.com/v3/places/search"
        headers = {
            "Accept": "application/json",
            "Authorization": Config.FOURSQUARE_API_KEY
        }
        params = {
            "query": "hotel",
            "near": city_name,
            "limit": 10
        }

        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        
        data = response.json()
        results = data.get("results", [])

        if not results:
            return f"No hotels found in {city_name}. Try a different location."

        lines = [
            f"🏨 Hotels in {city_name.upper()} (via Foursquare)\n{'═' * 50}\n"
        ]

        for i, place in enumerate(results, 1):
            name = place.get("name", "Unknown Hotel")
            location = place.get("location", {})
            address = location.get("formatted_address", "Address unavailable")
            
            lines.append(
                f"{i}. 🏨 **{name}**\n"
                f"   📍 Address: {address}\n"
            )

        return "\n".join(lines)

    except requests.exceptions.RequestException as error:
        return f"❌ Foursquare API error: {error}"
    except Exception as e:
        return f"❌ Error searching hotels: {str(e)}"

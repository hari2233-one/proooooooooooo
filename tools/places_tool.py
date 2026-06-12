"""
Google Places tool for the AI Travel Concierge Agent.
Search for tourist attractions, restaurants, and points of interest.
"""

import googlemaps
from langchain.tools import tool
from config import Config


def _get_gmaps_client():
    """Get an initialized Google Maps client."""
    return googlemaps.Client(key=Config.GOOGLE_PLACES_API_KEY)


@tool
def search_places(query: str, location: str = "") -> str:
    """Search for tourist attractions, restaurants, museums, or any points of interest.

    Args:
        query: What to search for (e.g., "tourist attractions in Paris",
               "best restaurants in Tokyo", "museums in London")
        location: Optional city or area to focus the search

    Returns:
        A formatted list of places with names, addresses, ratings, and types.
    """
    if not Config.GOOGLE_PLACES_API_KEY or Config.GOOGLE_PLACES_API_KEY == "your_google_places_api_key_here":
        return "❌ Google Places API key is not configured. Please add it to your .env file."

    try:
        gmaps = _get_gmaps_client()

        # Build search query
        search_query = query
        if location and location.lower() not in query.lower():
            search_query = f"{query} in {location}"

        # Perform text search
        result = gmaps.places(query=search_query)
        places = result.get("results", [])

        if not places:
            return f"No places found for: {search_query}. Try a different search query."

        # Format results (top 8)
        lines = [f"🗺️ Places matching: \"{search_query}\"\n{'═' * 45}\n"]

        for i, place in enumerate(places[:8], 1):
            name = place.get("name", "Unknown")
            address = place.get("formatted_address", "Address not available")
            rating = place.get("rating", "N/A")
            total_ratings = place.get("user_ratings_total", 0)
            types = place.get("types", [])

            # Clean up type names
            clean_types = [t.replace("_", " ").title() for t in types[:3] if t != "point_of_interest"]

            # Star rating display
            if isinstance(rating, (int, float)):
                stars = "⭐" * int(rating)
                rating_text = f"{rating}/5 {stars} ({total_ratings:,} reviews)"
            else:
                rating_text = "No ratings yet"

            # Business status
            status = place.get("business_status", "")
            status_icon = "🟢" if status == "OPERATIONAL" else "🔴" if status == "CLOSED" else "⚪"

            # Price level
            price_level = place.get("price_level")
            price_text = ""
            if price_level is not None:
                price_text = f" | {'💰' * price_level}" if price_level > 0 else " | Free"

            lines.append(
                f"{i}. {status_icon} **{name}**\n"
                f"   📍 {address}\n"
                f"   ⭐ {rating_text}{price_text}\n"
                f"   🏷️ {', '.join(clean_types) if clean_types else 'General'}\n"
            )

        return "\n".join(lines)

    except Exception as e:
        return f"❌ Error searching places: {str(e)}"

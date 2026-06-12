"""
Aviationstack tool for the AI Travel Concierge Agent.
Track real-time flights using the Aviationstack API.
"""

import requests
from langchain.tools import tool
from config import Config


@tool
def track_flight(flight_number: str) -> str:
    """Track a real-time flight using its IATA flight number.

    Args:
        flight_number: The IATA flight number to track (e.g., "AA123", "BA12").

    Returns:
        A formatted string with the flight's current status, departure, and arrival details.
    """
    if not Config.AVIATIONSTACK_API_KEY or Config.AVIATIONSTACK_API_KEY == "your_aviationstack_api_key_here":
        return "❌ Aviationstack API credentials are not configured. Please add them to your .env file."

    try:
        url = "http://api.aviationstack.com/v1/flights"
        params = {
            "access_key": Config.AVIATIONSTACK_API_KEY,
            "flight_iata": flight_number
        }

        response = requests.get(url, params=params)
        response.raise_for_status()
        
        data = response.json()
        
        if "error" in data:
            return f"❌ Aviationstack API error: {data['error'].get('info', 'Unknown error')}"
            
        results = data.get("data", [])

        if not results:
            return f"No active flight found for {flight_number}. The flight might not be active right now."

        flight = results[0]  # Get the most relevant active flight
        
        status = flight.get("flight_status", "unknown")
        
        dep = flight.get("departure", {})
        dep_airport = dep.get("airport", "Unknown")
        dep_iata = dep.get("iata", "N/A")
        dep_time = dep.get("estimated", dep.get("scheduled", "N/A"))
        
        arr = flight.get("arrival", {})
        arr_airport = arr.get("airport", "Unknown")
        arr_iata = arr.get("iata", "N/A")
        arr_time = arr.get("estimated", arr.get("scheduled", "N/A"))

        airline = flight.get("airline", {}).get("name", "Unknown Airline")

        status_emoji = "🟢" if status == "active" else "🟡" if status in ["scheduled", "delayed"] else "🔴"

        lines = [
            f"✈️ Flight Tracking: {airline} {flight_number.upper()}\n{'═' * 50}\n",
            f"   Status: {status_emoji} **{status.capitalize()}**\n",
            f"🛫 **Departure:** {dep_airport} ({dep_iata})",
            f"   Time: {dep_time[:16].replace('T', ' ')}\n",
            f"🛬 **Arrival:** {arr_airport} ({arr_iata})",
            f"   Time: {arr_time[:16].replace('T', ' ')}"
        ]

        return "\n".join(lines)

    except requests.exceptions.RequestException as error:
        return f"❌ Aviationstack API error: {error}"
    except Exception as e:
        return f"❌ Error tracking flight: {str(e)}"

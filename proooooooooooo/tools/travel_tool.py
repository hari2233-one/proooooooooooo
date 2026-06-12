"""
Amadeus travel tool for the AI Travel Concierge Agent.
Search for hotels and flights using the Amadeus API.
"""

from amadeus import Client, ResponseError
from langchain.tools import tool
from config import Config


def _get_amadeus_client():
    """Get an initialized Amadeus client."""
    return Client(
        client_id=Config.AMADEUS_CLIENT_ID,
        client_secret=Config.AMADEUS_CLIENT_SECRET,
    )


@tool
def search_hotels(city_code: str, check_in: str = "", check_out: str = "") -> str:
    """Search for hotels in a city using IATA city code.

    Args:
        city_code: IATA city code (e.g., "PAR" for Paris, "LON" for London,
                   "NYC" for New York, "TYO" for Tokyo, "DEL" for Delhi)
        check_in: Optional check-in date (YYYY-MM-DD format)
        check_out: Optional check-out date (YYYY-MM-DD format)

    Returns:
        A formatted list of available hotels with names and details.
    """
    if not Config.AMADEUS_CLIENT_ID or Config.AMADEUS_CLIENT_ID == "your_amadeus_client_id_here":
        return "❌ Amadeus API credentials are not configured. Please add them to your .env file."

    try:
        amadeus = _get_amadeus_client()

        # Search hotels by city
        response = amadeus.reference_data.locations.hotels.by_city.get(
            cityCode=city_code.upper()
        )

        hotels = response.data
        if not hotels:
            return f"No hotels found for city code: {city_code}. Please verify the IATA city code."

        # Format results (top 10)
        lines = [
            f"🏨 Hotels in {city_code.upper()}\n{'═' * 45}\n"
        ]

        for i, hotel in enumerate(hotels[:10], 1):
            name = hotel.get("name", "Unknown Hotel")
            hotel_id = hotel.get("hotelId", "N/A")
            distance = hotel.get("distance", {})
            dist_val = distance.get("value", "N/A")
            dist_unit = distance.get("unit", "")
            geo = hotel.get("geoCode", {})
            lat = geo.get("latitude", "")
            lon = geo.get("longitude", "")

            lines.append(
                f"{i}. 🏨 **{name}**\n"
                f"   🆔 Hotel ID: {hotel_id}\n"
                f"   📏 Distance from center: {dist_val} {dist_unit}\n"
                f"   📍 Coordinates: {lat}, {lon}\n"
            )

        if check_in and check_out:
            lines.append(f"\n📅 Dates: {check_in} → {check_out}")

        lines.append(
            f"\n💡 Tip: For pricing and availability, "
            f"ask me to look up a specific hotel by its ID."
        )

        return "\n".join(lines)

    except ResponseError as error:
        return f"❌ Amadeus API error: {error}"
    except Exception as e:
        return f"❌ Error searching hotels: {str(e)}"


@tool
def search_flights(
    origin: str,
    destination: str,
    departure_date: str,
    adults: int = 1,
    return_date: str = "",
) -> str:
    """Search for available flights between two cities.

    Args:
        origin: Departure IATA airport/city code (e.g., "JFK", "CDG", "LHR")
        destination: Arrival IATA airport/city code (e.g., "NRT", "FCO", "SIN")
        departure_date: Departure date in YYYY-MM-DD format
        adults: Number of adult passengers (default 1)
        return_date: Optional return date for round-trip (YYYY-MM-DD format)

    Returns:
        A formatted list of flight offers with prices and schedules.
    """
    if not Config.AMADEUS_CLIENT_ID or Config.AMADEUS_CLIENT_ID == "your_amadeus_client_id_here":
        return "❌ Amadeus API credentials are not configured. Please add them to your .env file."

    try:
        amadeus = _get_amadeus_client()

        # Build search params
        params = {
            "originLocationCode": origin.upper(),
            "destinationLocationCode": destination.upper(),
            "departureDate": departure_date,
            "adults": adults,
        }
        if return_date:
            params["returnDate"] = return_date

        response = amadeus.shopping.flight_offers_search.get(**params)
        offers = response.data

        if not offers:
            return (
                f"No flights found from {origin.upper()} to {destination.upper()} "
                f"on {departure_date}. Try different dates or airports."
            )

        # Format results (top 5)
        trip_type = "Round Trip" if return_date else "One Way"
        lines = [
            f"✈️ Flights: {origin.upper()} → {destination.upper()}\n"
            f"📅 {departure_date}"
            + (f" → {return_date}" if return_date else "")
            + f" | {trip_type} | {adults} adult(s)\n"
            + f"{'═' * 50}\n"
        ]

        for i, offer in enumerate(offers[:5], 1):
            price = offer.get("price", {})
            total = price.get("total", "N/A")
            currency = price.get("currency", "USD")

            itineraries = offer.get("itineraries", [])
            segments_info = []

            for itin_idx, itinerary in enumerate(itineraries):
                direction = "🛫 Outbound" if itin_idx == 0 else "🛬 Return"
                duration = itinerary.get("duration", "N/A")
                # Clean duration format (PT2H30M → 2h 30m)
                clean_duration = duration.replace("PT", "").replace("H", "h ").replace("M", "m").strip()

                segments = itinerary.get("segments", [])
                stops = len(segments) - 1
                stop_text = "Direct" if stops == 0 else f"{stops} stop{'s' if stops > 1 else ''}"

                if segments:
                    first = segments[0]
                    last = segments[-1]
                    dep_time = first.get("departure", {}).get("at", "N/A")
                    arr_time = last.get("arrival", {}).get("at", "N/A")
                    carrier = first.get("carrierCode", "N/A")

                    segments_info.append(
                        f"   {direction}: {carrier} | {dep_time[:16]} → {arr_time[:16]}\n"
                        f"   ⏱️ Duration: {clean_duration} | {stop_text}"
                    )

            lines.append(
                f"{i}. 💰 **{currency} {total}**\n"
                + "\n".join(segments_info)
                + "\n"
            )

        return "\n".join(lines)

    except ResponseError as error:
        return f"❌ Amadeus API error: {error}"
    except Exception as e:
        return f"❌ Error searching flights: {str(e)}"

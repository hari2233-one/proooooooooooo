"""
Utility helpers for the AI Travel Concierge Agent.
"""

# Common city to IATA code mapping for the agent's convenience
CITY_TO_IATA: dict[str, str] = {
    # Europe
    "paris": "PAR", "london": "LON", "rome": "ROM", "madrid": "MAD",
    "barcelona": "BCN", "amsterdam": "AMS", "berlin": "BER", "munich": "MUC",
    "vienna": "VIE", "prague": "PRG", "lisbon": "LIS", "athens": "ATH",
    "istanbul": "IST", "zurich": "ZRH", "dublin": "DUB", "milan": "MIL",
    "venice": "VCE", "brussels": "BRU", "stockholm": "STO", "oslo": "OSL",
    "copenhagen": "CPH", "helsinki": "HEL", "warsaw": "WAW", "budapest": "BUD",
    "edinburgh": "EDI", "florence": "FLR", "nice": "NCE",
    # Asia
    "tokyo": "TYO", "osaka": "OSA", "kyoto": "UKY", "seoul": "SEL",
    "beijing": "BJS", "shanghai": "SHA", "hong kong": "HKG", "bangkok": "BKK",
    "singapore": "SIN", "kuala lumpur": "KUL", "jakarta": "JKT",
    "delhi": "DEL", "mumbai": "BOM", "bangalore": "BLR", "chennai": "MAA",
    "hyderabad": "HYD", "kolkata": "CCU", "dubai": "DXB", "doha": "DOH",
    "taipei": "TPE", "hanoi": "HAN", "ho chi minh": "SGN", "manila": "MNL",
    "bali": "DPS",
    # Americas
    "new york": "NYC", "los angeles": "LAX", "chicago": "CHI",
    "san francisco": "SFO", "miami": "MIA", "las vegas": "LAS",
    "boston": "BOS", "washington": "WAS", "seattle": "SEA",
    "toronto": "YTO", "vancouver": "YVR", "mexico city": "MEX",
    "cancun": "CUN", "sao paulo": "SAO", "rio de janeiro": "RIO",
    "buenos aires": "BUE", "lima": "LIM", "bogota": "BOG",
    # Africa & Oceania
    "cairo": "CAI", "cape town": "CPT", "nairobi": "NBO",
    "casablanca": "CAS", "marrakech": "RAK",
    "sydney": "SYD", "melbourne": "MEL", "auckland": "AKL",
}


def get_iata_code(city: str) -> str | None:
    """Look up the IATA code for a common city name."""
    return CITY_TO_IATA.get(city.lower().strip())


# Mapping of IATA codes to common airport codes for flights
CITY_TO_AIRPORT: dict[str, str] = {
    "PAR": "CDG", "LON": "LHR", "NYC": "JFK", "TYO": "NRT",
    "ROM": "FCO", "MAD": "MAD", "BCN": "BCN", "AMS": "AMS",
    "BER": "BER", "MUC": "MUC", "VIE": "VIE", "PRG": "PRG",
    "LIS": "LIS", "ATH": "ATH", "IST": "IST", "ZRH": "ZRH",
    "DUB": "DUB", "BKK": "BKK", "SIN": "SIN", "HKG": "HKG",
    "DEL": "DEL", "BOM": "BOM", "DXB": "DXB", "SYD": "SYD",
    "SEL": "ICN", "BJS": "PEK", "SHA": "PVG", "MEX": "MEX",
}

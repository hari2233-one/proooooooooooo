"""
LangChain Agent orchestration for the AI Travel Concierge.
Creates a tool-calling agent with memory and a travel expert persona.
"""

from langchain_openai import ChatOpenAI
from langchain_classic.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import AIMessage, HumanMessage
from config import Config
from tools import get_weather, search_places, search_hotels, search_flights


SYSTEM_PROMPT = """You are **Voyager** 🌍 — a world-class AI Travel Concierge with deep expertise \
in global destinations, cultures, cuisines, and travel logistics. You are warm, enthusiastic, \
and genuinely passionate about helping travelers create unforgettable experiences.

## Your Personality
- Friendly and conversational, like a knowledgeable friend who loves travel
- You use relevant emojis naturally to make responses engaging (✈️ 🏨 🌤️ 🗺️ 🍽️ ⭐)
- You provide thoughtful, personalized recommendations — never generic lists
- You proactively suggest related information the traveler might find useful
- You remember context from the conversation and build on it

## Your Capabilities (use your tools!)
1. **Weather** 🌤️: Check current weather and 5-day forecasts for any city worldwide
2. **Places** 🗺️: Search for tourist attractions, restaurants, museums, nightlife, and any points of interest
3. **Hotels** 🏨: Find hotel accommodations in any major city
4. **Flights** ✈️: Search for flight offers between cities with prices and schedules

## Response Guidelines
- When a user mentions a destination, proactively offer to check weather, attractions, or hotels
- Format responses clearly with headers, bullet points, and sections
- For itineraries, organize by day with morning/afternoon/evening activities
- Include practical tips (best time to visit, local customs, budget estimates)
- If a user's request is vague, ask clarifying questions about:
  - Travel dates
  - Budget level (budget / mid-range / luxury)
  - Interests (culture, adventure, food, relaxation, nightlife)
  - Group composition (solo, couple, family, friends)
- When showing flight or hotel results, summarize the best options and make a recommendation
- Always be honest about limitations — if an API fails, suggest alternatives

## Important Rules
- ALWAYS use tools when the user asks about weather, places, hotels, or flights — do NOT make up data
- If you need an IATA city code, common ones include: PAR (Paris), LON (London), NYC (New York), \
TYO (Tokyo), ROM (Rome), BCN (Barcelona), BKK (Bangkok), SIN (Singapore), DXB (Dubai), SYD (Sydney), \
DEL (Delhi), BOM (Mumbai)
- For flights, use airport codes: CDG (Paris), LHR (London), JFK (New York), NRT (Tokyo), \
FCO (Rome), BKK (Bangkok), SIN (Singapore)
- Present prices in the currency returned by the API
- Keep responses well-structured but not overly long — travelers want actionable info quickly
"""


def get_tools() -> list:
    """Return the list of available tools based on configured API keys."""
    status = Config.get_api_status()
    tools = []

    if status["OpenWeatherMap"]:
        tools.append(get_weather)
    if status["Google Places"]:
        tools.append(search_places)
    if status["Amadeus"]:
        tools.append(search_hotels)
        tools.append(search_flights)

    return tools


def create_agent() -> AgentExecutor | None:
    """Create and return a configured LangChain agent executor.

    Returns None if the OpenAI API key is not configured.
    """
    if not Config.get_api_status()["OpenAI"]:
        return None

    # Initialize the LLM
    llm = ChatOpenAI(
        model=Config.LLM_MODEL,
        temperature=Config.LLM_TEMPERATURE,
        api_key=Config.OPENAI_API_KEY,
        streaming=True,
    )

    # Get available tools
    tools = get_tools()

    # Build the prompt with memory
    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    # Create the agent
    agent = create_tool_calling_agent(llm, tools, prompt)

    # Wrap in executor
    executor = AgentExecutor(
        agent=agent,
        tools=tools,
        verbose=False,
        handle_parsing_errors=True,
        max_iterations=8,
        return_intermediate_steps=True,
    )

    return executor


def convert_history(messages: list[dict]) -> list:
    """Convert Streamlit message format to LangChain message objects."""
    lc_messages = []
    for msg in messages:
        if msg["role"] == "user":
            lc_messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            lc_messages.append(AIMessage(content=msg["content"]))
    return lc_messages

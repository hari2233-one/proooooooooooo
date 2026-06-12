"""
AI Travel Concierge — Streamlit Application
A premium, innovative travel assistant interface with glassmorphism,
animated backgrounds, and micro-interactions.
"""

import streamlit as st
import time
from agent import create_agent, convert_history
from config import Config

# ──────────────────────────────────────────────────────────────────────────────
# Page Configuration
# ──────────────────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Voyager — AI Travel Concierge",
    page_icon="🌍",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ──────────────────────────────────────────────────────────────────────────────
# Custom CSS — Premium Dark UI with Glassmorphism & Animations
# ──────────────────────────────────────────────────────────────────────────────
st.markdown("""
<style>
/* ── Google Fonts ── */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap');

/* ── Root Variables ── */
:root {
    --bg-primary: #0a0a0f;
    --bg-secondary: #12121a;
    --bg-card: rgba(255, 255, 255, 0.03);
    --bg-glass: rgba(255, 255, 255, 0.05);
    --border-glass: rgba(255, 255, 255, 0.08);
    --text-primary: #e8e8ed;
    --text-secondary: #8b8b9e;
    --text-muted: #5a5a6e;
    --accent-1: #6c5ce7;
    --accent-2: #a855f7;
    --accent-3: #ec4899;
    --accent-4: #06b6d4;
    --accent-5: #10b981;
    --gradient-main: linear-gradient(135deg, #6c5ce7, #a855f7, #ec4899);
    --gradient-warm: linear-gradient(135deg, #f59e0b, #ef4444, #ec4899);
    --gradient-cool: linear-gradient(135deg, #06b6d4, #6c5ce7, #a855f7);
    --gradient-nature: linear-gradient(135deg, #10b981, #06b6d4, #6c5ce7);
    --shadow-glow: 0 0 30px rgba(108, 92, 231, 0.15);
    --radius-lg: 16px;
    --radius-md: 12px;
    --radius-sm: 8px;
}

/* ── Global Reset ── */
* { font-family: 'Inter', -apple-system, sans-serif !important; }

/* ── Main App Background ── */
.stApp {
    background: var(--bg-primary) !important;
    background-image:
        radial-gradient(ellipse 80% 60% at 10% 20%, rgba(108, 92, 231, 0.08), transparent),
        radial-gradient(ellipse 60% 50% at 90% 80%, rgba(168, 85, 247, 0.06), transparent),
        radial-gradient(ellipse 50% 40% at 50% 50%, rgba(236, 72, 153, 0.04), transparent) !important;
}

/* ── Floating Orbs (Background Animation) ── */
.stApp::before {
    content: '';
    position: fixed;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background:
        radial-gradient(circle 400px at 20% 30%, rgba(108, 92, 231, 0.06), transparent),
        radial-gradient(circle 300px at 80% 70%, rgba(236, 72, 153, 0.05), transparent),
        radial-gradient(circle 350px at 50% 50%, rgba(6, 182, 212, 0.04), transparent);
    animation: floatOrbs 25s ease-in-out infinite;
    pointer-events: none;
    z-index: 0;
}

@keyframes floatOrbs {
    0%, 100% { transform: translate(0, 0) rotate(0deg); }
    25% { transform: translate(2%, -3%) rotate(1deg); }
    50% { transform: translate(-1%, 2%) rotate(-1deg); }
    75% { transform: translate(3%, 1%) rotate(0.5deg); }
}

/* ── Sidebar ── */
section[data-testid="stSidebar"] {
    background: linear-gradient(180deg, #0d0d14, #0a0a0f) !important;
    border-right: 1px solid var(--border-glass) !important;
}

section[data-testid="stSidebar"] .stMarkdown {
    color: var(--text-primary);
}

/* ── Header Area ── */
header[data-testid="stHeader"] {
    background: transparent !important;
}

/* ── Hide default decoration ── */
.stDeployButton, #MainMenu, footer { display: none !important; }

/* ── Chat Messages ── */
.stChatMessage {
    background: var(--bg-glass) !important;
    border: 1px solid var(--border-glass) !important;
    border-radius: var(--radius-lg) !important;
    padding: 1.2rem 1.5rem !important;
    margin-bottom: 1rem !important;
    backdrop-filter: blur(20px) !important;
    -webkit-backdrop-filter: blur(20px) !important;
    animation: messageSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.stChatMessage:hover {
    border-color: rgba(108, 92, 231, 0.2) !important;
    box-shadow: var(--shadow-glow) !important;
}

/* User message accent */
.stChatMessage[data-testid="stChatMessage-user"] {
    border-left: 3px solid var(--accent-1) !important;
    background: rgba(108, 92, 231, 0.04) !important;
}

/* Assistant message accent */
.stChatMessage[data-testid="stChatMessage-assistant"] {
    border-left: 3px solid var(--accent-4) !important;
    background: rgba(6, 182, 212, 0.03) !important;
}

@keyframes messageSlideIn {
    from {
        opacity: 0;
        transform: translateY(16px) scale(0.98);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

/* ── Chat message text ── */
.stChatMessage p, .stChatMessage li, .stChatMessage span {
    color: var(--text-primary) !important;
    font-size: 0.94rem !important;
    line-height: 1.7 !important;
}

.stChatMessage strong {
    color: #c4b5fd !important;
}

.stChatMessage code {
    background: rgba(108, 92, 231, 0.15) !important;
    color: #c4b5fd !important;
    border-radius: 4px;
    padding: 2px 6px;
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 0.85rem !important;
}

/* ── Chat Input ── */
.stChatInput {
    border-top: 1px solid var(--border-glass) !important;
}

.stChatInput > div {
    background: var(--bg-glass) !important;
    border: 1px solid var(--border-glass) !important;
    border-radius: var(--radius-lg) !important;
    backdrop-filter: blur(20px) !important;
    -webkit-backdrop-filter: blur(20px) !important;
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.stChatInput > div:focus-within {
    border-color: var(--accent-1) !important;
    box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.15) !important;
}

.stChatInput textarea {
    color: var(--text-primary) !important;
    caret-color: var(--accent-2) !important;
    font-size: 0.95rem !important;
}

.stChatInput textarea::placeholder {
    color: var(--text-muted) !important;
}

/* ── Buttons ── */
.stButton > button {
    background: var(--bg-glass) !important;
    border: 1px solid var(--border-glass) !important;
    color: var(--text-primary) !important;
    border-radius: var(--radius-md) !important;
    padding: 0.6rem 1.2rem !important;
    font-weight: 500 !important;
    font-size: 0.85rem !important;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
    backdrop-filter: blur(10px) !important;
    cursor: pointer !important;
    width: 100% !important;
}

.stButton > button:hover {
    background: rgba(108, 92, 231, 0.12) !important;
    border-color: rgba(108, 92, 231, 0.3) !important;
    box-shadow: 0 4px 20px rgba(108, 92, 231, 0.15) !important;
    transform: translateY(-1px) !important;
}

.stButton > button:active {
    transform: translateY(0) !important;
}

/* ── Select / Radio ── */
.stSelectbox > div > div,
.stRadio > div {
    background: var(--bg-glass) !important;
    border: 1px solid var(--border-glass) !important;
    border-radius: var(--radius-md) !important;
    color: var(--text-primary) !important;
}

.stRadio label {
    color: var(--text-secondary) !important;
}

.stRadio label span {
    color: var(--text-primary) !important;
}

/* ── Divider ── */
hr {
    border-color: var(--border-glass) !important;
    margin: 1rem 0 !important;
}

/* ── Expander ── */
.streamlit-expanderHeader {
    background: var(--bg-glass) !important;
    border: 1px solid var(--border-glass) !important;
    border-radius: var(--radius-md) !important;
    color: var(--text-primary) !important;
}

.streamlit-expanderContent {
    background: var(--bg-card) !important;
    border: 1px solid var(--border-glass) !important;
    border-top: none !important;
    border-radius: 0 0 var(--radius-md) var(--radius-md) !important;
}

/* ── Scrollbar ── */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
    background: rgba(108, 92, 231, 0.3);
    border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover { background: rgba(108, 92, 231, 0.5); }

/* ── Spinner ── */
.stSpinner > div > div {
    border-top-color: var(--accent-1) !important;
}

/* ── Metric cards ── */
[data-testid="stMetric"] {
    background: var(--bg-glass) !important;
    border: 1px solid var(--border-glass) !important;
    border-radius: var(--radius-md) !important;
    padding: 1rem !important;
}

[data-testid="stMetricLabel"] { color: var(--text-secondary) !important; }
[data-testid="stMetricValue"] { color: var(--text-primary) !important; }

/* ── Status indicators ── */
.api-status {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    margin: 3px 0;
    border-radius: var(--radius-sm);
    font-size: 0.8rem;
    font-weight: 500;
    transition: all 0.2s ease;
}
.api-status.active {
    background: rgba(16, 185, 129, 0.08);
    color: #34d399;
    border: 1px solid rgba(16, 185, 129, 0.15);
}
.api-status.inactive {
    background: rgba(239, 68, 68, 0.08);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.15);
}

/* ── Brand Title ── */
.brand-title {
    font-size: 1.8rem;
    font-weight: 800;
    background: var(--gradient-main);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -0.5px;
    line-height: 1.2;
    margin-bottom: 2px;
}
.brand-subtitle {
    font-size: 0.78rem;
    color: var(--text-muted);
    font-weight: 400;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 1.2rem;
}

/* ── Welcome Hero ── */
.welcome-hero {
    text-align: center;
    padding: 3rem 2rem;
    animation: heroFadeIn 1s cubic-bezier(0.16, 1, 0.3, 1);
}

.welcome-emoji {
    font-size: 4rem;
    display: block;
    margin-bottom: 1rem;
    animation: emojiFloat 3s ease-in-out infinite;
}

@keyframes emojiFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
}

.welcome-title {
    font-size: 2.5rem;
    font-weight: 800;
    background: var(--gradient-main);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 0.5rem;
    letter-spacing: -1px;
}

.welcome-subtitle {
    font-size: 1.1rem;
    color: var(--text-secondary);
    max-width: 600px;
    margin: 0 auto 2rem;
    line-height: 1.6;
}

@keyframes heroFadeIn {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* ── Feature Cards ── */
.feature-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    max-width: 640px;
    margin: 0 auto 2rem;
}

.feature-card {
    background: var(--bg-glass);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-md);
    padding: 1.2rem;
    text-align: left;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    cursor: default;
}

.feature-card:hover {
    border-color: rgba(108, 92, 231, 0.25);
    box-shadow: var(--shadow-glow);
    transform: translateY(-2px);
}

.feature-icon {
    font-size: 1.5rem;
    margin-bottom: 0.4rem;
}

.feature-title {
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.2rem;
}

.feature-desc {
    font-size: 0.75rem;
    color: var(--text-muted);
    line-height: 1.4;
}

/* ── Suggestion Chips ── */
.suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    max-width: 640px;
    margin: 0 auto;
}

.suggestion-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: var(--bg-glass);
    border: 1px solid var(--border-glass);
    border-radius: 50px;
    font-size: 0.8rem;
    color: var(--text-secondary);
    transition: all 0.3s ease;
    cursor: default;
}

.suggestion-chip:hover {
    border-color: rgba(108, 92, 231, 0.3);
    color: var(--text-primary);
    background: rgba(108, 92, 231, 0.08);
}

/* ── Tool Indicator ── */
.tool-indicator {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    background: rgba(108, 92, 231, 0.1);
    border: 1px solid rgba(108, 92, 231, 0.2);
    border-radius: 50px;
    font-size: 0.72rem;
    color: #a78bfa;
    font-weight: 500;
    margin-bottom: 8px;
    animation: pulseGlow 2s ease-in-out infinite;
}

@keyframes pulseGlow {
    0%, 100% { box-shadow: 0 0 5px rgba(108, 92, 231, 0.1); }
    50% { box-shadow: 0 0 15px rgba(108, 92, 231, 0.2); }
}

/* ── Section Labels (Sidebar) ── */
.sidebar-section {
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 2px;
    margin: 1.2rem 0 0.5rem;
    padding-bottom: 0.3rem;
    border-bottom: 1px solid var(--border-glass);
}

/* ── Quick Stats ── */
.stat-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 12px;
    background: var(--bg-glass);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-sm);
    margin: 4px 0;
}
.stat-label { font-size: 0.78rem; color: var(--text-muted); }
.stat-value { font-size: 0.78rem; color: var(--text-primary); font-weight: 600; }

/* ── Typing Animation ── */
.typing-indicator {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 8px 16px;
}

.typing-dot {
    width: 6px;
    height: 6px;
    background: var(--accent-1);
    border-radius: 50%;
    animation: typingBounce 1.4s infinite ease-in-out;
}

.typing-dot:nth-child(1) { animation-delay: -0.32s; }
.typing-dot:nth-child(2) { animation-delay: -0.16s; }
.typing-dot:nth-child(3) { animation-delay: 0; }

@keyframes typingBounce {
    0%, 80%, 100% { transform: scale(0); opacity: 0.4; }
    40% { transform: scale(1); opacity: 1; }
}

/* ── Sidebar Branding Footer ── */
.sidebar-footer {
    position: fixed;
    bottom: 0;
    padding: 1rem;
    font-size: 0.7rem;
    color: var(--text-muted);
    text-align: center;
    width: inherit;
    background: linear-gradient(transparent, var(--bg-primary));
}

/* ── Success / Error Alerts ── */
.stAlert {
    background: var(--bg-glass) !important;
    border: 1px solid var(--border-glass) !important;
    border-radius: var(--radius-md) !important;
    color: var(--text-primary) !important;
}

/* ── General text color ── */
.stMarkdown, .stMarkdown p, .stText {
    color: var(--text-primary) !important;
}

h1, h2, h3, h4 { color: var(--text-primary) !important; }
</style>
""", unsafe_allow_html=True)


# ──────────────────────────────────────────────────────────────────────────────
# Session State Initialization
# ──────────────────────────────────────────────────────────────────────────────
if "messages" not in st.session_state:
    st.session_state.messages = []

if "agent" not in st.session_state:
    st.session_state.agent = create_agent()

if "travel_style" not in st.session_state:
    st.session_state.travel_style = "Explorer"

if "budget" not in st.session_state:
    st.session_state.budget = "Mid-Range"


# ──────────────────────────────────────────────────────────────────────────────
# Helper: Tool Name Mapping for UI indicators
# ──────────────────────────────────────────────────────────────────────────────
TOOL_DISPLAY = {
    "get_weather": ("🌤️", "Weather API"),
    "search_places": ("🗺️", "Places API"),
    "search_hotels": ("🏨", "Hotels API"),
    "search_flights": ("✈️", "Flights API"),
}


# ──────────────────────────────────────────────────────────────────────────────
# Sidebar
# ──────────────────────────────────────────────────────────────────────────────
with st.sidebar:
    # Brand
    st.html('<div class="brand-title">Voyager</div>')
    st.html('<div class="brand-subtitle">AI Travel Concierge</div>')

    # New Chat button
    if st.button("✨  New Conversation", key="new_chat", use_container_width=True):
        st.session_state.messages = []
        st.rerun()

    st.markdown("---")

    # ── API Status ──
    st.html('<div class="sidebar-section">🔌 API Connections</div>')
    api_status = Config.get_api_status()
    for name, is_active in api_status.items():
        status_class = "active" if is_active else "inactive"
        icon = "✦" if is_active else "○"
        label = "Connected" if is_active else "Not configured"
        st.html(f'<div class="api-status {status_class}">{icon} {name} — {label}</div>')

    st.markdown("---")

    # ── Travel Preferences ──
    st.html('<div class="sidebar-section">🎯 Travel Preferences</div>')

    st.session_state.travel_style = st.radio(
        "Travel Style",
        ["Explorer", "Relaxation", "Adventure", "Culture", "Foodie", "Nightlife"],
        index=0,
        label_visibility="collapsed",
    )

    st.session_state.budget = st.radio(
        "Budget Level",
        ["Budget 💸", "Mid-Range 💰", "Luxury 💎"],
        index=1,
        label_visibility="collapsed",
    )

    st.markdown("---")

    # ── Quick Actions ──
    st.html('<div class="sidebar-section">⚡ Quick Actions</div>')

    col1, col2 = st.columns(2)
    with col1:
        if st.button("🌤️ Weather", key="qa_weather", use_container_width=True):
            st.session_state.quick_action = "What's the weather like in popular travel destinations right now?"
            st.rerun()
        if st.button("🗺️ Places", key="qa_places", use_container_width=True):
            st.session_state.quick_action = "Suggest me top tourist attractions for a great vacation"
            st.rerun()
    with col2:
        if st.button("🏨 Hotels", key="qa_hotels", use_container_width=True):
            st.session_state.quick_action = "Help me find great hotel accommodations"
            st.rerun()
        if st.button("✈️ Flights", key="qa_flights", use_container_width=True):
            st.session_state.quick_action = "Help me search for flights"
            st.rerun()

    st.markdown("---")

    # ── Session Stats ──
    st.html('<div class="sidebar-section">📊 Session</div>')
    msg_count = len(st.session_state.messages)
    user_msgs = len([m for m in st.session_state.messages if m["role"] == "user"])
    st.html(
        f'<div class="stat-row"><span class="stat-label">Messages</span>'
        f'<span class="stat-value">{msg_count}</span></div>'
        f'<div class="stat-row"><span class="stat-label">Your queries</span>'
        f'<span class="stat-value">{user_msgs}</span></div>'
        f'<div class="stat-row"><span class="stat-label">Style</span>'
        f'<span class="stat-value">{st.session_state.travel_style}</span></div>'
    )


# ──────────────────────────────────────────────────────────────────────────────
# Main Chat Area
# ──────────────────────────────────────────────────────────────────────────────

# Show welcome screen if no messages
if not st.session_state.messages:
    st.html("""
    <div class="welcome-hero">
        <span class="welcome-emoji">🌍</span>
        <div class="welcome-title">Welcome to Voyager</div>
        <div class="welcome-subtitle">
            Your AI-powered travel concierge. I can check weather, find attractions,
            search hotels & flights, and craft personalized itineraries — all in one conversation.
        </div>

        <div class="feature-grid">
            <div class="feature-card">
                <div class="feature-icon">🌤️</div>
                <div class="feature-title">Live Weather</div>
                <div class="feature-desc">Real-time conditions & 5-day forecasts for any city worldwide</div>
            </div>
            <div class="feature-card">
                <div class="feature-icon">🗺️</div>
                <div class="feature-title">Discover Places</div>
                <div class="feature-desc">Attractions, restaurants, museums & hidden gems with ratings</div>
            </div>
            <div class="feature-card">
                <div class="feature-icon">🏨</div>
                <div class="feature-title">Hotel Search</div>
                <div class="feature-desc">Find accommodations from budget stays to luxury resorts</div>
            </div>
            <div class="feature-card">
                <div class="feature-icon">✈️</div>
                <div class="feature-title">Flight Deals</div>
                <div class="feature-desc">Compare flights with prices, schedules & stop information</div>
            </div>
        </div>

        <div class="suggestions">
            <div class="suggestion-chip">🗼 Plan a week in Paris</div>
            <div class="suggestion-chip">🌴 Best beaches in Bali</div>
            <div class="suggestion-chip">🏔️ Adventure trips in Switzerland</div>
            <div class="suggestion-chip">🍜 Food tour in Tokyo</div>
            <div class="suggestion-chip">🌆 Weekend in New York</div>
        </div>
    </div>
    """)

# Render chat history
for message in st.session_state.messages:
    with st.chat_message(message["role"], avatar="🧑‍💻" if message["role"] == "user" else "🌍"):
        # Show tool indicators if present
        if message.get("tools_used"):
            tools_html = ""
            for tool_name in message["tools_used"]:
                icon, label = TOOL_DISPLAY.get(tool_name, ("🔧", tool_name))
                tools_html += f'<span class="tool-indicator">{icon} {label}</span> '
            st.html(tools_html)
        st.markdown(message["content"])


# ──────────────────────────────────────────────────────────────────────────────
# Handle Quick Actions
# ──────────────────────────────────────────────────────────────────────────────
quick_action = st.session_state.pop("quick_action", None)


# ──────────────────────────────────────────────────────────────────────────────
# Chat Input & Agent Execution
# ──────────────────────────────────────────────────────────────────────────────
user_input = st.chat_input("Where would you like to go? Ask me anything about travel...")

# Use quick action if available, otherwise use chat input
prompt = quick_action or user_input

if prompt:
    # Augment prompt with preferences context
    pref_context = (
        f"\n[User preferences — Travel style: {st.session_state.travel_style}, "
        f"Budget: {st.session_state.budget}]"
    )

    # Display user message
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user", avatar="🧑‍💻"):
        st.markdown(prompt)

    # Generate response
    with st.chat_message("assistant", avatar="🌍"):
        if st.session_state.agent is None:
            st.error(
                "⚠️ **OpenAI API key is not configured.**\n\n"
                "Please add your `OPENAI_API_KEY` to the `.env` file and restart the app.\n\n"
                "1. Copy `.env.example` to `.env`\n"
                "2. Fill in your API keys\n"
                "3. Restart with `streamlit run app.py`"
            )
            st.session_state.messages.append({
                "role": "assistant",
                "content": "⚠️ OpenAI API key is not configured. Please check the .env file.",
            })
        else:
            # Show typing indicator
            typing_placeholder = st.empty()
            typing_placeholder.markdown(
                '<div class="typing-indicator">'
                '<div class="typing-dot"></div>'
                '<div class="typing-dot"></div>'
                '<div class="typing-dot"></div>'
                '</div>',
                unsafe_allow_html=True,
            )

            try:
                # Build chat history for LangChain
                chat_history = convert_history(st.session_state.messages[:-1])

                # Invoke the agent
                result = st.session_state.agent.invoke({
                    "input": prompt + pref_context,
                    "chat_history": chat_history,
                })

                # Clear typing indicator
                typing_placeholder.empty()

                # Extract tool usage from intermediate steps
                tools_used = []
                intermediate_steps = result.get("intermediate_steps", [])
                for step in intermediate_steps:
                    if hasattr(step[0], "tool"):
                        tool_name = step[0].tool
                        if tool_name not in tools_used:
                            tools_used.append(tool_name)

                # Show tool indicators
                if tools_used:
                    tools_html = ""
                    for tool_name in tools_used:
                        icon, label = TOOL_DISPLAY.get(tool_name, ("🔧", tool_name))
                        tools_html += f'<span class="tool-indicator">{icon} {label}</span> '
                    st.html(tools_html)

                # Display the response
                response = result.get("output", "I apologize, but I couldn't generate a response. Please try again.")
                st.markdown(response)

                # Save to history
                st.session_state.messages.append({
                    "role": "assistant",
                    "content": response,
                    "tools_used": tools_used,
                })

            except Exception as e:
                typing_placeholder.empty()
                error_msg = f"I encountered an issue: {str(e)}. Please try rephrasing your question."
                st.error(error_msg)
                st.session_state.messages.append({
                    "role": "assistant",
                    "content": error_msg,
                })

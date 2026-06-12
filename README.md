# 🌍 Voyager — AI Travel Concierge Agent

An AI-powered travel assistant built with **LangChain**, **Python**, and **Streamlit** that provides personalized travel recommendations through a single, premium conversational interface.

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)
![Streamlit](https://img.shields.io/badge/Streamlit-1.35+-FF4B4B?style=flat-square&logo=streamlit&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-0.2+-1C3C3C?style=flat-square&logo=langchain&logoColor=white)

---

## ✨ Features

| Feature | Description | API |
|---------|-------------|-----|
| 🌤️ **Live Weather** | Current conditions & 5-day forecasts for any city | OpenWeatherMap |
| 🗺️ **Discover Places** | Tourist attractions, restaurants, museums with ratings | Google Places |
| 🏨 **Hotel Search** | Find accommodations from budget to luxury | Amadeus |
| ✈️ **Flight Deals** | Compare flights with prices, schedules & stops | Amadeus |
| 🧠 **Smart Agent** | Context-aware conversation with memory | LangChain + OpenAI |
| 🎨 **Premium UI** | Glassmorphism dark theme with animations | Streamlit |

---

## 🚀 Quick Start

### 1. Clone & Navigate
```bash
cd proooooooooooo
```

### 2. Create Virtual Environment
```bash
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure API Keys
```bash
copy .env.example .env
```

Edit `.env` and add your API keys:
- **OpenAI** (required): [Get key](https://platform.openai.com/api-keys)
- **OpenWeatherMap** (weather): [Free tier](https://openweathermap.org/api)
- **Google Places** (attractions): [Cloud Console](https://console.cloud.google.com/)
- **Amadeus** (hotels/flights): [Developer Portal](https://developers.amadeus.com/)

### 5. Run the App
```bash
streamlit run app.py
```

The app will open at `http://localhost:8501`

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────┐
│            Streamlit UI (app.py)              │
│  ┌────────────────────────────────────────┐   │
│  │     Chat Interface + Sidebar           │   │
│  └──────────────┬─────────────────────────┘   │
│                 │                              │
│  ┌──────────────▼─────────────────────────┐   │
│  │     LangChain Agent (agent.py)         │   │
│  │  ┌─────────┬─────────┬────────────┐    │   │
│  │  │ Weather │ Places  │Hotels/Flts │    │   │
│  │  │  Tool   │  Tool   │   Tool     │    │   │
│  │  └────┬────┴────┬────┴─────┬──────┘    │   │
│  └───────┼─────────┼──────────┼───────────┘   │
└──────────┼─────────┼──────────┼───────────────┘
           ▼         ▼          ▼
     OpenWeather  Google     Amadeus
       Map API   Places API    API
```

---

## 📁 Project Structure

```
├── app.py                 # Streamlit UI (premium dark theme)
├── agent.py               # LangChain agent orchestration
├── config.py              # Environment & API key management
├── utils.py               # IATA codes & utility helpers
├── tools/
│   ├── __init__.py        # Tool exports
│   ├── weather_tool.py    # OpenWeatherMap integration
│   ├── places_tool.py     # Google Places integration
│   └── travel_tool.py     # Amadeus hotels & flights
├── requirements.txt       # Python dependencies
├── .env.example           # API key template
└── README.md              # This file
```

---

## 💬 Example Prompts

Try these to see Voyager in action:

- *"What's the weather like in Tokyo right now?"*
- *"Find me tourist attractions in Paris"*
- *"Search for hotels in London"*
- *"Find flights from JFK to CDG next month"*
- *"Plan a 5-day trip to Barcelona — include weather, places, and hotels"*
- *"I'm looking for a romantic getaway in Italy. Suggestions?"*

---

## 🎨 UI Highlights

- **Glassmorphism** design with translucent panels and blur effects
- **Animated background orbs** that subtly shift and glow
- **Micro-animations** on messages, hover states, and transitions
- **Tool usage badges** showing which APIs were called
- **Typing indicator** animation while the agent processes
- **Dark theme** with carefully curated color palette
- **Custom fonts** (Inter + JetBrains Mono)

---

## 📄 License

This project is for educational and personal use.

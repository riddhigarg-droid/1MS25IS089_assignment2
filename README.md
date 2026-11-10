# NEXUS — ReAct Intelligence AI Agent

<p align="center">
  <img src="https://img.shields.io/badge/Architecture-ReAct%20(Reason%20%2B%20Act)-8B5CF6?style=for-the-badge" alt="ReAct Architecture" />
  <img src="https://img.shields.io/badge/LLM-Google%20Gemini%203.5%20Flash--Lite-3B82F6?style=for-the-badge" alt="Gemini 3.5 Flash-Lite" />
  <img src="https://img.shields.io/badge/Search-Real%20Web%20Search%20(DDGS%20%2F%20Tavily)-06B6D4?style=for-the-badge" alt="Real Web Search" />
  <img src="https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite%20%2B%20Tailwind%20v4-10B981?style=for-the-badge" alt="React Vite" />
  <img src="https://img.shields.io/badge/Backend-FastAPI%20%2B%20Python%203.14-EC4899?style=for-the-badge" alt="FastAPI" />
</p>

---

## 1. Project Overview

**NEXUS — ReAct Intelligence** is a production-grade, full-stack autonomous AI agent web application designed to fulfill **College Assignment 2**:

> *"Deploy a ReAct agent that can reason and Act using a search tool."*

Unlike simple chatbots that hallucinate or merely pretend to browse the web, **NEXUS implements a genuine multi-turn ReAct (Reasoning + Acting) execution loop** driven by **Google Gemini (official `google-genai` SDK)** and a real web search tool (`ddgs` / DuckDuckGo, with zero API key requirement out of the box, plus optional Tavily & Google Serper support).

Every step of the agent's thought process, tool call request, live network retrieval, factual observation, and final synthesis is streamed in real time via **Server-Sent Events (SSE)** and rendered in an animated, interactive execution visualizer.

---

## 2. Live ReAct Cycle Architecture

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Researcher
    participant UI as NEXUS Web UI (React + Vite)
    participant API as FastAPI Backend Controller
    participant Loop as ReAct Agent Loop
    participant LLM as Google Gemini (gemini-3.5-flash-lite)
    participant Search as Web Search Engine (DDGS / Tavily)

    User->>UI: Submits Query ("Compare FastAPI and Flask")
    UI->>API: POST /api/agent/stream (SSE Connection)
    API->>Loop: Initializes ReAct Context (max_iterations=5)
    Loop-->>UI: Event: agent_started

    loop ReAct Multi-Turn Cycle (Until Model Synthesizes or Max Iterations Reached)
        Loop-->>UI: Event: planning (Agent Reasoning)
        Loop->>LLM: generate_content(contents, tools=[web_search])
        LLM-->>Loop: Tool Call Request: web_search(query="FastAPI vs Flask 2026 benchmarks")
        Loop-->>UI: Event: tool_call (Tool Selected)
        Loop-->>UI: Event: tool_started (Searching the Web)

        Loop->>Search: search(query, max_results=5)
        Search-->>Loop: Real Search Results (Title, URL, Snippet, Domain)
        Loop-->>UI: Event: tool_result (Retrieved Results + Latency)

        Loop->>Loop: Format Observation & Ingest Facts
        Loop-->>UI: Event: observation (Feeding results back to Model memory)
        Loop->>LLM: Feed ToolResponse as types.Part.from_function_response
    end

    LLM-->>Loop: Model Synthesizes Final Answer with Citations [1], [2]
    Loop-->>UI: Event: final_answer (Markdown + Verified Citations)
    Loop-->>UI: Event: agent_completed (Execution Complete)
    UI-->>User: Displays Formatted Answer, Citations & Execution Graph
```

---

## 3. Key Features

### Agentic AI & ReAct Execution
- **Explicit ReAct Execution Loop**: The model plans, invokes the `web_search` tool, receives structured observations, and decides whether further iterations are needed.
- **Genuine Tool Calling**: No hardcoded responses, fake searches, or mock latency. Uses Gemini function calling via the official `google-genai` SDK.
- **Multi-Iteration Reasoning**: Supports multi-hop searches (e.g. comparing two distinct entities through separate queries).
- **Iteration Limit Safeguards**: Configurable maximum iterations (1–10) preventing runaway loops, with fallback synthesis.
- **Deduplication & Grounding**: URLs and snippets are tracked, deduplicated, and passed as grounded citations `[1]`, `[2]`.

### User Interface & Experience (SaaS Design)
- **Aesthetic**: Deep charcoal palette (`#090A0F`), soft borders, purple (`#8B5CF6`) and cyan (`#06B6D4`) accents, and glassmorphism.
- **Three-Part Responsive Workspace**:
  1. **Collapsible Sidebar**: Logo, New Chat button, recent conversations, search filter, model indicator, and settings trigger.
  2. **Central Research Workspace**: Hero welcome screen with 4 clickable example prompts, rich Markdown rendering (headers, tables, lists, links, inline code), syntax-highlighted code blocks with copy buttons, and sticky input box with shortcut hints.
  3. **Live Execution Panel**: Vertical animated timeline showing:
     - Query Received
     - Agent Planning & Reasoning
     - Tool Selected (`web_search`)
     - Searching the Web (live query & latency)
     - Search Results Received
     - Observing Results (facts ingested)
     - Final Answer Formulated
     - Structured JSON event stream inspector.
- **Conversation Management**: Full multi-chat persistence, automatic naming, rename chat, delete chat, and clear conversation.
- **Cancellation / Abort**: Instant "Stop" button that interrupts the active SSE stream on both client and backend.

---

## 4. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite 8, TypeScript, Tailwind CSS v4, Framer Motion, Lucide React, React Markdown, Remark GFM |
| **Backend** | Python 3.14 / 3.11+, FastAPI, Uvicorn, Pydantic v2, Pydantic-Settings, SSE-Starlette |
| **AI / LLM** | Google GenAI SDK (`google-genai` >= 3.0.0), Default Model: `gemini-3.5-flash-lite` |
| **Search Engine** | DuckDuckGo (`ddgs` >= 9.16.0, free out-of-the-box), Optional: Tavily AI Search, Google Serper |
| **Testing** | Pytest, Pytest-Asyncio, HTTPX ASGI Transport (10/10 automated tests passing) |

---

## 5. College Assignment 2 Compliance

| Assignment Requirement | Implementation in NEXUS |
|---|---|
| **"Deploy a ReAct agent that can reason and Act using a search tool"** | Fully implemented in `backend/app/agent/loop.py` using explicit Reason -> Act -> Observe -> Synthesize cycles. |
| **1. Receive the user's query** | Validated via `ChatRequest` schema and streamed via `/api/agent/stream`. |
| **2. Let the LLM determine what information is needed** | System prompt instructs Gemini to formulate search queries when factual or external knowledge is needed. |
| **3. Select and invoke an appropriate search tool** | Tool declaration `web_search(query, max_results)` executed in `ToolRegistry` via `ddgs`. |
| **4. Receive and observe the tool's output** | Real titles, URLs, snippets, and domains are fed back to Gemini via `types.Part.from_function_response`. |
| **5. Continue agent loop when additional info is needed** | Loop maintains multi-turn `types.Content` history and repeats if Gemini requests follow-up tool calls. |
| **6. Generate final response based on observations** | Model synthesizes markdown answer with bracketed citations `[1]`, `[2]` linked to retrieved sources. |
| **"Do not simulate searches or fabricate tool execution"** | `backend/app/tools/search_tool.py` connects to live web search (`ddgs` / DuckDuckGo). Verified by automated live network tests. |

---

## 6. Directory Structure

```
1MS25IS089_assignment2/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                     # FastAPI application & SSE routes
│   │   ├── config.py                   # Pydantic BaseSettings environment config
│   │   ├── agent/
│   │   │   ├── controller.py           # Coordinates chat sessions & cancellation
│   │   │   ├── loop.py                 # Core ReAct agent execution loop
│   │   │   └── events.py               # SSE AgentEvent serialization
│   │   ├── llm/
│   │   │   └── gemini_client.py        # Official google-genai SDK wrapper
│   │   ├── tools/
│   │   │   ├── registry.py             # Tool declaration & safe execution
│   │   │   └── search_tool.py          # Real DuckDuckGo / Tavily search tool
│   │   ├── schemas/
│   │   │   ├── agent.py                # EventType, AgentEvent, SearchResultItem
│   │   │   └── chat.py                 # ChatRequest, MessageItem, Conversation
│   │   └── services/
│   │       └── conversation_store.py   # Multi-chat storage & persistence
│   ├── tests/
│   │   ├── test_health.py              # Health check & status tests
│   │   ├── test_search_tool.py         # Live network web search test
│   │   ├── test_tools_validation.py    # Argument validation & error handling
│   │   ├── test_agent_loop.py          # Mocked multi-turn ReAct cycle test
│   │   └── test_e2e_integration.py     # End-to-end SSE pipeline test
│   ├── requirements.txt                # Python backend dependencies
│   ├── .env.example                    # Backend environment template
│   └── run.py                          # Single-command runner
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.tsx             # Collapsible sidebar & conversation list
│   │   │   ├── ChatWorkspace.tsx       # Welcome screen, markdown messages, input
│   │   │   ├── ExecutionPanel.tsx      # Vertical live ReAct timeline visualizer
│   │   │   ├── MessageItem.tsx         # Markdown, code blocks, source badges
│   │   │   ├── SearchCard.tsx          # Verified source chip with external link
│   │   │   └── SettingsModal.tsx       # Key, model, search provider configuration
│   │   ├── hooks/
│   │   │   ├── useAgentStream.ts       # SSE reader & live execution state
│   │   │   └── useConversations.ts     # Conversation management
│   │   ├── services/
│   │   │   └── api.ts                  # REST API client
│   │   ├── types/
│   │   │   └── index.ts                # TypeScript interfaces
│   │   ├── styles/
│   │   │   └── index.css               # Tailwind CSS v4 styling & dark theme
│   │   ├── App.tsx                     # Top-level workspace layout
│   │   └── main.tsx                    # React DOM entry point
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts                  # Vite config with API proxy
│   └── vercel.json                     # Vercel SPA rewrite rules
│
├── vercel.json                         # Root Vercel deployment configuration
├── render.yaml                         # Render backend deployment configuration
├── .env.example                        # Root environment template
└── README.md                           # Documentation
```

---

## 7. Installation & Local Setup

### Prerequisites
- **Python**: Version 3.11 or higher (Tested with Python 3.14)
- **Node.js**: Version 18 or higher (Tested with Node v24)
- **npm**: Version 9 or higher
- **Google Gemini API Key**: Free API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

---

### Step 1: Clone and Set Up Backend

1. Navigate to the project root:
   ```bash
   cd 1MS25IS089_assignment2
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows (PowerShell)
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1

   # macOS / Linux
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. Install backend dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

4. Set up your environment variables:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and add your Gemini API key:
   ```ini
   GEMINI_API_KEY=AIzaSyYourActualKeyHere
   DEFAULT_MODEL=gemini-3.5-flash-lite
   MAX_ITERATIONS=5
   SEARCH_PROVIDER=duckduckgo
   ```
   *(Note: You can also enter or test your Gemini API key directly inside the NEXUS UI Settings panel without editing `.env`!)*

5. Run the backend tests to ensure everything is verified:
   ```bash
   pytest backend/tests -v
   ```
   *(All 10 tests will run and pass).*

6. Start the FastAPI backend server:
   ```bash
   python backend/run.py
   ```
   The backend API will start on **`http://127.0.0.1:8000`**.
   - API Docs: `http://127.0.0.1:8000/docs`
   - Health Check: `http://127.0.0.1:8000/api/health`

---

### Step 2: Set Up and Run Frontend

In a separate terminal window:

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install npm dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

*(Tip: If you run `npm run build` in the frontend, the FastAPI backend will automatically serve the production frontend directly on `http://127.0.0.1:8000` in unified full-stack mode!)*

---

## 8. How to Use the Application

1. **Start a Research Chat**: Click on one of the 4 starter prompt cards on the welcome screen (e.g., *"Compare FastAPI and Flask for production applications"*), or type any question in the prompt input.
2. **Watch the ReAct Cycle Live**:
   - The **Execution Panel** on the right side will automatically activate.
   - You will see the agent enter the **Reasoning** phase.
   - Gemini will request the `web_search` tool with a formulated search query.
   - The backend will perform the search using DuckDuckGo, record latency, and feed real title, URL, snippet, and domain observations back to Gemini.
   - If comparison or further facts are needed, Gemini will execute another cycle.
   - Once sufficient facts are gathered, Gemini will synthesize a complete Markdown report.
3. **Inspect Citations**: Click on any source chip or card to navigate directly to the verified external website.
4. **Inspect Raw Logs**: Switch to the **Raw Log** tab in the execution panel to inspect the exact SSE JSON payloads for college grading verification.
5. **Configure Settings**: Click the gear icon in the sidebar to switch between `gemini-3.5-flash-lite`, `gemini-3.8-flash`, `gemini-2.5-flash`, adjust maximum iterations, or test a new API key.

---

## 9. Deployment Instructions

### Frontend on Vercel
1. Push this repository to GitHub.
2. In Vercel, import the repository.
3. Set the Root Directory to `frontend`.
4. Build Command: `npm run build`.
5. Output Directory: `dist`.
6. Add Environment Variable:
   - `VITE_API_BASE_URL`: `https://your-backend-service.onrender.com`
7. Deploy!

### Backend on Render
1. In Render, select **New Web Service** and link your repository.
2. Root Directory: `.`
3. Environment: `Python 3`
4. Build Command: `pip install -r backend/requirements.txt`
5. Start Command: `python -m uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
6. Add Environment Variables:
   - `GEMINI_API_KEY`: Your Google AI Studio API key
   - `DEFAULT_MODEL`: `gemini-3.5-flash-lite`
   - `SEARCH_PROVIDER`: `duckduckgo`
   - `MAX_ITERATIONS`: `5`
7. Deploy!

---

## 10. Verification & Acceptance Checklist

- [x] **ReAct Agent Loop**: Explicit reasoning, action, tool execution, observation ingestion, and synthesis.
- [x] **Real Tool Calling**: Uses Gemini function calling via the official `google-genai` SDK.
- [x] **Real Search Tool**: Genuine web search via DuckDuckGo (`ddgs`) with real URLs, titles, snippets, and domains.
- [x] **Live SSE Stream**: Real-time events (`agent_started`, `planning`, `tool_call`, `tool_started`, `tool_result`, `observation`, `final_answer`, `agent_completed`).
- [x] **Interactive Execution Visualizer**: Right-hand panel with vertical timeline, latency tracking, and collapsible data.
- [x] **SaaS-Grade UI**: Linear/Vercel/Perplexity dark design language, responsive layout, glassmorphic touches.
- [x] **Conversation Management**: Multiple conversations, renaming, clearing, and persistence.
- [x] **10/10 Automated Tests Passing**: Health check, live network search, tool validation, multi-turn ReAct loop, and E2E SSE stream.
- [x] **No Placeholders**: Production-ready implementation with complete documentation.

---

## 11. Author & Attribution

- **Project**: Assignment 2 — ReAct AI Agent with Search Tool
- **Course**: Advanced Agentic AI Systems / LLM Engineering
- **Student USN**: `1MS25IS089`
- **Application**: NEXUS — ReAct Intelligence

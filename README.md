# LocFlow — AI-Powered Game Localization Assistant with Memory

An AI-powered localization workflow designed to automate Chinese-to-Vietnamese game translation while maintaining consistency through Translation Memory and Glossary management.

---

## 🎥 2-Minute Demo Video
> **[Watch the LocFlow Product Walkthrough on this link:  ]**  
> *A quick video showing file uploads, Translation Memory hits, glossary enforcement, inline editing, sorting, and Excel exports.*

---

## 🚀 Key Features

*   **Translation Memory (TM) Cache**: Local SQLite database automatically indexes and stores verified translations. Duplicate source phrases are instantly bypassed and pre-translated, guaranteeing zero translation redundancy.
*   **Direct Glossary Lookups (Cost Optimization)**: Exact matches for terms in the Glossary database are translated immediately in-memory without calling the Gemini API, bypassing LLM processing time and costs completely.
*   **Structured Gemini 2.5 Flash Translation**: Unmatched strings are grouped into batches of 30 and translated via the official `google-genai` SDK using structured JSON schema schemas. This guarantees a strict 1:1 input/output mapping.
*   **Conditional Auto-Save**: Features a UI toggle to decide whether to auto-commit new AI translations to the TM cache, allowing human review/correction before sealing translations.
*   **Cell Formatting Visual Cues**: Localized target cells translated by the AI are formatted as **bold** in the output sheet for rapid human audits, while TM hits and pre-existing cells preserve their regular font.
*   **Robust Data Management**: 
    *   **Sorting**: Toggle list views between *Newest First* and *Oldest First*.
    *   **Search**: Filter terms instantly by Chinese or Vietnamese keywords.
    *   **Inline Editing**: Correct typos in-place with instant validation.
    *   **Bulk Management**: Checkbox selection for multi-row deletion, complete database clear-all (with confirm pop-ups), and exporting data back to `.xlsx` files.

---

## 🛠 Tech Stack

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Frontend** | React 19 (Vite), Tailwind CSS v4, Lucide Icons | Responsive SPA, drag-and-drop uploads, live previews (via SheetJS). |
| **Backend** | FastAPI (Python), SQLAlchemy | High-performance async API server and background task worker. |
| **Excel Engine**| openpyxl, pandas | Reads multi-sheet Excel files and writes translations in-place with styles. |
| **Database** | SQLite | Serverless local database (fully ready for PostgreSQL deployment). |
| **AI Engine** | Gemini 2.5 Flash | Structured context-aware translation. |

---

## 📂 Project Structure

```text
LocFlow/
├── backend/
│   ├── services/
│   │   ├── excel_service.py   # openpyxl workbook parser and TM lookups
│   │   └── gemini_service.py  # Gemini SDK structured output controller
│   ├── database.py            # SQLite schemas (TM, Glossary, Jobs)
│   ├── main.py                # FastAPI endpoints
│   ├── requirements.txt       # Python dependencies
│   ├── test_backend.py        # Offline pipeline pipeline test
│   └── test_features.py       # API integration tests (sorting, CRUD, clear)
└── frontend/
    ├── src/
    │   ├── components/        # Dashboard, Translate, Glossary, Memory views
    │   ├── App.jsx            # Dark-themed dashboard shell
    │   ├── api.js             # Axios API client
    │   └── index.css          # Tailwind CSS v4 directives
    └── package.json           # Node script settings
```

---

## 💻 Local Installation & Setup

### 1. Prerequisites
Ensure you have python 3.10+ and Node.js 18+ installed on your computer.

### 2. Configure Backend
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create your local configuration file:
   * Copy `.env.example` to `.env`
   * Open `.env` and paste your Gemini API Key from Google AI Studio.
5. Spin up the FastAPI server:
   ```bash
   python main.py
   ```
   *The backend will run on `http://127.0.0.1:8000`. You can inspect the API docs at `http://127.0.0.1:8000/docs`.*

### 3. Configure Frontend
1. Open a new terminal window and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```
   *Open the printed local URL (usually `http://localhost:5173`) in your browser to start localizing!*

---

## 🧪 Running Automated Tests

LocFlow comes with built-in test suites to verify translation logic and API endpoints offline:
*   **Pipeline & Formatting validation**:
    ```bash
    python test_backend.py
    ```
*   **CRUD, Sorting, & Export Integration validation**:
    ```bash
    python test_features.py
    ```

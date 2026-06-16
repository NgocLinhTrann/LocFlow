# Product Analysis: LocFlow

LocFlow is an internal productivity tool designed to automate and accelerate game operations localization from Chinese (zh) to Vietnamese (vi). This document analyzes the workflow challenges, proposed technical solutions, and system constraints.

---

## 1. Problem Statement & Workflow Bottlenecks
Localization of live-operation game content (e.g., event text, item descriptions, system UI announcements) is a continuous, high-volume task. The manual workflow has several bottlenecks:
*   **Repetitive Content**: Game updates often reuse 70-90% of strings from previous updates. Manually re-translating these is inefficient and expensive.
*   **Terminology Inconsistency**: Key game terms (e.g., character titles, items, buttons) must remain consistent. Translating these ad-hoc leads to confusion.
*   **Time-to-Market**: Large Excel sheets (10,000+ rows) are slow to translate manually, delaying event rollouts.

---

## 2. Technical Solution Analysis & Key Enhancements

### A. SQLite Translation Memory (TM) Database & Mutual Exclusivity
*   **Goal**: Eliminate repetitive translation, lower AI API costs, and guarantee database integrity.
*   **Mechanism**: A local SQLite database stores previously translated Chinese-Vietnamese pairs. Before invoking the AI, the engine runs a fast lookup on the source Chinese text.
*   **Data Integrity (Mutual Exclusivity)**: 
    *   *Problem*: Letting a term reside in both the Glossary and the Translation Memory tables creates conflict and ambiguity (which translation should take priority? which is the single source of truth?).
    *   *Solution*: The system enforces **mutual exclusivity**. A term can exist in *either* Glossary or Translation Memory, never both. This is validated on imports and inline updates.
    *   *Self-Learning*: Successful AI translations are written to the database for future reuse *if* the term does not already exist in the Glossary (preserving Glossary as the single source of truth).

### B. Direct Glossary Lookups (Bypassing AI)
*   *Problem*: In early specifications, glossary terms were only injected into the AI translation prompt context. If a row was an exact match of a glossary term, the system still made an LLM call to translate it, which was slow and cost-incurring.
*   *Solution*: The translation engine performs **Direct Glossary Lookups** first. If a Chinese string matches a Glossary `source_term` exactly, it is translated immediately without calling the Gemini API. This is counted as a TM hit and styled as regular font, bypassing LLM processing entirely.

### C. Gemini 2.5 Flash Batch Translation
*   **Rate Limits and Cost Optimization**: Calling the Gemini API row-by-row is inefficient due to connection latency and HTTP rate limits (Requests Per Minute). 
*   **Solution**: Group rows into **batches of 30 segments** and send them in a single LLM request. We enforce **JSON Structured Outputs** (schema validation) to ensure that the AI returns a list of translations that map 1:1 to the inputs.
*   **Glossary Injection**: For terms that are not exact matches, the system scans the batch's source text for any terms present in the `glossary` table. Only matching glossary terms are injected into the prompt context, keeping prompt size small and costs low.

### D. Formatting, Metadata Preservation, and the Auto-Save Toggle
*   **Formatting Visual Cue**: AI-translated cells are marked as **bold** (via `openpyxl` styling) to allow rapid human review. TM hits and Glossary direct matches are kept in regular font since they are already verified translations.
*   **The Auto-Save Choice**: 
    *   *Problem*: Automatically saving all AI translations to the TM database is not always desirable. Sometimes the AI translation requires manual corrections before it is approved for future reuse.
    *   *Solution*: Added a **Save translations to Memory** checkbox in the UI. If checked, the engine populates the TM cache. If unchecked, new translations are written to the output file but skipped from the TM cache, allowing users to modify them manually and import them later.

### E. Management Controls & Usability
*   **Sorting**: Supports sorting by Newest First (default, to check recently added words) and Oldest First.
*   **Inline Editing**: Resolves the bottleneck of having to delete and re-import a term to fix a typo. Allows editing source/target fields directly in the table row.
*   **Bulk Actions & Exports**: Enables quick database resets via **Delete All** (with popup confirmations) and sharing glossary sheets via **Export Excel**.

---

## 3. Tech Stack Suitability Matrix

| Component | Technology | Why Selected |
| :--- | :--- | :--- |
| **Frontend** | React (Vite) + Tailwind CSS v4 | Starts instantly, lightweight, responsive dashboard with Tailwind components. |
| **Backend** | FastAPI (Python) | High speed, native background tasks runner (async friendly), automatically generates interactive documentation (`/docs`). |
| **Excel Parser** | `openpyxl` & `pandas` | Excellent cell-level formatting (bolding), multi-sheet support, and clean data frame manipulation. |
| **Database** | SQLite | Serverless, stored in a single file (`locflow.db`), zero configuration, high performance for key lookups. |
| **AI Engine** | Gemini 2.5 Flash | Large context window, fast, highly cost-effective Chinese-to-Vietnamese translation. |

---

## 4. Risks & Mitigations

*   **Risk**: AI output misalignment (e.g., AI translates 10 items but returns 9, shifting the rows).
    *   *Mitigation*: Enforce Structured JSON schemas (List of dicts containing `id`, `source`, `translation`) so the API returns a structured response matching the exact input order.
*   **Risk**: Background process timeouts during massive file uploads.
    *   *Mitigation*: Process files using FastAPI's `BackgroundTasks` thread pool. The client queries the job status endpoint periodically (polling) to check status without maintaining an active HTTP connection.
*   **Risk**: Excel styling corruption.
    *   *Mitigation*: Modify target cells in-place on the existing worksheets rather than creating a new file from scratch.

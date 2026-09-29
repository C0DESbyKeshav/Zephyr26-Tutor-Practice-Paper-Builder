# ⚡ Antigravity — Tutor Practice Paper Builder

> **High-Performance, Zero-Wait Practice Paper Generator & Tinder-for-Grading Web Application for Private Tutors**
> 
> *Optimized for the Critical 10-Minute Classroom Window • Local-First Architecture • Clean Light Mode Aesthetic*

---

## ⚡ Quick Start for Evaluators

Run the application locally in under 60 seconds:

```bash
# 1. Clone or open the repository directory
cd Zephyr

# 2. Install dependencies
npm install

# 3. Start the Vite development server
npm run dev

# 4. Open in browser
# Navigate to: http://localhost:5173
```

> 💡 **Demo Evaluator Tip:** Tap the **"Reset Seed"** button in the top navigation bar at any time to instantly restore the 15 authentic demo students, test papers, and analytics to their clean initial state.

To test production build integrity:
```bash
npm run build
# Compiles with 0 TypeScript errors and builds the production bundle
```

---

## 🎯 The Problem Statement & Persona

### The Target Persona
Independent Private Tutors. They typically teach ~15 students across different grades and competitive syllabus boards (IB DP Math AA, Cambridge IGCSE, AP Calculus BC, CBSE, A-Level Physics), working back-to-back throughout the day.

### The Critical Constraint: "The 10-Minute Window"
Tutors have exactly 10 minutes between back-to-back classes. In this window, they must:
1. **Grade** the previous student's paper.
2. **Review** the student's mastery analytics and pinpoint forgotten topics.
3. **Generate & print/send** a hyper-personalized new practice paper for the upcoming class.

### Product Philosophy: "Antigravity"
* **Zero Loading Spinners:** The app never blocks the user while waiting for network requests.
* **Local-First Execution:** All reads and writes hit the local database immediately (0ms latency).
* **One-Handed Speed:** Tinder-for-Grading interface allows tutors to grade a 10-question paper in under 60 seconds with one hand while walking between classrooms.
* **Organized Light Theme:** Crisp, executive design with high-contrast typography, clean cards, and intuitive visual hierarchy.

---

## 🏛️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TUTOR'S WEB CLIENT                              │
│  - Clean Light Theme (#F8FAFC / #FFFFFF)                              │
│  - Zero Loading Spinners (100% Optimistic Local-First Execution)       │
│                                                                        │
│  ┌───────────────────────┐ ┌───────────────────┐ ┌───────────────────┐ │
│  │ Flow A: Glance Dash   │ │ Flow B: Zen Grade │ │ Flow C: Radar &   │ │
│  │ - 15-Student Timeline │ │ - Tinder-Grade 60s│ │   Paper Tweaker   │ │
│  │ - 🔴 / 🟢 Status Dots │ │ - Undo Stack (5)  │ │ - Hexagon Radar   │ │
│  │ - 10-Min Window Ticker│ │ - Confetti Celeb  │ │ - 0-Wait Q-Swap   │ │
│  │ - "Prep Papers" FAB   │ │ - Slider Dial     │ │ - Printable Sheet │ │
│  └───────────────────────┘ └───────────────────┘ └───────────────────┘ │
│                               ▲                                        │
│                 Synchronous Reactive Observable                        │
│                               ▼                                        │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                   LOCAL-FIRST DB (SQLite / Local)                 │ │
│  │  Students • Topics • Papers • Questions • Results • Sync Queue    │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Background Sync (NetInfo / Online)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        SUPABASE POSTGRESQL & EDGE                      │
│                                                                        │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │  PostgreSQL + Triggers  │  │  Edge Functions (Deno / TypeScript) │  │
│  │  - EWMA Topic Mastery   │  │  - generate-paper (Zod + OpenAI/Son)│  │
│  │  - 30-Day Decay Penalty │  │  - prep-todays-papers (pgmq queue)  │  │
│  │  - Tomorrow's Paper Auto│  │  - sync-engine (push/pull protocol) │  │
│  └─────────────────────────┘  └─────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📱 Detailed Flow-by-Flow Solutions

### Flow A: The "Glance" Dashboard
* **What does the tutor need to do right now?**
* **10-Minute Classroom Window Urgency Widget:** A prominent live countdown timer (e.g., `07:48`) letting the tutor know exactly how much time remains before the next class begins.
* **Chronological Timeline of 15 Students:** A vertical timeline mapping out the tutor's entire teaching schedule (08:30 AM to 07:30 PM).
* **Visual Status Indicators:**
  * 🔴 **Red Dot:** Paper waiting for grading. Features an instant **"⚡ Zen Grade (10 Qs)"** button.
  * 🟢 **Green Dot:** Next paper is prepared and ready for class.
* **Weak Topic Warning Chips:** Shows intervention alerts on student cards (e.g., `⚠️ Needs Intervention: Taylor Series (48%)`).
* **Floating Action Button (FAB): "Prep Today's Papers":** Tapping this button instantly enqueues generation for any student missing a paper via background edge workers without blocking the UI.

### Flow B: Zen Grading Mode (Tinder-for-Grading)
* **Goal: Grade a 10-question paper in under 60 seconds with one hand.**
* **Swipe Gestures & Touch Controls:**
  * **Swipe Right (> 100px) or Green Button:** Awards **Full Marks** (+Max) with emerald badge stamp.
  * **Swipe Left (< -100px) or Red Button:** Awards **Zero Marks** (0) with rose badge stamp.
  * **Long Press / Sliders Button:** Reveals a precision slider (0 to Max in 0.5 increments) to award partial marks.
* **AI Marking Scheme & Answer Key:** Collapsible step-by-step breakdown (e.g., `M1: Method mark`, `A1: Accuracy mark`) generated by the LLM.
* **Edge Case 2 Solution (Undo Stack):** Circular buffer storing the last 5 swipe actions. Tapping the persistent **"Rewind"** button in the top-left reverses the card animation and rolls back the local database entry.
* **Celebration Screen:** Upon grading the last card, the UI instantly explodes with confetti, displays speed statistics (`"10 questions graded in 38s!"`), calculates EWMA mastery improvement deltas, and shows the *"Zero-Wait Async Trigger: Tomorrow's Paper Generated"* banner.

### Flow C: Student Radar & Paper Tweaker
* **Hexagon / Spider Radar Chart:** Visualizes mastery across 6 core syllabus topics using custom SVG polygon math.
  * **60% Intervention Threshold:** Highlighted with a dashed red line.
  * **Decay Indicator:** Topics not tested in over 30 days show clock badges and `-10%` decay warnings.
  * **Interactive Nodes:** Clicking any node reveals detailed topic history.
* **Zero-Wait Paper Tweaker:**
  * Displays the upcoming paper's 10 questions.
  * **Dislike a question?** Click **"⚡ Swap"** or swipe left on the item: the UI **instantly swaps** it with a pre-fetched alternate question from the local DB. **Zero loading spinners, 0ms latency.**
* **Print Practice Paper Modal:** Generates a clean, formatted printable practice paper handout with student name, syllabus, target exam, instructions, question points, and lined workspace for immediate classroom printing.

---

## 🧠 Core Algorithms & Mathematical Formulas

### 1. The "Decay" Analytics Engine (EWMA)
Implemented in [`src/services/analyticsEngine.ts`](file:///c:/Users/waghe/Downloads/Zephyr/src/services/analyticsEngine.ts) and PostgreSQL triggers:
$$\text{Mastery}_{\text{current}} = (0.70 \times \text{Latest Score \%}) + (0.30 \times \text{Mastery}_{\text{previous}})$$

* **Time Penalty:** If $\text{Date.now}() - \text{last\_tested\_at} > 30\text{ days}$, apply a **-10% penalty** to the mastery score. This forces the tutor to periodically re-test forgotten topics.
* **Intervention Threshold:** Any topic $< 60\%$ is flagged as `"Needs Intervention"`.

### 2. Pedagogical AI Generation Pipeline
Implemented in [`supabase/functions/generate-paper/index.ts`](file:///c:/Users/waghe/Downloads/Zephyr/supabase/functions/generate-paper/index.ts):
* **Context Gathering:** Queries the database for the student's top 3 weakest topics ($<60\%$) and 2 strong topics.
* **Distribution Constraints:**
  * **60% of questions** (6 core questions + 2 alternates) target **Weak Topics** (Difficulty strictly locked to **1–2 out of 5**).
  * **40% of questions** (4 core questions + 1 alternate) target **Strong Topics** (Difficulty set to **4–5 out of 5** for challenge).
* **Pre-fetched Alternates:** Pre-generates 2–3 alternate questions per paper so the tutor can swap questions with 0ms latency.
* **Zod Structured Output:** Validates question text, difficulty, max marks, answer key, and step-by-step marking schemes (`M1`, `A1`).

### 3. The Zero-Wait Async Strategy
* **The app generates tomorrow's paper today.**
* When a tutor finishes grading a paper, WatermelonDB/LocalDB syncs results to Supabase.
* A PostgreSQL trigger detects new results, updates EWMA mastery, and immediately fires the AI Edge Function to generate the next paper.
* The next time the tutor opens the app, tomorrow's paper is already cached locally.

---

## 🛡️ Edge Cases & Architected Solutions

| Edge Case | Failure Mode | Architected Solution |
| :--- | :--- | :--- |
| **Edge Case 1: Dead Wi-Fi in School Building** | Tutor cannot grade or view papers because Wi-Fi is dead | All read/write operations execute against [`LocalDatabase`](file:///c:/Users/waghe/Downloads/Zephyr/src/database/localDb.ts). Mutations queue locally and push to Supabase via NetInfo/online listeners when connection is restored. |
| **Edge Case 2: Accidental Swipes in Zen Mode** | Tutor accidentally swipes left (0 marks), ruining analytics | Circular buffer [`UndoStack`](file:///c:/Users/waghe/Downloads/Zephyr/src/services/undoStack.ts) storing last 5 actions. Persistent **"Rewind"** icon reverses card state and rolls back local database entries. |
| **Edge Case 3: AI Hallucinates Non-Syllabus Topics** | LLM generates calculus for 5th graders or invents fake topics | Strict array of allowed syllabus topics injected in prompt. Post-generation maps topic strings back to database UUIDs; invalid topics are discarded and recursively retried up to 2 times. |
| **Edge Case 4: 15-Student Batch Timeouts** | Tutor taps "Prep Today's Papers" for 15 students at once | [`prep-todays-papers`](file:///c:/Users/waghe/Downloads/Zephyr/supabase/functions/prep-todays-papers/index.ts) acts as a webhook queue dispatcher pushing 15 isolated background jobs into `generation_queue` (pgmq pattern), preventing serverless timeouts. |

---

## 📂 Project Structure

```
Zephyr/
├── public/                     # Static assets & favicon
├── src/
│   ├── components/
│   │   ├── GlanceDashboard.tsx    # Flow A: 15-Student Timeline & FAB
│   │   ├── ZenGradingScreen.tsx   # Flow B: Tinder-for-Grading & Undo Stack
│   │   ├── StudentRadarScreen.tsx # Flow C: Hexagon Radar & Paper Tweaker
│   │   ├── RadarChart.tsx         # Custom SVG Hexagon/Spider Radar Chart
│   │   ├── OfflinePill.tsx        # Sync Status Pill & Reset Seed Trigger
│   │   └── PaperPrintModal.tsx    # Clean Printable Practice Paper Preview
│   ├── database/
│   │   ├── schema.ts              # WatermelonDB Table Schema & Indices
│   │   ├── localDb.ts             # Local-First Optimistic Database Engine
│   │   └── seedData.ts            # 15 Authentic Students, Papers & Questions
│   ├── services/
│   │   ├── analyticsEngine.ts     # EWMA Mastery & 30-Day Time Decay
│   │   ├── undoStack.ts           # Circular Buffer (Capacity 5) for Rewind
│   │   └── supabaseClient.ts      # Supabase Client & Background Sync
│   ├── styles/
│   │   └── index.css              # Clean Light Mode Theme & Animations
│   ├── types/
│   │   └── index.ts               # Core TypeScript Domain Types
│   ├── App.tsx                    # Root Application & Seamless Routing
│   └── main.tsx                   # React 19 Entrypoint
├── supabase/
│   ├── migrations/
│   │   └── 20260929_init_schema.sql # PostgreSQL Tables, Triggers & EWMA
│   └── functions/
│       ├── _shared/types.ts         # Zod Schema for Structured Outputs
│       ├── generate-paper/index.ts  # AI Generation Edge Function (gpt-4o)
│       ├── prep-todays-papers/index.ts # Edge Case 4 Batch Queue Dispatcher
│       └── sync-engine/index.ts     # Bidirectional Push/Pull Sync Endpoint
├── .gitignore                  # Comprehensive Git Ignore
├── package.json                # Project Dependencies & Scripts
├── tsconfig.json               # TypeScript Configuration
└── vite.config.ts              # Vite 8 Build Configuration
```

---

## 🧪 Verification & Testing Checklist

- [x] **0 TypeScript Errors:** `npm run build` executes cleanly (`tsc -b && vite build`).
- [x] **Light Mode Redesign:** Clean white and light slate palette with high contrast and zero clutter.
- [x] **Glance Dashboard:** 15 students sorted chronologically with live 10-minute countdown clock.
- [x] **Zen Grading Mode:** Swipe right for full marks, swipe left for zero marks, partial marks slider, and confetti celebration.
- [x] **Undo Stack (Rewind):** Circular buffer restoring previous cards and rolling back local database entries.
- [x] **Hexagon Spider Radar:** Custom SVG rendering 6 topics with a 60% dashed intervention threshold line and 30-day time decay penalty warnings.
- [x] **Zero-Wait Paper Tweaker:** Instant swapping of questions with pre-fetched alternates from the local database.
- [x] **Printable Practice Paper:** Formatted student examination sheet ready for PDF or physical print.
- [x] **Evaluator Reset Seed:** One-click reset in the top header to return to clean demo data at any time.

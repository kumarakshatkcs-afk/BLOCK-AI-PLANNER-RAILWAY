# System Architecture Document

## Indian Railways AI Block Planner & Asset Availability Optimizer

---

## 1. Architectural Overview & Design Philosophy

The **Railway AI Block Planner** is designed as a mission-critical railway decision-support and dispatching optimization platform. Its core objective is to maximize infrastructure asset availability while upholding the stringent safety regulations of Indian Railways (IR).

### Core Problem Solved
Traditional rail infrastructure maintenance is managed independently by three technical branches:
- **P-Way (Permanent Way / Civil Engineering)**: Ballast tamping, rail weld inspection, switch renewals.
- **S&T (Signal & Telecommunication)**: Point machine servicing, track circuit testing, electronic interlocking validations.
- **Traction (Electrical OHE)**: Overhead wire tensioning, insulator maintenance, bracket adjustments.

Historically, each department petitioned the Section Controller for isolated time windows (traffic/power blocks). This resulted in:
1. Repeated closures of the same line section on different days.
2. Under-utilized track possessions.
3. Severe cascading delay propagation to high-priority trains (*Vande Bharat*, *Rajdhani*, *Superfast*, and freight rakes).

### Architectural Solution
The system employs **simultaneous multi-department shadow block bundling**, synchronizing all three departments into a single, optimized block window. A multi-layer architecture decouples real-time network telemetry, timetable conflict analysis, mathematical priority scoring, explainable AI, and official human controller approval workflows.

---

## 2. High-Level System Architecture Diagram

```
+---------------------------------------------------------------------------------------+
|                                    CLIENT TIER                                        |
|                               (React 19 + TypeScript)                                 |
|                                                                                       |
|  +---------------------------------------------------------------------------------+  |
|  |                           Unified Workflow Navigation                           |  |
|  |  1. Intake  ->  2. Scoring  ->  3. Gantt Planner  ->  4. Conflicts  ->         |  |
|  |  5. Corridor Schematic  ->  6. What-If & Official Sanction Approval            |  |
|  +---------------------------------------------------------------------------------+  |
|                                                                                       |
|  +------------------------+  +------------------------+  +-------------------------+  |
|  |  Multi-Dept Intake     |  |   AI Gantt Timeline    |  |    Network Map (D3)     |  |
|  |  - Civil (P-Way)       |  |   - Shadow Block View  |  |    - Geographic GIS     |  |
|  |  - Signal & Telecom    |  |   - Train Path Overlap |  |    - Station Yard Inter- |  |
|  |  - Traction (OHE)      |  |   - Dynamic Bundling   |  |      locking Schematic  |  |
|  +------------------------+  +------------------------+  +-------------------------+  |
|                                                                                       |
|  +------------------------+  +------------------------+  +-------------------------+  |
|  |  Bilingual Voice Agent |  |  Where Is My Train     |  |   Conflict & What-If    |  |
|  |  - Hindi Speech Synth  |  |  - NTES Spot Report    |  |   - Headway Clash Det.  |  |
|  |  - Controller Dispatch |  |  - Live Station Telemetry| - Emergency Reroute    |  |
|  +------------------------+  +------------------------+  +-------------------------+  |
+-------------------------------------------+-------------------------------------------+
                                            |
                                            | REST API & Real-Time Polling (JSON)
                                            v
+---------------------------------------------------------------------------------------+
|                                  APPLICATION TIER                                     |
|                               (Express.js + Node.js)                                  |
|                                                                                       |
|  +---------------------------------------------------------------------------------+  |
|  |                              API Gateway & Router                               |  |
|  |  /api/block-planner/*  |  /api/delays/*  |  /api/ntes/*  |  /api/data            |  |
|  +---------------------------------------------------------------------------------+  |
|                                                                                       |
|  +---------------------------+  +----------------------------+  +------------------+  |
|  | Multi-Attribute Scoring   |  | Conflict Detection Engine  |  | Dynamic What-If  |  |
|  | - Severity (30%)          |  | - Section Headway Analysis |  |   Re-Optimizer   |  |
|  | - Asset Criticality (25%) |  | - Precedence Arbitration   |  | - Disruption Eval|  |
|  | - Urgency/Overdue (20%)   |  | - Siding Loop Allocation   |  | - Alternative Slot|  |
|  | - Safety Risk (15%)       |  |                            |  |   Rankings       |  |
|  | - Traffic Impact (10%)    |  |                            |  |                  |  |
|  +---------------------------+  +----------------------------+  +------------------+  |
|                                                                                       |
|  +---------------------------+  +----------------------------+  +------------------+  |
|  | Telemetry Simulation      |  | Electronic Interlocking    |  | Official Sanction|  |
|  | - Train Kinematics        |  | - Route Locking & Aspects  |  |   Memo Engine    |  |
|  | - Speed States (Cruising/ |  | - Platform Berthing Phases |  | - TSR Generation |  |
|  |   Caution/Berthing)       |  | - Track Circuit Occupancy  |  | - Memo Id Number |  |
|  +---------------------------+  +----------------------------+  +------------------+  |
+-------------------------------------------+-------------------------------------------+
                                            |
                                            | Server-Side SDK Calls
                                            v
+---------------------------------------------------------------------------------------+
|                                 INTELLIGENCE TIER                                     |
|                              (Google Gemini API 2.5)                                  |
|                                                                                       |
|  +----------------------------------------+  +-------------------------------------+  |
|  | Explainable AI (XAI) Priority Engine   |  | Bilingual Voice Synthesis Agent     |  |
|  | - Technical Engineering Justifications |  | - Authentic Indian Railways Style   |  |
|  | - Safety Standards Contextualization   |  | - Hindi (Devanagari) & English      |  |
|  +----------------------------------------+  +-------------------------------------+  |
+---------------------------------------------------------------------------------------+
```

---

## 3. Detailed Component Decomposition

### 3.1 Presentation Layer (Frontend)
Built with **React 19**, **TypeScript**, and **Tailwind CSS v4**, structured around domain-specific functional modules:

1. **`UnifiedWorkflowNav.tsx`**:
   - Manages the 6-stage lifecycle breadcrumb:
     - `intake` $\rightarrow$ `priority` $\rightarrow$ `gantt` $\rightarrow$ `conflicts` $\rightarrow$ `corridor` $\rightarrow$ `approval`.
   - Tracks stage progress and completion status.

2. **`IntegratedMaintenanceIntake.tsx`**:
   - Captures defect reports across Civil Engineering, S&T, and Electrical Traction.
   - Allows instant defect submission with asset identification, severity classification, expected duration, and corridor selection.

3. **`AIPriorityScoringView.tsx`**:
   - Presents the multi-factor weighted breakdown for each asset.
   - Displays real-time Explainable AI (XAI) rationale fetched from Gemini AI.

4. **`MainAIBlockPlannerGantt.tsx`**:
   - Visualizes scheduled train corridors and simultaneous departmental shadow blocks along an interactive time axis (08:00 to 18:00).
   - Highlights efficiency metrics: block utilization percentage ($92\%+$), downtime reduction ($28\%-31\%$), and train conflict count ($0$).

5. **`ConflictDetectionView.tsx`**:
   - Compares candidate block windows against train paths.
   - Categorizes alternatives into *AI Recommended*, *Feasible*, and *Clash/Unavailable* with associated safety and delay scores.

6. **`CorridorMapSchematic.tsx` & `NetworkMap.tsx`**:
   - **Schematic View**: Focused corridor visualization showing track health, active Temporary Speed Restrictions (TSRs / Caution Orders), and next scheduled train passages.
   - **Network Map**: D3.js topological map rendering SECR and SER divisions (Bilaspur, Raipur, Nagpur, Chakradharpur, Adra) with live train positions, block sections, and station yards.

7. **`StationYardModal.tsx`**:
   - Renders individual platform lines, electronic interlocking status, signals (Green, Yellow, Red), and track circuit occupancy.

8. **`WhatIfSimulationView.tsx`**:
   - Interactive sandbox for testing operational disruptions:
     - Target block window becomes unavailable due to an emergency train.
     - Severe weather speeds restrictions.
   - Animates real-time recalculation of optimal replacement slots.

9. **`HumanApprovalView.tsx`**:
   - Section Controller and Sr. DOM decision terminal.
   - Generates official sanction memo numbers, logs caution order parameters, and locks the plan into operational execution.

10. **`AIVoiceAgentPanel.tsx` & `AiCopilot.tsx`**:
    - Provides spoken audio announcements in Hindi and English.
    - Diagnoses root causes of delays and offers automated one-click delay clearing.

---

### 3.2 Application & Service Layer (Backend)
Built on **Express.js** running in Node.js, providing deterministic rule execution alongside AI synthesis:

1. **REST API Endpoints**:
   - `/api/block-planner/requests`: Maintenance ticket retrieval, filtering, and automated priority generation.
   - `/api/block-planner/explain-priority`: AI-driven explainability proxying to Google Gemini.
   - `/api/block-planner/gantt`: Gantt timeline items and shadow block definitions.
   - `/api/block-planner/conflicts`: Conflict detection results and scored alternative windows.
   - `/api/block-planner/corridors`: Corridor summaries, asset health, and caution notices.
   - `/api/block-planner/what-if`: Simulation engine for unexpected operational disruptions.
   - `/api/block-planner/approve`: Sanction memo issuance and plan status locking.
   - `/api/delays/*`: Train-by-train delay diagnostic reports and automated network-wide resolution.
   - `/api/where-is-my-train/*`: Live train tracking and stop timeline feed.
   - `/api/ntes/*`: Pacing and live station reports emulating CRIS/NTES architectures.

2. **Vite Development Middleware**:
   - In development mode (`NODE_ENV !== "production"`), Vite middleware is mounted directly on Express, enabling unified full-stack hosting on port 3000.
   - In production, Express statically serves the pre-compiled `dist/` directory.

---

## 4. Algorithmic Specifications & Domain Models

### 4.1 Multi-Attribute Utility Priority Scoring Algorithm
For any logged maintenance request $R_i$, the composite Priority Score $P(R_i) \in [0, 100]$ is computed using a weighted linear combination of five normalized sub-metrics:

$$P(R_i) = w_{sev} \cdot S_{sev} + w_{crit} \cdot S_{crit} + w_{urg} \cdot S_{urg} + w_{safe} \cdot S_{safe} + w_{traf} \cdot S_{traf}$$

Where:
- $w_{sev} = 0.30$ (Defect Severity)
- $w_{crit} = 0.25$ (Asset Criticality)
- $w_{urg} = 0.20$ (Urgency & Overdue State)
- $w_{safe} = 0.15$ (Safety / Derailment Risk)
- $w_{traf} = 0.10$ (Traffic & Headway Disruption Potential)

$$\sum w = 1.00$$

**Score Interpretation & Policy Action**:
- $P(R_i) \ge 85$: **CRITICAL** $\rightarrow$ Mandatory inclusion in immediate shadow block window.
- $70 \le P(R_i) < 85$: **HIGH** $\rightarrow$ Bundle with co-located track block within 24 hours.
- $50 \le P(R_i) < 70$: **MEDIUM** $\rightarrow$ Schedule in planned weekly corridor maintenance.
- $P(R_i) < 50$: **LOW** $\rightarrow$ Defer to routine cyclical inspection.

---

### 4.2 Simultaneous Multi-Department Shadow Block Bundling
Given a set of pending maintenance items $\mathcal{M} = \{m_1, m_2, \dots, m_k\}$ requiring track possession along corridor section $C$, let:
- $d_{Eng}(C)$ be the duration required by Civil Engineering (P-Way).
- $d_{ST}(C)$ be the duration required by Signal & Telecom.
- $d_{Trac}(C)$ be the duration required by Electrical Traction (OHE).

**Without Shadow Bundling (Fragmented Sequential Blocks)**:
$$\text{Total Line Closure Time} = d_{Eng}(C) + d_{ST}(C) + d_{Trac}(C)$$

**With AI Shadow Bundling**:
$$\text{Total Line Closure Time} = \max\Big(d_{Eng}(C), \, d_{ST}(C), \, d_{Trac}(C)\Big) + \delta_{safety}$$

Where $\delta_{safety}$ is the safety clearance buffer (typically 15 minutes for OHE discharge and P-Way track clearance certification).

**Downtime Reduction**:
$$\Delta \text{Downtime} = \frac{\sum d - \big(\max(d) + \delta_{safety}\big)}{\sum d} \times 100\% \approx 28\% - 31\%$$

---

### 4.3 Section Headway & Precedence Conflict Detection
Let $T = \{t_1, t_2, \dots, t_n\}$ be the set of scheduled trains operating across corridor $C$. For a candidate block window $W = [t_{start}, t_{end}]$:

1. **Intersection Check**:
   $$\forall t_j \in T, \quad \text{Occupancy}(t_j, C) \cap W \neq \emptyset \implies \text{Conflict Identified}$$

2. **Precedence Rules**:
   - **Vande Bharat & Rajdhani (Category 1)**: Zero delay tolerance. The candidate block window must be rejected or the block must be scheduled in a shadow gap between successive high-speed paths.
   - **Express / Superfast (Category 2)**: Feasible if rerouted via loop lines or with speed regulation within headway limits.
   - **Freight (Category 3)**: Eligible for siding regulation or bypass loop detention during the block window.

3. **Alternative Slot Scoring**:
   Alternative windows $W_{alt}$ are evaluated across:
   - Safety Score ($0-100$)
   - Block Window Utilization ($0-100$)
   - Delay Prevention & Punctuality Index ($0-100$)

---

### 4.4 Dynamic What-If Re-Optimization Engine
When an active or proposed block window becomes unavailable (due to an unscheduled VIP train, accident relief train, or emergency line hold):
1. **Cancellation Trigger**: The system invalidates the current window.
2. **Timetable Headway Scan**: The engine scans forward $\pm 6$ hours in 15-minute increments against the updated train graph.
3. **Multi-Department Re-Bundling**: Verifies crew availability for all 3 departments during prospective alternative windows.
4. **Optimal Candidate Selection**: Ranks candidate slots using composite score:
   $$\text{Score}(W_k) = 0.4 \cdot \text{Safety} + 0.3 \cdot \text{Utilization} + 0.3 \cdot (100 - \text{TrainDelay})$$
5. **Presentation**: Highlights the top recommended alternative (e.g., 12:30–14:30) with clear justification for the controller.

---

## 5. Intelligence Tier & Gemini AI Integration

### 5.1 Explainable AI (XAI) Architecture
The system integrates `@google/genai` to convert numerical scores and domain constraints into human-readable engineering justifications for railway officials.

- **Prompt Construction**: Grounded in Indian Railways operating safety standards, asset types, failure modes, and inter-departmental dependencies.
- **Model Target**: Gemini 2.5 / Flash models for fast, deterministic response generation.
- **Graceful Fallback**: If `GEMINI_API_KEY` is not present or an upstream network timeout occurs, a rule-based deterministic fallback engine provides formatted engineering explanations without disrupting user operations.

### 5.2 Bilingual AI Voice Dispatch Engine
The voice agent provides operational situational awareness:
- **Hindi (भारतीय रेलवे उद्घोषणा शैली)**: Generates authentic station-style announcements using formal Hindi rail terminology (e.g., *ब्लॉक सेक्शन*, *इलेक्ट्रॉनिक इंटरलॉकिंग*, *ग्रीन वेव कॉरिडोर*, *कॉशन ऑर्डर*).
- **English**: Concise, authoritative dispatch briefings for control room personnel.
- **Speech Synthesis**: Synthesized client-side via the browser's native `window.speechSynthesis` Web Speech API.

---

## 6. Safety, Governance & Regulatory Compliance

### 6.1 Human-in-the-Loop Authority
In strict compliance with Indian Railways General & Subsidiary Rules (G&SR):
- The AI system **advises and optimizes**; it **never autonomously executes line blocks**.
- All block sanctions require positive authorization by the Section Controller or Senior Divisional Operations Manager (Sr. DOM).
- Official Sanction Memos are stamped with a unique alphanumeric reference (e.g., `IR/SANCTION/819231`), timestamp, authorizer name, and specific operating stipulations.

### 6.2 Temporary Speed Restrictions (TSR) & Caution Notices
Following heavy track or OHE work, tracks require a settling period. The system automatically attaches prescribed Caution Orders:
- e.g., *"TSR 30 km/h caution notice on UP Main at Km 142/8, removed upon joint completion memo."*

---

## 7. Data Lifecycle & State Synchronization

```
+-----------------------------------------------------------------------------------+
|                              Data Synchronization Flow                            |
+-----------------------------------------------------------------------------------+
  1. Intake Form Submitted (Client)
     |
     v
  2. POST /api/block-planner/requests
     |--> Automated multi-attribute priority score computation (0-100)
     |--> Initial recommendation badge assignment
     |--> Stored in server memory / database
     v
  3. POST /api/block-planner/explain-priority
     |--> Prompt constructed with scores & engineering context
     |--> Gemini AI evaluates safety risk, regulations, and bundling benefits
     |--> Explainable XAI text returned to client
     v
  4. Periodic Telemetry Heartbeat (1500ms polling)
     |--> GET /api/data & GET /api/delays/report
     |--> Train kinematics updated; delay cascades recalculated
     v
  5. What-If Disruption Triggered
     |--> POST /api/block-planner/what-if
     |--> Engine recalculates feasible slot options against live train timetable
     |--> Optimal replacement slot presented with ranking
     v
  6. Official Approval
     |--> POST /api/block-planner/approve
     |--> Sanction memo generated; tasks marked "Scheduled"; TSR generated
+-----------------------------------------------------------------------------------+
```

---

## 8. Performance & Scalability Considerations

1. **Client-Side Rendering Optimization**:
   - D3.js SVG canvas uses optimized DOM node reuse and requestAnimationFrame pacing.
   - Recharts visualizers use memoized data selectors to prevent redundant re-renders.
2. **Server Bundling**:
   - Backend `server.ts` is compiled into a single CommonJS bundle (`dist/server.cjs`) via `esbuild`, resolving all relative imports at build time and ensuring rapid container startup on Google Cloud Run.
3. **Decoupled Telemetry Pacing**:
   - The NTES emulation engine uses controlled step intervals and speed dampening (0.35x realistic pacing) to mirror actual railway control room dashboards without overwhelming network bandwidth.

# 🛡️ MPLAD SENTINEL — AI-Powered MPLADS Risk Intelligence Platform

> **Smart India Hackathon 2026 Prototype**  
> **Problem Statement ID:** PS 26102  
> **Problem Title:** Development of an AI-powered system to detect anomalies, fraud, and inefficiencies in MPLAD Scheme implementation.  
> **System Category:** Decision-Support System & Multi-Signal Risk Intelligence Platform  
> **Operating Philosophy:** `DETECT → ASSESS → EXPLAIN → PRIORITIZE → INVESTIGATE`

---

## 🌟 Executive Overview

**MPLAD SENTINEL** is an enterprise-grade risk intelligence and governance decision-support platform designed to monitor, benchmark, and audit projects implemented under the **Member of Parliament Local Area Development Scheme (MPLADS)**.

Traditional oversight systems rely on manual sample audits or generic expenditure dashboards. MPLAD Sentinel introduces a **16-feature hybrid ML & statistical architecture**:
- **Deterministic Feature Engineering**: Timeline calculations, expenditure-to-progress gaps, and cost overrun ratios computed identically across TypeScript and Python.
- **Hierarchical Peer Benchmarking (District → State → Sector)**: Dynamic cohort analysis with strict self-exclusion to prevent outlier bias.
- **Python Machine Learning Microservice (Port 8000)**:
  - **Isolation Forest (RobustScaler)**: 16-feature unsupervised multivariate outlier detection.
  - **Sentence Transformers (`all-MiniLM-L6-v2`)**: Dense neural text embeddings combined with Haversine distance for geospatial and scope duplicate detection.
- **TypeScript Backend Risk Orchestration (Port 5000)**: Incorporates ML anomaly scores, percentiles, and unusual characteristics into a bounded, deterministic **0–100 Composite Risk Score** with 100% auditable evidence cards.
- **Modern Vite React 19 Frontend (Port 3000)**: Real-time interactive dashboard with Leaflet GIS mapping, priority audit queues, peer comparison charts, and AI Copilot assistant.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                 MPLAD SENTINEL PIPELINE                                 │
├───────────────┬─────────────────────────┬────────────────────────┬──────────────────────┤
│ 1. INGESTION  │ 2. FEATURE PIPELINE (16)│ 3. ML & PEER BENCHMARK │ 4. DECISION SUPPORT  │
│ • MPLADS CSV  │ • 13 Core Metrics       │ • Isolation Forest     │ • 0-100 Risk Score   │
│ • Schema Audit│ • 3 Peer-Relative Ratios│ • Sentence Transformers│ • Auditable Evidence │
│ • Data Quality│ • Dynamic Timelines     │ • Hierarchical Cohorts │ • Priority Queue     │
│ • Agency Logs │ • No Fallback Defaults  │ • Self-Excluding Norms │ • Copilot Insights   │
└───────────────┴─────────────────────────┴────────────────────────┴──────────────────────┘
```

---

## 🤖 16-Feature Hybrid ML Pipeline Architecture

The system features strict feature construction parity and column ordering between the TypeScript backend feature extraction layer and the Python ML pipeline (`ml/features/pipeline.py`).

### 16 Input Features (Isolation Forest & RobustScaler)

| # | Feature Name | Computation / Source | Description |
| :---: | :--- | :--- | :--- |
| **1** | `sanctioned_amount` | Project Record | Total sanctioned grant allocation (₹) |
| **2** | `estimated_cost` | Project Record | Initial administrative/technical cost estimate (₹) |
| **3** | `actual_expenditure` | Project Record | Cumulative funds disbursed to date (₹) |
| **4** | `expenditure_ratio` | `actual_expenditure / estimated_cost` | Budget burn rate against initial estimate |
| **5** | `cost_overrun_ratio` | `(actual - estimated) / estimated` | Cost escalation beyond sanctioned ceiling |
| **6** | `physical_progress_percentage` | Project Record | Verified on-ground completion (0–100%) |
| **7** | `expenditure_progress_gap` | `(expenditure_ratio * 100) - physical_progress` | Disconnect between funds spent and physical work |
| **8** | `project_age_days` | `days_between(sanction_date, completion_or_ref)` | Total elapsed lifetime since official sanction |
| **9** | `delay_days` | `max(0, days_between(expected_date, completion_or_ref))` | Execution slippage beyond targeted deadline |
| **10** | `execution_duration_days` | `days_between(start_date, completion_or_ref)` | Total active construction/execution duration |
| **11** | `peer_cost_deviation` | `((cost - peer_median_cost) / peer_median_cost) * 100` | % deviation from hierarchical peer cohort cost |
| **12** | `peer_duration_deviation` | `((duration - peer_median_dur) / peer_median_dur) * 100` | % deviation from hierarchical peer cohort duration |
| **13** | `beneficiary_count` | Project Record | Number of estimated citizens served |
| **14** | `peer_cost_ratio` | `cost / peer_cost_median` | Normalized cost ratio against cohort median |
| **15** | `peer_duration_ratio` | `execution_duration / peer_duration_median` | Normalized duration ratio against cohort median |
| **16** | `peer_progress_deviation` | `physical_progress - peer_progress_median` | Progress divergence relative to cohort peers |

### Explicit Feature Propagation (Zero Fallback Defaults)
When the TypeScript backend triggers analysis (`/ml/analyze` or `/ml/anomaly-score`), projects are enriched with precomputed `EngineeredFeatures` and `PeerBenchmark` values. The Python `FeaturePipeline`:
1. Directly extracts all 16 calculated features from the payload (`ml_features`, `features`, `peer_benchmark`).
2. Prohibits arbitrary default fallbacks (e.g. `0`, `180`, `75`) when calculated values are available.
3. Automatically computes identical hierarchical cohorts with self-exclusion when training offline on raw CSV records.

---

## 🎯 Benchmark Anomaly Test Cases (Ready for Evaluation)

The system is pre-seeded with **250 realistic MPLADS projects** across 12 Indian states, including 6 benchmark anomaly scenarios ready for 1-click evaluation:

| Case ID | Work Description & District | Anomalous Signal Detected | Expected Score & Severity |
| :--- | :--- | :--- | :--- |
| **DEMO-001** | Construction of CC Road from Main Market, Barabanki, UP | **Financial Outlier**: Sanctioned cost (₹85.0 Lakh) is **+240% above peer median** (₹25.0 Lakh) for road works | **Score: 35/100 (MODERATE/HIGH)** |
| **DEMO-002** | Primary Health Centre Inpatient Wing at Chargawan, Gorakhpur, UP | **Severe Timeline Delay**: Stalled status with **+600+ days delay past target deadline** | **Score: 20/100 (Delay Anomaly)** |
| **DEMO-003** | Installation of 150 Solar Street Lights, Patna, Bihar | **Progress/Expenditure Mismatch**: **96.25% funds disbursed (₹46.2 L)** with only **30.0% physical completion** | **Score: 20/100 (Progress Gap)** |
| **DEMO-004 & DEMO-005** | Community Hall at Village Rampur Kalan vs Cultural Center at Gram Rampur Kalan, Ghaziabad | **Potential Duplicate / Overlapping Scope**: **> 70% NLP lexical similarity** + located within **0.38 km distance** | **Score: 15/100 (Duplicate Flag)** |
| **DEMO-006** | Modernization of Integrated Drainage System, Danapur, Patna | **Agency Behavioral Pattern**: Assigned agency (*DRIC*) exhibits **> 50% portfolio delay rate & cost overrun** | **Score: 20/100 (Agency Pattern)** |

---

## 🧠 Multi-Signal Risk Architecture & Weights

Every project is evaluated across 6 strictly bounded, additive dimensions:

1. 💰 **Financial Anomaly Risk (Max 25 pts)**: Identifies projects where unit costs or total sanctioned amounts deviate from hierarchical peer group medians by $> 40\%$, or where disbursements exceed initial technical estimates.
2. ⏱️ **Timeline Execution Delay Risk (Max 20 pts)**: Identifies works exceeding expected completion dates or peer group execution durations by $> 60$ days, or marked as stalled.
3. 📉 **Progress vs Expenditure Divergence Risk (Max 20 pts)**: Flags projects where cumulative fund disbursement percentage exceeds verified physical progress by $> 25\%$.
4. 📑 **Duplicate & Semantic Overlap Risk (Max 15 pts)**: Multi-factor detector combining Sentence Transformers embeddings, Jaccard n-gram overlap, work type alignment, and Haversine geographic proximity ($\le 10\text{ km}$).
5. 📍 **Geospatial Density Clustering Risk (Max 10 pts)**: Detects high-density clustering of redundant works within narrow geographic boundaries ($\le 5\text{ km}$).
6. 🏛️ **Implementing Agency Risk Profile (Max 10 pts)**: Scores systemic historic delay rates, cost overruns, and uncompleted project ratios across agency portfolios.

**Total Score = Financial (25) + Delay (20) + Progress Mismatch (20) + Duplicate (15) + Geospatial (10) + Agency (10) = 100 Maximum.**  
The total score strictly equals the sum of its 6 explainable dimensions—never a black-box or randomized score. When Python ML is active, statistical anomaly percentiles dynamically reinforce audit evidence cards and priority queues without breaking weight determinism.

---

## 🏛️ Governance & Safe Language Policy

> [!IMPORTANT]
> **Decision-Support vs Accusatory Allegations**:  
> In compliance with administrative audit standards, MPLAD Sentinel **never accuses an agency, contractor, or representative of fraud**.  
> The system strictly utilizes objective governance terminology:
> - *“Potential anomaly”*
> - *“Risk indicator”*
> - *“Requires verification”*
> - *“Potential Duplicate”*
> - *“Overlapping Scope”*
> - *“Unusual expenditure pattern”*
> 
> Outputs are presented as **evidence-backed leads for supervisory officers** (District Magistrates, State Nodal Officers, MoSPI Inspectors).

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18.0 or newer (v24.x tested)
- **npm**: v9.0 or newer
- **Python**: v3.10 or newer (virtual environment at `ml/.venv` or root)

### 1. One-Click Local Deployment
To start the complete multi-service stack across ports 3000, 5000, and 8000:
- **Windows (PowerShell)**:
  ```powershell
  .\start_local.ps1
  ```
- **Windows (CMD Batch)**:
  ```cmd
  start-local.bat
  ```
- **To stop all services**:
  ```cmd
  stop-local.bat
  ```

### 2. Run Automated Test Suites

- **Backend Risk Engine & Feature Pipeline Tests (32 assertions)**:
  ```bash
  npm.cmd test --prefix backend
  ```
- **Full Hybrid ML Integration Tests (requires port 8000)**:
  ```bash
  npm.cmd run test:ml --prefix backend
  ```
- **Python ML Unit Tests (7 test suites)**:
  ```bash
  .\ml\.venv\Scripts\python.exe -m unittest ml/tests/test_ml.py
  ```

### 3. Open Web Dashboard
Navigate to [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 📡 REST API Reference

| Endpoint | Method | Service | Description |
| :--- | :--- | :--- | :--- |
| `/api/health` | `GET` | Node | Backend service health, uptime, and analyzed project count |
| `/api/dashboard/summary` | `GET` | Node | High-level portfolio KPIs, risk counts, and ML engine status |
| `/api/dashboard/trends` | `GET` | Node | Quarterly trends, sector distribution, and status breakdown |
| `/api/dashboard/geography` | `GET` | Node | State-wise risk index and coordinate-mapped markers for Leaflet GIS |
| `/api/projects` | `GET` | Node | Filterable project catalog with search, state, sector, and risk level queries |
| `/api/projects/:id` | `GET` | Node | Complete project dossier with risk breakdown, peer benchmarks, and duplicate matches |
| `/api/projects/:id/explanation` | `GET` | Node | Structured "Why Flagged?" explainability cards with recommended verification actions |
| `/api/duplicates` | `GET` | Node | Candidate duplicate pairs with text similarity % and geographic distance |
| `/api/agencies` | `GET` | Node | Implementing agency portfolio analytics, delay rates, and cost overrun indices |
| `/api/projects/upload` | `POST` | Node | Multipart CSV ingestion engine with automated field normalization and re-analysis |
| `/api/analyze` | `POST` | Node | Triggers on-demand full re-analysis across the entire project dataset |
| `/api/reset-demo` | `POST` | Node | Restores default SIH 2026 synthetic dataset with DEMO-001 to DEMO-006 cases |
| `/ml/health` | `GET` | Python | ML engine status, Isolation Forest status, Sentence Transformers status |
| `/ml/analyze` | `POST` | Python | Batch ML anomaly evaluation and duplicate candidate detection |
| `/ml/anomaly-score` | `POST` | Python | Single project 16-feature Isolation Forest inference |

---

## 🧪 Genuine Technology Stack

- **Backend**: Node.js, Express, TypeScript, Multer, CSV-Parse.
- **Machine Learning (Python FastAPI)**:
  - **Isolation Forest**: 16-feature unsupervised multivariate outlier detection (`scikit-learn`, `RobustScaler`).
  - **Sentence Transformers**: `all-MiniLM-L6-v2` dense neural text embeddings for duplicate semantic scope detection (`torch`, `transformers`).
  - **Hierarchical Peer Benchmarking**: Exact District → State → Sector cohort matching with self-exclusion.
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Recharts, Leaflet, React-Leaflet.
- **Testing**:
  - TypeScript: TSX test runner (`riskEngine.test.ts`, `featurePipeline.test.ts`, `mlIntegration.test.ts`).
  - Python: `unittest` runner (`test_ml.py`).

---

## 👥 Smart India Hackathon 2026 Submission
Built with precision for **PS 26102**. Designed to give Ministry and District officials actionable, transparent risk intelligence to ensure every rupee of public MPLADS funding delivers maximum community impact.

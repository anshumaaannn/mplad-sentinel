# 🛡️ MPLAD SENTINEL — AI-Powered MPLADS Risk Intelligence Platform

> **Smart India Hackathon 2026 Prototype**  
> **Problem Statement ID:** PS 26102  
> **Problem Title:** Development of an AI-powered system to detect anomalies, fraud, and inefficiencies in MPLAD Scheme implementation.  
> **System Category:** Decision-Support System & Multi-Signal Risk Intelligence Platform  
> **Operating Philosophy:** `DETECT → ASSESS → EXPLAIN → PRIORITIZE → INVESTIGATE`

---

## 🌟 Executive Overview

**MPLAD SENTINEL** is a full-stack risk intelligence and governance decision-support platform designed to monitor, benchmark, and audit projects implemented under the **Member of Parliament Local Area Development Scheme (MPLADS)**.

Traditional oversight systems rely on manual sample audits or generic expenditure dashboards. MPLAD Sentinel introduces **deterministic feature extraction**, **hierarchical peer benchmarking (District → State → Sector)**, **NLP token/n-gram semantic similarity**, **Haversine geospatial clustering**, and **implementing agency behavioral profiling** to assign every project an auditable **0–100 Composite Risk Score** accompanied by transparent, evidence-backed explanations.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 MPLAD SENTINEL PIPELINE                                │
├───────────────┬─────────────────────────┬────────────────────────┬─────────────────────┤
│ 1. INGESTION  │ 2. FEATURE EXTRACTION   │ 3. PEER BENCHMARKING   │ 4. DECISION SUPPORT │
│ • MPLADS CSV  │ • Cost Overrun Ratio    │ • Hierarchical Levels  │ • 0-100 Risk Score  │
│ • Schema Audit│ • Delay Days Elapsed    │ • Self-Excluding Norms │ • Auditable Evidence│
│ • Data Quality│ • Fund vs Progress Gap  │ • Hybrid Lexical NLP   │ • Priority Queue    │
│ • Agency Logs │ • Stalled Flagging      │ • Haversine Distance   │ • Copilot Insights  │
└───────────────┴─────────────────────────┴────────────────────────┴─────────────────────┘
```

---

## 🎯 Benchmark Anomaly Test Cases (Ready for Evaluation)

The system is seeded with **250 realistic MPLADS projects** across 12 Indian states, including 6 benchmark anomaly scenarios ready for 1-click evaluation:

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
4. 📑 **Duplicate & Semantic Overlap Risk (Max 15 pts)**: Multi-factor detector combining NLP token cosine similarity, Jaccard n-gram overlap, work type alignment, and Haversine geographic proximity ($\le 10\text{ km}$).
5. 📍 **Geospatial Density Clustering Risk (Max 10 pts)**: Detects high-density clustering of redundant works within narrow geographic boundaries ($\le 5\text{ km}$).
6. 🏛️ **Implementing Agency Risk Profile (Max 10 pts)**: Scores systemic historic delay rates, cost overruns, and uncompleted project ratios across agency portfolios.

**Total Score = Financial (25) + Delay (20) + Progress Mismatch (20) + Duplicate (15) + Geospatial (10) + Agency (10) = 100 Maximum.**  
The total score strictly equals the sum of its 6 explainable dimensions—never a black-box or randomized score.

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
- **OS**: Windows / Linux / macOS (Windows PowerShell supported with `npm.cmd`)

### 1. Run Automated Test Suite
Verify all 29 risk engine tests, hierarchical peer benchmarks, NLP similarity algorithms, risk bounds, and live data quality metrics:
```bash
npm.cmd test --prefix backend
```

### 2. Start Full-Stack Application (Backend + Frontend)
Run both the Express backend (`http://localhost:5000`) and the Vite React frontend (`http://localhost:3000`) with a single command:
```bash
npm.cmd run dev
```

### 3. Open Web Dashboard
Navigate to [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 📡 REST API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | `GET` | Service health status, uptime, and analyzed project count |
| `/api/dashboard/summary` | `GET` | High-level portfolio KPIs, risk counts, and live data integrity health |
| `/api/dashboard/trends` | `GET` | Quarterly trends, sector distribution, and status breakdown |
| `/api/dashboard/geography` | `GET` | State-wise risk index and coordinate-mapped markers for Leaflet GIS |
| `/api/projects` | `GET` | Filterable project catalog with search, state, sector, and risk level queries |
| `/api/projects/:id` | `GET` | Complete project dossier with risk breakdown, peer benchmarks, and duplicate matches |
| `/api/projects/:id/explanation` | `GET` | Structured "Why Flagged?" explainability cards with recommended verification actions |
| `/api/duplicates` | `GET` | Candidate duplicate pairs with text similarity % and geographic distance |
| `/api/agencies` | `GET` | Implementing agency portfolio analytics, delay rates, and cost overrun indices |
| `/api/projects/upload` | `POST` | Multipart CSV ingestion engine with automated field normalization and re-analysis |
| `/api/analyze` | `POST` | Triggers on-demand full re-analysis across the entire project dataset |
| `/api/reset-demo` | `POST` | Restores default SIH 2026 synthetic dataset with DEMO-001 to DEMO-006 cases |
| `/api/config` | `GET / POST` | Reads or updates dynamic risk weights and algorithmic anomaly thresholds |
| `/api/assistant/query` | `POST` | Natural language Sentinel Copilot query processor for live risk insights |

---

## 🧪 Genuine Technology Stack

- **Backend**: Node.js, Express, TypeScript, Multer, CSV-Parse.
- **Statistical & NLP Engine**: Written natively in TypeScript with zero external ML runtime dependencies:
  - Multi-level hierarchical peer median/percentile analysis with self-exclusion
  - Hybrid Lexical Token TF & Jaccard similarity
  - Haversine spherical distance calculation
  - Deterministic 0–100 bounded additive multi-signal scoring
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Recharts, Leaflet, React-Leaflet.
- **Testing**: Native Node.js/TSX test runner with 29 automated validation assertions.

---

## 👥 Smart India Hackathon 2026 Submission
Built with precision for **PS 26102**. Designed to give Ministry and District officials actionable, transparent risk intelligence to ensure every rupee of public MPLADS funding delivers maximum community impact.

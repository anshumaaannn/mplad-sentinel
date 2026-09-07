# 🛡️ MPLAD SENTINEL — AI-Powered MPLADS Risk Intelligence Platform

> **Smart India Hackathon 2026 Prototype**  
> **Problem Statement ID:** PS 26102  
> **Problem Title:** Development of an AI-powered system to detect anomalies, fraud, and inefficiencies in MPLAD Scheme implementation.  
> **System Category:** Decision-Support System & Multi-Signal Risk Intelligence Platform  
> **Operating Philosophy:** `DETECT → ASSESS → EXPLAIN → PRIORITIZE → INVESTIGATE`

---

## 🌟 Executive Overview

**MPLAD SENTINEL** is a full-stack risk intelligence and governance decision-support platform designed to monitor, benchmark, and audit projects implemented under the **Member of Parliament Local Area Development Scheme (MPLADS)**.

Traditional oversight systems rely on manual sample audits or generic expenditure dashboards. MPLAD Sentinel introduces **deterministic feature extraction**, **dynamic peer benchmarking**, **NLP semantic description embeddings**, **Haversine geospatial clustering**, and **implementing agency behavioral profiling** to assign every project an auditable **0–100 Composite Risk Score** accompanied by transparent, evidence-backed explanations.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 MPLAD SENTINEL PIPELINE                                │
├───────────────┬─────────────────────────┬────────────────────────┬─────────────────────┤
│ 1. INGESTION  │ 2. FEATURE EXTRACTION   │ 3. PEER BENCHMARKING   │ 4. DECISION SUPPORT │
│ • MPLADS CSV  │ • Cost Overrun Ratio    │ • Sector/Type Medians  │ • 0-100 Risk Score  │
│ • Schema Clean│ • Delay Days Elapsed    │ • Percentile Norms     │ • Auditable Evidence│
│ • Geo Coordinates • Fund vs Progress Gap│ • TF-IDF/Cosine NLP    │ • Priority Queue    │
│ • Agency Logs │ • Stalled Flagging      │ • Haversine Distance   │ • Copilot Insights  │
└───────────────┴─────────────────────────┴────────────────────────┴─────────────────────┘
```

---

## 🎯 Benchmark Anomaly Test Cases (Ready for SIH Judges)

The system is seeded with **250+ realistic MPLADS projects** across 12 Indian states, including 6 benchmark anomaly scenarios ready for 1-click evaluation:

| Case ID | Work Description & District | Anomalous Signal Detected | Expected Score & Severity |
| :--- | :--- | :--- | :--- |
| **DEMO-001** | Construction of High-Specification CC Road, Varanasi, UP | **Financial Outlier**: Sanctioned cost (₹95.0 Lakh) is **+275% above peer median** (₹25.3 Lakh) for road works | **Score: 78/100 (CRITICAL)** |
| **DEMO-002** | Upgradation of Community Health Centre Specialized Wing, Patna, Bihar | **Severe Timeline Delay**: 930 days elapsed with **+656 days delay past deadline** (peer median duration: 274 days) | **Score: 75/100 (CRITICAL)** |
| **DEMO-003** | Installation of 120 Solar LED Street Lighting Systems, Lucknow, UP | **Progress/Expenditure Mismatch**: **96.0% funds disbursed (₹48.0 L)** with only **30.0% physical completion** | **Score: 78/100 (CRITICAL)** |
| **DEMO-004 & DEMO-005** | Community Hall at Village Rampur Kalan vs Cultural Center at Gram Rampur Kalan, Ghaziabad | **Duplicate / Overlapping Scope**: **93% NLP lexical semantic similarity** + located within **0.32 km distance** | **Score: 68/100 (HIGH)** |
| **DEMO-006** | Storm Water Drainage Network Construction, Agra, UP | **Agency Behavioral Pattern**: Assigned agency (*Agra Rural Engineering Services*) exhibits **55% portfolio delay rate & +18.2% cost overrun** | **Score: 62/100 (HIGH)** |

---

## 🧠 Multi-Signal Risk Architecture & Weights

Every project is evaluated across 6 weighted risk dimensions:

1. 💰 **Financial Anomaly Risk (Max 25 pts)**: Identifies projects where unit costs or total sanctioned amounts exceed peer group medians by $> 45\%$, or where disbursements exceed initial technical estimates.
2. ⏱️ **Timeline Execution Delay Risk (Max 20 pts)**: Identifies works exceeding expected completion dates or peer group execution durations by $> 60$ days.
3. 📉 **Progress vs Expenditure Divergence Risk (Max 20 pts)**: Flags projects where disbursement percentage exceeds verified physical progress by $> 30\%$.
4. 📑 **Duplicate & Semantic Overlap Risk (Max 15 pts)**: Computes hybrid n-gram TF-IDF cosine similarity and Jaccard token overlap against all nearby works within a configurable geographic radius ($< 10\text{ km}$).
5. 📍 **Geospatial Density Clustering Risk (Max 10 pts)**: Detects high-density clustering of redundant works within narrow geographic boundaries ($< 5\text{ km}$).
6. 🏛️ **Implementing Agency Risk Profile (Max 10 pts)**: Scores systemic historic delay rates, cost overruns, and uncompleted project ratios across agency portfolios.

---

## 🏛️ Governance & Safe Language Policy

> [!IMPORTANT]
> **Decision-Support vs Accusatory Allegations**:  
> In compliance with administrative audit standards, MPLAD Sentinel **never accuses an agency, contractor, or representative of fraud**.  
> The system utilizes objective governance terminology:
> - *“Potential anomaly”*
> - *“Risk indicator”*
> - *“Requires verification”*
> - *“Candidate duplicate”*
> - *“Unusual expenditure pattern”*
> 
> Outputs are presented as **evidence-backed leads for supervisory officers** (District Magistrates, State Nodal Officers, MoSPI Inspectors).

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18.0 or newer (v24.x tested)
- **npm**: v9.0 or newer

### 1. Run Automated Test Suite
Verify all 18 risk engine tests, feature calculations, NLP algorithms, and benchmark records:
```bash
npm test
```

### 2. Start Full-Stack Application (Backend + Frontend)
Run both the Express backend (`http://localhost:5000`) and the Vite React frontend (`http://localhost:5173`) with a single command:
```bash
npm run dev
```

### 3. Open Web Dashboard
Navigate to [http://localhost:5173](http://localhost:5173) in your web browser.

---

## 📡 REST API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/dashboard/summary` | `GET` | High-level portfolio KPIs, risk counts, and data integrity health |
| `/api/dashboard/trends` | `GET` | Quarterly trends, sector distribution, and status breakdown |
| `/api/dashboard/geography` | `GET` | State-wise risk index and all coordinate-mapped markers for Leaflet GIS |
| `/api/projects` | `GET` | Filterable project catalog with search, state, sector, and risk level queries |
| `/api/projects/:id` | `GET` | Complete project dossier with risk breakdown, peer benchmarks, and duplicate matches |
| `/api/projects/:id/explanation` | `GET` | Structured "Why Flagged?" explainability cards with recommended verification actions |
| `/api/duplicates` | `GET` | All candidate duplicate pairs with text similarity % and geographic distance |
| `/api/agencies` | `GET` | Implementing agency portfolio analytics, delay rates, and cost overrun indices |
| `/api/projects/upload` | `POST` | Multipart CSV ingestion engine with automated field normalization and re-analysis |
| `/api/analyze` | `POST` | Triggers on-demand full re-analysis across the entire project dataset |
| `/api/reset-demo` | `POST` | Restores default SIH 2026 synthetic dataset with DEMO-001 to DEMO-006 cases |
| `/api/config` | `GET / POST` | Reads or updates dynamic risk weights and algorithmic anomaly thresholds |
| `/api/assistant/query` | `POST` | Natural language Sentinel Copilot query processor for live risk insights |

---

## 🧪 Technology Stack

- **Backend**: Node.js, Express, TypeScript, Multer, CSV-Parse.
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Recharts, Leaflet, React-Leaflet.
- **AI & Analytics**: Deterministic Feature Engineering Pipeline, Dynamic Peer Group Statistical Normalization, Hybrid N-Gram & Token Cosine/Jaccard NLP Semantic Similarity, Haversine Spherical Distance Matrix.
- **Testing**: Native Node.js/TSX test runner with 18 automated validation assertions.

---

## 👥 Smart India Hackathon 2026 Submission
Built with precision for **PS 26102**. Designed to give Ministry and District officials actionable, transparent risk intelligence to ensure every rupee of public MPLADS funding delivers maximum community impact.

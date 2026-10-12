# CloudWise — Explainable Cloud Cost Intelligence & Optimization Platform

An AI-assisted cloud FinOps dashboard that detects unusual cloud spending, identifies underutilized resources, predicts short-term cost trends, and explains actionable cost-saving recommendations.

> **Note on AWS Dependency:**  
> CloudWise currently operates in **Demo Mode** using simulated AWS Cost Explorer/CloudWatch-style data. The architecture can later be connected to AWS APIs. No AWS credentials or API keys are required to run this project.
>
> 📖 **Looking for a deep explanation of every number, chart, and output?** See the [Platform & Output Guide](file:///c:/Users/vidhi/OneDrive/Desktop/cloudwise/PLATFORM_GUIDE.md).

---

## 🚀 Key Features

1. **Executive Dashboard**:
   - High-level KPIs: Total Cloud Cost, Potential Monthly Savings, Active Resources, and Detected Anomalies.
   - 60-day daily cost trend area chart and service-level cost breakdown bar chart.
   - Dynamic **CloudWise Insight** engine summarizing high-value takeaways (e.g. top cost drivers, underutilization alerts, weekly trend shifts).
   - 14-day lightweight cost forecast with trend indicators and clear rationale.

2. **Resource Intelligence**:
   - Comprehensive inventory of EC2, RDS, S3, and Lambda resources.
   - Status indicators: `Healthy`, `Underutilized`, `Anomaly`, and `Optimization Available`.
   - Real-time search by resource name or ID and filtering by service and status.
   - Interactive slide-out resource inspector with 60-day cost history, CPU/metric telemetry charts, and tailored recommendations.

3. **Cost Anomaly Detection (AI/ML)**:
   - Powered by Scikit-Learn's **Isolation Forest** unsupervised algorithm.
   - Evaluates daily spending and rolling statistics against historical baselines.
   - Classifies anomalies into `Critical`, `High`, `Medium`, and `Low` severities.
   - Generates automated human-readable explanations detailing percentage deviations from baseline.

4. **Underutilization Detection**:
   - **EC2**: Identifies instances with average CPU utilization below 10%.
   - **RDS**: Detects databases with average CPU below 15% and low concurrent connection counts.
   - **S3**: Flags buckets with infrequent access frequencies suitable for Glacier or Intelligent-Tiering.
   - **Lambda**: Surfaces invocation spikes and misconfigured event loops.

5. **Explainable Recommendations (Novelty Layer)**:
   - For every detected opportunity, CloudWise provides:
     - **What is wrong?** (Problem statement)
     - **What should the user do?** (Actionable advice)
     - **How much can they save?** (Estimated monthly and annual savings in ₹)
     - **Risk & Confidence scores** (Transparent evaluation)
     - **Why was it detected?** (Human-readable calculation-backed explanation)

6. **14-Day Cost Forecasting**:
   - Linear regression trend analysis over recent daily aggregate spend.
   - Compares current monthly run-rate against projected monthly spend.
   - Plain-English trend assessment.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Recharts, React Router v7
- **Backend**: Python 3.10+, FastAPI, Uvicorn, SQLite
- **Data & ML**: Pandas, NumPy, Scikit-learn (Isolation Forest, Linear Regression)

---

## 📁 Project Structure

```
cloudwise/
├── backend/
│   ├── main.py              # FastAPI server & route handlers
│   ├── database.py          # SQLite connection and schema setup
│   ├── models.py            # Pydantic data schemas
│   ├── analysis.py          # ML Anomaly detection, rules, forecasting & insights
│   ├── data_generator.py    # 60-day simulated AWS telemetry & cost dataset
│   ├── requirements.txt     # Python backend dependencies
│   └── cloudwise.db         # Auto-generated SQLite database
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Sidebar, layout components
│   │   ├── pages/           # Dashboard, Resources, CostAnalysis, Anomalies, Recommendations
│   │   ├── api.js           # API client
│   │   ├── utils.jsx        # Badges, loaders, currency formatters
│   │   ├── App.jsx          # Router & layout
│   │   ├── main.jsx         # React DOM entry point
│   │   └── index.css        # Tailwind v4 theme & glassmorphic styles
│   ├── package.json
│   └── vite.config.js       # Vite config with proxy to backend
│
└── README.md
```

---

## ⚡ Quick Start Guide

### 1. Backend Setup

Open a terminal and navigate to the `backend` directory:

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

The FastAPI backend will start at `http://localhost:8000`. On initial launch, it will automatically initialize `cloudwise.db` and seed 60 days of simulated AWS resource and telemetry data.

Interactive API docs are available at: `http://localhost:8000/docs`

### 2. Frontend Setup

Open a second terminal and navigate to the `frontend` directory:

```bash
cd frontend
npm install
npm run dev
```

Open your browser at `http://localhost:5173` to access the CloudWise dashboard.

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from database import init_db, is_seeded
from data_generator import generate_data
import analysis

app = FastAPI(title="CloudWise API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()
    if not is_seeded():
        print("Seeding database with simulated data...")
        generate_data()
        print("Database seeded successfully.")


@app.get("/api/dashboard")
def dashboard():
    return analysis.get_dashboard_data()


@app.get("/api/resources")
def resources():
    data = analysis.get_resource_utilization()
    return data


@app.get("/api/resources/{resource_id}")
def resource_detail(resource_id: str):
    data = analysis.get_resource_by_id(resource_id)
    if not data:
        raise HTTPException(status_code=404, detail="Resource not found")
    return data


@app.get("/api/costs")
def costs():
    daily_totals = analysis.get_daily_totals()
    service_costs = analysis.get_service_costs()
    cost_data = analysis.get_cost_data()
    return {
        "daily_totals": daily_totals,
        "service_costs": service_costs,
        "cost_data": cost_data,
    }


@app.get("/api/anomalies")
def anomalies():
    return analysis.detect_anomalies()


@app.get("/api/recommendations")
def recommendations():
    return analysis.get_recommendations()


@app.get("/api/forecast")
def forecast():
    return analysis.get_forecast()


@app.get("/api/insights")
def insights():
    return analysis.get_insights()

from pydantic import BaseModel
from typing import Optional, List


class Resource(BaseModel):
    id: str
    name: str
    service: str
    type: str
    region: str
    monthly_cost: float
    status: str = "active"


class CostRecord(BaseModel):
    resource_id: str
    date: str
    daily_cost: float


class UsageRecord(BaseModel):
    resource_id: str
    date: str
    cpu_utilization: Optional[float] = None
    memory_utilization: Optional[float] = None
    network_in: Optional[float] = None
    network_out: Optional[float] = None
    connections: Optional[int] = None
    requests: Optional[int] = None
    storage_gb: Optional[float] = None
    access_count: Optional[int] = None


class Anomaly(BaseModel):
    resource_id: str
    resource_name: str
    service: str
    date: str
    actual_cost: float
    expected_cost: float
    deviation_pct: float
    severity: str
    explanation: str


class Recommendation(BaseModel):
    resource_id: str
    resource_name: str
    service: str
    problem: str
    recommendation: str
    estimated_saving: float
    risk: str
    confidence: float
    reason: str


class ForecastPoint(BaseModel):
    date: str
    cost: float
    is_forecast: bool = False


class Insight(BaseModel):
    icon: str
    text: str
    category: str

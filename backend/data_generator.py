import numpy as np
import sqlite3
from datetime import datetime, timedelta
from database import get_connection

SEED = 42


RESOURCES = [
    {"id": "ec2-prod-api-01", "name": "production-api-01", "service": "EC2", "type": "m5.xlarge", "region": "ap-south-1", "base_cost": 350},
    {"id": "ec2-prod-api-02", "name": "production-api-02", "service": "EC2", "type": "m5.xlarge", "region": "ap-south-1", "base_cost": 350},
    {"id": "ec2-prod-api-03", "name": "production-api-03", "service": "EC2", "type": "m5.large", "region": "ap-south-1", "base_cost": 240},
    {"id": "ec2-analytics", "name": "analytics-server", "service": "EC2", "type": "c5.2xlarge", "region": "ap-south-1", "base_cost": 500},
    {"id": "ec2-dev-01", "name": "dev-server-01", "service": "EC2", "type": "t3.medium", "region": "ap-south-1", "base_cost": 100},
    {"id": "ec2-dev-02", "name": "dev-server-02", "service": "EC2", "type": "t3.medium", "region": "ap-south-1", "base_cost": 100},
    {"id": "ec2-staging", "name": "staging-server", "service": "EC2", "type": "t3.large", "region": "ap-south-1", "base_cost": 150},
    {"id": "rds-user-db", "name": "user-db", "service": "RDS", "type": "db.r5.large", "region": "ap-south-1", "base_cost": 600},
    {"id": "rds-analytics-db", "name": "analytics-db", "service": "RDS", "type": "db.r5.xlarge", "region": "ap-south-1", "base_cost": 800},
    {"id": "rds-dev-db", "name": "dev-db", "service": "RDS", "type": "db.t3.medium", "region": "ap-south-1", "base_cost": 200},
    {"id": "s3-backup", "name": "backup-storage", "service": "S3", "type": "Standard", "region": "ap-south-1", "base_cost": 80},
    {"id": "s3-images", "name": "image-storage", "service": "S3", "type": "Standard", "region": "ap-south-1", "base_cost": 120},
    {"id": "s3-logs", "name": "log-storage", "service": "S3", "type": "Standard-IA", "region": "ap-south-1", "base_cost": 40},
    {"id": "s3-assets", "name": "static-assets", "service": "S3", "type": "Standard", "region": "ap-south-1", "base_cost": 60},
    {"id": "lambda-payment", "name": "payment-service", "service": "Lambda", "type": "Function", "region": "ap-south-1", "base_cost": 90},
    {"id": "lambda-notification", "name": "notification-service", "service": "Lambda", "type": "Function", "region": "ap-south-1", "base_cost": 50},
    {"id": "lambda-auth", "name": "auth-service", "service": "Lambda", "type": "Function", "region": "ap-south-1", "base_cost": 70},
    {"id": "lambda-resize", "name": "image-resize", "service": "Lambda", "type": "Function", "region": "ap-south-1", "base_cost": 30},
    {"id": "ec2-ml-train", "name": "ml-training-server", "service": "EC2", "type": "p3.2xlarge", "region": "ap-south-1", "base_cost": 450},
    {"id": "rds-reporting", "name": "reporting-db", "service": "RDS", "type": "db.m5.large", "region": "us-east-1", "base_cost": 400},
]

# Deliberately inject anomalies/patterns
UNDERUTILIZED_EC2 = {"ec2-prod-api-03", "ec2-dev-02", "ec2-staging"}
COST_SPIKE_EC2 = {"ec2-prod-api-02"}
UNDERUTILIZED_RDS = {"rds-dev-db"}
LOW_ACCESS_S3 = {"s3-logs", "s3-backup"}
LAMBDA_SPIKE = {"lambda-resize"}


def generate_data():
    rng = np.random.default_rng(SEED)
    conn = get_connection()
    c = conn.cursor()

    end_date = datetime(2026, 9, 2)
    start_date = end_date - timedelta(days=59)
    dates = [(start_date + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(60)]

    for res in RESOURCES:
        monthly_cost = res["base_cost"] * 30
        c.execute(
            "INSERT INTO resources (id, name, service, type, region, monthly_cost) VALUES (?,?,?,?,?,?)",
            (res["id"], res["name"], res["service"], res["type"], res["region"], monthly_cost),
        )

        for i, date in enumerate(dates):
            # Daily cost with noise
            noise = rng.normal(1.0, 0.08)
            daily_cost = res["base_cost"] * noise

            # Inject cost spike for specific resources in last 10 days
            if res["id"] in COST_SPIKE_EC2 and i >= 50:
                daily_cost *= rng.uniform(1.5, 1.9)

            # Slight uptrend for some resources
            if res["service"] == "EC2" and res["id"] not in UNDERUTILIZED_EC2:
                daily_cost *= 1 + (i * 0.002)

            # Lambda spike in last 7 days
            if res["id"] in LAMBDA_SPIKE and i >= 53:
                daily_cost *= rng.uniform(2.5, 4.0)

            c.execute(
                "INSERT INTO cost_records (resource_id, date, daily_cost) VALUES (?,?,?)",
                (res["id"], date, round(daily_cost, 2)),
            )

            # Usage records
            if res["service"] == "EC2":
                if res["id"] in UNDERUTILIZED_EC2:
                    cpu = rng.uniform(2, 9)
                    mem = rng.uniform(10, 25)
                else:
                    cpu = rng.uniform(35, 85)
                    mem = rng.uniform(40, 80)
                c.execute(
                    "INSERT INTO usage_records (resource_id, date, cpu_utilization, memory_utilization, network_in, network_out) VALUES (?,?,?,?,?,?)",
                    (res["id"], date, round(cpu, 1), round(mem, 1),
                     round(rng.uniform(50, 500), 1), round(rng.uniform(50, 500), 1)),
                )

            elif res["service"] == "RDS":
                if res["id"] in UNDERUTILIZED_RDS:
                    cpu = rng.uniform(3, 12)
                    conns = int(rng.integers(1, 5))
                else:
                    cpu = rng.uniform(25, 70)
                    conns = int(rng.integers(20, 200))
                c.execute(
                    "INSERT INTO usage_records (resource_id, date, cpu_utilization, memory_utilization, connections) VALUES (?,?,?,?,?)",
                    (res["id"], date, round(cpu, 1), round(rng.uniform(30, 70), 1), conns),
                )

            elif res["service"] == "S3":
                if res["id"] in LOW_ACCESS_S3:
                    access = int(rng.integers(0, 10))
                else:
                    access = int(rng.integers(100, 5000))
                storage = round(rng.uniform(10, 500) + i * 0.5, 1)
                c.execute(
                    "INSERT INTO usage_records (resource_id, date, storage_gb, access_count) VALUES (?,?,?,?)",
                    (res["id"], date, storage, access),
                )

            elif res["service"] == "Lambda":
                if res["id"] in LAMBDA_SPIKE and i >= 53:
                    reqs = int(rng.integers(50000, 200000))
                else:
                    reqs = int(rng.integers(1000, 20000))
                c.execute(
                    "INSERT INTO usage_records (resource_id, date, requests) VALUES (?,?,?)",
                    (res["id"], date, reqs),
                )

    conn.commit()
    conn.close()

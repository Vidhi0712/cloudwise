import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import LinearRegression
from database import get_connection


def get_all_resources():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM resources").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_resource_by_id(resource_id: str):
    conn = get_connection()
    row = conn.execute("SELECT * FROM resources WHERE id = ?", (resource_id,)).fetchone()
    if not row:
        conn.close()
        return None
    resource = dict(row)

    costs = conn.execute(
        "SELECT date, daily_cost FROM cost_records WHERE resource_id = ? ORDER BY date", (resource_id,)
    ).fetchall()
    resource["cost_history"] = [dict(c) for c in costs]

    usage = conn.execute(
        "SELECT * FROM usage_records WHERE resource_id = ? ORDER BY date", (resource_id,)
    ).fetchall()
    resource["usage_history"] = [dict(u) for u in usage]

    # Compute avg utilization
    if resource["service"] == "EC2":
        cpus = [u["cpu_utilization"] for u in resource["usage_history"] if u.get("cpu_utilization") is not None]
        resource["avg_cpu"] = round(np.mean(cpus), 1) if cpus else None
    elif resource["service"] == "RDS":
        cpus = [u["cpu_utilization"] for u in resource["usage_history"] if u.get("cpu_utilization") is not None]
        conns = [u["connections"] for u in resource["usage_history"] if u.get("connections") is not None]
        resource["avg_cpu"] = round(np.mean(cpus), 1) if cpus else None
        resource["avg_connections"] = round(np.mean(conns), 1) if conns else None
    elif resource["service"] == "S3":
        access = [u["access_count"] for u in resource["usage_history"] if u.get("access_count") is not None]
        resource["avg_access_count"] = round(np.mean(access), 1) if access else None
    elif resource["service"] == "Lambda":
        reqs = [u["requests"] for u in resource["usage_history"] if u.get("requests") is not None]
        resource["avg_requests"] = round(np.mean(reqs), 1) if reqs else None

    # Get recommendation if any
    recs = get_recommendations()
    resource["recommendation"] = next((r for r in recs if r["resource_id"] == resource_id), None)

    conn.close()
    return resource


def get_cost_data():
    conn = get_connection()
    rows = conn.execute("""
        SELECT cr.date, cr.daily_cost, r.service, r.name, r.id as resource_id
        FROM cost_records cr
        JOIN resources r ON cr.resource_id = r.id
        ORDER BY cr.date
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_daily_totals():
    conn = get_connection()
    rows = conn.execute("""
        SELECT date, SUM(daily_cost) as total_cost
        FROM cost_records
        GROUP BY date
        ORDER BY date
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_service_costs():
    conn = get_connection()
    rows = conn.execute("""
        SELECT r.service, SUM(cr.daily_cost) as total_cost
        FROM cost_records cr
        JOIN resources r ON cr.resource_id = r.id
        GROUP BY r.service
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def detect_anomalies():
    conn = get_connection()
    resources = conn.execute("SELECT id, name, service FROM resources").fetchall()
    anomalies = []

    for res in resources:
        costs = conn.execute(
            "SELECT date, daily_cost FROM cost_records WHERE resource_id = ? ORDER BY date",
            (res["id"],),
        ).fetchall()

        if len(costs) < 10:
            continue

        df = pd.DataFrame([dict(c) for c in costs])
        values = df["daily_cost"].values.reshape(-1, 1)

        # Add rolling mean as feature
        df["rolling_mean"] = df["daily_cost"].rolling(7, min_periods=1).mean()
        features = df[["daily_cost", "rolling_mean"]].values

        model = IsolationForest(contamination=0.08, random_state=42, n_estimators=40)
        preds = model.fit_predict(features)

        historical_mean = df["daily_cost"].mean()
        historical_std = df["daily_cost"].std()

        for idx in range(len(preds)):
            if preds[idx] == -1:
                actual = df.iloc[idx]["daily_cost"]
                deviation = ((actual - historical_mean) / historical_mean) * 100

                if abs(deviation) < 15:
                    continue

                severity = "Low"
                if abs(deviation) > 50:
                    severity = "Critical"
                elif abs(deviation) > 30:
                    severity = "High"
                elif abs(deviation) > 20:
                    severity = "Medium"

                direction = "higher" if deviation > 0 else "lower"
                explanation = (
                    f"Daily cost of ₹{actual:,.0f} is {abs(deviation):.0f}% {direction} than "
                    f"the historical average of ₹{historical_mean:,.0f}. "
                    f"This deviation is outside the normal spending pattern for this resource."
                )

                anomalies.append({
                    "resource_id": res["id"],
                    "resource_name": res["name"],
                    "service": res["service"],
                    "date": df.iloc[idx]["date"],
                    "actual_cost": round(actual, 2),
                    "expected_cost": round(historical_mean, 2),
                    "deviation_pct": round(deviation, 1),
                    "severity": severity,
                    "explanation": explanation,
                })

    conn.close()
    # Sort by severity and date
    severity_order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
    anomalies.sort(key=lambda x: (severity_order.get(x["severity"], 4), x["date"]), reverse=True)
    # Reverse so most recent critical comes first
    anomalies.sort(key=lambda x: (severity_order.get(x["severity"], 4), -len(x["date"])))
    return anomalies


def get_resource_utilization():
    """Get average utilization per resource for the observation period."""
    conn = get_connection()
    resources = conn.execute("SELECT * FROM resources").fetchall()
    result = []

    for res in resources:
        r = dict(res)
        usage = conn.execute(
            "SELECT * FROM usage_records WHERE resource_id = ? ORDER BY date",
            (res["id"],),
        ).fetchall()

        if not usage:
            r["avg_cpu"] = None
            r["utilization_status"] = "Unknown"
            result.append(r)
            continue

        usage_dicts = [dict(u) for u in usage]

        if res["service"] == "EC2":
            cpus = [u["cpu_utilization"] for u in usage_dicts if u.get("cpu_utilization") is not None]
            avg_cpu = np.mean(cpus) if cpus else 0
            r["avg_cpu"] = round(avg_cpu, 1)
            r["utilization_status"] = "Underutilized" if avg_cpu < 10 else "Healthy"

        elif res["service"] == "RDS":
            cpus = [u["cpu_utilization"] for u in usage_dicts if u.get("cpu_utilization") is not None]
            conns = [u["connections"] for u in usage_dicts if u.get("connections") is not None]
            avg_cpu = np.mean(cpus) if cpus else 0
            avg_conns = np.mean(conns) if conns else 0
            r["avg_cpu"] = round(avg_cpu, 1)
            r["avg_connections"] = round(avg_conns, 1)
            r["utilization_status"] = "Underutilized" if avg_cpu < 15 and avg_conns < 10 else "Healthy"

        elif res["service"] == "S3":
            access = [u["access_count"] for u in usage_dicts if u.get("access_count") is not None]
            avg_access = np.mean(access) if access else 0
            r["avg_access_count"] = round(avg_access, 1)
            r["utilization_status"] = "Optimization Available" if avg_access < 15 else "Healthy"

        elif res["service"] == "Lambda":
            reqs = [u["requests"] for u in usage_dicts if u.get("requests") is not None]
            avg_reqs = np.mean(reqs) if reqs else 0
            r["avg_requests"] = round(avg_reqs, 1)
            # Check for spike: last 7 days vs previous
            if len(reqs) > 7:
                recent = np.mean(reqs[-7:])
                earlier = np.mean(reqs[:-7])
                if recent > earlier * 2:
                    r["utilization_status"] = "Anomaly"
                else:
                    r["utilization_status"] = "Healthy"
            else:
                r["utilization_status"] = "Healthy"

        result.append(r)

    conn.close()
    return result


def get_recommendations():
    resources = get_resource_utilization()
    recommendations = []

    for r in resources:
        if r["service"] == "EC2" and r.get("utilization_status") == "Underutilized":
            avg_cpu = r.get("avg_cpu", 0)
            saving = round(r["monthly_cost"] * 0.45, 0)
            confidence = min(95, round(90 + (10 - avg_cpu) * 0.5, 0))
            recommendations.append({
                "resource_id": r["id"],
                "resource_name": r["name"],
                "service": r["service"],
                "problem": "EC2 instance is underutilized",
                "recommendation": f"Consider downsizing from {r['type']} to a smaller instance type, or schedule auto-shutdown during off-peak hours.",
                "estimated_saving": saving,
                "risk": "Low",
                "confidence": confidence,
                "reason": f"CPU utilization averaged {avg_cpu}% over the 60-day observation period, well below the 10% threshold. The instance appears significantly oversized for its workload.",
            })

        elif r["service"] == "RDS" and r.get("utilization_status") == "Underutilized":
            avg_cpu = r.get("avg_cpu", 0)
            avg_conns = r.get("avg_connections", 0)
            saving = round(r["monthly_cost"] * 0.40, 0)
            recommendations.append({
                "resource_id": r["id"],
                "resource_name": r["name"],
                "service": r["service"],
                "problem": "RDS instance is underutilized",
                "recommendation": f"Consider downsizing from {r['type']} to a smaller instance class, or converting to Aurora Serverless for variable workloads.",
                "estimated_saving": saving,
                "risk": "Medium",
                "confidence": round(85 + (15 - avg_cpu) * 0.3, 0),
                "reason": f"CPU utilization averaged {avg_cpu}% and connections averaged {avg_conns:.0f}/day over the observation period. Both metrics are below recommended thresholds.",
            })

        elif r["service"] == "S3" and r.get("utilization_status") == "Optimization Available":
            avg_access = r.get("avg_access_count", 0)
            saving = round(r["monthly_cost"] * 0.55, 0)
            recommendations.append({
                "resource_id": r["id"],
                "resource_name": r["name"],
                "service": r["service"],
                "problem": "S3 bucket has very low access frequency",
                "recommendation": "Move data to S3 Glacier or S3 Intelligent-Tiering to reduce storage costs for infrequently accessed data.",
                "estimated_saving": saving,
                "risk": "Low",
                "confidence": 88,
                "reason": f"Average daily access count was only {avg_access:.0f} over the observation period. This data appears to be rarely accessed and would benefit from a cheaper storage class.",
            })

        elif r["service"] == "Lambda" and r.get("utilization_status") == "Anomaly":
            avg_reqs = r.get("avg_requests", 0)
            saving = round(r["monthly_cost"] * 0.20, 0)
            recommendations.append({
                "resource_id": r["id"],
                "resource_name": r["name"],
                "service": r["service"],
                "problem": "Lambda function experiencing unusual invocation spike",
                "recommendation": "Review the function trigger configuration and check for recursive invocations or misconfigured event sources.",
                "estimated_saving": saving,
                "risk": "Medium",
                "confidence": 78,
                "reason": f"Recent invocation volume ({avg_reqs:,.0f} avg/day) is significantly higher than the historical baseline. This may indicate a misconfiguration causing excessive triggers.",
            })

    # Also check anomalies for cost-spike resources
    anomalies = detect_anomalies()
    anomaly_resources = set()
    for a in anomalies:
        if a["severity"] in ("Critical", "High") and a["resource_id"] not in anomaly_resources:
            anomaly_resources.add(a["resource_id"])
            # Check if not already recommended
            if not any(rec["resource_id"] == a["resource_id"] for rec in recommendations):
                res = next((r for r in resources if r["id"] == a["resource_id"]), None)
                if res:
                    saving = round(abs(a["actual_cost"] - a["expected_cost"]) * 30 * 0.5, 0)
                    recommendations.append({
                        "resource_id": a["resource_id"],
                        "resource_name": a["resource_name"],
                        "service": a["service"],
                        "problem": "Abnormal cost increase detected",
                        "recommendation": "Investigate the recent cost spike. Check for configuration changes, unexpected traffic, or resource scaling events.",
                        "estimated_saving": saving,
                        "risk": "Medium",
                        "confidence": 75,
                        "reason": f"Daily cost spiked to ₹{a['actual_cost']:,.0f} compared to historical average of ₹{a['expected_cost']:,.0f} ({abs(a['deviation_pct']):.0f}% deviation).",
                    })

    recommendations.sort(key=lambda x: x["estimated_saving"], reverse=True)
    return recommendations


def get_forecast():
    daily_totals = get_daily_totals()
    df = pd.DataFrame(daily_totals)
    df["day_num"] = range(len(df))

    # Linear regression on daily totals
    X = df["day_num"].values.reshape(-1, 1)
    y = df["total_cost"].values

    model = LinearRegression()
    model.fit(X, y)

    # Predict next 14 days
    last_day = df["day_num"].iloc[-1]
    last_date = pd.to_datetime(df["date"].iloc[-1])

    historical = []
    for _, row in df.iterrows():
        historical.append({
            "date": row["date"],
            "cost": round(row["total_cost"], 2),
            "is_forecast": False,
        })

    forecast = []
    for i in range(1, 15):
        future_day = last_day + i
        predicted_cost = model.predict([[future_day]])[0]
        future_date = (last_date + pd.Timedelta(days=i)).strftime("%Y-%m-%d")
        forecast.append({
            "date": future_date,
            "cost": round(max(predicted_cost, 0), 2),
            "is_forecast": True,
        })

    # Calculate metrics
    last_30 = df["total_cost"].tail(30).sum()
    current_monthly = round(last_30, 0)

    forecast_30_day = sum(f["cost"] for f in forecast[:14])
    recent_14 = df["total_cost"].tail(14).sum()
    predicted_monthly = round(current_monthly * (forecast_30_day / recent_14) if recent_14 > 0 else current_monthly, 0)

    pct_change = round(((predicted_monthly - current_monthly) / current_monthly) * 100, 1) if current_monthly > 0 else 0

    trend_slope = model.coef_[0]
    if trend_slope > 5:
        explanation = "Costs are projected to increase because recent daily spending has been trending upward consistently."
    elif trend_slope < -5:
        explanation = "Costs are projected to decrease as recent daily spending shows a downward trend."
    else:
        explanation = "Costs are expected to remain relatively stable based on recent spending patterns."

    return {
        "historical": historical,
        "forecast": forecast,
        "current_monthly_cost": current_monthly,
        "predicted_monthly_cost": predicted_monthly,
        "pct_change": pct_change,
        "explanation": explanation,
        "trend_direction": "up" if trend_slope > 0 else "down",
    }


def get_insights():
    insights = []

    # Service cost breakdown
    service_costs = get_service_costs()
    total = sum(s["total_cost"] for s in service_costs)
    if total > 0:
        top_service = max(service_costs, key=lambda x: x["total_cost"])
        pct = round((top_service["total_cost"] / total) * 100, 0)
        insights.append({
            "icon": "📊",
            "text": f"{top_service['service']} accounts for {pct:.0f}% of your total cloud cost over the observation period.",
            "category": "cost",
        })

    # Underutilized resources
    resources = get_resource_utilization()
    underutilized = [r for r in resources if r.get("utilization_status") == "Underutilized"]
    if underutilized:
        worst = min(underutilized, key=lambda x: x.get("avg_cpu", 100))
        insights.append({
            "icon": "⚠️",
            "text": f"{worst['name']} is significantly underutilized with only {worst.get('avg_cpu', 0)}% average CPU utilization.",
            "category": "utilization",
        })

    # Recent spending trend
    daily_totals = get_daily_totals()
    if len(daily_totals) >= 14:
        last_7 = sum(d["total_cost"] for d in daily_totals[-7:])
        prev_7 = sum(d["total_cost"] for d in daily_totals[-14:-7])
        if prev_7 > 0:
            change = round(((last_7 - prev_7) / prev_7) * 100, 0)
            direction = "increased" if change > 0 else "decreased"
            insights.append({
                "icon": "📈" if change > 0 else "📉",
                "text": f"Cloud spending {direction} by {abs(change):.0f}% during the last 7 days compared to the previous week.",
                "category": "trend",
            })

    # Total potential savings
    recs = get_recommendations()
    if recs:
        total_savings = sum(r["estimated_saving"] for r in recs)
        insights.append({
            "icon": "💰",
            "text": f"₹{total_savings:,.0f}/month of potential savings were identified across {len(recs)} optimization opportunities.",
            "category": "savings",
        })

    return insights


def get_dashboard_data():
    conn = get_connection()

    # Total cost (last 30 days)
    rows = conn.execute("""
        SELECT SUM(daily_cost) as total FROM cost_records
        WHERE date >= date('now', '-30 days')
    """).fetchone()
    # Use all data since it's simulated
    rows = conn.execute("SELECT SUM(daily_cost) as total FROM cost_records").fetchone()
    total_cost = round(rows["total"], 0) if rows["total"] else 0

    # Active resources
    res_count = conn.execute("SELECT COUNT(*) as cnt FROM resources").fetchone()["cnt"]

    conn.close()

    # Potential savings
    recs = get_recommendations()
    potential_savings = sum(r["estimated_saving"] for r in recs)

    # Anomalies
    anomalies = detect_anomalies()
    anomaly_count = len(anomalies)

    # Cost trend (daily totals)
    daily_totals = get_daily_totals()

    # Cost by service
    service_costs = get_service_costs()

    # Recent anomalies (top 5)
    recent_anomalies = anomalies[:5]

    # Top recommendations (top 5)
    top_recs = recs[:5]

    # Insights
    insights = get_insights()

    return {
        "total_cost": total_cost,
        "potential_savings": potential_savings,
        "active_resources": res_count,
        "anomaly_count": anomaly_count,
        "cost_trend": daily_totals,
        "service_costs": service_costs,
        "recent_anomalies": recent_anomalies,
        "top_recommendations": top_recs,
        "insights": insights,
    }

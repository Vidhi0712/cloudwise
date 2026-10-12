import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "cloudwise.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS resources (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            service TEXT NOT NULL,
            type TEXT NOT NULL,
            region TEXT NOT NULL,
            monthly_cost REAL NOT NULL,
            status TEXT DEFAULT 'active',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS cost_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            resource_id TEXT NOT NULL,
            date TEXT NOT NULL,
            daily_cost REAL NOT NULL,
            FOREIGN KEY (resource_id) REFERENCES resources(id)
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS usage_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            resource_id TEXT NOT NULL,
            date TEXT NOT NULL,
            cpu_utilization REAL,
            memory_utilization REAL,
            network_in REAL,
            network_out REAL,
            connections INTEGER,
            requests INTEGER,
            storage_gb REAL,
            access_count INTEGER,
            FOREIGN KEY (resource_id) REFERENCES resources(id)
        )
    """)
    conn.commit()
    conn.close()


def is_seeded():
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM resources")
    count = c.fetchone()[0]
    conn.close()
    return count > 0

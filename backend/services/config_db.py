import sqlite3
import os
import json
from typing import List, Dict, Any

DB_FILE = os.environ.get("SOVEREIGN_DB_PATH", "sovereign.db")

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS models (
            name TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            enabled BOOLEAN DEFAULT 1
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            task_id TEXT PRIMARY KEY,
            task TEXT,
            capability TEXT,
            model_used TEXT,
            status TEXT,
            created_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def get_all_models() -> List[Dict[str, Any]]:
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT name, type, enabled FROM models")
    rows = cursor.fetchall()
    conn.close()
    return [{"name": row[0], "type": row[1], "enabled": bool(row[2])} for row in rows]

def save_models(models: List[Dict[str, Any]]):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    # Delete existing configs
    cursor.execute("DELETE FROM models")
    # Insert new
    for m in models:
        enabled = 1 if m.get("enabled", True) else 0
        cursor.execute(
            "INSERT INTO models (name, type, enabled) VALUES (?, ?, ?)",
            (m["name"], m["type"], enabled)
        )
    conn.commit()
    conn.close()

def save_task(task_id: str, task: str, capability: str, model_used: str, status: str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT OR REPLACE INTO tasks (task_id, task, capability, model_used, status)
        VALUES (?, ?, ?, ?, ?)
    ''', (task_id, task, capability, model_used, status))
    conn.commit()
    conn.close()

def get_tasks() -> List[Dict[str, Any]]:
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT task_id, task, capability, model_used, status, created_time FROM tasks ORDER BY created_time DESC")
    rows = cursor.fetchall()
    conn.close()
    return [{"task_id": r[0], "task": r[1], "capability": r[2], "model_used": r[3], "status": r[4], "created_time": r[5]} for r in rows]

def get_task(task_id: str) -> Dict[str, Any]:
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT task_id, task, capability, model_used, status, created_time FROM tasks WHERE task_id = ?", (task_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {"task_id": row[0], "task": row[1], "capability": row[2], "model_used": row[3], "status": row[4], "created_time": row[5]}
    return None

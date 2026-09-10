import platform
import os
import psutil
from typing import Dict, Any
from plugins.interface import BasePlugin, PluginMetadata, PluginPermission
from ai.config import get_ollama_base_url
import urllib.request, json

class SystemInfoPlugin(BasePlugin):
    metadata = PluginMetadata(
        name="System Info",
        version="1.0.0",
        description="Inspects local host operating system, memory, CPU load, disk usage, and Ollama server status.",
        author="Sovereign Core",
        permissions=[PluginPermission.READ_SYSTEM_INFO, PluginPermission.NETWORK_LOCAL_ONLY],
        enabled_by_default=True
    )

    def execute(self, action: str, params: Dict[str, Any]) -> Dict[str, Any]:
        if action == "status" or action == "get_system_info":
            mem = psutil.virtual_memory()
            disk = psutil.disk_usage(os.getcwd())
            cpu_percent = psutil.cpu_percent(interval=0.1)

            # Query local Ollama
            ollama_online = False
            installed_models = []
            try:
                base = get_ollama_base_url().rstrip('/')
                req = urllib.request.Request(f"{base}/api/tags")
                with urllib.request.urlopen(req, timeout=2) as resp:
                    data = json.loads(resp.read().decode('utf-8'))
                    ollama_online = True
                    installed_models = [m.get("name") for m in data.get("models", [])]
            except Exception:
                pass

            return {
                "os": platform.system(),
                "os_release": platform.release(),
                "architecture": platform.machine(),
                "python_version": platform.python_version(),
                "cpu_count": psutil.cpu_count(logical=True),
                "cpu_usage_percent": cpu_percent,
                "memory_total_gb": round(mem.total / (1024 ** 3), 2),
                "memory_available_gb": round(mem.available / (1024 ** 3), 2),
                "memory_used_percent": mem.percent,
                "disk_free_gb": round(disk.free / (1024 ** 3), 2),
                "disk_total_gb": round(disk.total / (1024 ** 3), 2),
                "ollama": {
                    "status": "online" if ollama_online else "offline",
                    "models_count": len(installed_models),
                    "models": installed_models
                }
            }
        else:
            return {"error": f"Unknown action: '{action}'"}

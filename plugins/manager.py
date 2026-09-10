import json
import logging
from typing import Dict, List, Optional, Any
from plugins.interface import BasePlugin
from plugins.builtin.system_info import SystemInfoPlugin
from plugins.builtin.file_summarizer import FileSummarizerPlugin
from plugins.builtin.code_formatter import CodeFormatterPlugin
from plugins.builtin.data_converter import DataConverterPlugin

logger = logging.getLogger("sovereign.plugins")

class PluginManager:
    """
    Central manager for Sovereign local plugins.
    Ensures plugins declare permissions and enforces user authorization.
    """
    def __init__(self):
        self._plugins: Dict[str, BasePlugin] = {}
        self._register_default_plugins()

    def _register_default_plugins(self):
        defaults = [
            SystemInfoPlugin(),
            FileSummarizerPlugin(),
            CodeFormatterPlugin(),
            DataConverterPlugin()
        ]
        for p in defaults:
            self._plugins[p.metadata.name] = p

    def get_plugin(self, name: str) -> Optional[BasePlugin]:
        return self._plugins.get(name)

    def list_plugins(self) -> List[Dict[str, Any]]:
        """List all discovered plugins with enabled status from database."""
        # Query DB for enabled overrides
        db_statuses = {}
        try:
            from backend.db.session import SessionLocal
            from backend.db.models import PluginConfig
            db = SessionLocal()
            try:
                configs = db.query(PluginConfig).all()
                for c in configs:
                    db_statuses[c.name] = c.enabled
            finally:
                db.close()
        except Exception:
            pass

        results = []
        for name, p in self._plugins.items():
            info = p.to_dict()
            info["enabled"] = db_statuses.get(name, p.metadata.enabled_by_default)
            results.append(info)
        return results

    def toggle_plugin(self, name: str, enabled: bool) -> bool:
        """Update plugin enabled status in database."""
        if name not in self._plugins:
            return False

        from backend.db.session import SessionLocal
        from backend.db.models import PluginConfig
        db = SessionLocal()
        try:
            cfg = db.query(PluginConfig).filter(PluginConfig.name == name).first()
            if cfg:
                cfg.enabled = enabled
            else:
                p = self._plugins[name]
                cfg = PluginConfig(
                    name=name,
                    enabled=enabled,
                    permissions_json=json.dumps([x.value for x in p.metadata.permissions])
                )
                db.add(cfg)
            db.commit()
            return True
        finally:
            db.close()

    def execute_plugin(self, name: str, action: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute action if plugin is registered and enabled."""
        plugin = self.get_plugin(name)
        if not plugin:
            return {"error": f"Plugin '{name}' not found."}

        # Check enabled state
        from backend.db.session import SessionLocal
        from backend.db.models import PluginConfig
        db = SessionLocal()
        try:
            cfg = db.query(PluginConfig).filter(PluginConfig.name == name).first()
            is_enabled = cfg.enabled if cfg else plugin.metadata.enabled_by_default
            if not is_enabled:
                return {"error": f"Plugin '{name}' is currently disabled. Please enable it in the Plugins view."}
        finally:
            db.close()

        return plugin.execute(action, params)

_plugin_manager_instance = None

def get_plugin_manager() -> PluginManager:
    global _plugin_manager_instance
    if _plugin_manager_instance is None:
        _plugin_manager_instance = PluginManager()
    return _plugin_manager_instance

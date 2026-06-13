"""Recorder Advisor Integration."""
from __future__ import annotations

import logging
from dataclasses import dataclass, field

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers.storage import Store

from .const import DOMAIN, STORAGE_KEY, STORAGE_VERSION
from .analyzer import RecorderAnalyzer

_LOGGER = logging.getLogger(__name__)


@dataclass
class RecorderAdvisorData:
    """Runtime data."""
    analyzer: RecorderAnalyzer
    store: Store
    last_results: list[dict] = field(default_factory=list)
    applied_exclusions: list[str] = field(default_factory=list)


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Register static path for frontend card."""
    hass.http.register_static_path(
        "/recorder_advisor_card",
        hass.config.path("custom_components/recorder_advisor/www"),
        cache_headers=False,
    )
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Recorder Advisor."""
    store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
    stored = await store.async_load() or {}

    analyzer = RecorderAnalyzer(hass, entry)
    runtime = RecorderAdvisorData(
        analyzer=analyzer,
        store=store,
        applied_exclusions=stored.get("applied_exclusions", []),
    )
    entry.runtime_data = runtime

    # Initial analysis
    runtime.last_results = await analyzer.async_analyze()

    _register_services(hass, entry)
    entry.async_on_unload(entry.add_update_listener(_async_update_listener))
    return True


async def _async_update_listener(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


def _register_services(hass: HomeAssistant, entry: ConfigEntry) -> None:
    async def handle_get_results(call: ServiceCall) -> None:
        runtime: RecorderAdvisorData = entry.runtime_data
        hass.bus.async_fire(f"{DOMAIN}_results", {"entities": runtime.last_results})

    async def handle_reanalyze(call: ServiceCall) -> None:
        runtime: RecorderAdvisorData = entry.runtime_data
        runtime.last_results = await runtime.analyzer.async_analyze()
        hass.bus.async_fire(f"{DOMAIN}_results", {"entities": runtime.last_results})

    async def handle_generate_yaml(call: ServiceCall) -> None:
        runtime: RecorderAdvisorData = entry.runtime_data
        entity_ids = call.data.get("entity_ids", [])
        yaml_block = _generate_recorder_yaml(entity_ids)
        hass.bus.async_fire(f"{DOMAIN}_yaml", {"yaml": yaml_block, "entity_ids": entity_ids})

    async def handle_mark_applied(call: ServiceCall) -> None:
        runtime: RecorderAdvisorData = entry.runtime_data
        entity_ids = call.data.get("entity_ids", [])
        for eid in entity_ids:
            if eid not in runtime.applied_exclusions:
                runtime.applied_exclusions.append(eid)
        await runtime.store.async_save({"applied_exclusions": runtime.applied_exclusions})

    if not hass.services.has_service(DOMAIN, "get_results"):
        hass.services.async_register(DOMAIN, "get_results", handle_get_results)
        hass.services.async_register(DOMAIN, "reanalyze", handle_reanalyze)
        hass.services.async_register(DOMAIN, "generate_yaml", handle_generate_yaml)
        hass.services.async_register(DOMAIN, "mark_applied", handle_mark_applied)


def _generate_recorder_yaml(entity_ids: list[str]) -> str:
    """Generate recorder exclude YAML block."""
    if not entity_ids:
        return ""
    lines = ["recorder:", "  exclude:", "    entities:"]
    for eid in sorted(entity_ids):
        lines.append(f"      - {eid}")
    return "\n".join(lines)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    for service in ["get_results", "reanalyze", "generate_yaml", "mark_applied"]:
        hass.services.async_remove(DOMAIN, service)
    return True

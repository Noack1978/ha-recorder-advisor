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
    ignored_entities: set[str] = field(default_factory=set)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Recorder Advisor."""
    from homeassistant.core import CoreState, EVENT_HOMEASSISTANT_STARTED
    from .frontend import JSModuleRegistration

    async def _register_frontend(_event=None) -> None:
        await JSModuleRegistration(hass).async_register()

    if hass.state is CoreState.running:
        await _register_frontend()
    else:
        hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, _register_frontend)

    store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
    stored = await store.async_load() or {}

    analyzer = RecorderAnalyzer(hass, entry)
    runtime = RecorderAdvisorData(
        analyzer=analyzer,
        store=store,
        applied_exclusions=stored.get("applied_exclusions", []),
        ignored_entities=set(stored.get("ignored_entities", [])),
    )
    entry.runtime_data = runtime

    _register_services(hass, entry)

    # Delay initial analysis until HA is fully started
    async def _initial_analysis(_event=None) -> None:
        results = await analyzer.async_analyze(runtime.ignored_entities)
        # Filter out already-applied exclusions
        runtime.last_results = [
            e for e in results
            if e["entity_id"] not in runtime.applied_exclusions
        ]
        _LOGGER.info("Recorder Advisor initial analysis: %d entities", len(runtime.last_results))

    if hass.state is CoreState.running:
        await _initial_analysis()
    else:
        hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, _initial_analysis)

    return True


def _fire_results(hass: HomeAssistant, runtime: RecorderAdvisorData) -> None:
    """Fire results event with current state."""
    hass.bus.async_fire(
        f"{DOMAIN}_results",
        {
            "entities": runtime.last_results,
            "ignored": list(runtime.ignored_entities),
            "applied": runtime.applied_exclusions,
        },
        context=None,
    )


def _register_services(hass: HomeAssistant, entry: ConfigEntry) -> None:
    async def handle_get_results(call: ServiceCall) -> None:
        runtime: RecorderAdvisorData = entry.runtime_data
        _fire_results(hass, runtime)

    async def handle_reanalyze(call: ServiceCall) -> None:
        runtime: RecorderAdvisorData = entry.runtime_data
        results = await runtime.analyzer.async_analyze(runtime.ignored_entities)
        # Filter out already-applied exclusions
        runtime.last_results = [
            e for e in results
            if e["entity_id"] not in runtime.applied_exclusions
        ]
        _fire_results(hass, runtime)

    async def handle_generate_yaml(call: ServiceCall) -> None:
        runtime: RecorderAdvisorData = entry.runtime_data
        entity_ids = call.data.get("entity_ids", [])
        yaml_block = _generate_recorder_yaml(entity_ids)
        hass.bus.async_fire(
            f"{DOMAIN}_yaml",
            {"yaml": yaml_block, "entity_ids": entity_ids},
            context=None,
        )

    async def handle_mark_applied(call: ServiceCall) -> None:
        runtime: RecorderAdvisorData = entry.runtime_data
        entity_ids = call.data.get("entity_ids", [])
        for eid in entity_ids:
            if eid not in runtime.applied_exclusions:
                runtime.applied_exclusions.append(eid)
        # Remove applied entities from results immediately
        runtime.last_results = [
            e for e in runtime.last_results
            if e["entity_id"] not in runtime.applied_exclusions
        ]
        await runtime.store.async_save({
            "applied_exclusions": runtime.applied_exclusions,
            "ignored_entities": list(runtime.ignored_entities),
        })
        _fire_results(hass, runtime)

    async def handle_ignore_entity(call: ServiceCall) -> None:
        entity_id = call.data.get("entity_id")
        if not entity_id:
            return
        runtime: RecorderAdvisorData = entry.runtime_data
        runtime.ignored_entities.add(entity_id)
        # Remove from current results immediately
        runtime.last_results = [e for e in runtime.last_results if e["entity_id"] != entity_id]
        await runtime.store.async_save({
            "applied_exclusions": runtime.applied_exclusions,
            "ignored_entities": list(runtime.ignored_entities),
        })
        _LOGGER.info("Recorder Advisor: ignored entity %s", entity_id)
        _fire_results(hass, runtime)

    async def handle_unignore_entity(call: ServiceCall) -> None:
        entity_id = call.data.get("entity_id")
        if not entity_id:
            return
        runtime: RecorderAdvisorData = entry.runtime_data
        runtime.ignored_entities.discard(entity_id)
        await runtime.store.async_save({
            "applied_exclusions": runtime.applied_exclusions,
            "ignored_entities": list(runtime.ignored_entities),
        })
        _LOGGER.info("Recorder Advisor: unignored entity %s", entity_id)
        # Re-analyze so the entity reappears if still high-frequency
        runtime.last_results = await runtime.analyzer.async_analyze(runtime.ignored_entities)
        _fire_results(hass, runtime)

    async def handle_unmark_applied(call: ServiceCall) -> None:
        runtime: RecorderAdvisorData = entry.runtime_data
        entity_ids = call.data.get("entity_ids", [])
        for eid in entity_ids:
            if eid in runtime.applied_exclusions:
                runtime.applied_exclusions.remove(eid)
        await runtime.store.async_save({
            "applied_exclusions": runtime.applied_exclusions,
            "ignored_entities": list(runtime.ignored_entities),
        })
        _LOGGER.info("Recorder Advisor: unmarked applied: %s", entity_ids)
        # Re-analyze so entities reappear if still high-frequency
        results = await runtime.analyzer.async_analyze(runtime.ignored_entities)
        runtime.last_results = [
            e for e in results
            if e["entity_id"] not in runtime.applied_exclusions
        ]
        _fire_results(hass, runtime)

    if not hass.services.has_service(DOMAIN, "get_results"):
        hass.services.async_register(DOMAIN, "get_results", handle_get_results)
        hass.services.async_register(DOMAIN, "reanalyze", handle_reanalyze)
        hass.services.async_register(DOMAIN, "generate_yaml", handle_generate_yaml)
        hass.services.async_register(DOMAIN, "mark_applied", handle_mark_applied)
        hass.services.async_register(DOMAIN, "unmark_applied", handle_unmark_applied)
        hass.services.async_register(DOMAIN, "ignore_entity", handle_ignore_entity)
        hass.services.async_register(DOMAIN, "unignore_entity", handle_unignore_entity)


def _generate_recorder_yaml(entity_ids: list[str]) -> str:
    """Generate recorder exclude YAML block."""
    if not entity_ids:
        return ""
    lines = ["exclude:", "  entities:"]
    for eid in sorted(entity_ids):
        lines.append(f"    - {eid}")
    return "\n".join(lines)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    for service in ["get_results", "reanalyze", "generate_yaml", "mark_applied", "unmark_applied",
                    "ignore_entity", "unignore_entity"]:
        hass.services.async_remove(DOMAIN, service)
    return True

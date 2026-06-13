"""Recorder Analyzer - queries the HA recorder database."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util
from homeassistant.components.recorder import get_instance
from homeassistant.components.recorder.util import session_scope

from .const import (
    CONF_TOP_N,
    CONF_MIN_CHANGES_PER_DAY,
    CONF_LOOKBACK_DAYS,
    DEFAULT_TOP_N,
    DEFAULT_MIN_CHANGES_PER_DAY,
    DEFAULT_LOOKBACK_DAYS,
)

_LOGGER = logging.getLogger(__name__)

# Domains that are typically fine to exclude
HIGH_FREQUENCY_DOMAINS = {
    "sensor", "binary_sensor", "input_boolean", "switch", "light", "cover",
    "climate", "fan", "media_player", "number", "select",
}

# Domains that should generally NOT be excluded (important for HA to work)
CRITICAL_DOMAINS = {
    "person", "zone", "device_tracker", "automation", "script",
    "scene", "input_button", "update",
}


async def _run_db_query(instance, lookback_days: int) -> list[tuple]:
    """Run the recorder DB query in the executor."""
    import sqlalchemy as sa
    from homeassistant.components.recorder.db_schema import States, StatesMeta

    cutoff = dt_util.utcnow() - timedelta(days=lookback_days)

    def _query(session):
        try:
            # Query change counts per entity
            result = session.execute(
                sa.text(
                    """
                    SELECT sm.entity_id, COUNT(s.state_id) as changes
                    FROM states s
                    JOIN states_meta sm ON s.metadata_id = sm.metadata_id
                    WHERE s.last_updated_ts >= :cutoff
                    GROUP BY sm.entity_id
                    ORDER BY changes DESC
                    """
                ),
                {"cutoff": cutoff.timestamp()},
            ).fetchall()
            return [(row[0], row[1]) for row in result]
        except Exception as e:
            _LOGGER.warning("DB query failed, trying legacy schema: %s", e)
            try:
                result = session.execute(
                    sa.text(
                        """
                        SELECT entity_id, COUNT(state_id) as changes
                        FROM states
                        WHERE last_updated >= :cutoff
                        GROUP BY entity_id
                        ORDER BY changes DESC
                        """
                    ),
                    {"cutoff": cutoff.isoformat()},
                ).fetchall()
                return [(row[0], row[1]) for row in result]
            except Exception as e2:
                _LOGGER.error("Both DB queries failed: %s", e2)
                return []

    with session_scope(session=instance.get_session()) as session:
        return _query(session)


class RecorderAnalyzer:
    """Analyzes recorder data for high-frequency entities."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self._hass = hass
        self._entry = entry

    async def async_analyze(self, ignored_entities: set[str] | None = None) -> list[dict]:
        """Analyze recorder DB and return sorted entity list with recommendations."""
        options = self._entry.options
        top_n = options.get(CONF_TOP_N, DEFAULT_TOP_N)
        min_changes = options.get(CONF_MIN_CHANGES_PER_DAY, DEFAULT_MIN_CHANGES_PER_DAY)
        lookback_days = options.get(CONF_LOOKBACK_DAYS, DEFAULT_LOOKBACK_DAYS)

        try:
            recorder_instance = get_instance(self._hass)
        except Exception as e:
            _LOGGER.error("Cannot get recorder instance: %s", e)
            return []

        try:
            rows = await recorder_instance.async_add_executor_job(
                lambda: _run_db_query_sync(recorder_instance, lookback_days)
            )
        except Exception as e:
            _LOGGER.error("Recorder query failed: %s", e)
            return []

        ignored = ignored_entities or set()
        results = []
        for entity_id, total_changes in rows:
            if not entity_id:
                continue
            if entity_id in ignored:
                continue
            domain = entity_id.split(".")[0]
            changes_per_day = total_changes / max(lookback_days, 1)

            if changes_per_day < min_changes:
                continue

            is_critical = domain in CRITICAL_DOMAINS
            recommendation = _make_recommendation(entity_id, domain, changes_per_day, is_critical)

            results.append({
                "entity_id": entity_id,
                "domain": domain,
                "total_changes": total_changes,
                "changes_per_day": round(changes_per_day, 1),
                "recommendation": recommendation,
                "is_critical": is_critical,
                "exclude_type": _suggest_exclude_type(entity_id),
            })

            if len(results) >= top_n:
                break

        _LOGGER.info("Recorder analysis: %d entities above threshold", len(results))
        return results


def _run_db_query_sync(instance, lookback_days: int) -> list[tuple]:
    """Synchronous DB query wrapper."""
    import sqlalchemy as sa
    from homeassistant.components.recorder.util import session_scope

    cutoff = dt_util.utcnow() - timedelta(days=lookback_days)

    with session_scope(session=instance.get_session()) as session:
        try:
            result = session.execute(
                sa.text(
                    "SELECT sm.entity_id, COUNT(s.state_id) as changes "
                    "FROM states s "
                    "JOIN states_meta sm ON s.metadata_id = sm.metadata_id "
                    "WHERE s.last_updated_ts >= :cutoff "
                    "GROUP BY sm.entity_id "
                    "ORDER BY changes DESC"
                ),
                {"cutoff": cutoff.timestamp()},
            ).fetchall()
            return [(row[0], row[1]) for row in result]
        except Exception:
            result = session.execute(
                sa.text(
                    "SELECT entity_id, COUNT(state_id) as changes "
                    "FROM states "
                    "WHERE last_updated >= :cutoff "
                    "GROUP BY entity_id "
                    "ORDER BY changes DESC"
                ),
                {"cutoff": cutoff.isoformat()},
            ).fetchall()
            return [(row[0], row[1]) for row in result]


def _make_recommendation(entity_id: str, domain: str, changes_per_day: float, is_critical: bool) -> str:
    if is_critical:
        return "critical_keep"
    if changes_per_day > 500:
        return "exclude_strongly"
    if changes_per_day > 100:
        return "exclude_recommended"
    if changes_per_day > 10:
        return "exclude_consider"
    return "ok"


def _suggest_exclude_type(entity_id: str) -> str:
    """Suggest whether to exclude by entity or by entity_glob."""
    domain = entity_id.split(".")[0]
    # For sensors with a common naming pattern, suggest glob
    if domain in {"sensor", "binary_sensor"}:
        return "entity"
    return "entity"

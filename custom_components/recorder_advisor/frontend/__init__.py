"""Frontend resource registration for Recorder Advisor card."""
from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)

CARD_JS_FILENAME = "recorder-advisor-card.js"
URL_BASE = "/recorder_advisor_card"
_FRONTEND_DIR = Path(__file__).parent


class JSModuleRegistration:
    """Handles registration of the Lovelace JS module."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass

    async def async_register(self) -> None:
        """Register static path and Lovelace resource."""
        hass = self._hass
        url_path = f"{URL_BASE}/{CARD_JS_FILENAME}"

        await hass.http.async_register_static_paths([
            StaticPathConfig(URL_BASE, str(_FRONTEND_DIR), cache_headers=False)
        ])
        _LOGGER.info("Recorder Advisor: static path OK → %s", url_path)

        await _async_register_resource(hass, url_path)


async def _async_register_resource(hass: HomeAssistant, url_path: str) -> None:
    """Register JS module as Lovelace resource using storage directly."""
    from homeassistant.helpers.storage import Store

    LOVELACE_RESOURCES_STORAGE = "lovelace_resources"
    store = Store(hass, 1, LOVELACE_RESOURCES_STORAGE)

    try:
        data = await store.async_load()
    except Exception as err:
        _LOGGER.warning("Recorder Advisor: could not read lovelace_resources storage: %s", err)
        data = None

    if data is None:
        data = {"items": []}

    items = data.get("items", [])

    if any(item.get("url") == url_path for item in items):
        _LOGGER.debug("Recorder Advisor: Lovelace resource already present")
        return

    import uuid
    new_item = {
        "id": str(uuid.uuid4()).replace("-", "")[:8],
        "type": "module",
        "url": url_path,
    }
    items.append(new_item)
    data["items"] = items

    try:
        await store.async_save(data)
        _LOGGER.info("Recorder Advisor: Lovelace resource registered → %s", url_path)
    except Exception as err:
        _LOGGER.warning(
            "Recorder Advisor: could not save Lovelace resource. "
            "Add manually: URL=%s Type=JavaScript-Modul. Error: %s",
            url_path, err,
        )

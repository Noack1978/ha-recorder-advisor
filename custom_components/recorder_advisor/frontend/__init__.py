"""Frontend resource registration for Recorder Advisor card."""
from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)

CARD_JS_FILENAME = "recorder-advisor-card.js"
URL_BASE = "/recorder_advisor_card"


class JSModuleRegistration:
    """Handles registration of the Lovelace JS module."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass

    async def async_register(self) -> None:
        """Register static path and Lovelace resource."""
        hass = self._hass
        path = Path(__file__).parent / CARD_JS_FILENAME
        url_path = f"{URL_BASE}/{CARD_JS_FILENAME}"

        # Register static path
        await hass.http.async_register_static_paths([
            StaticPathConfig(URL_BASE, str(path.parent), cache_headers=False)
        ])

        # Register as Lovelace resource
        await self._async_register_resource(hass, url_path)
        _LOGGER.debug("Recorder Advisor card registered at %s", url_path)

    @staticmethod
    async def _async_register_resource(hass: HomeAssistant, url_path: str) -> None:
        """Add the JS module to Lovelace resources if not already present."""
        try:
            lovelace = hass.data.get("lovelace")
            if lovelace is None:
                return
            resources = lovelace.get("resources")
            if resources is None:
                return
            if not resources.loaded:
                await resources.async_load()
            existing = [r["url"] for r in resources.async_items()]
            if url_path not in existing:
                await resources.async_create_item({"res_type": "module", "url": url_path})
                _LOGGER.info("Recorder Advisor: Lovelace resource added: %s", url_path)
        except Exception as err:
            _LOGGER.debug("Could not auto-register Lovelace resource: %s", err)

"""Config Flow for Recorder Advisor."""
from __future__ import annotations

import voluptuous as vol
from homeassistant.config_entries import ConfigFlow, OptionsFlowWithReload, ConfigEntry
from homeassistant.core import callback

from .const import (
    DOMAIN,
    CONF_TOP_N,
    CONF_MIN_CHANGES_PER_DAY,
    CONF_LOOKBACK_DAYS,
    DEFAULT_TOP_N,
    DEFAULT_MIN_CHANGES_PER_DAY,
    DEFAULT_LOOKBACK_DAYS,
)


class RecorderAdvisorConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle config flow."""

    VERSION = 1

    async def async_step_user(self, user_input=None):
        if self._async_current_entries():
            return self.async_abort(reason="already_configured")

        if user_input is not None:
            return self.async_create_entry(
                title="Recorder Advisor",
                data={},
                options={
                    CONF_TOP_N: user_input[CONF_TOP_N],
                    CONF_MIN_CHANGES_PER_DAY: user_input[CONF_MIN_CHANGES_PER_DAY],
                    CONF_LOOKBACK_DAYS: user_input[CONF_LOOKBACK_DAYS],
                },
            )

        schema = vol.Schema({
            vol.Optional(CONF_TOP_N, default=DEFAULT_TOP_N): vol.All(int, vol.Range(min=10, max=200)),
            vol.Optional(CONF_MIN_CHANGES_PER_DAY, default=DEFAULT_MIN_CHANGES_PER_DAY): vol.All(int, vol.Range(min=1, max=1000)),
            vol.Optional(CONF_LOOKBACK_DAYS, default=DEFAULT_LOOKBACK_DAYS): vol.All(int, vol.Range(min=1, max=30)),
        })

        return self.async_show_form(step_id="user", data_schema=schema)

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry):
        return RecorderAdvisorOptionsFlow()


class RecorderAdvisorOptionsFlow(OptionsFlowWithReload):
    """Options flow."""

    async def async_step_init(self, user_input=None):
        if user_input is not None:
            return self.async_create_entry(data=user_input)

        schema = vol.Schema({
            vol.Optional(CONF_TOP_N, default=self.config_entry.options.get(CONF_TOP_N, DEFAULT_TOP_N)): vol.All(int, vol.Range(min=10, max=200)),
            vol.Optional(CONF_MIN_CHANGES_PER_DAY, default=self.config_entry.options.get(CONF_MIN_CHANGES_PER_DAY, DEFAULT_MIN_CHANGES_PER_DAY)): vol.All(int, vol.Range(min=1, max=1000)),
            vol.Optional(CONF_LOOKBACK_DAYS, default=self.config_entry.options.get(CONF_LOOKBACK_DAYS, DEFAULT_LOOKBACK_DAYS)): vol.All(int, vol.Range(min=1, max=30)),
        })

        return self.async_show_form(step_id="init", data_schema=schema)

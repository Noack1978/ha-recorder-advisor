"""Constants for Recorder Advisor."""

DOMAIN = "recorder_advisor"

CONF_TOP_N = "top_n"
CONF_MIN_CHANGES_PER_DAY = "min_changes_per_day"
CONF_LOOKBACK_DAYS = "lookback_days"

DEFAULT_TOP_N = 50
DEFAULT_MIN_CHANGES_PER_DAY = 10
DEFAULT_LOOKBACK_DAYS = 7

STORAGE_KEY = f"{DOMAIN}.data"
STORAGE_VERSION = 1

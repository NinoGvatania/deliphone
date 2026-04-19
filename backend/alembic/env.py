"""Alembic env — async-aware, reads DATABASE_URL_SYNC from settings.

Uses the sync driver because Alembic's migration context is synchronous;
runtime queries in the app use the async driver via `app.core.db`.
"""

from __future__ import annotations

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.config import settings
from app.models import Base  # noqa: F401  — import models for autogenerate

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

config.set_main_option("sqlalchemy.url", settings.DATABASE_URL_SYNC)

target_metadata = Base.metadata

# PostGIS + Tiger geocoder ship dozens of internal tables — we never
# want Alembic to touch them.
_POSTGIS_EXCLUDE = {
    "spatial_ref_sys", "topology", "layer",
    # tiger geocoder tables (postgis:16 image)
    "addr", "addrfeat", "bg", "county", "county_lookup", "countysub_lookup",
    "cousub", "direction_lookup", "edges", "faces", "featnames",
    "geocode_settings", "geocode_settings_default", "loader_lookuptables",
    "loader_platform", "loader_variables", "pagc_gaz", "pagc_lex", "pagc_rules",
    "place", "place_lookup", "secondary_unit_lookup", "state", "state_lookup",
    "street_type_lookup", "tabblock", "tabblock20", "tract", "zcta5",
    "zip_lookup", "zip_lookup_all", "zip_lookup_base", "zip_state", "zip_state_loc",
}


def _include_object(obj, name, type_, reflected, compare_to):
    if type_ == "table" and name in _POSTGIS_EXCLUDE:
        return False
    return True


def run_migrations_offline() -> None:
    context.configure(
        url=settings.DATABASE_URL_SYNC,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=_include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=_include_object,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

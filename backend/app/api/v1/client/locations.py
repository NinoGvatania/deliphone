"""Client location endpoints (SPEC.md §14.1)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from geoalchemy2.functions import ST_DWithin
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.models.catalog import Device
from app.models.partners import PartnerLocation
from app.schemas.rentals import DeviceBrief, LocationBrief, LocationDetail

router = APIRouter(prefix="/locations", tags=["client-locations"])


def _location_to_brief(loc: PartnerLocation, available: int, lat: float | None = None, lng: float | None = None) -> LocationBrief:
    return LocationBrief(
        id=loc.id,
        name=loc.name,
        address=loc.address,
        city=loc.city,
        status=loc.status,
        lat=lat,
        lng=lng,
        available_devices=available,
    )


@router.get("", response_model=list[LocationBrief])
async def list_locations(
    lat: float | None = Query(None),
    lng: float | None = Query(None),
    radius: int = Query(5000, description="Search radius in meters"),
    open_now: bool | None = Query(None),
    has_devices: bool | None = Query(None),
    session: AsyncSession = Depends(get_session),
) -> list[LocationBrief]:
    # Sub-query: count available devices per location
    device_count = (
        select(
            Device.current_location_id,
            func.count(Device.id).label("cnt"),
        )
        .where(
            Device.current_custody == "location",
            Device.status == "active",
        )
        .group_by(Device.current_location_id)
        .subquery()
    )

    query = (
        select(
            PartnerLocation,
            func.coalesce(device_count.c.cnt, 0).label("available_devices"),
            func.ST_Y(func.ST_Transform(PartnerLocation.coordinates, 4326)).label("loc_lat"),
            func.ST_X(func.ST_Transform(PartnerLocation.coordinates, 4326)).label("loc_lng"),
        )
        .outerjoin(
            device_count,
            PartnerLocation.id == device_count.c.current_location_id,
        )
        .where(PartnerLocation.status == "active")
    )

    if lat is not None and lng is not None:
        point = func.ST_SetSRID(func.ST_MakePoint(lng, lat), 4326)
        point_geog = func.ST_Transform(point, 4326)
        query = query.where(
            func.ST_DWithin(
                PartnerLocation.coordinates,
                point,
                radius,
            )
        )
        query = query.order_by(
            func.ST_Distance(PartnerLocation.coordinates, point)
        )

    if has_devices:
        query = query.having(func.coalesce(device_count.c.cnt, 0) > 0)

    result = await session.execute(query)
    rows = result.all()

    items: list[LocationBrief] = []
    for loc, avail, loc_lat, loc_lng in rows:
        items.append(
            LocationBrief(
                id=loc.id,
                name=loc.name,
                address=loc.address,
                city=loc.city,
                status=loc.status,
                lat=loc_lat,
                lng=loc_lng,
                available_devices=avail,
            )
        )

    return items


@router.get("/{location_id}", response_model=LocationDetail)
async def get_location(
    location_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> LocationDetail:
    device_count = (
        select(func.count(Device.id))
        .where(
            Device.current_location_id == location_id,
            Device.current_custody == "location",
            Device.status == "active",
        )
        .scalar_subquery()
    )

    result = await session.execute(
        select(PartnerLocation, device_count.label("available_devices")).where(
            PartnerLocation.id == location_id
        )
    )
    row = result.one_or_none()
    if row is None:
        raise HTTPException(404, "location not found")

    loc, avail = row

    loc_lat: float | None = None
    loc_lng: float | None = None
    if loc.coordinates is not None:
        coord_result = await session.execute(
            select(
                func.ST_Y(loc.coordinates).label("lat"),
                func.ST_X(loc.coordinates).label("lng"),
            )
        )
        coord = coord_result.one()
        loc_lat = coord.lat
        loc_lng = coord.lng

    return LocationDetail(
        id=loc.id,
        name=loc.name,
        address=loc.address,
        city=loc.city,
        status=loc.status,
        lat=loc_lat,
        lng=loc_lng,
        available_devices=avail,
        working_hours=loc.working_hours,
        contacts=loc.contacts,
        photo_url=loc.photo_url,
        capacity=loc.capacity,
    )


@router.get("/{location_id}/available-devices", response_model=list[DeviceBrief])
async def list_available_devices(
    location_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> list[DeviceBrief]:
    # Verify location exists
    loc_result = await session.execute(
        select(PartnerLocation.id).where(PartnerLocation.id == location_id)
    )
    if loc_result.scalar_one_or_none() is None:
        raise HTTPException(404, "location not found")

    result = await session.execute(
        select(Device).where(
            Device.current_location_id == location_id,
            Device.current_custody == "location",
            Device.status == "active",
        )
    )
    devices = result.scalars().all()

    return [
        DeviceBrief(
            id=d.id,
            model=d.model,
            short_code=d.short_code,
            color=d.color,
            storage=d.storage,
            condition_grade=d.condition_grade,
        )
        for d in devices
    ]

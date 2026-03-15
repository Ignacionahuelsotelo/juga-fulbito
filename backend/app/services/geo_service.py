"""
Geolocation utilities using PostGIS.
"""

from geoalchemy2 import Geography
from geoalchemy2.elements import WKTElement
from geoalchemy2.functions import ST_DWithin, ST_Distance, ST_MakePoint, ST_SetSRID
from sqlalchemy import cast, func


def make_point(longitude: float, latitude: float) -> WKTElement:
    """Create a PostGIS POINT from lng/lat."""
    return WKTElement(f"POINT({longitude} {latitude})", srid=4326)


def st_distance_meters(geo_column, longitude: float, latitude: float):
    """
    SQLAlchemy expression for distance in meters between a geography column
    and a lat/lng point.
    """
    point = func.ST_SetSRID(func.ST_MakePoint(longitude, latitude), 4326)
    return func.ST_Distance(
        geo_column,
        cast(point, Geography),
    )


def st_within_radius(geo_column, longitude: float, latitude: float, radius_meters: float):
    """
    SQLAlchemy filter expression: is geo_column within radius_meters of lat/lng?
    """
    point = func.ST_SetSRID(func.ST_MakePoint(longitude, latitude), 4326)
    return func.ST_DWithin(
        geo_column,
        cast(point, Geography),
        radius_meters,
    )

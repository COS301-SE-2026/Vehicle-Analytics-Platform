# OSM Road Import

## Download

Download the latest South Africa extract from Geofabrik.

Example:

https://download.geofabrik.de/africa/south-africa-latest.osm.pbf

Copy it to

/var/lib/osm/

## Import

Run

```bash
./import_roads.sh
```

## Post Import

Run Flyway migration

V5__roads_post_import.sql

This:

- adds maxspeed_kmh
- populates numeric speed limits
- creates indexes
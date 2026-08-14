#!/bin/bash

set -e

DB_NAME=fleet_analytics2
PBF=/var/lib/osm/south-africa-latest.osm.pbf
STYLE=./roads.lua

echo "Importing OSM roads..."

sudo -u postgres osm2pgsql \
  --create \
  --database fleet_analytics \
  --output flex \
  --style /var/lib/osm/osm_features.lua \
  --slim \
  --cache 256 \
  --number-processes 1 \
  /var/lib/osm/south-africa-latest.osm.pbf

echo "Done."
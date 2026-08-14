local roads = osm2pgsql.define_way_table('roads', {
    { column = 'osm_id', type = 'bigint' },
    { column = 'road_class', type = 'text' },
    { column = 'road_name', type = 'text' },
    { column = 'route_number', type = 'text' },
    { column = 'maxspeed', type = 'text' },
    { column = 'oneway', type = 'text' },
    { column = 'lanes', type = 'int' },
    { column = 'surface', type = 'text' },
    { column = 'bridge', type = 'bool' },
    { column = 'tunnel', type = 'bool' },
    { column = 'junction', type = 'text' },
    { column = 'access', type = 'text' },
    { column = 'length_m', type = 'real' },
    { column = 'geom', type = 'linestring', projection = 4326, not_null = true }
})

local places = osm2pgsql.define_table({
    name = "places",
    ids = { type = "any", id_column = "osm_id" },
    columns = {
        { column = "name", type = "text" },
        { column = "place_type", type = "text" },
        { column = "population", type = "int" },
        { column = "geom", type = "geometry", projection = 4326 }
    }
})

local admin_boundaries = osm2pgsql.define_table({
    name = "admin_boundaries",
    ids = { type = "any", id_column = "osm_id" },
    columns = {
        { column = "name", type = "text" },
        { column = "admin_level", type = "int" },
        { column = "geom", type = "geometry", projection = 4326 }
    }
})

local allowed = {
    motorway=true,
    motorway_link=true,
    trunk=true,
    trunk_link=true,
    primary=true,
    primary_link=true,
    secondary=true,
    secondary_link=true,
    tertiary=true,
    tertiary_link=true,
    unclassified=true,
    residential=true,
    living_street=true,
    service=true,
    road=true
}

--------------------------------------------------------
-- Nodes
--------------------------------------------------------

function osm2pgsql.process_node(object)

    if object.tags.place and object.tags.name then

        places:insert({
            name = object.tags.name,
            place_type = object.tags.place,
            population = tonumber(object.tags.population),
            geom = object:as_point()
        })

    end

end

--------------------------------------------------------
-- Ways
--------------------------------------------------------

function osm2pgsql.process_way(object)

    ----------------------------------------------------
    -- Roads
    ----------------------------------------------------

    local highway = object.tags.highway

    if highway and allowed[highway] then

        local geom = object:as_linestring()

        roads:insert({
            osm_id = object.id,
            road_class = highway,
            road_name = object.tags.name,
            route_number = object.tags.ref,
            maxspeed = object.tags.maxspeed,
            oneway = object.tags.oneway,
            lanes = tonumber(object.tags.lanes),
            surface = object.tags.surface,
            bridge = object.tags.bridge == "yes",
            tunnel = object.tags.tunnel == "yes",
            junction = object.tags.junction,
            access = object.tags.access,
            length_m = geom:length(),
            geom = geom
        })

    end

    ----------------------------------------------------
    -- Places
    ----------------------------------------------------

    if object.tags.place and object.tags.name then

        local geom = object:as_polygon()

        if geom then

            places:insert({
                name = object.tags.name,
                place_type = object.tags.place,
                population = tonumber(object.tags.population),
                geom = geom
            })

        end

    end

end

--------------------------------------------------------
-- Relations
--------------------------------------------------------

function osm2pgsql.process_relation(object)

    if object.tags.boundary == "administrative"
        and object.tags.name
        and object.tags.admin_level then

        local geom = object:as_multipolygon()

        if geom then

            admin_boundaries:insert({
                name = object.tags.name,
                admin_level = tonumber(object.tags.admin_level),
                geom = geom
            })

        end

    end

end
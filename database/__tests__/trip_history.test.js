// the trip history to be tests
const {Pool} = require('pg');

const pool = new Pool();
let client;
beforeEach(async () => {
    client = await pool.connect();
    await client.query('BEGIN');
});

afterEach(async () => {
    await client.query('ROLLBACK');
    client.release();
});
 
afterAll(async () => {
    await pool.end();
});

async function insertTestVehicle(vehicleId) {
    await client.query(
        'INSERT INTO vehicles (vehicle_id) VALUES ($1) ON CONFLICT (vehicle_id) DO NOTHING',
        [vehicleId]
    );
}
 
describe('trips table constraints', () => {
    test('rejects a second open trip for the same vehicle', async () => {
        await insertTestVehicle('TEST_VEHICLE_1');
 
        await client.query(
            "INSERT INTO trips (vehicle_id, start_time, status) VALUES ($1, now(), 'open')",
            ['TEST_VEHICLE_1']
        );
 
        await expect(
            client.query(
                "INSERT INTO trips (vehicle_id, start_time, status) VALUES ($1, now(), 'open')",
                ['TEST_VEHICLE_1']
            )
        ).rejects.toThrow();
    });
 
    test('rejects end_time before start_time', async () => {
        await insertTestVehicle('TEST_VEHICLE_2');
 
        await expect(
            client.query(
                `INSERT INTO trips (vehicle_id, start_time, end_time, status)
                 VALUES ($1, now(), now() - INTERVAL '1 hour', 'completed')`,
                ['TEST_VEHICLE_2']
            )
        ).rejects.toThrow();
    });
 
    test('rejects a status outside open or completed', async () => {
        await insertTestVehicle('TEST_VEHICLE_3');
 
        await expect(
            client.query(
                "INSERT INTO trips (vehicle_id, start_time, status) VALUES ($1, now(), 'archived')",
                ['TEST_VEHICLE_3']
            )
        ).rejects.toThrow();
    });
});
 
describe('get_trip_history', () => {
    test('returns trips for a vehicle, most recent first', async () => {
        await insertTestVehicle('TEST_VEHICLE_4');
 
        await client.query(
            `INSERT INTO trips (vehicle_id, start_time, end_time, status)
             VALUES
                ($1, now() - INTERVAL '2 hours', now() - INTERVAL '1 hour 45 minutes', 'completed'),
                ($1, now() - INTERVAL '30 minutes', now() - INTERVAL '15 minutes', 'completed')`,
            ['TEST_VEHICLE_4']
        );
 
        const result = await client.query('SELECT * FROM get_trip_history($1)', ['TEST_VEHICLE_4']);
 
        expect(result.rows).toHaveLength(2);
        expect(new Date(result.rows[0].start_time).getTime()).toBeGreaterThan(
            new Date(result.rows[1].start_time).getTime()
        );
    });
 
    test('includes open trips even when an end date filter is passed', async () => {
        await insertTestVehicle('TEST_VEHICLE_5');
 
        await client.query(
            "INSERT INTO trips (vehicle_id, start_time, status) VALUES ($1, now(), 'open')",
            ['TEST_VEHICLE_5']
        );
 
        const result = await client.query(
            'SELECT * FROM get_trip_history($1, NULL, $2)',
            ['TEST_VEHICLE_5', new Date(Date.now() - 60 * 60 * 1000)]
        );
 
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].status).toBe('open');
    });
 
    test('p_limit and the before-cursor page through results without repeats', async () => {
        await insertTestVehicle('TEST_VEHICLE_6');
 
        for (let i = 0; i < 5; i += 1) {
            await client.query(
                `INSERT INTO trips (vehicle_id, start_time, end_time, status)
                 VALUES ($1, now() - ($2 || ' hours')::INTERVAL, now() - ($2 || ' hours')::INTERVAL + INTERVAL '10 minutes', 'completed')`,
                ['TEST_VEHICLE_6', i]
            );
        }
 
        const firstPage = await client.query(
            'SELECT * FROM get_trip_history($1, NULL, NULL, NULL, $2)',
            ['TEST_VEHICLE_6', 2]
        );
        expect(firstPage.rows).toHaveLength(2);
 
        const cursor = firstPage.rows[firstPage.rows.length - 1].start_time;
        const secondPage = await client.query(
            'SELECT * FROM get_trip_history($1, NULL, NULL, $2, $3)',
            ['TEST_VEHICLE_6', cursor, 2]
        );
 
        expect(secondPage.rows).toHaveLength(2);
        expect(secondPage.rows[0].trip_id).not.toBe(firstPage.rows[0].trip_id);
        expect(secondPage.rows[0].trip_id).not.toBe(firstPage.rows[1].trip_id);
    });
});
 
describe('get_trip_replay', () => {
    test('returns telemetry points between trip start and end, in time order', async () => {
        await insertTestVehicle('TEST_VEHICLE_7');
 
        const tripResult = await client.query(
            `INSERT INTO trips (vehicle_id, start_time, end_time, status)
             VALUES ($1, now() - INTERVAL '20 minutes', now() - INTERVAL '10 minutes', 'completed')
             RETURNING trip_id`,
            ['TEST_VEHICLE_7']
        );
        const tripId = tripResult.rows[0].trip_id;
 
        await client.query(
            `INSERT INTO clean_telemetry (time, vehicle_id, measurement, latitude, longitude, speed)
             VALUES
                (now() - INTERVAL '19 minutes', $1, 'avl', -33.92, 18.42, 40),
                (now() - INTERVAL '15 minutes', $1, 'avl', -33.93, 18.43, 55)`,
            ['TEST_VEHICLE_7']
        );
 
        const replay = await client.query('SELECT * FROM get_trip_replay($1)', [tripId]);
 
        expect(replay.rows).toHaveLength(2);
        expect(new Date(replay.rows[0].point_time).getTime()).toBeLessThan(
            new Date(replay.rows[1].point_time).getTime()
        );
    });
 
    test('an open trip replays up to the current time, not just its start', async () => {
        await insertTestVehicle('TEST_VEHICLE_8');
 
        const tripResult = await client.query(
            `INSERT INTO trips (vehicle_id, start_time, status)
             VALUES ($1, now() - INTERVAL '5 minutes', 'open')
             RETURNING trip_id`,
            ['TEST_VEHICLE_8']
        );
        const tripId = tripResult.rows[0].trip_id;
 
        await client.query(
            `INSERT INTO clean_telemetry (time, vehicle_id, measurement, latitude, longitude, speed)
             VALUES (now() - INTERVAL '1 minute', $1, 'avl', -33.92, 18.42, 40)`,
            ['TEST_VEHICLE_8']
        );
 
        const replay = await client.query('SELECT * FROM get_trip_replay($1)', [tripId]);
 
        expect(replay.rows).toHaveLength(1);
    });
 
    test('raises an error for a trip id that does not exist', async () => {
        await expect(
            client.query('SELECT * FROM get_trip_replay($1)', [999999999])
        ).rejects.toThrow();
    });
});

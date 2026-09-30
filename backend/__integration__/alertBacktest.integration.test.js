jest.unmock('pg');

const request = require('supertest');
const app = require('../src/app');
const {pool} = require('../src/db/pool');
const generateTestToken = require('../tests/generateToken');

describe('Alert rule backtesting integration', () => {
    let managerId;
    let groupId;
    let otherGroupId;
    let managerToken;
    let dataNow;

    const VEHICLE = 'COVTEST-BT-V1';
    const TEST_VEHICLES = ['COVTEST-BT-V1', 'COVTEST-BT-V2'];
    const CAN_REFRESH_SUMMARY = process.env.CI === 'true';
    const describeWithSummary = CAN_REFRESH_SUMMARY ? describe : describe.skip;
    async function cleanup() {
        await pool.query(`DELETE FROM clean_telemetry WHERE vehicle_id = ANY($1::text[])`, [TEST_VEHICLES]);
        await pool.query(`DELETE FROM vehicle_events WHERE vehicle_id = ANY($1::text[])`, [TEST_VEHICLES]);
        await pool.query(`DELETE FROM driver_daily_safety_scores WHERE vehicle_id = ANY($1::text[])`, [TEST_VEHICLES]);
        await pool.query(`DELETE FROM fleet_manager_assignments WHERE fleet_manager_id IN (SELECT id FROM users WHERE email LIKE 'covtest-bt-%')`);
        await pool.query(`DELETE FROM vehicles WHERE vehicle_id = ANY($1::text[])`, [TEST_VEHICLES]);
        await pool.query(`DELETE FROM fleet_groups WHERE name LIKE 'COVTEST-BT-%'`);
        await pool.query(`DELETE FROM users WHERE email LIKE 'covtest-bt-%'`);
    }


    function minutesBefore(minutes) {
        const t = new Date(dataNow);
        t.setUTCMinutes(t.getUTCMinutes() - minutes);
        return t.toISOString();
    }


    async function seedTelemetry(time, speed) {
        await pool.query(`
            INSERT INTO clean_telemetry (time, vehicle_id, measurement, latitude, longitude, speed, ignition, movement)
            VALUES ($1, $2, 'avl', -25.75, 28.23, $3, 'On', 'On')
        `, [time, VEHICLE, speed]);
    }

    async function refreshSpeedSummary() {
        const from = minutesBefore(240);
        const to = new Date(new Date(dataNow).getTime() + 60 * 1000).toISOString();
        await pool.query(`
            CALL refresh_continuous_aggregate('vehicle_speed_1min', '${from}', '${to}')
        `);
    }


    const backtest = (body, token = managerToken) => 
        request(app)
            .post('/api/custom-alerts/backtest')
            .set('Authorization', `Bearer ${token}`)
            .send(body);

    
    beforeAll(async () => {
        await cleanup();

        const manager = await pool.query(`
            INSERT INTO users (cognito_sub, name, email, role, is_active)
            VALUES ('covtest-bt-manager-sub', 'COVTEST BT Manager', 'covtest-bt-manager@example.com', 'fleet_manager', true)
            RETURNING id
        `);

        managerId = manager.rows[0].id;

        const group = await pool.query(`
            INSERT INTO fleet_groups (name)
            VALUES ('COVTEST-BT-Group')
            RETURNING id
        `)

        groupId = group.rows[0].id;


        const otherGroup = await pool.query(`
            INSERT INTO fleet_groups (name)
            VALUES ('COVTEST-BT-OtherGroup')
            RETURNING id
        `)

        otherGroupId = otherGroup.rows[0].id;


        await pool.query(`
            INSERT INTO fleet_manager_assignments (fleet_manager_id, fleet_group_id, assigned_by)
            VALUES ($1, $2, $1)
        `, [managerId, groupId]
    );


        await pool.query(`
            INSERT INTO vehicles (vehicle_id, device_id, fleet_group_id)
            VALUES ($1, $2, $3)
        `, [VEHICLE, `${VEHICLE}-DEV`, groupId]
    );

    const now = await pool.query('SELECT data_now() AS now');
    dataNow = now.rows[0].now;

    managerToken = generateTestToken(managerId, 'covtest-bt-manager@example.com', 'fleet_manager');
    });


    afterAll(async () => {
        await cleanup();
        if(dataNow && CAN_REFRESH_SUMMARY){
        await refreshSpeedSummary();
        }
        await pool.end();
    });

    describe('fleet group access', () => {
        test('rejects a group the manager is not assigned to', async() => {
            const res = await backtest({
                condition_type: 'speed_threshold',
                condition_params: {max_speed_kmh: 90},
                fleet_group_id: otherGroupId,
                days: 7,
            });

            expect(res.status).toBe(403);
        });


        test('allows a group the manager is assigned to', async() => {
            const res = await backtest({
                condition_type: 'speed_threshold',
                condition_params: {max_speed_kmh: 90},
                fleet_group_id: groupId,
                days: 7,
            });

            expect(res.status).toBe(200);
        });
    });


    describeWithSummary('speed threshold against real telemetry', () => {
        beforeAll(async () => {
            await seedTelemetry(minutesBefore(180), 120);
            await seedTelemetry(minutesBefore(120), 105);
            await seedTelemetry(minutesBefore(60), 98);
            await seedTelemetry(minutesBefore(30), 40);
            await refreshSpeedSummary();
        });


        test('counts only rows above the threshold', async () => {
            const res = await backtest({
                condition_type: 'speed_threshold',
                condition_params: {max_speed_kmh: 90},
                fleet_group_id: groupId,
                days: 7,
            });

            expect(res.status).toBe(200);
            expect(res.body.data.total_alerts).toBe(3);
            expect(res.body.data.vehicles_affected).toBe(1);
        });

        test('a higher threshold finds fewer alerts', async() => {
            const res = await backtest({
                condition_type: 'speed_threshold',
                condition_params: {max_speed_kmh: 110},
                fleet_group_id: groupId,
                days: 7,
            });

            expect(res.status).toBe(200);
            expect(res.body.data.total_alerts).toBe(1);
        });


        test('returns the worst breach first with the real coordinates', async() => {
            const res = await backtest({
                condition_type: 'speed_threshold',
                condition_params: {max_speed_kmh: 90},
                fleet_group_id: groupId,
                days: 7,
            });

            const worst = res.body.data.samples[0];
            expect(worst.vehicle_id).toBe(VEHICLE);
            expect(worst.breach_value).toBe(120);
            expect(worst.threshold_value).toBe(90);
            expect(Number(worst.latitude)).toBeCloseTo(-25.75, 2);

        });

        test('by_day has one entry per day in the range', async () => {
            const res = await backtest({
                condition_type: 'speed_threshold',
                condition_params: { max_speed_kmh: 90 },
                fleet_group_id: groupId,
                days: 7,
            });

            expect(res.body.data.by_day).toHaveLength(7);
            const total = res.body.data.by_day.reduce((sum, d) => sum + d.count, 0);
            expect(total).toBe(res.body.data.total_alerts);
        });
    });

    describeWithSummary('debounce against real telemetry', () => {
        const CLOSE_VEHICLE = 'COVTEST-BT-V2';

        beforeAll(async () => {
            await pool.query(`
                INSERT INTO vehicles (vehicle_id, device_id, fleet_group_id)
                VALUES ($1, $2, $3)
            `, [CLOSE_VEHICLE, `${CLOSE_VEHICLE}-DEV`, groupId]);

            for (const offset of [200, 201, 202, 203]) {
                await pool.query(`
                    INSERT INTO clean_telemetry (time, vehicle_id, measurement, latitude, longitude, speed, ignition, movement)
                    VALUES ($1, $2, 'avl', -25.75, 28.23, 130, 'On', 'On')
                `, [minutesBefore(offset), CLOSE_VEHICLE]);
            }
            await refreshSpeedSummary();
        });

        test('collapses breaches inside the debounce window', async () => {
            const res = await backtest({
                condition_type: 'speed_threshold',
                condition_params: { max_speed_kmh: 125 },
                fleet_group_id: groupId,
                days: 7,
            });

            expect(res.body.data.total_alerts).toBe(1);
            expect(res.body.data.vehicles_affected).toBe(1);
        });
    });

    describe('safety_score_drop against real scores', () => {
        beforeAll(async () => {
            await pool.query(`
                INSERT INTO driver_daily_safety_scores (vehicle_id, score_date, safety_score)
                VALUES ($1, (data_now())::date, 35)
                ON CONFLICT DO NOTHING
            `, [VEHICLE]);
        });

        test('finds a vehicle below the threshold', async () => {
            const res = await backtest({
                condition_type: 'safety_score_drop',
                condition_params: { min_score: 60 },
                fleet_group_id: groupId,
                days: 7,
            });

            expect(res.status).toBe(200);
            expect(res.body.data.total_alerts).toBeGreaterThanOrEqual(1);
            expect(res.body.data.samples[0].breach_value).toBe(35);
            expect(res.body.data.samples[0].latitude).toBeNull();
        });

        test('finds nothing when the threshold is below every score', async () => {
            const res = await backtest({
                condition_type: 'safety_score_drop',
                condition_params: { min_score: 10 },
                fleet_group_id: groupId,
                days: 7,
            });

            expect(res.body.data.total_alerts).toBe(0);
        });
    });

    describe('repeated_unsafe_events against real events', () => {
        beforeAll(async () => {
            for (const offset of [300, 305, 308]) {
                await pool.query(`
                    INSERT INTO vehicle_events (time, vehicle_id, event_category, event_detail, latitude, longitude, speed)
                    VALUES ($1, $2, 'green_driving_type', 'harsh_braking', -25.75, 28.23, 60)
                `, [minutesBefore(offset), VEHICLE]);
            }
        });

        test('fires once the count is reached inside the window', async () => {
            const res = await backtest({
                condition_type: 'repeated_unsafe_events',
                condition_params: { event_types: ['harsh_braking'], count: 3, window_minutes: 60 },
                fleet_group_id: groupId,
                days: 7,
            });

            expect(res.status).toBe(200);
            expect(res.body.data.total_alerts).toBeGreaterThanOrEqual(1);
        });

        test('does not fire when the required count is higher than the events seeded', async () => {
            const res = await backtest({
                condition_type: 'repeated_unsafe_events',
                condition_params: { event_types: ['harsh_braking'], count: 10, window_minutes: 60 },
                fleet_group_id: groupId,
                days: 7,
            });

            expect(res.body.data.total_alerts).toBe(0);
        });
    });

    describeWithSummary('time_based_restriction against the speed summary', () => {
        test('returns breach times as HH:MM text, not null', async () => {
            const res = await backtest({
                condition_type: 'time_based_restriction',
                condition_params: { start_time: '00:00', end_time: '23:59' },
                fleet_group_id: groupId,
                days: 7,
            });

            expect(res.status).toBe(200);
            expect(res.body.data.total_alerts).toBeGreaterThanOrEqual(1);
            expect(res.body.data.samples[0].breach_value).toMatch(/^\d{2}:\d{2}$/);
        });
    });

    describe('validation against the real app', () => {
        test('rejects an unknown condition_type', async () => {
            const res = await backtest({
                condition_type: 'bogus',
                condition_params: {},
                fleet_group_id: groupId,
                days: 7,
            });
            expect(res.status).toBe(400);
        });

        test('rejects a days value outside the allowed set', async () => {
            const res = await backtest({
                condition_type: 'speed_threshold',
                condition_params: { max_speed_kmh: 90 },
                fleet_group_id: groupId,
                days: 45,
            });
            expect(res.status).toBe(400);
        });

        test('requires authentication', async () => {
            const res = await request(app)
                .post('/api/custom-alerts/backtest')
                .send({
                    condition_type: 'speed_threshold',
                    condition_params: { max_speed_kmh: 90 },
                    fleet_group_id: groupId,
                    days: 7,
                });
            expect(res.status).toBe(401);
        });
    });
});
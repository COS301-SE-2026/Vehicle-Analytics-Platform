const { createDbClient } = require('../testHelpers');

describe('Custom alerts schema test', () => {
    let client;

    const TEST_PREFIX = 'CA_TEST-';

    const cleanup = async () => {
        await client.query(`DELETE FROM triggered_alerts WHERE vehicle_id LIKE '${TEST_PREFIX}%'`);

        await client.query(`DELETE FROM custom_alert_rules WHERE name LIKE '${TEST_PREFIX}%'`);

        await client.query(`DELETE FROM vehicles WHERE vehicle_id LIKE '${TEST_PREFIX}%'`);

        await client.query(`DELETE FROM fleet_manager_assignments WHERE fleet_group_id IN (SELECT id FROM fleet_groups WHERE name LIKE '${TEST_PREFIX}%')`);

        await client.query(`DELETE FROM fleet_groups WHERE name LIKE '${TEST_PREFIX}%'`);

        await client.query(`DELETE FROM users WHERE email LIKE '${TEST_PREFIX}%'`);
    };

    let manager_id;

    let fleet_group_id;

    let vehicle_id;

    beforeAll(async () => {
        client = await createDbClient();
        await cleanup();

        const userResult = await client.query(`
            INSERT INTO users (cognito_sub, name, email, role)
            VALUES ($1, $2, $3, 'fleet_manager')
            RETURNING id
            `, [`${TEST_PREFIX}cognito-sub-1024`, `${TEST_PREFIX}Manager`, `${TEST_PREFIX}manager@example.com`]);
            manager_id = userResult.rows[0].id;

        const groupResult = await client.query(`
                INSERT INTO fleet_groups (name)
                VALUES ($1)
                RETURNING id
            `, [`${TEST_PREFIX}Group`]);
            fleet_group_id = groupResult.rows[0].id;

        await client.query(`INSERT INTO fleet_manager_assignments (fleet_manager_id, fleet_group_id, assigned_by)
                            VALUES ($1, $2, $1)`,
                        [manager_id, fleet_group_id]);

        vehicle_id = `${TEST_PREFIX}1024`;
        await client.query(`
            INSERT INTO vehicles (vehicle_id, fleet_group_id)
            VALUES ($1, $2)
            ON CONFLICT (vehicle_id) DO NOTHING`,
            [vehicle_id, fleet_group_id]);
    }, 30000);

    afterAll(async () => {
        if(client) {
            await cleanup();
            await client.end();
        }
    }, 30000);

    test('should create a custom alert rule with valid condition_type and status',async () => {
        const result = await client.query(`INSERT INTO custom_alert_rules (manager_id, fleet_group_id, name, condition_type, condition_params)
                                            VALUES ($1, $2, $3, 'speed_threshold', $4)
                                            RETURNING id, status`,
                                        [manager_id, fleet_group_id, `${TEST_PREFIX}Speed Rule`, JSON.stringify({ max_speed_km: 120})]);

        expect(result.rows.length).toBe(1);

        expect(result.rows[0].status).toBe('active');
    });

    test('should reject an invalid condition_type', async () => {
        await expect(client.query(`
            INSERS INTO custom_alert_rules (manager_id, fleet_group_id, name, condition_type, condition_params)
            VALUES ($1, $2, $3, 'not_a_real_type', '{}')`,
        [manager_id, fleet_group_id, `${TEST_PREFIX}Bad Type Rule`])).rejects.toThrow();
    });

    test('should reject an invalid status', async () => {
        await expect(client.query(`
            INSERS INTO custom_alert_rules (manager_id, fleet_group_id, name, condition_type, condition_params)
            VALUES ($1, $2, $3, 'speed_threshold', '{}', 'not_a_real_status')`,
        [manager_id, fleet_group_id, `${TEST_PREFIX}Bad Status Rule`])).rejects.toThrow();
    });

    test('should reject a rule with a fleet_group_id that does not exist', async () => {
        await expect(client.query(`
            INSERS INTO custom_alert_rules (manager_id, fleet_group_id, name, condition_type, condition_params)
            VALUES ($1, 999999999, $2, 'speed_threshold', '{}')`,
        [manager_id, fleet_group_id, `${TEST_PREFIX}Orphan Group Rule`])).rejects.toThrow();
    });

    test('should reject a rule with no condition_params', async () => {
        await expect(client.query(`
            INSERS INTO custom_alert_rules (manager_id, fleet_group_id, name, condition_type, condition_params)
            VALUES ($1, $2, $3, 'speed_threshold')`,
        [manager_id, fleet_group_id, `${TEST_PREFIX}No Params Rule`])).rejects.toThrow();
    });

    test('should create a triggered_alert linked to a rule and cascade delete when the rule is deleted', async () => {
        const ruleResult = await client.query(`
            INSERT INTO custom_alert_rules (manager_id, fleet_group_id, name, condition_type, condition_params)
            VALUES ($1, $2, $3, 'speed_threshold', $4)
            RETURNING id`,
        [manager_id, fleet_group_id, `${TEST_PREFIX}Cascade Rule`, JSON.stringify({ max_speed_km: 100})]);

        const rule_id = ruleResult.rows[0].id;

        const alertResult = await client.query(`
            INSERT INTO triggered_alerts (rule_id, vehicle_id, fleet_group_id, condition_type, breach_value, threshold_value)
            VALUES ($1, $2, $3, 'speed_threshold', '135', '100')
            RETURNING id`,
        [rule_id, vehicle_id, fleet_group_id]);

        const alert_id = alertResult.rows[0].id;

        let alertRes = await client.query(`SELECT * FROM triggered_alerts WHERE id = $1`, [alert_id]);

        expect(alertRes.rows.length).toBe(1);

        expect(alertRes.rows[0].acknowledged_at).toBeNull();

        expect(alertRes.rows[0].resolved_at).toBeNull();

        await client.query(`DELETE FROM custom_alert_rules WHERE id = $1`, [rule_id]);

        alertRes = await client.query(`SELECT * FROM triggered_alerts WHERE id = $1`, [alert_id]);

        expect(alertRes.rows.length).toBe(0);
    });

    test('should reject a triggered_alert for a vehicle that does not exist', async () => {
        const ruleResult = await client.query(`
            INSERT INTO custom_alert_rules (manager_id, fleet_group_id, name, condition_type, condition_params)
            VALUES ($1, $2, $3, 'speed_threshold', $4)
            RETURNING id`,
        [manager_id, fleet_group_id, `${TEST_PREFIX}Orphan Vehicle Rule`, JSON.stringify({ max_speed_km: 100})]);

        const rule_id = ruleResult.rows[0].id;

        await expect(client.query(`
            INSERT INTO custom_alert_rules (manager_id, fleet_group_id, name, condition_type, condition_params)
            VALUES ($1, 'DOES_NOT_EXIST-999, $2, 'speed_threshold', '135', '100')`,
        [rule_id, fleet_group_id])).rejects.toThrow();
    });

    test('should allow acknowledging a triggered_alert independently of resolving it', async () => {
        const ruleResult = await client.query(`
            INSERT INTO custom_alert_rules (manager_id, fleet_group_id, name, condition_type, condition_params)
            VALUES ($1, $2, $3, 'speed_threshold', $4)
            RETURNING id`,
        [manager_id, fleet_group_id, `${TEST_PREFIX}Ack Rule`, JSON.stringify({ max_speed_km: 100})]);

        const rule_id = ruleResult.rows[0].id;

        const alertResult = await client.query(`
            INSERT INTO triggered_alerts (rule_id, vehicle_id, fleet_group_id, condition_type, breach_value, threshold_value)
            VALUES ($1, $2, $3, 'speed_threshold', '135', '100')
            RETURNING id`,
        [rule_id, vehicle_id, fleet_group_id]);

        const alert_id = alertResult.rows[0].id;

        await client.query(`
            UPDATE triggered_alerts SET acknowledged_at = NOW() WHERE id = $1
        `, [alert_id]);

        const alertRes = await client.query(`SELECT acknowledged_at, resolved_at FROM triggered_alerts WHERE id = $1`, [alert_id]);

        expect(alertRes.rows[0].acknowledged_at).not.toBeNull();

        expect(alertRes.rows[0].resolved_at).toBeNull();
    });

       
})


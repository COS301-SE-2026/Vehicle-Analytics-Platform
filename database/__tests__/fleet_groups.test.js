const { Client } =  require('pg');
const {getDbConfig} = require('../testDbConfig');

describe('Fleet groupings schema', () => {
    let client;

    const dbConfig = getDbConfig();

    beforeAll(async () => {
        client = new Client(dbConfig);
        await client.connect();
    });

    afterAll(async () => {
        await client.end();
    });

    test('Fleet groupings table created successfully', async () => {
        const res = await client.query(`
            SELECT table_name FROM information_schema.tables WHERE table_schema='public'
        `);

        const tables = res.rows.map(row => row.table_name);
        
        expect(tables).toContain('fleet_groups');
        expect(tables).toContain('fleet_manager_assignments');
        expect(tables).toContain('fleet_assignment_audit_log');
    });

    test('vehicles table has fleet_group_id column', async () => {
        const res = await client.query(`
            SELECT column_name FROM information_schema.columns WHERE table_name='vehicles'
        `);

        const columns = res.rows.map(row => row.column_name);
        
        expect(columns).toContain('fleet_group_id');
    });

    test('duplicate fleet manager assignment is rejected', async () => {
        //Set up group + user to assign and clean up anything from a prev failed run
        //so this test can be rerun safely

        await client.query(`DELETE FROM fleet_groups WHERE name = 'COVTEST-Duplicate-Group'`);
        await client.query(`DELETE FROM users WHERE email = 'covtest-duplicate@example.com'`);

        const groupResult = await client.query(`
            INSERT INTO fleet_groups (name) VALUES ('COVTEST-Duplicate-Group') RETURNING id
        `);

        const groupId = groupResult.rows[0].id;

        const userResult = await client.query(`
            INSERT INTO users (cognito_sub, name, email, role)
            VALUES ('covtest-sub-1', 'COVTEST user', 'covtest-duplicate@example.com', 'fleet_manager')
            RETURNING id
        `);

        const userId = userResult.rows[0].id;

        //First assignment must succeed
        await client.query(`
                INSERT INTO fleet_manager_assignments (fleet_manager_id, fleet_group_id, assigned_by)
                VALUES ($1, $2, $3)
            `, [userId, groupId, userId]);
        
        //second. identical ass so should fail
        await expect(
            client.query(`
                INSERT INTO fleet_manager_assignments (fleet_manager_id, fleet_group_id, assigned_by)
                VALUES ($1, $2, $3)
            `, [userId, groupId, userId])
        ).rejects.toThrow(/duplicate key value violates unique constraint/);

        //clean up. audit log rows not cleaned as this is an append only table
        //keeps records
        await client.query(`DELETE FROM fleet_manager_assignments WHERE fleet_group_id = $1`, [groupId]);
        await client.query(`DELETE FROM fleet_groups WHERE id = $1`, [groupId]);
        await client.query(`DELETE FROM users WHERE id = $1`, [userId]);
        

    });

    test('vehicles.fleet_group_id is set to null when a group is deleted', async () => {
        await client.query(`DELETE FROM fleet_groups WHERE name = 'COVTEST-Cascade-Group'`);
        await client.query(`DELETE FROM vehicles WHERE vehicle_id = 'COVTEST-cascade-vehicle'`);

        const groupResult = await client.query(`
            INSERT INTO fleet_groups (name) VALUES ('COVTEST-Cascade-Group')
            RETURNING id
        `);

        const groupId = groupResult.rows[0].id;

        await client.query(`
            INSERT INTO vehicles (vehicle_id, device_id, fleet_group_id)
            VALUES ('COVTEST-cascade-vehicle', 'COVTEST-cascade-device', $1)
        `, [groupId]);

        await client.query(`DELETE FROM fleet_groups WHERE id = $1`, [groupId]);

        const vehicleResult = await client.query(`
            SELECT fleet_group_id FROM vehicles WHERE vehicle_id = 'COVTEST-cascade-vehicle'
        `);

        expect(vehicleResult.rows[0].fleet_group_id).toBeNull();
        

        await client.query(`DELETE FROM vehicles WHERE vehicle_id = 'COVTEST-cascade-vehicle'`);
    });
});
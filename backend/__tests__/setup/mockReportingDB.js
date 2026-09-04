const mockQuery = jest.fn();

const mockPool = {
    query: mockQuery,
    connect: jest.fn().mockResolvedValue({
    query: mockQuery,
    release: jest.fn(),
    }),
    
    end: jest.fn().mockResolvedValue(),

};

const DEFAULT_CLOCK_FIXTURE = {
    dataNowFnPresent: false,
    dataNow: null,
    latestTelemetry: '2026-08-22T04:13:00.000Z',
};


const DEFAULT_FLEET_FIXTURE = {
    groups: [
        { id: 1, name: 'Delivery Vehicles' },
        { id: 2, name: 'Long Distance' },
        { id: 3, name: 'Regional' },
    
    ],
    
    assignments: [
        { fleet_manager_id: 10, fleet_group_id: 1 },
        { fleet_manager_id: 10, fleet_group_id: 2 },
        { fleet_manager_id: 20, fleet_group_id: 3 },
    ],

    vehicles: [
        { vehicle_id: 'VH-001', fleet_group_id: 1 },
        { vehicle_id: 'VH-002', fleet_group_id: 1 },
        { vehicle_id: 'VH-003', fleet_group_id: 2 },
        { vehicle_id: 'VH-004', fleet_group_id: 3 },
        { vehicle_id: 'VH-005', fleet_group_id: null },
        { vehicle_id: 'VH-006', fleet_group_id: null },
    ],

};

const calls = [];

function asBigint(value){
    return value === null || value === undefined ? null : String(value);
}


function setupReportingMockData(fixture = {}){
    const {
        groups = DEFAULT_FLEET_FIXTURE.groups,
        assignments = DEFAULT_FLEET_FIXTURE.assignments,
        vehicles = DEFAULT_FLEET_FIXTURE.vehicles,
        clock = {},
    
    } = fixture;
    
    const {
        dataNowFnPresent = DEFAULT_CLOCK_FIXTURE.dataNowFnPresent,
        dataNow = DEFAULT_CLOCK_FIXTURE.dataNow,
        latestTelemetry = DEFAULT_CLOCK_FIXTURE.latestTelemetry,
    } = clock;
  
  mockQuery.mockReset();
  calls.length = 0;
  
  mockQuery.mockImplementation((sql, params = []) => {
    const normalizedSql = sql.toLowerCase();
    calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });



    if (normalizedSql.includes('to_regproc')){
        return Promise.resolve({
            rows: [{ present: dataNowFnPresent }],
            rowCount: 1,
      });
    }

    if (normalizedSql.includes('data_now() as data_now')){
        return Promise.resolve({ rows: [{ data_now: dataNow }], rowCount: 1 });
    }


    if (normalizedSql.includes('from current_vehicle_position')){
        return Promise.resolve({ rows: [{ data_now: latestTelemetry }], rowCount: 1 });
    }


    if (normalizedSql.includes('from fleet_manager_assignments')){
        const managerId = params[0];
        const assigned = assignments.filter((a) => a.fleet_manager_id === managerId).map((a) => a.fleet_group_id);

        const rows = groups
        .filter((g) => assigned.includes(g.id))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((g) => ({ id: asBigint(g.id), name: g.name }));

        return Promise.resolve({ rows, rowCount: rows.length });
    }



    if (normalizedSql.includes('from fleet_groups')){
        const rows = [...groups].sort((a, b) => a.name.localeCompare(b.name)).map((g) => ({ id: asBigint(g.id), name: g.name }));

        return Promise.resolve({ rows, rowCount: rows.length });
    }
    
    if (normalizedSql.includes('count(*)') && normalizedSql.includes('fleet_group_id is null')){
        const count = vehicles.filter((v) => v.fleet_group_id === null).length;
        return Promise.resolve({ rows: [{ count }], rowCount: 1 });
    }



    if (normalizedSql.includes('from vehicles') && normalizedSql.includes('where vehicle_id = $1')){
        const found = vehicles.find((v) => v.vehicle_id === params[0]);
        const rows = found ? [{ vehicle_id: found.vehicle_id, fleet_group_id: asBigint(found.fleet_group_id) }] : [];
        return Promise.resolve({ rows, rowCount: rows.length });
    }



    if (normalizedSql.includes('from vehicles')){
        const selected = normalizedSql.includes('fleet_group_id = any')
        ? vehicles.filter((v) => (params[0] || []).includes(v.fleet_group_id))
        : vehicles;
        
        const rows = [...selected].sort((a, b) => a.vehicle_id.localeCompare(b.vehicle_id)).map((v) => ({
            vehicle_id: v.vehicle_id,
            fleet_group_id: asBigint(v.fleet_group_id),
        }));

      return Promise.resolve({ rows, rowCount: rows.length });
    }


    return Promise.reject(new Error(
      `mockReportingDb: unhandled query, refusing to fabricate a row: ${normalizedSql}`,
    ));

  });

  return { pool: mockPool, query: mockQuery, calls };
}

module.exports = {
    mockPool,
    mockQuery,
    calls,
    setupReportingMockData,
    DEFAULT_FLEET_FIXTURE,
    DEFAULT_CLOCK_FIXTURE,
};


describe('Reporting Mock DB Setup', () => {
    test('reporting mock db loads correctly', () => {
        expect(typeof setupReportingMockData).toBe('function');
    });

  test('fails closed on an unrecognized query', async () => {
    const { pool } = setupReportingMockData();
    await expect(pool.query('SELECT * FROM something_else')).rejects.toThrow(/refusing to fabricate a row/);
  });
});
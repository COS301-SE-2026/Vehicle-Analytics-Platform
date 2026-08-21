'use strict';

const { setupReportingMockData, DEFAULT_FLEET_FIXTURE } = require('./setup/mockReportingDb');

const {
    resolveScope,
    getAccessibleGroups,
    assertCanReadReport,
    listAvailableScopes,
    ScopeError,
    SCOPE_TYPES,
    REPORTING_ROLES,
} = require('../src/services/scopeResolver');

function makeDb(fixture = DEFAULT_FLEET_FIXTURE) {
    const { pool, calls } = setupReportingMockData(fixture);
    return { query: pool.query, calls, pool };
}

const ADMIN = { id: 1, sub: 'admin-sub', email: 'a@x.co', role: 'admin' };
const MANAGER_A = { id: 10, sub: 'm10', email: 'a@x.co', role: 'fleet_manager' };
const MANAGER_B = { id: 20, sub: 'm20', email: 'b@x.co', role: 'fleet_manager' };
const VIEWER = { id: 30, sub: 'v30', email: 'v@x.co', role: 'viewer' };

async function expectScopeError(promise, statusCode, messagePattern) {
    await expect(promise).rejects.toBeInstanceOf(ScopeError);
    await promise.catch((err) => {
        expect(err.statusCode).toBe(statusCode);
        if (messagePattern) expect(err.message).toMatch(messagePattern);
    });
}

describe('scopeResolver - module contract', () => {
    test('supports fleet, group and vehicle scopes', () => {
        expect(SCOPE_TYPES).toEqual(['fleet', 'group', 'vehicle']);
    });

    test('driver scope is deliberately unsupported', () => {
        expect(SCOPE_TYPES).not.toContain('driver');
    });

    test('only admin and fleet_manager may report', () => {
        expect(REPORTING_ROLES).toEqual(['admin', 'fleet_manager']);
    });

    test('requires a usable database client', async () => {
        await expect(resolveScope(null, ADMIN, { scopeType: 'fleet' })).rejects.toThrow(/pg client or pool/);
        await expect(resolveScope({}, ADMIN, { scopeType: 'fleet' })).rejects.toThrow(/pg client or pool/);
    });
});

describe('caller authentication and role', () => {
    test('rejects an unauthenticated caller with 401', async () => {
        const db = makeDb();
        await expectScopeError(
            resolveScope(db, null, { scopeType: 'fleet' }), 401, /Authentication required/,
        );
        await expectScopeError(
            resolveScope(db, {}, { scopeType: 'fleet' }), 401, /Authentication required/,
        );
    });

    test('rejects a viewer with 403', async () => {
        const db = makeDb();
        await expectScopeError(
            resolveScope(db, VIEWER, { scopeType: 'fleet' }), 403, /Insufficient permissions/,
        );
    });

    test('rejects an unknown role with 403', async () => {
        const db = makeDb();
        await expectScopeError(
            resolveScope(db, { id: 5, role: 'superuser' }, { scopeType: 'fleet' }),
            403, /Insufficient permissions/,
        );
        await expectScopeError(
            resolveScope(db, { id: 5, role: null }, { scopeType: 'fleet' }),
            403, /Insufficient permissions/,
        );
    });

    test("treats the frontend/dev role alias 'manager' as fleet_manager", async () => {
        const db = makeDb();
        const scope = await resolveScope(db, { ...MANAGER_A, role: 'manager' }, { scopeType: 'fleet' });
        expect(scope.role).toBe('fleet_manager');
        expect(scope.vehicleIds).toEqual(['VH-001', 'VH-002', 'VH-003']);
    });

    test('role matching is case-insensitive', async () => {
        const db = makeDb();
        const scope = await resolveScope(db, { ...ADMIN, role: 'Admin' }, { scopeType: 'fleet' });
        expect(scope.role).toBe('admin');
    });

    test('a non-integer user id outside development fails closed with 401', async () => {
        const db = makeDb();
        const original = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        try {
            await expectScopeError(
                resolveScope(db, { id: 'dev-user', role: 'manager' }, { scopeType: 'fleet' }),
                401, /Authentication required/,
            );
        } finally {
            process.env.NODE_ENV = original;
        }
    });

    test("the development bypass identity resolves as admin in development only", async () => {
        const db = makeDb();
        const original = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';
        try {
            const devUser = {
                id: 'dev-user', sub: 'local-dev', email: 'dev@localhost', role: 'manager',
            };
            const scope = await resolveScope(db, devUser, { scopeType: 'fleet' });
            expect(scope.role).toBe('admin');
            expect(scope.vehicleIds).toHaveLength(6);
        } finally {
            process.env.NODE_ENV = original;
        }
    });
});

describe('getAccessibleGroups', () => {
    test('admin sees every group, ordered by name', async () => {
        const db = makeDb();
        const groups = await getAccessibleGroups(db, ADMIN);
        expect(groups).toEqual([
            { id: 1, name: 'Delivery Vehicles' },
            { id: 2, name: 'Long Distance' },
            { id: 3, name: 'Regional' },
        ]);
    });

    test('a manager sees only their assigned groups', async () => {
        const db = makeDb();
        expect(await getAccessibleGroups(db, MANAGER_A))
            .toEqual([{ id: 1, name: 'Delivery Vehicles' }, { id: 2, name: 'Long Distance' }]);
        expect(await getAccessibleGroups(db, MANAGER_B))
            .toEqual([{ id: 3, name: 'Regional' }]);
    });

    test("filters by the manager's own user id in SQL, not afterwards", async () => {
        const db = makeDb();
        await getAccessibleGroups(db, MANAGER_A);
        const assignmentQuery = db.calls.find((c) => c.sql.includes('fleet_manager_assignments'));
        expect(assignmentQuery.params).toEqual([10]);
        expect(assignmentQuery.sql).toMatch(/a\.fleet_manager_id = \$1/);
    });

    test('group ids returned by pg as int8 strings are normalised to numbers', async () => {
        const db = makeDb();
        const groups = await getAccessibleGroups(db, MANAGER_A);
        groups.forEach((g) => expect(typeof g.id).toBe('number'));
    });

    test('a manager with no assignments gets an empty list, not an error', async () => {
        const db = makeDb();
        const groups = await getAccessibleGroups(db, { id: 99, role: 'fleet_manager' });
        expect(groups).toEqual([]);
    });
});

describe('fleet scope', () => {
    test('a manager receives only vehicles from their assigned groups', async () => {
        const db = makeDb();
        const scope = await resolveScope(db, MANAGER_A, { scopeType: 'fleet' });

        expect(scope.vehicleIds).toEqual(['VH-001', 'VH-002', 'VH-003']);
        expect(scope.groupIds).toEqual([1, 2]);
        expect(scope.vehicleCount).toBe(3);
        expect(scope.label).toBe('Assigned fleet');
        expect(scope.scopeId).toBeNull();
    });

    test("a manager's fleet excludes other managers' vehicles", async () => {
        const db = makeDb();
        const scope = await resolveScope(db, MANAGER_A, { scopeType: 'fleet' });
        expect(scope.vehicleIds).not.toContain('VH-004');
    });

    test("a manager's fleet excludes ungrouped vehicles", async () => {
        const db = makeDb();
        const scope = await resolveScope(db, MANAGER_A, { scopeType: 'fleet' });
        expect(scope.vehicleIds).not.toContain('VH-005');
        expect(scope.vehicleIds).not.toContain('VH-006');
    });

    test('admin fleet scope includes ungrouped vehicles', async () => {
        const db = makeDb();
        const scope = await resolveScope(db, ADMIN, { scopeType: 'fleet' });
        expect(scope.vehicleIds).toHaveLength(6);
        expect(scope.vehicleIds).toContain('VH-005');
        expect(scope.label).toBe('Entire fleet');
    });

    test('ungrouped vehicles are reported as metadata so they are not invisible', async () => {
        const db = makeDb();
        const scope = await resolveScope(db, MANAGER_A, { scopeType: 'fleet' });
        expect(scope.unassignedVehicleCount).toBe(2);
    });

    test('a manager with no assignments resolves to an empty scope, not a 403', async () => {
        const db = makeDb();
        const scope = await resolveScope(db, { id: 99, role: 'fleet_manager' }, { scopeType: 'fleet' });
        expect(scope.vehicleIds).toEqual([]);
        expect(scope.groupIds).toEqual([]);
        expect(scope.vehicleCount).toBe(0);
    });

    test('an unconfigured deployment (vehicles, no groups) resolves empty for a manager', async () => {
        const db = makeDb({
            groups: [],
            assignments: [],
            vehicles: [{ vehicle_id: 'VH-001', fleet_group_id: null }],
        });
        const scope = await resolveScope(db, MANAGER_A, { scopeType: 'fleet' });
        expect(scope.vehicleIds).toEqual([]);
        expect(scope.unassignedVehicleCount).toBe(1);
    });
});

describe('group scope', () => {
    test('a manager may report on a group they are assigned to', async () => {
        const db = makeDb();
        const scope = await resolveScope(db, MANAGER_A, { scopeType: 'group', scopeId: 1 });

        expect(scope.vehicleIds).toEqual(['VH-001', 'VH-002']);
        expect(scope.groupIds).toEqual([1]);
        expect(scope.label).toBe('Delivery Vehicles');
        expect(scope.scopeId).toBe('1');
    });

    test('a manager may NOT report on another manager\'s group', async () => {
        const db = makeDb();
        await expectScopeError(
            resolveScope(db, MANAGER_A, { scopeType: 'group', scopeId: 3 }), 403,
        );
    });

    test('admin may report on any group', async () => {
        const db = makeDb();
        const scope = await resolveScope(db, ADMIN, { scopeType: 'group', scopeId: 3 });
        expect(scope.vehicleIds).toEqual(['VH-004']);
    });

    test('a nonexistent group is refused with the same message as an unauthorised one', async () => {
        const db = makeDb();
        let unauthorisedMessage;
        let missingMessage;

        await resolveScope(db, MANAGER_A, { scopeType: 'group', scopeId: 3 }).catch((e) => { unauthorisedMessage = e.message; });
        await resolveScope(db, MANAGER_A, { scopeType: 'group', scopeId: 9999 }).catch((e) => { missingMessage = e.message; });
        expect(unauthorisedMessage).toBe(missingMessage);
    });

    test('accepts a numeric string scopeId as sent over HTTP', async () => {
        const db = makeDb();
        const scope = await resolveScope(db, MANAGER_A, { scopeType: 'group', scopeId: '1' });
        expect(scope.groupIds).toEqual([1]);
    });

    test('rejects a missing or non-numeric scopeId with 400', async () => {
        const db = makeDb();
        await expectScopeError(
            resolveScope(db, MANAGER_A, { scopeType: 'group' }), 400, /numeric scopeId/,
        );
        await expectScopeError(
            resolveScope(db, MANAGER_A, { scopeType: 'group', scopeId: 'abc' }), 400, /numeric scopeId/,
        );
        await expectScopeError(
            resolveScope(db, MANAGER_A, { scopeType: 'group', scopeId: 1.5 }), 400, /numeric scopeId/,
        );
    });

    test('an authorised but empty group resolves with no vehicles', async () => {
        const db = makeDb({
            groups: [{ id: 7, name: 'New Group' }],
            assignments: [{ fleet_manager_id: 10, fleet_group_id: 7 }],
            vehicles: [],
        });
        const scope = await resolveScope(db, MANAGER_A, { scopeType: 'group', scopeId: 7 });
        expect(scope.vehicleIds).toEqual([]);
        expect(scope.label).toBe('New Group');
    });
});


describe('vehicle scope', () => {
    test('a manager may report on a vehicle in their group', async () => {
        const db = makeDb();
        const scope = await resolveScope(db, MANAGER_A, { scopeType: 'vehicle', scopeId: 'VH-001' });

        expect(scope.vehicleIds).toEqual(['VH-001']);
        expect(scope.groupIds).toEqual([1]);
        expect(scope.label).toBe('VH-001');
        expect(scope.vehicleCount).toBe(1);
    });

    test("a manager may NOT report on a vehicle in another manager's group", async () => {
        const db = makeDb();
        await expectScopeError(
            resolveScope(db, MANAGER_A, { scopeType: 'vehicle', scopeId: 'VH-004' }), 403,
        );
    });

    test('a manager may NOT report on an ungrouped vehicle', async () => {
        const db = makeDb();
        await expectScopeError(
            resolveScope(db, MANAGER_A, { scopeType: 'vehicle', scopeId: 'VH-005' }), 403,
        );
    });

    test('admin may report on an ungrouped vehicle', async () => {
        const db = makeDb();
        const scope = await resolveScope(db, ADMIN, { scopeType: 'vehicle', scopeId: 'VH-005' });
        expect(scope.vehicleIds).toEqual(['VH-005']);
        expect(scope.groupIds).toEqual([]);
    });

    test('a nonexistent vehicle is refused identically to an unauthorised one', async () => {
        const db = makeDb();
        let unauthorised;
        let missing;
        await resolveScope(db, MANAGER_A, { scopeType: 'vehicle', scopeId: 'VH-004' })
            .catch((e) => { unauthorised = e.message; });
        await resolveScope(db, MANAGER_A, { scopeType: 'vehicle', scopeId: 'NOPE' })
            .catch((e) => { missing = e.message; });
        expect(unauthorised).toBe(missing);
    });

    test('vehicle_id is treated as TEXT, and trimmed', async () => {
        const db = makeDb();
        const scope = await resolveScope(db, MANAGER_A, { scopeType: 'vehicle', scopeId: '  VH-001  ' });
        expect(scope.vehicleIds).toEqual(['VH-001']);
    });

    test('rejects a missing, blank or non-string vehicle id with 400', async () => {
        const db = makeDb();
        await expectScopeError(
            resolveScope(db, MANAGER_A, { scopeType: 'vehicle' }), 400, /vehicle_id is required/,
        );
        await expectScopeError(
            resolveScope(db, MANAGER_A, { scopeType: 'vehicle', scopeId: '   ' }), 400,
        );
        await expectScopeError(
            resolveScope(db, MANAGER_A, { scopeType: 'vehicle', scopeId: 42 }), 400,
        );
    });

    test('the vehicle lookup is parameterised', async () => {
        const db = makeDb();
        await resolveScope(db, MANAGER_A, { scopeType: 'vehicle', scopeId: 'VH-001' });
        const lookup = db.calls.find((c) => c.sql.includes('WHERE vehicle_id = $1'));
        expect(lookup.params).toEqual(['VH-001']);
    });
});

describe('invalid scope requests', () => {
    test('rejects an unknown scope type with 400', async () => {
        const db = makeDb();
        await expectScopeError(
            resolveScope(db, MANAGER_A, { scopeType: 'driver', scopeId: 'D-1' }), 400, /Invalid scopeType/,
        );
        await expectScopeError(
            resolveScope(db, MANAGER_A, { scopeType: 'everything' }), 400, /Invalid scopeType/,
        );
        await expectScopeError(resolveScope(db, MANAGER_A, {}), 400, /Invalid scopeType/);
    });

    test('an unauthenticated caller is rejected before any query runs', async () => {
        const db = makeDb();
        await resolveScope(db, null, { scopeType: 'fleet' }).catch(() => {});
        expect(db.query).not.toHaveBeenCalled();
    });

    test('a viewer is rejected before any query runs', async () => {
        const db = makeDb();
        await resolveScope(db, VIEWER, { scopeType: 'fleet' }).catch(() => {});
        expect(db.query).not.toHaveBeenCalled();
    });
});


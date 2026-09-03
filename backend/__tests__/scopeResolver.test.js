'use strict';

const {
    resolveScope,
    getAccessibleGroups,
    assertCanReadReport,
    listAvailableScopes,
    ScopeError,
    SCOPE_TYPES,
    REPORTING_ROLES,
	MAX_VEHICLES_IN_SCOPE,
} = require('../src/services/scopeResolver');

const GROUPS = {
	ALL: [
		{ id: '1', name: 'Delivery' },
		{ id: '2', name: 'Long distance' },
		{ id: '3', name: 'Regional' },
	],
	ASSIGNED: [
		{ id: '1', name: 'Delivery' },
		{ id: '2', name: 'Long distance' },
	],
};

const VEHICLES = [
	{ vehicle_id: 'V001', fleet_group_id: '1' },
	{ vehicle_id: 'V002', fleet_group_id: '1' },
	{ vehicle_id: 'V003', fleet_group_id: '2' },
	{ vehicle_id: 'V004', fleet_group_id: '3' },
	{ vehicle_id: 'V005', fleet_group_id: null },
];

const ADMIN = { id: 1, role: 'admin' };
const MANAGER = { id: 7, role: 'fleet_manager' };

function makeDb(overrides = {}){
	const {
		allGroups = GROUPS.ALL,
		assignedGroups = GROUPS.ASSIGNED,
		vehicles = VEHICLES,
		unassignedCount = 1,
	} = overrides;

	const calls = [];

	const query = jest.fn((sql, params) => {
		const s = sql.toLowerCase();
		calls.push({ sql: s, params });

		if (s.includes('fleet_manager_assignments')) {
			return Promise.resolve({ rows: assignedGroups, rowCount: assignedGroups.length });
		}

		if (s.includes('from fleet_groups')) {
			return Promise.resolve({ rows: allGroups, rowCount: allGroups.length });
		}

		if (s.includes('fleet_group_id is null')) {
			return Promise.resolve({ rows: [{ count: unassignedCount }], rowCount: 1 });
		}

		if (s.includes('vehicle_id = any($1::text[])')) {
			const requested = params[0];
			const rows = vehicles
				.filter((v) => requested.includes(v.vehicle_id))
				.sort((a, b) => a.vehicle_id.localeCompare(b.vehicle_id));
			return Promise.resolve({ rows, rowCount: rows.length });
		}

		if (s.includes('vehicle_id, fleet_group_id') && s.includes('fleet_group_id = any')) {
			const groupIds = params[0];
			const rows = vehicles.filter((v) => groupIds.includes(Number(v.fleet_group_id)));
			return Promise.resolve({ rows, rowCount: rows.length });
		}

		if (s.includes('vehicle_id, fleet_group_id')) {
			return Promise.resolve({ rows: vehicles, rowCount: vehicles.length });
		}

		if (s.includes('fleet_group_id = any')) {
			const groupIds = params[0];
			const rows = vehicles
				.filter((v) => v.fleet_group_id !== null && groupIds.includes(Number(v.fleet_group_id)))
				.map((v) => ({ vehicle_id: v.vehicle_id }));
			return Promise.resolve({ rows, rowCount: rows.length });
		}

		if (s.includes('select vehicle_id from vehicles')) {
			const rows = vehicles.map((v) => ({ vehicle_id: v.vehicle_id }));
			return Promise.resolve({ rows, rowCount: rows.length });
		}

		throw new Error(`Unexpected SQL in test: ${sql}`);
	});

	return { query, calls };
}

describe('scopeResolver - exported contract', () => {
	test('supports the four documented scope types', () => {
		expect(SCOPE_TYPES).toEqual(['fleet', 'group', 'vehicle', 'vehicles']);
	});

	test('only admins and fleet managers may request reports', () => {
		expect(REPORTING_ROLES).toEqual(['admin', 'fleet_manager']);
	});

	test('caps a multi-vehicle comparison at 25 vehicles', () => {
		expect(MAX_VEHICLES_IN_SCOPE).toBe(25);
	});

	test('ScopeError carries an HTTP status code', () => {
		const err = new ScopeError('nope', 403);
		expect(err).toBeInstanceOf(Error);
		expect(err.name).toBe('ScopeError');
		expect(err.statusCode).toBe(403);
	});

	test('ScopeError defaults to 403', () => {
		expect(new ScopeError('nope').statusCode).toBe(403);
	});
});

describe('resolveScope() - guard clauses', () => {
	test('rejects a db handle without a query function', async () => {
		await expect(resolveScope(null, ADMIN)).rejects.toThrow(
			'resolveScope requires a pg client or pool',
		);
		await expect(resolveScope({}, ADMIN)).rejects.toThrow(
			'resolveScope requires a pg client or pool',
		);
	});

	test('rejects an unknown scopeType with 400', async () => {
		const db = makeDb();
		await expect(resolveScope(db, ADMIN, { scopeType: 'driver' }))
			.rejects.toMatchObject({ statusCode: 400, message: 'Invalid scopeType' });
	});

	test('defaults to fleet scope when none is requested', async () => {
		const scope = await resolveScope(makeDb(), ADMIN);
		expect(scope.scopeType).toBe('fleet');
	});
});

describe('resolveScope() - authentication and roles', () => {
	test.each([
		['no user', undefined],
		['null user', null],
		['user without an id', { role: 'admin' }],
		['user with a null id', { id: null, role: 'admin' }],
	])('rejects %s with 401', async (_label, user) => {
		await expect(resolveScope(makeDb(), user))
			.rejects.toMatchObject({ statusCode: 401, message: 'Authentication required' });
	});

	test('rejects a viewer with 403', async () => {
		await expect(resolveScope(makeDb(), { id: 3, role: 'viewer' }))
			.rejects.toMatchObject({ statusCode: 403, message: 'Insufficient permissions' });
	});

	test.each([
		['an unrecognised role', 'driver'],
		['an empty role', ''],
		['a non-string role', 42],
		['a missing role', undefined],
	])('rejects %s with 403', async (_label, role) => {
		await expect(resolveScope(makeDb(), { id: 9, role }))
			.rejects.toMatchObject({ statusCode: 403 });
	});

	test('accepts "manager" as an alias for fleet_manager', async () => {
		const scope = await resolveScope(makeDb(), { id: 7, role: 'manager' });
		expect(scope.role).toBe('fleet_manager');
	});

	test('role matching is case insensitive', async () => {
		const scope = await resolveScope(makeDb(), { id: 7, role: 'Fleet_Manager' });
		expect(scope.role).toBe('fleet_manager');
	});

	test('rejects a non-integer id outside development with 401', async () => {
		await expect(resolveScope(makeDb(), { id: 'cognito-sub-abc', role: 'admin' }))
			.rejects.toMatchObject({ statusCode: 401 });
	});

	describe('development bypass', () => {
		const previousEnv = process.env.NODE_ENV;

		beforeEach(() => {
			process.env.NODE_ENV = 'development';
		});

		afterEach(() => {
			process.env.NODE_ENV = previousEnv;
		});

		test('treats a non-integer id as admin in development only', async () => {
			const scope = await resolveScope(makeDb(), { id: 'cognito-sub-abc', role: 'fleet_manager' });

			expect(scope.role).toBe('admin');
			expect(scope.label).toBe('Entire fleet');
		});

		test('still rejects a viewer in development', async () => {
			await expect(resolveScope(makeDb(), { id: 'sub-abc', role: 'viewer' }))
				.rejects.toMatchObject({ statusCode: 403 });
		});
	});
});

describe('resolveScope() - fleet scope', () => {
	test('an admin sees every vehicle in the system', async () => {
		const scope = await resolveScope(makeDb(), ADMIN, { scopeType: 'fleet' });

		expect(scope.label).toBe('Entire fleet');
		expect(scope.vehicleIds).toEqual(['V001', 'V002', 'V003', 'V004', 'V005']);
		expect(scope.vehicleCount).toBe(5);
		expect(scope.role).toBe('admin');
	});

	test('a fleet manager sees only vehicles in their assigned groups', async () => {
		const scope = await resolveScope(makeDb(), MANAGER, { scopeType: 'fleet' });

		expect(scope.label).toBe('Assigned fleet');
		expect(scope.vehicleIds).toEqual(['V001', 'V002', 'V003']);
		expect(scope.vehicleIds).not.toContain('V004');
	});

	test('an unassigned vehicle is excluded from a manager fleet scope', async () => {
		const scope = await resolveScope(makeDb(), MANAGER, { scopeType: 'fleet' });
		expect(scope.vehicleIds).not.toContain('V005');
	});

	test('group ids are coerced from BIGINT strings to numbers', async () => {
		const scope = await resolveScope(makeDb(), MANAGER, { scopeType: 'fleet' });

		expect(scope.groupIds).toEqual([1, 2]);
		scope.groupIds.forEach((id) => expect(typeof id).toBe('number'));
	});

	test('reports the count of vehicles with no group as a data quality signal', async () => {
		const scope = await resolveScope(makeDb({ unassignedCount: 4 }), ADMIN);
		expect(scope.unassignedVehicleCount).toBe(4);
	});

	test('a manager with no assignments resolves to an empty scope, not an error', async () => {
		const db = makeDb({ assignedGroups: [] });
		const scope = await resolveScope(db, MANAGER, { scopeType: 'fleet' });

		expect(scope.vehicleIds).toEqual([]);
		expect(scope.vehicleCount).toBe(0);
		expect(scope.groupIds).toEqual([]);
	});

	test('an empty group list does not trigger a vehicle lookup', async () => {
		const db = makeDb({ assignedGroups: [] });
		await resolveScope(db, MANAGER, { scopeType: 'fleet' });

		const vehicleLookups = db.calls.filter((c) => c.sql.includes('fleet_group_id = any'));
		expect(vehicleLookups).toHaveLength(0);
	});

	test('fleet scope has a null scopeId', async () => {
		const scope = await resolveScope(makeDb(), ADMIN);
		expect(scope.scopeId).toBeNull();
	});
});

describe('resolveScope() - group scope', () => {
	test('resolves an assigned group by numeric id', async () => {
		const scope = await resolveScope(makeDb(), MANAGER, { scopeType: 'group', scopeId: 1 });

		expect(scope.scopeType).toBe('group');
		expect(scope.scopeId).toBe('1');
		expect(scope.label).toBe('Delivery');
		expect(scope.vehicleIds).toEqual(['V001', 'V002']);
		expect(scope.groupIds).toEqual([1]);
	});

	test('accepts a numeric string scopeId from a query parameter', async () => {
		const scope = await resolveScope(makeDb(), MANAGER, { scopeType: 'group', scopeId: '2' });

		expect(scope.label).toBe('Long distance');
		expect(scope.vehicleIds).toEqual(['V003']);
	});

	test('blocks a manager from a group they are not assigned to', async () => {
		await expect(resolveScope(makeDb(), MANAGER, { scopeType: 'group', scopeId: 3 }))
			.rejects.toMatchObject({ statusCode: 403, message: 'Scope not found or not authorized' });
	});

	test('an admin may read any group', async () => {
		const scope = await resolveScope(makeDb(), ADMIN, { scopeType: 'group', scopeId: 3 });
		expect(scope.label).toBe('Regional');
	});

	test('a non-existent group is refused with the same message as an unauthorised one', async () => {
		await expect(resolveScope(makeDb(), ADMIN, { scopeType: 'group', scopeId: 999 }))
			.rejects.toMatchObject({ statusCode: 403, message: 'Scope not found or not authorized' });
	});

	test.each([
		['a missing scopeId', undefined],
		['a null scopeId', null],
		['a non-numeric scopeId', 'delivery'],
		['a fractional scopeId', 1.5],
	])('rejects %s with 400', async (_label, scopeId) => {
		await expect(resolveScope(makeDb(), MANAGER, { scopeType: 'group', scopeId }))
			.rejects.toMatchObject({ statusCode: 400 });
	});
});

describe('resolveScope() - single vehicle scope', () => {
	test('resolves a vehicle inside an assigned group', async () => {
		const scope = await resolveScope(makeDb(), MANAGER, { scopeType: 'vehicle', scopeId: 'V001' });

		expect(scope.scopeType).toBe('vehicle');
		expect(scope.scopeId).toBe('V001');
		expect(scope.label).toBe('V001');
		expect(scope.vehicleIds).toEqual(['V001']);
		expect(scope.vehicleCount).toBe(1);
		expect(scope.groupIds).toEqual([1]);
	});

	test('trims surrounding whitespace from the vehicle id', async () => {
		const scope = await resolveScope(makeDb(), MANAGER, { scopeType: 'vehicle', scopeId: '  V001  ' });
		expect(scope.vehicleIds).toEqual(['V001']);
	});

	test('blocks a vehicle in a group the manager does not have', async () => {
		await expect(resolveScope(makeDb(), MANAGER, { scopeType: 'vehicle', scopeId: 'V004' }))
			.rejects.toMatchObject({ statusCode: 403, message: 'Scope not found or not authorized' });
	});

	test('blocks a vehicle with no group for a manager', async () => {
		await expect(resolveScope(makeDb(), MANAGER, { scopeType: 'vehicle', scopeId: 'V005' }))
			.rejects.toMatchObject({ statusCode: 403 });
	});

	test('an admin may read an ungrouped vehicle', async () => {
		const scope = await resolveScope(makeDb(), ADMIN, { scopeType: 'vehicle', scopeId: 'V005' });

		expect(scope.vehicleIds).toEqual(['V005']);
		expect(scope.groupIds).toEqual([]);
	});

	test('a non-existent vehicle is refused rather than returning an empty scope', async () => {
		await expect(resolveScope(makeDb(), ADMIN, { scopeType: 'vehicle', scopeId: 'GHOST' }))
			.rejects.toMatchObject({ statusCode: 403 });
	});

	test.each([
		['a missing scopeId', undefined],
		['a null scopeId', null],
		['an empty string', ''],
		['a whitespace-only string', '   '],
		['a numeric scopeId', 1001],
	])('rejects %s with 400', async (_label, scopeId) => {
		await expect(resolveScope(makeDb(), MANAGER, { scopeType: 'vehicle', scopeId }))
			.rejects.toMatchObject({ statusCode: 400 });
	});
});

describe('resolveScope() - multi vehicle scope', () => {
	test('resolves a list of authorised vehicles', async () => {
		const scope = await resolveScope(makeDb(), MANAGER, {
			scopeType: 'vehicles',
			scopeId: ['V001', 'V003'],
		});

		expect(scope.scopeType).toBe('vehicles');
		expect(scope.vehicleIds).toEqual(['V001', 'V003']);
		expect(scope.vehicleCount).toBe(2);
		expect(scope.label).toBe('2 selected vehicles');
		expect(scope.groupIds).toEqual([1, 2]);
	});

	test('a single-element list is labelled with the vehicle id', async () => {
		const scope = await resolveScope(makeDb(), MANAGER, {
			scopeType: 'vehicles',
			scopeId: ['V001'],
		});

		expect(scope.label).toBe('V001');
	});

	test('accepts a bare string and treats it as a one-element list', async () => {
		const scope = await resolveScope(makeDb(), MANAGER, {
			scopeType: 'vehicles',
			scopeId: 'V002',
		});

		expect(scope.vehicleIds).toEqual(['V002']);
	});

	test('de-duplicates repeated ids', async () => {
		const scope = await resolveScope(makeDb(), MANAGER, {
			scopeType: 'vehicles',
			scopeId: ['V001', 'V001', ' V001 '],
		});

		expect(scope.vehicleIds).toEqual(['V001']);
	});

	test('discards non-string entries', async () => {
		const scope = await resolveScope(makeDb(), MANAGER, {
			scopeType: 'vehicles',
			scopeId: ['V001', null, 42, undefined, ''],
		});

		expect(scope.vehicleIds).toEqual(['V001']);
	});

	test('refuses the whole request if any one vehicle is unauthorised', async () => {
		await expect(resolveScope(makeDb(), MANAGER, {
			scopeType: 'vehicles',
			scopeId: ['V001', 'V004'],
		})).rejects.toMatchObject({ statusCode: 403 });
	});

	test('refuses the whole request if any one vehicle does not exist', async () => {
		await expect(resolveScope(makeDb(), ADMIN, {
			scopeType: 'vehicles',
			scopeId: ['V001', 'GHOST'],
		})).rejects.toMatchObject({ statusCode: 403 });
	});

	test.each([
		['an empty array', []],
		['an array of blanks', ['', '  ']],
		['a null scopeId', null],
	])('rejects %s with 400', async (_label, scopeId) => {
		await expect(resolveScope(makeDb(), MANAGER, { scopeType: 'vehicles', scopeId }))
			.rejects.toMatchObject({ statusCode: 400 });
	});

	test('allows exactly the maximum number of vehicles', async () => {
		const ids = Array.from({ length: MAX_VEHICLES_IN_SCOPE }, (_, i) => `B${i}`);
		const vehicles = ids.map((id) => ({ vehicle_id: id, fleet_group_id: '1' }));

		const scope = await resolveScope(makeDb({ vehicles }), MANAGER, {
			scopeType: 'vehicles',
			scopeId: ids,
		});

		expect(scope.vehicleCount).toBe(MAX_VEHICLES_IN_SCOPE);
	});

	test('rejects one vehicle over the maximum with 400', async () => {
		const ids = Array.from({ length: MAX_VEHICLES_IN_SCOPE + 1 }, (_, i) => `B${i}`);

		await expect(resolveScope(makeDb(), MANAGER, { scopeType: 'vehicles', scopeId: ids }))
			.rejects.toMatchObject({
				statusCode: 400,
				message: `A comparison may include at most ${MAX_VEHICLES_IN_SCOPE} vehicles`,
			});
	});

	test('the vehicle limit is checked before the database is queried', async () => {
		const db = makeDb();
		const ids = Array.from({ length: 100 }, (_, i) => `B${i}`);

		await expect(resolveScope(db, MANAGER, { scopeType: 'vehicles', scopeId: ids }))
			.rejects.toMatchObject({ statusCode: 400 });

		expect(db.calls.some((c) => c.sql.includes('vehicle_id = any($1::text[])'))).toBe(false);
	});
});

describe('getAccessibleGroups()', () => {
	test('an admin gets every group', async () => {
		const groups = await getAccessibleGroups(makeDb(), ADMIN);

		expect(groups).toEqual([
			{ id: 1, name: 'Delivery' },
			{ id: 2, name: 'Long distance' },
			{ id: 3, name: 'Regional' },
		]);
	});

	test('a manager gets only assigned groups', async () => {
		const groups = await getAccessibleGroups(makeDb(), MANAGER);

		expect(groups.map((g) => g.name)).toEqual(['Delivery', 'Long distance']);
	});

	test('queries the assignment table with the manager id', async () => {
		const db = makeDb();
		await getAccessibleGroups(db, MANAGER);

		const call = db.calls.find((c) => c.sql.includes('fleet_manager_assignments'));
		expect(call.params).toEqual([MANAGER.id]);
	});

	test('an admin never touches the assignment table', async () => {
		const db = makeDb();
		await getAccessibleGroups(db, ADMIN);

		expect(db.calls.some((c) => c.sql.includes('fleet_manager_assignments'))).toBe(false);
	});

	test('enforces the same role checks as resolveScope', async () => {
		await expect(getAccessibleGroups(makeDb(), { id: 3, role: 'viewer' }))
			.rejects.toMatchObject({ statusCode: 403 });
	});
});

describe('assertCanReadReport()', () => {
	test('an admin may read a report for any group', async () => {
		await expect(assertCanReadReport(makeDb(), ADMIN, [3])).resolves.toBeUndefined();
	});

	test('an admin check does not query the group tables', async () => {
		const db = makeDb();
		await assertCanReadReport(db, ADMIN, [3]);
		expect(db.calls).toHaveLength(0);
	});

	test('a manager may read a report covering one of their groups', async () => {
		await expect(assertCanReadReport(makeDb(), MANAGER, [1])).resolves.toBeUndefined();
	});

	test('a partial overlap is enough to authorise a read', async () => {
		await expect(assertCanReadReport(makeDb(), MANAGER, [1, 3])).resolves.toBeUndefined();
	});

	test('blocks a manager when no group overlaps', async () => {
		await expect(assertCanReadReport(makeDb(), MANAGER, [3]))
			.rejects.toMatchObject({ statusCode: 403 });
	});

	test('blocks a report with no group ids at all', async () => {
		await expect(assertCanReadReport(makeDb(), MANAGER, []))
			.rejects.toMatchObject({ statusCode: 403 });
	});

	test('blocks when group ids are missing entirely', async () => {
		await expect(assertCanReadReport(makeDb(), MANAGER, null))
			.rejects.toMatchObject({ statusCode: 403 });
	});

	test('accepts BIGINT strings in stored report metadata', async () => {
		await expect(assertCanReadReport(makeDb(), MANAGER, ['1'])).resolves.toBeUndefined();
	});

	test('ignores unparseable group ids', async () => {
		await expect(assertCanReadReport(makeDb(), MANAGER, ['abc', null]))
			.rejects.toMatchObject({ statusCode: 403 });
	});

	test('rejects an unauthenticated reader', async () => {
		await expect(assertCanReadReport(makeDb(), null, [1]))
			.rejects.toMatchObject({ statusCode: 401 });
	});
});

describe('listAvailableScopes()', () => {
	test('an admin sees all groups and all vehicles', async () => {
		const result = await listAvailableScopes(makeDb(), ADMIN);

		expect(result.role).toBe('admin');
		expect(result.groups).toHaveLength(3);
		expect(result.vehicles).toHaveLength(5);
	});

	test('a manager sees only their groups and their vehicles', async () => {
		const result = await listAvailableScopes(makeDb(), MANAGER);

		expect(result.role).toBe('fleet_manager');
		expect(result.groups.map((g) => g.id)).toEqual([1, 2]);
		expect(result.vehicles.map((v) => v.vehicleId)).toEqual(['V001', 'V002', 'V003']);
	});

	test('decorates each vehicle with its group name', async () => {
		const result = await listAvailableScopes(makeDb(), MANAGER);

		expect(result.vehicles[0]).toEqual({
			vehicleId: 'V001',
			groupId: 1,
			groupName: 'Delivery',
		});
	});

	test('an ungrouped vehicle has a null group id and name', async () => {
		const result = await listAvailableScopes(makeDb(), ADMIN);
		const ungrouped = result.vehicles.find((v) => v.vehicleId === 'V005');

		expect(ungrouped).toEqual({ vehicleId: 'V005', groupId: null, groupName: null });
	});

	test('includes the unassigned vehicle count', async () => {
		const result = await listAvailableScopes(makeDb({ unassignedCount: 2 }), ADMIN);
		expect(result.unassignedVehicleCount).toBe(2);
	});

	test('rejects a viewer', async () => {
		await expect(listAvailableScopes(makeDb(), { id: 3, role: 'viewer' }))
			.rejects.toMatchObject({ statusCode: 403 });
	});

	test('a manager with no assignments gets empty lists rather than an error', async () => {
		const result = await listAvailableScopes(makeDb({ assignedGroups: [] }), MANAGER);

		expect(result.groups).toEqual([]);
		expect(result.vehicles).toEqual([]);
	});
});

describe('scopeResolver - authorisation is enforced at the data layer', () => {
	const forbidden = ['V004', 'V005'];

	test.each([
		['fleet', { scopeType: 'fleet' }],
		['group', { scopeType: 'group', scopeId: 1 }],
	])('a manager requesting %s never receives an unauthorised vehicle', async (_l, request) => {
		const scope = await resolveScope(makeDb(), MANAGER, request);
		forbidden.forEach((id) => expect(scope.vehicleIds).not.toContain(id));
	});

	test.each([
		['vehicle', { scopeType: 'vehicle', scopeId: 'V004' }],
		['vehicles', { scopeType: 'vehicles', scopeId: ['V004'] }],
	])('a manager naming an unauthorised vehicle via %s is refused', async (_l, request) => {
		await expect(resolveScope(makeDb(), MANAGER, request))
			.rejects.toBeInstanceOf(ScopeError);
	});

	test('every scope type returns the same shape for downstream analytics', async () => {
		const requests = [
			{ scopeType: 'fleet' },
			{ scopeType: 'group', scopeId: 1 },
			{ scopeType: 'vehicle', scopeId: 'V001' },
			{ scopeType: 'vehicles', scopeId: ['V001', 'V002'] },
		];

		for (const request of requests) {
			const scope = await resolveScope(makeDb(), MANAGER, request);

			expect(Array.isArray(scope.vehicleIds)).toBe(true);
			expect(Array.isArray(scope.groupIds)).toBe(true);
			expect(scope.vehicleCount).toBe(scope.vehicleIds.length);
			expect(typeof scope.label).toBe('string');
			expect(scope.role).toBe('fleet_manager');
		}
	});
});
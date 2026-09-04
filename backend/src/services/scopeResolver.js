'use strict';

const SCOPE_TYPES = ['fleet', 'group', 'vehicle', 'vehicles'];
const REPORTING_ROLES = ['admin', 'fleet_manager'];
const MAX_VEHICLES_IN_SCOPE = 25;

const ROLE_ALIASES = {
	manager: 'fleet_manager', fleet_manager: 'fleet_manager',
	admin: 'admin', viewer: 'viewer',
};

class ScopeError extends Error{
	constructor(message, statusCode = 403){
		super(message);
		this.name = 'ScopeError';
		this.statusCode = statusCode;
	}
}

const NOT_AUTHORISED = 'Scope not found or not authorized';

function toGroupId(value){
	if(value === null || value === undefined) return null;
	const n = Number(value);
	return Number.isInteger(n) ? n : null;
}

function normaliseRole(role){
	if(typeof role !== 'string') return null;
	return ROLE_ALIASES[role.toLowerCase()] || null;
}

function isDevelopmentBypass(user){
	return process.env.NODE_ENV === 'development' && user && !Number.isInteger(user.id);
}

function assertReportingUser(user){
	if (!user || (user.id === undefined || user.id === null)) {
		throw new ScopeError('Authentication required', 401);
	}

	const role = normaliseRole(user.role);
	if (!role) {
		throw new ScopeError('Insufficient permissions', 403);
	}
	if (!REPORTING_ROLES.includes(role)) {
		throw new ScopeError('Insufficient permissions', 403);
	}

	if (isDevelopmentBypass(user)) return 'admin';

	if (!Number.isInteger(user.id)) {
		throw new ScopeError('Authentication required', 401);
	}

	return role;
}

async function getAccessibleGroups(db, user){
	const role = assertReportingUser(user);

	const result = role === 'admin'
		? await db.query(
			'SELECT id, name FROM fleet_groups ORDER BY name',
		)
		: await db.query(
				`SELECT g.id, g.name
				FROM fleet_manager_assignments a
				JOIN fleet_groups g ON g.id = a.fleet_group_id
				WHERE a.fleet_manager_id = $1
				ORDER BY g.name`,
				[user.id],
		);

	return result.rows.map((row) => ({ id: toGroupId(row.id), name: row.name }));
}

async function getVehiclesInGroups(db, groupIds){
	if (!groupIds.length) return [];
	const result = await db.query(
		`SELECT vehicle_id
		FROM vehicles
		WHERE fleet_group_id = ANY($1::bigint[])
		ORDER BY vehicle_id`,
		[groupIds],
	);

	return result.rows.map((row) => row.vehicle_id);
}

async function getAllVehicles(db){
	const result = await db.query(
		'SELECT vehicle_id FROM vehicles ORDER BY vehicle_id',
	);
	return result.rows.map((row) => row.vehicle_id);
}

async function countUnassignedVehicles(db){
	const result = await db.query(
		'SELECT COUNT(*)::int AS count FROM vehicles WHERE fleet_group_id IS NULL',
	);

	return result.rows[0] ? result.rows[0].count : 0;
}

async function resolveScope(db, user, request = {} ){
	if(!db || typeof db.query !== 'function'){
		throw new Error('resolveScope requires a pg client or pool');
	}

	const role = assertReportingUser(user);
	const { scopeType = 'fleet', scopeId = null } = request;

	const groups = await getAccessibleGroups(db, user);
	const accessibleGroupIds = groups.map((g) => g.id);
	const unassignedVehicleCount = await countUnassignedVehicles(db);

	switch (scopeType) {
		case 'fleet':
			return resolveFleetScope(db, role, groups, accessibleGroupIds, unassignedVehicleCount);
		case 'group':
			return resolveGroupScope(db, role, groups, scopeId, unassignedVehicleCount);
		case 'vehicle':
			return resolveVehicleScope(db, role, accessibleGroupIds, scopeId, unassignedVehicleCount);
		case 'vehicles':
			return resolveVehiclesScope(db, role, accessibleGroupIds, scopeId, unassignedVehicleCount);
		default:
			throw new ScopeError('Invalid scopeType', 400);
	}
}

async function resolveFleetScope(db, role, groups, accessibleGroupIds, unassignedVehicleCount){
	const vehicleIds = role === 'admin' ? await getAllVehicles(db) : await getVehiclesInGroups(db, accessibleGroupIds);

	return {
		scopeType: 'fleet',
		scopeId: null,
		label: role === 'admin' ? 'Entire fleet' : 'Assigned fleet',
		groupIds: accessibleGroupIds,
		vehicleIds,
		vehicleCount: vehicleIds.length,
		unassignedVehicleCount,
		role,
	};
}

async function resolveGroupScope(db, role, groups, scopeId, unassignedVehicleCount){
	const requestedId = toGroupId(scopeId);
	if (requestedId === null) {
		throw new ScopeError('A numeric scopeId is required for scopeType "group"', 400);
	}

	const group = groups.find((g) => g.id === requestedId);
	if (!group) {
		throw new ScopeError(NOT_AUTHORISED, 403);
	}

	const vehicleIds = await getVehiclesInGroups(db, [group.id]);
	return {
		scopeType: 'group',
		scopeId: String(group.id),
		label: group.name,
		groupIds: [group.id],
		vehicleIds,
		vehicleCount: vehicleIds.length,
		unassignedVehicleCount,
		role,
	};
}

async function authoriseVehicles(db, role, accessibleGroupIds, vehicleIds){
	const result = await db.query(
		`SELECT vehicle_id, fleet_group_id
		 FROM vehicles
		 WHERE vehicle_id = ANY($1::text[])
		 ORDER BY vehicle_id`,
		[vehicleIds],
	);

	if (result.rows.length !== vehicleIds.length) {
		throw new ScopeError(NOT_AUTHORISED, 403);
	}

	const groupIds = [];
	result.rows.forEach((row) => {
		const groupId = toGroupId(row.fleet_group_id);

		if (role !== 'admin') {
			if (groupId === null || !accessibleGroupIds.includes(groupId)) {
				throw new ScopeError(NOT_AUTHORISED, 403);
			}
		}

		if (groupId !== null && !groupIds.includes(groupId)) groupIds.push(groupId);
	});

	return { rows: result.rows, groupIds };
}

async function resolveVehicleScope(db, role, accessibleGroupIds, scopeId, unassignedVehicleCount){
	if (typeof scopeId !== 'string' || !scopeId.trim()) {
		throw new ScopeError('A vehicle_id is required for scopeType "vehicle"', 400);
	}

	const { rows, groupIds } = await authoriseVehicles(
		db, role, accessibleGroupIds, [scopeId.trim()],
	);

	const vehicle = rows[0];

	return {
		scopeType: 'vehicle',
		scopeId: vehicle.vehicle_id,
		label: vehicle.vehicle_id,
		groupIds,
		vehicleIds: [vehicle.vehicle_id],
		vehicleCount: 1,
		unassignedVehicleCount,
		role,
	};
}

async function resolveVehiclesScope(db, role, accessibleGroupIds, scopeId, unassignedVehicleCount){
	const requested = Array.isArray(scopeId) ? scopeId : [scopeId];

	const ids = [...new Set(
		requested
			.filter((id) => typeof id === 'string' && id.trim())
			.map((id) => id.trim()),
	)];

	if (!ids.length) {
		throw new ScopeError('At least one vehicle_id is required for scopeType "vehicles"', 400);
	}

	if (ids.length > MAX_VEHICLES_IN_SCOPE) {
		throw new ScopeError(
			`A comparison may include at most ${MAX_VEHICLES_IN_SCOPE} vehicles`,
			400,
		);
	}

	const { rows, groupIds } = await authoriseVehicles(db, role, accessibleGroupIds, ids);
	const vehicleIds = rows.map((row) => row.vehicle_id);

	return {
		scopeType: 'vehicles',
		scopeId: vehicleIds,
		label: vehicleIds.length === 1
			? vehicleIds[0]
			: `${vehicleIds.length} selected vehicles`,
		groupIds,
		vehicleIds,
		vehicleCount: vehicleIds.length,
		unassignedVehicleCount,
		role,
	};
}

async function assertCanReadReport(db, user, reportGroupIds){
	const role = assertReportingUser(user);
	if (role === 'admin') return;
    
    const groups = await getAccessibleGroups(db, user);
	const accessible = new Set(groups.map((g) => g.id));

	const requested = (reportGroupIds || []).map(toGroupId).filter((id) => id !== null);

	if (!requested.length || !requested.some((id) => accessible.has(id))) {
		throw new ScopeError(NOT_AUTHORISED, 403);
	}
}

async function listAvailableScopes(db, user){
	const role = assertReportingUser(user);
	const groups = await getAccessibleGroups(db, user);
	const groupIds = groups.map((g) => g.id);

	const result = role === 'admin'
		? await db.query(
				`SELECT vehicle_id, fleet_group_id
				FROM vehicles
				ORDER BY vehicle_id`,
		)
		: await db.query(
				`SELECT vehicle_id, fleet_group_id
				FROM vehicles
				WHERE fleet_group_id = ANY($1::bigint[])
				ORDER BY vehicle_id`,
				[groupIds],
		);

	const groupNameById = new Map(groups.map((g) => [g.id, g.name]));

	const vehicles = result.rows.map((row) => {
		const groupId = toGroupId(row.fleet_group_id);
		return {
			vehicleId: row.vehicle_id,
			groupId,
			groupName: groupId === null ? null : (groupNameById.get(groupId) || null),
		};
	});

	return {
		role,
		groups,
		vehicles,
		unassignedVehicleCount: await countUnassignedVehicles(db),
	};
}

module.exports = {
	resolveScope,
	getAccessibleGroups,
	assertCanReadReport,
	listAvailableScopes,
	ScopeError,
	SCOPE_TYPES,
	REPORTING_ROLES,
	MAX_VEHICLES_IN_SCOPE,
};
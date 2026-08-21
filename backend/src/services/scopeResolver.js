// the authorization boundary for reporting feat
'use strict';

const SCOPE_TYPES = ['fleet', 'group', 'vehicle']; /* subject to change after grouping logic fully implemented*/
const REPORTING_ROLES = ['admin', 'fleet_manager']; 


const ROLE_ALIASES = { 
    manager: 'fleet_manager', fleet_manager: 'fleet_manager', 
    admin: 'admin', 
    viewer: 'viewer',
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

//caller auth 
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

//  so an admin can report on all fleets and a manager on a specific fleet
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

//vehicle lookups
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

async function getAllVehicles(db){
  const result = await db.query(
    'SELECT vehicle_id FROM vehicles ORDER BY vehicle_id',
  );
  return result.rows.map((row) => row.vehicle_id);
}
const { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand, AdminDisableUserCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { pool } = require('../db/pool');
const { success, error } = require('../utils/response');

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.COGNITO_REGION || 'af-south-1',
});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

// Helper to validate and parse user IDs
const isValidId = (id) => {
  const parsedId = Number.parseInt(id, 10);
  return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
};

async function getAllUsers(req, res) {
  // Security Fix: Prevent DoS by capping the max limit (e.g., 100) and ensuring positive values
  let page = Number.parseInt(req.query.page, 10);
  let limit = Number.parseInt(req.query.limit, 10);
  
  page = Number.isInteger(page) && page > 0 ? page : 1;
  limit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20;
  
  const offset = (page - 1) * limit;

  try {
    const result = await pool.query(`
      SELECT id, cognito_sub, name, email, role, is_active, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await pool.query('SELECT COUNT(*) FROM users');
    const total = Number.parseInt(countResult.rows[0].count, 10);

    return success(res, {
      users: result.rows,
      total: total,
      page: page,
      limit: limit,
      total_pages: Math.ceil(total / limit),
    }, 200);
  } catch (err) {
    // Security Fix: Log raw error internally, but return a generic message to the client
    console.error('Get all users error:', err);
    return error(res, 'An internal error occurred while fetching users', 500);
  }
}

async function updateUserRole(req, res) {
  const parsedUserId = isValidId(req.params.userId);
  const { role } = req.body;

  // Security Fix: Strict input validation before processing
  if (!parsedUserId) {
    return error(res, 'Invalid user ID format', 400);
  }

  if (!role || !['admin', 'fleet_manager', 'viewer'].includes(role)) {
    return error(res, 'Invalid role. Must be admin, fleet_manager, or viewer', 400);
  }

  if (req.user.id === parsedUserId) {
    return error(res, 'Cannot change your own role', 403);
  }

  try {
    const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [parsedUserId]);

    if (userResult.rows.length === 0) {
      return error(res, 'User not found', 404);
    }

    await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, parsedUserId]);

    return success(res, { message: 'User role updated successfully' }, 200);
  } catch (err) {
    console.error('Update user role error:', err);
    return error(res, 'An internal error occurred while updating the role', 500);
  }
}

async function deactivateUser(req, res) {
  const parsedUserId = isValidId(req.params.userId);

  if (!parsedUserId) {
    return error(res, 'Invalid user ID format', 400);
  }

  if (req.user.id === parsedUserId) {
    return error(res, 'Cannot deactivate your own account', 403);
  }

  try {
    const userResult = await pool.query('SELECT cognito_sub FROM users WHERE id = $1', [parsedUserId]);

    if (userResult.rows.length === 0) {
      return error(res, 'User not found', 404);
    }

    const disableCommand = new AdminDisableUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: userResult.rows[0].cognito_sub,
    });

    await cognitoClient.send(disableCommand);

    await pool.query('UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1', [parsedUserId]);

    return success(res, { message: 'User deactivated successfully' }, 200);
  } catch (err) {
    console.error('Deactivate user error:', err);
    return error(res, 'An internal error occurred while deactivating the user', 500);
  }
}

module.exports = { getAllUsers, updateUserRole, deactivateUser };
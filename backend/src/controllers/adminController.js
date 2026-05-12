const { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand, AdminDisableUserCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { pool } = require('../db/pool');
const { success, error } = require('../utils/response');

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.COGNITO_REGION || 'af-south-1',
});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

async function getAllUsers(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    const result = await pool.query(`
      SELECT id, cognito_sub, name, email, role, is_active, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await pool.query('SELECT COUNT(*) FROM users');

    return success(res, {
      users: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      total_pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    }, 200);
  } catch (err) {
    console.error('Get all users error:', err);
    return error(res, 'Failed to fetch users: ' + err.message, 500);
  }
}

async function updateUserRole(req, res) {
  const { userId } = req.params;
  const { role } = req.body;

  if (!role || !['admin', 'fleet_manager', 'viewer'].includes(role)) {
    return error(res, 'Invalid role. Must be admin, fleet_manager, or viewer', 400);
  }

  if (req.user.id === parseInt(userId)) {
    return error(res, 'Cannot change your own role', 403);
  }

  try {
    const userResult = await pool.query('SELECT cognito_sub FROM users WHERE id = $1', [userId]);

    if (userResult.rows.length === 0) {
      return error(res, 'User not found', 404);
    }

    const updateAttributesCommand = new AdminUpdateUserAttributesCommand({
      UserPoolId: USER_POOL_ID,
      Username: userResult.rows[0].cognito_sub,
      UserAttributes: [{ Name: 'custom:role', Value: role }],
    });

    await cognitoClient.send(updateAttributesCommand);

    await pool.query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', [role, userId]);

    return success(res, { message: 'User role updated successfully' }, 200);
  } catch (err) {
    console.error('Update user role error:', err);
    return error(res, 'Failed to update role: ' + err.message, 500);
  }
}

async function deactivateUser(req, res) {
  const { userId } = req.params;

  if (req.user.id === parseInt(userId)) {
    return error(res, 'Cannot deactivate your own account', 403);
  }

  try {
    const userResult = await pool.query('SELECT cognito_sub FROM users WHERE id = $1', [userId]);

    if (userResult.rows.length === 0) {
      return error(res, 'User not found', 404);
    }

    const disableCommand = new AdminDisableUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: userResult.rows[0].cognito_sub,
    });

    await cognitoClient.send(disableCommand);

    await pool.query('UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1', [userId]);

    return success(res, { message: 'User deactivated successfully' }, 200);
  } catch (err) {
    console.error('Deactivate user error:', err);
    return error(res, 'Failed to deactivate user: ' + err.message, 500);
  }
}

module.exports = { getAllUsers, updateUserRole, deactivateUser };

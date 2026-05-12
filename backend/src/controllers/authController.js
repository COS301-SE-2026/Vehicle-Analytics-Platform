const { CognitoIdentityProviderClient, SignUpCommand, InitiateAuthCommand, GlobalSignOutCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { pool } = require('../db/pool');
const { success, error } = require('../utils/response');

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.COGNITO_REGION || 'af-south-1',
});

const CLIENT_ID = process.env.COGNITO_CLIENT_ID;

async function register(req, res) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return error(res, 'Name, email and password are required', 400);
  }

  if (password.length < 8) {
    return error(res, 'Password must be at least 8 characters', 400);
  }

  const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return error(res, 'Invalid email format', 400);
  }

  try {
    const signUpCommand = new SignUpCommand({
      ClientId: CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'name', Value: name },
      ],
    });

    const cognitoResponse = await cognitoClient.send(signUpCommand);

    await pool.query(
      `INSERT INTO users (cognito_sub, name, email, role, is_active)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      [cognitoResponse.UserSub, name, email, 'viewer', true]
    );

    return success(res, { message: 'User registered successfully', userSub: cognitoResponse.UserSub }, 201);
  } catch (err) {
    const errorMessage = err?.message || 'Registration failed';
    console.error('Cognito registration error:', err);
    return error(res, 'Registration failed: ' + errorMessage, 500);
  }
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return error(res, 'Email and password are required', 400);
  }

  try {
    const authCommand = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });

    const authResponse = await cognitoClient.send(authCommand);

    const userResult = await pool.query(
      'SELECT id, name, email, role, is_active FROM users WHERE email = $1',
      [email]
    );

    if (!userResult?.rows?.length) {
      return error(res, 'User not found', 404);
    }

    const user = userResult.rows[0];
    if (!user?.is_active) {
      return error(res, 'Account deactivated', 403);
    }

    return success(res, {
      accessToken: authResponse.AuthenticationResult.AccessToken,
      idToken: authResponse.AuthenticationResult.IdToken,
      refreshToken: authResponse.AuthenticationResult.RefreshToken,
      expiresIn: authResponse.AuthenticationResult.ExpiresIn,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    }, 200);
  } catch (err) {
    const errorMessage = err?.message || 'Login failed';
    if (err?.name === 'NotAuthorizedException') {
      return error(res, 'Invalid email or password', 401);
    }
    if (err?.name === 'UserNotFoundException') {
      return error(res, 'User not found', 404);
    }
    console.error('Cognito login error:', err);
    return error(res, 'Login failed: ' + errorMessage, 500);
  }
}

async function logout(req, res) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return success(res, { message: 'Logged out successfully' }, 200);
  }

  try {
    const logoutCommand = new GlobalSignOutCommand({ AccessToken: token });
    await cognitoClient.send(logoutCommand);
    return success(res, { message: 'Logged out successfully' }, 200);
  } catch (err) {
    return success(res, { message: 'Logged out successfully' }, 200);
  }
}

module.exports = { register, login, logout };

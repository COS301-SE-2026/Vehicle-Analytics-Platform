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

  // Security Fix: Enforce maximum lengths and type checking to prevent buffer exhaustion/DoS
  if (typeof name !== 'string' || name.length > 100) {
    return error(res, 'Invalid name format or length', 400);
  }
  if (typeof email !== 'string' || email.length > 255) {
    return error(res, 'Invalid email format or length', 400);
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return error(res, 'Password must be between 8 and 128 characters', 400);
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
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
    console.error('Cognito registration error:', err);
    
    if (err.name === 'UsernameExistsException') {
      return error(res, 'An account with this email already exists', 409);
    }
    
    // Security Fix: Prevent Information Leakage by masking raw AWS errors
    return error(res, 'Registration failed due to an internal error', 500);
  }
}

async function login(req, res) {
  const { email, password } = req.body;

  // Security Fix: Validate input types before interacting with external services
  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
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

    // Security Fix: Standardized error messaging to prevent User Enumeration
    if (!userResult?.rows?.length) {
      return error(res, 'Invalid email or password', 401);
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
    console.error('Cognito login error:', err);
    
    // Security Fix: Consolidate auth errors (UserNotFound vs NotAuthorized) 
    // to prevent malicious actors from verifying if an email exists in your pool.
    if (err?.name === 'NotAuthorizedException' || err?.name === 'UserNotFoundException') {
      return error(res, 'Invalid email or password', 401);
    }
    
    // Security Fix: Mask raw error traces
    return error(res, 'Login failed due to an internal error', 500);
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
  } catch (err) { /* NOSONAR */
    return success(res, { message: 'Logged out successfully' }, 200);
  }
}

module.exports = { register, login, logout };
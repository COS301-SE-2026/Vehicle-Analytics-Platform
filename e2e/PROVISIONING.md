# e2e/PROVISIONING.md

## One-time: create the Cognito e2e test user

This is a manual step -- run once, by someone with AWS CLI access to the
Cognito user pool. Not part of any CI run; CI only ever *authenticates* as
this user, never creates it.

```bash
# Fill in your actual pool ID and pick a real-looking test email.
USER_POOL_ID="af-south-1_XXXXXXXXX"
TEST_EMAIL="e2e-test@yourdomain.example"
TEST_PASSWORD="Some-Strong-Password-123!"

# Create the user with a permanent password -- skips the
# email-confirmation flow entirely, so no SES/inbox dependency in CI.
aws cognito-idp admin-create-user \
  --user-pool-id "$USER_POOL_ID" \
  --username "$TEST_EMAIL" \
  --user-attributes Name=email,Value="$TEST_EMAIL" Name=email_verified,Value=true \
  --message-action SUPPRESS

aws cognito-idp admin-set-user-password \
  --user-pool-id "$USER_POOL_ID" \
  --username "$TEST_EMAIL" \
  --password "$TEST_PASSWORD" \
  --permanent

# Retrieve the user's `sub` -- the real backend (outside test mode) looks
# up `users.cognito_sub` by this value after decoding the ID token, so the
# e2e DB seed step needs the REAL sub, not a made-up one.
aws cognito-idp admin-get-user \
  --user-pool-id "$USER_POOL_ID" \
  --username "$TEST_EMAIL" \
  --query 'UserAttributes[?Name==`sub`].Value' --output text
```

## Store as GitHub Actions secrets

| Secret | Value |
|---|---|
| `E2E_TEST_EMAIL` | the `$TEST_EMAIL` above |
| `E2E_TEST_PASSWORD` | the `$TEST_PASSWORD` above |
| `E2E_TEST_USER_COGNITO_SUB` | the `sub` printed by `admin-get-user` |
| `COGNITO_CLIENT_ID` | your app client ID (same one `authController.js` reads as `COGNITO_CLIENT_ID`) |

`e2e/global-setup.ts` uses these to seed a matching `users` row in the test
database before the suite runs -- see that file for exactly what it inserts.

## Why this user, and not one created per CI run

`AdminCreateUser` needs Cognito **admin** IAM permissions. Giving the CI
role admin-level Cognito access just to provision a throwaway user every
run is a bigger permission surface than necessary, and slower. A single
persistent test user costs nothing to keep around and only needs
`cognito-idp:InitiateAuth` (a client-level permission, not admin) for CI to
actually log in as it.
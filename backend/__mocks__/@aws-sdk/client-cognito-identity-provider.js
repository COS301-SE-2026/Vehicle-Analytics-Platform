module.exports = {
  CognitoIdentityProviderClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({
      AuthenticationResult: {
        AccessToken: 'mock-access-token',
        IdToken: 'mock-id-token',
        RefreshToken: 'mock-refresh-token',
        ExpiresIn: 3600,
      },
      UserSub: 'mock-user-sub',
    }),
  })),
  SignUpCommand: jest.fn(),
  InitiateAuthCommand: jest.fn(),
  GlobalSignOutCommand: jest.fn(),
  AdminDisableUserCommand: jest.fn(),
  AdminUpdateUserAttributesCommand: jest.fn(),
};
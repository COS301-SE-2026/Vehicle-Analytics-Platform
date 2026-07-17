






jest.setTimeout(30000);







process.env.NODE_ENV = 'test';



process.env.JWT_SECRET = process.env.JWT_SECRET||'test_secret_key_for_jwt_validation';



process.env.COGNITO_REGION = process.env.COGNITO_REGION||'af-south-1';



process.env.COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID||'test-pool-id';



process.env.COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID||'test-client-id';








const requiredEnvVars = ['DB_HOST','DB_PORT','DB_NAME','DB_USER','DB_PASSWORD'];





requiredEnvVars.forEach(varName => {



  if(!process.env[varName]){




    console.warn(`Warning: ${varName} not set. Tests may fail.`);




  }

});







afterAll(async () => {



  await new Promise(resolve => setTimeout(resolve, 500));



});










describe('Jest Setup', () => {



  test('setup file loads correctly', () => {



    expect(true).toBe(true);




    
  });

});


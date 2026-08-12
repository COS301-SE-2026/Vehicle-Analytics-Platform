

const dotenv = require('dotenv');


const path = require('path');



const result = dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });



if(result.error){



  
  throw new Error(



    
    `Failed to load .env.test: ${result.error.message}\n` +


    
    `Make sure backend/.env.test exists and jest is run with cwd = backend/.`

  );

}



jest.setTimeout(30000);






process.env.NODE_ENV = 'test';



process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key_for_jwt_validation';



process.env.COGNITO_REGION = process.env.COGNITO_REGION || 'af-south-1';



process.env.COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || 'test-pool-id';



process.env.COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID || 'test-client-id';






const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];



const missing = requiredEnvVars.filter((varName) => !process.env[varName]);







if (missing.length > 0) {


  
  throw new Error(



    
    `Missing required env vars in .env.test: ${missing.join(', ')}\n` +


    
    `These must point at a real, reachable test database — tests are not mocked.`


  );



}




console.log(



  `[jest.setup] DB target: ${process.env.DB_USER}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`




);



let consoleLogSpy;



beforeAll(() => {




  
  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});


});





afterAll(async () => {


  
  if (consoleLogSpy) {


    
    consoleLogSpy.mockRestore();


  }



  
  await new Promise((resolve) => setTimeout(resolve, 500));


})
;



describe('Jest Setup Verification', () => {

  test('setup file loads correctly', () => {

    expect(process.env.NODE_ENV).toBe('test');

    expect(process.env.JWT_SECRET).toBeDefined();

    expect(process.env.DB_HOST).toBeDefined();


    
  });

});


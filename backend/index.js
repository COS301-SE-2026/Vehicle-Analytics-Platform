require('dotenv').config();
const app = require('./src/app');
const { startFuelCalculationJob } = require('./src/jobs/fuelCalculationJob');

const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV !== 'lambda') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Cognito User Pool: ${process.env.COGNITO_USER_POOL_ID}`);
    console.log(`Cognito Client ID: ${process.env.COGNITO_CLIENT_ID}`);

    // Start daily cron jobs (not in test env)
    if (process.env.NODE_ENV !== 'test') {
      startFuelCalculationJob();
    }
  });
}

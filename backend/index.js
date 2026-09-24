require('dotenv').config();
const app = require('./src/app');
const { startSafetyScoreRefreshJob } = require('./src/jobs/safetyScoreRefreshJob');
const { startFuelCalculationJob } = require('./src/jobs/fuelCalculationJob');
const { startRiskPredictionJob } = require('./src/jobs/riskPredictionJob');
const { startCoachingOutcomeJob } = require('./src/jobs/coachingOutcomeJob');

const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV !== 'lambda') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Cognito User Pool: ${process.env.COGNITO_USER_POOL_ID}`);
    console.log(`Cognito Client ID: ${process.env.COGNITO_CLIENT_ID}`);

    
    
    if (process.env.NODE_ENV !== 'test') {
      startSafetyScoreRefreshJob();
      startFuelCalculationJob();
      startRiskPredictionJob();
      startCoachingOutcomeJob();
    }
  });
}

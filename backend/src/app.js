



const express = require('express');

const cors = require('cors');

const helmet = require('helmet');

const rateLimit = require('express-rate-limit');



const authRoutes = require('./routes/auth');

const vehicleRoutes = require('./routes/vehicles');

const dashboardRoutes = require('./routes/dashboard');

const adminRoutes = require('./routes/admin');

const safetyRoutes = require('./routes/safety');

const tripRoutes = require('./routes/trip');

const fleetAnalyticsRoutes = require('./routes/fleetAnalytics');

const geofenceRoutes = require('./routes/geofence');

const customAlertsRoutes = require('./routes/customAlerts');
const fleetGroupsRoutes = require('./routes/fleetGroups');

const notificationsRoutes = require('./routes/notifications');


const triggeredAlertsRoutes = require('./routes/triggeredAlerts');


// const fuelRoutes = require('./routes/fuel'); // removed: file doesn't exist, superseded by fuelHistoryRoutes

const fuelHistoryRoutes = require('./routes/fuelHistoryRoutes');

// added for report
const reportRoutes = require('./routes/reports');


const app = express();



app.set('trust proxy', true);



const limiter = rateLimit({

  windowMs: 15*60*1000,

  max: 1000,





  message: 'Too many requests from this IP, please try again later.',



  keyGenerator: (req) => {



    return req.ip || req.headers['x-forwarded-for'] || 'unknown';



  }




});





app.use(cors({



  origin: true,



  credentials: true,



  allowedHeaders: ['Content-Type', 'Authorization']



}));







app.use(helmet());

app.use(express.json());

app.use(limiter);



app.use('/api/auth', authRoutes);

app.use('/api/vehicles', vehicleRoutes);

app.use('/api/dashboard', dashboardRoutes);

app.use('/api/admin', adminRoutes);

app.use('/api/safety', safetyRoutes);

app.use('/api/trips', tripRoutes);

app.use('/api/fleet', fleetAnalyticsRoutes);

app.use('/api/geofences', geofenceRoutes);

app.use('/api/custom-alerts', customAlertsRoutes);

app.use('/api/alerts', triggeredAlertsRoutes);

//I added this for demo 3


app.use('/api/fuel', fuelHistoryRoutes);

app.use('/api/fleet-groups', fleetGroupsRoutes);

app.use('/api/notifications', notificationsRoutes)


app.use('/api/reports', reportRoutes); // added for reporting



app.get('/api/health', (req, res) => {



  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });



});





app.use((req, res) => {



  res.status(404).json({ error: 'Route not found' });



});




app.use((err, req, res, next) => {





  console.error('Lambda Exception Execution Trace:', err.stack);


  
  res.status(500).json({ error: 'Internal server error', details: err.message });



});






module.exports = app;




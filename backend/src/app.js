

const express = require('express');




const cors = require('cors');



const helmet = require('helmet');



const rateLimit = require('express-rate-limit');



const authRoutes = require('./routes/auth');



const vehicleRoutes = require('./routes/vehicles');



const dashboardRoutes = require('./routes/dashboard');



const adminRoutes = require('./routes/admin');

//const safetyRoutes = require('./routes/safety');


const safetyRoutes = require('./routes/safety');


const geofenceRoutes = require('./routes/geofence');

// const fleetAnalyticsRoutes = require('./routes/fleetAnalytics');

// const geofenceRoutes = require('./routes/geofence');



const app = express();



const limiter = rateLimit({



  windowMs: 15*60*1000,




  max: 1000,




  message: 'Too many requests from this IP, please try again later.',



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

//app.use('/api/safety',safetyRoutes);


app.use('/api/safety', safetyRoutes);



//app.use('/api/trips', tripRoutes);



app.use('/api/geofences',geofenceRoutes);

// app.use('/api/fleet', fleetAnalyticsRoutes);



// app.use('/api/geofences', geofenceRoutes);






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





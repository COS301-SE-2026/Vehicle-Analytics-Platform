



import http from 'k6/http';


import { check, sleep } from 'k6';

import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

import crypto from 'k6/crypto';



export const options = {

  stages: [

    { duration: '30s', target: 5 },

    { duration: '1m', target: 15 },

    { duration: '30s', target: 50 },

    { duration: '1m', target: 50 },

    { duration: '30s', target: 0 },

  ],

  thresholds: {

    http_req_duration: ['avg < 50', 'max < 100'],

    http_req_failed: ['rate < 0.01'],

  },

};



function generateTelemetry(vehicleId) {

  

  const randomLat = -26.2 + (crypto.randomInt(0, 2000) / 1000);

  const randomLng = 28.0 + (crypto.randomInt(0, 2000) / 1000);

  
  
  return {
  
    vehicle_id: String(vehicleId),
  
    timestamp: new Date().toISOString(),
  
    lat: randomLat,
  
    lng: randomLng,
  
    speed: randomIntBetween(0, 120),
  
    heading: randomIntBetween(0, 359),
  
    ignition: true,
  
    movement: true,
  
  };
}




export default function telemetryLoadTest() {

  const vehicles = Array.from({ length: 15 }, (_, i) => 1000 + i);

  const vehicleId = vehicles[Math.floor(crypto.randomInt(0, vehicles.length))];

  
  
  const payload = JSON.stringify(generateTelemetry(vehicleId));
  

  
  const res = http.post(
  
    'https://8cvbs5cpn9.execute-api.af-south-1.amazonaws.com/prod/api/vehicles/telemetry',
  
    payload,
  
    {
  
      headers: {
  
        'Content-Type': 'application/json',
  
      },
  
    }
  
  );


  
  check(res, {
  
    'telemetry status 200': (r) => r.status === 200,
  
    'telemetry avg < 50ms': (r) => r.timings.duration < 50,
  
  });


  
  sleep(1);

  
}


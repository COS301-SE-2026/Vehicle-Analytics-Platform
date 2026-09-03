


import http from 'k6/http';


import { check, sleep } from 'k6';


export const options = {

  stages: [

    { duration: '30s', target: 10 },

    { duration: '1m', target: 50 },

    { duration: '30s', target: 100 },

    { duration: '2m', target: 100 },

    { duration: '30s', target: 0 },

  ],

  thresholds: {

    http_req_duration: ['avg < 80', 'max < 2000'],

    http_req_failed: ['rate < 0.01'],


  },

  summaryTrendStats: ['min', 'avg', 'med', 'max'],

};



export default function apiLoadTest() {

  const token = __ENV.JWT_TOKEN;

  
  
  if (!token) {
  
    console.error('JWT_TOKEN environment variable is required');
  
    return;
  
  }


  
  const headers = {
  
    'Authorization': 'Bearer ' + token,
  
    'Content-Type': 'application/json',
  
  };


  
  const res1 = http.get(
  
    'https://8cvbs5cpn9.execute-api.af-south-1.amazonaws.com/prod/api/vehicles/locations',
  
    { headers }
  
  );


  
  check(res1, {
  
    'GET /vehicles/locations status 200': (r) => r.status === 200,
  
    'GET /vehicles/locations avg < 80ms': (r) => r.timings.duration < 80,
  
  });


  
  const res2 = http.get(
  
    'https://8cvbs5cpn9.execute-api.af-south-1.amazonaws.com/prod/api/dashboard/kpis',
  
    { headers }
  
  );


  
  check(res2, {
  
    'GET /dashboard/kpis status 200': (r) => r.status === 200,
  
    'GET /dashboard/kpis avg < 80ms': (r) => r.timings.duration < 80,
  
  });


  
  sleep(1);
}








jest.mock('../src/middleware/auth', () => ({






  authenticate: (req, res, next) => {



    
    req.user = {id: 1, role: 'fleet_manager', sub: 'test-sub'};


    
    next();


  },





  
  
  requireRole: (roles) => (req, res, next) => {

   
    if(!req.user){


      
      return res.status(401).json({error: 'Unauthorized'});


    }





    if(!roles.includes(req.user.role)){



      
      return res.status(403).json({error: 'Insufficient permissions'});


    }





    next();





  }

}));








jest.mock('@aws-sdk/client-cognito-identity-provider', () => ({


  
  CognitoIdentityProviderClient: jest.fn().mockImplementation(() => ({


    
    send: jest.fn().mockResolvedValue({


      
      AuthenticationResult: {


        
        AccessToken: 'mock-access-token',


        
        IdToken: 'mock-id-token',


        
        RefreshToken: 'mock-refresh-token',


        
        ExpiresIn: 3600



      },



      
      UserSub: 'mock-user-sub'



    })


  })

),






SignUpCommand: jest.fn(),



InitiateAuthCommand: jest.fn(),



GlobalSignOutCommand: jest.fn(),



AdminDisableUserCommand: jest.fn(),



AdminUpdateUserAttributesCommand: jest.fn()





}));







const {mockPool, setupMockData} = require('./setup/mockDb');



jest.mock('../src/db/pool', () => ({pool: mockPool}));



const request = require('supertest');



const app = require('../src/app');







describe('Geofence Controller', () => {


  
  beforeAll(() => {


    
    setupMockData();


  })
  ;



  
  
  describe('POST /api/geofences', () => {
  

    
    test('should create a new geofence', async () => {
  

      
      const response = await request(app)
  

      
      .post('/api/geofences')
  

      
      .set('Authorization', 'Bearer test-token')
  

      
      .send({
  

        
        name: 'Test Zone',
  

        
        boundary: {type: 'Polygon', coordinates: [[[0,0],[1,0],[1,1],[0,1],[0,0]]]},
  

        
        trigger_type: 'both'



  
      });


      

      
      expect(response.status).toBe(201);
      

      
      expect(response.body.success).toBe(true);
      

      
      expect(response.body.data.geofence).toHaveProperty('id');
      

      
      expect(response.body.data.geofence.name).toBe('Test Zone');
   
   
   
    })

    ;






    
   
    test('should return 400 if name is missing', async () => {
   
      
      
      const response = await request(app)
    

      
      .post('/api/geofences')
    

      
      .set('Authorization', 'Bearer test-token')
    

      
      .send({
    

        
        boundary: {type: 'Polygon', coordinates: [[[0,0],[1,0],[1,1],[0,1],[0,0]]]}
    

      })
      ;


      
      expect(response.status).toBe(400);
      
      expect(response.body.success).toBe(false);
   
   
   
    });



    
   
    test('should return 400 if boundary is missing', async () => {
   
      
      
      const response = await request(app)
    

    

      
      .post('/api/geofences')
    

      
      .set('Authorization', 'Bearer test-token')
    

      
      .send({
    

        
        name: 'Test Zone'
    

      })
      ;




      

      
      expect(response.status).toBe(400);
      

      
      expect(response.body.success).toBe(false);
    
    
    
    })
   
   
    ;


    
    test('should handle database error', async () => {
    

      
      const originalQuery = mockPool.query;
    

      
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));






      
      const response = await request(app)
      
      .post('/api/geofences')
      

      
      .set('Authorization', 'Bearer test-token')
      

      
      .send({
      

        
        name: 'Test Zone',
      

        
        boundary: {type: 'Polygon', coordinates: [[[0,0],[1,0],[1,1],[0,1],[0,0]]]}
      

        
      });

        
      
      expect(response.status).toBe(500);
      

      

      
      expect(response.body.success).toBe(false);
      

      
      
      mockPool.query = originalQuery;
    
    
    
    
    });
  });





  
  describe('GET /api/geofences', () => {

    

    
    test('should return all geofences', async () => {
  

      
      const response = await request(app)
  

      
      .get('/api/geofences')
  

      
      .set('Authorization', 'Bearer test-token');




      

      
      expect(response.status).toBe(200);
      

      
      expect(response.body.success).toBe(true);
      

      
      expect(response.body.data.geofences).toBeDefined();
      

      
      expect(Array.isArray(response.body.data.geofences)).toBe(true);
   
   
   
   
    })
    ;
  });

  
});

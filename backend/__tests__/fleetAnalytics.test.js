



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

  })),




  
  SignUpCommand: jest.fn(),


  
  InitiateAuthCommand: jest.fn(),


  
  GlobalSignOutCommand: jest.fn(),


  
  AdminDisableUserCommand: jest.fn(),


  
  
  AdminUpdateUserAttributesCommand: jest.fn()



})
);






const {mockPool, setupMockData} = require('./setup/mockDb');



jest.mock('../src/db/pool', () => ({ pool: mockPool }));





const request = require('supertest');



const app = require('../src/app');







describe('Fleet Analytics Controller', () => {


  
  beforeAll(() => {


    
    setupMockData();




  })
  ;




  

  
  describe('GET /api/fleet/analytics', () => {
  

    
    test('should return fleet analytics for day period', async () => {
  

      
      const response = await request(app)
  

      
      .get('/api/fleet/analytics?period=day')
  

      
      .set('Authorization', 'Bearer test-token');




      

      
      expect(response.status).toBe(200);
      

      
      expect(response.body.success).toBe(true);
      

      
      expect(response.body.data.period).toBe('day');
      

      
      expect(response.body.data.trend).toBeDefined();
      

      
      expect(response.body.data.ranked_vehicles).toBeDefined();
      

      
      expect(response.body.data.event_breakdown).toBeDefined();
      

      expect(response.body.data.vehicle_contributions).toBeDefined();
    
    
    
    
    })
    ;




    
    
    test('should return fleet analytics for week period', async () => {
    

      
      const response = await request(app)
    

      
      .get('/api/fleet/analytics?period=week')
    

      
      .set('Authorization', 'Bearer test-token');




      

      
      expect(response.status).toBe(200);
      

      
      expect(response.body.success).toBe(true);
      

      
      expect(response.body.data.period).toBe('week');
      

      
      expect(response.body.data.trend).toBeDefined();
    
    
    
    })
    
    ;


    

    
    test('should handle invalid period', async () => {
    

      
      const response = await request(app)
    


      
      .get('/api/fleet/analytics?period=invalid')
    

      
      .set('Authorization', 'Bearer test-token');




      

      expect(response.status).toBe(200);
    
    
    
    })
    
    ;


    
    test('should handle missing period parameter', async () => {
    

      
      const response = await request(app)
    

      
      .get('/api/fleet/analytics')
    

      
      .set('Authorization', 'Bearer test-token');




      

      
      expect(response.status).toBe(200);
      

      
      expect(response.body.data.period).toBe('day');
   
   
   
    })


    
    ;



    
    
    test('should handle database error', async () => {
    

      
      const originalQuery = mockPool.query;
    

      
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));






      
      const response = await request(app)
      

      
      .get('/api/fleet/analytics?period=day')
      

      
      .set('Authorization', 'Bearer test-token');




      

      
      expect(response.status).toBe(500);
      

      
      expect(response.body.success).toBe(false);
      

      
      mockPool.query = originalQuery;
    
    
    
    });
  });

  
  
  
  
  describe('GET /api/fleet/vehicle/:vehicleId/scores', () => {
  

    
    test('should return daily scores for a vehicle', async () => {
  

  

      
      const response = await request(app)
      
      .get('/api/fleet/vehicle/V001/scores?days=7')
  

  

      
      .set('Authorization', 'Bearer test-token');






 

      
      expect(response.status).toBe(200);
 

      
      expect(response.body.success).toBe(true);
 

      
      expect(response.body.data.vehicle_id).toBe('V001');
 

      
      expect(response.body.data.scores.length).toBeGreaterThan(0);
 
      
    
    });


    
    
    

    
    test('should handle non-existent vehicle with empty scores', async () => {
    

    

      
      const response = await request(app)
      
      .get('/api/fleet/vehicle/NONEXISTENT/scores?days=7')
    

    

      
      .set('Authorization', 'Bearer test-token');


      
      
    

      
      expect(response.status).toBe(200);
    

      
      expect(response.body.success).toBe(true);
    

      
      expect(response.body.data.scores).toBeDefined();
    



      
    });








    
    
    
    
      test('should handle database error', async () => {
    
    
        const originalQuery = mockPool.query;
    

        
        mockPool.query.mockRejectedValueOnce(new Error('Database error'));



        

        
        const response = await request(app)
        
        .get('/api/fleet/vehicle/V001/scores?days=7')


        
        .set('Authorization', 'Bearer test-token');


        

     
     


        
        expect(response.status).toBe(500);
     

        expect(response.body.success).toBe(false);
    

    

    
    
        
        mockPool.query = originalQuery;

        


    });
  });
});
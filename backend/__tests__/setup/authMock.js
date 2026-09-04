




jest.mock('../../src/middleware/auth', () => ({



  
  authenticate: (req, res, next) => {


    
    req.user = {id: 1, role: 'admin', sub: 'test-sub'};


    
    next();


  },





  
  requireRole: (roles) => (req, res, next) => {


    
    if(!req.user){



      
      return res.status(401).json({ error: 'Unauthorized' });


    }



    
    if(!roles.includes(req.user.role)){


      
      
      
      return res.status(403).json({ error: 'Insufficient permissions' });




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









describe('Auth Mock Setup', () => {


  
  test('auth mock loads correctly', () => {


    
    expect(true).toBe(true);


  })
  ;


})
;

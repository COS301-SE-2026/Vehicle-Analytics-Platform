


const mockQuery = jest.fn();



const mockPool = {

  query: mockQuery,

  connect: jest.fn().mockResolvedValue({

    query: mockQuery,

    release: jest.fn(),




    
  }),



  end: jest.fn().mockResolvedValue(),



  
};







function setupMockData() {

  
  
  mockQuery.mockReset();


  
  mockQuery.mockImplementation((sql, params) => {
  
   
   
   
    if(sql.includes('driver_daily_safety_scores')&&sql.includes('CURRENT_DATE - INTERVAL')){

  
      return Promise.resolve({
  


        rows: [



  
          {score_date: '2026-07-13', avg_score: 85.5, vehicle_count: 10},
  
         
         
          {score_date: '2026-07-12', avg_score: 82.0, vehicle_count: 10}
  
        ],
  


        rowCount: 2,
  


        
      });
  
    }


    
   
   
   
    if(sql.includes('ranked_vehicles')||sql.includes('AVG(safety_score) AS avg_score')){


    


      
      return Promise.resolve({
    

        rows: [
    
          {vehicle_id: 'V001', avg_score: 75.0, harsh_brakes: 2, harsh_accelerations: 1, harsh_cornering: 0, crashes: 0, days_count: 5},
    
          {vehicle_id: 'V002', avg_score: 85.0, harsh_brakes: 1, harsh_accelerations: 0, harsh_cornering: 0, crashes: 0, days_count: 5}
    
        ],
    


        
        rowCount: 2,
    



      });
    
    }


    
    
    
    
    if(sql.includes('event_breakdown')||sql.includes('event_detail')){


    
      
      return Promise.resolve({
    

        
        rows: [
    

          
          {event_detail: 'harsh_braking', event_count: 15},
    

          
          {event_detail: 'harsh_acceleration', event_count: 10}
    

        ],

    

        rowCount: 2,
    



      });
    
    }


    
    
    
    
    
    
    if(sql.includes('vehicle_contributions')){

    


      
      return Promise.resolve({
    

        
        rows: [
    

          
          {vehicle_id: 'V001', total_events: 20, harsh_brakes: 10, harsh_accelerations: 5, harsh_cornering: 5},
    

          
          {vehicle_id: 'V002', total_events: 15, harsh_brakes: 5, harsh_accelerations: 5, harsh_cornering: 5}
    

        ],

    

        
        rowCount: 2,
    

      })
      ;
    

    }




    
    if(sql.includes('get_trip_history')){


    

      
      return Promise.resolve({
    

        
        rows: [
    

    

    

          
          {trip_id: 1, vehicle_id: 'V001', start_time: new Date(), end_time: new Date(), distance_km: 45.5, avg_speed_kmh: 45.5, max_speed_kmh: 85.0, status: 'completed'}
    

    

        ],

    
        rowCount: 1,
      
      
      
      });
    

    }








    
    if(sql.includes('get_trip_replay')){

    

      
      return Promise.resolve({
    

        
        rows: [
    

     

          
          {point_time: new Date(), latitude: -25.0, longitude: 28.0, speed_kmh: 60},
    



          

          
          {point_time: new Date(), latitude: -25.1, longitude: 28.1, speed_kmh: 80}
    

          
        ],
    
    
    
    
        rowCount: 2,
      
      
      
      });
    }


  
   
   
    if(sql.includes('INSERT INTO geofences')){

  
  
      return Promise.resolve({
  
        rows: [{
  
          id: 1,
  
          
          name: 'Test Zone',
  

          
          vehicle_id: null,
  

          
          trigger_type: 'both',
  

          
          is_active: true
  

        }]
        ,
  
       
      
      
        rowCount: 1
  
      });
  
    }


    
   
   
   
    if(sql.includes('SELECT * FROM geofences')){

    


      
      return Promise.resolve({
    


        
        rows: [
    

          
          {id: 1, name: 'Test Zone', vehicle_id: null, polygon: '{}', trigger_type: 'both', is_active: true, created_at: new Date(), updated_at: new Date()}
    

        ],

    

        rowCount: 1,
    


      })
      
      ;
    
    }


   
    


    if(sql.includes('SELECT id, name, vehicle_id, polygon, trigger_type, is_active FROM geofences WHERE id = $1')){

    

      
      if(params&&params[0]==='1'){

    

        
        return Promise.resolve({
    



          
          
          rows: [{id: 1, name: 'Test Zone', vehicle_id: null, polygon: '{}', trigger_type: 'both', is_active: true, created_at: new Date(), updated_at: new Date()}],
    


          rowCount: 1
    


        })
        ;
    
      }
    


      
      return Promise.resolve({rows: [], rowCount: 0});
    



    }






    
    if(sql.includes('UPDATE geofences SET updated_at = NOW()')){

    

      
      if(params&&params[params.length - 1] === 1){
    

        
        
        return Promise.resolve({
    


          
          rows: [{id: 1, name: 'Updated Zone', vehicle_id: null, trigger_type: 'entry', is_active: true}],
    

          
          rowCount: 1
    

        })
        ;
    
      }


    

      
      return Promise.resolve({rows: [], rowCount: 0});
    

    }




    
   
   
   
    if(sql.includes('DELETE FROM geofences')){
    

    
     
     
     
     
      
     
      return Promise.resolve({rows: [{ id: 1 }]});
    

    }




    
    
    
    
    if(sql.includes('FROM vehicles v')&&sql.includes('LEFT JOIN current_vehicle_position')){

    

      
      if(params&&params[0]==='1000'){

    

        return Promise.resolve({
    
          
          rows: [{
    

            
            id: '1000',
    

            
            device_id: 'CAPSTONE-001',
    

    

            
            created_at: new Date(),
    

            
            status: 'active',
            
            latitude: '-27.796935',
    

    

            
            longitude: '28.4293083',
    

            
            speed: 6,
            
            total_odometer: 81238116,
    

            
            ignition: 'Ignition On',
    

    

            
            movement: 'Movement On',
    

            
            last_update: new Date()
          
          
          }],
    

    

          
          rowCount: 1,
    
        })
        ;
    
      }
    
      
      
      return Promise.resolve({rows: [], rowCount: 0});
    


    }


    
    
    
    
    if(sql.includes('SELECT event_detail as type FROM vehicle_events WHERE vehicle_id = $1')){

    

      
      if(params&&params[0]==='1000'){

    



        
        return Promise.resolve({
    

          
          rows: [
    

            
            {type: 'harsh_braking', event_category: 'green_driving_type', speed: 60, latitude: '-27.796935', longitude: '28.4293083', timestamp: new Date()}
    

          ],

    


          rowCount: 1,
    



        });
    
      }
    



      return Promise.resolve({rows: [], rowCount: 0});
    



    }


    
   
   
   
    if(sql.includes('SELECT * FROM vehicles')){

    

      
      
      return Promise.resolve({
    

        
        
        rows: [
    

          
          {id: 'V001', device_id: 'DEV-001', status: 'active', latitude: '-25.0', longitude: '28.0', speed: 60, last_update: new Date()}
    


        ],

    

        rowCount: 1,
    



      });
    
    }


    
    
    
    if(sql.includes('clean_telemetry')&&sql.includes('MAX(time)')){

    
    
    
    
    
    
      return Promise.resolve({
       
       
        rows: [
    

          
          {vehicle_id: 'V001', time: new Date(), latitude: -25.0, longitude: 28.0, speed: 60, ignition: 'Ignition On', movement: 'Movement On', total_odometer: 10000}
    

    

        ],

        
        
        rowCount: 1,
    

    

      });
    }


    
    
    
    
    
    if(sql.includes('SELECT * FROM driver_daily_safety_scores WHERE vehicle_id = $1')){

    

      
      if(params&&params[0]==='V001'){

    


    

        
        return Promise.resolve({
    
          rows: [
    
    
            {vehicle_id: 'V001', score_date: '2026-07-13', safety_score: 85, harsh_brakes: 2, harsh_accelerations: 1, harsh_cornering: 0, crashes: 0, total_events: 3, classification: 'Good'}
    
          ],
    
          rowCount: 1,


        });
    
      }
    



      return Promise.resolve({ rows: [], rowCount: 0 });
    
    
    }


    
    
    
    
    
    if(sql.includes('SELECT * FROM driver_daily_safety_scores WHERE score_date = COALESCE')){

      
      if(params&&params[0]==='V001'){
    


        return Promise.resolve({
    


    
          rows: [


    

            
            {vehicle_id: 'V001', score_date: '2026-07-13', safety_score: 85, harsh_brakes: 2, harsh_accelerations: 1, harsh_cornering: 0, crashes: 0, total_events: 3, classification: 'Good'}
    



          ],

    

          
          rowCount: 1,
    

        })
        ;
    

      }

    

      
      return Promise.resolve({rows: [], rowCount: 0});
    

    }





    
    if(sql.includes('geofence_events')){

    

      
      return Promise.resolve({
    

        
        rows: [
    

          
          {id: 1, geofence_id: 1, geofence_name: 'Test Zone', vehicle_id: 'V001', event_type: 'entry', latitude: -25.0, longitude: 28.0, speed: 60, created_at: new Date() }
    

        ],
    



        
        rowCount: 1
    

      })
      ;
    }





   
   
   
    if(sql.includes('cluster_points')){

    

    

      
      return Promise.resolve({
    

        
        rows: [
    

          
          {vehicle_id: 'V001', cluster_id: 1, center_lat: -25.0, center_lng: 28.0, point_count: 5, first_seen: new Date(), last_seen: new Date() }
    


        ],

    

        
        rowCount: 1
    

      })
      ;
    }




    
    return Promise.resolve({rows: [], rowCount: 0});

    


  });
}





module.exports = { mockPool, setupMockData };







describe('Mock DB Setup', () => {





  
  test('mockDb loads correctly', () => {


    
    expect(true).toBe(true);


  })
  ;

});
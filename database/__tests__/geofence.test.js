
const {createDbClient} = require('../testHelpers');




describe('Geofence database trigger test', () => {
    let client;


    
    const cleanup = async () => {
    
        await client.query(`DELETE FROM geofence_events WHERE vehicle_id LIKE 'GEO_TEST-%'`);
    
        await client.query(`DELETE FROM geofence_state WHERE vehicle_id LIKE 'GEO_TEST-%'`);
    
        await client.query(`DELETE FROM clean_telemetry WHERE vehicle_id LIKE 'GEO_TEST-%'`);
    
        await client.query(`DELETE FROM geofences WHERE name LIKE 'GEO_TEST-%'`);
    
    
    };

    
    
    beforeAll(async () => {
    
        client = await createDbClient();
    
        await cleanup();
    
    }, 30000);


    
    afterAll(async () => {
    
        if (client) {
    
    
    
            await cleanup();
    
            await client.end();
    
        }
    
    }, 30000);


    
    test('should trigger entry and exit events when vehicle enters and exits geofence', async () => {
    
        const vehicle_id = 'GEO_TEST-1024'; 
    
        await client.query(`
    
    
            INSERT INTO vehicles (vehicle_id) 
    
            VALUES ($1) 
    
            ON CONFLICT (vehicle_id) DO NOTHING
    
            `, [vehicle_id]);

            

            const geofenceResult = await client.query(`

                INSERT INTO geofences (name, vehicle_id, trigger_type, boundary)


                VALUES ('GEO_TEST-Zone', $1, 'both', ST_GeomFromText('POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))', 4326))
            RETURNING id

            `, [vehicle_id]);

            const geofence_id = geofenceResult.rows[0].id;

            
        await client.query(`
       
            INSERT INTO geofence_state (geofence_id, vehicle_id, is_inside, last_updated)
       
       
            VALUES ($1, $2, false, NOW())
       
            ON CONFLICT (geofence_id, vehicle_id) DO NOTHING
       
            `, [geofence_id, vehicle_id]);



      
        await client.query(`
      
       
        
         
          
          
            INSERT INTO clean_telemetry (time, vehicle_id, latitude, longitude, speed)
            VALUES (NOW(), $1, 2, 2, 60)
        `, [vehicle_id]);

   

        let stateRes = await client.query(`

            SELECT is_inside FROM geofence_state 

            WHERE geofence_id = $1 AND vehicle_id = $2

            `, [geofence_id, vehicle_id]);

            
            
        expect(stateRes.rows.length).toBe(1);
  
        expect(stateRes.rows[0].is_inside).toBe(false);





        await client.query(`
 
 
            INSERT INTO clean_telemetry (time, vehicle_id, latitude, longitude, speed)
 
            VALUES (NOW() + INTERVAL '1 minute', $1, 0.5, 0.5, 60)
 
            `, [vehicle_id]);

            
     
  
            stateRes = await client.query(`
  
  
  
                SELECT is_inside FROM geofence_state 
  
  
                WHERE geofence_id = $1 AND vehicle_id = $2
  
                `, [geofence_id, vehicle_id]);
            
  
                expect(stateRes.rows.length).toBe(1);
  
                expect(stateRes.rows[0].is_inside).toBe(true);


       
        let eventRes = await client.query(`
 
 
            SELECT event_type FROM geofence_events 
 
            WHERE geofence_id = $1 AND vehicle_id = $2
 
 
            `, [geofence_id, vehicle_id]);
 
            
        expect(eventRes.rows.length).toBe(1);
        expect(eventRes.rows[0].event_type).toBe('entry');

     


        await client.query(`

            INSERT INTO clean_telemetry (time, vehicle_id, latitude, longitude, speed)

            VALUES (NOW() + INTERVAL '2 minutes', $1, 0.5, 0.5, 60)

            `, [vehicle_id]);

            
      
 
            stateRes = await client.query(`
 
                SELECT is_inside FROM geofence_state 
 
 
 
                WHERE geofence_id = $1 AND vehicle_id = $2
 
                `, [geofence_id, vehicle_id]);
 
                
        expect(stateRes.rows.length).toBe(1);
 
        expect(stateRes.rows[0].is_inside).toBe(true);

    
        eventRes = await client.query(`
            SELECT event_type FROM geofence_events 
 
            WHERE geofence_id = $1 AND vehicle_id = $2
 
            `, [geofence_id, vehicle_id]);
 
            
  
            expect(eventRes.rows.length).toBe(1); 
  
  
            expect(eventRes.rows[0].event_type).toBe('entry');

  
  
         
  
 
            await client.query(`
 
                INSERT INTO clean_telemetry (time, vehicle_id, latitude, longitude, speed)
 
 
                VALUES (NOW() + INTERVAL '3 minutes', $1, 2, 2, 60)
 
                `, [vehicle_id]);


       
 
                stateRes = await client.query(`
 
                    SELECT is_inside FROM geofence_state 
 
                    WHERE geofence_id = $1 AND vehicle_id = $2
 
 
                    `, [geofence_id, vehicle_id]);
 
                    
    
    
     
     
                    expect(stateRes.rows.length).toBe(1);
     
      
                    expect(stateRes.rows[0].is_inside).toBe(false);

     
 
                    eventRes = await client.query(`
 
                        SELECT event_type FROM geofence_events 
 
 
 
                        WHERE geofence_id = $1 AND vehicle_id = $2
 
                        ORDER BY created_at DESC
 
 
                        `, [geofence_id, vehicle_id]);
 
                        
        expect(eventRes.rows.length).toBe(2);
       
        expect(eventRes.rows[0].event_type).toBe('exit'); 
    });
    
});
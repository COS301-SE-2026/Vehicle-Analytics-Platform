

const {pool} = require('../db/pool');




const {success, error} = require('../utils/response');






async function createGeofence(req, res) {



    const {name, vehicle_id, polygon, trigger_type = 'both'} = req.body;





   

 if(!name||!polygon){




        return error(res, 'Name and polygon are required', 400);



    }







    try{






        const result = await pool.query(`



            INSERT INTO geofences (name, vehicle_id, polygon, trigger_type)



            VALUES ($1, $2, $3, $4)



            RETURNING id, name, vehicle_id, trigger_type, is_active



        `, [name, vehicle_id || null, polygon, trigger_type]);





        return success(res, {






            message: 'Geofence created successfully',



            geofence: result.rows[0]





        }, 201);



    } 





catch (err){



        console.error('Create geofence error:', err);


        return error(res, 'Failed to create geofence: '+err.message, 500);








    }
}






async function getGeofences(req, res) {

   


    
 const {active_only = 'true'} = req.query;



    try{




        let query = `



            SELECT id, name, vehicle_id, polygon, trigger_type, is_active, created_at, updated_at



            FROM geofences



        `;



        const params = [];



        if(active_only==='true'){





            query += ` WHERE is_active = true`;




        }




        query += ` ORDER BY created_at DESC`;





        const result = await pool.query(query, params);



        return success(res, {


            total: result.rows.length,

            geofences: result.rows



        }, 200);



    } 



catch (err){




        console.error('Get geofences error:', err);

        return error(res, 'Failed to fetch geofences: '+err.message, 500);



    }

}









async function getGeofenceById(req, res) {

    

const {id} = req.params;



    try{





        const result = await pool.query(`




            SELECT id, name, vehicle_id, polygon, trigger_type, is_active, created_at, updated_at


            FROM geofences



            WHERE id = $1



        `, [id]);





        if(result.rows.length===0){


            return error(res, 'Geofence not found', 404);



        }







        return success(res, {geofence: result.rows[0]}, 200);



    } 



catch (err){







        console.error('Get geofence by ID error:', err);

        return error(res, 'Failed to fetch geofence: '+err.message, 500);




    }

}








async function updateGeofence(req, res) {

   

 const {id} = req.params;

   

 const {name, polygon, trigger_type, is_active} = req.body;



    try{




        let query = 'UPDATE geofences SET updated_at = NOW()';



        const params = [];



        let paramCount = 1;



        if(name){




            query += `, name = $${paramCount}`;



            params.push(name);



            paramCount++;



        }



       

 if(polygon){


            query += `, polygon = $${paramCount}`;

            params.push(polygon);


            paramCount++;

        }




        if(trigger_type){



            query += `, trigger_type = $${paramCount}`;

            params.push(trigger_type);

            paramCount++;




        }



       




 if(is_active!==undefined){




            query += `, is_active = $${paramCount}`;

            params.push(is_active);

            paramCount++;




        }


      

  query += ` WHERE id = $${paramCount} RETURNING id, name, vehicle_id, trigger_type, is_active`;

        params.push(id);




        const result = await pool.query(query, params);



       

 if(result.rows.length===0){





            return error(res, 'Geofence not found', 404);



        }



     

   return success(res, {

          

  message: 'Geofence updated successfully',



            geofence: result.rows[0]



        }, 200);





    } 



catch (err){




        console.error('Update geofence error:', err);



        return error(res, 'Failed to update geofence: '+err.message, 500);

    }

}








async function deleteGeofence(req, res) {

   

 const {id} = req.params;



    try{




        const result = await pool.query('DELETE FROM geofences WHERE id = $1 RETURNING id', [id]);





        if(result.rows.length===0){




            return error(res, 'Geofence not found', 404);



        }





        return success(res, {message: 'Geofence deleted successfully'}, 200);



    } 



catch (err){




        console.error('Delete geofence error:', err);

        return error(res, 'Failed to delete geofence: '+err.message, 500);




    }

}







async function getGeofenceEvents(req, res) {

    


const {geofence_id, vehicle_id, limit=50} = req.query;



    try{

      

 let query = `





            SELECT ge.id, ge.geofence_id, g.name AS geofence_name,


                   ge.vehicle_id, ge.event_type, ge.latitude, ge.longitude,

                   ge.speed, ge.created_at

          
  FROM geofence_events ge


            LEFT JOIN geofences g ON ge.geofence_id = g.id



            WHERE 1=1



        `;



        const params = [];


        let paramCount = 1;



        if(geofence_id){




            query += ` AND ge.geofence_id = $${paramCount}`;



            params.push(geofence_id);



            paramCount++;



        }







        if(vehicle_id){








            query += ` AND ge.vehicle_id = $${paramCount}`;



            params.push(vehicle_id);



            paramCount++;



        }









        query += ` ORDER BY ge.created_at DESC LIMIT $${paramCount}`;

        params.push(parseInt(limit) || 50);



        const result = await pool.query(query, params);



        return success(res, {

            total: result.rows.length,

            events: result.rows



        }, 200);



    } 



catch (err){




        console.error('Get geofence events error:', err);

        return error(res, 'Failed to fetch geofence events: '+err.message, 500);




    }

}







async function discoverFrequentStops(req, res) {

   


 const {vehicle_id, days=30, min_points=5, radius_km=0.5 } = req.query;






    try{




        const result = await pool.query(`



            SELECT * FROM cluster_points($1, $2, $3, $4)

        `, [vehicle_id || null, parseInt(days), parseFloat(radius_km), parseInt(min_points)]);




        const features = result.rows.map(row => ({



            type: 'Feature',



            geometry: {




                type: 'Point',

                coordinates: [



                    parseFloat(row.center_lng),



                    parseFloat(row.center_lat)



                ]



            },

         
   properties: {


                vehicle_id: row.vehicle_id,



                cluster_id: row.cluster_id,



                point_count: parseInt(row.point_count),



                first_seen: row.first_seen,



                last_seen: row.last_seen,



                name: null


            }



        }));





      
  return success(res, {


            total_clusters: features.length,


            clusters: features



        }, 200);







    }


 catch (err){



        console.error('Discover frequent stops error:', err);



        return error(res, 'Failed to discover frequent stops: '+err.message, 500);





    }



}







async function createGeofenceFromCluster(req, res) {

   


 const {name, vehicle_id, center_lat, center_lng, radius_km=0.5} = req.body;






    if(!name||!center_lat||!center_lng){







        return error(res, 'Name, center_lat, and center_lng are required', 400);




    }






    try{



      

        const latDegrees = radius_km/111.32;



        const lngDegrees = radius_km/(111.32*Math.cos(parseFloat(center_lat)*Math.PI/180));




        const polygon = {





            type: 'Polygon',


            coordinates: [[


               
 [parseFloat(center_lng)-lngDegrees, parseFloat(center_lat)-latDegrees],



                [parseFloat(center_lng)+lngDegrees, parseFloat(center_lat)-latDegrees],



                [parseFloat(center_lng)+lngDegrees, parseFloat(center_lat)+latDegrees],





                [parseFloat(center_lng)-lngDegrees, parseFloat(center_lat)+latDegrees],




                [parseFloat(center_lng)-lngDegrees, parseFloat(center_lat)-latDegrees]




            ]]

        };










        const result = await pool.query(`



            INSERT INTO geofences (name, vehicle_id, polygon, trigger_type)



            VALUES ($1, $2, $3, 'both')



            RETURNING id, name, vehicle_id, trigger_type, is_active



        `, [name, vehicle_id || null, polygon]);







        return success(res, {



            message: 'Geofence created from cluster successfully',



            geofence: result.rows[0]





        }, 201);



    } 




catch (err){


     
   console.error('Create geofence from cluster error:', err);




        return error(res, 'Failed to create geofence from cluster: '+err.message, 500);





    }

}






module.exports = {





    createGeofence,


    getGeofences,



    getGeofenceById,



    updateGeofence,



    deleteGeofence,



    getGeofenceEvents,



    discoverFrequentStops,



    createGeofenceFromCluster





};

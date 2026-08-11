


const ROAD_FUEL_RATES = {

    motorway: 6.0,

    motorway_link: 6.5,

    trunk: 6.5,

    trunk_link: 7.0,

    primary: 7.0,

    primary_link: 7.5,

    secondary: 8.5,

    secondary_link: 8.5,

    tertiary: 9.0,

    tertiary_link: 9.5,

    residential: 10.0,

    living_street: 11.0,

    service: 9.0,

    unclassified: 8.5,

    road: 9.0,

};




const DEFAULT_FUEL_RATE = 8.5;



function getFuelRate(roadClass) {

    return ROAD_FUEL_RATES[roadClass] || DEFAULT_FUEL_RATE;

}



function getSpeedFactor(speedKmh) {

    if(speedKmh<20) return 1.1;

    if(speedKmh<40) return 1.0;

    if(speedKmh<60) return 0.9;

    if(speedKmh<80) return 0.85;

    if(speedKmh<100) return 0.9;

    return 1.0;

}



function haversineDistance(lat1, lon1, lat2, lon2) {

    const R = 6371;




    const dLat = (lat2 - lat1) * Math.PI / 180;



    const dLon = (lon2 - lon1) * Math.PI / 180;



    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +



              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *



              Math.sin(dLon / 2) * Math.sin(dLon / 2);



    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));


}



function calculateFuelForTrip(gpsPoints) {

    let totalDistance = 0;

    let totalFuel = 0;

    let roadBreakdown = {};

    let roadFuelBreakdown = {};

    let speedSum = 0;

    let speedCount = 0;



    for(let i=1;i<gpsPoints.length;i++){


        const prev = gpsPoints[i - 1];

        const curr = gpsPoints[i];



        const distance = haversineDistance(

            prev.latitude, prev.longitude,

            curr.latitude, curr.longitude

        );

        totalDistance += distance;



        const avgSpeed = (prev.speed + curr.speed) / 2;

        speedSum += avgSpeed;

        speedCount++;



        const roadClass = curr.road_class || 'unknown';

        const rate = getFuelRate(roadClass);

        const speedFactor = getSpeedFactor(avgSpeed);



        const fuel = (distance / 100) * rate * speedFactor;

        totalFuel += fuel;



        roadBreakdown[roadClass] = (roadBreakdown[roadClass] || 0) + distance;

        roadFuelBreakdown[roadClass] = (roadFuelBreakdown[roadClass] || 0) + fuel;

    }



    const avgSpeed = speedCount > 0 ? speedSum / speedCount : 0;



    return {

        total_distance: Math.round(totalDistance * 100) / 100,

        total_fuel: Math.round(totalFuel * 100) / 100,

        efficiency_km_l: totalDistance > 0 ? Math.round((totalDistance / totalFuel) * 100) / 100 : 0,

        efficiency_l_100km: totalDistance > 0 ? Math.round((totalFuel / totalDistance) * 100 * 100) / 100 : 0,

        avg_speed_kmh: Math.round(avgSpeed * 10) / 10,

        road_breakdown: roadBreakdown,

        road_fuel_breakdown: roadFuelBreakdown,

        points_count: gpsPoints.length,

    };

}



module.exports = {

    ROAD_FUEL_RATES,

    getFuelRate,

    getSpeedFactor,

    haversineDistance,

    calculateFuelForTrip,

};

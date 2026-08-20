

const {

    ROAD_FUEL_RATES,


    getFuelRate,

    getSpeedFactor,

    haversineDistance,

    calculateFuelForTrip,

} = require('../src/utils/fuelCalculations');



describe('Fuel Calculations - Unit Tests', () => {

    

    describe('ROAD_FUEL_RATES', () => {

        test('contains correct rates for all road types', () => {

            expect(ROAD_FUEL_RATES.motorway).toBe(6.0);

            expect(ROAD_FUEL_RATES.motorway_link).toBe(6.5);

            expect(ROAD_FUEL_RATES.trunk).toBe(6.5);

            expect(ROAD_FUEL_RATES.trunk_link).toBe(7.0);

            expect(ROAD_FUEL_RATES.primary).toBe(7.0);

            expect(ROAD_FUEL_RATES.primary_link).toBe(7.5);

            expect(ROAD_FUEL_RATES.secondary).toBe(8.5);

            expect(ROAD_FUEL_RATES.secondary_link).toBe(8.5);

            expect(ROAD_FUEL_RATES.tertiary).toBe(9.0);

            expect(ROAD_FUEL_RATES.tertiary_link).toBe(9.5);

            expect(ROAD_FUEL_RATES.residential).toBe(10.0);

            expect(ROAD_FUEL_RATES.living_street).toBe(11.0);

            expect(ROAD_FUEL_RATES.service).toBe(9.0);

            expect(ROAD_FUEL_RATES.unclassified).toBe(8.5);

            expect(ROAD_FUEL_RATES.road).toBe(9.0);

        });

    });



    describe('getFuelRate()', () => {

        test('returns correct rate for motorway', () => {

            expect(getFuelRate('motorway')).toBe(6.0);

        });



        test('returns correct rate for primary', () => {

            expect(getFuelRate('primary')).toBe(7.0);

        });



        test('returns correct rate for residential', () => {


            expect(getFuelRate('residential')).toBe(10.0);

        });



        test('returns default rate for unknown road class', () => {

            expect(getFuelRate('unknown')).toBe(8.5);

        });

    });



    describe('getSpeedFactor()', () => {

        test('returns 1.1 for speeds below 20 km/h', () => {

            expect(getSpeedFactor(10)).toBe(1.1);

            expect(getSpeedFactor(19)).toBe(1.1);

        });



        test('returns 1.0 for speeds between 20-40 km/h', () => {

            expect(getSpeedFactor(20)).toBe(1.0);

            expect(getSpeedFactor(30)).toBe(1.0);

            expect(getSpeedFactor(39)).toBe(1.0);

        });



        test('returns 0.9 for speeds between 40-60 km/h', () => {

            expect(getSpeedFactor(40)).toBe(0.9);

            expect(getSpeedFactor(50)).toBe(0.9);

            expect(getSpeedFactor(59)).toBe(0.9);

        });



        test('returns 0.85 for speeds between 60-80 km/h (optimal)', () => {

            expect(getSpeedFactor(60)).toBe(0.85);

            expect(getSpeedFactor(70)).toBe(0.85);

            expect(getSpeedFactor(79)).toBe(0.85);

        });



        test('returns 0.9 for speeds between 80-100 km/h', () => {

            expect(getSpeedFactor(80)).toBe(0.9);

            expect(getSpeedFactor(90)).toBe(0.9);

            expect(getSpeedFactor(99)).toBe(0.9);

        });



        test('returns 1.0 for speeds above 100 km/h', () => {

            expect(getSpeedFactor(100)).toBe(1.0);

            expect(getSpeedFactor(120)).toBe(1.0);

        });

    });



    describe('haversineDistance()', () => {

        test('returns 0 for same coordinates', () => {

            const dist = haversineDistance(-33.9249, 18.4241, -33.9249, 18.4241);

            expect(dist).toBe(0);

        });



        test('calculates distance between two points correctly', () => {

           



            const dist = haversineDistance(-33.9249, 18.4241, -33.9258, 18.4255);



            expect(dist).toBeCloseTo(0.13, 1);



        });







        test('calculates distance between Cape Town and Johannesburg', () => {

 

 
           const dist = haversineDistance(-33.9249, 18.4241, -26.2041, 28.0473);



            expect(dist).toBeGreaterThan(1260);


            expect(dist).toBeLessThan(1270);


        });






        test('handles negative coordinates correctly', () => {

            const dist = haversineDistance(-25.0, 28.0, -26.0, 29.0);

            expect(dist).toBeGreaterThan(100);
        

	    expect(dist).toBeLessThan(150);

        });

    });



   


 describe('calculateFuelForTrip()', () => {



        test('calculates fuel correctly for a simple trip', () => {



            const points = [



                { latitude: -33.9249, longitude: 18.4241, speed: 75, road_class: 'motorway' },



                { latitude: -33.9258, longitude: 18.4255, speed: 75, road_class: 'motorway' },

            ];

            const result = calculateFuelForTrip(points);

            

            expect(result.total_distance).toBeGreaterThan(0);

            expect(result.total_fuel).toBeGreaterThan(0);

            expect(result.efficiency_km_l).toBeGreaterThan(0);

            expect(result.points_count).toBe(2);

            expect(result.road_breakdown).toHaveProperty('motorway');

        });



        test('returns zero fuel for empty points array', () => {

            const result = calculateFuelForTrip([]);

            expect(result.total_distance).toBe(0);

            expect(result.total_fuel).toBe(0);

            expect(result.efficiency_km_l).toBe(0);

            expect(result.points_count).toBe(0);

        });



        test('returns zero fuel for single point', () => {

            const points = [

                { latitude: -33.9249, longitude: 18.4241, speed: 75, road_class: 'motorway' },

            ];

            const result = calculateFuelForTrip(points);

            expect(result.total_distance).toBe(0);

            expect(result.total_fuel).toBe(0);

            expect(result.efficiency_km_l).toBe(0);

            expect(result.points_count).toBe(1);

        });



        test('calculates road breakdown correctly for mixed road types', () => {

            const points = [

                { latitude: -33.9249, longitude: 18.4241, speed: 75, road_class: 'motorway' },

                { latitude: -33.9258, longitude: 18.4255, speed: 75, road_class: 'motorway' },

                { latitude: -33.9267, longitude: 18.4269, speed: 50, road_class: 'residential' },

                { latitude: -33.9276, longitude: 18.4283, speed: 50, road_class: 'residential' },

            ];

            const result = calculateFuelForTrip(points);

            

            expect(result.road_breakdown).toHaveProperty('motorway');

            expect(result.road_breakdown).toHaveProperty('residential');

            expect(result.road_fuel_breakdown).toHaveProperty('motorway');

            expect(result.road_fuel_breakdown).toHaveProperty('residential');

        });



        test('handles unknown road class with default rate', () => {

            const points = [

                { latitude: -33.9249, longitude: 18.4241, speed: 75, road_class: 'unknown' },

                { latitude: -33.9258, longitude: 18.4255, speed: 75, road_class: 'unknown' },

            ];

            const result = calculateFuelForTrip(points);

            expect(result.total_fuel).toBeGreaterThan(0);

            expect(result.efficiency_km_l).toBeGreaterThan(0);

            expect(result.road_breakdown).toHaveProperty('unknown');

        });



        test('calculates average speed correctly', () => {

            const points = [

                { latitude: -33.9249, longitude: 18.4241, speed: 60, road_class: 'motorway' },

                { latitude: -33.9258, longitude: 18.4255, speed: 80, road_class: 'motorway' },

                { latitude: -33.9267, longitude: 18.4269, speed: 100, road_class: 'motorway' },

            ];

            const result = calculateFuelForTrip(points);

            expect(result.avg_speed_kmh).toBe(80);

        });



        test('handles zero speed points', () => {

            const points = [

                { latitude: -33.9249, longitude: 18.4241, speed: 0, road_class: 'motorway' },

                { latitude: -33.9258, longitude: 18.4255, speed: 0, road_class: 'motorway' },

            ];

            const result = calculateFuelForTrip(points);

            expect(result.total_distance).toBeGreaterThan(0);

            expect(result.total_fuel).toBeGreaterThan(0);

            expect(result.avg_speed_kmh).toBe(0);

        });

    });

});


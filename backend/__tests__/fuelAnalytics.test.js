'use strict';

const {
	getFuelAnalytics,
	REPORT_TIMEZONE,
	_deriveVehicle,
	_summarise,
	_efficiency,
} = require('../src/services/fuelAnalytics');

const PERIOD = {
	from: new Date('2026-08-02T22:00:00Z'),
	to: new Date('2026-08-09T22:00:00Z'),
	days: 7,
};

function row(overrides = {}){
	return {
		vehicle_id: 'V001',
		trip_count: '3',
		fuel_liters: '40',
		fuel_model_distance_km: '400',
		odometer_distance_km: '395',
		days_with_fuel_data: '2',
		...overrides,
	};
}

const ROAD_ROWS = [
	{ road_class: 'motorway', distance_km: '250.5' },
	{ road_class: 'residential', distance_km: '90.25' },
	{ road_class: 'primary', distance_km: '59.25' },
];

function makeDb({ vehicleRows = [row()], roadRows = ROAD_ROWS } = {}){
	const calls = [];
	return {
		calls,
		query: jest.fn((sql, params) => {
			calls.push({ sql, params });
			if (sql.includes('jsonb_each_text')) {
				return Promise.resolve({ rows: roadRows, rowCount: roadRows.length });
			}
			return Promise.resolve({ rows: vehicleRows, rowCount: vehicleRows.length });
		}),
	};
}

describe('fuelAnalytics - guard clauses', () => {
	test('rejects a db handle without a query function', async () => {
		await expect(getFuelAnalytics({}, [], PERIOD))
			.rejects.toThrow('getFuelAnalytics requires a pg client or pool');
	});

	test('rejects a vehicleIds value that is not an array', async () => {
		await expect(getFuelAnalytics(makeDb(), null, PERIOD))
			.rejects.toThrow('getFuelAnalytics requires a vehicleIds array from scopeResolver');
	});

	test.each([
		['a missing period', undefined],
		['a period with string bounds', { from: '2026-08-03', to: '2026-08-10' }],
	])('rejects %s', async (_label, period) => {
		await expect(getFuelAnalytics(makeDb(), ['V001'], period))
			.rejects.toThrow('getFuelAnalytics requires a resolved period with Date bounds');
	});
});

describe('fuelAnalytics - query construction', () => {
	test('reports in SAST', () => {
		expect(REPORT_TIMEZONE).toBe('Africa/Johannesburg');
	});

	test('issues one per-vehicle query and one road class query', async () => {
		const db = makeDb();
		await getFuelAnalytics(db, ['V001'], PERIOD);

		expect(db.query).toHaveBeenCalledTimes(2);
	});

	test('the per-vehicle query receives the timezone, the road class query does not', async () => {
		const db = makeDb();
		await getFuelAnalytics(db, ['V001', 'V002'], PERIOD);

		const perVehicle = db.calls.find((c) => !c.sql.includes('jsonb_each_text'));
		const roadClass = db.calls.find((c) => c.sql.includes('jsonb_each_text'));

		expect(perVehicle.params).toEqual([['V001', 'V002'], PERIOD.from, PERIOD.to, 'Africa/Johannesburg']);
		expect(roadClass.params).toEqual([['V001', 'V002'], PERIOD.from, PERIOD.to]);
	});

	test('filters on the trip window rather than the fuel row timestamp', async () => {
		const db = makeDb();
		await getFuelAnalytics(db, ['V001'], PERIOD);

		const perVehicle = db.calls.find((c) => !c.sql.includes('jsonb_each_text'));
		expect(perVehicle.sql).toContain('t.start_time >= $2');
		expect(perVehicle.sql).toContain('t.start_time <  $3');
		expect(perVehicle.sql).toContain("t.status = 'completed'");
	});

	test('does not query at all for an empty scope', async () => {
		const db = makeDb();
		await getFuelAnalytics(db, [], PERIOD);

		expect(db.query).not.toHaveBeenCalled();
	});
});

describe('_efficiency()', () => {
	test('derives km per litre and litres per 100 km from the same pair', () => {
		expect(_efficiency(400, 40)).toEqual({
			avgEfficiencyKmPerL: 10,
			avgConsumptionLPer100Km: 10,
		});
	});

	test('the two measures are reciprocal', () => {
		const { avgEfficiencyKmPerL, avgConsumptionLPer100Km } = _efficiency(500, 40);

		expect(avgEfficiencyKmPerL).toBe(12.5);
		expect(avgConsumptionLPer100Km).toBe(8);
		expect(avgEfficiencyKmPerL * avgConsumptionLPer100Km).toBeCloseTo(100, 6);
	});

	test('returns null efficiency when no fuel was consumed', () => {
		expect(_efficiency(400, 0).avgEfficiencyKmPerL).toBeNull();
	});

	test('returns null consumption when no distance was covered', () => {
		expect(_efficiency(0, 40).avgConsumptionLPer100Km).toBeNull();
	});

	test('a zero numerator is still a real zero, not a null', () => {
		expect(_efficiency(0, 40).avgEfficiencyKmPerL).toBe(0);
		expect(_efficiency(400, 0).avgConsumptionLPer100Km).toBe(0);
	});

	test('rounds to two decimals', () => {
		expect(_efficiency(100, 13).avgEfficiencyKmPerL).toBe(7.69);
	});
});

describe('_deriveVehicle()', () => {
	test('coerces string columns into numbers', () => {
		const v = _deriveVehicle(row());

		expect(v.vehicleId).toBe('V001');
		expect(v.tripsWithFuelData).toBe(3);
		expect(v.daysWithFuelData).toBe(2);
		expect(v.fuelLiters).toBe(40);
	});

	test('keeps the modelled distance separate from the odometer distance', () => {
		const v = _deriveVehicle(row());

		expect(v.fuelModelDistanceKm).toBe(400);
		expect(v.odometerDistanceKm).toBe(395);
	});

	test('computes efficiency against the modelled distance', () => {
		const v = _deriveVehicle(row());

		expect(v.avgEfficiencyKmPerL).toBe(10);
		expect(v.avgConsumptionLPer100Km).toBe(10);
	});

	test('flags the figures as estimated', () => {
		expect(_deriveVehicle(row()).estimated).toBe(true);
	});

	test('treats missing columns as zero rather than NaN', () => {
		const v = _deriveVehicle({ vehicle_id: 'V009' });

		expect(v.fuelLiters).toBe(0);
		expect(v.tripsWithFuelData).toBe(0);
		expect(v.avgEfficiencyKmPerL).toBeNull();
	});

	test('a vehicle that burned no fuel has null efficiency', () => {
		const v = _deriveVehicle(row({ fuel_liters: '0' }));

		expect(v.fuelLiters).toBe(0);
		expect(v.avgEfficiencyKmPerL).toBeNull();
		expect(v.avgConsumptionLPer100Km).toBe(0);
	});
});

describe('_summarise()', () => {
	const V1 = _deriveVehicle(row({
		vehicle_id: 'V001',
		trip_count: '3',
		fuel_liters: '40',
		fuel_model_distance_km: '400',
		odometer_distance_km: '395',
	}));

	const V2 = _deriveVehicle(row({
		vehicle_id: 'V002',
		trip_count: '2',
		fuel_liters: '10',
		fuel_model_distance_km: '200',
		odometer_distance_km: '205',
	}));

	test('sums the additive totals', () => {
		const s = _summarise([V1, V2], 3, {});

		expect(s.tripsWithFuelData).toBe(5);
		expect(s.totalFuelLiters).toBe(50);
		expect(s.totalFuelModelDistanceKm).toBe(600);
		expect(s.totalOdometerDistanceKm).toBe(600);
	});

	test('fleet efficiency is total distance over total fuel, not a mean of per-vehicle rates', () => {
		const s = _summarise([V1, V2], 3, {});

		expect(s.avgEfficiencyKmPerL).toBe(12);
	});

	test('reports the variance between the fuel model and the odometer', () => {
		const s = _summarise([V1], 1, {});

		expect(s.distanceVariancePct).toBe(1.27);
	});

	test('variance is negative when the model under-reports', () => {
		expect(_summarise([V2], 1, {}).distanceVariancePct).toBe(-2.44);
	});

	test('variance is null when there is no odometer distance to compare against', () => {
		const noOdo = _deriveVehicle(row({ odometer_distance_km: '0' }));
		expect(_summarise([noOdo], 1, {}).distanceVariancePct).toBeNull();
	});

	test('counts vehicles with and without fuel data against the scope', () => {
		const s = _summarise([V1, V2], 5, {});

		expect(s.vehiclesWithFuelData).toBe(2);
		expect(s.vehiclesWithoutFuelData).toBe(3);
		expect(s.vehiclesInScope).toBe(5);
	});

	test('never reports a negative count of vehicles without data', () => {
		expect(_summarise([V1, V2], 1, {}).vehiclesWithoutFuelData).toBe(0);
	});

	test('carries the road class breakdown through unchanged', () => {
		const breakdown = { motorway: 250.5, residential: 90.25 };
		expect(_summarise([V1], 1, breakdown).roadClassDistanceKm).toBe(breakdown);
	});

	test('summarises an empty fleet without dividing by zero', () => {
		const s = _summarise([], 0, {});

		expect(s.totalFuelLiters).toBe(0);
		expect(s.tripsWithFuelData).toBe(0);
		expect(s.avgEfficiencyKmPerL).toBeNull();
		expect(s.avgConsumptionLPer100Km).toBeNull();
		expect(s.distanceVariancePct).toBeNull();
		expect(s.vehiclesWithoutFuelData).toBe(0);
	});

	test('flags the summary as estimated', () => {
		expect(_summarise([V1], 1, {}).estimated).toBe(true);
	});
});

describe('getFuelAnalytics() - end to end', () => {
	test('returns a summary, per-vehicle rows and a road class breakdown', async () => {
		const db = makeDb({
			vehicleRows: [
				row({ vehicle_id: 'V001' }),
				row({ vehicle_id: 'V002', fuel_liters: '10', fuel_model_distance_km: '200' }),
			],
		});

		const result = await getFuelAnalytics(db, ['V001', 'V002', 'V003'], PERIOD);

		expect(result.vehicles).toHaveLength(2);
		expect(result.summary.vehiclesWithFuelData).toBe(2);
		expect(result.summary.vehiclesWithoutFuelData).toBe(1);
		expect(result.summary.roadClassDistanceKm).toEqual({
			motorway: 250.5,
			residential: 90.25,
			primary: 59.25,
		});
	});

	test('road class distances are coerced from NUMERIC strings', async () => {
		const result = await getFuelAnalytics(makeDb(), ['V001'], PERIOD);

		Object.values(result.summary.roadClassDistanceKm)
			.forEach((value) => expect(typeof value).toBe('number'));
	});

	test('an empty road breakdown produces an empty object, not undefined', async () => {
		const db = makeDb({ roadRows: [] });
		const result = await getFuelAnalytics(db, ['V001'], PERIOD);

		expect(result.summary.roadClassDistanceKm).toEqual({});
	});

	test('an empty scope returns a zeroed summary rather than throwing', async () => {
		const result = await getFuelAnalytics(makeDb(), [], PERIOD);

		expect(result.vehicles).toEqual([]);
		expect(result.summary.totalFuelLiters).toBe(0);
		expect(result.summary.vehiclesInScope).toBe(0);
		expect(result.summary.roadClassDistanceKm).toEqual({});
	});

	test('a scope with no fuel rows still reports the vehicles as in scope', async () => {
		const db = makeDb({ vehicleRows: [], roadRows: [] });
		const result = await getFuelAnalytics(db, ['V001', 'V002'], PERIOD);

		expect(result.summary.vehiclesInScope).toBe(2);
		expect(result.summary.vehiclesWithFuelData).toBe(0);
		expect(result.summary.vehiclesWithoutFuelData).toBe(2);
	});

	test('summary totals agree with the per-vehicle rows', async () => {
		const db = makeDb({
			vehicleRows: [
				row({ vehicle_id: 'V001', fuel_liters: '10' }),
				row({ vehicle_id: 'V002', fuel_liters: '20' }),
				row({ vehicle_id: 'V003', fuel_liters: '30' }),
			],
		});

		const { summary, vehicles } = await getFuelAnalytics(db, ['V001', 'V002', 'V003'], PERIOD);
		const manual = vehicles.reduce((sum, v) => sum + v.fuelLiters, 0);

		expect(summary.totalFuelLiters).toBe(manual);
	});

	test('propagates a database failure to the caller', async () => {
		const db = { query: jest.fn().mockRejectedValue(new Error('relation does not exist')) };

		await expect(getFuelAnalytics(db, ['V001'], PERIOD))
			.rejects.toThrow('relation does not exist');
	});
});
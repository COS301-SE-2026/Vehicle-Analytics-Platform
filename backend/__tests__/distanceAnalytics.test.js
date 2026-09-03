'use strict';
const {
	getDistanceAnalytics,
	REPORT_TIMEZONE,
	_deriveVehicle,
	_summarise,
} = require('../src/services/distanceAnalytics');

const PERIOD = {
	from: new Date('2026-08-02T22:00:00Z'),
	to: new Date('2026-08-09T22:00:00Z'),
	days: 7,
};

function row(overrides = {}){
	return {
		vehicle_id: 'V001',
		trip_count: '4',
		distance_km: '120.5',
		duration_seconds: '7200',
		moving_seconds: '5400',
		max_speed_kmh: '95.4',
		days_active: '3',
		...overrides,
	};
}

function makeDb(rows = [row()]){
	const calls = [];
	return {
		calls,
		query: jest.fn((sql, params) => {
			calls.push({ sql, params });
			return Promise.resolve({ rows, rowCount: rows.length });
		}),
	};
}

describe('distanceAnalytics - guard clauses', () => {
	test('rejects a db handle without a query function', async () => {
		await expect(getDistanceAnalytics(null, [], PERIOD))
			.rejects.toThrow('getDistanceAnalytics requires a pg client or pool');
	});

	test('rejects a vehicleIds value that is not an array', async () => {
		await expect(getDistanceAnalytics(makeDb(), 'V001', PERIOD))
			.rejects.toThrow('getDistanceAnalytics requires a vehicleIds array from scopeResolver');
	});

	test.each([
		['a missing period', undefined],
		['a period with string bounds', { from: '2026-08-03', to: '2026-08-10', days: 7 }],
		['a period missing an upper bound', { from: new Date(), days: 7 }],
	])('rejects %s', async (_label, period) => {
		await expect(getDistanceAnalytics(makeDb(), ['V001'], period))
			.rejects.toThrow('getDistanceAnalytics requires a resolved period with Date bounds');
	});

});

describe('distanceAnalytics - query construction', () => {
	test('passes the scope, both bounds and the reporting timezone', async () => {
		const db = makeDb();
		await getDistanceAnalytics(db, ['V001', 'V002'], PERIOD);

		expect(db.query).toHaveBeenCalledTimes(1);
		expect(db.calls[0].params).toEqual([
			['V001', 'V002'],
			PERIOD.from,
			PERIOD.to,
			'Africa/Johannesburg',
		]);
	});


	test('reports in SAST', () => {
		expect(REPORT_TIMEZONE).toBe('Africa/Johannesburg');
	});


	test('converts timestamps to SAST before taking the date, not ::date', async () => {
		const db = makeDb();
		await getDistanceAnalytics(db, ['V001'], PERIOD);
		expect(db.calls[0].sql).toContain("AT TIME ZONE $4");

	});

	test('only counts completed trips', async () => {
		const db = makeDb();
		await getDistanceAnalytics(db, ['V001'], PERIOD);
		expect(db.calls[0].sql).toContain("status = 'completed'");

	});

	test('uses a half-open interval on start_time', async () => {
		const db = makeDb();
		await getDistanceAnalytics(db, ['V001'], PERIOD);
		expect(db.calls[0].sql).toContain('start_time >= $2');
		expect(db.calls[0].sql).toContain('start_time < $3');
	});

	test('does not query at all for an empty scope', async () => {
		const db = makeDb();
		await getDistanceAnalytics(db, [], PERIOD);
		expect(db.query).not.toHaveBeenCalled();
	});
});

describe('_deriveVehicle()', () => {
	test('coerces string columns into numbers', () => {
		const v = _deriveVehicle(row(), 7);
		expect(v.vehicleId).toBe('V001');
		expect(v.tripCount).toBe(4);
		expect(v.distanceKm).toBe(120.5);
		expect(v.durationSeconds).toBe(7200);
		expect(v.daysActive).toBe(3);
	});

	test('derives idle time as duration minus moving time', () => {
		const v = _deriveVehicle(row(), 7);
		expect(v.movingSeconds).toBe(5400);
		expect(v.idleSeconds).toBe(1800);
		expect(v.idleRatio).toBe(0.25);
	});

	test('never reports negative idle time when moving exceeds duration', () => {
		const v = _deriveVehicle(row({ moving_seconds: '9000', duration_seconds: '7200' }), 7);
		expect(v.idleSeconds).toBe(0);
		expect(v.idleRatio).toBe(0);
	});

	test('computes average trip distance as distance over trips', () => {
		expect(_deriveVehicle(row(), 7).avgTripDistanceKm).toBe(30.13);
	});

	test('separates moving speed from journey speed', () => {
		const v = _deriveVehicle(row(), 7);
		expect(v.avgMovingSpeedKmh).toBe(80.33);
		expect(v.avgJourneySpeedKmh).toBe(60.25);
	});

	test('expresses utilisation as active days over period days', () => {
		expect(_deriveVehicle(row({ days_active: '3' }), 7).utilisationPct).toBe(42.86);
		expect(_deriveVehicle(row({ days_active: '7' }), 7).utilisationPct).toBe(100);
	});

	test('returns null rather than zero for a genuinely null max speed', () => {
		expect(_deriveVehicle(row({ max_speed_kmh: null }), 7).maxSpeedKmh).toBeNull();
	});

	test('keeps a real zero max speed as zero', () => {
		expect(_deriveVehicle(row({ max_speed_kmh: '0' }), 7).maxSpeedKmh).toBe(0);
	});

	test('returns null ratios instead of dividing by zero', () => {
		const v = _deriveVehicle(row({
			trip_count: '0',
			duration_seconds: '0',
			moving_seconds: '0',
			distance_km: '0',
		}), 7);

		expect(v.idleRatio).toBeNull();
		expect(v.avgTripDistanceKm).toBeNull();
		expect(v.avgMovingSpeedKmh).toBeNull();
		expect(v.avgJourneySpeedKmh).toBeNull();
	});

	test('returns null utilisation when the period has no days', () => {
		expect(_deriveVehicle(row(), 0).utilisationPct).toBeNull();
	});

	test('treats missing columns as zero rather than NaN', () => {
		const v = _deriveVehicle({ vehicle_id: 'V009' }, 7);
		expect(v.tripCount).toBe(0);
		expect(v.distanceKm).toBe(0);
		expect(v.durationSeconds).toBe(0);
		expect(Number.isNaN(v.distanceKm)).toBe(false);
	});

	test('rounds distance to two decimals and idle ratio to four', () => {
		const v = _deriveVehicle(row({
			distance_km: '120.456789',
			duration_seconds: '10000',
			moving_seconds: '6667',
		}), 7);

		expect(v.distanceKm).toBe(120.46);
		expect(String(v.idleRatio).split('.')[1].length).toBeLessThanOrEqual(4);
	});
});

describe('_summarise()', () => {
	const V1 = _deriveVehicle(row({
		vehicle_id: 'V001',
		trip_count: '2',
		distance_km: '100',
		duration_seconds: '3600',
		moving_seconds: '3000',
		max_speed_kmh: '90',
		days_active: '2',
	}), 7);

	const V2 = _deriveVehicle(row({
		vehicle_id: 'V002',
		trip_count: '1',
		distance_km: '50',
		duration_seconds: '1800',
		moving_seconds: '1800',
		max_speed_kmh: '110',
		days_active: '1',
	}), 7);

	test('sums the additive totals', () => {
		const s = _summarise([V1, V2], 3, 7);

		expect(s.totalDistanceKm).toBe(150);
		expect(s.totalDurationSeconds).toBe(5400);
		expect(s.totalMovingSeconds).toBe(4800);
		expect(s.totalIdleSeconds).toBe(600);
		expect(s.tripCount).toBe(3);
	});

	test('computes fleet averages as a ratio of sums, not a mean of ratios', () => {
		const s = _summarise([V1, V2], 3, 7);
		expect(s.avgTripDistanceKm).toBe(50);
		expect(s.avgMovingSpeedKmh).toBe(112.5);
		expect(s.avgJourneySpeedKmh).toBe(100);

	});

	test('idle ratio is total idle over total duration', () => {
		expect(_summarise([V1, V2], 3, 7).idleRatio).toBe(0.1111);
	});

	test('peak speed is the maximum across vehicles, not an average', () => {
		expect(_summarise([V1, V2], 3, 7).maxSpeedKmh).toBe(110);
	});

	test('counts active and inactive vehicles against the scope size', () => {
		const s = _summarise([V1, V2], 3, 7);
		expect(s.activeVehicles).toBe(2);
		expect(s.inactiveVehicles).toBe(1);
		expect(s.vehiclesInScope).toBe(3);
	});

	test('never reports negative inactive vehicles', () => {
		expect(_summarise([V1, V2], 1, 7).inactiveVehicles).toBe(0);
	});

	test('fleet utilisation is active vehicle-days over available vehicle-days', () => {
		expect(_summarise([V1, V2], 3, 7).utilisationPct).toBe(14.29);
	});



// a 100 percent situation  
// NOTE TO SELF: that i should not forget the Edge cases
	test('reaches 100 percent when every vehicle is active every day', () => {
		const full = _deriveVehicle(row({ days_active: '7' }), 7);
		expect(_summarise([full], 1, 7).utilisationPct).toBe(100);
	});

	test('summarises an empty fleet without dividing by zero', () => {
		const s = _summarise([], 0, 7);
		expect(s.totalDistanceKm).toBe(0);
		expect(s.tripCount).toBe(0);
		expect(s.activeVehicles).toBe(0);
		expect(s.inactiveVehicles).toBe(0);
		expect(s.idleRatio).toBeNull();
		expect(s.avgTripDistanceKm).toBeNull();
		expect(s.avgMovingSpeedKmh).toBeNull();
		expect(s.maxSpeedKmh).toBeNull();
		expect(s.utilisationPct).toBeNull();
	});

	test('ignores null max speeds when taking the peak', () => {
		const noSpeed = _deriveVehicle(row({ vehicle_id: 'V003', max_speed_kmh: null }), 7);
		expect(_summarise([V1, noSpeed], 2, 7).maxSpeedKmh).toBe(90);
	});

	test('reports null peak speed when no vehicle recorded one', () => {
		const noSpeed = _deriveVehicle(row({ max_speed_kmh: null }), 7);
		expect(_summarise([noSpeed], 1, 7).maxSpeedKmh).toBeNull();
	});

	test('echoes the period length for downstream comparison', () => {
		expect(_summarise([V1], 1, 7).periodDays).toBe(7);
	});

});

describe('getDistanceAnalytics() - end to end', () => {
	test('returns a summary and a per-vehicle breakdown', async () => {
		const db = makeDb([
			row({ vehicle_id: 'V001' }),
			row({ vehicle_id: 'V002', distance_km: '60', trip_count: '2', days_active: '2' }),
		]);
		const result = await getDistanceAnalytics(db, ['V001', 'V002', 'V003'], PERIOD);
		expect(result.vehicles).toHaveLength(2);
		expect(result.vehicles.map((v) => v.vehicleId)).toEqual(['V001', 'V002']);
		expect(result.summary.activeVehicles).toBe(2);
		expect(result.summary.inactiveVehicles).toBe(1);
		expect(result.summary.vehiclesInScope).toBe(3);
	});

	test('a vehicle with no trips is counted as inactive, not omitted from the scope', async () => {
		const db = makeDb([row({ vehicle_id: 'V001' })]);
		const result = await getDistanceAnalytics(db, ['V001', 'V002'], PERIOD);
		expect(result.vehicles).toHaveLength(1);
		expect(result.summary.inactiveVehicles).toBe(1);
	});

	test('an empty scope returns a zeroed summary rather than throwing', async () => {
		const result = await getDistanceAnalytics(makeDb(), [], PERIOD);
		expect(result.vehicles).toEqual([]);
		expect(result.summary.totalDistanceKm).toBe(0);
		expect(result.summary.vehiclesInScope).toBe(0);
		expect(result.summary.periodDays).toBe(7);
	});

	test('a scope with no matching trips returns zeros, not nulls, for totals', async () => {
		const result = await getDistanceAnalytics(makeDb([]), ['V001', 'V002'], PERIOD);
		expect(result.vehicles).toEqual([]);
		expect(result.summary.totalDistanceKm).toBe(0);
		expect(result.summary.activeVehicles).toBe(0);
		expect(result.summary.inactiveVehicles).toBe(2);

	});

	test('summary totals agree with the per-vehicle rows', async () => {
		const db = makeDb([
			row({ vehicle_id: 'V001', distance_km: '10', trip_count: '1' }),
			row({ vehicle_id: 'V002', distance_km: '20', trip_count: '2' }),
			row({ vehicle_id: 'V003', distance_km: '30', trip_count: '3' }),
		]);
		const { summary, vehicles } = await getDistanceAnalytics(db, ['V001', 'V002', 'V003'], PERIOD);
		const manualDistance = vehicles.reduce((sum, v) => sum + v.distanceKm, 0);
		expect(summary.totalDistanceKm).toBe(manualDistance);
		expect(summary.tripCount).toBe(6);
	});

	test('propagates a database failure to the caller', async () => {
		const db = { query: jest.fn().mockRejectedValue(new Error('connection terminated')) };
		await expect(getDistanceAnalytics(db, ['V001'], PERIOD))
			.rejects.toThrow('connection terminated');
	});

	test('period days come from the resolved period, not from the rows', async () => {
		const monthly = { from: PERIOD.from, to: PERIOD.to, days: 31 };
		const result = await getDistanceAnalytics(makeDb(), ['V001'], monthly);
		expect(result.summary.periodDays).toBe(31);
		expect(result.vehicles[0].utilisationPct).toBe(9.68);
	});
});
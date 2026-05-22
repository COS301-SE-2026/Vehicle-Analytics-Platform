"use strict";

jest.mock("pg", () => {
    const Pool = jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    end:     jest.fn(),
  }));
  return { Pool };
});

const { parseRecord, buildInsert } = require("../index");

// the pasreRecord test 

describe("parseRecord()", () => {
 
  const validRecord = {
    measurement:        "avl",
    time:               "2026-05-15T13:20:00.034",
    device_id:          "CAPSTONE-001",
    vehicle_id:         "1000",
    event:              "",
    lat_lng:            "-28.2464333,28.30739",
    spd:                "57",
    total_odometer:     "80774316",
    ignition:           "Ignition On",
    movement:           "Movement On",
    green_driving_type: "",
    crash_detection:    "",
    stream_time:        "2026-05-15T13:16:59.473169Z", // should be ignored
  };
 
  test("returns a tuple with correct values for a valid record", () => {
    const row = parseRecord(validRecord);
    expect(row).not.toBeNull();
    expect(row).toEqual([
      "2026-05-15T13:20:00.034",
      "1000",
      "avl",
      "CAPSTONE-001",
      null,
      "-28.2464333,28.30739",
      "57",
      "80774316",
      "Ignition On",
      "Movement On",
      null, 
      null,  
    ]);
  });
 
  test("returns null when time is missing", () => {
    const record = { ...validRecord, time: undefined };
    expect(parseRecord(record)).toBeNull();
  });
 
  test("returns null when vehicle_id is missing", () => {
    const record = { ...validRecord, vehicle_id: undefined };
    expect(parseRecord(record)).toBeNull();
  });
 
  test("returns null when both time and vehicle_id are missing", () => {
    expect(parseRecord({})).toBeNull();
  });
 
  test("converts empty string fields to null", () => {
    const row = parseRecord(validRecord);
    // green_driving_type and crash_detection are empty strings in validRecord
    expect(row[10]).toBeNull(); // green_driving_type
    expect(row[11]).toBeNull(); // crash_detection
  });
 
  test("does not include stream_time in the returned tuple", () => {
    const row = parseRecord(validRecord);
    expect(row).toHaveLength(12);
  });
 
  test("handles avl_event measurement type correctly", () => {
    const eventRecord = {
      ...validRecord,
      measurement: "avl_event",
      event:       "ignition",
      vehicle_id:  "1005",
      device_id:   "CAPSTONE-006",
    };
    const row = parseRecord(eventRecord);
    expect(row).not.toBeNull();
    expect(row[1]).toBe("1005");        // vehicle_id
    expect(row[2]).toBe("avl_event");   // measurement
    expect(row[4]).toBe("ignition");    // event
  });
 
  test("handles missing optional fields gracefully", () => {
    const minimalRecord = {
      time:       "2026-05-15T13:20:00.034",
      vehicle_id: "1000",
    };
    const row = parseRecord(minimalRecord);
    expect(row).not.toBeNull();
    expect(row[2]).toBeNull();  // measurement
    expect(row[3]).toBeNull();  // device_id
    expect(row[4]).toBeNull();  // event
    expect(row[5]).toBeNull();  // lat_lng
    expect(row[6]).toBeNull();  // spd
    expect(row[7]).toBeNull();  // total_odometer
    expect(row[8]).toBeNull();  // ignition
    expect(row[9]).toBeNull();  // movement
    expect(row[10]).toBeNull(); // green_driving_type
    expect(row[11]).toBeNull(); // crash_detection
  });
 
});

// building the insert test jere

describe("buildInsert()", () => {
 
  const singleRow = [
    "2026-05-15T13:20:00.034", "1000", "avl", "CAPSTONE-001",
    "", "-28.2464333,28.30739", "57", "80774316",
    "Ignition On", "Movement On", null, null,
  ];
 
  const secondRow = [
    "2026-05-15T13:21:00.034", "1001", "avl_event", "CAPSTONE-002",
    "ignition", "-26.2267933,27.7075966", "20", "78429869",
    "Ignition On", "Movement On", null, null,
  ];
 
  test("generates correct SQL for a single row", () => {
    const { sql } = buildInsert([singleRow]);
    expect(sql).toContain("INSERT INTO raw_telemetry");
    expect(sql).toContain("ON CONFLICT (time, vehicle_id) DO NOTHING");
    expect(sql).toContain("$1");
    expect(sql).toContain("$12");
    expect(sql).not.toContain("$13");
  });
 
  test("generates correct SQL for multiple rows", () => {
    const { sql } = buildInsert([singleRow, secondRow]);
    expect(sql).toContain("$13");
    expect(sql).toContain("$24");
    expect(sql).not.toContain("$25");
  });
 
  test("flattens values correctly for a single row", () => {
    const { values } = buildInsert([singleRow]);
    expect(values).toHaveLength(12);
    expect(values[0]).toBe("2026-05-15T13:20:00.034"); // time
    expect(values[1]).toBe("1000");// vehicle_id
  });
 
  test("flattens values correctly for multiple rows", () => {
    const { values } = buildInsert([singleRow, secondRow]);
    expect(values).toHaveLength(24);
    expect(values[12]).toBe("2026-05-15T13:21:00.034"); // second row time
    expect(values[13]).toBe("1001");                     // second row vehicle_id
  });
 
  test("returns both sql and values keys", () => {
    const result = buildInsert([singleRow]);
    expect(result).toHaveProperty("sql");
    expect(result).toHaveProperty("values");
  });
 
  test("SQL contains all 12 column names", () => {
    const { sql } = buildInsert([singleRow]);
    const expectedColumns = [
      "time", "vehicle_id", "measurement", "device_id", "event",
      "lat_lng", "spd", "total_odometer", "ignition", "movement",
      "green_driving_type", "crash_detection",
    ];
    expectedColumns.forEach(col => expect(sql).toContain(col));
  });
 
});
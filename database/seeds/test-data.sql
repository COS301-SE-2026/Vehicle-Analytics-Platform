-- Test data for development
INSERT INTO vehicles (id, registration, make, model, year)
VALUES 
  (gen_random_uuid(), 'ABC123', 'Toyota', 'Corolla', 2022),
  (gen_random_uuid(), 'XYZ789', 'Ford', 'Ranger', 2023);

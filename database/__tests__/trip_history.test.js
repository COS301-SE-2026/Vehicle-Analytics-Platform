// the trip history to be tests
const {Pool} = require('pg');

const pool = new Pool();
let client;
beforeEach(async () => {
    client = await pool.connect();
    await client.query('BEGIN');
});
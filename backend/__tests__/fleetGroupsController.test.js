const request = require('supertest');
const app = require('../src/app');
const {mockQuery} = require('pg');
const generateToken = require('../tests/generateToken');

process.env.JWT_SECRET = 'test_secret_key';
process.env.NODE_ENV = 'test';

describe('Fleet Groups API', () => {
    let adminToken;
    let managerToken;

    beforeAll(() => {
        adminToken = generateToken(1, 'admin@test.com', 'admin');
        managerToken = generateToken(2, 'manager@test.com', 'fleet_manager');
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const authGet = (endpoint, token = adminToken) =>
        request(app).get(endpoint).set('Authorization', `Bearer ${token}`);

    const authPost = (endpoint, body, token = adminToken) =>
        request(app).post(endpoint).set('Authorization', `Bearer ${token}`).send(body);

    const authPatch = (endpoint, body,  token = adminToken) =>
        request(app).patch(endpoint).set('Authorization', `Bearer ${token}`).send(body);

    const authDelete = (endpoint, token = adminToken) =>
        request(app).delete(endpoint).set('Authorization', `Bearer ${token}`);


    describe('POST /api/fleet-groups', () => {
        it('rejects a missing fleet group name', async()=> {
            const res = await authPost('/api/fleet-groups', {description: 'no name' });
            expect(res.status).toBe(400);
        });

        it('creates a group', async()=> {
            mockQuery.mockResolvedValueOnce({
                rows: [{id: 1, name: 'North West Group', description: null, created_at: new Date()}],
            });
            const res = await authPost('/api/fleet-groups', {name: 'North West Group' });
            expect(res.status).toBe(201);
            expect(res.body.data.group.is_unassigned).toBe(true);
            expect(res.body.data.group.vehicle_count).toBe(0);
        });

        it('rejects a non-admin caller', async()=> {
            const res = await authPost('/api/fleet-groups', {name: 'X'}, managerToken);
            expect(res.status).toBe(403);
        });

        it('returns 409 on duplicative active fleet group name', async()=> {
            mockQuery.mockRejectedValueOnce({
                code: '23505'
            });

            const res = await authPost('/api/fleet-groups', {name: 'Dup' });
            expect(res.status).toBe(409);
        });

        it('handles a db error', async()=> {
            mockQuery.mockRejectedValueOnce(new Error('db down'));

            const res = await authPost('/api/fleet-groups', {name: 'Err' });
            expect(res.status).toBe(500);
        });
    });


    describe('GET /api/fleet-groups', () => {

        it('lists only non deleted groups and flags unassigned ones', async()=> {
            mockQuery.mockResolvedValueOnce({
                rows: [
                    {id: 1, name: 'A', description: null, created_at: new Date(), vehicle_count: '3', assigned_managers: []},
                    {id: 1, name: 'B', description: null, created_at: new Date(), vehicle_count: '5', assigned_managers: [{id: 9, name: 'Mgr', email: 'm@x.com'}] },
                ],
            });
            const res = await authGet('/api/fleet-groups');
            expect(res.status).toBe(200);
            expect(res.body.data.groups[0].is_unassigned).toBe(true);
            expect(res.body.data.groups[1].is_unassigned).toBe(false);
            expect(res.body.data.groups[0].vehicle_count).toBe(3);
            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('fg.deleted_at IS NULL'));
        });

        it('handles a db error', async()=> {
            mockQuery.mockRejectedValueOnce(new Error('boom'));

            const res = await authGet('/api/fleet-groups');
            expect(res.status).toBe(500);
        });  
    });


    describe('POST /api/fleet-groups/:id/assignments', () => {

        it('requires managerId', async()=> {
            const res = await authPost('/api/fleet-groups/1/assignments', {});
            expect(res.status).toBe(400);
        });

        it('404s when the group does not exist or is soft deleted', async()=> {
            mockQuery.mockResolvedValueOnce({rows: [] });
            const res = await authPost('/api/fleet-groups/999/assignments', {managerId: 5});
            expect(res.status).toBe(404);
            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('deleted_at IS NULL'), ['999']);
        });

        it('404s when the user does not exist', async()=> {
            mockQuery
                .mockResolvedValueOnce({rows: [{ id: 1 }] })
                .mockResolvedValueOnce({rows: [] });
            const res = await authPost('/api/fleet-groups/1/assignments', {managerId: 999});
            expect(res.status).toBe(404);
        });

        it('rejects a user who is not a fleet manager', async() => {
            mockQuery
                .mockResolvedValueOnce({rows: [{ id: 1 }] })
                .mockResolvedValueOnce({rows: [{id: 5, role: 'viewer', is_active: true}] });
            const res = await authPost('/api/fleet-groups/1/assignments', {managerId: 5});
            expect(res.status).toBe(400);
        });

        it('rejects a deactivated manager', async() => {
            mockQuery
                .mockResolvedValueOnce({rows: [{ id: 1 }] })
                .mockResolvedValueOnce({rows: [{id: 5, role: 'fleet_manager', is_active: false}] });
            const res = await authPost('/api/fleet-groups/1/assignments', {managerId: 5});
            expect(res.status).toBe(400);
        });

        it('rejects a group that already has a manager', async() => {
            mockQuery
                .mockResolvedValueOnce({rows: [{ id: 1 }] })
                .mockResolvedValueOnce({rows: [{id: 5, role: 'fleet_manager', is_active: true}] })
                .mockResolvedValueOnce({rows: [{fleet_manager_id : 3}] });
            const res = await authPost('/api/fleet-groups/1/assignments', {managerId: 5});
            expect(res.status).toBe(409);
        });

        it('assigns successfully and writes an audit log entry', async() => {
            mockQuery
                .mockResolvedValueOnce({rows: [{ id: 1 }] })
                .mockResolvedValueOnce({rows: [{id: 5, role: 'fleet_manager', is_active: true}] })
                .mockResolvedValueOnce({rows: [] })
                .mockResolvedValueOnce({rows: [] })
                .mockResolvedValueOnce({rows: [] });
            const res = await authPost('/api/fleet-groups/1/assignments', {managerId: 5});
            expect(res.status).toBe(201);
            expect(mockQuery).toHaveBeenCalledTimes(5);
        });
    });


    describe('DELETE /api/fleet-groups/:id/assignments/:managerId', () => {
        it('404s when the assignment is not found', async () => {
            mockQuery.mockResolvedValueOnce({rows: []});
            const res = await authDelete('/api/fleet-groups/1/assignments/5');
            expect(res.status).toBe(404);
        });

        it('removes the assignment and logs it', async () => {
            mockQuery
                .mockResolvedValueOnce({rows: [{ id: 1 }] })
                .mockResolvedValueOnce({rows: [] })
                .mockResolvedValueOnce({rows: [] });
            const res = await authDelete('/api/fleet-groups/1/assignments/5');
            expect(res.status).toBe(200);
        });
    });

    describe('PATCH /api/fleet-groups/:id/vehicles', () => {
        it('rejects an empty vehicleIds array', async () => {
            const res = await authPatch('/api/fleet-groups/1/vehicles', {vehicleIds: []});
            expect(res.status).toBe(400);
        });

        it('404s when the group does not exist or is soft deleted', async()=> {
            mockQuery.mockResolvedValueOnce({rows: [] });
            const res = await authPatch('/api/fleet-groups/999/vehicles', {vehicleIds: ['V1']});
            expect(res.status).toBe(404);
        });

        it('reports updated and not-found vehicle ids', async () => {
            mockQuery
                .mockResolvedValueOnce({rows: [{ id: 1 }] })
                .mockResolvedValueOnce({rows: [{ vehicle_id: 'V1'}] });
            const res = await authPatch('/api/fleet-groups/1/vehicles', { vehicleIds: ['V1', 'V2']});
            expect(res.status).toBe(200);
            expect(res.body.data.updated).toEqual(['V1']);
            expect(res.body.data.not_found).toEqual(['V2']);
        });
    });

    describe('PATCH /api/fleet-groups/:id/vehicles/unassign', () => {
        it('rejects a missing vehicleIds array', async () => {
            const res = await authPatch('/api/fleet-groups/1/vehicles/unassign', {});
            expect(res.status).toBe(400);
        });

        it('rejects an empty vehicleIds array', async()=> {
            const res = await authPatch('/api/fleet-groups/1/vehicles/unassign', {vehicleIds: []});
            expect(res.status).toBe(400);
        });

        it('unassigns matching vehcicles from the group', async () => {
            mockQuery.mockResolvedValueOnce({rows: [{ vehicle_id: 'V1' }, { vehicle_id: 'V2' }] });
            const res = await authPatch('/api/fleet-groups/1/vehicles/unassign', { vehicleIds: ['V1', 'V2']});
            expect(res.status).toBe(200);
            expect(res.body.data.updated).toEqual(['V1', 'V2']);
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('SET fleet_group_id = NULL'),
                [['V1', 'V2'], '1']
            );
        });

        it('handles a db error', async()=> {
            mockQuery.mockRejectedValueOnce(new Error('db down'));

            const res = await authPatch('/api/fleet-groups/1/vehicles/unassign', {vehicleIds: ['V1']});
            expect(res.status).toBe(500);
        }); 
    });

    describe('GET /api/fleet-groups/:id/available-vehicles', () => {

        it('rejects an invalid status filter', async()=> {
            const res = await authGet('/api/fleet-groups/1/available-vehicles?status=bogus');
            expect(res.status).toBe(400);
        });
        
        it('404s when the group does not exist or is soft-deleted', async () => {
            mockQuery.mockResolvedValueOnce({rows: [] })
            const res = await authGet('/api/fleet-groups/999/available-vehicles');
            expect(res.status).toBe(404);
        });

        it('returns paginated unassigned vehicles with province', async () => {
            mockQuery
                .mockResolvedValueOnce({rows: [{ id: 1 }] })
                .mockResolvedValueOnce({rows: [{ count: '2' }] })
                .mockResolvedValueOnce({rows: [{ id: 'V1', fleet_group_id: null, fleet_group_name: null, province: 'Gauteng'}] });
            const res = await authGet('/api/fleet-groups/1/available-vehicles');
            expect(res.status).toBe(200);
            expect(res.body.data.total).toBe(2);
            expect(res.body.data.vehicles[0].province).toBe('Gauteng');
        });

        it('filters by province search term', async () => {
            mockQuery
                .mockResolvedValueOnce({rows: [{ id: 1 }] })
                .mockResolvedValueOnce({rows: [{ count: '1' }] })
                .mockResolvedValueOnce({rows: [{ id: 'V1', fleet_group_id: null, fleet_group_name: null, province: 'North West'}] });
            const res = await authGet('/api/fleet-groups/1/available-vehicles?search=North');
            expect(res.status).toBe(200);
            expect(res.body.data.vehicles).toHaveLength(1);
            const countCall = mockQuery.mock.calls[1];
            expect(countCall[0]).not.toMatch(/NULLAND/);
            expect(countCall[0]).toContain('vlc.province ILIKE');
        });
    });


    describe('GET /api/fleet-groups/my-groups', () => {

        it('returns an empty list without querying when scoped to zero group', async()=> {
            mockQuery.mockResolvedValueOnce({ rows: [] });
            const res = await authGet('/api/fleet-groups/my-groups', managerToken);
            expect(res.status).toBe(200);
            expect(res.body.data.groups).toEqual([]);
        });
        
        it('returns groups scoped to the manager, excluding soft-deleted ones', async () => {
            mockQuery
                .mockResolvedValueOnce({rows: [{ fleet_group_id: 7 }] })
                .mockResolvedValueOnce({rows: [{ id: 7, name: 'Mine', description: null, vehicle_count: 4}] });
            const res = await authGet('/api/fleet-groups/my-groups', managerToken);
            expect(res.status).toBe(200);
            expect(res.body.data.groups[0].vehicle_count).toBe(4);
            expect(mockQuery).toHaveBeenLastCalledWith(expect.stringContaining('fg.deleted_at IS NULL'), [[7]]);
        });
    });

    describe('GET /api/fleet-groups/leaderboard', () => {

        it('requires authentication', async()=> {
            const res = await request(app).get('/api/fleet-groups/leaderboard');
            expect(res.status).toBe(401);
        });
        

        it('returns a raned list with computed rank numbers', async () => {
            mockQuery.mockResolvedValueOnce({
                rows: [
                { manager_id: 2, manager_name: 'Keith', group_count: '2', vehicle_count: '10', avg_safety_score: '92.5' },
                { manager_id: 3, manager_name: 'Cool guy', group_count: '1', vehicle_count: '4', avg_safety_score: '81.0' },
                ],
             });
            const res = await authGet('/api/fleet-groups/leaderboard');
            expect(res.status).toBe(200);
            expect(res.body.data.leaderboard).toHaveLength(2);
            expect(res.body.data.leaderboard[0]).toMatchObject({ rank: 1, manager_id: 2, avg_safety_score: 92.5});
            expect(res.body.data.leaderboard[1].rank).toBe(2);
        });

        it('caps an oversized limit at 20', async()=> {
            mockQuery.mockResolvedValueOnce({ rows: [] });
            await authGet('/api/fleet-groups/leaderboard?limit=500');
            expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [20]);
        });

        it('handles a db error', async()=> {
            mockQuery.mockRejectedValueOnce(new Error('db down'));

            const res = await authGet('/api/fleet-groups/leaderboard');
            expect(res.status).toBe(500);
        });
    });


    describe('PATCH /api/fleet-groups/:id', () => {
        it('rejects a missing fleet group name', async()=> {
            const res = await authPatch('/api/fleet-groups/1', {description: 'no name' });
            expect(res.status).toBe(400);
        });

        it('404s when the group does not exist or is soft-deleted', async () => {
            mockQuery.mockResolvedValueOnce({rows: [] })
            const res = await authPatch('/api/fleet-groups/999', {name: 'New Name'});
            expect(res.status).toBe(404);
        });

        it('updates name and description', async()=> {
            mockQuery
                .mockResolvedValueOnce({rows: [{id: 1}] })
                .mockResolvedValueOnce({rows: [{id: 1, name: 'New Name', description: 'New desc', created_at: new Date() }]
            });
            const res = await authPatch('/api/fleet-groups/1', {name: 'New Name', description: 'New desc' });
            expect(res.status).toBe(200);
            expect(res.body.data.group.name).toBe('New Name');
        });

        it('returns 409 on a name collision with another active group', async()=> {
            mockQuery
                .mockResolvedValueOnce({rows: [{id: 1}] })
                .mockRejectedValueOnce({ code: '23505'});
            const res = await authPatch('/api/fleet-groups/1', {name: 'Taken name' });
            expect(res.status).toBe(409);
        });

        it('handles a db error', async()=> {
            mockQuery.mockRejectedValueOnce(new Error('db down'));

            const res = await authPatch('/api/fleet-groups/1', {name: 'X' });
            expect(res.status).toBe(500);
        });
    });

    describe('DELETE /api/fleet-groups/:id', () => {

        it('404s when the group does not exist or is already soft deleted', async()=> {
            mockQuery.mockResolvedValueOnce({ rows: [] });
            const res = await authDelete('/api/fleet-groups/999');
            expect(res.status).toBe(404);
        });

        it('handles a db error', async()=> {
            mockQuery.mockRejectedValueOnce(new Error('boom'));

            const res = await authDelete('/api/fleet-groups/1');
            expect(res.status).toBe(500);
        });  

        it('soft deletes, logs a removed entry per active assignment, unassigned', async()=> {
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, name: 'North Fleet'}] })
                .mockResolvedValueOnce({ rows: [{ id: 1, fleet_manager_id: 5}] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });

            const res = await authDelete('/api/fleet-groups/1');
            expect(res.status).toBe(200);
            expect(res.body.data.message).toContain('North Fleet');
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("VALUES ('REMOVED'"),
                [5, '1', 1]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('SET deleted_at = now()'),
                ['1']
            );

            expect(mockQuery).not.toHaveBeenCalledWith(expect.stringContaining('DELETE FROM fleet_groups'), expect.anything());
        }); 
        
        
        it('skips the audit log loop entirely for a group with no manager assigned to it', async()=> {
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Empty Fleet'}] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });

            const res = await authDelete('/api/fleet-groups/1');
            expect(res.status).toBe(200);
            expect(mockQuery).toHaveBeenCalledTimes(5);
        });  
    });  
});
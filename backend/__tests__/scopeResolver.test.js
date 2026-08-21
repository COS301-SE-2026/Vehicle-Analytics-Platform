'use strict';

const { setupReportingMockData, DEFAULT_FLEET_FIXTURE } = require('./setup/mockReportingDb');

const {
    resolveScope,
    getAccessibleGroups,
    assertCanReadReport,
    listAvailableScopes,
    ScopeError,
    SCOPE_TYPES,
    REPORTING_ROLES,
} = require('../src/services/scopeResolver');

function makeDb(fixture = DEFAULT_FLEET_FIXTURE) {
    const { pool, calls } = setupReportingMockData(fixture);
    return { query: pool.query, calls, pool };
}

const ADMIN = { id: 1, sub: 'admin-sub', email: 'a@x.co', role: 'admin' };
const MANAGER_A = { id: 10, sub: 'm10', email: 'a@x.co', role: 'fleet_manager' };
const MANAGER_B = { id: 20, sub: 'm20', email: 'b@x.co', role: 'fleet_manager' };
const VIEWER = { id: 30, sub: 'v30', email: 'v@x.co', role: 'viewer' };

async function expectScopeError(promise, statusCode, messagePattern) {
    await expect(promise).rejects.toBeInstanceOf(ScopeError);
    await promise.catch((err) => {
        expect(err.statusCode).toBe(statusCode);
        if (messagePattern) expect(err.message).toMatch(messagePattern);
    });
}

describe('scopeResolver - module contract', () => {
    test('supports fleet, group and vehicle scopes', () => {
        expect(SCOPE_TYPES).toEqual(['fleet', 'group', 'vehicle']);
    });

    test('driver scope is deliberately unsupported', () => {
        expect(SCOPE_TYPES).not.toContain('driver');
    });

    test('only admin and fleet_manager may report', () => {
        expect(REPORTING_ROLES).toEqual(['admin', 'fleet_manager']);
    });

    test('requires a usable database client', async () => {
        await expect(resolveScope(null, ADMIN, { scopeType: 'fleet' })).rejects.toThrow(/pg client or pool/);
        await expect(resolveScope({}, ADMIN, { scopeType: 'fleet' })).rejects.toThrow(/pg client or pool/);
    });
});

describe('caller authentication and role', () => {
    test('rejects an unauthenticated caller with 401', async () => {
        const db = makeDb();
        await expectScopeError(
            resolveScope(db, null, { scopeType: 'fleet' }), 401, /Authentication required/,
        );
        await expectScopeError(
            resolveScope(db, {}, { scopeType: 'fleet' }), 401, /Authentication required/,
        );
    });

    test('rejects a viewer with 403', async () => {
        const db = makeDb();
        await expectScopeError(
            resolveScope(db, VIEWER, { scopeType: 'fleet' }), 403, /Insufficient permissions/,
        );
    });

    test('rejects an unknown role with 403', async () => {
        const db = makeDb();
        await expectScopeError(
            resolveScope(db, { id: 5, role: 'superuser' }, { scopeType: 'fleet' }),
            403, /Insufficient permissions/,
        );
        await expectScopeError(
            resolveScope(db, { id: 5, role: null }, { scopeType: 'fleet' }),
            403, /Insufficient permissions/,
        );
    });

    test("treats the frontend/dev role alias 'manager' as fleet_manager", async () => {
        const db = makeDb();
        const scope = await resolveScope(db, { ...MANAGER_A, role: 'manager' }, { scopeType: 'fleet' });
        expect(scope.role).toBe('fleet_manager');
        expect(scope.vehicleIds).toEqual(['VH-001', 'VH-002', 'VH-003']);
    });

    test('role matching is case-insensitive', async () => {
        const db = makeDb();
        const scope = await resolveScope(db, { ...ADMIN, role: 'Admin' }, { scopeType: 'fleet' });
        expect(scope.role).toBe('admin');
    });

    test('a non-integer user id outside development fails closed with 401', async () => {
        const db = makeDb();
        const original = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        try {
            await expectScopeError(
                resolveScope(db, { id: 'dev-user', role: 'manager' }, { scopeType: 'fleet' }),
                401, /Authentication required/,
            );
        } finally {
            process.env.NODE_ENV = original;
        }
    });

    test("the development bypass identity resolves as admin in development only", async () => {
        const db = makeDb();
        const original = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';
        try {
            const devUser = {
                id: 'dev-user', sub: 'local-dev', email: 'dev@localhost', role: 'manager',
            };
            const scope = await resolveScope(db, devUser, { scopeType: 'fleet' });
            expect(scope.role).toBe('admin');
            expect(scope.vehicleIds).toHaveLength(6);
        } finally {
            process.env.NODE_ENV = original;
        }
    });
});
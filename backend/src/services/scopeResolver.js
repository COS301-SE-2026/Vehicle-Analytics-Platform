// the authorization boundary for reporting feat
'use strict';

const SCOPE_TYPES = ['fleet', 'group', 'vehicle']; /* subject to change after grouping logic fully implemented*/
const REPORTING_ROLES = ['admin', 'fleet_manager']; 


const ROLE_ALIASES = { 
    manager: 'fleet_manager', fleet_manager: 'fleet_manager', 
    admin: 'admin', 
    viewer: 'viewer',
};

class ScopeError extends Error{
    constructor(message, statusCode = 403){
        super(message);
        this.name = 'ScopeError';
        this.statusCode = statusCode;
    }
}

const NOT_AUTHORISED = 'Scope not found or not authorised';
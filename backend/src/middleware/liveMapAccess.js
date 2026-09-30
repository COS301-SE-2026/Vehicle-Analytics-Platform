const { requireFleetGroupAccess } = require('./fleetGroupAccess');

function requireLiveMapAccess(req, res, next) {
    if (req.user?.role === 'viewer') {
        req.fleetGroupIds = null;
        return next();
    }
    return requireFleetGroupAccess(req, res, next);
}

module.exports = { requireLiveMapAccess };

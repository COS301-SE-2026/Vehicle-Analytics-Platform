module.exports = {
  authenticate: (req, res, next) => {
    req.user = { id: 1, role: 'fleet_manager', sub: 'test-sub' };
    next();
  },
  requireRole: (roles) => (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  },
};


const FuelHistoryService = require('../services/fuelHistoryService');




const fuelHistoryService = new FuelHistoryService();



exports.getVehicleFuelHistory = async (req, res) => {

    try {

        const { vehicleId } = req.params;

        const { period = 'week', limit = 10 } = req.query;

        const data = await fuelHistoryService.getVehicleFuelHistory(vehicleId, period, Number.parseInt(limit));

        res.json({ success: true, data });

    } catch (err) {

        console.error('Error in getVehicleFuelHistory:', err);

        res.status(500).json({ success: false, error: err.message });

    }

};



exports.getFleetFuelHistory = async (req, res) => {

    try {

        const { period = 'week', limit = 10 } = req.query;

        const data = await fuelHistoryService.getFleetFuelHistory(period, Number.parseInt(limit));

        res.json({ success: true, data });

    } catch (err) {

        console.error('Error in getFleetFuelHistory:', err);

        res.status(500).json({ success: false, error: err.message });

    }

};



exports.getVehicleFuelTrend = async (req, res) => {

    try {

        const { vehicleId } = req.params;

        const { days = 30 } = req.query;

        const data = await fuelHistoryService.getVehicleFuelTrend(vehicleId, Number.parseInt(days));

        res.json({ success: true, data });


    } catch (err) {

        console.error('Error in getVehicleFuelTrend:', err);

        res.status(500).json({ success: false, error: err.message });

    }
};





exports.calculateDailyHistory = async (req, res) => {

    try {

        const { vehicleId } = req.params;

        const { date } = req.query;

        const targetDate = date ? new Date(date) : new Date();

        await fuelHistoryService.calculateAndStoreDailyHistory(vehicleId, targetDate);

        res.json({ success: true, message: 'Daily fuel history calculated' });

    } catch (err) {

        console.error('Error in calculateDailyHistory:', err);

        res.status(500).json({ success: false, error: err.message });

    }

};

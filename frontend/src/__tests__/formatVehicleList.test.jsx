import formatVehicleList from "@/utils/formatVehicleList";

describe('formatVehicleList', () => {
    it('handles an empty or missing list', () => {
        expect(formatVehicleList([])).toBe('no vehicles');
        expect(formatVehicleList(undefined)).toBe('no vehicles');
    });

    it('names a single vehicle', () => {
        expect(formatVehicleList(['1000'])).toBe('vehicle 1000');
    });

    it('lists up to three vehicles by id', () => {
        expect(formatVehicleList(['1000', '1001'])).toBe('vehicles 1000, 1001');
        expect(formatVehicleList(['1000', '1001', '1002'])).toBe('vehicles 1000, 1001, 1002');
    });

    it('swithces to a count above three vehicles', () => {
        expect(formatVehicleList(['1000', '1001', '1002', '1003'])).toBe('4 vehicles');
    });

    it('formats large counts with a thousands separator', () => {
        const ids = Array.from({length: 1250}, (_,i) => String(1000 + i));
        expect(formatVehicleList(ids)).toBe('1,250 vehicles');
    });

    it('respects a custom maxShown', () => {
        expect(formatVehicleList(['1', '2', '3', '4', '5'], 5)).toBe('vehicles 1, 2, 3, 4, 5');
    });
});
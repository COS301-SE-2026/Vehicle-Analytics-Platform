import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import RuleConditionFields from '@/components/alerts/RuleConditionFields';
import { EMPTY_PARAMS } from '@/components/alerts/ruleFormConstants';
import { fleetGroups } from '../test-utils/ruleModalTestUtils';

function renderFields(overrides = {}) {
  const props = {
    conditionType: 'speed_threshold',
    params: EMPTY_PARAMS.speed_threshold,
    error: '',
    name: '',
    fleetGroupId: '',
    fleetGroups,
    onSelectCondition: jest.fn(),
    onNameChange: jest.fn(),
    onFleetGroupChange: jest.fn(),
    onUpdateParam: jest.fn(),
    onToggleFromList: jest.fn(),
    ...overrides,
  };

  render(<RuleConditionFields {...props} />);
  return props;
}

describe('RuleConditionFields', () => {
  test('renders all five condition options with title and description', () => {
    renderFields();

    expect(screen.getByText('Speed Threshold')).toBeInTheDocument();
    expect(screen.getByText('Trigger alerts when vehicles exceed a specific speed limit.')).toBeInTheDocument();

    expect(screen.getByText('Time Restriction')).toBeInTheDocument();
    expect(screen.getByText('Repeated Unsafe Events')).toBeInTheDocument();
    expect(screen.getByText('Safety Score Drop')).toBeInTheDocument();
    expect(screen.getByText('Trip Duration')).toBeInTheDocument();
  });

  test('applies active styling to the button matching conditionType', () => {
    renderFields({ conditionType: 'safety_score_drop' });

    const activeButton = screen.getByText('Safety Score Drop').closest('button');
    const inactiveButton = screen.getByText('Speed Threshold').closest('button');

    expect(activeButton).toHaveClass('border-fleet-blue', 'bg-fleet-panel');
    expect(inactiveButton).not.toHaveClass('border-fleet-blue', 'bg-fleet-panel');
    expect(inactiveButton).toHaveClass('border-fleet-border', 'bg-fleet-surface');
  });

  test('calls onSelectCondition with the clicked type', async () => {
    const user = userEvent.setup();
    const props = renderFields();

    await user.click(screen.getByText('Time Restriction'));
    expect(props.onSelectCondition).toHaveBeenCalledWith('time_based_restriction');

    await user.click(screen.getByText('Trip Duration'));
    expect(props.onSelectCondition).toHaveBeenCalledWith('trip_duration_exceeded');
  });

  test('shows the error banner only when error is set', () => {
    const { rerender } = render(
      <RuleConditionFields
        conditionType="speed_threshold"
        params={EMPTY_PARAMS.speed_threshold}
        error=""
        name=""
        fleetGroupId=""
        fleetGroups={fleetGroups}
        onSelectCondition={jest.fn()}
        onNameChange={jest.fn()}
        onFleetGroupChange={jest.fn()}
        onUpdateParam={jest.fn()}
        onToggleFromList={jest.fn()}
      />
    );

    expect(screen.queryByText('name is required')).not.toBeInTheDocument();

    rerender(
      <RuleConditionFields
        conditionType="speed_threshold"
        params={EMPTY_PARAMS.speed_threshold}
        error="name is required"
        name=""
        fleetGroupId=""
        fleetGroups={fleetGroups}
        onSelectCondition={jest.fn()}
        onNameChange={jest.fn()}
        onFleetGroupChange={jest.fn()}
        onUpdateParam={jest.fn()}
        onToggleFromList={jest.fn()}
      />
    );

    expect(screen.getByText('name is required')).toBeInTheDocument();
  });

  test('wires the Alert Name input to onNameChange', async () => {
    const user = userEvent.setup();
    const props = renderFields();

    await user.type(screen.getByLabelText(/Alert Name/i), 'X');
    expect(props.onNameChange).toHaveBeenCalledWith('X');
  });

  test('renders fleet group options and wires onFleetGroupChange', async () => {
    const user = userEvent.setup();
    const props = renderFields();

    expect(screen.getByRole('option', { name: 'Select a fleet group' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Delivery Fleet' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Long Haul' })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/Fleet Group/i), 'fg-2');
    expect(props.onFleetGroupChange).toHaveBeenCalledWith('fg-2');
  });

  describe('speed_threshold fields', () => {
    test('renders only the speed limit input', () => {
      renderFields({ conditionType: 'speed_threshold', params: EMPTY_PARAMS.speed_threshold });

      expect(screen.getByLabelText(/Speed Limit/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/Start Time/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Minimum Safety Score/i)).not.toBeInTheDocument();
    });

    test('calls onUpdateParam with max_speed_kmh', async () => {
      const user = userEvent.setup();
      const props = renderFields({ conditionType: 'speed_threshold', params: EMPTY_PARAMS.speed_threshold });

      await user.type(screen.getByLabelText(/Speed Limit/i), '1');
      expect(props.onUpdateParam).toHaveBeenCalledWith('max_speed_kmh', '1');
    });
  });

  describe('time_based_restriction fields', () => {
    const params = { start_time: '', end_time: '', restricted_days: ['Mon'] };

    test('renders start/end time and restricted days', () => {
      renderFields({ conditionType: 'time_based_restriction', params });

      expect(screen.getByLabelText(/Start Time/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/End Time/i)).toBeInTheDocument();
      expect(screen.getByText('Restricted Days')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sun' })).toBeInTheDocument();
      expect(screen.queryByLabelText(/Speed Limit/i)).not.toBeInTheDocument();
    });

    test('marks days present in restricted_days as active', () => {
      renderFields({ conditionType: 'time_based_restriction', params });

      expect(screen.getByRole('button', { name: 'Mon' })).toHaveClass('bg-fleet-blue');
      expect(screen.getByRole('button', { name: 'Tue' })).not.toHaveClass('bg-fleet-blue');
    });

    test('calls onUpdateParam for start/end time changes', async () => {
      const user = userEvent.setup();
      const props = renderFields({ conditionType: 'time_based_restriction', params });

      await user.type(screen.getByLabelText(/Start Time/i), '0800AM');
      expect(props.onUpdateParam).toHaveBeenCalledWith('start_time', expect.any(String));
    });

    test('calls onToggleFromList with restricted_days and the clicked day', async () => {
      const user = userEvent.setup();
      const props = renderFields({ conditionType: 'time_based_restriction', params });

      await user.click(screen.getByRole('button', { name: 'Wed' }));
      expect(props.onToggleFromList).toHaveBeenCalledWith('restricted_days', 'Wed');
    });
  });

  describe('repeated_unsafe_events fields', () => {
    const params = { event_types: ['harsh_braking'], count: '', window_minutes: '' };

    test('renders event type toggles, occurrences and window inputs', () => {
      renderFields({ conditionType: 'repeated_unsafe_events', params });

      expect(screen.getByText('Event Types')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Harsh braking' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Harsh acceleration' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Harsh cornering' })).toBeInTheDocument();
      expect(screen.getByLabelText(/Occurrences/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Within \(minutes\)/i)).toBeInTheDocument();
    });

    test('marks event types present in event_types as active', () => {
      renderFields({ conditionType: 'repeated_unsafe_events', params });

      expect(screen.getByRole('button', { name: 'Harsh braking' })).toHaveClass('bg-fleet-blue');
      expect(screen.getByRole('button', { name: 'Harsh cornering' })).not.toHaveClass('bg-fleet-blue');
    });

    test('calls onToggleFromList with event_types and the clicked value', async () => {
      const user = userEvent.setup();
      const props = renderFields({ conditionType: 'repeated_unsafe_events', params });

      await user.click(screen.getByRole('button', { name: 'Harsh cornering' }));
      expect(props.onToggleFromList).toHaveBeenCalledWith('event_types', 'harsh_cornering');
    });

    test('calls onUpdateParam for count and window_minutes', async () => {
      const user = userEvent.setup();
      const props = renderFields({ conditionType: 'repeated_unsafe_events', params });

      await user.type(screen.getByLabelText(/Occurrences/i), '3');
      expect(props.onUpdateParam).toHaveBeenCalledWith('count', '3');

      await user.type(screen.getByLabelText(/Within \(minutes\)/i), '5');
      expect(props.onUpdateParam).toHaveBeenCalledWith('window_minutes', '5');
    });
  });

  describe('safety_score_drop fields', () => {
    test('renders only the minimum safety score input', () => {
      renderFields({ conditionType: 'safety_score_drop', params: EMPTY_PARAMS.safety_score_drop });

      expect(screen.getByLabelText(/Minimum Safety Score/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/Speed Limit/i)).not.toBeInTheDocument();
    });

    test('calls onUpdateParam with min_score', async () => {
      const user = userEvent.setup();
      const props = renderFields({ conditionType: 'safety_score_drop', params: EMPTY_PARAMS.safety_score_drop });

      await user.type(screen.getByLabelText(/Minimum Safety Score/i), '5');
      expect(props.onUpdateParam).toHaveBeenCalledWith('min_score', '5');
    });
  });

  describe('trip_duration_exceeded fields', () => {
    test('renders max trip and max daily duration inputs', () => {
      renderFields({ conditionType: 'trip_duration_exceeded', params: EMPTY_PARAMS.trip_duration_exceeded });

      expect(screen.getByLabelText(/Max Trip Duration/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Max Daily Duration/i)).toBeInTheDocument();
    });

    test('calls onUpdateParam for both fields independently', async () => {
      const user = userEvent.setup();
      const props = renderFields({ conditionType: 'trip_duration_exceeded', params: EMPTY_PARAMS.trip_duration_exceeded });

      await user.type(screen.getByLabelText(/Max Trip Duration/i), '9');
      expect(props.onUpdateParam).toHaveBeenCalledWith('max_trip_minutes', '9');

      await user.type(screen.getByLabelText(/Max Daily Duration/i), '8');
      expect(props.onUpdateParam).toHaveBeenCalledWith('max_daily_minutes', '8');
    });
  });

  test('renders children at the end of section 2', () => {
    renderFields({
      conditionType: 'speed_threshold',
      params: EMPTY_PARAMS.speed_threshold,
      children: <div data-testid="status-slot">Status toggle goes here</div>,
    });

    expect(screen.getByTestId('status-slot')).toBeInTheDocument();
  });
});
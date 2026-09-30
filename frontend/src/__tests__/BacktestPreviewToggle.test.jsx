import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import BacktestPreviewToggle from '@/components/alerts/BacktestPreviewToggle';

describe('BacktestPreviewToggle', () => {
  test('is disabled and shows the fleet-group tooltip when hasRequiredInputs is false', () => {
    render(
      <BacktestPreviewToggle
        onClick={jest.fn()}
        hasRequiredInputs={false}
        totalAlerts={null}
        loading={false}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'Select a fleet group first to preview impact');
  });

  test('does not show an alert count badge when hasRequiredInputs is false', () => {
    render(
      <BacktestPreviewToggle
        onClick={jest.fn()}
        hasRequiredInputs={false}
        totalAlerts={null}
        loading={false}
      />
    );

    expect(screen.queryByText(/alerts/i)).not.toBeInTheDocument();
  });

  test('is enabled and shows the preview tooltip when hasRequiredInputs is true', () => {
    render(
      <BacktestPreviewToggle
        onClick={jest.fn()}
        hasRequiredInputs={true}
        totalAlerts={214}
        loading={false}
      />
    );

    const button = screen.getByRole('button');
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute(
      'title',
      'Click to preview simulated alert impact over the last 30 days'
    );
  });

  test('shows the alert count once data has loaded', () => {
    render(
      <BacktestPreviewToggle
        onClick={jest.fn()}
        hasRequiredInputs={true}
        totalAlerts={214}
        loading={false}
      />
    );

    expect(screen.getByText('214 alerts')).toBeInTheDocument();
  });

  test('shows a loading placeholder instead of a count while loading', () => {
    render(
      <BacktestPreviewToggle
        onClick={jest.fn()}
        hasRequiredInputs={true}
        totalAlerts={null}
        loading={true}
      />
    );

    expect(screen.getByText('…')).toBeInTheDocument();
    expect(screen.queryByText(/alerts/i)).not.toBeInTheDocument();
  });

  test('shows an em dash when enabled but no data has arrived yet and not loading', () => {
    render(
      <BacktestPreviewToggle
        onClick={jest.fn()}
        hasRequiredInputs={true}
        totalAlerts={null}
        loading={false}
      />
    );

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  test('calls onClick when the enabled button is clicked', async () => {
    const onClick = jest.fn();
    const user = userEvent.setup();

    render(
      <BacktestPreviewToggle
        onClick={onClick}
        hasRequiredInputs={true}
        totalAlerts={214}
        loading={false}
      />
    );

    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('does not call onClick when the disabled button is clicked', async () => {
    const onClick = jest.fn();
    const user = userEvent.setup();

    render(
      <BacktestPreviewToggle
        onClick={onClick}
        hasRequiredInputs={false}
        totalAlerts={null}
        loading={false}
      />
    );

    await user.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});

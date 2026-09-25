import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import BacktestPreviewPanel from '@/components/alerts/BacktestPreviewPanel';

const SAMPLE_DATA = {
  total_alerts: 214,
  vehicles_affected: 9,
  by_day: [
    { date: '2026-06-01', count: 5 },
    { date: '2026-06-02', count: 18 },
    { date: '2026-06-03', count: 3 },
  ],
  samples: [
    {
      vehicle_id: 'VP-7411',
      time: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      breach_value: '124',
      threshold_value: '105',
    },
    {
      vehicle_id: 'VH-0042',
      time: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
      breach_value: '118',
      threshold_value: '105',
    },
  ],
};

describe('BacktestPreviewPanel', () => {
  test('renders the header and close button', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();

    render(<BacktestPreviewPanel data={null} loading={false} error="" onClose={onClose} />);

    expect(screen.getByText('Impact Simulation')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close Simulation' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('shows an error message when error is set', () => {
    render(
      <BacktestPreviewPanel data={null} loading={false} error="Failed to load preview" onClose={jest.fn()} />
    );

    expect(screen.getByText('Failed to load preview')).toBeInTheDocument();
  });

  test('shows a loading placeholder for the total instead of a number', () => {
    render(<BacktestPreviewPanel data={null} loading={true} error="" onClose={jest.fn()} />);

    expect(screen.getByText('…')).toBeInTheDocument();
  });

  test('shows an em dash for the total when not loading and no data yet', () => {
    render(<BacktestPreviewPanel data={null} loading={false} error="" onClose={jest.fn()} />);

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  test('renders the total alerts and vehicles affected once data arrives', () => {
    render(<BacktestPreviewPanel data={SAMPLE_DATA} loading={false} error="" onClose={jest.fn()} />);

    expect(screen.getByText('214')).toBeInTheDocument();
    expect(screen.getByText(/9 vehicles affected/i)).toBeInTheDocument();
  });

  test('renders one bar per day in by_day', () => {
    const { container } = render(
      <BacktestPreviewPanel data={SAMPLE_DATA} loading={false} error="" onClose={jest.fn()} />
    );

    // each bar carries a title attribute of "<date>: <count> alerts"
    expect(container.querySelectorAll('[title$="alerts"]').length).toBe(SAMPLE_DATA.by_day.length);
  });

  test('shows the peak day count', () => {
    render(<BacktestPreviewPanel data={SAMPLE_DATA} loading={false} error="" onClose={jest.fn()} />);

    expect(screen.getByText(/Peak: 18 alerts/i)).toBeInTheDocument();
  });

  test('renders one row per sample with vehicle id and breach value', () => {
    render(<BacktestPreviewPanel data={SAMPLE_DATA} loading={false} error="" onClose={jest.fn()} />);

    expect(screen.getByText('VP-7411')).toBeInTheDocument();
    expect(screen.getByText('VH-0042')).toBeInTheDocument();
    expect(screen.getByText(/124 km\/h \(\+19\)/)).toBeInTheDocument();
  });

  test('shows skeleton placeholders for samples while loading', () => {
    const { container } = render(
      <BacktestPreviewPanel data={null} loading={true} error="" onClose={jest.fn()} />
    );

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    expect(screen.queryByText('VP-7411')).not.toBeInTheDocument();
  });

  test('renders an empty-looking state gracefully when samples is an empty array', () => {
    render(
      <BacktestPreviewPanel
        data={{ ...SAMPLE_DATA, samples: [] }}
        loading={false}
        error=""
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText(/Sample Qualifying Breach Events \(0 Most Severe\)/i)).toBeInTheDocument();
  });
});

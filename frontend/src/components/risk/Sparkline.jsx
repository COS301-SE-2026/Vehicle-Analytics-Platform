import PropTypes from 'prop-types';

const COLOURS = {
  critical: '#e11d48',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#10b981',
};

export default function Sparkline({ data = [], tier = 'low', width = 80, height = 24 }) {
  if (!data.length) {
    return <span className="text-[10px] text-gray-300">no history</span>;
  }

  const scores = data.map((d) => Number(d.score) || 0);
  const min = Math.min(...scores, 0);
  const max = Math.max(...scores, 100);
  const range = max - min || 1;

  const stepX = width / Math.max(1, scores.length - 1);
  const points = scores
    .map((s, i) => {
      const x = i * stepX;
      const y = height - ((s - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const colour = COLOURS[tier] || COLOURS.low;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={colour}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

Sparkline.propTypes = {
  data: PropTypes.array,
  tier: PropTypes.string,
  width: PropTypes.number,
  height: PropTypes.number,
};

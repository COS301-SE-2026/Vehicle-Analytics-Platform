module.exports = {
  presets: [
    [require.resolve('@babel/preset-env'), { targets: { node: 'current' } }],
    [require.resolve('@babel/preset-react'), { runtime: 'automatic' }],
  ],
  plugins: [
    'babel-plugin-transform-vite-meta-env',
  ],
};
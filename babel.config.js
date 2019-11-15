module.exports = {
  presets: [
    [
      '@babel/env',
      {
        targets: ["last 2 versions", "ie >= 10"],
      },
    ],
  ],
  env: {
    test: {
      plugins: [
        '@babel/plugin-transform-regenerator',
        '@babel/plugin-transform-runtime',
      ],
    },
  },
};

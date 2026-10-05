const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
  output: {
    path: join(__dirname, '../../dist/apps/api'),
    clean: true,
    // Keeps the exports of each entry, the TypeORM CLI reads data-source.js.
    library: { type: 'commonjs2' },
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      // Commands run with the same image: node migrate.js, node seed.js,
      // node cleanup.js.
      // data-source.js is for the TypeORM CLI, openapi.js writes the API spec.
      additionalEntryPoints: [
        { entryName: 'migrate', entryPath: './src/database/migrate.ts' },
        { entryName: 'seed', entryPath: './src/database/seed.ts' },
        { entryName: 'cleanup', entryPath: './src/database/cleanup.ts' },
        {
          entryName: 'data-source',
          entryPath: './src/database/data-source.ts',
        },
        { entryName: 'openapi', entryPath: './src/openapi.ts' },
      ],
      // Builds the OpenAPI schema from *.dto.ts classes and doc comments.
      transformers: [
        {
          name: '@nestjs/swagger/plugin',
          options: { introspectComments: true },
        },
      ],
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: true,
      sourceMap: true,
    }),
  ],
};

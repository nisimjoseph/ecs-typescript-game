const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: './src/main.ts',
    output: {
      // Use content hash for cache busting in production
      filename: isProduction ? 'bundle.[contenthash:8].js' : 'bundle.js',
      path: path.resolve(__dirname, 'docs/demo'),
      clean: true,
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.mp3$/,
          type: 'asset/inline', // Embeds audio as base64 data URLs
        },
      ],
    },
    optimization: {
      minimize: true,
      minimizer: [
        new (require('terser-webpack-plugin'))({
          terserOptions: {
            keep_classnames: true,
            keep_fnames: true,
          },
        }),
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './public/index.html',
      }),
    ],
    devServer: {
      static: {
        directory: path.join(__dirname, 'public'),
      },
      compress: true,
      port: 8080,
      hot: true,
    },
  };
};

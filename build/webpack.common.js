const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin');

const assetsPath = (_path) => {
  return path.posix.join('static', _path);
};

module.exports = {
  mode: 'development',
  devtool: 'inline-source-map',
  entry: {
    main: './src/main.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: assetsPath('js/[name].[chunkhash].js')
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html'
    })
  ]
}
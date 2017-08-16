const { resolve } = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const url = require('url')
const publicPath = ''

module.exports = (options = {}) => ({
  entry: {
    'FreedoX': './Source/FreedoX.js'
  },
  // externals: {
  //   'CesiumExternal': 'window.Cesium',
  // },
  output: {
    path: resolve(__dirname, 'dist/GBIM360/API'),
    filename: '[name].js',
    //chunkFilename: '[id].js?[chunkhash]',
    // publicPath: options.dev ? '/assets/' : publicPath, // 让人费解的 加上/assets/ 以后，所有资源的申请就变成了 /dist ...
    publicPath: '',
    // sourcePrefix: '' // cesium需要的
  },
  module: {
    rules: [{
        test: /\.js$/,
        use: ['babel-loader'],
        exclude: /node_modules/
      }
    ]
  },
  // devServer: {
  //   host: '127.0.0.1',
  //   port: 8010,
  //   contentBase: './dist',
  // },
  // devtool: options.dev ? '#cheap-source-map' : '#source-map'
})
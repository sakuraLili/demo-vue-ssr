const path = require('path')
const webpack = require('webpack');
const MFS = require('memory-fs')
const fs = require('fs')
const chokidar = require('chokidar')
const clientWebpackConfig = require('./webpack.client.conf')
const serverWebpackConfig = require('./webpack.server.conf')

const readFile = (fs, file) => {
  try {
    return fs.readFileSync(path.join(clientWebpackConfig.output.path, file), 'utf-8')
  } catch (e) {
    console.log('catch error when read a file')
  }
}

module.exports = function setupDevServer (app, templatePath, cb) {
  let bundle
  let template
  let clientManifest

  let ready
  const readyPromise = new Promise(r => {
    ready = r
  })
  const update = () => {
    if (bundle && clientManifest) {
      ready()
      cb(bundle, {
        template,
        clientManifest
      })
    }
  }

  // read template from disk and watch
  template = fs.readFileSync(templatePath, 'utf-8')
  chokidar.watch(templatePath).on('change', () => {
    template = fs.readFileSync(templatePath, 'utf-8')
    update()
  })

  // modify client config to work with hot middleware
  clientWebpackConfig.entry.app = ['webpack-hot-middleware/client', clientWebpackConfig.entry.app]
  clientWebpackConfig.output.filename = '[name].js'
  clientWebpackConfig.plugins.push(
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoEmitOnErrorsPlugin()
  )

  // dev middleware
  const clientCompiler = webpack(clientWebpackConfig)
  const devMiddleware = require('webpack-dev-middleware')(clientCompiler, {
    publicPath: clientWebpackConfig.output.publicPath,
    noInfo: true
  })

  app.use(devMiddleware)

  clientCompiler.plugin('done', stats => {
    stats = stats.toJson()
    stats.errors.forEach(err => console.error(err))
    stats.warnings.forEach(err => console.warn(err))
    if (stats.errors.length) return
    clientManifest = JSON.parse(readFile(
      devMiddleware.fileSystem,
      'vue-ssr-client-manifest.json'
    ))
    update()
  })

  app.use(require('webpack-hot-middleware')(clientCompiler, { heartbeat: 5000 }))

  // watch and update server renderer
  const serverCompiler = webpack(serverWebpackConfig)
  const mfs = new MFS()
  serverCompiler.outputFileSystem = mfs
  serverCompiler.watch({}, (err, stats) => {
    if (err) throw err
    stats = stats.toJson()
    stats.errors.forEach(err => console.error(err))
    stats.warnings.forEach(err => console.warn(err))
    if (stats.errors.length) return

    // read bundle generated by vue-ssr-webpack-plugin
    bundle = JSON.parse(readFile(mfs, 'vue-ssr-server-bundle.json'))
    update()
  })

  return readyPromise
}

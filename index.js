var config = {
  ns: 'paginator'
, filename: __filename
, scripts: {
	info: require('./info')
  }
}

module.exports = function(app, options) {
  var outConfig = Object.create(config)
  outConfig.styles = options && options.styles;
  app.createLibrary(outConfig, options)
}
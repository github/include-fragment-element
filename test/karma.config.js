module.exports = function(config) {
  config.set({
    frameworks: ['mocha', 'chai'],
    files: ['../include-fragment-element.js', 'test.js'],
    reporters: ['mocha'],
    port: 9876,
    client: {mocha: {ui: 'tdd'}},
    colors: true,
    logLevel: config.LOG_INFO,
    browsers: ['ChromeHeadless'],
    autoWatch: false,
    singleRun: true,
    concurrency: Infinity
  })
}

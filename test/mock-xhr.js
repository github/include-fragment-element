function MockXHR() {
  MockXHR.requests.push(this)
  this.method = null
  this.url = null
  this.data = null
  this.headers = {}
  this.readyState = 0
  this.status = 0
  this.responseText = null
}

MockXHR.requests = []

MockXHR.prototype.open = function(method, url) {
  this.method = method
  this.url = url
}

MockXHR.prototype.setRequestHeader = function (name, value) {
  this.headers[name] = value
}

MockXHR.prototype.send = function(data) {
  this.data = data
}

MockXHR.prototype.respond = function(status, body) {
  this.readyState = 4
  this.status = status
  this.responseText = body
  var event = {}
  this.onload(event)
}

MockXHR.prototype.abort = function() {
  // Do nothing.
}

MockXHR.prototype.slow = function() {
  var event = {}
  this.ontimeout(event)
}

MockXHR.prototype.error = function() {
  var event = {}
  this.onerror(event)
}

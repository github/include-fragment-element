window.XMLHttpRequest = MockXHR

function observe(sel, added) {
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      for (var i = 0; i < mutation.addedNodes.length; i++) {
        var el = mutation.addedNodes[i]
        if (el.matches(sel) || el.querySelector(sel)) {
          added()
        }
      }
    })
  })

  observer.observe(document.body, {childList: true})
  return observer
}

testDone(function() {
  MockXHR.requests = []

  var deferreds = document.querySelectorAll('deferred-content')
  for (var i = 0; i < deferreds.length; i++) {
    deferreds[i].remove()
  }
})

test('create from document.createElement', function() {
  var el = document.createElement('deferred-content')
  equal('DEFERRED-CONTENT', el.nodeName)
})

test('create from constructor', function() {
  var el = new window.DeferredContentElement()
  equal('DEFERRED-CONTENT', el.nodeName)
})

asyncTest('makes an xhr request when attached', function() {
  var observer = observe('deferred-content', function() {
    observer.disconnect()
    start()

    equal(MockXHR.requests.length, 1)

    var request = MockXHR.requests[0]
    equal('GET', request.method)
    equal('/test', request.url)
  })

  var div = document.createElement('div')
  div.innerHTML = '<deferred-content url="/test">loading</deferred-content>'
  document.body.appendChild(div)
})

asyncTest('replaces element on 200 status', function() {
  var observer = observe('deferred-content', function() {
    observer.disconnect()
    start()

    var request = MockXHR.requests[0]
    request.respond(200, '<div id="replaced">hello</div>')

    equal(document.querySelector('deferred-content'), null)
    equal(document.querySelector('#replaced').textContent, 'hello')
  })

  var div = document.createElement('div')
  div.innerHTML = '<deferred-content url="/test">loading</deferred-content>'
  document.body.appendChild(div)
})

asyncTest('adds error class on 500 status', function() {
  var observer = observe('deferred-content', function() {
    observer.disconnect()
    start()

    var request = MockXHR.requests[0]
    request.respond(500, 'boom')

    ok(document.querySelector('deferred-content').classList.contains('error'))
  })

  var div = document.createElement('div')
  div.innerHTML = '<deferred-content url="/test">loading</deferred-content>'
  document.body.appendChild(div)
})

asyncTest('adds error class on xhr error', function() {
  var observer = observe('deferred-content', function() {
    observer.disconnect()
    start()

    var request = MockXHR.requests[0]
    request.error()

    ok(document.querySelector('deferred-content').classList.contains('error'))
  })

  var div = document.createElement('div')
  div.innerHTML = '<deferred-content url="/test">loading</deferred-content>'
  document.body.appendChild(div)
})

asyncTest('adds timeout class on xhr timeout', function() {
  var observer = observe('deferred-content', function() {
    observer.disconnect()
    start()

    var request = MockXHR.requests[0]
    request.slow()

    var el = document.querySelector('deferred-content')
    ok(el.classList.contains('error'))
    ok(el.classList.contains('timeout'))
  })

  var div = document.createElement('div')
  div.innerHTML = '<deferred-content url="/test">loading</deferred-content>'
  document.body.appendChild(div)
})

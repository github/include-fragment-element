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

  observer.observe(document, {childList: true, subtree: true})
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

asyncTest('makes an xhr request when attached', 3, function() {
  var observer = observe('deferred-content', function() {
    observer.disconnect()
    start()

    equal(MockXHR.requests.length, 1)

    var request = MockXHR.requests[0]
    equal('GET', request.method)
    equal('/test', request.url)
  })

  var div = document.createElement('div')
  div.innerHTML = '<deferred-content src="/test">loading</deferred-content>'
  document.getElementById('qunit-fixture').appendChild(div)
})

asyncTest('replaces element on 200 status', 2, function() {
  var observer = observe('deferred-content', function() {
    observer.disconnect()
    start()

    var request = MockXHR.requests[0]
    request.respond(200, '<div id="replaced">hello</div>')

    equal(document.querySelector('deferred-content'), null)
    equal(document.querySelector('#replaced').textContent, 'hello')
  })

  var div = document.createElement('div')
  div.innerHTML = '<deferred-content src="/test">loading</deferred-content>'
  document.getElementById('qunit-fixture').appendChild(div)
})

asyncTest('replaces with several new elements on 200 status', 3, function() {
  var observer = observe('deferred-content', function() {
    observer.disconnect()
    start()

    var request = MockXHR.requests[0]
    request.respond(200, '<p id="one">one</p><p id="two">two</p>')

    equal(document.querySelector('deferred-content'), null)
    equal(document.querySelector('#one').textContent, 'one')
    equal(document.querySelector('#two').textContent, 'two')
  })

  var div = document.createElement('div')
  div.innerHTML = '<deferred-content src="/test">loading</deferred-content>'
  document.getElementById('qunit-fixture').appendChild(div)
})

asyncTest('adds is-error class on 500 status', 1, function() {
  var observer = observe('deferred-content', function() {
    observer.disconnect()
    start()

    var request = MockXHR.requests[0]
    request.respond(500, 'boom')

    ok(document.querySelector('deferred-content').classList.contains('is-error'))
  })

  var div = document.createElement('div')
  div.innerHTML = '<deferred-content src="/test">loading</deferred-content>'
  document.getElementById('qunit-fixture').appendChild(div)
})

asyncTest('adds is-error class on xhr error', 1, function() {
  var observer = observe('deferred-content', function() {
    observer.disconnect()
    start()

    var request = MockXHR.requests[0]
    request.error()

    ok(document.querySelector('deferred-content').classList.contains('is-error'))
  })

  var div = document.createElement('div')
  div.innerHTML = '<deferred-content src="/test">loading</deferred-content>'
  document.getElementById('qunit-fixture').appendChild(div)
})

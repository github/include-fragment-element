MockXHR.responses = {
  '/hello': function(xhr) {
    xhr.respond(200, '<div id="replaced">hello</div>')
  },
  '/one-two': function(xhr) {
    xhr.respond(200, '<p id="one">one</p><p id="two">two</p>')
  },
  '/boom': function(xhr) {
    xhr.respond(500, 'boom')
  }
}

window.XMLHttpRequest = MockXHR


test('create from document.createElement', function() {
  var el = document.createElement('deferred-content')
  equal('DEFERRED-CONTENT', el.nodeName)
})

test('create from constructor', function() {
  var el = new window.DeferredContentElement()
  equal('DEFERRED-CONTENT', el.nodeName)
})

test('src property', function() {
  var el = document.createElement('deferred-content')
  equal(null, el.getAttribute('src'))
  equal('', el.src)

  el.src = '/hello'
  equal('/hello', el.getAttribute('src'))
  var link = document.createElement('a')
  link.href = '/hello'
  equal(link.href, el.src)
})

asyncTest('initial data is in error state', 1, function() {
  var el = document.createElement('deferred-content')

  el.data['catch'](function(error) {
    ok(error)
    start()
  })
})

asyncTest('data with src property', 1, function() {
  var el = document.createElement('deferred-content')
  el.src = '/hello'

  el.data.then(function(html) {
    equal('<div id="replaced">hello</div>', html)
    start()
  }, function() {
    ok(false)
    start()
  })
})

asyncTest('data with src attribute', 1, function() {
  var el = document.createElement('deferred-content')
  el.setAttribute('src', '/hello')

  el.data.then(function(html) {
    equal('<div id="replaced">hello</div>', html)
    start()
  }, function() {
    ok(false)
    start()
  })
})

test('data is not writable', 2, function() {
  var el = document.createElement('deferred-content')
  ok(el.data !== 42)
  try {
    el.data = 42
  } catch(e) {}
  ok(el.data !== 42)
})

test('data is not configurable', 2, function() {
  var el = document.createElement('deferred-content')
  ok(el.data !== undefined)
  try {
    delete el.data
  } catch(e) {}
  ok(el.data !== undefined)
})

asyncTest('replaces element on 200 status', 2, function() {
  var div = document.createElement('div')
  div.innerHTML = '<deferred-content src="/hello">loading</deferred-content>'
  document.getElementById('qunit-fixture').appendChild(div)

  div.firstChild.addEventListener('load', function() {
    equal(document.querySelector('deferred-content'), null)
    equal(document.querySelector('#replaced').textContent, 'hello')
    start()
  })
})

asyncTest('replaces with several new elements on 200 status', 3, function() {
  var div = document.createElement('div')
  div.innerHTML = '<deferred-content src="/one-two">loading</deferred-content>'
  document.getElementById('qunit-fixture').appendChild(div)

  div.firstChild.addEventListener('load', function() {
    equal(document.querySelector('deferred-content'), null)
    equal(document.querySelector('#one').textContent, 'one')
    equal(document.querySelector('#two').textContent, 'two')
    start()
  })
})

asyncTest('adds is-error class on 500 status', 1, function() {
  var div = document.createElement('div')
  div.innerHTML = '<deferred-content src="/boom">loading</deferred-content>'
  document.getElementById('qunit-fixture').appendChild(div)

  div.addEventListener('error', function(event) {
    event.stopPropagation()
    ok(document.querySelector('deferred-content').classList.contains('is-error'))
    start()
  })
})

asyncTest('adds is-error class on xhr error', 1, function() {
  var div = document.createElement('div')
  div.innerHTML = '<deferred-content src="/boom">loading</deferred-content>'
  document.getElementById('qunit-fixture').appendChild(div)

  div.addEventListener('error', function(event) {
    event.stopPropagation()
    ok(document.querySelector('deferred-content').classList.contains('is-error'))
    start()
  })
})

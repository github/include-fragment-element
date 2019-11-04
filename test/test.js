/* eslint-env mocha */

let count
const responses = {
  '/hello': function() {
    return new Response('<div id="replaced">hello</div>', {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    })
  },
  '/one-two': function() {
    return new Response('<p id="one">one</p><p id="two">two</p>', {
      status: 200,
      headers: {
        'Content-Type': 'text/html'
      }
    })
  },
  '/blank-type': function() {
    return new Response('<div id="replaced">hello</div>', {
      status: 200,
      headers: {
        'Content-Type': null
      }
    })
  },
  '/boom': function() {
    return new Response('boom', {
      status: 500
    })
  },
  '/count': function() {
    count++
    return new Response(`${count}`, {
      status: 200,
      headers: {
        'Content-Type': 'text/html'
      }
    })
  },
  '/fragment': function(request) {
    if (request.headers.get('Accept') === 'text/html; fragment') {
      return new Response('<div id="fragment">fragment</div>', {
        status: 200,
        headers: {
          'Content-Type': 'text/html; fragment'
        }
      })
    } else {
      return new Response('406', {
        status: 406
      })
    }
  },
  '/test.js': function() {
    return new Response('alert("what")', {
      status: 200,
      headers: {
        'Content-Type': 'text/javascript'
      }
    })
  }
}

function when(el, eventType) {
  return new Promise(function(resolve) {
    el.addEventListener(eventType, resolve)
  })
}

window.IncludeFragmentElement.prototype.fetch = function(request) {
  const pathname = new URL(request.url).pathname
  return Promise.resolve(responses[pathname](request))
}

setup(function() {
  count = 0
})

suite('include-fragment-element', function() {
  teardown(() => {
    document.body.innerHTML = ''
  })
  test('create from document.createElement', function() {
    const el = document.createElement('include-fragment')
    assert.equal('INCLUDE-FRAGMENT', el.nodeName)
  })

  test('create from constructor', function() {
    const el = new window.IncludeFragmentElement()
    assert.equal('INCLUDE-FRAGMENT', el.nodeName)
  })

  test('src property', function() {
    const el = document.createElement('include-fragment')
    assert.equal(null, el.getAttribute('src'))
    assert.equal('', el.src)

    el.src = '/hello'
    assert.equal('/hello', el.getAttribute('src'))
    const link = document.createElement('a')
    link.href = '/hello'
    assert.equal(link.href, el.src)
  })

  test('initial data is in error state', function() {
    const el = document.createElement('include-fragment')

    return el.data['catch'](function(error) {
      assert.ok(error)
    })
  })

  test('data with src property', function() {
    const el = document.createElement('include-fragment')
    el.src = '/hello'

    return el.data.then(
      function(html) {
        assert.equal('<div id="replaced">hello</div>', html)
      },
      function() {
        assert.ok(false)
      }
    )
  })

  test('data with src attribute', function() {
    const el = document.createElement('include-fragment')
    el.setAttribute('src', '/hello')

    return el.data.then(
      function(html) {
        assert.equal('<div id="replaced">hello</div>', html)
      },
      function() {
        assert.ok(false)
      }
    )
  })

  test('setting data with src property multiple times', function() {
    const el = document.createElement('include-fragment')
    el.src = '/count'

    return el.data
      .then(function(text) {
        assert.equal('1', text)
        el.src = '/count'
      })
      .then(function() {
        return el.data
      })
      .then(function(text) {
        assert.equal('1', text)
      })
      ['catch'](function() {
        assert.ok(false)
      })
  })

  test('setting data with src attribute multiple times', function() {
    const el = document.createElement('include-fragment')
    el.setAttribute('src', '/count')

    return el.data
      .then(function(text) {
        assert.equal('1', text)
        el.setAttribute('src', '/count')
      })
      .then(function() {
        return el.data
      })
      .then(function(text) {
        assert.equal('1', text)
      })
      ['catch'](function() {
        assert.ok(false)
      })
  })

  test('throws on incorrect Content-Type', function() {
    const el = document.createElement('include-fragment')
    el.setAttribute('src', '/test.js')

    return el.data.then(
      () => {
        assert.ok(false)
      },
      error => {
        assert.match(error, /expected text\/html but was text\/javascript/)
      }
    )
  })

  test('throws on non-matching Content-Type', function() {
    const el = document.createElement('include-fragment')
    el.setAttribute('accept', 'text/html; fragment')
    el.setAttribute('src', '/hello')

    return el.data.then(
      () => {
        assert.ok(false)
      },
      error => {
        assert.match(error, /expected text\/html; fragment but was text\/html; charset=utf-8/)
      }
    )
  })

  test('throws on 406', function() {
    const el = document.createElement('include-fragment')
    el.setAttribute('src', '/fragment')

    return el.data.then(
      () => {
        assert.ok(false)
      },
      error => {
        assert.match(error, /the server responded with a status of 406/)
      }
    )
  })

  test('data is not writable', function() {
    const el = document.createElement('include-fragment')
    assert.ok(el.data !== 42)
    try {
      el.data = 42
    } finally {
      assert.ok(el.data !== 42)
    }
  })

  test('data is not configurable', function() {
    const el = document.createElement('include-fragment')
    assert.ok(el.data !== undefined)
    try {
      delete el.data
    } finally {
      assert.ok(el.data !== undefined)
    }
  })

  test('replaces element on 200 status', function() {
    const div = document.createElement('div')
    div.innerHTML = '<include-fragment src="/hello">loading</include-fragment>'
    document.body.appendChild(div)

    return when(div.firstChild, 'load').then(() => {
      assert.equal(document.querySelector('include-fragment'), null)
      assert.equal(document.querySelector('#replaced').textContent, 'hello')
    })
  })

  test('does not replace element if it has no parent', function() {
    const div = document.createElement('div')
    div.innerHTML = '<include-fragment>loading</include-fragment>'
    document.body.appendChild(div)

    const fragment = div.firstChild
    fragment.remove()
    fragment.src = '/hello'

    let didRun = false

    window.addEventListener('unhandledrejection', function() {
      assert.ok(false)
    })

    fragment.addEventListener('loadstart', () => {
      didRun = true
    })

    setTimeout(() => {
      assert.ok(!didRun)
      div.appendChild(fragment)
    }, 10)

    return when(fragment, 'load').then(() => {
      assert.equal(document.querySelector('#replaced').textContent, 'hello')
    })
  })

  test('replaces with several new elements on 200 status', function() {
    const div = document.createElement('div')
    div.innerHTML = '<include-fragment src="/one-two">loading</include-fragment>'
    document.body.appendChild(div)

    return when(div.firstChild, 'load').then(() => {
      assert.equal(document.querySelector('include-fragment'), null)
      assert.equal(document.querySelector('#one').textContent, 'one')
      assert.equal(document.querySelector('#two').textContent, 'two')
    })
  })

  test('replaces with response with accept header for any', function() {
    const div = document.createElement('div')
    div.innerHTML = '<include-fragment src="/test.js" accept="*/*">loading</include-fragment>'
    document.body.appendChild(div)

    return when(div.firstChild, 'load').then(() => {
      assert.equal(document.querySelector('include-fragment'), null)
      assert.match(document.body.textContent, /alert\("what"\)/)
    })
  })

  test('replaces with response with the right accept header', function() {
    const div = document.createElement('div')
    div.innerHTML = '<include-fragment src="/fragment" accept="text/html; fragment">loading</include-fragment>'
    document.body.appendChild(div)

    return when(div.firstChild, 'load').then(() => {
      assert.equal(document.querySelector('include-fragment'), null)
      assert.equal(document.querySelector('#fragment').textContent, 'fragment')
    })
  })

  test('error event is not cancelable or bubbles', function() {
    const div = document.createElement('div')
    div.innerHTML = '<include-fragment src="/boom">loading</include-fragment>'
    document.body.appendChild(div)

    return when(div.firstChild, 'error').then(event => {
      assert.equal(event.bubbles, false)
      assert.equal(event.cancelable, false)
    })
  })

  test('adds is-error class on 500 status', function() {
    const div = document.createElement('div')
    div.innerHTML = '<include-fragment src="/boom">loading</include-fragment>'
    document.body.appendChild(div)

    return when(div.firstChild, 'error').then(() =>
      assert.ok(document.querySelector('include-fragment').classList.contains('is-error'))
    )
  })

  test('adds is-error class on mising Content-Type', function() {
    const div = document.createElement('div')
    div.innerHTML = '<include-fragment src="/blank-type">loading</include-fragment>'
    document.body.appendChild(div)

    return when(div.firstChild, 'error').then(() =>
      assert.ok(document.querySelector('include-fragment').classList.contains('is-error'))
    )
  })

  test('adds is-error class on incorrect Content-Type', function() {
    const div = document.createElement('div')
    div.innerHTML = '<include-fragment src="/fragment">loading</include-fragment>'
    document.body.appendChild(div)

    return when(div.firstChild, 'error').then(() =>
      assert.ok(document.querySelector('include-fragment').classList.contains('is-error'))
    )
  })

  test('replaces element when src attribute is changed', function() {
    const elem = document.createElement('include-fragment')
    document.body.appendChild(elem)

    setTimeout(function() {
      elem.src = '/hello'
    }, 10)

    return when(elem, 'load').then(() => {
      assert.equal(document.querySelector('include-fragment'), null)
      assert.equal(document.querySelector('#replaced').textContent, 'hello')
    })
  })
})

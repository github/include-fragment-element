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
  '/slow-hello': function() {
    return new Promise(resolve => {
      setTimeout(resolve, 100)
    }).then(responses['/hello'])
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
    if (request.headers.get('Accept') === 'text/fragment+html') {
      return new Response('<div id="fragment">fragment</div>', {
        status: 200,
        headers: {
          'Content-Type': 'text/fragment+html'
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

setup(function() {
  count = 0
  window.IncludeFragmentElement.prototype.fetch = function (request) {
    const pathname = new URL(request.url).pathname
    return Promise.resolve(responses[pathname](request))
  }
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
    el.setAttribute('accept', 'text/fragment+html')
    el.setAttribute('src', '/hello')

    return el.data.then(
      () => {
        assert.ok(false)
      },
      error => {
        assert.match(error, /expected text\/fragment\+html but was text\/html; charset=utf-8/)
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
    div.innerHTML = '<include-fragment src="/fragment" accept="text/fragment+html">loading</include-fragment>'
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

  test('fires replaced event', function() {
    const elem = document.createElement('include-fragment')
    document.body.appendChild(elem)

    setTimeout(function() {
      elem.src = '/hello'
    }, 10)

    return when(elem, 'include-fragment-replaced').then(() => {
      assert.equal(document.querySelector('include-fragment'), null)
      assert.equal(document.querySelector('#replaced').textContent, 'hello')
    })
  })

  test('fires events for include-fragment node replacement operations for fragment manipulation', function() {
    const elem = document.createElement('include-fragment')
    document.body.appendChild(elem)

    setTimeout(function() {
      elem.src = '/hello'
    }, 10)

    elem.addEventListener('include-fragment-replace', event => {
      event.detail.fragment.querySelector('*').textContent = 'hey'
    })

    return when(elem, 'include-fragment-replaced').then(() => {
      assert.equal(document.querySelector('include-fragment'), null)
      assert.equal(document.querySelector('#replaced').textContent, 'hey')
    })
  })

  test('does not replace node if event was canceled ', function() {
    const elem = document.createElement('include-fragment')
    document.body.appendChild(elem)

    setTimeout(function() {
      elem.src = '/hello'
    }, 10)

    elem.addEventListener('include-fragment-replace', event => {
      event.preventDefault()
    })

    return when(elem, 'load').then(() => {
      assert(document.querySelector('include-fragment'), 'Node should not be replaced')
    })
  })

  suite('event order', () => {
    const originalSetTimeout = window.setTimeout
    setup(() => {
      // Emulate some kind of timer clamping
      let i = 60
      window.setTimeout = (fn, ms, ...rest) => originalSetTimeout.call(window, fn, ms + (i -= 20), ...rest)
    })
    teardown(() => {
      window.setTimeout = originalSetTimeout
    })

    test('loading events fire in guaranteed order', function() {
      const elem = document.createElement('include-fragment')
      const order = []
      const connected = []
      const events = [
        when(elem, 'loadend').then(() => {
          order.push('loadend')
          connected.push(elem.isConnected)
        }),
        when(elem, 'load').then(() => {
          order.push('load')
          connected.push(elem.isConnected)
        }),
        when(elem, 'loadstart').then(() => {
          order.push('loadstart')
          connected.push(elem.isConnected)
        })
      ]
      elem.src = '/hello'
      document.body.appendChild(elem)

      return Promise.all(events).then(() => {
        assert.deepStrictEqual(order, ['loadstart', 'load', 'loadend'])
        assert.deepStrictEqual(connected, [true, false, false])
      })
    })
  })

  test('sets loading to "eager" by default', function() {
    const div = document.createElement('div')
    div.innerHTML = '<include-fragment loading="lazy" src="/hello">loading</include-fragment>'
    document.body.appendChild(div)

    assert(div.firstChild.loading, 'eager')
  })

  test('loading will return "eager" even if set to junk value', function() {
    const div = document.createElement('div')
    div.innerHTML = '<include-fragment loading="junk" src="/hello">loading</include-fragment>'
    document.body.appendChild(div)

    assert(div.firstChild.loading, 'eager')
  })

  test('loading=lazy loads if already visible on page', function() {
    const div = document.createElement('div')
    div.innerHTML = '<include-fragment loading="lazy" src="/hello">loading</include-fragment>'
    document.body.appendChild(div)
    
    return when(div.firstChild, 'include-fragment-replaced').then(() => {
      assert.equal(document.querySelector('include-fragment'), null)
      assert.equal(document.querySelector('#replaced').textContent, 'hello')
    })
  })

  test('loading=lazy does not load if not visible on page', function() {
    const div = document.createElement('div')
    div.innerHTML = '<include-fragment loading="lazy" src="/hello">loading</include-fragment>'
    div.hidden = true
    document.body.appendChild(div)
    return Promise.race([
      when(div.firstChild, 'load').then(() => {
        throw new Error('<include-fragment loading=lazy> loaded too early')
      }),
      new Promise(resolve => setTimeout(resolve, 100))
    ])
  })

  test('loading=lazy does not load when src is changed', function() {
    const div = document.createElement('div')
    div.innerHTML = '<include-fragment loading="lazy" src="">loading</include-fragment>'
    div.hidden = true
    document.body.appendChild(div)
    div.firstChild.src = '/hello'
    return Promise.race([
      when(div.firstChild, 'load').then(() => {
        throw new Error('<include-fragment loading=lazy> loaded too early')
      }),
      new Promise(resolve => setTimeout(resolve, 100))
    ])
  })


  test('loading=lazy loads as soon as element visible on page', function() {
    const div = document.createElement('div')
    div.innerHTML = '<include-fragment loading="lazy" src="/hello">loading</include-fragment>'
    div.hidden = true
    let failed = false
    document.body.appendChild(div)
    const fail = () => failed = true
    div.firstChild.addEventListener('load', fail)

    setTimeout(function() {
      div.hidden = false
      div.firstChild.removeEventListener('load', fail)
    }, 100)

    return when(div.firstChild, 'load').then(() => {
      assert.ok(!failed, "Load occured too early")
    })
  })

  test('loading=lazy does not observably change during load cycle', function() {
    const div = document.createElement('div')
    div.innerHTML = '<include-fragment loading="lazy" src="/hello">loading</include-fragment>'
    const elem = div.firstChild
    document.body.appendChild(div)

    return when(elem, 'loadstart').then(() => {
      assert.equal(elem.loading, 'lazy', "loading mode changed observably")
    })
  })

  test('loading=lazy can be switched to eager to load', function() {
    const div = document.createElement('div')
    div.innerHTML = '<include-fragment loading="lazy" src="/hello">loading</include-fragment>'
    div.hidden = true
    let failed = false
    document.body.appendChild(div)
    const fail = () => failed = true
    div.firstChild.addEventListener('load', fail)

    setTimeout(function() {
      div.firstChild.loading = 'eager'
      div.firstChild.removeEventListener('load', fail)
    }, 100)

    return when(div.firstChild, 'load').then(() => {
      assert.ok(!failed, "Load occured too early")
    })
  })

  test('loading=lazy wont load twice even if load is manually called', function() {
    const div = document.createElement('div')
    div.innerHTML = '<include-fragment loading="lazy" src="/slow-hello">loading</include-fragment>'
    div.hidden = true
    document.body.appendChild(div)
    let count = 0
    div.firstChild.addEventListener('loadstart', () => count += 1)
    const load = div.firstChild.load()
    setTimeout(() => {
      div.hidden = false
    }, 0)

    return load
      .then(() => when(div.firstChild, 'loadend'))
      .then(() => {
        assert.equal(count, 1, "Load occured too many times")
      })
  })
})

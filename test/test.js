/* eslint-env mocha */
/* eslint-disable github/no-then */
/* global assert */

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
  }
}

const cleanDOM = () => {
  document.body.innerHTML = ''
}

const checkAsync = (done, func) => {
  try {
    func()
    done()
  } catch (err) {
    done(err)
  } finally {
    cleanDOM()
  }
}

window.IncludeFragmentElement.prototype.fetch = function(request) {
  const pathname = new URL(request.url).pathname
  return Promise.resolve(responses[pathname](request))
}

setup(function() {
  count = 0
})

suite('include-fragment-element', function() {
  test('create from document.createElement', function() {
    const el = document.createElement('include-fragment')
    assert.equal('INCLUDE-FRAGMENT', el.nodeName)
    cleanDOM()
  })

  test('create from constructor', function() {
    const el = new window.IncludeFragmentElement()
    assert.equal('INCLUDE-FRAGMENT', el.nodeName)
    cleanDOM()
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
    cleanDOM()
  })

  test('initial data is in error state', function() {
    const el = document.createElement('include-fragment')

    return el.data['catch'](function(error) {
      assert.ok(error)
      cleanDOM()
    })
  })

  test('data with src property', function() {
    const el = document.createElement('include-fragment')
    el.src = '/hello'

    return el.data.then(
      function(html) {
        assert.equal('<div id="replaced">hello</div>', html)
        cleanDOM()
      },
      function() {
        assert.ok(false)
        cleanDOM()
      }
    )
  })

  test('data with src attribute', function() {
    const el = document.createElement('include-fragment')
    el.setAttribute('src', '/hello')

    return el.data.then(
      function(html) {
        assert.equal('<div id="replaced">hello</div>', html)
        cleanDOM()
      },
      function() {
        assert.ok(false)
        cleanDOM()
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
        cleanDOM()
      })
      ['catch'](function() {
        assert.ok(false)
        cleanDOM()
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
        cleanDOM()
      })
      ['catch'](function() {
        assert.ok(false)
        cleanDOM()
      })
  })

  test('data is not writable', function() {
    const el = document.createElement('include-fragment')
    assert.ok(el.data !== 42)
    try {
      el.data = 42
    } finally {
      assert.ok(el.data !== 42)
      cleanDOM()
    }
  })

  test('data is not configurable', function() {
    const el = document.createElement('include-fragment')
    assert.ok(el.data !== undefined)
    try {
      delete el.data
    } finally {
      assert.ok(el.data !== undefined)
      cleanDOM()
    }
  })

  test('replaces element on 200 status', function(done) {
    const div = document.createElement('div')
    div.innerHTML = '<include-fragment src="/hello">loading</include-fragment>'
    document.body.appendChild(div)

    div.firstChild.addEventListener('load', function() {
      checkAsync(done, () => {
        assert.equal(document.querySelector('include-fragment'), null)
        assert.equal(document.querySelector('#replaced').textContent, 'hello')
        cleanDOM()
      })
    })
  })

  test('does not replace element if it has no parent', function(done) {
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

    fragment.addEventListener('load', function() {
      checkAsync(done, () => {
        assert.equal(document.querySelector('#replaced').textContent, 'hello')
      })
    })

    setTimeout(() => {
      assert.ok(!didRun)
      div.appendChild(fragment)
    }, 10)
  })

  test('replaces with several new elements on 200 status', function(done) {
    const div = document.createElement('div')
    div.innerHTML = '<include-fragment src="/one-two">loading</include-fragment>'
    document.body.appendChild(div)

    div.firstChild.addEventListener('load', function() {
      checkAsync(done, () => {
        assert.equal(document.querySelector('include-fragment'), null)
        assert.equal(document.querySelector('#one').textContent, 'one')
        assert.equal(document.querySelector('#two').textContent, 'two')
      })
    })
  })

  test('error event is not cancelable or bubbles', function(done) {
    const div = document.createElement('div')
    div.innerHTML = '<include-fragment src="/boom">loading</include-fragment>'
    document.body.appendChild(div)

    div.firstChild.addEventListener('error', function(event) {
      checkAsync(done, () => {
        assert.equal(event.bubbles, false)
        assert.equal(event.cancelable, false)
      })
    })
  })

  test('adds is-error class on 500 status', function(done) {
    const div = document.createElement('div')
    div.innerHTML = '<include-fragment src="/boom">loading</include-fragment>'
    document.body.appendChild(div)

    div.firstChild.addEventListener('error', function() {
      checkAsync(done, () => {
        assert.ok(document.querySelector('include-fragment').classList.contains('is-error'))
      })
    })
  })

  test('adds is-error class on mising Content-Type', function(done) {
    const div = document.createElement('div')
    div.innerHTML = '<include-fragment src="/blank-type">loading</include-fragment>'
    document.body.appendChild(div)

    div.firstChild.addEventListener('error', function() {
      checkAsync(done, () => {
        assert.ok(document.querySelector('include-fragment').classList.contains('is-error'))
      })
    })
  })

  test('replaces element when src attribute is changed', function(done) {
    const elem = document.createElement('include-fragment')
    document.body.appendChild(elem)

    elem.addEventListener('load', function() {
      checkAsync(done, () => {
        assert.equal(document.querySelector('include-fragment'), null)
        assert.equal(document.querySelector('#replaced').textContent, 'hello')
      })
    })

    setTimeout(function() {
      elem.src = '/hello'
    }, 10)
  })

  test('only loads when called if the lazyload property is set.', done => {
    let hasRun = false
    const elem = document.createElement('include-fragment')
    elem.src = '/hello'
    elem.lazyload = true

    elem.addEventListener('loadstart', () => {
      hasRun = true
    })

    elem.addEventListener('loadend', () => {
      checkAsync(done, () => {
        assert.ok(document.querySelector('#replaced'))
      })
    })

    document.body.appendChild(elem)

    setTimeout(function() {
      assert.ok(!hasRun)
      elem.get()
    }, 10)
  })
})

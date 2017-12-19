/* eslint-env mocha */
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

    el.data['catch'](function(error) {
      assert.ok(error)
    })
  })

  test('data with src property', async function() {
    const el = document.createElement('include-fragment')
    el.src = '/hello'

    let html
    try {
      html = await el.data
    } catch (error) {
      assert.ok(false)
    }
    assert.equal('<div id="replaced">hello</div>', html)
  })

  test('data with src attribute', async function() {
    const el = document.createElement('include-fragment')
    el.setAttribute('src', '/hello')

    let html
    try {
      html = await el.data
    } catch (error) {
      assert.ok(false)
    }
    assert.equal('<div id="replaced">hello</div>', html)
  })

  test('setting data with src property multiple times', async function() {
    const el = document.createElement('include-fragment')
    el.src = '/count'

    let text = await el.data
    assert.equal('1', text)
    el.src = '/count'
    try {
      text = await el.data
    } catch (error) {
      assert.ok(false)
    }
    assert.equal('1', text)
  })

  test('setting data with src attribute multiple times', async function() {
    const el = document.createElement('include-fragment')
    el.setAttribute('src', '/count')

    let text = await el.data
    assert.equal('1', text)
    el.src = '/count'
    try {
      text = await el.data
    } catch (error) {
      assert.ok(false)
    }
    assert.equal('1', text)
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

    div.firstChild.addEventListener('load', function() {
      assert.equal(document.querySelector('include-fragment'), null)
      assert.equal(document.querySelector('#replaced').textContent, 'hello')
    })
  })

  test('does not replace element if it has no parent', function() {
    const div = document.createElement('div')
    div.innerHTML = '<include-fragment src="/hello">loading</include-fragment>'
    document.body.appendChild(div)

    const fragment = div.firstChild
    fragment.remove()

    window.addEventListener('unhandledrejection', function() {
      assert.ok(false)
    })

    fragment.addEventListener('load', function() {
      assert.equal(document.querySelector('#replaced'), null)

      div.appendChild(fragment)

      setTimeout(function() {
        assert.equal(document.querySelector('#replaced').textContent, 'hello')
      }, 10)
    })
  })

  test('replaces with several new elements on 200 status', function() {
    const div = document.createElement('div')
    div.innerHTML = '<include-fragment src="/one-two">loading</include-fragment>'
    document.body.appendChild(div)

    div.firstChild.addEventListener('load', function() {
      assert.equal(document.querySelector('include-fragment'), null)
      assert.equal(document.querySelector('#one').textContent, 'one')
      assert.equal(document.querySelector('#two').textContent, 'two')
    })
  })

  test('error event is not cancelable or bubbles', function() {
    const div = document.createElement('div')
    div.innerHTML = '<include-fragment src="/boom">loading</include-fragment>'
    document.body.appendChild(div)

    div.firstChild.addEventListener('error', function(event) {
      assert.equal(event.bubbles, false)
      assert.equal(event.cancelable, false)
    })
  })

  test('adds is-error class on 500 status', function() {
    const div = document.createElement('div')
    div.innerHTML = '<include-fragment src="/boom">loading</include-fragment>'
    document.body.appendChild(div)

    div.firstChild.addEventListener('error', function() {
      assert.ok(document.querySelector('include-fragment').classList.contains('is-error'))
    })
  })

  test('adds is-error class on mising Content-Type', function() {
    const div = document.createElement('div')
    div.innerHTML = '<include-fragment src="/blank-type">loading</include-fragment>'
    document.body.appendChild(div)

    div.firstChild.addEventListener('error', function() {
      assert.ok(document.querySelector('include-fragment').classList.contains('is-error'))
    })
  })

  test('replaces element when src attribute is changed', function() {
    const div = document.createElement('div')
    div.innerHTML = '<include-fragment>loading</include-fragment>'
    document.body.appendChild(div)

    div.firstChild.addEventListener('load', function() {
      assert.equal(document.querySelector('include-fragment'), null)
      assert.equal(document.querySelector('#replaced').textContent, 'hello')
    })

    setTimeout(function() {
      div.firstChild.src = '/hello'
    }, 10)
  })
})

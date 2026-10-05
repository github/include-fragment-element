import assert from 'node:assert/strict'
import {mkdtemp, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {suite, test} from 'node:test'
import {ESLint} from 'eslint'

suite('escompat with Browserslist', () => {
  for (const [name, browsers, expectedRules] of [
    ['default targets', undefined, []],
    ['supported targets', 'chrome 80', []],
    ['unsupported targets', 'chrome 79', ['escompat/no-optional-chaining', 'escompat/no-nullish-coalescing']],
  ]) {
    test(name, async () => {
      const directory = await mkdtemp(path.join(tmpdir(), 'escompat-'))
      try {
        if (browsers) {
          await writeFile(path.join(directory, '.browserslistrc'), browsers)
        }
        const eslint = new ESLint({
          useEslintrc: false,
          baseConfig: {
            parserOptions: {ecmaVersion: 2020},
            plugins: ['escompat'],
            rules: {
              'escompat/no-optional-chaining': 'error',
              'escompat/no-nullish-coalescing': 'error',
            },
          },
        })
        const [result] = await eslint.lintText('const value = object?.property ?? fallback', {
          filePath: path.join(directory, 'fixture.js'),
        })
        assert.deepEqual(result.messages.map(message => message.ruleId).sort(), expectedRules.sort())
        assert.equal(result.errorCount, expectedRules.length)
      } finally {
        await rm(directory, {recursive: true, force: true})
      }
    })
  }
})

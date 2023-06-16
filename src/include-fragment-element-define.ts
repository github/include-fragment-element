import {IncludeFragmentElement} from './include-fragment-element.js'

const root = (typeof globalThis !== 'undefined' ? globalThis : window) as typeof window
try {
  root.IncludeFragmentElement = IncludeFragmentElement.define()
} catch (e: unknown) {
  if (
    !(root.DOMException && e instanceof DOMException && e.name === 'NotSupportedError') &&
    !(e instanceof ReferenceError)
  ) {
    throw e
  }
}

type JSXBase = JSX.IntrinsicElements extends {span: unknown}
  ? JSX.IntrinsicElements
  : Record<string, Record<string, unknown>>
declare global {
  interface Window {
    IncludeFragmentElement: typeof IncludeFragmentElement
  }
  interface HTMLElementTagNameMap {
    'include-fragment': IncludeFragmentElement
  }
  namespace JSX {
    interface IntrinsicElements {
      ['include-fragment']: JSXBase['span'] & Partial<Omit<IncludeFragmentElement, keyof HTMLElement>>
    }
  }
}

export default IncludeFragmentElement
export * from './include-fragment-element.js'

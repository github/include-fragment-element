export default class IncludeFragmentElement extends HTMLElement {
  readonly data: Promise<string>;
  src: string;
  fetch(request: Request): Promise<Response>;
}

declare global {
  interface Window {
    IncludeFragmentElement: typeof IncludeFragmentElement
  }
}

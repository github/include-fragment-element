export default class IncludeFragmentElement extends HTMLElement {
  readonly data: Promise<string>;
  src: string;
  fetch(request: Request): Promise<Response>;
}

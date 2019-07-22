export default class IncludeFragmentElement extends HTMLElement {
  get data(): Promise<string>;
  src: string;
  fetch(request: Request): Promise<Response>;
}

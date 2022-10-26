// We don't want to add `@types/trusted-types` as a dependency, so we use this stand-in.

export interface CSPTrustedHTMLToStringable {
  toString: () => string
}

export interface CSPTrustedTypesPolicy {
  createHTML: (s: string, response: Response) => CSPTrustedHTMLToStringable
}

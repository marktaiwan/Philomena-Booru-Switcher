/* Shorthands  */

type SelectorRoot = Document | HTMLElement;
type TagNameMapper<T extends keyof HTMLElementTagNameMap | string> = T extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[T] : HTMLElement;

function $<K extends keyof HTMLElementTagNameMap | string>(
  selector: K,
  root: SelectorRoot = document
): TagNameMapper<K> {
  return root.querySelector(selector);
}

function $$<K extends keyof HTMLElementTagNameMap | string>(
  selector: K,
  root: SelectorRoot = document
): NodeListOf<TagNameMapper<K>> {
  return root.querySelectorAll(selector);
}

// No idea why this doesn't work, workaround by overloading
// function create<K extends keyof HTMLElementTagNameMap | string>(ele: K): TagNameMapper<K> {
//   return document.createElement(ele);
// }

function create<K extends keyof HTMLElementTagNameMap>(ele: K): HTMLElementTagNameMap[K];
function create(ele: string): HTMLElement;
function create<K extends keyof HTMLElementTagNameMap>(ele: K | string): HTMLElementTagNameMap[K] | HTMLElement {
  return document.createElement(ele);
}

/* Url */
function makeAbsolute(path: string, domain: string): string {
  return path.match(/^(?:https?:)?\/\//) ? path : domain + path;
}

type QueryVariableSet = {
  [key: string]: string,
};
function getQueryVariableAll(): QueryVariableSet {
  const search = window.location.search;
  if (search === '') return {};
  const arr = search
    .substring(1)
    .split('&')
    .map(string => string.split('='));
  const dict = {};
  for (const list of arr) {
    dict[list[0]] = list[1];
  }
  return dict;
}

function getQueryVariable(key: string): string {
  return getQueryVariableAll()[key];
}

function makeQueryString(queries: QueryVariableSet): string {
  return '?' + Object
    .entries(queries)
    .map(arr => arr.join('='))
    .join('&');
}

export {
  $,
  $$,
  create,
  makeAbsolute,
  getQueryVariable,
  getQueryVariableAll,
  makeQueryString
};

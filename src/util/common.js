/* Shorthands  */
function $(selector, root = document) {
  return root.querySelector(selector);
}

function $$(selector, root = document) {
  return root.querySelectorAll(selector);
}

function create(ele) {
  return document.createElement(ele);
}

/* Url */
function makeAbsolute(path, domain) {
  return path.match(/^(?:https?:)?\/\//) ? path : domain + path;
}

function getQueryVariableAll() {
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

function getQueryVariable(key) {
  return getQueryVariableAll()[key];
}

function makeQueryString(queries) {
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

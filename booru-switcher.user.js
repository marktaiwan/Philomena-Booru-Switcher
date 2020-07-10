// ==UserScript==
// @name         Booru Switcher
// @description  Switch between Philomena-based boorus
// @version      1.0.2
// @author       Marker
// @license      MIT
// @namespace    https://github.com/marktaiwan/
// @homepageURL  https://github.com/marktaiwan/Philomena-Booru-Switcher
// @supportURL   https://github.com/marktaiwan/Philomena-Booru-Switcher/issues
// @match        *://*.derpibooru.org/*
// @match        *://*.trixiebooru.org/*
// @match        *://*.ponybooru.org/*
// @match        *://*.ponerpics.org/*
// @inject-into  content
// @noframes
// ==/UserScript==
(function () {

const SCRIPT_ID = 'booru_switcher';
const boorus = [
  {name: 'Ponybooru', host: 'ponybooru.org'},
  {name: 'Ponerpics', host: 'ponerpics.org'},
  {name: 'Derpibooru', host: 'derpibooru.org'},
  {name: 'Trixiebooru', host: 'trixiebooru.org'},
];

function $(selector, parent = document) {
  return parent.querySelector(selector);
}

function getQueryVariables() {
  const search = window.location.search;
  if (search === '') return {};

  const arr = window.location.search
    .substring(1)
    .split('&')
    .map(string => {
      return [key, val] = string.split('=');
    });

  const dict = {};
  for (const list of arr) {
    dict[list[0]] = list[1];
  }

  return dict;
}

function initUI() {
  const header = $('header.header');
  const headerRight = $('.header__force-right', header);
  const menuButton = document.createElement('div');
  menuButton.classList.add('dropdown', 'header__dropdown', `${SCRIPT_ID}__menu`);
  menuButton.innerHTML = `
<a class="header__link" href="#" data-click-preventdefault="true" title="Switch booru">
  <i class="${SCRIPT_ID}__icon fa fa-list-ul"></i>
  <span class="hide-limited-desktop hide-mobile">Switch</span>
  <span data-click-preventdefault="true"><i class="fa fa-caret-down"></i></span>
</a>
<nav class="dropdown__content"></nav>`;

  const nav = $('nav', menuButton);

  const searchDict = getQueryVariables();
  if (searchDict && searchDict.page) {
    delete searchDict.page;
  }
  const searchStr = (Object.keys(searchDict).length)
    ? '?' + Object.entries(searchDict).map(arr => arr.join('=')).join('&')
    : '';

  for (const booru of boorus) {
    const {name, host} = booru;
    if (window.location.host.match(host)) continue;
    const anchor = document.createElement('a');
    anchor.classList.add('header__link');
    anchor.href = window.location.protocol + '//' + host + window.location.pathname + searchStr;
    anchor.innerText = name;

    nav.append(anchor);
  }

  headerRight.insertAdjacentElement('beforebegin', menuButton);
}

if ($('#image_target')
  || window.location.pathname.match(/^\/forums\/\w+\/topics/)
  || window.location.pathname.startsWith('/images/')) {
  return;
}

initUI();
})();

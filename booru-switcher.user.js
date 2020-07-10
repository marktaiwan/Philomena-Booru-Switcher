// ==UserScript==
// @name         Booru Switcher
// @description  Switch between Philomena-based boorus
// @version      1.0.1
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

  for (const booru of boorus) {
    const {name, host} = booru;
    if (window.location.host.match(host)) continue;
    const anchor = document.createElement('a');
    anchor.classList.add('header__link');
    anchor.href = window.location.href.replace(window.location.host, host);
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

// ==UserScript==
// @name         Booru Switcher
// @description  Switch between Philomena-based boorus
// @version      1.1.0
// @author       Marker
// @license      MIT
// @namespace    https://github.com/marktaiwan/
// @homepageURL  https://github.com/marktaiwan/Philomena-Booru-Switcher
// @supportURL   https://github.com/marktaiwan/Philomena-Booru-Switcher/issues
// @match        *://*.derpibooru.org/*
// @match        *://*.trixiebooru.org/*
// @match        *://*.ponybooru.org/*
// @match        *://*.ponerpics.org/*
// @connect      derpibooru.org
// @connect      trixiebooru.org
// @connect      ponybooru.org
// @connect      ponerpics.org
// @grant        GM_xmlhttpRequest
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
    .map(string => string.split('='));

  const dict = {};
  for (const list of arr) {
    dict[list[0]] = list[1];
  }

  return dict;
}

function initSearchUI() {
  const nav = createDropdown();
  nav.style.width = '200px';

  for (const booru of boorus) {
    const {name, host} = booru;
    if (window.location.host.match(host)) continue;
    const anchor = createMenuItem(`Search on ${name}`, booru);
    anchor.href = '#';
    nav.append(anchor);
  }

  nav.addEventListener('click', async e => {
    e.preventDefault();
    e.stopPropagation();

    const anchor = e.target;
    const name = anchor.dataset.name;
    const host = anchor.dataset.host;
    const imageId = getImageId();
    const origText = anchor.innerText;

    try {
      anchor.innerText = 'Searching...';
      const hashes = await fetchImageHash(imageId);
      const id = await searchByHash(host, hashes);

      if (id) {
        const link = `https://${host}/images/${id}`;

        anchor.innerText = 'Redirecting...';
        window.location.href = link;
      } else {
        anchor.innerText = 'Not on ' + name;
      }
    } catch (err) {
      console.error(err.message);
      anchor.innerText = origText;
    }
  });
}

function initSwitcherUI() {
  const nav = createDropdown();

  const searchDict = getQueryVariables();
  if (searchDict && searchDict.page) delete searchDict.page;

  const searchStr = (Object.keys(searchDict).length)
    ? '?' + Object.entries(searchDict).map(arr => arr.join('=')).join('&')
    : '';

  for (const booru of boorus) {
    const {name, host} = booru;
    if (window.location.host.match(host)) continue;
    const anchor = createMenuItem(name, booru);
    anchor.href = window.location.protocol + '//' + host + window.location.pathname + searchStr;
    nav.append(anchor);
  }
}

function createDropdown() {
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
  headerRight.insertAdjacentElement('beforebegin', menuButton);

  return $('nav', menuButton);
}

function createMenuItem(text, booru) {
  const {name, host} = booru;
  const anchor = document.createElement('a');
  anchor.classList.add('header__link');
  anchor.dataset.name = name;
  anchor.dataset.host = host;
  anchor.innerText = text;
  return anchor;
}

function getImageId() {
  return $('#image_target').closest('.image-show-container').dataset.imageId;
}

function handleResponseError(response) {
  return (response.ok) ? response : Promise.reject('Unable to fetch from: ' + response.url);
}

function fetchImageHash(id) {
  const imageApiEndPoint = '/api/v1/json/images/';
  const url = window.location.origin + imageApiEndPoint + id;

  return window.fetch(url)
    .then(handleResponseError)
    .then(response => response.json())
    .then(json => {
      const {sha512_hash: hash, orig_sha512_hash: orig_hash} = json.image;
      return {hash, orig_hash};
    });
}

function searchByHash(host, hashes) {

  const encodeSearch = (hashes) => {

    /*
     *  hash:      the hash of the optimized image serverd by the site
     *  orig_hash: the hash of the original uploaded file
     */
    const {hash, orig_hash} = hashes;
    const tokenOr = '||';
    const tokens = [
      'orig_sha512_hash:' + hash,
      tokenOr,
      'orig_sha512_hash:' + orig_hash,
      tokenOr,
      'sha512_hash:' + hash,
      tokenOr,
      'sha512_hash:' + orig_hash,
    ];

    return tokens.map(token => window.encodeURIComponent(token)).join('+');
  };

  const searchApiEndPoint = '/api/v1/json/search/images';
  const searchTerm = encodeSearch(hashes);
  const dict = {
    q: searchTerm,
    filter_id: '56027',   // Use the 'Everything' filter to get unfiltered results
  };

  const query = Object.entries(dict)
    .map(arr => arr.join('='))
    .join('&');

  const url = 'https://' + host + searchApiEndPoint + '?' + query;

  return makeCrossSiteRequest(url)
    .then(handleResponseError)
    .then(resp => resp.response)
    .then(json => (json.total > 0) ? json.images[0].id : null);
}

function makeCrossSiteRequest(url) {
  return new Promise((resolve) => {
    GM_xmlhttpRequest({
      url: url,
      method: 'GET',
      headers: {
        'User-Agent': navigator.userAgent
      },
      responseType: 'json',
      onload: resp => resolve({ok: true, ...resp}),
      onerror: resp => resolve({ok: false, url: resp.finalUrl, ...resp}),
    });
  });
}

if ($('#image_target')) {
  initSearchUI();
} else if (!window.location.pathname.match(/^\/forums\/\w+\/topics/)) {
  initSwitcherUI();
}

})();

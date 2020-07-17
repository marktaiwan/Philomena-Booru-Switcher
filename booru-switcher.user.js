// ==UserScript==
// @name         Booru Switcher
// @description  Switch between Philomena-based boorus
// @version      1.1.10
// @author       Marker
// @license      MIT
// @namespace    https://github.com/marktaiwan/
// @homepageURL  https://github.com/marktaiwan/Philomena-Booru-Switcher
// @supportURL   https://github.com/marktaiwan/Philomena-Booru-Switcher/issues
// @match        *://*.derpibooru.org/*
// @match        *://*.trixiebooru.org/*
// @match        *://*.ponybooru.org/*
// @match        *://*.ponerpics.org/*
// @match        *://*.ponerpics.com/*
// @connect      derpibooru.org
// @connect      trixiebooru.org
// @connect      ponybooru.org
// @connect      ponerpics.org
// @connect      ponerpics.com
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @inject-into  content
// @noframes
// ==/UserScript==
(function () {
'use strict';

const SCRIPT_ID = 'booru_switcher';
const boorus = [
  {name: 'Ponybooru', host: 'ponybooru.org'},
  {name: 'Ponerpics', host: 'ponerpics.org'},
  {name: 'Derpibooru', host: 'derpibooru.org'},
  {name: 'Trixiebooru', host: 'trixiebooru.org'},
];
const DEBUG = false;

function $(selector, parent = document) {
  return parent.querySelector(selector);
}

function $$(selector, parent = document) {
  return parent.querySelectorAll(selector);
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
    const useFallbacks = e.ctrlKey;
    const name = anchor.dataset.name;
    const host = anchor.dataset.host;
    const imageTarget = $('#image_target');
    const uris = JSON.parse(imageTarget.dataset.uris);
    const fullImageURL = makeAbsolute(uris.full, window.location.origin);

    try {
      updateMessage('Searching...', host);

      /*
       *  Use reverse image serch as additional level of fallback if client-side hashing
       *  failed to yeild result. This takes the least precedence due to its inaccuracies.
       *
       *  To minimize latency, initiate client-side hashing and reverse search in parallel.
       */
      const imageSearch = (useFallbacks)
        ? searchByImage(fullImageURL, host).catch(resposneError(host))
        : null;
      const hashSearch = searchByHash(host, useFallbacks).catch(resposneError(host));
      const id = await hashSearch || await imageSearch;

      if (id) {
        const link = `https://${host}/images/${id}`;

        updateMessage('Redirecting...', host);
        window.location.href = link;
      } else {
        updateMessage('Not on ' + name, host);
      }
    } catch (err) {
      console.error(err);
      updateMessage('An error occurred', host);
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
  anchor.classList.add(`${SCRIPT_ID}_link`);
  anchor.dataset.name = name;
  anchor.dataset.host = host;
  anchor.innerText = text;
  return anchor;
}

function getCurrentImageId() {
  const regex = new RegExp(`(?:${window.location.origin})/(?:images/)?(?<domID>\\d+)(?:\\?.*|/|\\.html)?`, 'i');
  const result = regex.exec(window.location.href);
  if (result) {
    return result.groups.domID;
  } else {
    throw new Error('Unable to determin current image id.');
  }
}

function handleResponseError(response) {
  if (response.ok) {
    return response;
  } else {
    console.log(response);
    return Promise.reject('Unable to fetch from: ' + response.url);
  }
}

function resposneError(host) {
  return err => {
    console.log(err);
    updateMessage('Something went wrong', host);
  };
}

function fetchImageHash(id, fallback) {
  const imageApiEndPoint = '/api/v1/json/images/';
  const url = window.location.origin + imageApiEndPoint + id;

  if (!fallback) {
    log('get hash by API');
    return window.fetch(url)
      .then(handleResponseError)
      .then(response => response.json())
      .then(json => {
        const {sha512_hash: hash, orig_sha512_hash: orig_hash} = json.image;
        return {hash, orig_hash};
      });
  } else {
    log('get hash by download');
    const imageTarget = $('#image_target')
    const imageContainer = imageTarget.closest('.image-show-container');
    const mimeType = imageTarget.dataset.mimeType || imageContainer.dataset.mimeType;
    const uris = JSON.parse(imageTarget.dataset.uris);

    // special case for svg uploads
    const fullImageURL = (mimeType !== 'image/svg+xml')
      ? uris.full
      : uris.full.replace('/view/', /download/).replace(/\.\w+$/, '.svg');

    return fetch(makeAbsolute(fullImageURL, window.location.origin))
      .then(handleResponseError)
      .then(response => response.arrayBuffer())
      .then(buffer => window.crypto.subtle.digest('SHA-512', buffer))
      .then(hashBuffer => {

        /*
         *  Transform the ArrayBuffer into hex string
         *  Code taken from: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#Examples
         */
        // convert buffer to byte array
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        // convert bytes to hex string
        const hashHex = hashArray
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        return hashHex;
      })
      .then(hash => ({hash: hash, orig_hash: hash}));
  }
}

function searchByImage(imageUrl, host) {
  const apiEndPoint = '/api/v1/json/search/reverse';
  const url = 'https://' + host + apiEndPoint + '?url=' + imageUrl;

  return makeCrossSiteRequest(url, 'POST')
    .then(handleResponseError)
    .then(resp => resp.response)
    .then(json => {
      const images = json.images
        .filter(img => (img.duplicate_of === null && img.deletion_reason === null));

      updateMessage('Searching... [image]', host);
      log('searchByImage');
      log('request url:' + url);
      log('response count: ' + images.length);

      if (images.length <= 1) return (images.length === 1) ? images[0].id : null;

      /*
       *  There are more than one results.
       *  This is where things gets complicated.
       */
      log('multiple reverse search results');
      const jaccardIndex = (set1, set2) => {
        const intersect = set1.filter(tag => set2.includes(tag));
        return intersect.length / (set1.length + set2.length - intersect.length);
      };

      // get current image data
      const imageTarget = $('#image_target');
      const container = imageTarget.closest('.image-show-container');
      const sourceImage = {
        width: Number(container.dataset.width, 10),
        height: Number(container.dataset.height, 10),
        mime_type: imageTarget.dataset.mimeType || container.dataset.mimeType,
        aspect_ratio: Number(container.dataset.width, 10) / Number(container.dataset.height, 10),
        tags: [...$$('.tag-list [data-tag-name]')].map(ele => ele.dataset.tagName),
      };
      log({sourceImage});

      // calculate image similarity and assign a score
      const weights = {
        mime_type: 2,
        aspect_ratio: 4,
        resolution: 1,
        tags: 3,
      };
      const weightSum = Object.values(weights).reduce((sum, val) => sum += val);

      images.forEach(image => {
        const attributes = {
          mime_type: (image.mime_type == sourceImage.mime_type) ? 1 : 0,
          aspect_ratio: 1 - Math.tanh(Math.abs(sourceImage.aspect_ratio - image.aspect_ratio)),
          resolution: 1 - Math.tanh(
            Math.abs(
              (sourceImage.width * sourceImage.height) - (image.width * image.height)
            ) * 1e-3
          ),
          tags: jaccardIndex(sourceImage.tags, image.tags),
        };
        const score = Object
          .entries(weights)
          .reduce((sum, arr) => {
            const [attrName, weight] = arr;
            const attrScore = attributes[attrName] * (weight / weightSum);
            return sum + attrScore;
          } , 0);

        log({id: image.id, simScore: score, image, attributes});
        image.simScore = score;
      });

      const bestMatch = images.reduce(
        (bestMatch, current) => (bestMatch.simScore > current.simScore) ? bestMatch : current
      );
      log({bestMatch});
      return bestMatch.id;

    });
}

function searchByHash(host, hashFallback) {

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
    log(hashes);

    return tokens.map(token => unsafeWindow.encodeURIComponent(token)).join('+');
  };

  const imageId = getCurrentImageId();
  if (hashFallback) updateMessage('Searching... [hash]', host);

  return fetchImageHash(imageId, hashFallback)
    .then(encodeSearch)
    .then(searchTerm => {
      const dict = {
        q: searchTerm,
        filter_id: '56027',   // Use the 'Everything' filter to get unfiltered results
      };
      const query = Object.entries(dict)
        .map(arr => arr.join('='))
        .join('&');

      const searchApiEndPoint = '/api/v1/json/search/images';
      const url = 'https://' + host + searchApiEndPoint + '?' + query;

      log('begin search by hash');
      return url;
    })
    .then(makeCrossSiteRequest)
    .then(handleResponseError)
    .then(resp => resp.response)
    .then(json => (json.total > 0) ? json.images[0].id : null)
    .then(id => {
      if (id === null) log('no result for hash search');
      return id;
    });
}

function makeCrossSiteRequest(url, method = 'GET') {
  return new Promise((resolve) => {
    GM_xmlhttpRequest({
      url: url,
      method,
      headers: {
        'User-Agent': navigator.userAgent
      },
      responseType: 'json',
      onload: resp => {
        if (resp.statusText == 200) {
          resolve({ok: true, ...resp});
        } else {
          resolve({ok: false, url: resp.finalUrl, resp});
        }
      },
      onerror: resp => resolve({ok: false, url: resp.finalUrl, response: resp}),
    });
  });
}

function makeAbsolute(path, domain) {
  return path.match(/^(?:https?:)?\/\//) ? path : domain + path;
}

function updateMessage(msg, host) {
  const anchor = $(`.${SCRIPT_ID}_link[data-host="${host}"]`);
  anchor.innerText = msg;
}

function log(obj) {
  if (DEBUG) console.log(obj);
}

if ($('#image_target') || $('#thumbnails-not-yet-generated')) {
  initSearchUI();
} else if (!window.location.pathname.match(/^\/forums\/\w+\/topics/)) {
  initSwitcherUI();
}

})();

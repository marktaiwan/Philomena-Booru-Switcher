import {SCRIPT_ID, boorus} from './const';
import {$, updateMessage, isBor, makeAbsolute, getQueryVariableAll} from './util';
import {searchByHash, searchByImage, searchByApi} from './search';
import type {ImageResponse} from '../types/BooruApi';

function createDropdown(text: string, title = ''): HTMLElement {
  const header = $('header.header');
  const headerRight = $('.header__force-right', header);
  const menuButton = document.createElement('div');
  menuButton.classList.add('dropdown', 'header__dropdown', `${SCRIPT_ID}__menu`);
  menuButton.innerHTML = `
<a class="header__link" href="#" data-click-preventdefault="true" title="${title}">
  <i class="${SCRIPT_ID}__icon fa fa-list-ul"></i>
  <span class="hide-limited-desktop hide-mobile">${text}</span>
  <i class="fa fa-caret-down"></i>
</a>
<nav class="dropdown__content"></nav>`;
  headerRight.insertAdjacentElement('beforebegin', menuButton);

  return $('nav', menuButton);
}

function createMenuItem(text: string, booru: BooruRecord): HTMLAnchorElement {
  const {name, host} = booru;
  const anchor = document.createElement('a');
  anchor.classList.add('header__link');
  anchor.classList.add(`${SCRIPT_ID}_link`);
  anchor.relList.add('noopener');
  anchor.referrerPolicy = 'origin';
  anchor.dataset.name = name;
  anchor.dataset.host = host;
  anchor.innerText = text;
  return anchor;
}

function pathTranslation(toBor: boolean, pathname: string): string {
  const pathMapping = [{
    bor: '/search/index',
    philomena: '/search',
  }, {
    bor: '/posts',
    philomena: '/images',
  }, {
    bor: '/posts/new',
    philomena: '/images/new',
  }];

  for (const {bor, philomena} of pathMapping) {
    if (!toBor && pathname == bor) return philomena;
    if (toBor && pathname == philomena) return bor;
  }
  return pathname;
}

function initSearchUI(): void {
  const nav = createDropdown('Search', 'Search for this image on another site');
  nav.style.width = '200px';

  for (const booru of boorus) {
    const {name, host} = booru;
    if (window.location.host.match(host)) continue;
    const anchor = createMenuItem(name, booru);
    anchor.href = '#';
    nav.append(anchor);
  }

  nav.addEventListener('click', async e => {
    e.preventDefault();
    e.stopPropagation();
    if (!(e.target instanceof HTMLAnchorElement)) return;

    const anchor = e.target;
    const useFallbacks = e.ctrlKey;
    const name = anchor.dataset.name;
    const host = anchor.dataset.host;
    const imageTarget = $('#image_target');
    const uris: ImageResponse.Representations = JSON.parse(imageTarget.dataset.uris);
    const fullImageURL = makeAbsolute(uris.full, window.location.origin);

    try {
      updateMessage('Searching...', host);

      let id: number = null;
      if (isBor(host)) {
        // Twibooru
        id = await searchByApi(host) || await searchByHash(host, useFallbacks);
      } else {

        /*
         *  Use reverse image search as additional level of fallback if client-side hashing
         *  failed to yield result. This takes the least precedence due to its inaccuracies.
         *
         *  To minimize latency, initiate client-side hashing and reverse search in parallel.
         */
        const imageSearch = (useFallbacks) ? searchByImage(fullImageURL, host) : null;
        const hashSearch = searchByHash(host, useFallbacks);
        id = await hashSearch || await imageSearch;
      }

      if (id) {
        const anchor = document.createElement('a');
        anchor.href = `https://${host}/${(isBor(host)) ? 'posts' : 'images'}/${id}`;
        anchor.relList.add('noopener');
        anchor.referrerPolicy = 'origin';

        document.body.append(anchor);
        anchor.click();
        updateMessage('Redirecting...', host);
      } else {
        updateMessage('Not on ' + name, host);
      }
    } catch (err) {
      console.error(err);
      updateMessage('Something went wrong', host, true);
    }
  });
}

function initSwitcherUI(): void {
  if (!$('header.header, .header__force-right')) return;
  const nav = createDropdown('Switch', 'Switch to another booru');

  const searchDict = getQueryVariableAll();
  if (searchDict?.page) delete searchDict.page;

  const searchStr = (Object.keys(searchDict).length)
    ? '?' + Object.entries(searchDict).map(arr => arr.join('=')).join('&')
    : '';

  let pathname = window.location.pathname;
  if (isBor(window.location.host)) pathname = pathTranslation(false, pathname);

  for (const booru of boorus) {
    const {name, host} = booru;
    const path = (!isBor(host)) ? pathname : pathTranslation(true, pathname);
    if (window.location.host.match(host)) continue;

    const anchor = createMenuItem(name, booru);
    anchor.href = window.location.protocol + '//' + host + path + searchStr;
    nav.append(anchor);
  }
}

export {initSearchUI, initSwitcherUI};

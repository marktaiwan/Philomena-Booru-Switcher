import {$} from './common';
import {SCRIPT_ID, DEBUG, boorus} from '../const';

function encodeSearch(searchTerm) {
  return searchTerm
    .split(' ')
    .map(unsafeWindow.encodeURIComponent)
    .join('+');
}

function getCurrentImageId() {
  const regex = new RegExp(`(?:${window.location.origin})/(?:images/|posts/)?(?<domID>\\d+)(?:\\?.*|/|\\.html)?`, 'i');
  const result = regex.exec(window.location.href);
  if (result) {
    return result.groups.domID;
  } else {
    throw new Error('Unable to determin current image id.');
  }
}

function getFilterId(host) {
  return boorus.find(booru => booru.host === host).filterId;
}

function isBor(host) {
  return boorus.some(booru => (booru.host === host && booru.bor));
}

function updateMessage(msg, host, freeze = false) {
  const anchor = $(`.${SCRIPT_ID}_link[data-host="${host}"]`);
  if (!anchor || anchor.dataset.frozen === '1') return;
  if (freeze) anchor.dataset.frozen = '1';
  anchor.innerText = msg;
}

function log(obj) {
  if (DEBUG) console.log(obj);
}

export {encodeSearch, getCurrentImageId, getFilterId, isBor, updateMessage, log};

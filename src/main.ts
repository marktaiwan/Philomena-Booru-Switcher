import {initSwitcherUI, initSearchUI} from './ui';
import {$} from './util';

function main() {
  if ($('#image_target') || $('#thumbnails-not-yet-generated')) {
    initSearchUI();
  } else {
    // forum pages
    if (window.location.pathname.match(/^\/forums\/\w+\/topics/)) return;

    // Twibooru pastes
    if ($('ol.paste-content')) return;

    initSwitcherUI();
  }
}
main();

const SCRIPT_ID = 'booru_switcher';
const boorus: BooruRecord[] = [
  {name: 'Ponybooru', host: 'ponybooru.org', filterId: 1554},
  {name: 'Ponerpics', host: 'ponerpics.org', filterId: 2},
  {name: 'Twibooru', host: 'twibooru.org', filterId: 2, bor: true},  // runs on Booru-on-Rails
  {name: 'Derpibooru', host: 'derpibooru.org', filterId: 56027},
];
window.booru_switcher = {};
window.booru_switcher.DEBUG = false;

export {SCRIPT_ID, boorus};

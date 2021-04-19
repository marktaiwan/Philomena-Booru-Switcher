type BooruRecord = {
  name: string,
  host: string,
  filterId: number,
  bor?: boolean,
};

type GMResponseObject = {ok: true} & GM_Types.XHRResponse<unknown>;

type GMResponseError = {
  ok: false,
  url: string,
  resp: GM_Types.XHRResponse<unknown>,
};

interface Window {
  booru_switcher: {
    DEBUG?: boolean,
  };
}

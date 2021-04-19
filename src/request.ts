import {log} from './util';

function handleResponseError(
  response: GMResponseObject | GMResponseError
): GMResponseObject {
  if (response.ok === true) {
    response;
    return response;
  } else {
    log(response);
    throw new Error('Unable to fetch from: ' + response.url);
  }
}

function makeRequest(
  url: string,
  responseType: GM_Types.XHRDetails<unknown>['responseType'] = 'json',
  method: GM_Types.XHRDetails<unknown>['method'] = 'GET'
): Promise<GMResponseObject> {
  return new Promise((resolve) => {
    GM_xmlhttpRequest({
      url: url,
      method,
      headers: {
        'User-Agent': navigator.userAgent
      },
      responseType,
      onload: resp => {
        if (resp.status == 200) {
          resolve({ok: true, ...resp});
        } else {
          resolve({ok: false, url: resp.finalUrl, resp});
        }
      },
      onerror: resp => resolve({ok: false, url: resp.finalUrl, resp}),
    });
  }).then(handleResponseError);
}

export {makeRequest};

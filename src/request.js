import {log} from './util';

function handleResponseError(response) {
  if (response.ok) {
    return response;
  } else {
    log(response);
    throw new Error('Unable to fetch from: ' + response.url);
  }
}

function makeRequest(url, responseType = 'json', method = 'GET') {
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

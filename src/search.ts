import {$, $$, makeAbsolute, makeQueryString} from './util/common';
import {encodeSearch, getCurrentImageId, isBor, getFilterId, updateMessage, log} from './util/project';
import {makeRequest} from './request';
import {ImageResponse, Philomena, Twibooru} from '../types/BooruApi';

interface ImageObjectWeighted extends Philomena.Image.ImageObject {
  simScore: number;
}

function fetchImageHash(id: string, fallback: boolean): Promise<{hash: string, orig_hash: string}> {
  if (!fallback) {
    const url = (!isBor(window.location.host))
      ? window.location.origin + '/api/v1/json/images/' + id
      : window.location.origin + '/posts/' + id + '.json';

    log('get hash by API');
    return makeRequest(url)
      .then(resp => resp.response)
      .then((json: Twibooru.Api.Image | Philomena.Api.Image) => {
        const {
          sha512_hash: hash,
          orig_sha512_hash: orig_hash
        } = (typeof json.image == 'object')
          ? json.image as Philomena.Image.ImageObject
          : json as Twibooru.Image.ImageObject;  // booru-on-rails compatibility

        return {hash, orig_hash};
      });
  } else {
    log('get hash by download');
    const imageTarget = $('#image_target');
    const imageContainer = imageTarget.closest('.image-show-container') as HTMLElement;
    const mimeType = imageTarget.dataset.mimeType || imageContainer.dataset.mimeType;
    const uris: ImageResponse.Representations = JSON.parse(imageTarget.dataset.uris);

    // special case for svg uploads
    const fullImageURL = (mimeType !== 'image/svg+xml')
      ? uris.full
      : uris.full.replace('/view/', '/download/').replace(/\.\w+$/, '.svg');

    return makeRequest(makeAbsolute(fullImageURL, window.location.origin), 'arraybuffer')
      .then(resp => resp.response)
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

function searchByHash(host: BooruRecord['host'], hashFallback: boolean): Promise<number> {
  if (hashFallback) updateMessage('Searching... [hash]', host);
  return fetchImageHash(getCurrentImageId(), hashFallback)
    .then(hashes => {
      log(hashes);

      /*
       *  hash:      the hash of the optimized image served by the site
       *  orig_hash: the hash of the original uploaded file
       */
      const searchItems = [];
      const {hash, orig_hash} = hashes;
      [hash, orig_hash].forEach(hash => {
        searchItems.push('orig_sha512_hash:' + hash);
        searchItems.push('sha512_hash:' + hash);
      });
      const query = makeQueryString({
        q: encodeSearch(searchItems.join(' || ')),
        filter_id: getFilterId(host),
      });

      const searchApiEndPoint = (!isBor(host)) ? '/api/v1/json/search/images' : '/search.json';
      const url = 'https://' + host + searchApiEndPoint + query;

      log('begin search by hash');
      return url;
    })
    .then(makeRequest)
    .then(resp => resp.response)
    .then(json => {
      const arr: Array<Philomena.Image.ImageObject | Twibooru.Image.ImageObject> = json.images || json.search;  // booru-on-rails compatibility

      log('Hash search results: ' + arr.length);
      return (arr.length > 0) ? arr[0].id : null;
    });
}
function searchByImage(imageUrl: string, host: BooruRecord['host']): Promise<number> {
  const apiEndPoint = '/api/v1/json/search/reverse';
  const url = 'https://' + host + apiEndPoint + '?url=' + imageUrl;

  return makeRequest(url, 'json', 'POST')
    .then(resp => resp.response as Philomena.Api.Search)
    .then(json => {
      const images = (json
        .images
        .filter(img => img.duplicate_of === null && img.deletion_reason === null)
      ) as ImageObjectWeighted[];

      const dupes = json.images.filter(img => img.duplicate_of !== null);

      updateMessage('Searching... [image]', host);
      log('searchByImage');
      log('request url:' + url);
      log('Image search results: ' + images.length);

      if (images.length <= 1) return (images.length === 1)
        ? images[0].id
        : (dupes.length > 0) ? dupes[0].id : null;

      /*
       *  There are more than one results.
       *  This is where things gets complicated.
       */
      log('multiple reverse search results');
      const jaccardIndex = (set1: string[], set2: string[]): number => {
        const intersect = set1.filter(tag => set2.includes(tag));
        return intersect.length / (set1.length + set2.length - intersect.length);
      };

      // get current image data
      const imageTarget = $('#image_target');
      const container = imageTarget.closest('.image-show-container') as HTMLElement;
      const sourceImage: Pick<
        Philomena.Image.ImageObject,
        'width' | 'height' | 'mime_type' | 'aspect_ratio' | 'tags'
      > = {
        width: Number.parseInt(container.dataset.width, 10),
        height: Number.parseInt(container.dataset.height, 10),
        mime_type: (imageTarget.dataset.mimeType || container.dataset.mimeType) as ImageResponse.MimeType,
        aspect_ratio: Number.parseInt(container.dataset.width, 10) / Number.parseInt(container.dataset.height, 10),
        tags: [...$$('.tag-list [data-tag-name]')].map(ele => ele.dataset.tagName),
      };
      log({sourceImage});

      // calculate image similarity and assign a score
      const weights = {
        mime_type: 2,
        aspect_ratio: 4,
        resolution: 1,
        tags: 3,
      } as const;
      const weightSum = Object.values(weights as {[k: string]: number}).reduce((sum, val) => sum + val);

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
          }, 0);

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

// Twibooru specific
function searchByApi(host: BooruRecord['host']): Promise<number> {
  const hostToSiteMapping = {
    'www.derpibooru.org': 'derpibooru',
    'www.trixiebooru.org': 'derpibooru',
    'derpibooru.org': 'derpibooru',
    'trixiebooru.org': 'derpibooru',
  } as const;

  const sourceId = getCurrentImageId();
  const site = hostToSiteMapping[window.location.host];
  if (!site) return null;

  const query = makeQueryString({
    q: encodeSearch(`location:${site} && id_at_location:${sourceId}`),
    filter_id: getFilterId(host),
  });
  const url = 'https://twibooru.org/search.json' + query;
  log('Searching Twibooru with API');
  log(url);
  return makeRequest(url)
    .then(resp => resp.response as Twibooru.Api.Search)
    .then(json => (json.total > 0) ? json.search[0].id : null);
}

export {searchByHash, searchByImage, searchByApi};

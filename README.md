# Philomena-Booru-Switcher

Requires [Violentmonkey](https://violentmonkey.github.io/) or compatible userscript manager.  
[Click here to install](https://github.com/marktaiwan/Philomena-Booru-Switcher/raw/master/booru-switcher.user.js)

## Screenshot

![Screenshot](https://raw.githubusercontent.com/marktaiwan/Philomena-Booru-Switcher/master/screenshots/screenshot.png)


## Known issue

There's a bug where the file hash returned by the site's API doesn't match the actual file.

If such an image was downloaded from _Site A_ then uploaded to _Site B_. Trying to search for the image from _Site A_ would find no result. As a workaround, you can `ctrl + click` the link again to force the script to download the full image and compute the hash client side.

This let you search on _Site A_ for images that had been uploaded to _Site B_. However, it won't work for the inverse, i.e. find the source image on _Site A_ from _Site B_. So, when client-side hashing fails to yield result, the script uses  Philomena's reverse image search function as the final fallback.

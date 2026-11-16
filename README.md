# FoldRocket Free source

Human-readable source and build configuration for the JavaScript distributed with
[FoldRocket Free](https://wordpress.org/plugins/foldrocket/), version 1.4.32.

This repository contains only modules included in the WordPress.org Free builds.
Commercial FoldRocket implementations are not included.

## Requirements

- Node.js 18 or newer
- npm

## Build

```sh
npm ci
npm run build
```

The commands generate `assets/js/admin.js` and `assets/js/media-modal-app.js`.
The PHP source and readable CSS are distributed directly in the WordPress.org plugin.

## License

GPL-2.0-or-later. See [LICENSE.txt](LICENSE.txt).

# gulp-pdf-to-image

## Install

```sh
npm install gulp-pdf-to-image
```

## Usage

```javascript
const pdfToImage = require('gulp-pdf-to-image');

gulp.task('pdfConvert', function() {
  return gulp.src('./*.pdf')
    .pipe(pdf2Image({
      scale: 2.0,
      format: 'jpg',
    }))
    .pipe(gulp.dest('./'));
});
```

## Options

| Option | Value | Default | Description |
| --- | --- | --- | --- |
| `scale` | `number` | `1.0` | Scales the page's viewport. |
| `format` | `'gif'`\|`'tiff'`\|`'jpg'`\|`'jpeg'`\|`'png'` | `'png'` | Image output format. |
| `filePrefix` | `string` | `undefined` | Prefix to use for image filenames. Defaults to PDF title. |
| `disableFontFace` | `boolean` | `true` | Set to `false` to use system fonts. Set to `true` to use embedded fonts. |

## Credits

Inspired by Mozilla's [PDF.js](https://mozilla.github.io/pdf.js/) and its [Node examples](https://github.com/mozilla/pdf.js/tree/master/examples).

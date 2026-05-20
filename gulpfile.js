const { src, dest } = require('gulp');

const COPY_ICONS = [
  'nodes/**/*.{png,svg}',
  'credentials/**/*.{png,svg}',
];

function buildIcons() {
  return src(COPY_ICONS, { base: '.' }).pipe(dest('dist'));
}

exports['build:icons'] = buildIcons;

const { src, dest } = require('gulp');

function buildIcons() {
	return src('nodes/**/*.{png,svg}')
		.pipe(dest('dist/nodes'));
}

exports.default = buildIcons;
exports['build:icons'] = buildIcons;

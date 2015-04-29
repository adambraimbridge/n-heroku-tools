'use strict';

module.exports = {
	build: require('./tasks/build'),
	configure: require('./tasks/configure'),
	deployHashedAssets: require('./tasks/deploy-hashed-assets'),
	deployStatic: require('./tasks/deploy-static'),
	deployVcl: require('./tasks/deploy-vcl'),
	deploy: require('./tasks/deploy'),
	destroy: require('./tasks/destroy'),
	install: require('./tasks/install'),
	nightwatch: require('./tasks/nightwatch'),
	provision: require('./tasks/provision'),
	purge: require('./tasks/purge'),
	verify: require('./tasks/verify')
};

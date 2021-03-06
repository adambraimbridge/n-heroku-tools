'use strict';

let shellpromise = require('shellpromise');
let authToken;

const getAuthFromCli = () => {
	return shellpromise('heroku auth:whoami 2>/dev/null')
		.then(function () {
			return shellpromise('heroku auth:token 2>/dev/null');
		})
		.then(function (token) {
			return token.trim();
		})
		.catch(function (err) {
			console.error(err); // eslint-disable-line no-console
			throw new Error('Please make sure the Heroku CLI is authenticated by running `heroku auth:token`');
		});
};

module.exports = async function () {
	if (process.env.HEROKU_AUTH_TOKEN) {

		return Promise.resolve(process.env.HEROKU_AUTH_TOKEN);

	} else {

		if (authToken) {
			return authToken;
		} else {
			authToken = await getAuthFromCli();
			return authToken;
		}

	}
};

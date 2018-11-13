const pRetry = require('p-retry');

const herokuAuthToken = require('../lib/heroku-auth-token');
const { getGithubArchiveRedirectUrl } = require('./github-api');

const REVIEW_APPS_URL = 'https://api.heroku.com/review-apps';
const DEFAULT_HEADERS = {
	'Accept': 'application/vnd.heroku+json; version=3',
	'Content-Type': 'application/json'
};

const NUM_RETRIES = 30;
const RETRY_EXP_BACK_OFF_FACTOR = 1;
const MIN_TIMEOUT = 10 * 1000;
const REVIEW_APP_STATUSES = {
	pending: 'pending',
	deleted: 'deleted',
	creating: 'creating',
	created: 'created'
};
const BUILD_STATUS_SUCCEEDED = 'succeeded';

const getReviewAppUrl = reviewAppId => `https://api.heroku.com/review-apps/${reviewAppId}`;
const getPipelineReviewAppsUrl = pipelineId => `https://api.heroku.com/pipelines/${pipelineId}/review-apps`;
const getAppUrl = appId => `https://api.heroku.com/apps/${appId}`;
const getBuildsUrl = appId => `https://api.heroku.com/apps/${appId}/builds`;

function herokuHeaders ({ useReviewAppApi } = {}) {
	const defaultHeaders = useReviewAppApi
		? Object.assign({}, DEFAULT_HEADERS, {
			Accept: 'application/vnd.heroku+json; version=3.review-apps',
		})
		: DEFAULT_HEADERS;
	return herokuAuthToken()
		.then(key => {
			return {
				...defaultHeaders,
				Authorization: `Bearer ${key}`
			};
		});
}

const throwIfNotOk = async res => {
	const { ok, status, url } = res;
	if (!ok) {
		const errorBody = await res.json();
		console.error('Fetch error:', status, url, errorBody); // eslint-disable-line no-console
		throw errorBody;
	}
	return res;
};

const waitTillReviewAppCreated = ({ minTimeout = MIN_TIMEOUT } = {}) => reviewApp => {
	const { id } = reviewApp;
	const checkForCreatedStatus = async () => {
		const headers = await herokuHeaders({ useReviewAppApi: true });
		const result = await fetch(getReviewAppUrl(id), {
			headers
		})
			.then(throwIfNotOk)
			.then(res => res.json())
			.then(data => {
				const { status, message, app } = data;
				if (status === REVIEW_APP_STATUSES.deleted) {
					throw new pRetry.AbortError(`Review app was deleted: ${message}`);
				}

				if (status !== REVIEW_APP_STATUSES.created) {
					const appIdOutput = (status === REVIEW_APP_STATUSES.creating)
						? `, appId: ${app.id}`
						: '';
					throw new Error(`Review app not created yet. Current status: ${status}${appIdOutput}`);
				};

				return app.id;
			});
		return result;
	};

	return pRetry(checkForCreatedStatus, {
		factor: RETRY_EXP_BACK_OFF_FACTOR,
		retries: NUM_RETRIES,
		minTimeout,
		onFailedAttempt: (err) => {
			const { attemptNumber, message } = err;
			console.error(`${attemptNumber}/${NUM_RETRIES}: ${message}`); // eslint-disable-line no-console
		}
	});
};

const getAppName = async (appId) => {
	const headers = await herokuHeaders();
	return fetch(getAppUrl(appId), {
		headers
	})
		.then(throwIfNotOk)
		.then(res => res.json())
		.then((result) => {
			const { name } = result;
			return name;
		});
};

const findCreatedReviewApp = async ({ pipelineId, branch }) => {
	const headers = await herokuHeaders({ useReviewAppApi: true });
	return fetch(getPipelineReviewAppsUrl(pipelineId), {
		headers
	})
		.then(throwIfNotOk)
		.then(res => res.json())
		.then((reviewApps = []) =>
			reviewApps.find(({ branch: reviewAppBranch }) => reviewAppBranch === branch));
};

const getBuilds = async (appId) => {
	const headers = await herokuHeaders();
	return fetch(getBuildsUrl(appId), {
		headers
	})
		.then(throwIfNotOk)
		.then(res => res.json());
};

const waitForReviewAppBuild = ({ commit, minTimeout = MIN_TIMEOUT }) => async (appId) => {
	const checkForBuildAppId = () => getBuilds(appId)
		.then(builds => {
			const build = builds.find(({ source_blob: { version } }) => version === commit);

			if (!build) {
				throw new Error(`No review app build found for app id ${appId}, commit ${commit}`);
			}

			const { status } = build;
			if (status !== BUILD_STATUS_SUCCEEDED) {
				throw new Error(`Review app build for app id ${appId} (commit ${commit}) not done yet: ${status}`);
			}

			return build;
		})
		.then(({ app: { id } }) => id);

	return pRetry(checkForBuildAppId, {
		factor: RETRY_EXP_BACK_OFF_FACTOR,
		retries: NUM_RETRIES,
		minTimeout,
		onFailedAttempt: (err) => {
			const { attemptNumber, message } = err;
			console.error(`${attemptNumber}/${NUM_RETRIES}: ${message}`); // eslint-disable-line no-console
		}
	});
};

const createReviewApp = async ({ pipelineId, repoName, commit, branch, githubToken }) => {
	const headers = await herokuHeaders({ useReviewAppApi: true });
	const body = {
		pipeline: pipelineId,
		branch,
		source_blob: {
			url: await getGithubArchiveRedirectUrl({ repoName, branch, githubToken }),
			version: commit
		}
	};
	return fetch(REVIEW_APPS_URL, {
		headers,
		method: 'post',
		body: JSON.stringify(body)
	});
};

module.exports = {
	createReviewApp,
	findCreatedReviewApp,
	getAppName,
	getBuilds,
	waitForReviewAppBuild,
	waitTillReviewAppCreated
};
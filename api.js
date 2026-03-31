export class API {

	/**
	 * @returns {string}
	 */
	get _url() {
		return `${location.protocol}//${location.host}/api.php`;
	}

	/**
	 * @param {string} action
	 * @returns {any}
	 */
	async get(action) {
		return await this._request('GET', action, null);
	}

	/**
	 * @param {string} action
	 * @param {FormData} body
	 * @returns {any}
	 */
	async post(action, body) {
		return await this._request('POST', action, body);
	}

	/**
	 * @param {string} method
	 * @param {string} action
	 * @param {?FormData} body
	 * @returns {any}
	 */
	async _request(method, action, body) {
		try {
			const url = new URL(this._url);
			url.searchParams.append('action', action);
			const response = await fetch(url, {
				body: body,
				method: method,
			});
			const contentType = response.headers.get('content-type');
			if (!contentType.startsWith('application/json;')) {
				const text = await response.text();
				throw new Error(text);
			}
			return await response.json();
		} catch (error) {
			console.error(error);
			alert(error);
			throw error;
		}
	}
}

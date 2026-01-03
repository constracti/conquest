import { api } from './common.js';

/**
 * @typedef Setup
 * @type {object}
 * @property {string} id
 * @property {?string} name
 */

/**
 * @typedef LoginSuccess
 * @type {object}
 * @property {Setup} setup
 */

/**
 * @typedef State
 * @type {object}
 * @property {Setup} setup
 */

/**
 * @type {?State}
 */
let state = null;

function render() {
	if (state === null) {
		login_form.classList.remove('d-none');
		register_form.classList.add('d-none');
		main_div.classList.add('d-none');
		return;
	}
	login_form.classList.add('d-none');
	register_form.classList.add('d-none');
	main_div.classList.remove('d-none');
	name_heading.innerHTML = state.setup.name; // TODO might be null
}

/**
 * @type {HTMLFormElement}
 */
const login_form = document.getElementById('login-form');

login_form.addEventListener('submit', async event => {
	event.preventDefault();
	if (!login_spinner.classList.contains('d-none'))
		return;
	login_spinner.classList.remove('d-none');
	const form_data = new FormData(login_form);
	/**
	 * @type {LoginSuccess|string}
	 */
	const result = await api.post('setup_login', form_data);
	if (typeof(result) === 'string') {
		if (result !== 'password')
			alert('Identifier is not found.');
		else
			alert('Password is wrong.')
		login_spinner.classList.add('d-none');
		return;
	}
	login_spinner.classList.add('d-none');
	login_form.reset();
	localStorage.setItem('id', form_data.get('id'));
	localStorage.setItem('password', form_data.get('password'));
	state = {
		setup: result.setup,
	};
	render();
});

/**
 * @type {HTMLDivElement}
 */
const login_spinner = document.getElementById('login-spinner');

document.getElementById('register-button').addEventListener('click', () => {
	login_form.classList.add('d-none');
	register_form.classList.remove('d-none');
});

/**
 * @type {HTMLFormElement}
 */
const register_form = document.getElementById('register-form');

register_form.addEventListener('submit', async event => {
	event.preventDefault();
	if (!register_spinner.classList.contains('d-none'))
		return;
	register_spinner.classList.remove('d-none');
	/**
	 * @type {HTMLInputElement}
	 */
	const password_input = document.getElementById('register-password');
	/**
	 * @type {HTMLInputElement}
	 */
	const spellcheck_input = document.getElementById('register-spellcheck');
	if (password_input.value !== spellcheck_input.value) {
		alert('Passwords do not match.');
		register_spinner.classList.add('d-none');
		spellcheck_input.focus();
		return;
	}
	/**
	 * @type {LoginSuccess|null}
	 */
	const result = await api.post('setup_register', new FormData(register_form));
	if (result === null) {
		alert('Identifier is not available.');
		register_spinner.classList.add('d-none');
		return;
	}
	register_spinner.classList.add('d-none');
	register_form.reset();
	localStorage.setItem('id', form_data.get('id'));
	localStorage.setItem('password', form_data.get('password'));
	state = {
		setup: result.setup,
	};
	render();
});

/**
 * @type {HTMLDivElement}
 */
const register_spinner = document.getElementById('register-spinner');

document.getElementById('login-button').addEventListener('click', () => {
	register_form.classList.add('d-none');
	login_form.classList.remove('d-none');
});

/**
 * @type {HTMLDivElement}
 */
const main_div = document.getElementById('main-div');

/**
 * @type {HTMLHeadingElement}
 */
const name_heading = document.getElementById('name-heading');

document.getElementById('logout-button').addEventListener('click', () => {
	localStorage.removeItem('id');
	localStorage.removeItem('password');
	state = null;
	render();
});

(async () => {
	const id = localStorage.getItem('id');
	const password = localStorage.getItem('password');
	if (id === null || password === null) {
		render();
		return;
	}
	const form_data = new FormData();
	form_data.set('id', id);
	form_data.set('password', password);
	/**
	 * @type {LoginSuccess|string}
	 */
	const result = await api.post('setup_login', form_data);
	if (typeof(result) === 'string') {
		render();
		return;
	}
	state = {
		setup: result.setup,
	};
	render();
})();

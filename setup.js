import { api } from './common.js';
import { n } from './element.js';

/**
 * @typedef Setup
 * @type {object}
 * @property {string} id
 * @property {?string} name
 * @property {?string} map
 */

/**
 * @typedef Success
 * @type {object}
 * @property {Setup} setup
 */

/**
 * @typedef State
 * @type {object}
 * @property {Setup} setup
 * @property {string} password
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
	id_block.innerHTML = `<code>${state.setup.id}</code>`;
	render_name();
	render_map();
}

function render_name() {
	name_block.innerHTML = '';
	const element_list = [
		n({
			class: 'm-2 flex-grow-1',
			content: state.setup.name,
		}),
		n({
			tag: 'button',
			class: 'm-2 btn btn-secondary',
			type: 'button',
			click: () => {
				element_list.forEach(element => element.classList.toggle('d-none'));
			},
			content: 'Edit',
		}),
		n({
			tag: 'form',
			class: 'd-none flex-grow-1 d-flex flex-row align-items-center',
			submit: async event => {
				event.preventDefault();
				if (!spinner_div.classList.contains('d-none'))
					return;
				spinner_div.classList.remove('d-none');
				const form_data = new FormData(event.currentTarget);
				form_data.append('id', state.setup.id);
				form_data.append('password', state.password);
				/**
				 * @type {Success}
				 */
				const result = await api.post('setup_update_name', form_data);
				spinner_div.classList.add('d-none');
				state.setup = result.setup;
				render();
			},
			content: [
				n({
					class: 'm-2 flex-grow-1',
					content: [
						n({
							tag: 'input',
							class: 'form-control',
							value: state.setup.name ?? '',
							name: 'name',
							placeholder: 'Name',
						}),
					],
				}),
				n({
					tag: 'button',
					class: 'm-2 btn btn-primary',
					type: 'submit',
					content: 'Submit',
				}),
				n({
					tag: 'button',
					class: 'm-2 btn btn-secondary',
					type: 'button',
					click: () => {
						element_list.forEach(element => element.classList.toggle('d-none'));
					},
					content: 'Cancel',
				}),
			],
		}),
	];
	name_block.append(...element_list);
}

function render_map() {
	map_block.innerHTML = '';
	const element_list = [
		n({
			class: 'flex-grow-1',
			content: [
				state.setup.map === null ? n({}) : n({
					tag: 'img',
					class: 'm-2',
					style: {
						maxWidth: '360px',
					},
					custom: element => {
						element.src = state.setup.map;
					},
				}),
			],
		}),
		state.setup.map === null ? n({
			tag: 'button',
			class: 'm-2 btn btn-secondary',
			type: 'button',
			click: () => {
				element_list.forEach(element => element.classList.toggle('d-none'));
			},
			content: 'Add',
		}) : n({
			tag: 'button',
			class: 'm-2 btn btn-danger',
			type: 'button',
			click: async () => {
				if (!spinner_div.classList.contains('d-none'))
					return;
				spinner_div.classList.remove('d-none');
				if (!confirm('Delete map?')) {
					spinner_div.classList.add('d-none');
					return;
				}
				const form_data = new FormData();
				form_data.append('id', state.setup.id);
				form_data.append('password', state.password);
				/**
				 * @type {Success}
				 */
				const result = await api.post('setup_delete_map', form_data);
				spinner_div.classList.add('d-none');
				state.setup = result.setup;
				render();
			},
			content: 'Delete',
		}),
		n({
			tag: 'form',
			class: 'd-none flex-grow-1 d-flex flex-row align-items-center',
			submit: async event => {
				event.preventDefault();
				if (!spinner_div.classList.contains('d-none'))
					return;
				spinner_div.classList.remove('d-none');
				const form_data = new FormData(event.currentTarget);
				form_data.append('id', state.setup.id);
				form_data.append('password', state.password);
				const file = form_data.get('map');
				const size_limit_kb = 256;
				if (file.size > size_limit_kb * 1024) {
					alert(`File size should not exceed ${size_limit_kb} KB.`);
					spinner_div.classList.add('d-none');
					return;
				}
				/**
				 * @type {Success}
				 */
				const result = await api.post('setup_insert_map', form_data);
				spinner_div.classList.add('d-none');
				state.setup = result.setup;
				render();
			},
			content: [
				n({
					class: 'm-2 flex-grow-1',
					content: [
						n({
							tag: 'input',
							class: 'form-control',
							name: 'map',
							required: true,
							type: 'file',
							custom: element => {
								element.accept = 'image/*';
							},
						}),
					],
				}),
				n({
					tag: 'button',
					class: 'm-2 btn btn-primary',
					type: 'submit',
					content: 'Submit',
				}),
				n({
					tag: 'button',
					class: 'm-2 btn btn-secondary',
					type: 'button',
					click: () => {
						element_list.forEach(element => element.classList.toggle('d-none'));
					},
					content: 'Cancel',
				}),
			],
		}),
	];
	map_block.append(...element_list);
}

/**
 * @type {HTMLDivElement}
 */
const spinner_div = document.getElementById('spinner-div');

/**
 * @type {HTMLFormElement}
 */
const login_form = document.getElementById('login-form');

login_form.addEventListener('submit', async event => {
	event.preventDefault();
	if (!spinner_div.classList.contains('d-none'))
		return;
	spinner_div.classList.remove('d-none');
	const form_data = new FormData(event.currentTarget);
	/**
	 * @type {Success|string}
	 */
	const result = await api.post('setup_login', form_data);
	if (typeof(result) === 'string') {
		if (result !== 'password')
			alert('Identifier is not found.');
		else
			alert('Password is wrong.')
		spinner_div.classList.add('d-none');
		return;
	}
	spinner_div.classList.add('d-none');
	login_form.reset();
	localStorage.setItem('id', form_data.get('id'));
	localStorage.setItem('password', form_data.get('password'));
	state = {
		setup: result.setup,
		password: form_data.get('password'),
	};
	render();
});

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
	if (!spinner_div.classList.contains('d-none'))
		return;
	spinner_div.classList.remove('d-none');
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
		spinner_div.classList.add('d-none');
		spellcheck_input.focus();
		return;
	}
	const form_data = new FormData(event.currentTarget);
	/**
	 * @type {Success|null}
	 */
	const result = await api.post('setup_register', form_data);
	if (result === null) {
		alert('Identifier is not available.');
		spinner_div.classList.add('d-none');
		return;
	}
	spinner_div.classList.add('d-none');
	register_form.reset();
	localStorage.setItem('id', form_data.get('id'));
	localStorage.setItem('password', form_data.get('password'));
	state = {
		setup: result.setup,
		password: form_data.get('password'),
	};
	render();
});

document.getElementById('login-button').addEventListener('click', () => {
	register_form.classList.add('d-none');
	login_form.classList.remove('d-none');
});

/**
 * @type {HTMLDivElement}
 */
const main_div = document.getElementById('main-div');

/**
 * @type {HTMLSpanElement}
 */
const id_block = document.getElementById('id-block');

/**
 * @type {HTMLDivElement}
 */
const name_block = document.getElementById('name-block');

/**
 * @type {HTMLDivElement}
 */
const map_block = document.getElementById('map-block');

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
	 * @type {Success|string}
	 */
	const result = await api.post('setup_login', form_data);
	if (typeof(result) === 'string') {
		render();
		return;
	}
	state = {
		setup: result.setup,
		password: password,
	};
	render();
})();

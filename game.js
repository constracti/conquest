import { api } from './common.js';
import { n, n_option_list } from './element.js';

/**
 * @typedef Game
 * @type {object}
 * @property {string} id
 * @property {?string} name
 * @property {?string} map
 */

/**
 * @typedef Polygon
 * @type {object}
 * @property {number} id
 * @property {string} name
 * @property {?string} content
 */

/**
 * @typedef Station
 * @type {object}
 * @property {number} id
 * @property {string} name
 * @property {string} code
 * @property {number} capacity
 * @property {?number} polygon
 */

/**
 * @typedef Login
 * @type {object}
 * @property {Game} game
 * @property {Polygon[]} polygon_list
 * @property {Station[]} station_list
 */

/**
 * @typedef State
 * @type {object}
 * @property {Game} game
 * @property {Polygon[]} polygon_list
 * @property {Station[]} station_list
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
	id_block.innerHTML = `<code>${state.game.id}</code>`;
	render_name();
	render_map();
	render_polygon();
	render_station();
}

function render_name() {
	name_block.innerHTML = '';
	const element_list = [
		n({
			class: 'm-1 flex-grow-1',
			content: state.game.name,
		}),
		n({
			tag: 'button',
			class: 'm-1 btn btn-secondary btn-sm',
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
				form_data.append('id', state.game.id);
				form_data.append('password', state.password);
				/**
				 * @type {Game}
				 */
				const result = await api.post('game_update_name', form_data);
				state.game = result;
				spinner_div.classList.add('d-none');
				render();
			},
			content: [
				n({
					class: 'm-1 flex-grow-1',
					content: [
						n({
							tag: 'input',
							class: 'form-control form-control-sm',
							value: state.game.name ?? '',
							name: 'name',
							placeholder: 'Name',
						}),
					],
				}),
				n({
					tag: 'button',
					class: 'm-1 btn btn-primary btn-sm',
					type: 'submit',
					content: 'Submit',
				}),
				n({
					tag: 'button',
					class: 'm-1 btn btn-secondary btn-sm',
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
				state.game.map === null ? n({}) : n({
					tag: 'img',
					class: 'm-1 rounded',
					style: {
						maxHeight: '60px',
					},
					custom: element => {
						element.src = state.game.map;
					},
				}),
			],
		}),
		state.game.map === null ? n({
			tag: 'button',
			class: 'm-1 btn btn-secondary btn-sm',
			type: 'button',
			click: () => {
				element_list.forEach(element => element.classList.toggle('d-none'));
			},
			content: 'Add',
		}) : n({
			tag: 'button',
			class: 'm-1 btn btn-danger btn-sm',
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
				form_data.append('id', state.game.id);
				form_data.append('password', state.password);
				/**
				 * @type {Game}
				 */
				const result = await api.post('game_delete_map', form_data);
				state.game = result;
				spinner_div.classList.add('d-none');
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
				form_data.append('id', state.game.id);
				form_data.append('password', state.password);
				const file = form_data.get('map');
				const size_limit_kb = 256;
				if (file.size > size_limit_kb * 1024) {
					alert(`File size should not exceed ${size_limit_kb} KB.`);
					spinner_div.classList.add('d-none');
					return;
				}
				/**
				 * @type {Game}
				 */
				const result = await api.post('game_insert_map', form_data);
				state.game = result;
				spinner_div.classList.add('d-none');
				render();
			},
			content: [
				n({
					class: 'm-1 flex-grow-1',
					content: [
						n({
							tag: 'input',
							class: 'form-control form-control-sm',
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
					class: 'm-1 btn btn-primary btn-sm',
					type: 'submit',
					content: 'Submit',
				}),
				n({
					tag: 'button',
					class: 'm-1 btn btn-secondary btn-sm',
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
 * @param {Polygon[]} polygon_list
 * @param {?number} polygon_id
 * @returns {SVGSVGElement}
 */
function svg_new(polygon_list, polygon_id) {
	const svg_svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg_svg.classList.add('position-absolute');
	svg_svg.setAttribute('viewBox', '0 0 100 100');
	svg_svg.setAttribute('width', '100%');
	svg_svg.setAttribute('height', '100%');
	svg_svg.setAttribute('preserveAspectRatio', 'none');
	svg_svg.style.top = '0';
	svg_svg.style.left = '0';
	polygon_list.forEach(polygon => {
		const svg_polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
		if (polygon.id === polygon_id)
			svg_polygon.classList.add('polygon-old');
		else
			svg_polygon.classList.add('polygon-other');
		svg_svg.append(svg_polygon);
		(polygon.content ?? '').split(' ').forEach(pair => {
			const number_list = pair.split(',').map(parseFloat);
			if (number_list.length !== 2)
				return;
			const svg_point = svg_svg.createSVGPoint();
			svg_point.x = number_list[0] * 100;
			svg_point.y = number_list[1] * 100;
			svg_point.z = 0;
			svg_point.w = 0;
			svg_polygon.points.appendItem(svg_point);
		});
	});
	return svg_svg;
}

/**
 * @param {SVGSVGElement} svg_svg
 * @param {HTMLInputElement} content_input
 */
function svg_draw(svg_svg, content_input) {
	const svg_polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
	svg_polygon.classList.add('polygon-new');
	svg_svg.append(svg_polygon);
	/**
	 * @type {SVGPoint[]}
	 */
	const point_list = [];
	function point_list_load() {
		(content_input.value ?? '').split(' ').forEach(pair => {
			const number_list = pair.split(',').map(parseFloat);
			if (number_list.length !== 2)
				return;
			point_list_add(number_list[0], number_list[1]);
		});
	}
	function point_list_save() {
		content_input.value = point_list.map(point => `${(point.x/100).toFixed(4)},${(point.y/100).toFixed(4)}`).join(' ');
	}
	/**
	 * @param {number} x
	 * @param {number} y
	 */
	function point_list_add(x, y) {
		// polygon
		const svg_point = svg_svg.createSVGPoint();
		svg_point.x = x * 100;
		svg_point.y = y * 100;
		svg_point.z = 0;
		svg_point.w = 0;
		svg_polygon.points.appendItem(svg_point);
		// list
		point_list.push(svg_point);
		// circle
		const div_circle = document.createElement('div');
		div_circle.classList.add(
			'position-absolute',
			'translate-middle',
			'p-1',
			'bg-primary-subtle',
			'border', 'border-primary-subtle', 'border-3', 'rounded-circle',
		);
		div_circle.style.top = (y * 100).toFixed(2) + '%';
		div_circle.style.left = (x * 100).toFixed(2) + '%';
		svg_svg.parentElement.append(div_circle);
		div_circle.addEventListener('dblclick', () => {
			div_circle.remove();
			const index = point_list.indexOf(svg_point);
			svg_polygon.points.removeItem(index);
			point_list.splice(index, 1);
			point_list_save();
		});
	}
	point_list_load();
	svg_svg.addEventListener('click', event => {
		const x = event.offsetX / svg_svg.clientWidth;
		const y = event.offsetY / svg_svg.clientHeight;
		point_list_add(x, y);
		point_list_save();
	});
}

/**
 * @param {Polygon} polygon
 * @param {string} size
 * @returns {SVGSVGElement}
 */
function svg_one(polygon, size) {
	const svg_svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg_svg.classList.add('m-1', 'border');
	svg_svg.setAttribute('viewBox', '0 0 100 100');
	svg_svg.setAttribute('width', size);
	svg_svg.setAttribute('height', size);
	const svg_polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
	svg_polygon.classList.add('polygon-one');
	svg_svg.append(svg_polygon);
	(polygon.content ?? '').split(' ').forEach(pair => {
		const number_list = pair.split(',').map(parseFloat);
		if (number_list.length !== 2)
			return;
		const svg_point = svg_svg.createSVGPoint();
		svg_point.x = number_list[0] * 100;
		svg_point.y = number_list[1] * 100;
		svg_point.z = 0;
		svg_point.w = 0;
		svg_polygon.points.appendItem(svg_point);
	});
	return svg_svg;
}

function render_polygon() {
	polygon_list.innerHTML = '';
	state.polygon_list.forEach(polygon => {
		/**
		 * @type {HTMLDivElement}
		 */
		const map_div = n({
			class: 'm-1 position-relative',
		});
		/**
		 * @type {HTMLInputElement}
		 */
		const content_input = n({
			tag: 'input',
			value: polygon.content ?? '',
			type: 'hidden',
			name: 'content',
		});
		/**
		 * @type {HTMLFormElement}
		 */
		const form = n({
			tag: 'form',
			class: 'flex-grow-1 d-flex flex-column d-none',
			submit: async event => {
				event.preventDefault();
				if (!spinner_div.classList.contains('d-none'))
					return;
				spinner_div.classList.remove('d-none');
				const form_data = new FormData(event.currentTarget);
				form_data.append('game', state.game.id);
				form_data.append('password', state.password);
				form_data.append('id', polygon.id.toFixed());
				/**
				 * @type {Polygon[]}
				 */
				const result = await api.post('polygon_update', form_data);
				state.polygon_list = result;
				spinner_div.classList.add('d-none');
				render();
			},
			content: [
				map_div,
				n({
					class: 'd-flex flex-row',
					content: [
						n({
							class: 'm-1 flex-grow-1',
							content: [
								n({
									tag: 'input',
									class: 'form-control form-control-sm',
									value: polygon.name,
									name: 'name',
									placeholder: 'Name',
									required: true,
								}),
							],
						}),
						content_input,
						n({
							tag: 'button',
							class: 'm-1 btn btn-primary btn-sm',
							type: 'submit',
							content: 'Submit',
						}),
						n({
							tag: 'button',
							class: 'm-1 btn btn-secondary btn-sm',
							type: 'button',
							click: () => {
								element_list.forEach(element => element.classList.toggle('d-none'));
								map_div.innerHTML = '';
							},
							content: 'Cancel',
						}),
					],
				}),
			],
		});
		const element_list = [
			n({
				class: 'm-1 flex-grow-1',
				content: polygon.name,
			}),
			svg_one(polygon, '60px'),
			n({
				tag: 'button',
				class: 'm-1 btn btn-secondary btn-sm',
				type: 'button',
				click: () => {
					element_list.forEach(element => element.classList.toggle('d-none'));
					map_div.innerHTML = '';
					if (state.game.map !== null) {
						map_div.append(n({
							tag: 'img',
							class: 'w-100',
							custom: element => {
								element.src = state.game.map;
							},
						}));
					} else {
						map_div.append(n({
							class: 'w-100 ratio ratio-1x1',
						}));
					}
					const svg_svg = svg_new(state.polygon_list, polygon.id);
					map_div.append(svg_svg);
					svg_draw(svg_svg, content_input);
				},
				content: 'Edit',
			}),
			n({
				class: 'm-1 btn btn-danger btn-sm',
				click: async () => {
					if (!spinner_div.classList.contains('d-none'))
						return;
					spinner_div.classList.remove('d-none');
					if (!confirm(`Delete polygon ${polygon.name}?`)) {
						spinner_div.classList.add('d-none');
						return;
					}
					const form_data = new FormData();
					form_data.append('game', state.game.id);
					form_data.append('password', state.password);
					form_data.append('id', polygon.id.toFixed());
					/**
					 * @type {Polygon[]}
					 */
					const result = await api.post('polygon_delete', form_data);
					state.polygon_list = result;
					spinner_div.classList.add('d-none');
					render();
				},
				content: 'Delete',
			}),
			form,
		];
		polygon_list.append(n({
			class: 'list-group-item d-flex flex-row align-items-center p-1',
			content: element_list,
		}));
	});
	(() => {
		/**
		 * @type {HTMLDivElement}
		 */
		const map_div = n({
			class: 'm-1 position-relative',
		});
		/**
		 * @type {HTMLInputElement}
		 */
		const content_input = n({
			tag: 'input',
			type: 'hidden',
			name: 'content',
		});
		/**
		 * @type {HTMLFormElement}
		 */
		const form = n({
			tag: 'form',
			class: 'flex-grow-1 d-flex flex-column d-none',
			submit: async event => {
				event.preventDefault();
				if (!spinner_div.classList.contains('d-none'))
					return;
				spinner_div.classList.remove('d-none');
				const form_data = new FormData(event.currentTarget);
				form_data.append('game', state.game.id);
				form_data.append('password', state.password);
				/**
				 * @type {Polygon[]}
				 */
				const result = await api.post('polygon_insert', form_data);
				state.polygon_list = result;
				spinner_div.classList.add('d-none');
				render();
			},
			content: [
				map_div,
				n({
					class: 'd-flex flex-row',
					content: [
						n({
							class: 'm-1 flex-grow-1',
							content: [
								n({
									tag: 'input',
									class: 'form-control form-control-sm',
									name: 'name',
									placeholder: 'Name',
									required: true,
								}),
							],
						}),
						content_input,
						n({
							tag: 'button',
							class: 'm-1 btn btn-primary btn-sm',
							type: 'submit',
							content: 'Submit',
						}),
						n({
							tag: 'button',
							class: 'm-1 btn btn-secondary btn-sm',
							type: 'button',
							click: () => {
								element_list.forEach(element => element.classList.toggle('d-none'));
								map_div.innerHTML = '';
							},
							content: 'Cancel',
						}),
					],
				}),
			],
		});
		const element_list = [
			n({
				class: 'flex-grow-1',
			}),
			n({
				tag: 'button',
				class: 'm-1 btn btn-secondary btn-sm',
				type: 'button',
				click: () => {
					element_list.forEach(element => element.classList.toggle('d-none'));
					map_div.innerHTML = '';
					if (state.game.map !== null) {
						map_div.append(n({
							tag: 'img',
							class: 'w-100',
							custom: element => {
								element.src = state.game.map;
							},
						}));
					} else {
						map_div.append(n({
							class: 'w-100 ratio ratio-1x1',
						}));
					}
					const svg_svg = svg_new(state.polygon_list, null);
					map_div.append(svg_svg);
					svg_draw(svg_svg, content_input);
				},
				content: 'Add',
			}),
			form,
		];
		polygon_list.append(n({
			class: 'list-group-item d-flex flex-row p-1',
			content: element_list,
		}));
	})();
}

function render_station() {
	const polygon_set = new Set(state.station_list.map(station => station.polygon).filter(polygon => polygon !== null));
	const polygon_map = new Map(state.polygon_list.map(polygon => [polygon.id, polygon]));
	/**
	 * @param {?Station} station
	 * @returns {HTMLElement[]}
	 */
	function row(station) {
		/**
		 * @type {HTMLElement[]}
		 */
		const element_list = [];
		element_list.push(n({
			class: 'm-1 flex-grow-1',
			content: station?.name,
		}));
		if (station !== null) {
			element_list.push(n({
				tag: 'code',
				class: 'm-1',
				content: station.code,
			}));
			element_list.push(n({
				class: 'm-1',
				content: `Capacity: ${station.capacity.toFixed()}`,
			}));
			element_list.push(n({
				class: 'm-1 badge text-bg-info',
				content: station.polygon !== null ? polygon_map.get(station.polygon).name : '-',
			}));
		}
		// add or edit
		element_list.push(n({
			tag: 'button',
			class: 'm-1 btn btn-secondary btn-sm',
			click: () => {
				element_list.forEach(element => element.classList.toggle('d-none'));
			},
			content: station !== null ? 'Edit' : 'Add',
		}));
		// delete
		if (station !== null) {
			element_list.push(n({
				tag: 'button',
				class: 'm-1 btn btn-danger btn-sm',
				click: async () => {
					if (!spinner_div.classList.contains('d-none'))
						return;
					spinner_div.classList.remove('d-none');
					if (!confirm(`Delete station ${station.name}?`)) {
						spinner_div.classList.add('d-none');
						return;
					}
					const form_data = new FormData();
					form_data.append('game', state.game.id);
					form_data.append('password', state.password);
					form_data.append('id', station.id.toFixed());
					/**
					 * @type {Station[]}
					 */
					const result = await api.post('station2_delete', form_data);
					state.station_list = result;
					spinner_div.classList.add('d-none');
					render();
				},
				content: 'Delete',
			}));
		}
		// form
		element_list.push(n({
			tag: 'form',
			class: 'flex-grow-1 d-flex flex-row d-none',
			submit: async event => {
				event.preventDefault();
				if (!spinner_div.classList.contains('d-none'))
					return;
				spinner_div.classList.remove('d-none');
				const form_data = new FormData(event.currentTarget);
				form_data.append('game', state.game.id);
				form_data.append('password', state.password);
				/**
				 * @type {Station[]}
				 */
				const result = await api.post(station !== null ? 'station2_update' : 'station2_insert', form_data);
				state.station_list = result;
				spinner_div.classList.add('d-none');
				render();
			},
			content: [
				n({
					tag: 'input',
					value: station?.id?.toFixed(),
					name: 'id',
					type: 'hidden',
				}),
				n({
					class: 'm-1 flex-grow-1',
					content: [
						n({
							tag: 'input',
							class: 'form-control form-control-sm',
							value: station?.name,
							name: 'name',
							placeholder: 'Name',
							required: true,
						}),
					],
				}),
				n({
					class: 'm-1 flex-grow-1',
					content: [
						n({
							tag: 'input',
							class: 'form-control form-control-sm',
							value: station?.code,
							name: 'code',
							placeholder: 'Code',
							required: true,
						}),
					],
				}),
				n({
					class: 'm-1 flex-grow-1',
					content: [
						n({
							tag: 'input',
							class: 'form-control form-control-sm',
							value: station?.capacity?.toFixed() ?? '1',
							name: 'capacity',
							placeholder: 'Capacity',
							required: true,
							type: 'number',
							custom: element => {
								element.min = '1';
							},
						}),
					],
				}),
				n({
					class: 'm-1 flex-grow-1',
					content: [
						n({
							tag: 'select',
							class: 'form-select form-select-sm',
							value: station?.polygon?.toFixed(),
							name: 'polygon',
							content: n_option_list(state.polygon_list.filter(polygon => !polygon_set.has(polygon.id) || polygon.id === station?.polygon), '(Polygon)'),
						}),
					],
				}),
				n({
					tag: 'button',
					class: 'm-1 btn btn-primary btn-sm',
					type: 'submit',
					content: 'Submit',
				}),
				n({
					tag: 'button',
					class: 'm-1 btn btn-secondary btn-sm',
					type: 'button',
					click: () => {
						element_list.forEach(element => element.classList.toggle('d-none'));
					},
					content: 'Cancel',
				}),
			],
		}));
		// return
		return n({
			class: 'list-group-item d-flex flex-row align-items-center p-1',
			content: element_list,
		});
	}
	station_list.innerHTML = '';
	state.station_list.forEach(station => {
		station_list.append(row(station));
	});
	(() => {
		station_list.append(row(null));
	})();
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
	 * @type {Login|string}
	 */
	const result = await api.post('game_login', form_data);
	if (typeof(result) === 'string') {
		if (result !== 'password')
			alert('Identifier is not found.');
		else
			alert('Password is wrong.')
		spinner_div.classList.add('d-none');
		return;
	}
	login_form.reset();
	localStorage.setItem('id', form_data.get('id'));
	localStorage.setItem('password', form_data.get('password'));
	state = {
		game: result.game,
		polygon_list: result.polygon_list,
		station_list: result.station_list,
		password: form_data.get('password'),
	};
	spinner_div.classList.add('d-none');
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
	 * @type {Login|null}
	 */
	const result = await api.post('game_register', form_data);
	if (result === null) {
		alert('Identifier is not available.');
		spinner_div.classList.add('d-none');
		return;
	}
	register_form.reset();
	localStorage.setItem('id', form_data.get('id'));
	localStorage.setItem('password', form_data.get('password'));
	state = {
		game: result.game,
		polygon_list: result.polygon_list,
		station_list: result.station_list,
		password: form_data.get('password'),
	};
	spinner_div.classList.add('d-none');
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

document.getElementById('logout-button').addEventListener('click', () => {
	localStorage.removeItem('id');
	localStorage.removeItem('password');
	state = null;
	render();
});

/**
 * @type {HTMLDivElement}
 */
const name_block = document.getElementById('name-block');

/**
 * @type {HTMLDivElement}
 */
const map_block = document.getElementById('map-block');

/**
 * @type {HTMLButtonElement}
 */
const polygon_toggle = document.getElementById('polygon-toggle');
polygon_toggle.addEventListener('click', () => {
	polygon_list.classList.toggle('d-none');
	[polygon_toggle.innerHTML, polygon_toggle.dataset.toggle] = [polygon_toggle.dataset.toggle, polygon_toggle.innerHTML];
});

/**
 * @type {HTMLDivElement}
 */
const polygon_list = document.getElementById('polygon-list');

/**
 * @type {HTMLButtonElement}
 */
const station_toggle = document.getElementById('station-toggle');
station_toggle.addEventListener('click', () => {
	station_list.classList.toggle('d-none');
	[station_toggle.innerHTML, station_toggle.dataset.toggle] = [station_toggle.dataset.toggle, station_toggle.innerHTML];
});

/**
 * @type {HTMLDivElement}
 */
const station_list = document.getElementById('station-list');

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
	 * @type {Login|string}
	 */
	const result = await api.post('game_login', form_data);
	if (typeof(result) === 'string') {
		render();
		return;
	}
	state = {
		game: result.game,
		polygon_list: result.polygon_list,
		station_list: result.station_list,
		password: password,
	};
	render();
})();

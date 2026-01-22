import { api } from './common.js';
import { n, n_option_list, n_form_hidden, n_form_control, n_form_submit, n_form_cancel } from './element.js';

/**
 * @typedef Game
 * @type {object}
 * @property {number} id
 * @property {string} name
 * @property {?string} title
 * @property {string} game_start
 * @property {string} game_stop
 * @property {number} reward_success
 * @property {number} reward_conquest
 * @property {number} reward_rate
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
 * @typedef Team
 * @type {object}
 * @property {number} id
 * @property {string} name
 * @property {string} background_color
 * @property {string} text_color
 */

/**
 * @typedef Player
 * @type {object}
 * @property {number} id
 * @property {string} name
 * @property {string} mark
 * @property {?number} team
 */

/**
 * @typedef Login
 * @type {object}
 * @property {Game} game
 * @property {Polygon[]} polygon_list
 * @property {Station[]} station_list
 * @property {Team[]} team_list
 * @property {Player[]} player_list
 */

/**
 * @typedef State
 * @type {object}
 * @property {Game} game
 * @property {Polygon[]} polygon_list
 * @property {Station[]} station_list
 * @property {Team[]} team_list
 * @property {Player[]} player_list
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
	name_block.innerHTML = `<code>${state.game.name}</code>`;
	render_game();
	render_map();
	render_polygon();
	render_station();
	render_team();
	render_player();
}

function render_game() {
	title_input.value = state.game.title ?? '';
	game_start_input.value = state.game.game_start;
	game_start_input.dispatchEvent(new Event('change'));
	game_stop_input.value = state.game.game_stop;
	game_stop_input.dispatchEvent(new Event('change'));
	reward_success_input.value = state.game.reward_success.toFixed();
	reward_conquest_input.value = state.game.reward_conquest.toFixed();
	reward_rate_input.value = state.game.reward_rate.toString();
	reward_rate_input.dispatchEvent(new Event('change'));
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
				form_data.append('id', state.game.id.toFixed());
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
				form_data.append('id', state.game.id.toFixed());
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
	const station_count_map_by_polygon = new Map(state.polygon_list.map(polygon => [polygon.id, 0]));
	state.station_list.forEach(station => {
		if (station.polygon !== null)
			station_count_map_by_polygon.set(station.polygon, station_count_map_by_polygon.get(station.polygon) + 1);
	});
	/**
	 * @param {?Polygon} polygon
	 * @returns {HTMLDivElement}
	 */
	function row(polygon) {
		/**
		 * @type {HTMLElement[]}
		 */
		const element_list = [];
		// fields
		element_list.push(n({
			class: 'm-1 flex-grow-1',
			content: polygon?.name,
		}));
		if (polygon !== null) {
			element_list.push(svg_one(polygon, '60px'));
		}
		// add or edit
		element_list.push(n({
			tag: 'button',
			class: 'm-1 btn btn-secondary btn-sm',
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
				const svg_svg = svg_new(state.polygon_list, polygon?.id ?? null);
				map_div.append(svg_svg);
				svg_draw(svg_svg, content_input);
			},
			content: polygon !== null ? 'Edit' : 'Add',
		}));
		// delete
		if (polygon !== null) {
			element_list.push(n({
				tag: 'button',
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
					form_data.append('game', state.game.id.toFixed());
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
				custom: element => {
					element.disabled = station_count_map_by_polygon.get(polygon.id) !== 0;
				},
			}));
		}
		// form
		const prefix = `polygon-${(polygon?.id ?? 0).toFixed()}-`;
		/**
		 * @type {HTMLDivElement}
		 */
		const map_div = n({
			class: 'm-1 position-relative',
		});
		const content_input = n_form_hidden('content', polygon?.content);
		element_list.push(n({
			tag: 'form',
			class: 'flex-grow-1 d-flex flex-column d-none',
			submit: async event => {
				event.preventDefault();
				if (!spinner_div.classList.contains('d-none'))
					return;
				spinner_div.classList.remove('d-none');
				const form_data = new FormData(event.currentTarget);
				form_data.append('game', state.game.id.toFixed());
				form_data.append('password', state.password);
				/**
				 * @type {Polygon[]}
				 */
				const result = await api.post(polygon !== null ? 'polygon_update' : 'polygon_insert', form_data);
				state.polygon_list = result;
				spinner_div.classList.add('d-none');
				render();
			},
			content: [
				map_div,
				n({
					class: 'mx-1 mt-0 mb-1 form-text',
					content: 'Click on the map to append a point. Double click on a point to remove it.',
				}),
				n({
					class: 'd-flex flex-row',
					content: [
						n_form_hidden('id', polygon?.id?.toFixed()),
						n_form_control({
							id: prefix + 'name',
							label: 'Name',
							name: 'name',
							value: polygon?.name,
							required: true,
						}),
						content_input,
						n_form_submit(),
						n_form_cancel(element_list),
					],
				}),
			],
		}));
		// return
		return n({
			class: 'list-group-item d-flex flex-row align-items-center p-1',
			content: element_list,
		});
	}
	polygon_list.innerHTML = '';
	state.polygon_list.forEach(polygon => {
		polygon_list.append(row(polygon));
	});
	polygon_list.append(row(null));
}

function render_station() {
	const polygon_set = new Set(state.station_list.map(station => station.polygon).filter(polygon => polygon !== null));
	const polygon_map = new Map(state.polygon_list.map(polygon => [polygon.id, polygon]));
	/**
	 * @param {?Station} station
	 * @returns {HTMLDivElement}
	 */
	function row(station) {
		/**
		 * @type {HTMLElement[]}
		 */
		const element_list = [];
		// fields
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
					form_data.append('game', state.game.id.toFixed());
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
		const prefix = `station-${(station?.id ?? 0).toFixed()}-`;
		element_list.push(n({
			tag: 'form',
			class: 'flex-grow-1 d-flex flex-row d-none',
			submit: async event => {
				event.preventDefault();
				if (!spinner_div.classList.contains('d-none'))
					return;
				spinner_div.classList.remove('d-none');
				const form_data = new FormData(event.currentTarget);
				form_data.append('game', state.game.id.toFixed());
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
				n_form_hidden('id', station?.id?.toFixed()),
				n_form_control({
					id: prefix + 'name',
					label: 'Name',
					name: 'name',
					value: station?.name,
					required: true,
				}),
				n_form_control({
					id: prefix + 'code',
					label: 'Code',
					name: 'code',
					value: station?.code,
					required: true,
					text: 'A password used to submit successes.',
				}),
				n_form_control({
					type: 'number',
					id: prefix + 'capacity',
					label: 'Capacity',
					name: 'capacity',
					min: '1',
					value: station?.capacity?.toFixed() ?? '1',
					required: true,
				}),
				n_form_control({
					type: 'select',
					id: prefix + 'polygon',
					label: 'Polygon',
					name: 'polygon',
					option_list: n_option_list(state.polygon_list.filter(polygon => !polygon_set.has(polygon.id) || polygon.id === station?.polygon), '-'),
					value: station?.polygon?.toFixed(),
				}),
				n_form_submit(),
				n_form_cancel(element_list),
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

function render_team() {
	const player_count_map_by_team = new Map(state.team_list.map(team => [team.id, 0]));
	state.player_list.forEach(player => {
		if (player.team !== null)
			player_count_map_by_team.set(player.team, player_count_map_by_team.get(player.team) + 1);
	});
	/**
	 * @param {?Team} team
	 * @returns {HTMLDivElement}
	 */
	function row(team) {
		/**
		 * @type {HTMLElement[]}
		 */
		const element_list = [];
		// fields
		if (team !== null) {
			element_list.push(n({
				class: 'flex-grow-1',
				content: [
					n({
						class: 'badge border m-1',
						style: {
							backgroundColor: team.background_color,
							color: team.text_color,
						},
						content: team.name,
					}),
				],
			}));
		} else {
			element_list.push(n({
				class: 'm-1 flex-grow-1',
			}));
		}
		// add or edit
		element_list.push(n({
			tag: 'button',
			class: 'm-1 btn btn-secondary btn-sm',
			click: () => {
				element_list.forEach(element => element.classList.toggle('d-none'));
			},
			content: team !== null ? 'Edit' : 'Add',
		}));
		// delete
		if (team !== null) {
			element_list.push(n({
				tag: 'button',
				class: 'm-1 btn btn-danger btn-sm',
				click: async () => {
					if (!spinner_div.classList.contains('d-none'))
						return;
					spinner_div.classList.remove('d-none');
					if (!confirm(`Delete team ${team.name}?`)) {
						spinner_div.classList.add('d-none');
						return;
					}
					const form_data = new FormData();
					form_data.append('game', state.game.id.toFixed());
					form_data.append('password', state.password);
					form_data.append('id', team.id.toFixed());
					/**
					 * @type {Team[]}
					 */
					const result = await api.post('team2_delete', form_data);
					state.team_list = result;
					spinner_div.classList.add('d-none');
					render();
				},
				content: 'Delete',
				custom: element => {
					element.disabled = player_count_map_by_team.get(team.id) !== 0;
				},
			}));
		}
		// form
		const prefix = `team-${(team?.id ?? 0).toFixed()}-`;
		element_list.push(n({
			tag: 'form',
			class: 'flex-grow-1 d-flex flex-row d-none',
			submit: async event => {
				event.preventDefault();
				if (!spinner_div.classList.contains('d-none'))
					return;
				spinner_div.classList.remove('d-none');
				const form_data = new FormData(event.currentTarget);
				form_data.append('game', state.game.id.toFixed());
				form_data.append('password', state.password);
				/**
				 * @type {Team[]|null}
				 */
				const result = await api.post(team !== null ? 'team2_update' : 'team2_insert', form_data);
				if (result === null) {
					alert('Team name is not available.');
					spinner_div.classList.add('d-none');
					return;
				}
				state.team_list = result;
				spinner_div.classList.add('d-none');
				render();
			},
			content: [
				n_form_hidden('id', team?.id?.toFixed()),
				n_form_control({
					id: prefix + 'name',
					label: 'Name',
					name: 'name',
					value: team?.name,
					required: true,
					text: 'Name must be unique.',
				}),
				n_form_control({
					type: 'color',
					id: prefix + 'background-color',
					label: 'Background color',
					name: 'background_color',
					value: team?.background_color ?? '#ffffff',
					required: true,
				}),
				n_form_control({
					type: 'color',
					id: prefix + 'text-color',
					label: 'Text color',
					name: 'text_color',
					value: team?.text_color ?? '#000000',
					required: true,
				}),
				n_form_submit(),
				n_form_cancel(element_list),
			],
		}));
		// return
		return n({
			class: 'list-group-item d-flex flex-row align-items-center p-1',
			content: element_list,
		});
	}
	team_list.innerHTML = '';
	state.team_list.forEach(team => {
		team_list.append(row(team));
	});
	(() => {
		team_list.append(row(null));
	})();
}

function render_player() {
	const team_map = new Map(state.team_list.map(team => [team.id, team]));
	/**
	 * @param {?Player} player
	 * @returns {HTMLDivElement}
	 */
	function row(player) {
		/**
		 * @type {HTMLElement[]}
		 */
		const element_list = [];
		// fields
		if (player !== null) {
			element_list.push(
				n({
					tag: 'code',
					class: 'm-1',
					content: player.mark,
				}),
				n({
					class: 'm-1 flex-grow-1',
					content: player.name,
				}),
			);
			if (player.team !== null) {
				const team = team_map.get(player.team);
				element_list.push(n({
					class: 'badge border m-1',
					style: {
						backgroundColor: team.background_color,
						color: team.text_color,
					},
					content: team.name,
				}));
			}
		} else {
			element_list.push(n({
				class: 'm-1 flex-grow-1',
			}));
		}
		// add or edit
		element_list.push(n({
			tag: 'button',
			class: 'm-1 btn btn-secondary btn-sm',
			click: () => {
				element_list.forEach(element => element.classList.toggle('d-none'));
			},
			content: player !== null ? 'Edit' : 'Add',
		}));
		// delete
		if (player !== null) {
			element_list.push(n({
				tag: 'button',
				class: 'm-1 btn btn-danger btn-sm',
				click: async () => {
					if (!spinner_div.classList.contains('d-none'))
						return;
					spinner_div.classList.remove('d-none');
					if (!confirm(`Delete player ${player.name}?`)) {
						spinner_div.classList.add('d-none');
						return;
					}
					const form_data = new FormData();
					form_data.append('game', state.game.id.toFixed());
					form_data.append('password', state.password);
					form_data.append('id', player.id.toFixed());
					/**
					 * @type {Player[]}
					 */
					const result = await api.post('player2_delete', form_data);
					state.player_list = result;
					spinner_div.classList.add('d-none');
					render();
				},
				content: 'Delete',
			}));
		}
		// form
		const prefix = `player-${(player?.id ?? 0).toFixed()}-`;
		element_list.push(n({
			tag: 'form',
			class: 'flex-grow-1 d-flex flex-row d-none',
			submit: async event => {
				event.preventDefault();
				if (!spinner_div.classList.contains('d-none'))
					return;
				spinner_div.classList.remove('d-none');
				const form_data = new FormData(event.currentTarget);
				form_data.append('game', state.game.id.toFixed());
				form_data.append('password', state.password);
				/**
				 * @type {Player[]|null}
				 */
				const result = await api.post(player !== null ? 'player2_update' : 'player2_insert', form_data);
				if (result === null) {
					alert('Player mark is not available.');
					spinner_div.classList.add('d-none');
					return;
				}
				state.player_list = result;
				spinner_div.classList.add('d-none');
				render();
			},
			content: [
				n_form_hidden('id', player?.id?.toFixed()),
				n_form_control({
					id: prefix + 'name',
					label: 'Name',
					name: 'name',
					value: player?.name,
					required: true,
				}),
				n_form_control({
					id: prefix + 'mark',
					label: 'Mark',
					name: 'mark',
					value: player?.mark,
					required: true,
					text: 'A unique identifier.',
				}),
				n_form_control({
					type: 'select',
					id: prefix + 'team',
					label: 'Team',
					name: 'team',
					option_list: n_option_list(state.team_list, '-'),
					value: player?.team?.toFixed(),
				}),
				n_form_submit(),
				n_form_cancel(element_list),
			],
		}));
		return n({
			class: 'list-group-item d-flex flex-row align-items-center p-1',
			content: element_list,
		});
	}
	player_list.innerHTML = '';
	state.player_list.forEach(player => {
		player_list.append(row(player));
	});
	player_list.append(row(null));
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
			alert('Name is wrong.');
		else
			alert('Password is wrong.')
		spinner_div.classList.add('d-none');
		return;
	}
	login_form.reset();
	localStorage.setItem('name', form_data.get('name'));
	localStorage.setItem('password', form_data.get('password'));
	state = {
		game: result.game,
		polygon_list: result.polygon_list,
		station_list: result.station_list,
		team_list: result.team_list,
		player_list: result.player_list,
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
 * @type {HTMLInputElement}
 */
const register_start = document.getElementById('register-start');

/**
 * @type {HTMLInputElement}
 */
const register_stop = document.getElementById('register-stop');

register_start.addEventListener('change', () => {
	register_stop.min = register_start.value;
});

register_stop.addEventListener('change', () => {
	register_start.max = register_stop.value;
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
	localStorage.setItem('name', form_data.get('name'));
	localStorage.setItem('password', form_data.get('password'));
	state = {
		game: result.game,
		polygon_list: result.polygon_list,
		station_list: result.station_list,
		team_list: result.team_list,
		player_list: result.player_list,
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
const name_block = document.getElementById('name-block');

document.getElementById('logout-button').addEventListener('click', () => {
	localStorage.removeItem('id');
	localStorage.removeItem('password');
	state = null;
	render();
});

/**
 * @type {HTMLFormElement}
 */
const game_form = document.getElementById('game-form');

game_form.addEventListener('submit', async event => {
	event.preventDefault();
	if (!spinner_div.classList.contains('d-none'))
		return;
	spinner_div.classList.remove('d-none');
	const form_data = new FormData(event.currentTarget);
	form_data.append('id', state.game.id.toFixed());
	form_data.append('password', state.password);
	/**
	 * @type {Game}
	 */
	const result = await api.post('game_update', form_data);
	state.game = result;
	spinner_div.classList.add('d-none');
	render();
});

/**
 * @type {HTMLInputElement}
 */
const title_input = document.getElementById('title-input');

/**
 * @type {HTMLInputElement}
 */
const game_start_input = document.getElementById('game-start-input');

/**
 * @type {HTMLInputElement}
 */
const game_stop_input = document.getElementById('game-stop-input');

game_start_input.addEventListener('change', () => {
	game_stop_input.min = game_start_input.value;
});

game_stop_input.addEventListener('change', () => {
	game_start_input.max = game_stop_input.value;
});

/**
 * @type {HTMLInputElement}
 */
const reward_success_input = document.getElementById('reward-success-input');

/**
 * @type {HTMLInputElement}
 */
const reward_conquest_input = document.getElementById('reward-conquest-input');

/**
 * @type {HTMLInputElement}
 */
const reward_rate_input = document.getElementById('reward-rate-input');

/**
 * @type {HTMLSpanElement}
 */
const reward_rate_preview = document.getElementById('reward-rate-preview');

[game_start_input, game_stop_input, reward_rate_input].forEach(element => {
	element.addEventListener('change', () => {
		const game_start = Date.parse(game_start_input.value);
		const game_stop = Date.parse(game_stop_input.value);
		const game_duration_in_hours = (game_stop - game_start) / (60 * 60 * 1000);
		const reward_rate = parseFloat(reward_rate_input.value);
		const reward_rate_begin = 1;
		const reward_rate_end = reward_rate_begin + reward_rate * game_duration_in_hours;
		if (isNaN(reward_rate_end))
			return;
		reward_rate_preview.innerHTML = reward_rate_end.toFixed(2);
	});
});

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

/**
 * @type {HTMLButtonElement}
 */
const team_toggle = document.getElementById('team-toggle');
team_toggle.addEventListener('click', () => {
	team_list.classList.toggle('d-none');
	[team_toggle.innerHTML, team_toggle.dataset.toggle] = [team_toggle.dataset.toggle, team_toggle.innerHTML];
});

/**
 * @type {HTMLDivElement}
 */
const team_list = document.getElementById('team-list');

/**
 * @type {HTMLButtonElement}
 */
const player_toggle = document.getElementById('player-toggle');
player_toggle.addEventListener('click', () => {
	player_list.classList.toggle('d-none');
	[player_toggle.innerHTML, player_toggle.dataset.toggle] = [player_toggle.dataset.toggle, player_toggle.innerHTML];
});

/**
 * @type {HTMLDivElement}
 */
const player_list = document.getElementById('player-list');

/**
 * @type {HTMLButtonElement}
 */
const import_show = document.getElementById('import-show');
import_show.addEventListener('click', () => {
	import_modal.show();
});

/**
 * @type {HTMLDivElement}
 */
const import_div = document.getElementById('import-div');
import_div.addEventListener('shown.bs.modal', () => {
	import_textarea.focus();
});

const import_modal = new bootstrap.Modal(import_div, {
	backdrop: 'static',
	keyboard: false,
});

/**
 * @type {HTMLFormElement}
 */
const import_form = document.getElementById('import-form');
import_form.addEventListener('submit', async event => {
	event.preventDefault();
	if (!spinner_div.classList.contains('d-none'))
		return;
	spinner_div.classList.remove('d-none');
	if (!confirm('Delete all existing players and related successes?')) {
		spinner_div.classList.add('d-none');
		return;
	}
	const form_data = new FormData(event.currentTarget);
	form_data.append('game', state.game.id.toFixed());
	form_data.append('password', state.password);
	/**
	 * @type {Player[]|{error: string, line: number}}
	 */
	const result = await api.post('player2_import', form_data);
	if ('error' in result) {
		alert(`Error at line ${result.line.toFixed()}: ${result.error}`);
		spinner_div.classList.add('d-none');
		return;
	}
	state.player_list = result;
	spinner_div.classList.add('d-none');
	import_form.reset();
	import_modal.hide();
	if (player_list.classList.contains('d-none'))
		player_toggle.dispatchEvent(new Event('click'));
	render();
});

/**
 * @type {HTMLTextAreaElement}
 */
const import_textarea = document.getElementById('import-textarea');

/**
 * @type {HTMLButtonElement}
 */
const import_cancel = document.getElementById('import-cancel');
import_cancel.addEventListener('click', () => {
	import_modal.hide();
});

await (async () => {
	const name = localStorage.getItem('name');
	const password = localStorage.getItem('password');
	if (name === null || password === null) {
		render();
		return;
	}
	const form_data = new FormData();
	form_data.set('name', name);
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
		team_list: result.team_list,
		player_list: result.player_list,
		password: password,
	};
	render();
})();

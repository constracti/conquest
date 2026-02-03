import { api, attempt_type, human_duration, score_sign_list, team2_badge } from './common.js';
import { n, n_option_list2 } from './element.js';

/**
 * @typedef Game
 * @type {object}
 * @property {number} id
 * @property {string} name
 * @property {?string} title
 * @property {number} game_start
 * @property {string} game_start_js
 * @property {number} game_stop
 * @property {string} game_stop_js
 * @property {number} reward_success
 * @property {number} reward_conquest
 * @property {number} reward_rate
 * @property {?string} map
 */

/**
 * @typedef Station
 * @type {object}
 * @property {number} id
 * @property {string} name
 * @property {number} capacity
 * @property {boolean} score_sign
 * @property {?number} score_base
 * @property {?number} score_high
 */

/**
 * @typedef {import('./common.js').Team2} Team2
 */

/**
 * @typedef {import('./common.js').Player2} Player2
 */

/**
 * @typedef Attempt
 * @type {object}
 * @property {number} id
 * @property {number} station
 * @property {number} team
 * @property {number} score
 * @property {number} time
 */

/**
 * @type {{game: Game, station_map: Map<number, Station>}}
 */
const page = await (async () => {
	const search_params = new URLSearchParams(location.search);
	const game = search_params.get('game');
	if (game === null)
		throw new Error('game');
	const form_data = new FormData();
	form_data.append('game', game);
	/**
	 * @type {{game: Game, station_list: Station[]}}
	 */
	const result = await api.post('station2_list', form_data);
	/**
	 * @type {HTMLSelectElement}
	 */
	const station_select = document.getElementById('station-select');
	station_select.append(...n_option_list2(result.station_list));
	return {
		game: result.game,
		station_map: new Map(result.station_list.map(station => [station.id, station])),
	};
})();

const title = page.game.title ?? 'The Station War';
document.title = title;
Array.from(document.getElementsByTagName('h1')).forEach(h1 => {
	h1.innerHTML = title;
});

/**
 * @typedef Login
 * @type {object}
 * @property {Team2[]} team_list
 * @property {Player2[]} player_list
 * @property {Attempt[]} attempt_list
 */

/**
 * @typedef State
 * @type {object}
 * @property {Station} station
 * @property {string} code
 * @property {Map<number, Team2>} team_map
 * @property {Map<string, Player2>} player_map
 * @property {Attempt[]} attempt_list
 * @property {Player2[]} participant_list
 */

/**
 * @param {FormData} form_data
 * @param {Login} result
 * @returns {State}
 */
function state_create(form_data, result) {
	return {
		station: page.station_map.get(parseInt(form_data.get('station'))),
		code: form_data.get('code'),
		team_map: new Map(result.team_list.map(team => [team.id, team])),
		player_map: new Map(result.player_list.map(player => [player.mark, player])),
		attempt_list: result.attempt_list,
		participant_list: [],
	};
}

/**
 * @type {?State}
 */
let state = null;

function render() {
	if (state === null) {
		login_form.classList.remove('d-none');
		main_div.classList.add('d-none');
		return;
	}
	login_form.classList.add('d-none');
	main_div.classList.remove('d-none');
	name_heading.innerHTML = state.station.name;
	capacity_badge.innerHTML = `Capacity: ${state.station.capacity}`;
	score_sign_badge.innerHTML = score_sign_list[state.station.score_sign].name;
	score_base_badge.innerHTML = state.station.score_base !== null ? `Score base: ${state.station.score_base}` : '';
	score_high_badge.innerHTML = state.station.score_high !== null ? `Score high: ${state.station.score_high}` : '';
	if (state.participant_list.length === state.station.capacity)
		player_form.classList.add('d-none');
	else
		player_form.classList.remove('d-none');
	if (state.participant_list.length !== 0)
		player_list.classList.remove('d-none');
	else
		player_list.classList.add('d-none');
	player_list.innerHTML = '';
	player_list.append(...state.participant_list.map((player, index) => n({
		class: 'list-group-item p-1',
		content: [
			n({
				class: 'row m-0',
				content: [
					n({
						class: 'p-0 d-flex align-items-center col-4 col-md-2',
						content: [
							n({
								class: 'm-1',
								content: `<code>${player.mark}</code>`,
							}),
						],
					}),
					n({
						class: 'p-0 d-flex align-items-center col-8 col-md-5',
						content: [
							n({
								class: 'm-1',
								content: player.name,
							}),
						],
					}),
					n({
						class: 'p-0 d-flex align-items-center col-8 col-md-3',
						content: [
							team2_badge(state.team_map.get(player.team)),
						],
					}),
					n({
						class: 'p-0 col-4 col-md-2 text-end',
						content: [
							n({
								tag: 'button',
								class: 'm-1 btn btn-danger btn-sm',
								content: 'Remove',
								click: () => {
									state.participant_list.splice(index, 1);
									render();
								},
							}),
						],
					}),
				],
			}),
		],
	})));
	if (state.participant_list.length === state.station.capacity)
		attempt_form.classList.remove('d-none');
	else
		attempt_form.classList.add('d-none');
	attempt_list.innerHTML = '';
	/**
	 * @type {{conqueror: ?number, record: ?number}}
	 */
	const memory = {
		conqueror: null,
		record: null,
	};
	state.attempt_list.forEach(attempt => {
		const team = state.team_map.get(attempt.team);
		const type = attempt_type(state.station.score_sign, state.station.score_base, state.station.score_high, attempt.score, attempt.team, memory);
		attempt_list.prepend(n({
			class: 'list-group-item p-1',
			content: [
				n({
					class: 'row m-0',
					content: [
						n({
							class: 'p-0 d-flex align-items-center col-4 col-md-2',
							content: [
								n({
									class: 'm-1 badge text-bg-info',
									content: human_duration(attempt.time - page.game.game_start),
								}),
							],
						}),
						n({
							class: 'p-0 d-flex align-items-center col-8 col-md-5',
							content: [
								n({
									class: 'm-1',
									content: `${type} (<code>${attempt.score.toFixed()}</code>)`,
								})
							],
						}),
						n({
							class: 'p-0 d-flex align-items-center col-8 col-md-3',
							content: [
								team2_badge(team),
							],
						}),
						n({
							class: 'p-0 col-4 col-md-2 text-end',
							content: [
								n({
									tag: 'button',
									class: 'm-1 btn btn-danger btn-sm',
									content: 'Delete',
									click: async () => {
										if (!spinner_div.classList.contains('d-none'))
											return;
										spinner_div.classList.remove('d-none');
										if (!confirm('Delete?')) {
											spinner_div.classList.add('d-none');
											return;
										}
										const form_data = new FormData();
										form_data.append('game', page.game.name);
										form_data.append('station', state.station.id.toFixed());
										form_data.append('code', state.code);
										form_data.append('id', attempt.id.toFixed());
										/**
										 * @type {Login}
										 */
										const result = await api.post('attempt_delete', form_data);
										state = state_create(form_data, result);
										spinner_div.classList.add('d-none');
										render();
									},
								}),
							],
						}),
					],
				}),
			],
		}));
	});
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
	const form_data = new FormData(login_form);
	form_data.append('game', page.game.name);
	/**
	 * @type {Login|null}
	 */
	const result = await api.post('station2_login', form_data);
	if (result === null) {
		alert('Code is wrong.');
		spinner_div.classList.add('d-none');
		return;
	}
	login_form.reset();
	localStorage.setItem('game', form_data.get('game'));
	localStorage.setItem('station', form_data.get('station'));
	localStorage.setItem('code', form_data.get('code'));
	state = state_create(form_data, result);
	spinner_div.classList.add('d-none');
	render();
});

/**
 * @type {HTMLDivElement}
 */
const main_div = document.getElementById('main-div');

/**
 * @type {HTMLHeadingElement}
 */
const name_heading = document.getElementById('name-heading');

/**
 * @type {HTMLButtonElement}
 */
const logout_button = document.getElementById('logout-button');

/**
 * @type {HTMLDivElement}
 */
const capacity_badge = document.getElementById('capacity-badge');

/**
 * @type {HTMLDivElement}
 */
const score_sign_badge = document.getElementById('score-sign-badge');

/**
 * @type {HTMLDivElement}
 */
const score_base_badge = document.getElementById('score-base-badge');

/**
 * @type {HTMLDivElement}
 */
const score_high_badge = document.getElementById('score-high-badge');

logout_button.addEventListener('click', () => {
	localStorage.removeItem('game');
	localStorage.removeItem('station');
	localStorage.removeItem('code');
	state = null;
	render();
});

/**
 * @type {HTMLFormElement}
 */
const player_form = document.getElementById('player-form');

player_form.addEventListener('submit', event => {
	event.preventDefault();
	const form_data = new FormData(player_form);
	const mark = form_data.get('mark');
	const player = state.player_map.get(mark) ?? null;
	if (player === null) {
		alert('Player not found.');
		return;
	} else if (state.participant_list.some(p => p.id === player.id)) {
		alert('Player is already added.');
		return;
	} else if (state.participant_list.some(p => p.team !== player.team)) {
		alert('Player belongs to a different team.');
		return;
	}
	state.participant_list.push(player);
	player_form.reset();
	render();
});

/**
 * @type {HTMLDivElement}
 */
const player_list = document.getElementById('player-list');

/**
 * @type {HTMLFormElement}
 */
const attempt_form = document.getElementById('attempt-form');

attempt_form.addEventListener('submit', async event => {
	event.preventDefault();
	if (!spinner_div.classList.contains('d-none'))
		return;
	spinner_div.classList.remove('d-none');
	const form_data = new FormData(attempt_form);
	form_data.append('game', page.game.name);
	form_data.append('station', state.station.id.toFixed());
	form_data.append('code', state.code);
	form_data.append('participant_list', state.participant_list.map(player => player.id.toFixed()).join(','));
	/**
	 * @type {Login}
	 */
	const result = await api.post('attempt_insert', form_data);
	state = state_create(form_data, result);
	spinner_div.classList.add('d-none');
	attempt_form.reset();
	render();
});

/**
 * @type {HTMLDivElement}
 */
const attempt_list = document.getElementById('attempt-list');

await (async () => {
	const game = localStorage.getItem('game');
	if (game === null || game !== page.game.name) {
		spinner_div.classList.add('d-none');
		render();
		return;
	}
	const station = localStorage.getItem('station');
	if (station === null) {
		spinner_div.classList.add('d-none');
		render();
		return;
	}
	const code = localStorage.getItem('code');
	if (code === null) {
		spinner_div.classList.add('d-none');
		render();
		return;
	}
	const form_data = new FormData();
	form_data.append('game', game);
	form_data.append('station', station);
	form_data.append('code', code);
	/**
	 * @type {Login|null}
	 */
	const result = await api.post('station2_login', form_data);
	if (result === null) {
		spinner_div.classList.add('d-none');
		render();
		return;
	}
	state = state_create(form_data, result);
	spinner_div.classList.add('d-none');
	render();
})();

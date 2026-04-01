import { api, exit, human_duration, run_station, score_sign_list, team_badge, title_set } from './common.js';
import { n, n_option_list } from './element.js';

/**
 * @typedef {import('./common.js').Game} Game
 */

/**
 * @typedef {import('./common.js').Station} Station
 */

/**
 * @typedef {import('./common.js').Team} Team
 */

/**
 * @typedef {import('./common.js').Player} Player
 */

/**
 * @typedef {import('./common.js').Attempt} Attempt
 */

/**
 * @typedef {import('./common.js').Conqueror} Conqueror
 */

/**
 * @typedef HomeResult
 * @type {object}
 * @property {Game} game
 * @property {number} time
 * @property {Station[]} station_list
 */

/**
 * @typedef HomeState
 * @type {object}
 * @property {Game} game
 * @property {number} time_offset
 * @property {Map<number, Station>} station_map
 */

/**
 * @typedef LoginResult
 * @type {object}
 * @property {Game} game
 * @property {number} time
 * @property {Station[]} station_list
 * @property {Team[]} team_list
 * @property {Player[]} player_list
 * @property {Attempt[]} attempt_list
 */

/**
 * @typedef LoginState
 * @type {object}
 * @property {Station} station
 * @property {string} code
 * @property {Map<number, Team>} team_map
 * @property {Map<number, Player>} player_map_by_id
 * @property {Map<string, Player>} player_map_by_mark
 * @property {Attempt[]} attempt_list
 * @property {Player[]} participant_list
 */

/**
 * @type {?HomeState}
 */
let home_state = null;

/**
 * @param {HomeResult} result
 */
function home_result_to_state(result) {
	home_state = {
		game: result.game,
		time_offset: result.time - Date.now() / 1000,
		station_map: new Map(result.station_list.map(station => [station.id, station])),
		login_state: null,
	};
}

/**
 * @type {?LoginState}
 */
let login_state = null;

/**
 * @param {FormData} form_data
 * @param {LoginResult} result
 */
function login_result_to_state(form_data, result) {
	home_result_to_state(result);
	login_state = {
		station: home_state.station_map.get(parseInt(form_data.get('station'))),
		code: form_data.get('code'),
		team_map: new Map(result.team_list.map(team => [team.id, team])),
		player_map_by_id: new Map(result.player_list.map(player => [player.id, player])),
		player_map_by_mark: new Map(result.player_list.map(player => [player.mark, player])),
		attempt_list: result.attempt_list,
		participant_list: [],
	};
}

await (async () => {
	const search_params = new URLSearchParams(location.search);
	const game = search_params.get('game');
	if (game === null)
		return;
	const form_data = new FormData();
	form_data.append('game', game);
	/**
	 * @type {?HomeResult}
	 */
	const result = await api.post('station_list', form_data);
	if (result === null)
		return;
	home_result_to_state(result);
})();

if (home_state === null)
	exit();

title_set(home_state.game);

/**
 * @type {HTMLDivElement}
 */
const timer_div = document.getElementById('timer-div');

function timer_tick() {
	const time = home_state.time_offset + Date.now() / 1000;
	const game = home_state.game;
	if (time < game.game_start)
		timer_div.innerHTML = `Game start: ${human_duration(game.game_start - time)}`;
	else if (time < game.game_stop)
		timer_div.innerHTML = `Game stop: ${human_duration(game.game_stop - time)}`;
	else
		timer_div.innerHTML = 'Game over.';
}
setInterval(timer_tick, 1000);
timer_tick();
timer_div.classList.remove('d-none');

function render() {
	if (login_state === null) {
		station_select.innerHTML = '';
		station_select.append(...n_option_list(Array.from(home_state.station_map.values())));
		login_form.classList.remove('d-none');
		main_div.classList.add('d-none');
		return;
	}
	login_form.classList.add('d-none');
	main_div.classList.remove('d-none');
	const station = login_state.station;
	name_heading.innerHTML = station.name;
	capacity_badge.innerHTML = `Capacity: ${station.capacity}`;
	score_sign_badge.innerHTML = score_sign_list[station.score_sign].name;
	score_base_badge.innerHTML = station.score_base !== null ? `Score base: ${station.score_base}` : '';
	score_high_badge.innerHTML = station.score_high !== null ? `Score high: ${station.score_high}` : '';
	if (login_state.participant_list.length === station.capacity)
		player_form.classList.add('d-none');
	else
		player_form.classList.remove('d-none');
	if (login_state.participant_list.length !== 0)
		player_list.classList.remove('d-none');
	else
		player_list.classList.add('d-none');
	player_list.innerHTML = '';
	player_list.append(...login_state.participant_list.map((player, index) => n({
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
							team_badge(login_state.team_map.get(player.team)),
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
									login_state.participant_list.splice(index, 1);
									render();
								},
							}),
						],
					}),
				],
			}),
		],
	})));
	if (login_state.participant_list.length === station.capacity)
		attempt_form.classList.remove('d-none');
	else
		attempt_form.classList.add('d-none');
	attempt_list.innerHTML = '';
	const attempt_type_map = run_station(station, login_state.attempt_list);
	login_state.attempt_list.toReversed().forEach(attempt => {
		const team = login_state.team_map.get(attempt.team);
		const type = attempt_type_map.get(attempt.id);
		if (type === null)
			return;
		attempt_list.append(n({
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
									content: human_duration(attempt.time - home_state.game.game_start),
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
								team_badge(team),
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
										form_data.append('game', home_state.game.name);
										form_data.append('station', login_state.station.id.toFixed());
										form_data.append('code', login_state.code);
										form_data.append('id', attempt.id.toFixed());
										/**
										 * @type {LoginResult}
										 */
										const result = await api.post('attempt_delete', form_data);
										login_result_to_state(form_data, result);
										spinner_div.classList.add('d-none');
										render();
									},
								}),
							],
						}),
						n({
							class: 'p-0 col-12',
							content: [
								n({
									class: 'm-1',
									content: attempt.player_list.map(id => login_state.player_map_by_id.get(id).name).join(', '),
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
	form_data.append('game', home_state.game.name);
	/**
	 * @type {?LoginResult}
	 */
	const result = await api.post('station_login', form_data);
	if (result === null) {
		alert('Code is wrong.');
		spinner_div.classList.add('d-none');
		return;
	}
	login_form.reset();
	localStorage.setItem(`game-${home_state.game.id}-station`, form_data.get('station'));
	localStorage.setItem(`game-${home_state.game.id}-code`, form_data.get('code'));
	login_result_to_state(form_data, result);
	spinner_div.classList.add('d-none');
	render();
});

/**
 * @type {HTMLSelectElement}
 */
const station_select = document.getElementById('station-select');

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

logout_button.addEventListener('click', () => {
	localStorage.removeItem(`game-${home_state.game.id}-station`);
	localStorage.removeItem(`game-${home_state.game.id}-code`);
	login_state = null;
	render();
});

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

/**
 * @type {HTMLFormElement}
 */
const player_form = document.getElementById('player-form');

player_form.addEventListener('submit', event => {
	event.preventDefault();
	const form_data = new FormData(player_form);
	const mark = form_data.get('mark');
	const player = login_state.player_map_by_mark.get(mark) ?? null;
	if (player === null) {
		alert('Player not found.');
		return;
	} else if (login_state.participant_list.some(participant => participant.id === player.id)) {
		alert('Player is already added.');
		return;
	} else if (login_state.participant_list.some(participant => participant.team !== player.team)) {
		alert('Player belongs to a different team.');
		return;
	}
	login_state.participant_list.push(player);
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
	const time = home_state.time_offset + Date.now() / 1000;
	if (time < home_state.game.game_start) {
		alert('The game has not started.');
		spinner_div.classList.add('d-none');
		return;
	}
	if (time >= home_state.game.game_stop) {
		alert('The game has ended.');
		spinner_div.classList.add('d-none');
		return;
	}
	const form_data = new FormData(attempt_form);
	form_data.append('game', home_state.game.name);
	form_data.append('station', login_state.station.id.toFixed());
	form_data.append('code', login_state.code);
	form_data.append('participant_list', login_state.participant_list.map(participant => participant.id.toFixed()).join(','));
	/**
	 * @type {?LoginResult}
	 */
	const result = await api.post('attempt_insert', form_data);
	login_result_to_state(form_data, result);
	spinner_div.classList.add('d-none');
	attempt_form.reset();
	render();
});

/**
 * @type {HTMLDivElement}
 */
const attempt_list = document.getElementById('attempt-list');

await (async () => {
	const station = localStorage.getItem(`game-${home_state.game.id}-station`);
	const code = localStorage.getItem(`game-${home_state.game.id}-code`);
	if (station === null || code === null) {
		spinner_div.classList.add('d-none');
		render();
		return;
	}
	const form_data = new FormData();
	form_data.append('game', home_state.game.name);
	form_data.append('station', station);
	form_data.append('code', code);
	/**
	 * @type {?LoginResult}
	 */
	const result = await api.post('station_login', form_data);
	if (result === null) {
		spinner_div.classList.add('d-none');
		render();
		return;
	}
	login_result_to_state(form_data, result);
	spinner_div.classList.add('d-none');
	render();
})();

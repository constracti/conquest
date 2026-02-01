import { api, team2_badge } from './common.js';
import { n, n_option_list } from './element.js';

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
 * @typedef Station
 * @type {object}
 * @property {number} id
 * @property {string} name
 * @property {number} capacity
 */

/**
 * @typedef {import('./common.js').Team2} Team2
 */

/**
 * @typedef {import('./common.js').Player2} Player2
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
	station_select.append(...n_option_list(result.station_list, '-'));
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
 */

/**
 * @typedef State
 * @type {object}
 * @property {Station} station
 * @property {string} code
 * @property {Map<number, Team2>} team_map
 * @property {Map<string, Player2>} player_map
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
		participant_list: [],
	};
}

/**
 * @type {?State}
 */
let state = null;

function render() {
	// TODO responsive
	if (state === null) {
		login_form.classList.remove('d-none');
		main_div.classList.add('d-none');
		return;
	}
	login_form.classList.add('d-none');
	main_div.classList.remove('d-none');
	name_heading.innerHTML = state.station.name;
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
		class: 'list-group-item d-flex flex-row align-items-center p-1',
		content: [
			n({
				class: 'm-1',
				content: [
					n({
						tag: 'code',
						content: player.mark,
					}),
				],
			}),
			n({
				class: 'm-1 flex-grow-1',
				content: player.name,
			}),
			team2_badge(state.team_map.get(player.team)),
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
	})));
	if (state.participant_list.length === state.station.capacity)
		attempt_form.classList.remove('d-none');
	else
		attempt_form.classList.add('d-none');
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
	const form_data = new FormData(event.currentTarget);
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
	const form_data = new FormData(event.currentTarget);
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
	render();
});

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

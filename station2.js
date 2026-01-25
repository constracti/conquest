import { api } from './common.js';
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
 * @property {?number} team - TODO make team mandatory
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
 * @property {Team[]} team_list
 * @property {Player[]} player_list
 */

/**
 * @typedef State
 * @type {object}
 * @property {Station} station
 * @property {Map<number, Team>} team_map
 * @property {Map<string, Player>} player_map
 */

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
	state = {
		station: page.station_map.get(parseInt(form_data.get('station'))),
		team_map: new Map(result.team_list.map(team => [team.id, team])),
		player_map: new Map(result.player_list.map(player => [player.mark, player])),
	};
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
	state = {
		station: page.station_map.get(parseInt(station)),
		team_map: new Map(result.team_list.map(team => [team.id, team])),
		player_map: new Map(result.player_list.map(player => [player.mark, player])),
	};
	spinner_div.classList.add('d-none');
	render();
})();

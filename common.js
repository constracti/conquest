import { API } from './api.js';
import { n } from './element.js';

/**
 * @typedef Game2
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
 * @property {number} capacity - positive integer
 * @property {?number} place
 */

/**
 * @typedef Station2
 * @type {object}
 * @property {number} id
 * @property {string} name
 * @property {string} code
 * @property {?number} polygon
 * @property {number} capacity
 * @property {boolean} score_sign
 * @property {?number} score_base
 * @property {?number} score_high
 */

/**
 * @typedef Team
 * @type {object}
 * @property {number} id
 * @property {string} name
 * @property {string} color
 */

/**
 * @typedef Team2
 * @type {object}
 * @property {number} id
 * @property {string} name
 * @property {string} background_color
 * @property {string} text_color
 */

/**
 * @typedef Player
 * @type {object}
 * @property {string} id
 * @property {string} name
 * @property {number} team
 * @property {boolean} block
 */

/**
 * @typedef Player2
 * @type {object}
 * @property {number} id
 * @property {string} name
 * @property {string} mark
 * @property {number} team
 */

/**
 * @typedef Attempt
 * @type {object}
 * @property {number} id
 * @property {number} station
 * @property {number} team
 * @property {number} score
 * @property {number} time
 * @property {string} time_sql
 * @property {number[]} player_list
 */

/**
 * @typedef Conqueror
 * @type {object}
 * @property {?number} team
 * @property {number} time
 */

/**
 * @typedef Conquest
 * @type {object}
 * @property {number} team
 * @property {number} start
 * @property {number} stop
 */

/**
 * @typedef Game
 * @type {object}
 * @property {number} time_start
 * @property {number} time_stop
 * @property {number} time_now
 * @property {number} reward_success
 * @property {number} reward_conquest
 * @property {number} reward_rate
 * @property {Station[]} station_list
 * @property {Team[]} team_list
 * @property {Success[]} success_list
 */

export const api = new API();

export const app_name2 = 'The Station War';

/**
 * 
 * @param {string} title
 */
function set_title(title) {
	document.title = title;
	Array.from(document.getElementsByTagName('h1')).forEach(h1 => {
		h1.innerHTML = app_name;
	});
}

/**
 * @type {string}
 */
const app_name = await api.get('app_name');
set_title(app_name); // TODO is this necessary?

/**
 * css expression resulting in a contrasting black or white color,
 * that depends on background color lightness (l)
 * and assuming lightness is not near mean
 * @param {string} background_color
 * @returns {string}
 */
function text_color(background_color) {
	const mean = 60;
	return `lab(from ${background_color} calc((${mean} - l) * 100 + 100 - ${mean}) 0 0)`;
}

export const score_sign_list = [
	{id: 0, name: 'Higher score wins'},
	{id: 1, name: 'Lower score wins'},
];

/**
 * @param {Team} team
 * @returns {HTMLDivElement} TODO replace function
 */
export function team_badge(team) {
	return n({
		class: 'badge border m-1',
		style: {
			backgroundColor: team.color,
			color: text_color(team.color),
		},
		content: team.name,
	});
}

/**
 * @param {Team2} team
 * @returns {HTMLDivElement}
 */
export function team2_badge(team) {
	return n({
		class: 'badge border m-1',
		style: {
			backgroundColor: team.background_color,
			color: team.text_color,
		},
		content: team.name,
	});
}

/**
 * @param {number} seconds
 * @returns {string}
 */
export function human_duration(seconds) {
	const sign = seconds < 0 ? '-' : '';
	if (seconds < 0)
		seconds = -seconds;
	seconds = Math.round(seconds);
	let minutes = Math.floor(seconds / 60);
	seconds -= minutes * 60;
	let hours = Math.floor(minutes / 60);
	minutes -= hours * 60;
	return `${sign}${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * @param {?Conquest[]} conquest_list
 * @param {Conqueror} conqueror
 * @param {number} time
 */
export function conquest_push(conquest_list, conqueror, time) {
	if (conquest_list === null)
		return;
	if (conqueror.team === null)
		return;
	if (conqueror.time === null)
		return;
	conquest_list.push({
		team: conqueror.team,
		start: conqueror.time,
		stop: time,
	});
}

/**
 * negates score if sign is true
 * @param {boolean} sign
 * @param {?number} score
 * @returns {?number}
 */
function rect(sign, score) {
	if (score === null)
		return null;
	if (sign)
		return -score;
	return score;
}

/**
 * pushes a conquest to list
 * @param {Conquest[]} conquest_list
 * @param {?Conqueror} conqueror
 * @param {number} time
 */
function push(conquest_list, conqueror, time) {
	if (conqueror === null)
		return;
	if (conqueror.team === null)
		return;
	conquest_list.push({
		team: conqueror.team,
		start: conqueror.time,
		stop: time,
	});
}

/**
 * @param {Station2[]} station_list
 * @param {Attempt[]} attempt_list
 * @param {number} time
 */
export function run(station_list, attempt_list, time) {
	/**
	 * @type {Map<number, Station2>}
	 */
	const station_map = new Map(station_list.map(station => [station.id, station]));
	/**
	 * @type {Map<number, ?number>} current record by station
	 */
	const record_map = new Map(station_list.map(station => [station.id, null]));
	/**
	 * @type {Map<number, ?Conqueror>} current conqueror by station
	 */
	const conqueror_map = new Map(station_list.map(station => [station.id, null]));
	/**
	 * @type {Conquest[]}
	 */
	const conquest_list = [];
	/**
	 * @type {Map<number, ?string>} by attempt
	 */
	const type_map = new Map(attempt_list.map(attempt => {
		if (attempt.time > time)
			return [attempt.id, null];
		const station = station_map.get(attempt.station);
		const sign = station.score_sign;
		const base = rect(sign, station.score_base);
		const high = rect(sign, station.score_high);
		const score = rect(sign, attempt.score);
		const record = rect(sign, record_map.get(attempt.station));
		if (base !== null && score < base) {
			if (record === null || score > record)
				record_map.set(attempt.station, attempt.score);
			return [attempt.id, 'Failure'];
		}
		const conqueror = conqueror_map.get(attempt.station);
		if (conqueror !== null && attempt.team === conqueror.team) {
			if (record === null || score > record)
				record_map.set(attempt.station, attempt.score);
			return [attempt.id, 'Success'];
		}
		if (high !== null && score >= high) {
			push(conquest_list, conqueror, attempt.time);
			if (record === null || score > record)
				record_map.set(attempt.station, attempt.score);
			conqueror_map.set(attempt.station, {team: attempt.team, time: attempt.time});
			return [attempt.id, 'Success and Conquest'];
		}
		if (record === null || score > record) {
			push(conquest_list, conqueror, attempt.time);
			record_map.set(attempt.station, attempt.score);
			conqueror_map.set(attempt.station, {team: attempt.team, time: attempt.time});
			return [attempt.id, 'Success and Conquest'];
		}
		if (record !== null && score === record) {
			push(conquest_list, conqueror, attempt.time);
			conqueror_map.set(attempt.station, {team: null, time: attempt.time});
			return [attempt.id, 'Success and Neutralization'];
		}
		return [attempt.id, 'Success'];
	}));
	station_list.forEach(station => {
		const conqueror = conqueror_map.get(station.id);
		push(conquest_list, conqueror, time);
	});
	return {
		conqueror_map: conqueror_map,
		conquest_list: conquest_list,
		attempt_type_map: type_map,
	};
}

/**
 * @param {Station2} station
 * @param {Attempt[]} attempt_list
 */
export function run_station(station, attempt_list) {
	return run([station], attempt_list, Math.max(0, ...attempt_list.map(attempt => attempt.time))).attempt_type_map;
}

/**
 * 
 * @param {Game2} game
 * @param {number} current_timestamp
 * @returns {number}
 */
export function score_success(game, current_timestamp) {
	const current_value = 1 + game.reward_rate / 3600 * (current_timestamp - game.game_start);
	return game.reward_success * current_value;
}

/**
 * @param {Game2} game
 * @param {number} start_timestamp
 * @param {number} stop_timestamp
 * @returns {number}
 */
export function score_conquest(game, start_timestamp, stop_timestamp) {
	const duration = stop_timestamp - start_timestamp // seconds
	const mean_timestamp = (start_timestamp + stop_timestamp) / 2 // seconds
	const mean_value = 1 + game.reward_rate / 3600 * (mean_timestamp - game.game_start);
	return game.reward_conquest / 60 * mean_value * duration;
}

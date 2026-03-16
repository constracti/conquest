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
	return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * @param {?number} score 
 * @returns {number} 
 */
function negate(score) {
	if (score === null)
		return null;
	return -score;
}

/**
 * @param {?number} record
 * @param {number} score
 * @returns {?number}
 */
function maximum(record, score) {
	if (record === null)
		return score;
	return Math.max(record, score);
}

/**
 * @param {boolean} sign
 * @param {?number} base
 * @param {?number} high
 * @param {number} score
 * @param {number} team
 * @param {{conqueror: ?number, record: ?number}} memory
 */
export function attempt_type(sign, base, high, score, team, memory) {
	if (sign) {
		memory.record = negate(memory.record);
		const type = attempt_type(!sign, negate(base), negate(high), negate(score), team, memory);
		memory.record = negate(memory.record);
		return type;
	}
	if (base !== null && score < base) {
		memory.record = maximum(memory.record, score);
		return 'Failure';
	}
	if (team === memory.conqueror) {
		memory.record = maximum(memory.record, score);
		return 'Success';
	}
	if (high !== null && score >= high) {
		memory.conqueror = team;
		memory.record = maximum(memory.record, score);
		return 'Success and Conquest';
	}
	if (memory.record === null) {
		memory.conqueror = team;
		memory.record = score;
		return 'Success and Conquest';
	}
	if (score > memory.record) {
		memory.conqueror = team;
		memory.record = score;
		return 'Success and Conquest';
	}
	if (score === memory.record) {
		memory.conqueror = null;
		return 'Success and Neutralization';
	}
	return 'Success';
}

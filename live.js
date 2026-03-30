import { api, app_name2, attempt_type, conquest_push, human_duration, score_conquest, score_success, team2_badge } from './common.js';
import { n } from './element.js';

/**
 * @typedef {import('./common.js').Game2} Game
 */

/**
 * @typedef {import('./common.js').Polygon} Polygon
 */

/**
 * @typedef {import('./common.js').Station2} Station
 */

/**
 * @typedef Team
 * @type {object}
 * @property {number} id
 * @property {string} name
 * @property {string} background_color
 * @property {string} text_color
 * @property {number} players
 */

/**
 * @typedef {import('./common.js').Attempt} Attempt
 */

/**
 * @typedef {import('./common.js').Conqueror} Conqueror
 */

/**
 * @typedef {import('./common.js').Conquest} Conquest
 */

/**
 * @typedef Result
 * @type {object}
 * @property {Game} game
 * @property {Polygon[]} polygon_list
 * @property {Station[]} station_list
 * @property {Team[]} team_list
 * @property {Attempt[]} attempt_list
 * @property {number} time
 */

/**
 * @typedef State
 * @type {object}
 * @property {Game} game
 * @property {Polygon[]} polygon_list
 * @property {Station[]} station_list
 * @property {Team[]} team_list
 * @property {Attempt[]} attempt_list
 * @property {number} time
 * @property {number} time_offset
 */

/**
 * @type {?State}
 */
let state = null;

// TODO define common routines in common.js

// TODO responsive
// TODO conqueror popup

/**
 * @type {HTMLDivElement}
 */
const canvas = document.getElementById('canvas');

/**
 * @type {HTMLImageElement}
 */
const map_img = document.getElementById('map-img');

/**
 * @type {SVGSVGElement}
 */
const svg = document.getElementById('svg'); // TODO stroke does not scale uniformly

/**
 * @type {HTMLDivElement}
 */
const spinner_div = document.getElementById('spinner-div');

/**
 * @type {HTMLDivElement}
 */
const timer_div = document.getElementById('timer-div');

/**
 * @type {HTMLDivElement}
 */
const score_list = document.getElementById('score-list');

/**
 * @type {HTMLDivElement}
 */
const history_list = document.getElementById('history-list');

function render() {
	if (state === null)
		return;
	// title
	((title) => {
		document.title = title;
		Array.from(document.getElementsByTagName('h1')).forEach(h1 => {
			h1.innerHTML = title;
		});
	})(state.game.title ?? app_name2);
	// map
	if (state.game.map !== null) {
		canvas.classList.remove('ratio', 'ratio-1x1');
		map_img.src = state.game.map;
	} else {
		canvas.classList.add('ratio', 'ratio-1x1');
		map_img.src = '';
	}
	// run
	const polygon_map = new Map(state.polygon_list.map(polygon => [polygon.id, polygon]));
	const station_map = new Map(state.station_list.map(station => [station.id, station]));
	const team_map = new Map(state.team_list.map(team => [team.id, team]));
	const time = state.time < state.game.game_start ? state.game.game_start : (state.time < state.game.game_stop ? state.time : state.game.game_stop);
	/**
	 * @type {Map<number, Conqueror>}
	 */
	const conqueror_map_by_station = new Map(state.station_list.map(station => [station.id, {
		team: null,
		time: null,
		record: null,
	}]));
	/**
	 * @type {Conquest[]}
	 */
	const conquest_list = [];
	const type_map_by_attempt = new Map(state.attempt_list.toSorted((lhs, rhs) => lhs.time - rhs.time).map(attempt => {
		const station = station_map.get(attempt.station);
		const conqueror = conqueror_map_by_station.get(attempt.station);
		const type = attempt_type(
			station.score_sign, station.score_base, station.score_high,
			attempt.score, attempt.team, attempt.time,
			conqueror, conquest_list,
		);
		return [attempt.id, type];
	}));
	state.station_list.forEach(station => {
		const conqueror = conqueror_map_by_station.get(station.id);
		conquest_push(conquest_list, conqueror, time);
	});
	const score_map_by_team = new Map(state.team_list.map(team => [team.id, 0]));
	// score from successes
	state.attempt_list.forEach(attempt => {
		const type = type_map_by_attempt.get(attempt.id);
		if (type !== 'Failure')
			score_map_by_team.set(attempt.team, score_map_by_team.get(attempt.team) + score_success(state.game, attempt.time));
	});
	// score from conquests
	conquest_list.forEach(conquest => {
		score_map_by_team.set(conquest.team, score_map_by_team.get(conquest.team) + score_conquest(state.game, conquest.start, conquest.stop));
	});
	// normalize score
	state.team_list.forEach(team => {
		if (team.players > 0)
			score_map_by_team.set(team.id, score_map_by_team.get(team.id) / team.players);
	});
	const score_max = Math.max(1, ...score_map_by_team.values());
	// svg
	svg.innerHTML = '';
	svg.append(...state.station_list.map(station => {
		if (station.polygon === null)
			return null;
		const polygon = polygon_map.get(station.polygon);
		if (polygon.content === null)
			return null;
		const conqueror = conqueror_map_by_station.get(station.id);
		const team = conqueror.team !== null ? team_map.get(conqueror.team) : null;
		const svg_polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
		polygon.content.split(' ').forEach(pair => {
			const number_list = pair.split(',').map(parseFloat);
			if (number_list.length !== 2)
				return;
			const svg_point = svg.createSVGPoint();
			svg_point.x = number_list[0] * 100;
			svg_point.y = number_list[1] * 100;
			svg_point.z = 0;
			svg_point.w = 0;
			svg_polygon.points.appendItem(svg_point);
			svg_polygon.style.stroke = team?.background_color ?? 'white';
			svg_polygon.style.fill = team?.background_color ?? 'white';
		});
		return svg_polygon;
	}).filter(svg_polygon => svg_polygon !== null));
	// score
	score_list.innerHTML = '';
	score_list.append(...state.team_list.toSorted((lhs, rhs) => score_map_by_team.get(lhs.id) - score_map_by_team.get(rhs.id)).toReversed().map(team => {
		const score = score_map_by_team.get(team.id);
		return n({
			class: 'list-group-item d-flex flex-column p-1',
			content: [
				n({
					class: 'm-1 border',
					content: [
						n({
							class: 'pb-1',
							style: {
								backgroundColor: team.background_color,
								width: (score / score_max * 100).toFixed() + '%',
							},
						}),
					],
				}),
				n({
					class: 'd-flex flex-row flex-wrap align-items-center',
					content: [
						team2_badge(team),
						n({
							class: 'm-1 flex-grow-1 text-end',
							content: score.toFixed(),
						}),
					],
				}),
			],
		});
	}));
	// history
	history_list.innerHTML = '';
	state.attempt_list.toSorted((lhs, rhs) => lhs.time - rhs.time).toReversed().forEach(attempt => {
		const type = type_map_by_attempt.get(attempt.id);
		if (type === 'Failure')
			return;
		const station = station_map.get(attempt.station);
		const team = team_map.get(attempt.team);
		history_list.append(n({
			class: 'list-group-item d-flex flex-column p-1',
			content: [
				n({
					class: 'd-flex flex-row justify-content-between',
					content: [
						n({
							class: 'm-1',
							content: type,
						}),
						n({
							class: 'm-1',
							content: human_duration(attempt.time - state.game.game_start),
						}),
					],
				}),
				n({
					class: 'd-flex flex-row flex-wrap align-items-center',
					content: [
						n({
							class: 'm-1',
							content: station.name,
						}),
						n({
							class: 'flex-grow-1 text-end',
							content: [
								team2_badge(team),
							],
						}),
					],
				}),
			],
		}));
	});
}

function exit() {
	const error = new Error('Invalid game parameter in url.');
	console.error(error.message);
	alert(error.message);
	throw error;
}

async function server_loop() {
	if (!spinner_div.classList.contains('d-none'))
		return;
	spinner_div.classList.remove('d-none');
	const search_params = new URLSearchParams(location.search);
	const game = search_params.get('game');
	if (game === null) {
		state = null;
		exit();
	}
	const form_data = new FormData();
	form_data.append('game', game);
	/**
	 * @type {?Result}
	 */
	const result = await api.post('live', form_data);
	if (result === null) {
		state = null;
		exit();
	}
	spinner_div.classList.add('d-none');
	state = {
		game: result.game,
		polygon_list: result.polygon_list,
		station_list: result.station_list,
		team_list: result.team_list,
		attempt_list: result.attempt_list,
		time: result.time,
		time_offset: result.time - Date.now() / 1000,
	};
	render();
}
setInterval(server_loop, 10000);
server_loop();

function timer_loop() {
	if (state === null)
		return;
	const time = state.time_offset + Date.now() / 1000;
	if (time < state.game.game_start)
		timer_div.innerHTML = `Game start: ${human_duration(state.game.game_start - time)}`;
	else if (time < state.game.game_stop)
		timer_div.innerHTML = `Game stop: ${human_duration(state.game.game_stop - time)}`;
	else
		timer_div.innerHTML = 'Game over.';
	timer_div.classList.remove('d-none');
}
setInterval(timer_loop, 1000);
timer_loop();

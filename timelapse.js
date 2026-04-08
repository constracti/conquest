import { api, app_name, exit, human_duration, run, score_conquest, score_success, team_badge, translate, translate_parse } from './common.js';
import { n } from './element.js';

/**
 * @typedef {import('./common.js').Game} Game
 */

/**
 * @typedef {import('./common.js').Polygon} Polygon
 */

/**
 * @typedef {import('./common.js').Station} Station
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
 * @type {HTMLDivElement}
 */
const canvas = document.getElementById('canvas');

/**
 * @type {HTMLHeadingElement}
 */
const game_heading = document.getElementById('game-heading');

/**
 * @type {HTMLImageElement}
 */
const map_img = document.getElementById('map-img');

/**
 * @type {SVGSVGElement}
 */
const svg = document.getElementById('svg');

/**
 * @type {HTMLInputElement}
 */
const speed_input = document.getElementById('speed-input');

/**
 * @type {HTMLDivElement}
 */
const time_div = document.getElementById('time-div');

/**
 * @type {HTMLInputElement}
 */
const time_input = document.getElementById('time-input');

/**
 * @type {HTMLButtonElement}
 */
const time_button = document.getElementById('time-button');

/**
 * @type {HTMLHeadingElement}
 */
const score_heading = document.getElementById('score-heading');

/**
 * @type {HTMLDivElement}
 */
const score_list = document.getElementById('score-list');

/**
 * @type {HTMLHeadingElement}
 */
const history_heading = document.getElementById('history-heading');

/**
 * @type {HTMLDivElement}
 */
const history_list = document.getElementById('history-list');

/**
 * @type {HTMLDivElement}
 */
const station_popup = document.getElementById('station-popup');

function render() {
	// svg
	svg.innerHTML = '';
	svg.append(...state.station_list.map(station => {
		if (station.polygon === null)
			return null;
		const polygon = state.polygon_map.get(station.polygon);
		if (polygon.content === null)
			return null;
		const conqueror = state.conqueror_map.get(station.id);
		const team = conqueror !== null && conqueror.team !== null ? state.team_map.get(conqueror.team) : null;
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
		svg_polygon.addEventListener('click', () => {
			if (state.station !== station.id)
				state.station = station.id;
			else
				state.station = null;
			station_render();
		});
		return svg_polygon;
	}).filter(svg_polygon => svg_polygon !== null));
	// score
	const score_map_by_team = new Map(state.team_list.map(team => [team.id, 0]));
	// score from successes
	state.attempt_list.forEach(attempt => {
		const type = state.attempt_type_map.get(attempt.id);
		if (type !== null && type !== 'Failure')
			score_map_by_team.set(attempt.team, score_map_by_team.get(attempt.team) + score_success(state.game, attempt.time));
	});
	// score from conquests
	state.conquest_list.forEach(conquest => {
		score_map_by_team.set(conquest.team, score_map_by_team.get(conquest.team) + score_conquest(state.game, conquest.start, conquest.stop));
	});
	// score normalization
	state.team_list.forEach(team => {
		if (team.players > 0)
			score_map_by_team.set(team.id, score_map_by_team.get(team.id) / team.players);
	});
	const score_max = Math.max(1, ...score_map_by_team.values());
	score_heading.textContent = translate('Score', state.lexicon);
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
						team_badge(team),
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
	history_heading.textContent = translate('Successes', state.lexicon);
	history_list.innerHTML = '';
	state.attempt_list.toReversed().forEach(attempt => {
		const type = state.attempt_type_map.get(attempt.id);
		if (type === null || type === 'Failure')
			return;
		const station = state.station_map.get(attempt.station);
		const team = state.team_map.get(attempt.team);
		history_list.append(n({
			class: 'list-group-item d-flex flex-column p-1',
			content: [
				n({
					class: 'd-flex flex-row justify-content-between',
					content: [
						n({
							class: 'm-1',
							content: translate(type, state.lexicon),
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
								team_badge(team),
							],
						}),
					],
				}),
			],
		}));
	});
	station_render();
}

function control_render() {
	time_div.innerHTML = human_duration(state.time_now - state.game.game_start);
	time_button.innerHTML = state.timer_id !== null ? '&#x23F8;' : '&#x23F5;';
}

function station_render() {
	station_popup.innerHTML = '';
	if (state.station === null)
		return;
	const station = state.station_map.get(state.station);
	const conqueror = state.conqueror_map.get(station.id);
	const team = conqueror !== null && conqueror.team !== null ? state.team_map.get(conqueror.team) : null;
	station_popup.append(n({
		class: 'm-2 alert alert-dark d-flex flex-row align-items-center p-1',
		content: [
			n({
				class: 'm-1',
				content: station.name,
			}),
			team !== null ? team_badge(team) : null,
			n({
				tag: 'button',
				class: 'btn-close m-1',
				click: () => {
					state.station = null;
					station_render();
				},
			}),
		].filter(element => element !== null),
	}));
}

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
 * @property {?Map<string, string>} lexicon
 * @property {Map<number, Polygon>} polygon_map
 * @property {Station[]} station_list
 * @property {Map<number, Station>} station_map
 * @property {Team[]} team_list
 * @property {Map<number, Team>} team_map
 * @property {Attempt[]} attempt_list
 * @property {number} speed
 * @property {number} time_max
 * @property {number} time_now
 * @property {?number} timer_id
 * @property {Map<number, ?Conqueror>} conqueror_map by station
 * @property {Conquest[]} conquest_list
 * @property {Map<number, ?string>} attempt_type_map
 * @property {?number} station
 */

/**
 * @type {State}
 */
const state = await (async () => {
	const search_params = new URLSearchParams(location.search);
	const game = search_params.get('game');
	if (game === null)
		exit();
	const form_data = new FormData();
	form_data.append('game', game);
	/**
	 * @type {?Result}
	 */
	const result = await api.post('live', form_data);
	if (result === null)
		exit();
	const simulation = run(result.station_list, result.attempt_list, result.game.game_start);
	return {
		game: result.game,
		lexicon: translate_parse(result.game.translation),
		polygon_map: new Map(result.polygon_list.map(polygon => [polygon.id, polygon])),
		station_list: result.station_list,
		station_map: new Map(result.station_list.map(station => [station.id, station])),
		team_list: result.team_list,
		team_map: new Map(result.team_list.map(team => [team.id, team])),
		attempt_list: result.attempt_list,
		speed: 60,
		time_max: result.time < result.game.game_stop ? result.time : result.game.game_stop,
		time_now: result.game.game_start,
		timer_id: null,
		conqueror_map: simulation.conqueror_map,
		conquest_list: simulation.conquest_list,
		attempt_type_map: simulation.attempt_type_map,
		station: null,
	};
})();

document.title = state.game.title ?? app_name;

document.getElementById('game-style').textContent = state.game.css ?? '';

game_heading.textContent = state.game.title ?? app_name;

speed_input.previousElementSibling.textContent = translate('Speed', state.lexicon);

speed_input.value = state.speed.toFixed();

document.getElementById('time-label').textContent = translate('Time', state.lexicon);

time_input.min = state.game.game_start.toFixed();
time_input.max = state.time_max.toFixed();
time_input.value = state.game.game_start.toFixed();

if (state.game.map !== null) {
	canvas.classList.remove('map-null');
	map_img.src = state.game.map;
} else {
	canvas.classList.add('map-null');
	map_img.src = '';
}

control_render();
render();

speed_input.addEventListener('change', () => {
	const speed = parseInt(speed_input.value);
	if (isNaN(speed) || speed < 1)
		return;
	state.speed = speed;
});

time_input.addEventListener('input', () => {
	const time_now = parseInt(time_input.value);
	if (isNaN(time_now) || time_now < state.game.game_start || time_now > state.time_max)
		return;
	state.time_now = time_now;
	const simulation = run(state.station_list, state.attempt_list, state.time_now);
	state.conqueror_map = simulation.conqueror_map;
	state.conquest_list = simulation.conquest_list;
	state.attempt_type_map = simulation.attempt_type_map;
	control_render();
	render();
});

time_button.addEventListener('click', () => {
	if (state.timer_id === null) {
		// play
		const restart = state.time_now === state.time_max;
		if (restart) {
			state.time_now = state.game.game_start;
			time_input.value = state.time_now.toFixed();
			const simulation = run(state.station_list, state.attempt_list, state.time_now);
			state.conqueror_map = simulation.conqueror_map;
			state.conquest_list = simulation.conquest_list;
			state.attempt_type_map = simulation.attempt_type_map;
		}
		state.timer_id = setInterval(() => {
			state.time_now += state.speed;
			if (state.time_now >= state.time_max) {
				state.time_now = state.time_max;
				clearInterval(state.timer_id);
				state.timer_id = null;
			}
			time_input.value = state.time_now.toFixed();
			const simulation = run(state.station_list, state.attempt_list, state.time_now);
			state.conqueror_map = simulation.conqueror_map;
			state.conquest_list = simulation.conquest_list;
			state.attempt_type_map = simulation.attempt_type_map;
			control_render();
			render();
		}, 1000);
		control_render();
		if (restart)
			render();
	} else {
		// pause
		clearInterval(state.timer_id);
		state.timer_id = null;
		control_render();
	}
});

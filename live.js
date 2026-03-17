import { api, human_duration, team2_badge } from './common.js';
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
 * @typedef {import('./common.js').Team2} Team
 */

/**
 * @typedef {import('./common.js').Attempt} Attempt
 */

/**
 * @typedef State
 * @type {object}
 * @property {Game} game
 * @property {Polygon[]} polygon_list
 * @property {Station[]} station_list
 * @property {Team[]} team_list
 * @property {Attempt[]} attempt_list
 */

/**
 * @type {?State}
 */
let state = await (async () => {
	const search_params = new URLSearchParams(location.search);
	const game = search_params.get('game');
	if (game === null)
		return null;
	const form_data = new FormData();
	form_data.append('game', game);
	return await api.post('live', form_data);
})();

// TODO define common routines in common.js

if (state === null) {
	const error = new Error('Invalid game parameter in url.');
	console.error(error.message);
	alert(error.message);
	throw error;
}

((title) => {
	document.title = title;
	Array.from(document.getElementsByTagName('h1')).forEach(h1 => {
		h1.innerHTML = title;
	});
})(state.game.title ?? 'The Station War');

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
const score_list = document.getElementById('score-list');

/**
 * @type {HTMLDivElement}
 */
const history_list = document.getElementById('history-list');

function render() {
	if (state.game.map !== null) {
		canvas.classList.remove('ratio', 'ratio-1x1');
		map_img.src = state.game.map;
	} else {
		canvas.classList.add('ratio', 'ratio-1x1');
		map_img.src = '';
	}
	const polygon_map = new Map(state.polygon_list.map(polygon => [polygon.id, polygon]));
	const station_map = new Map(state.station_list.map(station => [station.id, station]));
	const team_map = new Map(state.team_list.map(team => [team.id, team]));
	const conquest_map_by_station = new Map(state.station_list.map(station => {
		const team = Math.floor(Math.random() * state.team_list.length * 2); // TODO calculate real conquest
		return [
			station.id,
			{
				team: team < state.team_list.length ? team : null,
				score: Math.floor(Math.random() * 10),
			},
		];
	}));
	const score_map_by_team = new Map(state.team_list.map(team => [team.id, Math.random() * 1000])); // TODO calculate real score
	const score_max = Math.max(...score_map_by_team.values());
	svg.innerHTML = '';
	svg.append(...state.station_list.map(station => {
		if (station.polygon === null)
			return null;
		const polygon = polygon_map.get(station.polygon);
		if (polygon.content === null)
			return null;
		const conquest = conquest_map_by_station.get(station.id);
		const team = conquest.team !== null ? team_map.get(conquest.team) : null;
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
	history_list.innerHTML = '';
	history_list.append(...state.attempt_list.toSorted((lhs, rhs) => lhs.time - rhs.time).toReversed().map(attempt => {
		return n({
			class: 'list-group-item d-flex flex-column p-1',
			content: [
				n({
					class: 'd-flex flex-row justify-content-between',
					content: [
						n({
							class: 'm-1',
							content: attempt.score !== 0 ? 'Conquest' : 'Success', // TODO calculate attempt result
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
							content: station_map.get(attempt.station).name,
						}),
						n({
							class: 'flex-grow-1 text-end',
							content: [
								team2_badge(team_map.get(attempt.team)),
							],
						}),
					],
				}),
			],
		});
	}));
}

render();

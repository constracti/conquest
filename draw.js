import { api, team_badge } from './common.js';
import { n } from './element.js';
import { lexicon } from './lexicon.js';

/**
 * @typedef {import('./common.js').Team} Team
 */

/**
 * @typedef Player
 * @type {object}
 * @property {string} id
 * @property {string} name
 * @property {number} team
 * @property {number} points
 */

/**
 * @typedef State
 * @type {object}
 * @property {Map<number, Team>} team_map
 * @property {Player[]} player_list
 * @property {?number} point_threshold
 * @property {(?Player)[]} winner_list
 */

/**
 * @type {?State}
 */
let state = null;

function refresh() {
	if (state === null)
		return;
	const points_max = Math.max(...state.player_list.map(player => player.points));
	/**
	 * @type {number[]}
	 */
	const frequency_list = new Array(points_max + 1);
	frequency_list.fill(0);
	state.player_list.forEach(player => {
		frequency_list[player.points]++;
	});
	const frequency_max = Math.max(...frequency_list);
	point_histogram_div.innerHTML = '';
	point_histogram_div.append(...frequency_list.map((frequency, points) => n({
		class: 'list-group-item p-0 d-flex flex-row',
		content: [
			n({
				class: `text-bg-${points >= (state.point_threshold ?? 0) ? 'success' : 'danger'} px-2 py-1`,
				style: {
					minWidth: '2em',
					width: `${frequency / frequency_max * 100}%`,
				},
				content: points.toString(),
			}),
			n({
				class: 'px-2 py-1',
				content: frequency.toString(),
			}),
		],
	})));
	draw_div.innerHTML = '';
	if (state.point_threshold !== null) {
		const player_map = new Map(state.player_list.filter(player => player.points >= state.point_threshold).map(player => [player.id, player]));
		state.winner_list.forEach((winner, index, winner_list) => {
			const player_list = Array.from(player_map.values())
			draw_div.append(n({
				tag: 'hr',
				class: 'm-2',
			}));
			draw_div.append(n({
				class: 'd-flex flex-row',
				content: [
					n({
						class: 'badge text-bg-info m-2',
						content: `${lexicon.position}: ${index + 1}`,
					}),
					n({
						class: 'badge text-bg-info m-2',
						content: `${lexicon.candidate_count}: ${player_map.size}`,
					}),
				],
			}));
			if (player_map.size === 0)
				return;
			const point_sum = player_list.reduce((prev, curr) => prev + curr.points, 0);
			draw_div.append(n({
				class: 'd-flex flex-row m-2',
				content: player_list.map(player => {
					const team = state.team_map.get(player.team);
					return n({
						class: 'border py-2',
						style: {
							backgroundColor: team.color,
							width: `${player.points / point_sum * 100}%`,
						},
						custom: element => {
							element.title = `${player.name} ${lexicon.from} ${team.name}`;
						},
					});
				}),
			}));
			if (winner !== null) {
				const team = state.team_map.get(winner.team);
				draw_div.append(n({
					class: 'alert alert-info m-2 d-flex flex-row justify-content-between align-items-center p-1',
					content: [
						n({
							class: 'm-1',
							content: winner.name,
						}),
						team_badge(team),
					],
				}));
				player_map.delete(winner.id);
			}
			if (index === winner_list.length - 1) {
				if (winner === null) {
					draw_div.append(n({
						class: 'd-flex flex-row',
						content: [
							n({
								tag: 'button',
								class: 'btn btn-primary m-2',
								click: () => {
									let random = Math.random() * point_sum;
									let player = null;
									for (player of player_list) {
										random -= player.points;
										if (random < 0)
											break;
									}
									winner_list[index] = player;
									refresh();
								},
								content: lexicon.draw,
							}),
						],
					}));
				} else {
					draw_div.append(n({
						class: 'd-flex flex-row',
						content: [
							n({
								tag: 'button',
								class: 'btn btn-primary m-2',
								click: () => {
									winner_list.push(null);
									refresh();
								},
								content: lexicon.next,
							}),
						],
					}));
				}
			}
		});
	}
}

document.getElementById('draw-heading').innerHTML = lexicon.draw;

document.getElementById('point-heading').innerHTML = lexicon.point_histogram;

/**
 * @type {HTMLButtonElement}
 */
const point_button = document.getElementById('point-button');
point_button.innerHTML = lexicon.hide;
point_button.addEventListener('click', () => {
	if (point_histogram_div.classList.contains('d-none')) {
		point_button.innerHTML = lexicon.hide;
		point_histogram_div.classList.remove('d-none');
		point_threshold_form.classList.remove('d-none');
	} else {
		point_button.innerHTML = lexicon.show;
		point_histogram_div.classList.add('d-none');
		point_threshold_form.classList.add('d-none');
	}
});

/**
 * @type {HTMLDivElement}
 */
const point_histogram_div = document.getElementById('point-histogram-div');

/**
 * @type {HTMLFormElement}
 */
const point_threshold_form = document.getElementById('point-threshold-form');

/**
 * @type {HTMLInputElement}
 */
const point_threshold_input = document.getElementById('point-threshold-input');
point_threshold_input.previousElementSibling.innerHTML = lexicon.point_threshold;

document.getElementById('point-threshold-submit').innerHTML = lexicon.submit;

point_threshold_form.addEventListener('submit', event => {
	event.preventDefault();
	const point_threshold = parseInt(point_threshold_input.value);
	state.point_threshold = isNaN(point_threshold) ? null : point_threshold;
	state.winner_list = [null];
	refresh();
});

/**
 * @type {HTMLDivElement}
 */
const draw_div = document.getElementById('draw-div');

(async () => {
	const password = localStorage.getItem('password');
	if (password === null) {
		location.href = './admin.html';
		return;
	}
	const formData = new FormData();
	formData.append('password', password);
	/**
	 * @type {{team_list: Team[], player_list: Player[]}|null}
	 */
	const result = await api.post('draw', formData);
	if (result === null) {
		location.href = './admin.html';
		return;
	}
	state = {
		team_map: new Map(result.team_list.map(team => [team.id, team])),
		player_list: result.player_list,
		point_threshold: null,
		winner_list: [null],
	};
	refresh();
})();

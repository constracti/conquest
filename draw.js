import { api, app_name, run, team_badge, translate, translate_parse } from './common.js';
import { n } from './element.js';

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
 * @typedef Participant
 * @type {object}
 * @property {number} attempt
 * @property {number} player
 */

/**
 * @type {HTMLButtonElement}
 */
const score_button = document.getElementById('score-button');

/**
 * @type {HTMLDivElement}
 */
const histogram_div = document.getElementById('histogram-div');

/**
 * @type {HTMLFormElement}
 */
const threshold_form = document.getElementById('threshold-form');

/**
 * @type {HTMLInputElement}
 */
const threshold_input = document.getElementById('threshold-input');

/**
 * @type {HTMLDivElement}
 */
const main_div = document.getElementById('main-div');

function render() {
	/**
	 * @type {number}
	 */
	const score_max = Math.max(0, ...state.player_list.map(player => state.player_score_map.get(player.id)));
	/**
	 * @type {number[]}
	 */
	const frequency_list = Array(score_max + 1);
	frequency_list.fill(0);
	state.player_list.forEach(player => {
		const score = state.player_score_map.get(player.id);
		frequency_list[score]++;
	});
	const frequency_max = Math.max(...frequency_list);
	histogram_div.innerHTML = '';
	histogram_div.append(...frequency_list.map((frequency, score) => n({
		class: 'list-group-item p-0 d-flex flex-row',
		content: [
			n({
				class: `text-bg-${score >= state.point_threshold ?? 0 ? 'success' : 'danger'} px-2 py-1`,
				style: {
					minWidth: `${Math.ceil(Math.log10(Math.max(2, frequency_list.length))).toFixed()}em`,
					width: `${(frequency / frequency_max * 100).toFixed(2)}%`,
				},
				content: score.toFixed(),
			}),
			n({
				class: 'px-2 py-1',
				content: frequency.toFixed(),
			}),
		],
	})));
	main_div.innerHTML = '';
	if (state.point_threshold !== null) {
		const exclude_set = new Set(state.player_list.filter(player => state.player_score_map.get(player.id) < state.point_threshold));
		state.winner_list.forEach((winner, index) => {
			const player_list = state.player_list.filter(player => !exclude_set.has(player));
			main_div.append(n({
				tag: 'hr',
				class: 'm-2',
			}));
			main_div.append(n({
				class: 'd-flex flex-row',
				content: [
					n({
						class: 'badge text-bg-info m-2',
						content: `${translate('Position', state.lexicon)}: ${index + 1}`,
					}),
					n({
						class: 'badge text-bg-info m-2',
						content: `${translate('Count', state.lexicon)}: ${player_list.length}`,
					}),
				],
			}));
			if (player_list.length === 0)
				return;
			const score_sum = player_list.reduce((acc, player) => acc + state.player_score_map.get(player.id), 0);
			main_div.append(n({
				class: 'd-flex flex-row m-2',
				content: player_list.map(player => {
					const team = state.team_map.get(player.team);
					const score = state.player_score_map.get(player.id);
					return n({
						class: 'border py-2',
						style: {
							backgroundColor: team.background_color,
							width: `${(score / score_sum * 100).toFixed(2)}%`,
						},
						title: `${player.name} ${translate('from', state.lexicon)} ${team.name}`,
					});
				}),
			}));
			if (winner !== null) {
				main_div.append(n({
					class: 'alert alert-info m-2 d-flex flex-row justify-content-between align-items-center p-1',
					content: [
						n({
							class: 'm-1',
							content: winner.name,
						}),
						team_badge(state.team_map.get(winner.team)),
					],
				}));
				exclude_set.add(winner);
			}
			if (index === state.winner_list.length - 1) {
				const button = winner === null ? n({
					tag: 'button',
					class: 'btn btn-primary m-2',
					click: () => {
						let random = Math.random() * score_sum;
						player_list.forEach(player => {
							if (random < 0)
								return;
							random -= state.player_score_map.get(player.id);
							if (random < 0)
								state.winner_list[index] = player;
						});
						render();
					},
					content: translate('Draw', state.lexicon),
				}) : n({
					tag: 'button',
					class: 'btn btn-primary m-2',
					click: () => {
						state.winner_list.push(null);
						render();
					},
					content: translate('Next', state.lexicon),
				});
				main_div.append(n({
					class: 'd-flex flex-row',
					content: [
						button,
					],
				}));
			}
		});
	}
}

/**
 * @typedef Result
 * @type {object}
 * @property {Game} game
 * @property {Station[]} station_list
 * @property {Team[]} team_list
 * @property {Player[]} player_list
 * @property {Attempt[]} attempt_list
 * @property {Participant[]} participant_list
 */

/**
 * @typedef State
 * @type {object}
 * @property {Game} game
 * @property {?Map<string, string>} lexicon
 * @property {Map<number, Team>} team_map
 * @property {Player[]} player_list
 * @property {Map<number, number>} player_score_map
 * @property {number} point_threshold
 * @property {(?Player)[]} winner_list
 */

function redirect() {
	location.replace('index.html');
}

/**
 * @type {State}
 */
const state = await (async () => {
	const name = localStorage.getItem('name');
	const password = localStorage.getItem('password');
	if (name === null || password === null)
		redirect();
	const form_data = new FormData();
	form_data.set('name', name);
	form_data.set('password', password);
	/**
	 * @type {?Result}
	 */
	const result = await api.post('draw', form_data);
	if (result === null)
		redirect();
	const simulation = run(result.station_list, result.attempt_list, result.game.game_stop);
	const player_score_map = new Map(result.player_list.map(player => [player.id, 0]));
	result.participant_list.forEach(participant => {
		const attempt_type = simulation.attempt_type_map.get(participant.attempt);
		if (attempt_type === null || attempt_type === 'Failure')
			return;
		player_score_map.set(participant.player, player_score_map.get(participant.player) + 1);
	});
	return {
		game: result.game,
		lexicon: translate_parse(result.game.translation),
		team_map: new Map(result.team_list.map(team => [team.id, team])),
		player_list: result.player_list,
		player_score_map: player_score_map,
		point_threshold: null,
		winner_list: [],
	};
})();

document.title = `${translate('Draw', state.lexicon)} | ${state.game.title ?? app_name}`;

document.getElementById('game-style').textContent = state.game.css ?? '';

document.getElementById('game-heading').textContent = state.game.title ?? app_name;

document.getElementById('page-heading').textContent = translate('Draw', state.lexicon);

document.getElementById('score-heading').textContent = translate('Successes', state.lexicon);

score_button.textContent = translate('Hide', state.lexicon);
score_button.addEventListener('click', () => {
	if (histogram_div.classList.contains('d-none')) {
		histogram_div.classList.remove('d-none');
		threshold_form.classList.remove('d-none');
		score_button.textContent = translate('Hide', state.lexicon);
	} else {
		histogram_div.classList.add('d-none');
		threshold_form.classList.add('d-none');
		score_button.textContent = translate('Show', state.lexicon);
	}
});

threshold_form.addEventListener('submit', event => {
	event.preventDefault();
	const point_threshold = parseInt(threshold_input.value);
	state.point_threshold = isNaN(point_threshold) ? null : point_threshold;
	state.winner_list = [null];
	render();
});

threshold_input.previousElementSibling.textContent = translate('Minimum successes', state.lexicon);

document.getElementById('threshold-submit').textContent = translate('Submit', state.lexicon);

render();

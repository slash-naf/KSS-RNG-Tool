// @ts-check

/** @typedef {import('./rng2.mjs').ActionTable} ActionTable */

/** @typedef {{ knight: ActionTable[], dragon: ActionTable[], dragonTurn2: ActionTable[], dragonTurn2ForPowerManip: ActionTable[] }} ActionsDifficultyTable */
/** BattleWindowsMWWManipulatorのactionsDifficultyTableのデフォルト値 @type {ActionsDifficultyTable} */
export const DefaultActionsDifficultyTable = {
	knight: [
		{ difficulty: 0 },
		{ difficulty: 1, stars: 1 },
		{ difficulty: 2, hammerFlips: 1 },
		{ difficulty: 3, slides: 1 },
		{ difficulty: 11, stars: 2 },
		{ difficulty: 12, hammerFlips: 2 },
		{ difficulty: 13, slides: 2 },
		{ difficulty: 21, stars: 1, hammerFlips: 1 },
		{ difficulty: 22, stars: 1, slides: 1 },
		{ difficulty: 23, hammerFlips: 1, slides: 1 },
		{ difficulty: 24, dashes: 3 },
		{ difficulty: 41, dashes: 3, stars: 1 },
		{ difficulty: 42, dashes: 3, hammerFlips: 1 },
		{ difficulty: 43, dashes: 3, slides: 1 },
		{ difficulty: 44, dashes: 2, stars: 1, hammerFlips: 1 },
		{ difficulty: 45, dashes: 2, stars: 1, slides: 1 },
		{ difficulty: 350, dashes: 1 },
		{ difficulty: 401, dashes: 1, hammerFlips: 1 },
		{ difficulty: 402, dashes: 1, slides: 1 },
	],
	dragon: [
		{ difficulty: 0 },
		{ difficulty: 4, stars: 1 },
		{ difficulty: 5, slides: 1 },
		{ difficulty: 16, stars: 2 },
		{ difficulty: 17, slides: 2 },
		{ difficulty: 31, stars: 1, slides: 1 },
		{ difficulty: 32, dashes: 3 },
		{ difficulty: 51, dashes: 3, stars: 1 },
		{ difficulty: 52, dashes: 3, slides: 1 },
		{ difficulty: 54, dashes: 2, stars: 1, slides: 1 },
		{ difficulty: 400, dashes: 1 },
		{ difficulty: 451, dashes: 1, slides: 1 },
	],
	dragonTurn2: [
		{ difficulty: 0 },
		{ difficulty: 1, stars: 1 },
		{ difficulty: 1, hammerFlips: 1 },
		{ difficulty: 1, slides: 1 },
		{ difficulty: 1, dashes: 3 },
		{ difficulty: 6, dashes: 2, stars: 1 },
		{ difficulty: 7, dashes: 2, slides: 1 },
		{ difficulty: 8, dashes: 2, hammerFlips: 1 },
		{ difficulty: 450, dashes: 1 },
		{ difficulty: 501, dashes: 1, slides: 1 },
		{ difficulty: 502, dashes: 1, hammerFlips: 1 },
	],
	dragonTurn2ForPowerManip: [
		//左右
		...[
			{ difficulty: 0 },
			{ difficulty: 20, dashes: 2 },
			{ difficulty: 21, dashes: 3 },
			{ difficulty: 25, slides: 1 },
			{ difficulty: 30, dashes: 4 },
			{ difficulty: 550, dashes: 1 },
		].flatMap(
			e => [
				{ difficulty: 0 },
				{ difficulty: 50, dashes: 2 },
				{ difficulty: 550, dashes: 1 },
			].flatMap(
				cont => [false, true].map(left => ({
					...e,
					difficulty: e.difficulty + cont.difficulty,
					timeloss: left ? 15 : 0,
					dragonPowerManip: {left, center: false, cont},
				}))
			)
		),
		//中央
		...[
			{ difficulty: 0 },
		].flatMap(
			e => [
				{ difficulty: 0 },
				{ difficulty: 10, stars: 1 },
				{ difficulty: 11, slides: 1 },
				{ difficulty: 12, dashes: 3 },
				{ difficulty: 15, dashes: 2, stars: 1 },
				{ difficulty: 16, dashes: 2, slides: 1 },
				{ difficulty: 31, dashes: 3, stars: 1 },
				{ difficulty: 32, dashes: 3, slides: 1 },
				{ difficulty: 60, dashes: 2, stars: 1, slides: 1 },
				{ difficulty: 450, dashes: 1 },
				{ difficulty: 501, dashes: 1, slides: 1 },
			].flatMap(
				cont => [false, true].map(left => ({
					...e,
					difficulty: e.difficulty + cont.difficulty,
					timeloss: left ? 10 : 0,
					dragonPowerManip: {left, center: true, cont},
				}))
			)
		),
	],
};

// @ts-check

/** @typedef {import('./rng2.mjs').ActionTable} ActionTable */

/** @typedef {{ knight: ActionTable[], dragon: ActionTable[], dragonTurn2: ActionTable[], dragonTurn2ForPowerManip: ActionTable[] }} ActionsDifficultyTable */
/** BattleWindowsMWWManipulatorのactionsDifficultyTableのデフォルト値 @type {ActionsDifficultyTable} */
export const DefaultActionsDifficultyTable = {
	knight: [
		{ difficulty: 0 },
		{ difficulty: 1, stars: 1 },
		{ difficulty: 1, hammerFlips: 1 },
		{ difficulty: 1, stars: 2 },
		{ difficulty: 1, stars: 1, hammerFlips: 1 },
		{ difficulty: 2, slides: 1 },
		{ difficulty: 2, dashes: 3 },
		{ difficulty: 2, hammerFlips: 2 },
		{ difficulty: 5, dashes: 3, stars: 1 },
		{ difficulty: 5, stars: 1, slides: 1 },
		{ difficulty: 6, slides: 2 },
		{ difficulty: 6, dashes: 3, slides: 1 },
		{ difficulty: 6, dashes: 2, stars: 1, slides: 1 },
		{ difficulty: 7, dashes: 2, hammerFlips: 2 },
		{ difficulty: 8, dashes: 2, stars: 1, hammerFlips: 1 },
		{ difficulty: 8, dashes: 5, stars: 1 },
		{ difficulty: 10, dashes: 2, hammerFlips: 1, next: { dashes: 2, hammerFlips: 1 } },
		{ difficulty: 12, dashes: 3, hammerFlips: 1 },
		{ difficulty: 13, slides: 1, hammerFlips: 1 },
		{ difficulty: 16, dashes: 3, stars: 1, slides: 1 },
		{ difficulty: 18, dashes: 3, stars: 1, hammerFlips: 1 },
		{ difficulty: 20, dashes: 3, slides: 2 },
		{ difficulty: 22, dashes: 5, stars: 1, slides: 1 },
		{ difficulty: 28, stars: 1, slides: 1, hammerFlips: 1 },
		{ difficulty: 29, dashes: 2, stars: 1, slides: 1, hammerFlips: 1 },
		{ difficulty: 30, dashes: 3, slides: 1, hammerFlips: 1 },
		{ difficulty: 31, slides: 2, hammerFlips: 1 },
		{ difficulty: 32, dashes: 5, stars: 1, hammerFlips: 1 },
		{ difficulty: 100, dashes: 1 },
		{ difficulty: 110, dashes: 1, hammerFlips: 2 },
		{ difficulty: 130, dashes: 1, hammerFlips: 1, next: { dashes: 2, hammerFlips: 1 } },
		{ difficulty: 130, dashes: 1, slides: 2, hammerFlips: 1 },
	],
	dragon: [
		{ difficulty: 0 },
		{ difficulty: 1, stars: 1 },
		{ difficulty: 3, stars: 2 },
		{ difficulty: 8, slides: 1 },
		{ difficulty: 8, dashes: 3 },
		{ difficulty: 10, dashes: 2, slides: 1 },
		{ difficulty: 12, dashes: 3, stars: 1 },
		{ difficulty: 20, dashes: 5, stars: 1 },
		{ difficulty: 30, timeloss: 12, slides: 2 },
		{ difficulty: 35, timeloss: 20, dashes: 2, slides: 2 },
		{ difficulty: 40, timeloss: 30, dashes: 2, slides: 1, next: { dashes: 2, slides: 1 } },
		{ difficulty: 40, timeloss: 16, dashes: 3, slides: 1 },
		{ difficulty: 40, timeloss: 16, dashes: 2, stars: 1, slides: 1 },
		{ difficulty: 45, timeloss: 30, dashes: 5, slides: 1 },
		{ difficulty: 100, dashes: 1 },
		{ difficulty: 110, timeloss: 20, dashes: 1, slides: 2 },
		{ difficulty: 120, timeloss: 30, dashes: 1, slides: 1, next: { dashes: 2, slides: 1 } },



		{ difficulty: 1, inhales: 1 },
		{ difficulty: 110, inhales: 1, dashes: 1 },
		{ difficulty: 1, inhales: 1, stars: 1 },
		{ difficulty: 20, inhales: 1, dashes: 3 },
		{ difficulty: 3, inhales: 1, stars: 2 },
		{ difficulty: 25, inhales: 1, stars: 1, dashes: 3 },
		{ difficulty: 20, inhales: 1, slides: 1 },
		{ difficulty: 125, inhales: 1, dashes: 1, slides: 1 },
		{ difficulty: 25, inhales: 1, stars: 1, slides: 1 },
		{ difficulty: 130, inhales: 1, stars: 1, dashes: 1, slides: 1 },
		{ difficulty: 25, inhales: 1, stars: 1, dashes: 2, slides: 1 },

		{ difficulty: 110, dashes: 1, next: { inhales: 1 } },
		{ difficulty: 200, dashes: 1, next: { inhales: 1, dashes: 1 } },
		{ difficulty: 111, dashes: 1, next: { inhales: 1, stars: 1 } },
		{ difficulty: 130, dashes: 1, next: { inhales: 1, dashes: 3 } },
		{ difficulty: 120, dashes: 1, next: { inhales: 1, stars: 2 } },
		{ difficulty: 140, dashes: 1, next: { inhales: 1, stars: 1, dashes: 3 } },
		{ difficulty: 130, dashes: 1, next: { inhales: 1, slides: 1 } },
		{ difficulty: 225, dashes: 1, next: { inhales: 1, dashes: 1, slides: 1 } },
		{ difficulty: 140, dashes: 1, next: { inhales: 1, stars: 1, slides: 1 } },

		{ difficulty: 2, dashes: 2, next: { inhales: 1 } },
		{ difficulty: 112, dashes: 2, next: { inhales: 1, dashes: 1 } },
		{ difficulty: 3, dashes: 2, next: { inhales: 1, stars: 1 } },
		{ difficulty: 25, dashes: 2, next: { inhales: 1, dashes: 3 } },
		{ difficulty: 12, dashes: 2, next: { inhales: 1, stars: 1, dashes: 2 } },
		{ difficulty: 30, dashes: 2, next: { inhales: 1, stars: 1, dashes: 3 } },
		{ difficulty: 25, dashes: 2, next: { inhales: 1, slides: 1 } },
		{ difficulty: 125, dashes: 2, next: { inhales: 1, dashes: 1, slides: 1 } },
		{ difficulty: 30, dashes: 2, next: { inhales: 1, stars: 1, slides: 1 } },

		{ difficulty: 15, dashes: 3, next: { inhales: 1 } },
		{ difficulty: 135, dashes: 3, next: { inhales: 1, dashes: 1 } },
		{ difficulty: 20, dashes: 3, next: { inhales: 1, stars: 1 } },
		{ difficulty: 150, dashes: 3, next: { inhales: 1, stars: 1, dashes: 1 } },

		{ difficulty: 15, dashes: 4, next: { inhales: 1 } },
		{ difficulty: 135, dashes: 4, next: { inhales: 1, dashes: 1 } },
		{ difficulty: 20, dashes: 4, next: { inhales: 1, stars: 1 } },
		{ difficulty: 150, dashes: 4, next: { inhales: 1, stars: 1, dashes: 1 } },

		{ difficulty: 30, dashes: 5, next: { inhales: 1 } },
		{ difficulty: 150, dashes: 5, next: { inhales: 1, dashes: 1 } },
		{ difficulty: 40, dashes: 5, next: { inhales: 1, stars: 1 } },

		{ difficulty: 20, slides: 1, next: { inhales: 1 } },
		{ difficulty: 150, slides: 1, next: { inhales: 1, dashes: 1 } },
		{ difficulty: 25, slides: 1, next: { inhales: 1, stars: 1 } },

		{ difficulty: 130, dashes: 1, slides: 1, next: { inhales: 1 } },

		{ difficulty: 30, dashes: 2, slides: 1, next: { inhales: 1 } },



		{ difficulty: 3, inhales: 2 },
		{ difficulty: 115, inhales: 2, dashes: 1 },
		{ difficulty: 5, inhales: 2, stars: 1 },
		{ difficulty: 125, inhales: 2, stars: 1, dashes: 1 },
		{ difficulty: 20, inhales: 2, stars: 1, dashes: 2 },

		{ difficulty: 110, dashes: 1, next: { inhales: 2 } },
		{ difficulty: 220, dashes: 1, next: { inhales: 2, dashes: 1 } },
		{ difficulty: 110, dashes: 1, next: { inhales: 2, stars: 1 } },
		{ difficulty: 250, dashes: 1, next: { inhales: 2, stars: 1, dashes: 1 } },
		{ difficulty: 130, dashes: 1, next: { inhales: 2, stars: 1, dashes: 2 } },

		{ difficulty: 12, dashes: 2, next: { inhales: 2 } },
		{ difficulty: 130, dashes: 2, next: { inhales: 2, dashes: 1 } },
		{ difficulty: 12, dashes: 2, next: { inhales: 2, stars: 1 } },
		{ difficulty: 150, dashes: 2, next: { inhales: 2, stars: 1, dashes: 1 } },
		{ difficulty: 30, dashes: 2, next: { inhales: 2, stars: 1, dashes: 2 } },

		{ difficulty: 105, inhales: 1, dashes: 1, next: { inhales: 1 } },
		{ difficulty: 210, inhales: 1, dashes: 1, next: { inhales: 1, dashes: 1 } },
		{ difficulty: 115, inhales: 1, dashes: 1, next: { inhales: 1, dashes: 2 } },
		{ difficulty: 210, dashes: 1, next: { inhales: 1, dashes: 1, next: { inhales: 1 } } },
		{ difficulty: 115, dashes: 2, next: { inhales: 1, dashes: 1, next: { inhales: 1 } } },

		{ difficulty: 5, inhales: 1, stars: 1, next: { inhales: 1 } },
		{ difficulty: 115, inhales: 1, stars: 1, next: { inhales: 1, dashes: 1 } },
		{ difficulty: 10, inhales: 1, stars: 1, next: { inhales: 1, stars: 1 } },
		{ difficulty: 115, dashes: 1, next: { inhales: 1, dashes: 2, next: { inhales: 1 } } },
		{ difficulty: 10, dashes: 2, next: { inhales: 1, dashes: 2, next: { inhales: 1 } } },

		{ difficulty: 115, inhales: 1, stars: 1, dashes: 1, next: { inhales: 1 } },
		{ difficulty: 230, inhales: 1, stars: 1, dashes: 1, next: { inhales: 1, dashes: 1 } },
		{ difficulty: 125, inhales: 1, stars: 1, dashes: 1, next: { inhales: 1, dashes: 2 } },

		{ difficulty: 10, inhales: 1, stars: 1, dashes: 2, next: { inhales: 1 } },
		{ difficulty: 115, inhales: 1, stars: 1, dashes: 2, next: { inhales: 1, dashes: 1 } },
		{ difficulty: 20, inhales: 1, stars: 1, dashes: 2, next: { inhales: 1, dashes: 2 } },



		{ difficulty: 10, timeloss: 16, inhales: 3 },
	],
	dragonTurn2: [
		{ difficulty: 0 },
		{ difficulty: 1, stars: 1 },
		{ difficulty: 1, hammerFlips: 1 },
		{ difficulty: 1, slides: 1 },
		{ difficulty: 1, dashes: 3 },
		{ difficulty: 2, dashes: 2, stars: 1 },
		{ difficulty: 2, dashes: 2, slides: 1 },
		{ difficulty: 4, dashes: 2, hammerFlips: 1 },
		{ difficulty: 8, dashes: 5 },
		{ difficulty: 100, dashes: 1 },
		{ difficulty: 110, dashes: 1, slides: 1 },
		{ difficulty: 130, dashes: 1, hammerFlips: 1 },
	],
	dragonTurn2ForPowerManip: [
		//左右
		...[
			{ difficulty: 0 },
			{ difficulty: 1, dashes: 2 },
			{ difficulty: 1, dashes: 3 },
			{ difficulty: 1, slides: 1 },
			{ difficulty: 2, dashes: 2, slides: 1 },
			{ difficulty: 4, dashes: 4 },
			{ difficulty: 8, dashes: 5 },
			{ difficulty: 100, dashes: 1 },
			{ difficulty: 110, dashes: 1, slides: 1 },
		].flatMap(
			e => [
				{ difficulty: 0 },
				{ difficulty: 8, dashes: 2 },
				{ difficulty: 100, dashes: 1 },
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
				{ difficulty: 3, stars: 1 },
				{ difficulty: 4, slides: 1 },
				{ difficulty: 5, dashes: 3 },
				{ difficulty: 7, dashes: 2, stars: 1 },
				{ difficulty: 8, dashes: 2, slides: 1 },
				{ difficulty: 12, dashes: 3, stars: 1 },
				{ difficulty: 13, dashes: 3, slides: 1 },
				{ difficulty: 25, dashes: 2, stars: 1, slides: 1 },
				{ difficulty: 100, dashes: 1 },
				{ difficulty: 110, dashes: 1, slides: 1 },
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

// @ts-check

import {
	BattleWindowsMWWManipulator, BranchTypes,
	BattleWindowsPowerTable, BattleWindowsPowerNone,
	StarDirectionChars, StarDirectionAdvances,
	findIndexesByStars, KssRng,
	DragonGuard, DragonStar,
	FastMagicianList,
} from './rng2.mjs';

// --- 型定義 ---
/** @typedef {'en' | 'ja'} LangKey */
/** @typedef {'actionOnly' | 'withIndex' | 'withPowers' | 'withFailPowers' | 'withSimulation'} DisplayMode */
/** @typedef {import('./rng2.mjs').ActionTable} ActionTable */
/** @typedef {import('./rng2.mjs').ActionCombination} ActionCombination */
/** @typedef {import('./rng2.mjs').BattleWindowsPowersResult} BattleWindowsPowersResult */

// --- 定数 ---

/** 結果表示に必要な最小星入力数 */
const MIN_STARS_FOR_RESULT = 3;

/** テンキー→星の方向の変換 */
const NumpadToStarIndex = /** @type {Record<number, number>} */ ({ 8: 0, 9: 1, 6: 2, 3: 3, 2: 4, 1: 5, 4: 6, 7: 7 });

/** テンキーなしモード時のキーマッピング */
const NoNumpadMap = /** @type {Record<string, number>} */ ({ 'w': 8, 'e': 9, 'd': 6, 'c': 3, 'x': 2, 'z': 1, 'a': 4, 'q': 7 });

/** 設定のデフォルト値 */
const DEFAULT_SETTINGS = {
	lang: /** @type {LangKey} */ ('en'),
	min: '2800',
	max: '3376',
	magician: 'easy',
	knight: 'true',
	dragon: 'true',
	hammerThrow: '1',
	noNumpad: false,
	displayMode: /** @type {DisplayMode} */ ('actionOnly'),
	allowDragonStar: false,
};

// --- 多言語テキスト ---
/** @type {Record<string, { [K in LangKey]: string }>} */
const L = {
	langLabel: { en: 'Language:', ja: '言語:' },
	magician: { en: 'Magician:', ja: '魔法使い:' },
	knight: { en: 'Knight:', ja: '悪魔の騎士:' },
	dragon: { en: 'Dragon:', ja: 'レッドドラゴン:' },
	hammerThrow: { en: 'Hammer throw dash advances:', ja: 'ハンマー投げのダッシュ消費数:' },
	settings: { en: 'Settings', ja: '設定' },
	noNumpad: { en: 'No Numpad', ja: 'テンキーなし' },
	displayMode: { en: 'Display:', ja: '表示:' },
	displayModeActionOnly: { en: 'Manipulation only', ja: '乱数調整方法のみ' },
	displayModeIndex: { en: 'RNG index only', ja: '乱数位置のみ' },
	displayModePowers: { en: 'With Copy Essences', ja: 'コピーの元と合わせて表示' },
	displayModeFailPowers: { en: 'With fail Copy Essences', ja: '失敗時のコピーの元と合わせて表示' },
	displayModeSimulation: { en: 'With simulation', ja: 'シミュレーションと合わせて表示' },
	dragonStar: { en: 'Include Star Attack', ja: '星攻撃あり' },
	pressToStart: { en: 'Press on Numpad to start<br><span style="font-size:16px">enter: reset - backspace: go back</span>', ja: 'テンキーで入力開始<br><span style="font-size:16px">Enter: リセット - Backspace: 戻る</span>' },
	notInRange: { en: 'Not in range.', ja: '範囲内に一致する乱数がありません。' },
	rngIndex: { en: 'RNG index: ', ja: '乱数位置: ' },
	thAction: { en: 'Action', ja: '行動' },
	thBranch: { en: 'Branch', ja: '分岐' },
	noMagicianAction: { en: 'No valid action found for Magician.', ja: '魔法使いの条件に合う行動が見つかりません。' },
	noActionCombination: { en: 'No valid action combination found.', ja: '行動の組み合わせが見つかりません。' },
	test: { en: 'Analysis', ja: '分析' },
	testStars: { en: 'Stars:', ja: '星の回数:' },
	testRun: { en: 'Run', ja: '実行' },
	testUnsolvable: { en: 'Unsolvable', ja: '解決不能' },
	testBranches: { en: 'Branch', ja: '分岐' },
	thSuccessIndices: { en: 'Success', ja: '成功' },
	thMagician: { en: 'Magician', ja: '魔法使い' },
	thKnight: { en: 'Knight', ja: '悪魔の騎士' },
	thDragon: { en: 'Dragon', ja: 'レッドドラゴン' },
	thDragonTurn2: { en: 'Dragon Turn 2', ja: 'レッドドラゴン2ターン目' },
	thFailIndices: { en: 'Fail RNG', ja: '失敗乱数位置' },
	noMagicianActionCount: { en: 'No valid Magician action', ja: '魔法使いの条件に合う行動なし' },
	noActionCombinationCount: { en: 'No valid action combination', ja: '行動の組み合わせなし' },
	branchOccurrences: { en: 'Branch occurrences', ja: '分岐発生数' },
	failMagician: { en: 'Magician fail', ja: '魔法使いで失敗' },
	failKnight: { en: 'Knight fail', ja: '悪魔の騎士で失敗' },
	failDragon: { en: 'Dragon fail', ja: 'レッドドラゴンで失敗' },
	failDragonTurn2: { en: 'Dragon turn 2 fail', ja: 'レッドドラゴン2ターン目で失敗' },
	thStars: { en: 'Stars', ja: '星' },
	thEnemy: { en: 'Enemy', ja: '敵' },
	thPowers: { en: 'Copy Powers', ja: 'コピーの元' },
	thMatch: { en: 'Match (=)', ja: '一致(=)' },
	thNoMatch: { en: 'No Match (≠)', ja: '不一致(≠)' },
	thCount: { en: 'Count', ja: '件数' },
	thTotal: { en: 'Total', ja: '合計' },
	thFailTotal: { en: 'Fail Total', ja: '失敗合計' },
	thOverallTotal: { en: 'Overall Total', ja: '全体合計' },
	thItem: { en: 'Item', ja: '項目' },
	magicianActions: { en: 'Magician', ja: '魔法使い' },
	knightActions: { en: 'Knight', ja: '悪魔の騎士' },
	dragonActions: { en: 'Dragon', ja: 'レッドドラゴン' },
	dragonTurn2Actions: { en: 'Dragon Turn 2', ja: 'レッドドラゴン2ターン目' },
	defaultSettings: { en: 'Default Settings', ja: 'デフォルト設定' },
	thTiming: { en: 'Timing', ja: 'タイミング' },
	thSmoke: { en: 'Smoke', ja: '煙' },
	thKirbyFirst: { en: 'Kirby 1st', ja: 'カービィ先制' },
	thHardHitCheck: { en: 'Hard Hit Check', ja: 'ハードヒット判定' },
	thPowersCheck: { en: 'Powers Check', ja: 'コピーの元判定' },
	thHardHit: { en: 'Hard Hit', ja: 'ハードヒット' },
};

/** @type {LangKey} */
let lang = /** @type {LangKey} */ (navigator.language?.startsWith('ja') ? 'ja' : 'en');

/** 多言語テキストの取得
 * @param {string} key
 * @returns {string} */
function t(key) { return L[key]?.[lang] || L[key]?.en || key; }

// --- 状態 ---
/** @type {number[]} */
let stars = [];

// --- DOM要素 ---
const el = {
	starBoxes: /** @type {HTMLElement} */ (document.getElementById('star-boxes')),
	status: /** @type {HTMLElement} */ (document.getElementById('status-message')),
	result: /** @type {HTMLElement} */ (document.getElementById('result-area')),
	min: /** @type {HTMLInputElement} */ (document.getElementById('min')),
	max: /** @type {HTMLInputElement} */ (document.getElementById('max')),
	difficultyMagician: /** @type {HTMLSelectElement} */ (document.getElementById('difficulty-magician')),
	difficultyKnight: /** @type {HTMLSelectElement} */ (document.getElementById('difficulty-knight')),
	difficultyDragon: /** @type {HTMLSelectElement} */ (document.getElementById('difficulty-dragon')),
	allowDragonStar: /** @type {HTMLInputElement} */ (document.getElementById('allow-dragon-star')),
	displayMode: /** @type {HTMLSelectElement} */ (document.getElementById('display-mode')),
	noNumpad: /** @type {HTMLInputElement} */ (document.getElementById('no-numpad')),
	lang: /** @type {HTMLSelectElement} */ (document.getElementById('lang')),
	testResult: /** @type {HTMLElement} */ (document.getElementById('test-result')),
	testRunBtn: /** @type {HTMLButtonElement} */ (document.getElementById('test-run-btn')),
	testStars: /** @type {HTMLInputElement} */ (document.getElementById('test-stars')),
	btnDefaultSettings: /** @type {HTMLButtonElement} */ (document.getElementById('btn-default-settings')),
	settingsArea: /** @type {HTMLElement} */ (document.querySelector('.settings-area')),
};

// --- 星ボックスの描画 ---
function renderStarBoxes() {
	el.starBoxes.innerHTML = '';
	for (let i = 0; i < 6; i++) {
		const box = document.createElement('span');
		box.className = 'star-box' + (i < stars.length ? ' filled' : '');
		box.textContent = i < stars.length ? StarDirectionChars[stars[i]] : String(i + 1);
		el.starBoxes.appendChild(box);
	}
}

// --- 設定値の取得 ---
function getSettings() {
	return {
		minIndex: parseInt(el.min.value, 10) || 2800,
		maxIndex: parseInt(el.max.value, 10) || 3376,
		magicianDifficulty: el.difficultyMagician.value,
		fastKnight: el.difficultyKnight.value === 'false',
		fastDragon: el.difficultyDragon.value === 'false',
		allowDragonStar: el.allowDragonStar.checked,
		hammerThrow: parseInt(/** @type {HTMLInputElement} */ (document.querySelector('input[name="hammer-throw"]:checked')).value, 10),
		displayMode: /** @type {DisplayMode} */ (el.displayMode.value),
	};
}

// --- コピーの元の画像タグ（Noneも表示する） ---
/** @param {string} powerName */
function powerImg(powerName) {
	return `<img src="images/abilities/${powerName.toLowerCase()}.png" title="${powerName}">`;
}

// --- 分岐の観測値を左右のコピーの元画像として表示 ---
/** @param {string} type @param {string} val */
function formatBranchPowers(type, val) {
	if (type.endsWith('Powers')) {
		const [left, right] = val.split(' ');
		return powerImg(left) + ' ' + powerImg(right);
	}
	if (type.endsWith('Left')) {
		return powerImg(val) + ' ?';
	}
	if (type.endsWith('Right')) {
		return '? ' + powerImg(val);
	}
	return String(val);
}

// --- メッセージの取得（言語切替対応） ---
/** @param {ActionTable | null} [actionObj] */
function msg(actionObj) {
	if (!actionObj) return lang === 'ja' ? '待機' : 'Wait';
	const a = [];
	if (actionObj.lateAdvances !== undefined) {
		if (actionObj.slides) a.push(lang === 'ja' ? ["", "最速スライディング", "準速スライディング"][actionObj.lateAdvances] : ["", "Optimal Slide", "Sub-optimal Slide"][actionObj.lateAdvances]);
		if (actionObj.lateAdvances <= 0) a.push(actionObj.name ?? "");
	} else {
		if (actionObj.dashes) a.push(lang === 'ja' ? ["", "短ダッシュ", "ダッシュ", "長ダッシュ"][actionObj.dashes] : ["", "Short Dash", "Dash", "Long Dash"][actionObj.dashes]);
		if (actionObj.stars) a.push(lang === 'ja' ? ["", "星", "2星"][actionObj.stars] : ["", "Star", "2 Stars"][actionObj.stars]);
		if (actionObj.hammerFlips) a.push(lang === 'ja' ? ["", "鬼殺し", "2鬼殺し"][actionObj.hammerFlips] : ["", "Flip", "2 Flips"][actionObj.hammerFlips]);
		if (actionObj.slides) a.push(lang === 'ja' ? ["", "スライディング", "2スライディング"][actionObj.slides] : ["", "Slide", "2 Slides"][actionObj.slides]);
	}
	return a.length ? a.join(" & ") : (lang === 'ja' ? "待機" : "Wait");
}

// --- 敵の画像パス ---
const EnemyImages = [
	'images/magician.png',
	'images/knight.png',
	'images/dragon.png',
	'images/dragonshield.png',
];

// --- 画像のプリロード ---
// 初回表示時に一瞬遅れるのを防ぐために、事前に画像を読み込ませておく
function preloadImages() {
	EnemyImages.forEach(src => {
		const img = new Image();
		img.src = src;
	});
	new Image().src = 'images/dragonstars.png';
	[...new Set(BattleWindowsPowerTable), BattleWindowsPowerNone].forEach(name => {
		const img = new Image();
		img.src = `images/abilities/${name.toLowerCase()}.png`;
	});
}
preloadImages();

// --- 到着乱数位置の表示 ---
/** @param {Uint16Array} starIndices 星消費後の乱数位置 */
function renderRngIndices(starIndices) {
	const starsAdvances = stars.length * StarDirectionAdvances;
	const arrivalIndices = Array.from(starIndices).map(idx => idx - starsAdvances);
	el.status.innerHTML = t('rngIndex') + arrivalIndices.join(', ');
}

// --- Fast魔法使いタイミング詳細テーブル ---
/** @param {Uint16Array} starIndices */
function renderTimingTable(starIndices) {
	const starsAdvances = stars.length * StarDirectionAdvances;
	let html = '';
	for (const index of starIndices) {
		const arrivalIndex = index - starsAdvances;
		html += `<div style="margin-top: 15px;"><b>${t('rngIndex')}${arrivalIndex}</b>`;
		html += `<table class="test-table" style="font-size: 14px"><thead><tr>
			<th>${t('thTiming')}</th>
			<th>${t('thStars')}<br>(+${starsAdvances})</th>
			<th>${t('thSmoke')}</th>
			<th>${t('thKirbyFirst')}<br>(+1)</th>
			<th>${t('thSmoke')}</th>
			<th><span style="font-size: 8px">${t('thHardHitCheck')}</span><br>(+1)</th>
			<th>${t('thPowersCheck')}</th>
			<th><span style="font-size: 8px">${t('thHardHitCheck')}</span><br>(+1)</th>
			<th><span style="font-size: 8px">${t('thHardHit')}</span><br>(+9)</th>
			<th>${t('thSmoke')}<br>(+2)</th>
		</tr></thead><tbody>`;

		/** @type {Record<string, string>} */
		const s = { true: '<b style="color: green">✓</b>', false: '<b style="color: red">✕</b>'};
		const timings = FastMagicianList.map(v => {
			const row = /** @type {{ name: string|undefined, advances1: number|null, advances2: number|null, magicianAttacksFirst: boolean, magicianAttacksFirstEndingIndex: number|null, hardHitCheck: boolean, hardHitCheckEndingIndex: number|null, powers: {left:string, right:string, startingIndex:number, endingIndex:number}|null, endingIndex: number|null }} */ ({ name: v.name, advances1: null, advances2: null, magicianAttacksFirst: false, magicianAttacksFirstEndingIndex: null, hardHitCheck: false, hardHitCheckEndingIndex: null, powers: null, endingIndex: null });
			let lastIndex = index;
			const rng = new KssRng(index).withProxy(({startingIndex, endingIndex, p, result}) => {
				switch (p) {
				case 'magicianAttacksFirst': 
					row.magicianAttacksFirst = result;
					row.magicianAttacksFirstEndingIndex = endingIndex;
					row.advances1 = startingIndex - lastIndex;
					break;
				case 'checkHammerHardHit': 
					row.hardHitCheck = result;
					row.hardHitCheckEndingIndex = endingIndex;
					if (v.earlyHardHitCheck) row.advances2 = startingIndex - lastIndex;
					break;
				case 'battleWindowsPowers':
					row.powers = { ...result, startingIndex, endingIndex };
					if (!v.earlyHardHitCheck) row.advances2 = startingIndex - lastIndex;
					break;
				default:
					return;
				}
				lastIndex = endingIndex;
			});
			rng.simulateMagician(v);
			row.endingIndex = rng.getIndex();
			return row;
		});
		for (let i = 0; i < timings.length; i++) {
			const v = FastMagicianList[i];
			const row = timings[i];

			html += `<tr>
				<td>${row.name}</td>
				<td>${index}</td>
				<td>${row.advances1 ? `+${row.advances1}` : '-'}</td>
				<td>${row.magicianAttacksFirstEndingIndex}<br>(${s[String(!row.magicianAttacksFirst)]})</td>
				<td>${row.advances2 ? `+${row.advances2}` : '-'}</td>`;

			if (i === 0 || i === 2) {
				// グループ内（i=0,1 or i=2..5）のうち先制されなかった最初の行を代表値として使う
				const groupEnd = i === 0 ? 2 : 6;
				const rep = timings.slice(i, groupEnd).find(r => r.powers !== null) ?? null;
				const span = groupEnd - i;

				// 先制判定が早い場合（earlyHardHitCheck）かどうかはグループ内共通なのでvから参照
				const hh1 = v.earlyHardHitCheck && rep ? `${rep.hardHitCheckEndingIndex}<br>(${s[String(rep.hardHitCheck)]})` : '-';
				const hh2 = !v.earlyHardHitCheck && rep ? `${rep.hardHitCheckEndingIndex}<br>(${s[String(rep.hardHitCheck)]})` : '-';
				const powersStr = rep && rep.powers
					? `+${rep.powers.endingIndex - rep.powers.startingIndex}<br>${rep.powers.endingIndex}<br>${powerImg(rep.powers.left)} ${powerImg(rep.powers.right)}`
					: '-';
				const hhSmoke = rep && rep.hardHitCheck && rep.endingIndex !== null ? `${rep.endingIndex - 2}` : '-';
				const finishSmoke = rep ? `${rep.endingIndex}` : '-';

				html += `<td rowspan="${span}">${hh1}</td>
				<td rowspan="${span}">${powersStr}</td>
				<td rowspan="${span}">${hh2}</td>
				<td rowspan="${span}">${hhSmoke}</td>
				<td rowspan="${span}">${finishSmoke}</td>`;
			}
			html += `</tr>`;
		}
		html += `</tbody></table></div>`;
	}

	const div = document.createElement('div');
	div.innerHTML = html;
	el.result.appendChild(div);
}

// --- メイン行動テーブル ---
/**
 * @param {any} result manipulate()の結果
 * @param {Uint16Array} starIndices
 * @param {ReturnType<typeof getSettings>} settings
 * @param {boolean} showPowers コピーの元列を表示するか
 * @param {boolean} showFailPowers 操作ミス時のコピーの元も表示するか
 */
function renderMainResultTable({ magician, actionCombination, branch }, starIndices, settings, showPowers, showFailPowers) {
	const hasBranch = branch !== null;

	// 分岐がある場合、どの敵のターンで観測するか (simIndex)
	// simIndex 0 = 魔法使い後, 1 = 悪魔の騎士後, 2 = レッドドラゴン後
	const branchSimIndex = hasBranch ? BranchTypes[/** @type {keyof typeof BranchTypes} */ (branch.type)].minSimLength - 1 : -1;

	// 各候補乱数ごとのシミュレーションデータ（コピーの元表示時のみ計算）
	/** @type {{ arrivalIndex: number, sim: any[] }[]} */
	let arrivalSims = [];
	if (showPowers) {
		arrivalSims = Array.from(starIndices).map(index => {
			let chosenActionCombination = actionCombination;
			if (hasBranch) {
				const tempSim = new KssRng(index).simulateBattleWindowsMWW(magician, actionCombination, settings.hammerThrow, settings.allowDragonStar);
				const bt = BranchTypes[/** @type {keyof typeof BranchTypes} */ (branch.type)];
				if (tempSim.length >= bt.minSimLength && bt.getObservable({ sim: tempSim }) === branch.value) {
					chosenActionCombination = branch.fallbackActionCombination;
				}
			}
			let dragonAction = null;
			/** @type {number[]} */
			let powersIndices = [];
			const rng = new KssRng(index).withProxy(({startingIndex, p, result}) => {
				if (p === 'dragonActs') dragonAction = result;
				if (p === 'battleWindowsPowers') powersIndices.push(startingIndex);
			});
			// 動的プロパティ(startingIndex, dragonAction)を追加するため any[] にキャスト
			const sim = /** @type {any[]} */ (rng.simulateBattleWindowsMWW(magician, chosenActionCombination, settings.hammerThrow, settings.allowDragonStar));
			for (let i = 0; i < sim.length; i++) {
				sim[i].startingIndex = powersIndices[i];
			}
			if (sim[3]) sim[3].dragonAction = dragonAction;

			return {
				arrivalIndex: index - stars.length * StarDirectionAdvances,
				sim
			};
		});
	}

	// テーブル構築
	const table = document.createElement('table');
	table.className = 'result-table';

	// ヘッダー
	const thead = document.createElement('thead');
	let headerHtml = `<tr><th></th><th>${t('thAction')}</th>`;
	if (hasBranch) headerHtml += `<th>${t('thBranch')}</th>`;
	for (const s of arrivalSims) {
		headerHtml += `<th>${s.arrivalIndex}</th>`;
	}
	headerHtml += '</tr>';
	thead.innerHTML = headerHtml;
	table.appendChild(thead);

	const tbody = document.createElement('tbody');

	// 各ターンの行データ
	// [0]=magician, [1]=knight, [2]=dragon, [3]=dragonAction
	const mainActions = [magician, actionCombination.knight, actionCombination.dragon, actionCombination.dragonAction];
	const fallbackActions = hasBranch
		? /** @type {(ActionTable|null)[]} */ ([null, branch.fallbackActionCombination.knight, branch.fallbackActionCombination.dragon, branch.fallbackActionCombination.dragonAction])
		: null;

	for (let i = 0; i < 4; i++) {
		const tr = document.createElement('tr');
		let html = '';

		// 敵の画像
		html += `<td class="enemy-cell"><img src="${EnemyImages[i]}"></td>`;

		// メイン行動
		html += `<td>${msg(mainActions[i])}</td>`;

		// 分岐列
		if (hasBranch) {
			if (i === branchSimIndex) {
				// この行で観測が行われる → コピーの元を表示
				html += `<td>${formatBranchPowers(branch.type, branch.value)}</td>`;
			} else if (i > branchSimIndex && fallbackActions?.[i]) {
				// 観測後の行 → 分岐先の行動を表示
				html += `<td>${msg(/** @type {ActionTable} */ (fallbackActions[i]))}</td>`;
			} else {
				html += '<td></td>';
			}
		}

		// 各乱数ごとのコピーの元
		for (const s of arrivalSims) {
			const p = s.sim[i];
			html += '<td>';
			if (p) {
				html += `${powerImg(p.left)} ${powerImg(p.right)}`;

				// Fastモードでの操作ミス時（ハードヒット判定がコピーの元判定の後になった場合）のコピーの元
				if (showFailPowers && ((i === 1 && settings.fastKnight) || (i === 2 && settings.fastDragon))) {
					// 本来より1つ前のインデックスからコピーの元判定が始まる
					const failRng = new KssRng(p.startingIndex - 1);
					const failPowers = failRng.battleWindowsPowers();
					html += `<span style="opacity: 0.5;">(${powerImg(failPowers.left)} ${powerImg(failPowers.right)})</span>`;
				}

				if (i === 3 && settings.allowDragonStar) {
					// レッドドラゴン2ターン目で星攻撃ありの場合はレッドドラゴンの行動画像も表示
					const dragonImg = p.dragonAction === DragonGuard ? 'images/dragonshield.png' : 'images/dragonstars.png';
					html += ` <img src="${dragonImg}" style="height:1em;">`;
				}
			}
			html += '</td>';
		}

		tr.innerHTML = html;
		tbody.appendChild(tr);
	}

	table.appendChild(tbody);
	el.result.appendChild(table);
}

// --- 結果表示（表示モードに応じてレンダー関数を呼び分ける） ---
function displayResult() {
	el.result.innerHTML = '';
	el.status.innerHTML = '';

	if (stars.length < MIN_STARS_FOR_RESULT) {
		el.status.innerHTML = t('pressToStart');
		return;
	}

	const settings = getSettings();
	const starIndices = findIndexesByStars(stars, settings.minIndex, settings.maxIndex);

	if (starIndices.length === 0) {
		el.status.innerHTML = t('notInRange');
		return;
	}

	const mode = settings.displayMode;

	// 乱数位置のみ: 到着インデックスだけ表示して終了
	if (mode === 'withIndex') {
		renderRngIndices(starIndices);
		return;
	}

	// manipulate は全候補を同時に考慮して1つの結果を返す
	const manipulator = new BattleWindowsMWWManipulator(/** @type {any} */ (settings));
	const result = manipulator.manipulate(stars);

	if (result.magician === null) {
		el.result.innerHTML = `<p>${t('noMagicianAction')}</p>`;
		return;
	}
	if (result.actionCombination === null) {
		el.result.innerHTML = `<p>${t('noActionCombination')}</p>`;
		return;
	}

	// 表示モードに応じたフラグ
	const showPowers = mode !== 'actionOnly';
	const showFailPowers = mode === 'withFailPowers' || mode === 'withSimulation';

	renderMainResultTable(/** @type {any} */ (result), starIndices, settings, showPowers, showFailPowers);

	// シミュレーションモードかつ魔法使いがFastの場合のみタイミングテーブルを追加
	if (mode === 'withSimulation' && settings.magicianDifficulty !== 'easy') {
		renderTimingTable(starIndices);
	}
}

// --- 入力リセット ---
function resetInputs() {
	stars = [];
	renderStarBoxes();
	el.result.innerHTML = '';
	el.status.innerHTML = t('pressToStart');
}

// --- テスト関数 ---
const BranchEnemyNames = {
	magician: { en: 'Magician', ja: '魔法使い' },
	knight: { en: 'Knight', ja: '悪魔の騎士' },
	dragon: { en: 'Dragon', ja: 'レッドドラゴン' },
};

/** @param {string} type */
function branchTypeToEnemy(type) {
	if (type.startsWith('magician')) return BranchEnemyNames.magician[lang];
	if (type.startsWith('knight')) return BranchEnemyNames.knight[lang];
	if (type.startsWith('dragon')) return BranchEnemyNames.dragon[lang];
	return type;
}

async function runTest() {
	const starsCount = parseInt(el.testStars.value, 10) || 3;
	const settings = getSettings();

	// UIを実行中状態に
	el.testRunBtn.disabled = true;
	el.testRunBtn.textContent = '0%';

	// ジェネレーターを用いて処理を細切れにし、UIをブロックしないようにする
	let time = performance.now();
	const manipulator = new BattleWindowsMWWManipulator(/** @type {any} */ (settings));
	for (const result of manipulator.testGenerator(starsCount)) {
		if (result.count === result.total) {
			renderTestResult(result, el.testResult); // 結果を表示
			break;
		}
		const newTime = performance.now();
		if (newTime - time > 30) {
			time = newTime;
			el.testRunBtn.textContent = `${Math.floor(result.count / result.total * 100)}%`; // 進捗を表示
			await new Promise(r => setTimeout(r, 0)); // イベントループに制御を返す
		}
	}

	// UIを復元
	el.testRunBtn.disabled = false;
	el.testRunBtn.textContent = t('testRun');
}

/** @param {any} result @param {HTMLElement} testResultEl */
function renderTestResult(result, testResultEl) {
	let html = '';

	// 解決不能
	const unsolvableEntries = Object.entries(result.simulationGroups).filter(([, group]) => group.hasFail);
	if (unsolvableEntries.length > 0) {
		html += `<b>${t('testUnsolvable')}</b>`;
		html += `<table class="test-table"><thead><tr>`;
		html += `<th>${t('thStars')}</th><th>${t('thSuccessIndices')}</th>`;
		html += `<th>${t('thMagician')}</th><th>${t('thKnight')}</th><th>${t('thDragon')}</th><th>${t('thDragonTurn2')}</th>`;
		html += `</tr></thead><tbody>`;

		for (const [starStr, group] of unsolvableEntries) {
			html += '<tr>';
			html += `<td>${starStr}</td>`;
			html += `<td>${group.success.length > 0 ? group.success.join(', ') : '-'}</td>`;
			html += `<td>${group.fails[0].length > 0 ? group.fails[0].join(', ') : '-'}</td>`;
			html += `<td>${group.fails[1].length > 0 ? group.fails[1].join(', ') : '-'}</td>`;
			html += `<td>${group.fails[2].length > 0 ? group.fails[2].join(', ') : '-'}</td>`;
			html += `<td>${group.fails[3].length > 0 ? group.fails[3].join(', ') : '-'}</td>`;
			html += '</tr>';
		}

		const failTotal = result.wrongCounts[0] + result.wrongCounts[1] + result.wrongCounts[2] + result.wrongCounts[3];

		// 合計行
		html += `</tbody><tfoot>`;
		html += `<tr>`;
		html += `<th rowspan="2">${t('thCount')}</th>`;
		html += `<td rowspan="2">${result.unsolvableSuccessCount}</td>`;
		html += `<td>${result.wrongCounts[0]}</td>`;
		html += `<td>${result.wrongCounts[1]}</td>`;
		html += `<td>${result.wrongCounts[2]}</td>`;
		html += `<td>${result.wrongCounts[3]}</td>`;
		html += `</tr>`;

		// 失敗の合計
		html += `<tr>`;
		html += `<td colspan="4">${failTotal}</td>`;
		html += `</tr>`;
		html += '</tfoot></table>';
	}

	// 分岐
	const branchEntries = Object.entries(result.branchGroups);
	if (branchEntries.length > 0) {
		html += `<b>${t('testBranches')}</b>`;
		html += '<table class="test-table"><thead><tr>';
		html += `<th>${t('thStars')}</th><th>${t('thEnemy')}</th><th>${t('thPowers')}</th><th>${t('thMatch')}</th><th>${t('thNoMatch')}</th>`;
		html += '</tr></thead><tbody>';
		for (const [, g] of branchEntries) {
			html += '<tr>';
			html += `<td>${g.starStr}</td>`;
			html += `<td>${branchTypeToEnemy(g.type)}</td>`;
			html += `<td>${g.valStr}</td>`;
			html += `<td>${g.true.length > 0 ? g.true.join(', ') : '-'}</td>`;
			html += `<td>${g.false.length > 0 ? g.false.join(', ') : '-'}</td>`;
			html += '</tr>';
		}

		// 合計行
		html += `</tbody><tfoot>`;
		html += `<tr>`;
		html += `<th colspan="3" rowspan="2">${t('thCount')}</th>`;
		html += `<td>${result.totalBranchMatch}</td>`;
		html += `<td>${result.totalBranchNoMatch}</td>`;
		html += `</tr>`;
		
		html += `<tr>`;
		html += `<td colspan="2">${result.branchCount}</td>`;
		html += `</tr>`;

		html += '</tfoot></table>';
	}

	// 行動テーブル（回数降順）
	/** @param {string} title @param {Record<string, number>} countList */
	const renderActionTable = (title, countList) => {
		const sorted = Object.entries(countList).sort((a, b) => b[1] - a[1]);
		if (sorted.length === 0) return '';
		let s = `<div><b>${title}</b>`;
		s += `<table class="test-table" style="margin-top: 5px;"><thead><tr><th>${t('thAction')}</th><th>${t('thCount')}</th></tr></thead><tbody>`;
		for (const [actionJson, count] of sorted) {
			const actionObj = JSON.parse(actionJson);
			s += `<tr><td>${msg(actionObj)}</td><td>${count}</td></tr>`;
		}
		s += '</tbody></table></div>';
		return s;
	};

	html += `<div style="display: flex; gap: 20px; flex-wrap: wrap; margin-top: 15px; align-items: flex-start;">`;
	html += renderActionTable(t('magicianActions'), result.magicianCountList);
	html += renderActionTable(t('knightActions'), result.knightCountList);
	html += renderActionTable(t('dragonActions'), result.dragonCountList);
	html += renderActionTable(t('dragonTurn2Actions'), result.dragonActionCountList);
	html += `</div>`;

	testResultEl.innerHTML = html;
}

el.testRunBtn.addEventListener('click', runTest);

// --- 言語切替（data-t属性方式） ---
/** data-t属性を持つ全要素のテキストを現在の言語で更新 */
function updateTranslations() {
	document.querySelectorAll('[data-t]').forEach(elem => {
		const key = /** @type {string} */ (elem.getAttribute('data-t'));
		elem.textContent = t(key);
	});
}

/** @param {string} val */
const switchLang = function(val) {
	lang = /** @type {LangKey} */ (val);
	updateTranslations();
	if (stars.length < MIN_STARS_FOR_RESULT) el.status.innerHTML = t('pressToStart');
	else displayResult();
};

// --- キーボードイベント ---
window.addEventListener('keydown', (event) => {
	const target = /** @type {HTMLElement} */ (event.target);
	if (target.tagName?.toUpperCase() === 'INPUT' || target.tagName?.toUpperCase() === 'SELECT') return;

	const key = event.key;
	const noNumpad = el.noNumpad.checked;

	let numpadKey = null;
	if (noNumpad) {
		numpadKey = NoNumpadMap[key.toLowerCase()] || null;
	} else {
		const n = parseInt(key, 10);
		if (!Number.isNaN(n) && n !== 0 && n !== 5) numpadKey = n;
	}

	if (numpadKey !== null && NumpadToStarIndex[numpadKey] !== undefined) {
		if (stars.length < 6) {
			stars.push(NumpadToStarIndex[numpadKey]);
			renderStarBoxes();
			displayResult();
		}
	} else if (key === 'Enter') {
		resetInputs();
	} else if (key === 'Backspace') {
		if (stars.length > 0) {
			stars.pop();
			renderStarBoxes();
			displayResult();
		}
	}
}, true);

// --- 設定とローカルストレージ ---
function saveSettings() {
	const settings = {
		lang: el.lang.value,
		min: el.min.value,
		max: el.max.value,
		magician: el.difficultyMagician.value,
		knight: el.difficultyKnight.value,
		dragon: el.difficultyDragon.value,
		hammerThrow: /** @type {HTMLInputElement} */ (document.querySelector('input[name="hammer-throw"]:checked')).value,
		noNumpad: el.noNumpad.checked,
		displayMode: el.displayMode.value,
		allowDragonStar: el.allowDragonStar.checked,
	};
	localStorage.setItem('kss-rng-manipulator2', JSON.stringify(settings));
}

function loadSettings() {
	try {
		const stored = localStorage.getItem('kss-rng-manipulator2');
		if (stored) {
			const s = JSON.parse(stored);
			if (s.lang) { el.lang.value = s.lang; lang = /** @type {LangKey} */ (s.lang); }
			if (s.min) el.min.value = s.min;
			if (s.max) el.max.value = s.max;
			if (s.magician) el.difficultyMagician.value = s.magician;
			if (s.knight) el.difficultyKnight.value = s.knight;
			if (s.dragon) el.difficultyDragon.value = s.dragon;
			if (s.hammerThrow) {
				const rb = /** @type {HTMLInputElement | null} */ (document.querySelector(`input[name="hammer-throw"][value="${s.hammerThrow}"]`));
				if (rb) rb.checked = true;
			}
			if (s.noNumpad !== undefined) el.noNumpad.checked = s.noNumpad;
			// 旧設定 showArrival → displayMode へのマイグレーション
			if (s.displayMode) {
				el.displayMode.value = s.displayMode;
			} else if (s.showArrival !== undefined) {
				el.displayMode.value = s.showArrival ? 'withPowers' : 'actionOnly';
			}
			if (s.allowDragonStar !== undefined) el.allowDragonStar.checked = s.allowDragonStar;
			return true;
		}
	} catch(e) { /* localStorage が使えない場合は無視 */ }
	return false;
}

function restoreDefaultSettings() {
	el.min.value = DEFAULT_SETTINGS.min;
	el.max.value = DEFAULT_SETTINGS.max;
	el.difficultyMagician.value = DEFAULT_SETTINGS.magician;
	el.difficultyKnight.value = DEFAULT_SETTINGS.knight;
	el.difficultyDragon.value = DEFAULT_SETTINGS.dragon;
	/** @type {HTMLInputElement} */ (document.querySelector(`input[name="hammer-throw"][value="${DEFAULT_SETTINGS.hammerThrow}"]`)).checked = true;
	el.noNumpad.checked = DEFAULT_SETTINGS.noNumpad;
	el.displayMode.value = DEFAULT_SETTINGS.displayMode;
	el.allowDragonStar.checked = DEFAULT_SETTINGS.allowDragonStar;
	saveSettings();
	displayResult();
}

el.btnDefaultSettings.addEventListener('click', restoreDefaultSettings);

el.settingsArea.addEventListener('change', (e) => {
	const target = /** @type {HTMLElement} */ (e.target);
	saveSettings();
	if (target.id === 'lang') {
		switchLang(/** @type {HTMLSelectElement} */ (target).value);
	} else if (target.id !== 'no-numpad' && target.id !== 'test-stars') {
		displayResult();
	}
});

// HTMLのonchange="switchLang(this.value)"からアクセスできるようにグローバル公開
// @ts-ignore
window.switchLang = switchLang;

// --- 初期化 ---
if (!loadSettings()) {
	el.lang.value = lang; // ブラウザのデフォルト言語を反映
}
switchLang(lang); // lang変数を元にUIテキストを更新
renderStarBoxes();
el.status.innerHTML = t('pressToStart');

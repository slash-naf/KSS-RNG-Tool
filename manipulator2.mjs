// @ts-check

//　--- インポート・型定義 ---

import {
	BattleWindowsMWWManipulator,
	BattleWindowsPowerNames,
	getLeftPower, getRightPower,
	StarDirectionChars, StarDirectionAdvances,
	KssRng,
	DragonActionNames, DragonGuard, DragonStar,
	FastMagicianList,
	RngCycle,
} from './rng2.mjs';

/** @typedef {import('./rng2.mjs').RngIndex} RngIndex */
/** @typedef {import('./rng2.mjs').SimIndex} SimIndex */
/** @template T @typedef {number & {__brand: T}} ID */
/** @typedef {'en' | 'ja'} LangKey */
/** @typedef {'easiest' | 'fastest' | 'custom'} PresetMode */
/** @typedef {'withIndex' | 'actionOnly' | 'withSimulation'} DisplayMode */
/** @typedef {'none' | 'withPowers' | 'withFailPowers' | 'withTransitions'} DetailMode */
/** @typedef {'indexOnly' | 'hex' | 'split'} IndexDisplayMode */
/** @typedef {import('./rng2.mjs').MagicianDifficulty} MagicianDifficulty */
/** @typedef {import('./rng2.mjs').ActionTable} ActionTable */
/** @typedef {import('./rng2.mjs').ActionCombination} ActionCombination */
/** @typedef {import('./rng2.mjs').PowerName} PowerName */
/** @typedef {import('./rng2.mjs').BattleWindowsPowersPair} BattleWindowsPowersPair */
/** @typedef {import('./rng2.mjs').DragonAction} DragonAction */
/** @typedef {import('./rng2.mjs').Branch} Branch */
/** @typedef {import('./rng2.mjs').ManipulateResult} ManipulateResult */
/** @typedef {'easy' | 'fast'} DifficultyMode */

/** 
 * ユーザー独自のカスタム設定
 * @typedef {{
 *   min: string,
 *   max: string,
 *   magician: MagicianDifficulty,
 *   knight: DifficultyMode,
 *   dragon: DifficultyMode,
 *   allowDragonStar: boolean,
 *   hammerThrow: string
 * }} CustomState
 */

/**
 * 保存される設定の全体像
 * @typedef {CustomState & {
 *   lang: LangKey,
 *   preset: PresetMode,
 *   noNumpad: boolean,
 *   displayMode: DisplayMode,
 *   detailMode: DetailMode,
 *   indexDisplayMode: IndexDisplayMode
 * }} SavedSettings
 */

//　--- 定数・初期状態 ---

/** 結果表示を開始するために必要な最小の星入力数 */
const MIN_STARS_FOR_RESULT = 3;

/** テンキーの数値（1-9）から星の方向インデックス（0-7）への変換マップ */
const NumpadToStarIndex = /** @type {Record<number, number>} */ ({ 8: 0, 9: 1, 6: 2, 3: 3, 2: 4, 1: 5, 4: 6, 7: 7 });

/** テンキーなしのキーマッピング */
const NoNumpadMap = /** @type {Record<string, number>} */ ({ 'w': 8, 'e': 9, 'd': 6, 'c': 3, 'x': 2, 'z': 1, 'a': 4, 'q': 7 });

/** アプリケーションのデフォルト設定値 */
/** @type {SavedSettings} */
const DEFAULT_SETTINGS = {
	preset: 'custom',
	lang: 'en',
	min: '2800',
	max: '3376',
	magician: 'easy',
	knight: 'easy',
	dragon: 'easy',
	hammerThrow: '1',
	noNumpad: false,
	displayMode: 'actionOnly',
	detailMode: 'none',
	indexDisplayMode: 'indexOnly',
	allowDragonStar: false,
};

/** ユーザーが「Custom」モードで編集・維持する独自設定のスロット */
/** @type {CustomState} */
let customState = {
	min: DEFAULT_SETTINGS.min,
	max: DEFAULT_SETTINGS.max,
	magician: DEFAULT_SETTINGS.magician,
	knight: DEFAULT_SETTINGS.knight,
	dragon: DEFAULT_SETTINGS.dragon,
	allowDragonStar: DEFAULT_SETTINGS.allowDragonStar,
	hammerThrow: DEFAULT_SETTINGS.hammerThrow,
};

/** 各プリセットモードに対応する固定設定値 */
/** @type {Record<Exclude<PresetMode, 'custom'>, CustomState>} */
const PRESETS = {
	easiest: { min: '2800', max: '3376', magician: 'easy', knight: 'easy', dragon: 'easy', allowDragonStar: true, hammerThrow: '2' },
	fastest: { min: '2750', max: '3161', magician: 'aggressiveFast', knight: 'fast', dragon: 'fast', allowDragonStar: false, hammerThrow: '1' },
};

/** 画像アセットのパス定義 */
const Assets = {
	enemies: [
		'images/magician.png',
		'images/knight.png',
		'images/dragon.png',
		'images/dragonshield.png',
	],
	/** @type {Record<ID<DragonAction>, string>} */
	dragonActions: { [DragonGuard]: 'images/dragonshield.png', [DragonStar]: 'images/dragonstars.png' },
	/** @param {PowerName} name */
	ability: (name) => `images/abilities/${name.toLowerCase()}.png`,
};

// --- 多言語テキスト ---

/** 言語リソース辞書 */
const L = {
	langLabel: { en: 'Language:', ja: '言語:' },
	preset: { en: 'Preset:', ja: 'プリセット:' },
	presetEasiest: { en: 'Easiest', ja: 'Easiest' },
	presetFastest: { en: 'Fastest', ja: 'Fastest' },
	presetCustom: { en: 'Custom', ja: 'Custom' },
	magician: { en: 'Magician:', ja: '魔法使い:' },
	knight: { en: 'Knight:', ja: '悪魔の騎士:' },
	dragon: { en: 'Dragon:', ja: 'レッドドラゴン:' },
	hammerThrow: { en: 'Hammer throw dash advances:', ja: 'ハンマー投げのダッシュ消費数:' },
	settings: { en: 'Settings', ja: '設定' },
	noNumpad: { en: 'No Numpad', ja: 'テンキーなし' },
	displayMode: { en: 'View Type:', ja: '表示の種類:' },
	displayModeIndex: { en: 'RNG index only', ja: '乱数位置のみ' },
	displayModeAction: { en: 'Manipulation method', ja: '乱数調整方法' },
	displayModeSimulation: { en: 'With Fast Magician simulation', ja: '魔法使いのFastのシミュレーションとともに表示' },
	detailMode: { en: 'Extra Info:', ja: '追加情報:' },
	detailModeNone: { en: 'None', ja: 'なし' },
	detailModePowers: { en: 'With Copy Essences', ja: 'コピーの元と合わせて表示' },
	detailModeFailPowers: { en: 'With fail Copy Essences', ja: '失敗時のコピーの元と合わせて表示' },
	detailModeTransitions: { en: 'With RNG Transitions', ja: '乱数位置の推移と合わせて表示' },
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
	thTiming: { en: 'Timing', ja: 'タイミング' },
	thSmoke: { en: 'Smoke', ja: '煙' },
	thAttacksFirst: { en: '1st Attack', ja: '先制' },
	thHardHitCheck: { en: 'Hard Hit Check', ja: 'ハードヒット判定' },
	thPowersCheck: { en: 'Powers Check', ja: 'コピーの元判定' },
	thHardHit: { en: 'Hard Hit', ja: 'ハードヒット' },
	indexDisplayMode: { en: 'RNG Index Format:', ja: '乱数位置の表示形式:' },
	indexDisplayModeIndexOnly: { en: 'Only RNG Index', ja: '乱数位置のみ' },
	indexDisplayModeHex: { en: 'With Hex RNG Value', ja: '16進数の乱数値を併記' },
	indexDisplayModeSplit: { en: 'With Split RNG Value', ja: '分割した乱数値を併記' },
	actionWait: { en: 'Wait', ja: '待機' },
	actionOptimalSlide: { en: 'Optimal Slide', ja: '最速スライディング' },
	actionSubOptimalSlide: { en: 'Sub-optimal Slide', ja: '準速スライディング' },
	actionShortDash: { en: 'Short Dash', ja: '短ダッシュ' },
	actionDash: { en: 'Dash', ja: 'ダッシュ' },
	actionLongDash: { en: 'Long Dash', ja: '長ダッシュ' },
	actionStar: { en: 'Star', ja: '星' },
	action2Stars: { en: '2 Stars', ja: '2星' },
	actionFlip: { en: 'Flip', ja: '鬼殺し' },
	action2Flips: { en: '2 Flips', ja: '2鬼殺し' },
	actionSlide: { en: 'Slide', ja: 'スライディング' },
	action2Slides: { en: '2 Slides', ja: '2スライディング' },
	enemyMagician: { en: 'Magician', ja: '魔法使い' },
	enemyKnight: { en: 'Knight', ja: '悪魔の騎士' },
	enemyDragon: { en: 'Dragon', ja: 'レッドドラゴン' },
	enemyDragonTurn2: { en: 'Dragon Turn 2', ja: 'レッドドラゴン2ターン目' },
	logAction: { en: 'Action', ja: '行動' },
	logAttacksFirst: { en: '1st Attack', ja: '先制' },
	logHardHit: { en: 'Hard Hit Check', ja: 'ハードヒット判定' },
};

/** 現在選択されている言語コード */
/** @type {LangKey} */
let lang = /** @type {LangKey} */ (navigator.language?.startsWith('ja') ? 'ja' : 'en');

/** 指定されたキーに対応する翻訳テキストを取得する */
function t(/** @type {keyof typeof L} */ key) {
	return L[key]?.[lang] ?? L[key]?.en ?? key;
}

/** data-t属性を持つ全要素のテキストを現在の言語で更新する */
function updateTranslations() {
	document.querySelectorAll('[data-t]').forEach(elem => {
		const key = /** @type {keyof typeof L} */ (elem.getAttribute('data-t'));
		elem.textContent = t(key);
	});
}

/** 言語を切り替えてUIを再描画する
 * @param {string} val */
function switchLang(val) {
	lang = /** @type {LangKey} */ (val);
	updateTranslations();
	if (stars.length < MIN_STARS_FOR_RESULT) {
		el.status.innerHTML = t('pressToStart');
	} else {
		displayResult();
	}
}

// --- アプリケーション状態・DOM要素 ---

/** ユーザーが入力した星の方向履歴（0〜7の数値配列） */
/** @type {number[]} */
let stars = [];

/**
 * DOM要素を取得し型を検証する（失敗時は例外を投げる）
 * @template {HTMLElement} T
 * @param {string} id
 * @param {new () => T} type
 * @returns {T}
 */
const $ = (id, type) => {
	const e = document.getElementById(id);
	if (!(e instanceof type)) throw new Error(id);
	return e;
};

/** HTML内の各DOM要素への参照まとめ */
const el = {
	starBoxes: $('star-boxes', HTMLElement),
	status: $('status-message', HTMLElement),
	result: $('result-area', HTMLElement),
	min: $('min', HTMLInputElement),
	max: $('max', HTMLInputElement),
	difficultyMagician: $('difficulty-magician', HTMLSelectElement),
	difficultyKnight: $('difficulty-knight', HTMLSelectElement),
	difficultyDragon: $('difficulty-dragon', HTMLSelectElement),
	allowDragonStar: $('allow-dragon-star', HTMLInputElement),
	displayMode: $('display-mode', HTMLSelectElement),
	detailMode: $('detail-mode', HTMLSelectElement),
	indexDisplayMode: $('index-display-mode', HTMLSelectElement),
	noNumpad: $('no-numpad', HTMLInputElement),
	lang: $('lang', HTMLSelectElement),
	preset: $('preset', HTMLSelectElement),
	testResult: $('test-result', HTMLElement),
	testRunBtn: $('test-run-btn', HTMLButtonElement),
	testStars: $('test-stars', HTMLInputElement),
	hammerThrow: $('hammer-throw', HTMLSelectElement),
	settingsArea: /** @type {HTMLElement} */ (document.querySelector('.settings-area') || document.body),
};

/** プリセットによって上書き・ロックの対象となるUI要素のマップ */
/** @type {Record<keyof CustomState, HTMLInputElement | HTMLSelectElement>} */
const presetTargetElements = {
	min: el.min,
	max: el.max,
	magician: el.difficultyMagician,
	knight: el.difficultyKnight,
	dragon: el.difficultyDragon,
	allowDragonStar: el.allowDragonStar,
	hammerThrow: el.hammerThrow,
};

// --- 設定・ストレージ管理 ---

/** 現在のUI項目からシミュレーターに渡すための設定オブジェクトを生成する */
function getSettings() {
	return {
		minIndex: parseInt(el.min.value, 10) || 2800,
		maxIndex: parseInt(el.max.value, 10) || 3376,
		magicianDifficulty: /** @type {MagicianDifficulty} */ (el.difficultyMagician.value),
		fastKnight: el.difficultyKnight.value === 'fast',
		fastDragon: el.difficultyDragon.value === 'fast',
		allowDragonStar: el.allowDragonStar.checked,
		hammerThrow: parseInt(el.hammerThrow.value, 10),
		displayMode: /** @type {DisplayMode} */ (el.displayMode.value),
		detailMode: /** @type {DetailMode} */ (el.detailMode.value),
		indexDisplayMode: /** @type {IndexDisplayMode} */ (el.indexDisplayMode.value),
	};
}

/** プリセットに応じてUI項目の編集可否を切り替える
 * @param {boolean} locked */
function setPresetLockedState(locked) {
	for (const element of Object.values(presetTargetElements)) {
		element.disabled = locked;
	}
}

/** ロック対象となっているUI項目から現在の設定値を一括取得する
 * @returns {CustomState} */
function getLockedFieldsFromUI() {
	const state = /** @type {any} */ ({});
	for (const [key, element] of Object.entries(presetTargetElements)) {
		state[key] = element.type === 'checkbox' ? element.checked : element.value;
	}
	return state;
}

/** 指定された設定値をUI項目に一括反映する
 * @param {CustomState} config */
function setLockedFieldsToUI(config) {
	for (const [key, element] of /** @type {[keyof CustomState, any][]} */(Object.entries(presetTargetElements))) {
		const value = config[key];
		if (typeof value === 'boolean') {
			element.checked = value;
		} else {
			element.value = value;
		}
	}
}

/** プリセットの選択状態に合わせてUIの表示とロック状態を更新する */
function applyPresetUI() {
	const p = /** @type {PresetMode} */ (el.preset.value);
	// Easiest/Fastestなら固定値を、Customなら保存されている独自設定を反映
	setLockedFieldsToUI(p === 'custom' ? customState : PRESETS[p]);
	// Custom以外は編集できないようにロック
	setPresetLockedState(p !== 'custom');
}

/** 現在のUI状態をLocal Storageに永続化する */
function saveSettings() {
	const p = /** @type {PresetMode} */ (el.preset.value);

	// Customモード時のみ、現在のUIの値を独自設定スロット（customState）に記録する
	if (p === 'custom') {
		customState = getLockedFieldsFromUI();
	}

	/** @type {SavedSettings} */
	const settings = {
		lang: /** @type {LangKey} */ (el.lang.value),
		preset: p,
		...customState, // ロック対象の設定は、Customの時のみUIから取得し、それ以外は内部のcustomStateを維持して保存

		noNumpad: el.noNumpad.checked,
		displayMode: /** @type {DisplayMode} */ (el.displayMode.value),
		detailMode: /** @type {DetailMode} */ (el.detailMode.value),
		indexDisplayMode: /** @type {IndexDisplayMode} */ (el.indexDisplayMode.value),
	};
	localStorage.setItem('kss-rng-manipulator2', JSON.stringify(settings));
}

/** Local Storageから設定を読み込みUIに反映する
 * @returns {boolean} 読み込みに成功したか */
function loadSettings() {
	try {
		const stored = localStorage.getItem('kss-rng-manipulator2');
		if (stored) {
			const s = /** @type {SavedSettings} */ (JSON.parse(stored));
			if (s.lang) { el.lang.value = s.lang; lang = s.lang; }
			if (s.preset) el.preset.value = s.preset;
			
			// --- Customスロットの値を復元 ---
			if (s.min) customState.min = s.min;
			if (s.max) customState.max = s.max;
			if (s.magician) customState.magician = s.magician;

			// 旧バージョンからのマイグレーション ("true" → "easy"、"false" → "fast" など)
			const migrateDifficulty = (/**@type {string}*/val) => /**@type {DifficultyMode}*/ ({'true': 'easy', 'false': 'fast'}[val] ?? val);
			if (s.knight) customState.knight = migrateDifficulty(s.knight);
			if (s.dragon) customState.dragon = migrateDifficulty(s.dragon);

			if (s.hammerThrow !== undefined) customState.hammerThrow = s.hammerThrow;
			if (s.allowDragonStar !== undefined) customState.allowDragonStar = s.allowDragonStar;

			// --- 他の基本設定を復元 ---
			if (s.noNumpad !== undefined) el.noNumpad.checked = s.noNumpad;

			// showArrival → displayMode へのマイグレーション (旧仕様互換)
			if (s.displayMode) {
				el.displayMode.value = s.displayMode;
			} else if (/** @type {any} */(s).showArrival !== undefined) {
				el.displayMode.value = /** @type {any} */(s).showArrival ? 'withSimulation' : 'actionOnly';
				el.detailMode.value = /** @type {any} */(s).showArrival ? 'withFailPowers' : 'none';
			}
			if (s.detailMode) el.detailMode.value = s.detailMode;
			if (s.indexDisplayMode) el.indexDisplayMode.value = s.indexDisplayMode;
			
			// UIへの最終反映（ロック制御含む）
			applyPresetUI();
			return true;
		}
	} catch(e) {
		// localStorage が使えない環境（プライベートブラウズ等）では無視
	}
	return false;
}

// --- UI描画ユーティリティ ---

/** HTMLの <img> タグ文字列を生成する
 * @param {string} src 画像パス
 * @param {string} [title] ツールチップテキスト
 * @param {string} [style] 追加CSSスタイル */
function img(src, title = '', style = '') {
	return `<img src="${src}"${title ? ` title="${title}"` : ''}${style ? ` style="${style}"` : ''}>`;
}

/** 指定されたコピーの元ペア（BattleWindowsPowersPair）の画像タグ群を生成する
 * @param {BattleWindowsPowersPair} p
 * @param {string} [style] */
function formatPowers(p, style = '') {
	const left = BattleWindowsPowerNames[getLeftPower(p)];
	const right = BattleWindowsPowerNames[getRightPower(p)];
	return img(Assets.ability(left), left, style) + ' ' + img(Assets.ability(right), right, style);
}

/** 乱数インデックスを表示設定（Hex, Split等）に合わせて整形する
 * @param {number} index */
function formatIndex(index) {
	const mode = /** @type {IndexDisplayMode} */ (el.indexDisplayMode.value);
	const value = RngCycle[index];
	switch (mode) {
		case 'hex': return `${index} (0x${value.toString(16)})`;
		case 'split': return `${index} [${value & 0xFF}, ${value >>> 8}]`;
		default: return String(index);
	}
}

/** 行動テーブルの内容を翻訳テキストと画像を用いて説明文字列に変換する
 * @param {ActionTable} action */
function msg({ dashes, slides, hammerFlips, stars, lateAdvances, name }) {
	const result = [];
	if (lateAdvances !== undefined) {
		if (lateAdvances <= 0) result.push(name);
		else if (slides) result.push([, t('actionOptimalSlide'), t('actionSubOptimalSlide')][lateAdvances]);
	} else {
		if (dashes) result.push([, t('actionShortDash'), t('actionDash'), t('actionLongDash')][dashes]);
		if (stars) result.push([, t('actionStar'), t('action2Stars')][stars]);
		if (hammerFlips) result.push([, t('actionFlip'), t('action2Flips')][hammerFlips]);
		if (slides) result.push([, t('actionSlide'), t('action2Slides')][slides]);
	}
	return result.length ? result.join(' & ') : t('actionWait');
}

/** 真偽値を絵文字アイコンに変換する */
function boolMsg(/** @type {boolean} */ b) {
	return b ? '✅' : '❌';
}

/** SimIndexを対応する敵の名前に変換する
 * @param {SimIndex} simIndex */
function branchIndexToEnemy(simIndex) {
	return [
		t('enemyMagician'),
		t('enemyKnight'),
		t('enemyDragon'),
		t('enemyDragonTurn2'),
	][simIndex] ?? String(simIndex);
}

/** 現在入力されている星の数に合わせた星ボックスUIを更新する */
function renderStarBoxes() {
	el.starBoxes.innerHTML = '';
	for (let i = 0; i < 6; i++) {
		const box = document.createElement('span');
		box.className = 'star-box' + (i < stars.length ? ' filled' : '');
		box.textContent = i < stars.length ? StarDirectionChars[stars[i]] : String(i + 1);
		el.starBoxes.appendChild(box);
	}
}

/** 入力履歴とUI表示をクリアし、初期状態に戻す */
function resetInputs() {
	stars = [];
	renderStarBoxes();
	el.result.innerHTML = '';
	el.status.innerHTML = t('pressToStart');
}

// --- 乱数計算と結果表示 ---

/** 星消費後の「到着乱数位置」を整形してステータス欄に表示する
 * @param {RngIndex[]} starIndices */
function renderRngIndices(starIndices) {
	const arrivalIndices = Array.from(starIndices).map(idx => KssRng.getArrivalIndex(idx, stars.length));
	el.status.innerHTML = t('rngIndex') + arrivalIndices.map(v => formatIndex(v)).join(', ');
}

/** Fast魔法使いの1行分のシミュレーション結果 */
/** @typedef {{ name: string|undefined, advances1: number|null, advances2: number|null, magicianAttacksFirst: boolean, magicianAttacksFirstEndingIndex: number|null, hardHitCheck: boolean, hardHitCheckEndingIndex: number|null, powers: {pair:BattleWindowsPowersPair, powersStartingIndex:RngIndex, powersEndingIndex:RngIndex}|null, endingIndex: number|null }} TimingRow */

/** Fast魔法使いのタイミング詳細テーブルを描画する
 * @param {RngIndex[]} starIndices */
function renderTimingTable(starIndices) {
	const starsAdvances = stars.length * StarDirectionAdvances;
	let html = '';
	for (const index of starIndices) {
		const arrivalIndex = KssRng.getArrivalIndex(index, stars.length);
		html += `<div style="margin-top: 15px;"><b>${t('rngIndex')}${formatIndex(arrivalIndex)}</b>`;
		html += `<table class="test-table" style="font-size: 14px"><thead><tr>
			<th>${t('thTiming')}</th>
			<th>${t('thStars')}<br>(+${starsAdvances})</th>
			<th>${t('thSmoke')}</th>
			<th>${t('thAttacksFirst')}<br>(+1)</th>
			<th>${t('thSmoke')}</th>
			<th><span style="font-size: 8px">${t('thHardHitCheck')}</span><br>(+1)</th>
			<th>${t('thPowersCheck')}</th>
			<th><span style="font-size: 8px">${t('thHardHitCheck')}</span><br>(+1)</th>
			<th><span style="font-size: 8px">${t('thHardHit')}</span><br>(+9)</th>
			<th>${t('thSmoke')}<br>(+2)</th>
		</tr></thead><tbody>`;

		const timings = FastMagicianList.map(v => {
			const row = /** @type {TimingRow} */ ({ name: v.name, advances1: null, advances2: null, magicianAttacksFirst: false, magicianAttacksFirstEndingIndex: null, hardHitCheck: false, hardHitCheckEndingIndex: null, powers: null, endingIndex: null });
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
					row.powers = { pair: result, powersStartingIndex: startingIndex, powersEndingIndex: endingIndex };
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
				<td>${row.name ?? '-'}</td>
				<td>${formatIndex(index)}</td>
				<td>${row.advances1 ? `+${row.advances1}` : '-'}</td>
				<td>${boolMsg(!row.magicianAttacksFirst)}${row.magicianAttacksFirstEndingIndex !== null ? formatIndex(row.magicianAttacksFirstEndingIndex) : '-'}</td>
				<td>${row.advances2 ? `+${row.advances2}` : '-'}</td>`;

			if (i === 0 || i === 2) {
				// グループ内（i=0,1 or i=2..5）のうち先制されなかった最初の行を代表値として使う
				const groupEnd = i === 0 ? 2 : 6;
				const rep = timings.slice(i, groupEnd).find(r => r.powers !== null) ?? null;
				const span = groupEnd - i;

				// 先制判定が早い場合（earlyHardHitCheck）かどうかはグループ内共通なのでvから参照
				const hh1 = v.earlyHardHitCheck && rep && rep.hardHitCheckEndingIndex !== null ? `${boolMsg(rep.hardHitCheck)}${formatIndex(rep.hardHitCheckEndingIndex)}` : '-';
				const hh2 = !v.earlyHardHitCheck && rep && rep.hardHitCheckEndingIndex !== null ? `${boolMsg(rep.hardHitCheck)}${formatIndex(rep.hardHitCheckEndingIndex)}` : '-';
				const powersStr = rep && rep.powers
					? `+${rep.powers.powersEndingIndex - rep.powers.powersStartingIndex}<br>${formatIndex(rep.powers.powersEndingIndex)}<br>${formatPowers(rep.powers.pair)}`
					: '-';
				const hhSmoke = rep && rep.hardHitCheck && rep.endingIndex !== null ? `${formatIndex(rep.endingIndex - 2)}` : '-';
				const finishSmoke = rep && rep.endingIndex !== null ? `${formatIndex(rep.endingIndex)}` : '-';

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

/** 全体の行動手順テーブル（魔法使い〜レッドドラゴン2ターン目）を描画する
 * @param {ActionTable} magician 魔法使い行動
 * @param {ActionCombination} actionCombination 行動組み合わせ
 * @param {Branch | null} branch 分岐情報
 * @param {RngIndex[]} starIndices 候補となる乱数位置リスト
 * @param {ReturnType<typeof getSettings>} settings 現在の設定 */
function renderMainResultTable(magician, actionCombination, branch, starIndices, settings) {
	const detailMode = settings.detailMode;
	const showPowers = detailMode === 'withPowers' || detailMode === 'withFailPowers';
	const showFailPowers = detailMode === 'withFailPowers';
	const showTransitions = detailMode === 'withTransitions';
	const hasBranch = branch !== null;

	// 分岐がある場合、どの敵のターンで観測するか (simIndex)
	// simIndex 0 = 魔法使い後, 1 = 悪魔の騎士後, 2 = レッドドラゴン後
	const branchSimIndex = hasBranch ? branch.simIndex : -1;

	/** @typedef {{ pair: BattleWindowsPowersPair, powersStartingIndex: RngIndex, log: string }} SimEntry */
	/** @typedef {{ arrivalIndex: RngIndex, sim: SimEntry[], dragonAction?: ID<DragonAction> }} ArrivalSim */

	// 各候補乱数ごとのシミュレーションデータ（詳細表示時のみ計算）
	/** @type {ArrivalSim[]} */
	let arrivalSims = [];
	if (showPowers || showTransitions) {
		arrivalSims = Array.from(starIndices).map(index => {
			/** @type {ID<DragonAction> | undefined} */
			let dragonAction;
			let chosenActionCombination = actionCombination;
			if (hasBranch) {
				const tempSim = new KssRng(index).simulateBattleWindowsMWW(magician, actionCombination, settings.hammerThrow, settings.allowDragonStar);
				if (tempSim.length > branch.simIndex && tempSim[branch.simIndex] === branch.value) {
					chosenActionCombination = branch.fallbackActionCombination;
				}
			}
			/** @type {RngIndex[]} */
			const powersIndices = [];
			/** @type {string[]} */
			const logs = [];
			const rng = new KssRng(index).withProxy(({startingIndex, endingIndex, p, result, args}) => {
				switch (p) {
					case 'takeAction': {
						logs.push(`${t('logAction')}: ${formatIndex(startingIndex)}&rArr;${formatIndex(endingIndex)}`);
						break;
					}
					case 'magicianAttacksFirst':
					case 'knightAttacksFirst':
					case 'dragonAttacksFirst': {
						/** @type {boolean} */
						const a = !result;
						logs[logs.length - 1] += `<br>${boolMsg(a)}${t('logAttacksFirst')}: ${formatIndex(endingIndex)}`;
						break;
					}
					case 'checkHammerHardHit': {
						/** @type {boolean} */
						const a = result;
						logs[logs.length - 1] += `<br>${boolMsg(a)}${t('logHardHit')}: ${formatIndex(endingIndex)}`;
						break;
					}
					case 'battleWindowsPowers': {
						/** @type {BattleWindowsPowersPair} */
						const a = result;
						logs[logs.length - 1] += `<br>${formatPowers(a, 'height:16px;')}: ${formatIndex(startingIndex)}&rArr;${formatIndex(endingIndex)}`;

						powersIndices.push(startingIndex);
						break;
					}
					case 'dragonActs': {
						/** @type {ID<DragonAction>} */
						const a = result;
						logs[logs.length - 1] += `<br>${img(Assets.dragonActions[a], DragonActionNames[a], 'height:1em;')}: ${formatIndex(endingIndex)}`;

						dragonAction = a;
						break;
					}
				}
			});
			const simRaw = rng.simulateBattleWindowsMWW(magician, chosenActionCombination, settings.hammerThrow, settings.allowDragonStar);
			const sim = simRaw.map((entry, i) => ({ pair: entry, powersStartingIndex: powersIndices[i] ?? /** @type {RngIndex} */(0), log: logs[i] ?? '' }));

			return {
				arrivalIndex: KssRng.getArrivalIndex(index, stars.length),
				sim, dragonAction,
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
		headerHtml += `<th>${formatIndex(s.arrivalIndex)}</th>`;
	}
	headerHtml += '</tr>';
	thead.innerHTML = headerHtml;
	table.appendChild(thead);

	const tbody = document.createElement('tbody');

	// 各ターンの行データ [0]=magician, [1]=knight, [2]=dragon, [3]=dragonTurn2
	const mainActions = [magician, actionCombination.knight, actionCombination.dragon, actionCombination.dragonAction];
	const fallbackActions = hasBranch
		? /** @type {(ActionTable|null)[]} */ ([null, branch.fallbackActionCombination.knight, branch.fallbackActionCombination.dragon, branch.fallbackActionCombination.dragonAction])
		: null;

	for (let i = 0; i < 4; i++) {
		const tr = document.createElement('tr');
		let html = '';

		// 敵の画像
		html += `<td class="enemy-cell">${img(Assets.enemies[i])}</td>`;

		// メイン行動
		html += `<td>${msg(mainActions[i])}</td>`;

		// 分岐列
		if (hasBranch) {
			if (i === branchSimIndex) {
				// この行で観測が行われる → コピーの元を表示
				html += `<td>${formatPowers(branch.value)}</td>`;
			} else if (i > branchSimIndex && fallbackActions?.[i]) {
				// 観測後の行 → 分岐先の行動を表示
				html += `<td>${msg(/** @type {ActionTable} */ (fallbackActions[i]))}</td>`;
			} else {
				html += '<td></td>';
			}
		}

		// 各乱数ごとの詳細情報
		for (const s of arrivalSims) {
			const p = s.sim[i];
			html += '<td>';
			if (p !== undefined) {
				if (showTransitions) {
					// 乱数位置の推移
					html += '<span style="font-size: 12px;">';
					html += p.log;
					html += '</span>';
				} else if (showPowers) {
					html += formatPowers(p.pair);

					// Fastモードでの操作ミス時（ハードヒット判定がコピーの元判定の後になった場合）のコピーの元を表示
					if (showFailPowers && ((i === 1 && settings.fastKnight) || (i === 2 && settings.fastDragon))) {
						// 本来より1つ前のインデックスからコピーの元判定が始まる
						const failRng = new KssRng(p.powersStartingIndex);
						failRng.advance(-1);
						const failPowers = failRng.battleWindowsPowers();
						html += `<span style="opacity: 0.5;">(${formatPowers(failPowers)})</span>`;
					}

					if (i === 3 && settings.allowDragonStar) {
						// レッドドラゴン2ターン目で星攻撃ありの場合はレッドドラゴンの行動画像も表示
						if (s.dragonAction !== undefined) {
							html += ' ' + img(Assets.dragonActions[s.dragonAction], DragonActionNames[s.dragonAction], 'height:1em;');
						}
					}
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

/** 現在の入力状況と設定に基づき、乱数調整結果を画面に表示する */
function displayResult() {
	el.result.innerHTML = '';
	el.status.innerHTML = '';

	if (stars.length < MIN_STARS_FOR_RESULT) {
		el.status.innerHTML = t('pressToStart');
		return;
	}

	const settings = getSettings();
	const starIndices = KssRng.findIndicesByStars(stars, settings.minIndex, settings.maxIndex);

	if (starIndices.length === 0) {
		el.status.innerHTML = t('notInRange');
		return;
	}

	const mode = settings.displayMode;

	// 乱数位置のみ表示モード
	if (mode === 'withIndex') {
		renderRngIndices(starIndices);
		return;
	}

	// 乱数調整シミュレーション実行
	const manipulator = new BattleWindowsMWWManipulator(settings);
	const result = manipulator.manipulate(stars);

	if (result.magician === null) {
		el.result.innerHTML = `<p>${t('noMagicianAction')}</p>`;
		return;
	}
	if (result.actionCombination === null) {
		el.result.innerHTML = `<p>${t('noActionCombination')}</p>`;
		return;
	}

	// メイン結果テーブルの描画
	renderMainResultTable(result.magician, result.actionCombination, result.branch, starIndices, settings);

	// シミュレーション付き表示かつ魔法使いがFastの場合のみタイミングテーブルを追加
	if (mode === 'withSimulation' && settings.magicianDifficulty !== 'easy') {
		renderTimingTable(starIndices);
	}
}

// --- 分析・テスト機能 ---

/** 指定された星の数で発生しうる全パターンを分析する */
async function runTest() {
	const starsCount = parseInt(el.testStars.value, 10) || 3;
	const settings = getSettings();

	// UIを実行中状態に更新
	el.testRunBtn.disabled = true;
	el.testRunBtn.textContent = '0%';
	el.testResult.innerHTML = '';

	// ジェネレーターを用いて処理を分割実行し、ブラウザのフリーズを防ぐ
	let time = performance.now();
	const manipulator = new BattleWindowsMWWManipulator(settings);
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

/** 分析結果のデータ型 */
/** @typedef {ReturnType<BattleWindowsMWWManipulator['test']>} AnalysisResult */

/** 分析結果（成功/失敗/分岐統計）をテーブル形式で描画する
 * @param {AnalysisResult} result
 * @param {HTMLElement} testResultEl */
function renderTestResult(result, testResultEl) {
	if (result === undefined) return;
	let html = '';

	// --- 解決不能（失敗）パターンの表示 ---
	const unsolvableEntries = Array.from(result.simulationGroups.entries()).filter(([, group]) => group.hasFail);
	if (unsolvableEntries.length > 0) {
		html += `<b>${t('testUnsolvable')}</b>`;
		html += `<table class="test-table"><thead><tr>`;
		html += `<th>${t('thStars')}</th><th>${t('thSuccessIndices')}</th>`;
		html += `<th>${t('thMagician')}</th><th>${t('thKnight')}</th><th>${t('thDragon')}</th><th>${t('thDragonTurn2')}</th>`;
		html += `</tr></thead><tbody>`;

		for (const [starStr, g] of unsolvableEntries) {
			html += '<tr>';
			html += `<td>${starStr}</td>`;
			html += `<td>${g.success.length > 0 ? g.success.map(v => formatIndex(v)).join(', ') : '-'}</td>`;
			html += `<td>${g.fails[0].length > 0 ? g.fails[0].map(v => formatIndex(v)).join(', ') : '-'}</td>`;
			html += `<td>${g.fails[1].length > 0 ? g.fails[1].map(v => formatIndex(v)).join(', ') : '-'}</td>`;
			html += `<td>${g.fails[2].length > 0 ? g.fails[2].map(v => formatIndex(v)).join(', ') : '-'}</td>`;
			html += `<td>${g.fails[3].length > 0 ? g.fails[3].map(v => formatIndex(v)).join(', ') : '-'}</td>`;
			html += '</tr>';
		}

		const failTotal = result.wrongCounts[0] + result.wrongCounts[1] + result.wrongCounts[2] + result.wrongCounts[3];

		html += `</tbody><tfoot><tr>`;
		html += `<th rowspan="2">${t('thCount')}</th>`;
		html += `<td rowspan="2">${result.unsolvableSuccessCount}</td>`;
		html += `<td>${result.wrongCounts[0]}</td>`;
		html += `<td>${result.wrongCounts[1]}</td>`;
		html += `<td>${result.wrongCounts[2]}</td>`;
		html += `<td>${result.wrongCounts[3]}</td>`;
		html += `</tr><tr>`;
		html += `<td colspan="4">${failTotal}</td>`;
		html += `</tr></tfoot></table>`;
	}

	// --- 分岐パターンの統計表示 ---
	const branchEntries = Array.from(result.branchGroups.entries());
	if (branchEntries.length > 0) {
		html += `<b>${t('testBranches')}</b>`;
		html += '<table class="test-table"><thead><tr>';
		html += `<th>${t('thStars')}</th><th>${t('thEnemy')}</th><th>${t('thPowers')}</th><th>${t('thMatch')}</th><th>${t('thNoMatch')}</th>`;
		html += '</tr></thead><tbody>';
		for (const [starStr, g] of branchEntries) {
			html += '<tr>';
			html += `<td>${starStr}</td>`;
			html += `<td>${branchIndexToEnemy(g.simIndex)}</td>`;
			html += `<td>${formatPowers(g.value, 'height:1em;')}</td>`;
			html += `<td>${g.true.length > 0 ? g.true.map(v => formatIndex(v)).join(', ') : '-'}</td>`;
			html += `<td>${g.false.length > 0 ? g.false.map(v => formatIndex(v)).join(', ') : '-'}</td>`;
			html += '</tr>';
		}

		html += `</tbody><tfoot><tr>`;
		html += `<th colspan="3" rowspan="2">${t('thCount')}</th>`;
		html += `<td>${result.totalBranchMatch}</td>`;
		html += `<td>${result.totalBranchNoMatch}</td>`;
		html += `</tr><tr>`;
		html += `<td colspan="2">${result.branchCount}</td>`;
		html += `</tr></tfoot></table>`;
	}

	// --- 採用された各行動の頻度統計 ---
	/** @param {string} title @param {Map<ActionTable, number>} countList */
	const renderActionTable = (title, countList) => {
		if (countList.size === 0) return '';
		const sorted = Array.from(countList.entries()).sort((a, b) => b[1] - a[1]);
		let s = `<div><b>${title}</b>`;
		s += `<table class="test-table" style="margin-top: 5px;"><thead><tr><th>${t('thAction')}</th><th>${t('thCount')}</th></tr></thead><tbody>`;
		for (const [actionObj, count] of sorted) {
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

// --- イベントリスナー・初期化処理 ---

/** キーボードによる星入力イベントの処理 */
window.addEventListener('keydown', (e) => {
	const target = /** @type {HTMLElement} */ (e.target);
	// 入力フィールド（input/select）にフォーカスがある場合は無視
	if (target.tagName?.toUpperCase() === 'INPUT' || target.tagName?.toUpperCase() === 'SELECT') {
		return;
	}

	const key = e.key;
	const noNumpad = el.noNumpad.checked;

	let numpadKey = null;
	if (noNumpad) {
		numpadKey = NoNumpadMap[key.toLowerCase()] || null;
	} else {
		const n = parseInt(key, 10);
		if (!Number.isNaN(n) && n !== 0 && n !== 5) {
			numpadKey = n;
		}
	}

	if (numpadKey !== null && NumpadToStarIndex[numpadKey] !== undefined) {
		// 星の入力（最大6回まで）
		if (stars.length < 6) {
			stars.push(NumpadToStarIndex[numpadKey]);
			renderStarBoxes();
			displayResult();
		}
	} else if (key === 'Enter') {
		// リセット
		resetInputs();
	} else if (key === 'Backspace') {
		// 1つ戻る
		if (stars.length > 0) {
			stars.pop();
			renderStarBoxes();
			displayResult();
		}
	}
}, true);

/** 設定変更イベントの処理 */
el.settingsArea.addEventListener('change', (e) => {
	const target = /** @type {HTMLElement} */ (e.target);
	
	// プリセット変更時の挙動
	if (target.id === 'preset') {
		applyPresetUI();
	}
	
	// 設定の保存
	saveSettings();

	// 言語変更、またはシミュレーション関連設定の変更に応じた再描画
	if (target.id === 'lang') {
		switchLang(/** @type {HTMLSelectElement} */ (target).value);
	} else if (target.id !== 'no-numpad' && target.id !== 'test-stars') {
		displayResult();
	}
});

/** 分析実行ボタンのイベント登録 */
el.testRunBtn.addEventListener('click', runTest);

/** 言語切り替えのイベント登録 */
el.lang.addEventListener('change', (e) => {
	const target = /** @type {HTMLSelectElement} */ (e.target);
	switchLang(target.value);
});

// --- 初期化実行 ---

/** 全画像アセットのプリロード（ブラウザキャッシュへの読み込み） */
function preloadImages() {
	[
		...Assets.enemies,
		...Object.values(Assets.dragonActions),
		...BattleWindowsPowerNames.map(Assets.ability),
	].forEach(src => {
		const imgObj = new Image();
		imgObj.src = src;
	});
}
preloadImages();

// 設定の読み込み（LocalStorageに保存されていなければデフォルト値を適用）
if (!loadSettings()) {
	el.lang.value = lang; // ブラウザのデフォルト言語を反映
}

// 言語設定に基づきUIテキストを初回更新
switchLang(lang);

// 星ボックスの初期状態を描画
renderStarBoxes();

// ステータス欄を待機メッセージで初期化
el.status.innerHTML = t('pressToStart');

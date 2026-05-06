import {
	BattleWindowsMWWManipulator, BranchTypes,
	BattleWindowsPowerTable, BattleWindowsPowerNone,
	StarDirectionChars, findIndexesByStars, KssRng,
	DragonGuard, DragonStar,
	FastMagicianList,
} from './rng2.mjs';

// --- テンキー→星の方向の変換 ---
const NumpadToStarIndex = { 8: 0, 9: 1, 6: 2, 3: 3, 2: 4, 1: 5, 4: 6, 7: 7 };
const NoNumpadMap = { 'w': 8, 'e': 9, 'd': 6, 'c': 3, 'x': 2, 'z': 1, 'a': 4, 'q': 7 };

// --- 多言語テキスト ---
const L = {
	en: {
		langLabel: 'Language:',
		magician: 'Magician:',
		knight: 'Knight:',
		dragon: 'Dragon:',
		hammerThrow: 'Hammer throw dash advances:',
		settings: 'Settings',
		noNumpad: 'No Numpad',
		showArrival: 'Show arrival RNG index and Copy Essences',
		dragonStar: 'Include Star Attack',
		pressToStart: 'Press on Numpad to start<br><span style="font-size:16px">enter: reset - backspace: go back</span>',
		notInRange: 'Not in range.',
		rngIndex: 'RNG index: ',
		thAction: 'Action',
		thBranch: 'Branch',
		noMagicianAction: 'No valid action found for Magician.',
		noActionCombination: 'No valid action combination found.',
		test: 'Analysis',
		testStars: 'Stars:',
		testRun: 'Run',
		testUnsolvable: 'Unsolvable',
		testBranches: 'Branch',
		thSuccessIndices: 'Success',
		thMagician: 'Magician',
		thKnight: 'Knight',
		thDragon: 'Dragon',
		thDragonTurn2: 'Dragon Turn 2',
		thFailIndices: 'Fail RNG',
		noMagicianActionCount: 'No valid Magician action',
		noActionCombinationCount: 'No valid action combination',
		branchOccurrences: 'Branch occurrences',
		failMagician: 'Magician fail',
		failKnight: 'Knight fail',
		failDragon: 'Dragon fail',
		failDragonTurn2: 'Dragon turn 2 fail',
		thStars: 'Stars',
		thEnemy: 'Enemy',
		thPowers: 'Copy Powers',
		thMatch: 'Match (=)',
		thNoMatch: 'No Match (≠)',
		thCount: 'Count',
		thTotal: 'Total',
		thFailTotal: 'Fail Total',
		thOverallTotal: 'Overall Total',
		thItem: 'Item',
		magicianActions: 'Magician',
		knightActions: 'Knight',
		dragonActions: 'Dragon',
		dragonTurn2Actions: 'Dragon Turn 2',
		defaultSettings: 'Default Settings',
		thTiming: 'Timing',
		thSmoke: 'Smoke',
		thKirbyFirst: 'Kirby 1st',
		thHardHitCheck: 'Hard Hit Check',
		thPowersCheck: 'Powers Check',
		thHardHit: 'Hard Hit',
	},
	ja: {
		langLabel: '言語:',
		magician: '魔法使い:',
		knight: '悪魔の騎士:',
		dragon: 'レッドドラゴン:',
		hammerThrow: 'ハンマー投げのダッシュ消費数:',
		settings: '設定',
		noNumpad: 'テンキーなし',
		showArrival: '到着時の乱数位置とコピーの元を表示',
		dragonStar: '星攻撃あり',
		pressToStart: 'テンキーで入力開始<br><span style="font-size:16px">Enter: リセット - Backspace: 戻る</span>',
		notInRange: '範囲内に一致する乱数がありません。',
		rngIndex: '乱数位置: ',
		thAction: '行動',
		thBranch: '分岐',
		noMagicianAction: '魔法使いの条件に合う行動が見つかりません。',
		noActionCombination: '行動の組み合わせが見つかりません。',
		test: '分析',
		testStars: '星の回数:',
		testRun: '実行',
		testUnsolvable: '解決不能',
		testBranches: '分岐',
		thSuccessIndices: '成功',
		thMagician: '魔法使い',
		thKnight: '悪魔の騎士',
		thDragon: 'レッドドラゴン',
		thDragonTurn2: 'レッドドラゴン2ターン目',
		thFailIndices: '失敗乱数位置',
		noMagicianActionCount: '魔法使いの条件に合う行動なし',
		noActionCombinationCount: '行動の組み合わせなし',
		branchOccurrences: '分岐発生数',
		failMagician: '魔法使いで失敗',
		failKnight: '悪魔の騎士で失敗',
		failDragon: 'レッドドラゴンで失敗',
		failDragonTurn2: 'レッドドラゴン2ターン目で失敗',
		thStars: '星',
		thEnemy: '敵',
		thPowers: 'コピーの元',
		thMatch: '一致(=)',
		thNoMatch: '不一致(≠)',
		thCount: '件数',
		thTotal: '合計',
		thFailTotal: '失敗合計',
		thOverallTotal: '全体合計',
		thItem: '項目',
		magicianActions: '魔法使い',
		knightActions: '悪魔の騎士',
		dragonActions: 'レッドドラゴン',
		dragonTurn2Actions: 'レッドドラゴン2ターン目',
		defaultSettings: 'デフォルト設定',
		thTiming: 'タイミング',
		thSmoke: '煙',
		thKirbyFirst: 'カービィ先制',
		thHardHitCheck: 'ハードヒット判定',
		thPowersCheck: 'コピーの元判定',
		thHardHit: 'ハードヒット',
	}
};

let lang = (navigator.language || navigator.userLanguage).startsWith('ja') ? 'ja' : 'en';
function t(key) { return L[lang][key] || L.en[key] || key; }

// --- 状態 ---
let stars = [];

// --- DOM ---
const starBoxesEl = document.getElementById('star-boxes');
const statusEl = document.getElementById('status-message');
const resultEl = document.getElementById('result-area');

// --- 星ボックスの描画 ---
function renderStarBoxes() {
	starBoxesEl.innerHTML = '';
	for (let i = 0; i < 6; i++) {
		const box = document.createElement('span');
		box.className = 'star-box' + (i < stars.length ? ' filled' : '');
		box.textContent = i < stars.length ? StarDirectionChars[stars[i]] : (i + 1);
		starBoxesEl.appendChild(box);
	}
}

// --- 設定値の取得 ---
function getSettings() {
	return {
		minIndex: parseInt(document.getElementById('min').value, 10) || 2800,
		maxIndex: parseInt(document.getElementById('max').value, 10) || 3376,
		magicianDifficulty: document.getElementById('difficulty-magician').value,
		fastKnight: document.getElementById('difficulty-knight').value === 'false',
		fastDragon: document.getElementById('difficulty-dragon').value === 'false',
		allowDragonStar: document.getElementById('allow-dragon-star').checked,
		hammerThrow: parseInt(document.querySelector('input[name="hammer-throw"]:checked').value, 10),
	};
}

// --- コピーの元の画像タグ（Noneも表示する） ---
function powerImg(powerName) {
	return `<img src="images/abilities/${powerName.toLowerCase()}.png" title="${powerName}">`;
}

// --- 分岐の観測値を左右のコピーの元画像として表示 ---
function formatBranchPowers(type, val) {
	if (type.endsWith('Powers')) {
		const [left, right] = val.split('-');
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

// --- 結果表示 ---
function displayResult() {
	resultEl.innerHTML = '';
	statusEl.innerHTML = '';

	if (stars.length < 3) {
		statusEl.innerHTML = t('pressToStart');
		return;
	}

	const settings = getSettings();
	const manipulator = new BattleWindowsMWWManipulator(settings);

	// 到着時の乱数位置（星消費前）を計算
	const starIndices = findIndexesByStars(stars, settings.minIndex, settings.maxIndex);

	if (starIndices.length === 0) {
		statusEl.innerHTML = t('notInRange');
		return;
	}

	// 到着時の乱数位置の表示（設定がオンの場合のみ）
	const showArrival = document.getElementById('show-arrival-index').checked;
	let extraHtml = '';
	if (showArrival) {
		const starsAdvances = stars.length * 2;
		const arrivalIndices = Array.from(starIndices).map(idx => idx - starsAdvances);
		statusEl.innerHTML = t('rngIndex') + arrivalIndices.join(', ');

		// 魔法使いがFastの場合の各タイミングのシミュレーション結果
		if (settings.magicianDifficulty !== 'easy') {
			for (const index of starIndices) {
				const arrivalIndex = index - stars.length * 2;
				extraHtml += `<div style="margin-top: 15px;"><b>${t('rngIndex')}${arrivalIndex}</b>`;
				extraHtml += `<table class="test-table" style="font-size: 14px"><thead><tr>
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

				const s = { true: '<b style="color: green">✓</b>', false: '<b style="color: red">✕</b>'}
				const timings = FastMagicianList.map(v => {
					const row = { name: v.name, advances1: null, advances2: null, magicianAttacksFirst: false, magicianAttacksFirstEndingIndex: null, hardHitCheck: false, hardHitCheckEndingIndex: null, powers: null, endingIndex: null };
					const rng = new KssRng(index).withProxy(({startingIndex, endingIndex, p, result}) => {
						if (p === 'magicianAttacksFirst') {
							row.magicianAttacksFirst = result;
							row.magicianAttacksFirstEndingIndex = endingIndex;
							row.advances1 = startingIndex - index;
						}
						if (p === 'checkHammerHardHit') {
							row.hardHitCheck = result;
							row.hardHitCheckEndingIndex = endingIndex;
							if (v.earlyHardHitCheck) row.advances2 = startingIndex - row.magicianAttacksFirstEndingIndex;
						}
						if (p === 'battleWindowsPowers') {
							row.powers = { ...result, startingIndex, endingIndex };
							if (!v.earlyHardHitCheck) row.advances2 = startingIndex - row.magicianAttacksFirstEndingIndex;
						}
					});
					rng.simulateMagician(v);
					row.endingIndex = rng.getIndex();
					if (row.advances2 === null) row.advances2 = v.lateAdvances > 0 ? v.lateAdvances : 0;
					return row;
				});
				for (let i = 0; i < timings.length; i++) {
					const v = FastMagicianList[i];
					const row = timings[i];
					const hh1 = v.earlyHardHitCheck ? `${row.hardHitCheckEndingIndex}<br>(${s[row.hardHitCheck]})` : '-';
					const hh2 = !v.earlyHardHitCheck ? `${row.hardHitCheckEndingIndex}<br>(${s[row.hardHitCheck]})` : '-';
					const powersAdvances = row.powers.endingIndex - row.powers.startingIndex;
					const powersStr = `+${powersAdvances}<br>${row.powers.endingIndex}<br>${powerImg(row.powers.left)} ${powerImg(row.powers.right)}`;
					const hhSmoke = row.hardHitCheck ? `${row.endingIndex - 2}` : '-';
					const finishSmoke = `${row.endingIndex}`;
					
					extraHtml += `<tr>
						<td>${row.name}</td>
						<td>${index}</td>
						<td>${row.advances1 ? `+${row.advances1}` : '-'}</td>
						<td>${row.magicianAttacksFirstEndingIndex}<br>(${s[!row.magicianAttacksFirst]})</td>
						<td>${row.advances2 ? `+${row.advances2}` : '-'}</td>`;
						
					if (i === 0) {
						extraHtml += `<td rowspan="2">${hh1}</td>
						<td rowspan="2">${powersStr}</td>
						<td rowspan="2">${hh2}</td>
						<td rowspan="2">${hhSmoke}</td>
						<td rowspan="2">${finishSmoke}</td>`;
					} else if (i === 2) {
						extraHtml += `<td rowspan="4">${hh1}</td>
						<td rowspan="4">${powersStr}</td>
						<td rowspan="4">${hh2}</td>
						<td rowspan="4">${hhSmoke}</td>
						<td rowspan="4">${finishSmoke}</td>`;
					}
					extraHtml += `</tr>`;
				}
				extraHtml += `</tbody></table></div>`;
			}
		}
	}

	// manipulate は全候補を同時に考慮して1つの結果を返す
	const result = manipulator.manipulate(stars);

	if (result.magician === null) {
		resultEl.innerHTML = `<p>${t('noMagicianAction')}</p>`;
		return;
	}
	if (result.actionCombination === null) {
		resultEl.innerHTML = `<p>${t('noActionCombination')}</p>`;
		return;
	}

	const { magician, actionCombination, branch } = result;
	const hasBranch = branch !== null;

	// 分岐がある場合、どの敵のターンで観測するか (simIndex)
	// simIndex 0 = 魔法使い後, 1 = 悪魔の騎士後, 2 = レッドドラゴン後
	const branchSimIndex = hasBranch ? BranchTypes[branch.type].minSimLength - 1 : -1;

	// 各候補乱数ごとのシミュレーションデータ（到着乱数表示オン時のみ）
	let arrivalSims = [];
	if (showArrival) {
		arrivalSims = Array.from(starIndices).map(index => {
			let chosenActionCombination = actionCombination;
			if (hasBranch) {
				const tempSim = new KssRng(index).simulateBattleWindowsMWW(magician, actionCombination, settings.fastKnight, settings.fastDragon, settings.hammerThrow, settings.allowDragonStar);
				const bt = BranchTypes[branch.type];
				if (tempSim.length >= bt.minSimLength && bt.getObservable({ sim: tempSim }) === branch.value) {
					chosenActionCombination = branch.fallbackActionCombination;
				}
			}
			let dragonAction = null;
			let powersIndices = [];
			const rng = new KssRng(index).withProxy(({startingIndex, p, result}) => {
				if (p === 'dragonActs') dragonAction = result;
				if (p === 'battleWindowsPowers') powersIndices.push(startingIndex);
			});
			const sim = rng.simulateBattleWindowsMWW(magician, chosenActionCombination, settings.fastKnight, settings.fastDragon, settings.hammerThrow, settings.allowDragonStar);
			for (let i = 0; i < sim.length; i++) {
				sim[i].startingIndex = powersIndices[i];
			}
			if (sim[3]) sim[3].dragonAction = dragonAction;

			return {
				arrivalIndex: index - stars.length * 2,
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
		? [null, branch.fallbackActionCombination.knight, branch.fallbackActionCombination.dragon, branch.fallbackActionCombination.dragonAction]
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
			} else if (i > branchSimIndex && fallbackActions[i]) {
				// 観測後の行 → 分岐先の行動を表示
				html += `<td>${msg(fallbackActions[i])}</td>`;
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
				if ((i === 1 && settings.fastKnight) || (i === 2 && settings.fastDragon)) {
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
	resultEl.appendChild(table);

	if (extraHtml) {
		const extraDiv = document.createElement('div');
		extraDiv.innerHTML = extraHtml;
		resultEl.appendChild(extraDiv);
	}
}

// --- 入力リセット ---
function resetInputs() {
	stars = [];
	renderStarBoxes();
	resultEl.innerHTML = '';
	statusEl.innerHTML = t('pressToStart');
}

// --- テスト関数 ---
const BranchEnemyNames = {
	en: { magician: 'Magician', knight: 'Knight', dragon: 'Dragon' },
	ja: { magician: '魔法使い', knight: '悪魔の騎士', dragon: 'レッドドラゴン' },
};

function branchTypeToEnemy(type) {
	if (type.startsWith('magician')) return BranchEnemyNames[lang].magician;
	if (type.startsWith('knight')) return BranchEnemyNames[lang].knight;
	if (type.startsWith('dragon')) return BranchEnemyNames[lang].dragon;
	return type;
}

async function runTest() {
	const testResultEl = document.getElementById('test-result');
	const runBtn = document.getElementById('test-run-btn');
	const starsCount = parseInt(document.getElementById('test-stars').value, 10) || 3;
	const settings = getSettings();

	// UIを実行中状態に
	runBtn.disabled = true;
	runBtn.textContent = '0%';

	// ジェネレーターを用いて処理を細切れにし、UIをブロックしないようにする
	let time = performance.now();
	const manipulator = new BattleWindowsMWWManipulator(settings);
	for (const result of manipulator.testGenerator(starsCount)) {
		const progress = Math.floor(result.count / result.total * 100);
		if (result.count === result.total) {
			renderTestResult(result, testResultEl); // 結果を表示
			break;
		}
		const newTime = performance.now();
		if (newTime - time > 20) {
			time = newTime;
			runBtn.textContent = `${progress}%`; // 進捗を表示
			await new Promise(r => setTimeout(r, 0)); // イベントループに制御を返す
		}
	}

	// UIを復元
	runBtn.disabled = false;
	runBtn.textContent = t('testRun');
}

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

document.getElementById('test-run-btn').addEventListener('click', runTest);

// --- 言語切替 ---
window.switchLang = function(val) {
	lang = val;
	document.getElementById('label-magician').textContent = t('magician');
	document.getElementById('label-knight').textContent = t('knight');
	document.getElementById('label-dragon').textContent = t('dragon');
	document.getElementById('label-hammer-throw').textContent = t('hammerThrow');
	document.getElementById('label-settings').textContent = t('settings');
	document.getElementById('label-no-numpad').textContent = t('noNumpad');
	document.getElementById('label-show-arrival').textContent = t('showArrival');
	document.getElementById('label-dragon-star').textContent = t('dragonStar');
	document.getElementById('label-test').textContent = t('test');
	document.getElementById('label-test-stars').textContent = t('testStars');
	document.getElementById('test-run-btn').textContent = t('testRun');
	document.getElementById('btn-default-settings').textContent = t('defaultSettings');
	if (stars.length < 3) statusEl.innerHTML = t('pressToStart');
	else displayResult();
};

// --- キーボードイベント ---
window.addEventListener('keydown', (event) => {
	if (event.target.tagName?.toUpperCase() === 'INPUT' || event.target.tagName?.toUpperCase() === 'SELECT') return;

	const key = event.key;
	const noNumpad = document.getElementById('no-numpad').checked;

	let numpadKey = null;
	if (noNumpad) {
		numpadKey = NoNumpadMap[key.toLowerCase()] || null;
	} else {
		const n = parseInt(key, 10);
		if (n === n && n !== 0 && n !== 5) numpadKey = n;
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
		lang: document.getElementById('lang').value,
		min: document.getElementById('min').value,
		max: document.getElementById('max').value,
		magician: document.getElementById('difficulty-magician').value,
		knight: document.getElementById('difficulty-knight').value,
		dragon: document.getElementById('difficulty-dragon').value,
		hammerThrow: document.querySelector('input[name="hammer-throw"]:checked').value,
		noNumpad: document.getElementById('no-numpad').checked,
		showArrival: document.getElementById('show-arrival-index').checked,
		allowDragonStar: document.getElementById('allow-dragon-star').checked,
	};
	localStorage.setItem('kss-rng-manipulator2', JSON.stringify(settings));
}

function loadSettings() {
	try {
		const stored = localStorage.getItem('kss-rng-manipulator2');
		if (stored) {
			const s = JSON.parse(stored);
			if (s.lang) { document.getElementById('lang').value = s.lang; lang = s.lang; }
			if (s.min) document.getElementById('min').value = s.min;
			if (s.max) document.getElementById('max').value = s.max;
			if (s.magician) document.getElementById('difficulty-magician').value = s.magician;
			if (s.knight) document.getElementById('difficulty-knight').value = s.knight;
			if (s.dragon) document.getElementById('difficulty-dragon').value = s.dragon;
			if (s.hammerThrow) {
				const rb = document.querySelector(`input[name="hammer-throw"][value="${s.hammerThrow}"]`);
				if (rb) rb.checked = true;
			}
			if (s.noNumpad !== undefined) document.getElementById('no-numpad').checked = s.noNumpad;
			if (s.showArrival !== undefined) document.getElementById('show-arrival-index').checked = s.showArrival;
			if (s.allowDragonStar !== undefined) document.getElementById('allow-dragon-star').checked = s.allowDragonStar;
			return true;
		}
	} catch(e) {}
	return false;
}

function restoreDefaultSettings() {
	document.getElementById('min').value = "2800";
	document.getElementById('max').value = "3376";
	document.getElementById('difficulty-magician').value = "easy";
	document.getElementById('difficulty-knight').value = "true";
	document.getElementById('difficulty-dragon').value = "true";
	document.querySelector('input[name="hammer-throw"][value="1"]').checked = true;
	document.getElementById('no-numpad').checked = false;
	document.getElementById('show-arrival-index').checked = false;
	document.getElementById('allow-dragon-star').checked = false;
	saveSettings();
	displayResult();
}

document.getElementById('btn-default-settings').addEventListener('click', restoreDefaultSettings);

document.querySelector('.settings-area').addEventListener('change', (e) => {
	saveSettings();
	if (e.target.id === 'lang') {
		switchLang(e.target.value);
	} else if (e.target.id !== 'no-numpad' && e.target.id !== 'test-stars') {
		displayResult();
	}
});

// --- 初期化 ---
if (!loadSettings()) {
	document.getElementById('lang').value = lang; // ブラウザのデフォルト言語を反映
}
switchLang(lang); // lang変数を元にUIテキストを更新
renderStarBoxes();
statusEl.innerHTML = t('pressToStart');

export const INITIAL_SEED = 0x7777
export const CYCLE_LEN = 65534	//乱数変数が16bitであるなか、65534回で乱数列が1周する。つまり2つを除いた全ての乱数を通る。

/** 乱数のリスト */
export const RngCycle = new Uint8Array(CYCLE_LEN * 2);	// 一周したとき用に2週分
for(let i=0, s=INITIAL_SEED; i < CYCLE_LEN; i++) {
	RngCycle[i] = s;
	const a = s ^ s>>1;
	s = a>>5 ^ (~a & 1)<<10 ^ (s & 3)<<8 | (s & 0x1F)<<11;
	s ^= s>>3 & 0xE0;
	s ^= s>>3 & 0x1C;
	s ^= s>>3 & 0x03;
}

// --- 乱数の結果を変換するテーブル ---
export const StarDirectionChars =  "↑↗→↘↓↙←↖";

export const DragonActionNames = ["Star", "Other", "Other", "Star", "Other", "Other", "Guard", "Other", "Other", "Guard"];
export const DragonStar = DragonActionNames.indexOf("Star");
export const DragonGuard = DragonActionNames.indexOf("Guard");
const DragonActionMap = Int8Array.from(DragonActionNames, v => DragonActionNames.indexOf(v));

export const BattleWindowsPowerNames = ["Fighter", "Plasma", "Hammer", "Beam", "Bomb", "Sword", "Hammer", "Bomb", "Plasma", "Sword", "Beam", "Fighter", "Stone", "Cutter", "Wheel", "Jet", "Ice", "Parasol", "Fire", "Suplex", "Ninja", "Yo-yo", "Mirror", "Wing", "None"];
export const BattleWindowsPowerNone = BattleWindowsPowerNames.indexOf("None");
const BattleWindowsPowerMap = Int8Array.from(BattleWindowsPowerNames, v => BattleWindowsPowerNames.indexOf(v));

// --- 乱数消費数 --
export const StarDirectionAdvances = 2;	// 着地時・壁や天井にぶつかった時に出る小さな星(1回は星の方向の判定)
export const ShortDashAdvances = 1;	// 一瞬だけダッシュ
export const StartDashAdvances = 2;	// ダッシュの最初の土煙
export const ContinueDashAdvances = 1;	// ダッシュ継続中の土煙
export const SlideAdvances = 6;	//スライディング
export const HammerFlipChargeAdvances = 12;	// 鬼殺し火炎ハンマー溜め中の土煙
export const HammerFlipFinishAdvances = 2;	// 鬼殺し火炎ハンマー後の土煙
export const HammerFlipAdvances = HammerFlipChargeAdvances + HammerFlipFinishAdvances;	// 鬼殺し火炎ハンマーの素振り
export const HammerHardHitAdvances = 9;

/** 乱数位置を保持し、消費と参照を管理するクラス */
export class KssRng {
	constructor(index=0) {
		this.index = index;
	}
	/** 現在の乱数値を取得 */
	getCurrentValue() {
		return RngCycle[this.index];
	}
	/** 乱数を1回進めて、0以上max未満の乱数を返す */
	randi(max) {
		return (RngCycle[++this.index] * max) >> 8;
	}
	/** 乱数を指定の回数進める */
	advance(count) {
		this.index += count;
	}

	/** 着地時・壁や天井にぶつかった時に出る小さな星の出る方向 */
	starDirection() {
		this.advance(1);
		return this.randi(8);
	}
	/** ハンマーのヒット */
	hammerHit() {
		const hardHit = this.randi(4) === 0;	//ハードヒットの判定
		if (hardHit) this.advance(HammerHardHitAdvances);	//ハードヒット
	}
	/** 鬼殺し火炎ハンマーをし、敵ににヒットさせる */
	hammerFlipChargeAndHit() {
		this.advance(HammerFlipChargeAdvances);	//溜め中の土煙
		this.hammerHit();
		this.advance(HammerFlipFinishAdvances);	//攻撃後の土煙
	}
	/** 鬼殺し火炎ハンマーの素振り */
	hammerFlip() {
		this.advance(HammerFlipAdvances);
	}

	// --- Fastモードの鬼殺し火炎ハンマー ---
	//コピーの元の出現に影響しないように、最速で鬼殺しをする必要がある
	//先制判定は鬼殺しの溜め中の土煙の最中に行われ、タイミングによって異なる2つの乱数位置を考慮する必要がある
	//コピーの元判定も、ハードヒット判定とヒットの間に行われる
	//魔法使いでは鬼殺しの開始タイミングを調整して乱数調整を行い、タイミングによってハードヒット判定がコピーの元判定の前か後か異なる
	/** 悪魔の騎士への最速鬼殺しの溜め中の土煙と、先制される可能性があるか */
	hammerFlipChargeForFastKnight() {
		this.advance(8);
		const a = this.knightAttacksFirst();
		this.advance(1);
		const b = this.knightAttacksFirst();
		this.advance(2);
		return a || b;
	}
	/** レッドドラゴンへの最速鬼殺しの溜め中の土煙と、先制される可能性があるか */
	hammerFlipChargeForFastDragon() {
		this.advance(6);
		const a = this.dragonAttacksFirst();
		this.advance(1);
		const b = this.dragonAttacksFirst();
		this.advance(4);
		return a || b;
	}
	/** バトルウィンドウズでの最速鬼殺しのヒットと、出現するコピーの元 */
	hammerFlipHitForFastBattleWindowsPowers() {
		const hardHit = this.randi(4) === 0;	//ハードヒットの判定
		const powers = this.battleWindowsPowers();
		if (hardHit) this.advance(HammerHardHitAdvances);	//ハードヒット
		this.advance(HammerFlipFinishAdvances);	//攻撃後の土煙
		return powers;
	}
	/** 魔法使いでの鬼殺しの溜め中の土煙と、先制されるか */
	hammerFlipChargeForFastMagician(advances) {
		// 溜め中の土煙と先制されるか
		this.advance(advances);
		const a = this.magicianAttacksFirst();
		this.advance(HammerFlipChargeAdvances - advances);
		return a;
	}
	/** 魔法使いでの鬼殺しのヒットと、出現するコピーの元 */
	hammerFlipHitForFastMagician(hardHitFirst) {
		// ヒットと出現するコピーの元
		let hardHit, powers;
		if (hardHitFirst) {
			// 先にハードヒットの判定
			hardHit = this.randi(4) === 0;
			powers = this.battleWindowsPowers();
		} else {
			// 後にハードヒットの判定
			powers = this.battleWindowsPowers();
			hardHit = this.randi(4) === 0;
		}
		if (hardHit) this.advance(HammerHardHitAdvances);	//ハードヒット
		this.advance(HammerFlipFinishAdvances);	//攻撃後の土煙
		return powers;
	}

	// --- バトルウィンドウズ ---
	slimeAttacksFirst() {
		return this.randi(4) === 1;
	}
	puppetAttacksFirst() {
		return this.randi(4) === 2;
	}
	magicianAttacksFirst() {
		return this.randi(4) === 1;
	}
	knightAttacksFirst() {
		return this.randi(4) === 2;
	}
	dragonAttacksFirst() {
		return this.randi(4) === 3;
	}
	dragonActs() {
		return DragonActionMap[this.randi(10)];
	}
	/** バトルウィンドウズのコピーの元の出現 */
	battleWindowsPowers() {
		//右の出現
		let right;
		if (this.randi(4) === 1) {
			const poolIdx = this.randi(4) & 1;
			const pwrIdx = this.randi(12);
			right = BattleWindowsPowerMap[poolIdx * 12 + pwrIdx];
		} else {
			right = BattleWindowsPowerNone;
		}

		//左の出現 (左右とも出現して同じ種類だったら再抽選)
		let left;
		do{
			if (this.randi(4) === 2) {
				const poolIdx = this.randi(4) & 1;
				const pwrIdx = this.randi(12);
				left = BattleWindowsPowerMap[poolIdx * 12 + pwrIdx];
			} else {
				left = BattleWindowsPowerNone;
				break;
			}
		} while (left === right);

		return { left, right };
	}

	/** 銀河に願いをのバトルウィンドウズ戦を、理想的な乱数である限りシミュレートし、出現するコピーの元の配列を返す
	 * @param {boolean} fastKnight 悪魔の騎士をFastモードでするか
	 * @param {boolean} fastDragon レッドドラゴンをFastモードでするか
	 * @param {number} hammerThrow ハンマー投げのダッシュの乱数消費数
	 * @returns {Array<{left, right}>} 長さは、魔法使いで失敗なら0、悪魔の騎士で失敗なら1、レッドドラゴンで失敗なら2、レッドドラゴン2ターン目で失敗なら3、全て理想的なら4になる
	*/
	simulateBattleWindowsMWW(magician, actionCombination, fastKnight, fastDragon, hammerThrow) {
		const result = [];

		// --- 魔法使い ---
		if (magician.fast) {
			// Fastモード
			if (this.hammerFlipChargeForFastMagician(magician.advances1)) return result;
			const hardHitFirst = magician.advances1 >= 6;
			result.push(this.hammerFlipHitForFastMagician(hardHitFirst));
		} else {
			// Easyモード
			this.advance(magician.advances1);
			if (this.magicianAttacksFirst()) return result;
			this.advance(magician.advances2);	// スライディングは間に合わないから先制判定は間に挟まる
			result.push(this.battleWindowsPowers());
			this.hammerFlipChargeAndHit();
		}

		// --- 悪魔の騎士 ---
		this.advance(actionCombination.knight.advances);
		if (fastKnight) {
			// Fastモード
			if (this.hammerFlipChargeForFastKnight()) return result;
			result.push(this.hammerFlipHitForFastBattleWindowsPowers());
		} else {
			// Easyモード
			if (this.knightAttacksFirst()) return result;
			result.push(this.battleWindowsPowers());
			this.hammerFlipChargeAndHit();
		}
		this.advance(hammerThrow);    // ハンマー投げのダッシュ
		this.hammerHit();    // ハンマー投げのスイングのヒット
		this.hammerHit();    // ハンマー投げのヒット

		// --- レッドドラゴン ---
		this.advance(actionCombination.dragon.advances);
		if (fastDragon) {
			// Fastモード
			if (this.hammerFlipChargeForFastDragon()) return result;
			result.push(this.hammerFlipHitForFastBattleWindowsPowers());
		} else {
			// Easyモード
			if (this.dragonAttacksFirst()) return result;
			result.push(this.battleWindowsPowers());
			this.hammerFlipChargeAndHit();
		}
		this.hammerFlipChargeAndHit();	// 2発目の鬼殺し火炎ハンマー

		// --- レッドドラゴン2ターン目 ---
		this.advance(actionCombination.dragonAction.advances);
		const dragonAction = this.dragonActs();
		if (dragonAction !== DragonGuard) return result;
		result.push(this.battleWindowsPowers());

		return result;
	}
}

// --- 分岐方式の定義 ---
const obsLeft = s => s.left;
const obsRight = s => s.right;
const obsPowers = s => s.left * BattleWindowsPowerMap.length + s.right;
const createBranchType = (simIndex, observableFn) => ({
	getObservable: e => observableFn(e.sim[simIndex]),
	minSimLength: simIndex + 1,
	filterFallback: [
		() => true,
		(p, a) => p.knight.advances === a.knight.advances,
		(p, a) => p.knight.advances === a.knight.advances && p.dragon.advances === a.dragon.advances
	][simIndex]
});
export const BranchTypes = {
	magicianPowerLeft:  createBranchType(0, obsLeft),
	magicianPowerRight: createBranchType(0, obsRight),
	magicianPowers:     createBranchType(0, obsPowers),
	knightPowerLeft:    createBranchType(1, obsLeft),
	knightPowerRight:   createBranchType(1, obsRight),
	knightPowers:       createBranchType(1, obsPowers),
	dragonPowerLeft:    createBranchType(2, obsLeft),
	dragonPowerRight:   createBranchType(2, obsRight),
	dragonPowers:       createBranchType(2, obsPowers),
};
// BattleWindowsMWWManipulatorのデフォルト値
const DefaultBranchPriorities = ['dragonPowerLeft', 'knightPowerLeft'];
const DefaultActionsDifficultyTable = {
    magician: [
        { difficulty: -4, hammerFlips: 1, advances: 6 },
        { difficulty: -3, hammerFlips: 1, advances: 4 },
        { difficulty: -2, hammerFlips: 1, advances: 2 },
        { difficulty: -1, hammerFlips: 1, advances: 0 },
        { difficulty: 0 },
        { difficulty: 201, slides: 1, advances: 4 },
        { difficulty: 202, dashes: 2 },
        { difficulty: 203, dashes: 3 },
        { difficulty: 204, slides: 1, advances: 5 },
        { difficulty: 205, dashes: 1 },
    ],
    knight: [
        { difficulty: 0 },
        { difficulty: 1, stars: 1 },
        { difficulty: 2, hammerFlips: 1 },
        { difficulty: 3, slides: 1 },
        { difficulty: 11, stars: 2 },
        { difficulty: 12, hammerFlips: 2 },
        { difficulty: 13, slides: 2 },
        { difficulty: 21, hammerFlips: 1, stars: 1 },
        { difficulty: 22, stars: 1, slides: 1 },
        { difficulty: 23, hammerFlips: 1, slides: 1 },
        { difficulty: 24, dashes: 3 },
        { difficulty: 41, dashes: 3, stars: 1 },
        { difficulty: 42, dashes: 3, hammerFlips: 1 },
        { difficulty: 43, dashes: 3, slides: 1 },
        { difficulty: 44, dashes: 2, stars: 1, hammerFlips: 1 },
        { difficulty: 45, dashes: 2, stars: 1, slides: 1 },
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
    ],
    dragonAction: [
        { difficulty: 0 },
        { difficulty: 1, stars: 1 },
        { difficulty: 1, hammerFlips: 1 },
        { difficulty: 1, slides: 1 },
        { difficulty: 1, dashes: 3 },
        { difficulty: 6, dashes: 2, stars: 1 },
        { difficulty: 7, dashes: 2, slides: 1 },
        { difficulty: 8, dashes: 2, hammerFlips: 1 },
    ],
};
/** 銀河に願いをのバトルウィンドウズの乱数調整 */
export class BattleWindowsMWWManipulator {
	/**
	 * @param {Object} options
	 * @param {Object} [options.actionsDifficultyTable] 行動と難易度の定義テーブル
	 * @param {boolean} [options.fastMagician] 魔法使いをFastモードで倒すか
	 * @param {boolean} [options.fastKnight] 悪魔の騎士をFastモードで倒すか
	 * @param {boolean} [options.fastDragon] レッドドラゴンをFastモードで倒すか
	 * @param {number} [options.hammerThrow] ハンマー投げのダッシュによる乱数消費数
	 * @param {number} [options.minIndex] 探索する乱数の開始位置
	 * @param {number} [options.maxIndex] 探索する乱数の終了位置
	 * @param {Array<string>} [options.branchPriorities] 完全一致しない場合にフォールバックとして試す分岐方式の優先順位
	 */
	constructor({
		actionsDifficultyTable = DefaultActionsDifficultyTable,
		fastMagician = true,
		fastKnight = true,
		fastDragon = true,
		hammerThrow = 1,
		minIndex = 3100,
		maxIndex = 3376,
		branchPriorities = DefaultBranchPriorities
	} = {}) {
		this.fastMagician = fastMagician;
		this.fastKnight = fastKnight;
		this.fastDragon = fastDragon;
		this.hammerThrow = hammerThrow;
		this.minIndex = minIndex;
		this.maxIndex = maxIndex;
		this.branchPriorities = branchPriorities;

		this._parseActionsDifficultyTable(actionsDifficultyTable);
	}

	_parseActionsDifficultyTable(table) {
		const parseAdvances = ({ dashes=0, slides=0, hammerFlips=0, stars=0 }) => dashes + slides*SlideAdvances + hammerFlips*HammerFlipAdvances + stars*StarDirectionAdvances;

		const parseMessageJa = ({ dashes, slides, hammerFlips, stars, advances }) => {
			const a = [];
			if (advances !== undefined) {
				if (slides) a.push(["", "", "", "", "準速スライディング", "最速スライディング"][advances]);
				if (hammerFlips) a.push(["fast4", "", "fast3", "", "fast2", "", "fast1"][advances]);
			} else {
				if (dashes) a.push(["", "短ダッシュ", "ダッシュ", "長ダッシュ"][dashes]);
				if (hammerFlips) a.push(["", "鬼殺し", "2鬼殺し"][hammerFlips]);
				if (stars) a.push(["", "星", "2星"][stars]);
				if (slides) a.push(["", "スライディング", "2スライディング"][slides]);
			}
			return a.length ? a.join(" & ") : "待機";
		};

		const parseMessageEn = ({ dashes, slides, hammerFlips, stars, advances }) => {
			const a = [];
			if (advances !== undefined) {
				if (slides) a.push(["", "", "", "", "Sub-optimal Slide", "Optimal Slide"][advances]);
				if (hammerFlips) a.push(["fast4", "", "fast3", "", "fast2", "", "fast1"][advances]);
			} else {
				if (dashes) a.push(["", "Short Dash", "Dash", "Long Dash"][dashes]);
				if (hammerFlips) a.push(["", "Hammer Flip", "2 Hammer Flips"][hammerFlips]);
				if (stars) a.push(["", "Star", "2 Stars"][stars]);
				if (slides) a.push(["", "Slide", "2 Slides"][slides]);
			}
			return a.length ? a.join(" & ") : "Wait";
		};

		const parseEnemyActions = (actionsData) => {
			return actionsData.toSorted((a, b) => a.difficulty - b.difficulty).map(a => ({
				difficulty: a.difficulty,
				advances: parseAdvances(a),
				actions: a,
				messageJa: parseMessageJa(a),
				messageEn: parseMessageEn(a),
			}));
		};

		this.magicianActions = table.magician.toSorted((a, b) => a.difficulty - b.difficulty).map(a => {
			const advances = parseAdvances(a);
			return {
				difficulty: a.difficulty,
				advances1: a.advances === undefined ? advances : a.advances,
				advances2: a.advances === undefined ? 0 : advances - a.advances,
				fast: a.hammerFlips !== undefined,
				actions: a,
				messageJa: parseMessageJa(a),
				messageEn: parseMessageEn(a),
			};
		});

		const knightActions = parseEnemyActions(table.knight);
		const dragonActions = parseEnemyActions(table.dragon);
		const dragonActionActions = parseEnemyActions(table.dragonAction);

		// 魔法使い以外の全ての行動の組み合わせを作成し、難易度順にソート
		this.actionCombinations = [];
		for (const knight of knightActions) {
			for (const dragon of dragonActions) {
				for (const dragonAction of dragonActionActions) {
					this.actionCombinations.push({
						difficulty: knight.difficulty + dragon.difficulty + dragonAction.difficulty,
						knight,
						dragon,
						dragonAction,
					});
				}
			}
		}
		this.actionCombinations.sort((a, b) => a.difficulty - b.difficulty);
	}

	/** 部分一致候補から分岐方式を適用して解を探す */
	_tryBranch(branchTypeName, bestPartialMatches, r, magician) {
		const bt = BranchTypes[branchTypeName];
		if (!bt) return null;

		for (const list of bestPartialMatches) {
			const matched   = list.filter(e => e.sim.length === 4);
			const unmatched = list.filter(e => e.sim.length < 4);
			if (unmatched.length === 0 || matched.length === 0) continue;

			// 失敗エントリのsim長が分岐に必要な長さに満たない場合はスキップ
			if (unmatched.some(e => e.sim.length < bt.minSimLength)) continue;

			// 失敗エントリの観測値が全て同一で、成功エントリにその値がないか確認
			const failObs = bt.getObservable(unmatched[0]);
			if (unmatched.some(e => bt.getObservable(e) !== failObs)) continue;
			if (matched.some(e => bt.getObservable(e) === failObs)) continue;

			// 失敗インデックス群に対して機能するactionCombinationを探す
			const actionCombination = list[0].actionCombination;
			const failIndices = unmatched.map(e => e.index);
			for (const altActionCombination of this.actionCombinations) {
				if (!bt.filterFallback(actionCombination, altActionCombination)) continue;
				let allMatch = true;
				for (const index of failIndices) {
					r.index = index;
					const sim = r.simulateBattleWindowsMWW(magician, altActionCombination, this.fastKnight, this.fastDragon, this.hammerThrow);
					if (sim.length !== 4) { allMatch = false; break; }
				}
				if (allMatch) {
					return {
						actionCombination,
						branch: { type: branchTypeName, value: failObs, fallbackActionCombination: altActionCombination },
					};
				}
			}
		}
		return null;
	}

	/** 銀河に願いをのバトルウィンドウズ戦の乱数調整のための行動を探す
	 * @param {Array<number>} stars バトルウィンドウズ戦開始時に出した星の向き
	*/
	manipulate(stars) {
		const r = new KssRng();

		// 星の方向が全て一致する乱数位置を探す
		const indexList = [];
		for (let i = this.minIndex; i <= this.maxIndex; i++) {
			r.index = i;
			if (stars.every(v => r.starDirection() === v)) indexList.push(r.index);
		}
		const indexArray = new Uint16Array(indexList);

		// 魔法使いに先制されない行動を探す
		const emptyResult = { magician: null, actionCombination: null, branch: null };
		const magicianList = this.magicianActions.filter(magician => (this.fastMagician || !magician.fast) && indexArray.every(v => !new KssRng(v + magician.advances1).magicianAttacksFirst()));
		if (magicianList.length === 0) return emptyResult;

		let bestPartialResult = { ...emptyResult };
		let bestMatchCountAll = 0;
		for (const magician of magicianList) {

			// 難易度の低い順に行動を走査
			const bestPartialMatches = [];
			let bestMatchCount = 0;
			for (const actionCombination of this.actionCombinations) {
				// 可能性のある全ての乱数位置で理想的か確認
				const list = [];
				let matchCount = 0;
				for (const index of indexArray) {
					r.index = index;
					const sim = r.simulateBattleWindowsMWW(magician, actionCombination, this.fastKnight, this.fastDragon, this.hammerThrow);
					if (sim.length === 4) matchCount++;
					list.push({ actionCombination, index, sim });
				}

				// 全乱数位置で理想的なら確定
				if (matchCount === indexArray.length) {
					return { magician, actionCombination, branch: null };
				}
				// 理想的なのが最多の結果を蓄積
				if (matchCount >= bestMatchCount) {
					if (matchCount > bestMatchCount) {
						bestPartialMatches.length = 0;
						bestMatchCount = matchCount;
					}
					bestPartialMatches.push(list);
				}
			}

			// 分岐方式を優先度順に試す
			for (const branchTypeName of this.branchPriorities) {
				const branchResult = this._tryBranch(branchTypeName, bestPartialMatches, r, magician);
				if (branchResult) {
					return { magician, actionCombination: branchResult.actionCombination, branch: branchResult.branch };
				}
			}

			// 最良の部分一致を記録
			if (bestMatchCount > bestMatchCountAll) {
				bestMatchCountAll = bestMatchCount;
				bestPartialResult = { magician, actionCombination: bestPartialMatches[0]?.[0]?.actionCombination ?? null, branch: null };
			}
		}

		return bestPartialResult;
	}
}

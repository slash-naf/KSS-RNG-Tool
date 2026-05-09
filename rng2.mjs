// @ts-check

/**
 * @typedef {{ left: PowerName, right: PowerName }} BattleWindowsPowersResult コピーの元判定の結果
 * @typedef {{ difficulty?: number, dashes?: number, stars?: number, hammerFlips?: number, slides?: number, lateAdvances?: number, earlyHardHitCheck?: boolean, fast?: boolean, frames?: number, name?: string }} ActionTable 行動テーブル（fast: ハンマーの溜めをコピーの元判定の前に行うか）
 * @typedef {{ knight: ActionTable, dragon: ActionTable, dragonAction: ActionTable, difficulty: number }} ActionCombination 魔法使い以外の行動の組み合わせ
 */

export const INITIAL_SEED = 0x7777	// ゲーム起動時の乱数
export const CYCLE_LEN = 65534	// 乱数変数が16bitであるなか、65534回で乱数列が1周する。つまり2つを除いた全ての乱数を通る。

/** 乱数のリスト */
export const RngCycle = new Uint16Array(CYCLE_LEN);
for(let i=0, s=INITIAL_SEED; i < CYCLE_LEN; i++) {
	RngCycle[i] = s;
	const a = s ^ s>>1;
	s = a>>5 ^ (~a & 1)<<10 ^ (s & 3)<<8 | (s & 0x1F)<<11;
	s ^= s>>3 & 0xE0;
	s ^= s>>3 & 0x1C;
	s ^= s>>3 & 0x03;
}

// --- 乱数の結果を変換するテーブル ---

/** 星の方向を表す文字（randi(8)に対応） */
export const StarDirectionChars =  "↑↗→↘↓↙←↖";

/** @typedef {'Star' | 'Guard' | 'Other'} DragonAction レッドドラゴンの行動 */
/** @type {DragonAction[]}  レッドドラゴンの行動テーブル（randi(10)に対応）*/
export const DragonActionTable = ["Star", "Other", "Other", "Star", "Other", "Other", "Guard", "Other", "Other", "Guard"];
/** @type {DragonAction} */
export const DragonStar = "Star";
/** @type {DragonAction} */
export const DragonGuard = "Guard";

/** @typedef {'Fighter' | 'Plasma' | 'Hammer' | 'Beam' | 'Bomb' | 'Sword' | 'Stone' | 'Cutter' | 'Wheel' | 'Jet' | 'Ice' | 'Parasol' | 'Fire' | 'Suplex' | 'Ninja' | 'Yo-yo' | 'Mirror' | 'Wing' | 'None'} PowerName コピーの元の名前 */
/** @type {PowerName[]} コピーの元の名前テーブル（12個×2プール） */
export const BattleWindowsPowerTable = ["Fighter", "Plasma", "Hammer", "Beam", "Bomb", "Sword", "Hammer", "Bomb", "Plasma", "Sword", "Beam", "Fighter", "Stone", "Cutter", "Wheel", "Jet", "Ice", "Parasol", "Fire", "Suplex", "Ninja", "Yo-yo", "Mirror", "Wing"];
/** @type {PowerName} コピーの元が出現しない場合の値 */
export const BattleWindowsPowerNone = "None";

// --- 乱数消費数 --
export const StarDirectionAdvances = 2;	// 着地時・壁や天井にぶつかった時に出る小さな星（1回は星の方向の判定）
export const ShortDashAdvances = 1;	// 一瞬だけダッシュ
export const StartDashAdvances = 2;	// ダッシュの最初の土煙
export const ContinueDashAdvances = 1;	// ダッシュ継続中の土煙
export const SlideAdvances = 6;	//スライディング
export const HammerFlipChargeAdvances = 12;	// 鬼殺し火炎ハンマー溜め中の土煙
export const HammerFlipFinishAdvances = 2;	// 鬼殺し火炎ハンマー後の土煙
export const HammerFlipAdvances = HammerFlipChargeAdvances + HammerFlipFinishAdvances;	// 鬼殺し火炎ハンマーの素振り
export const HammerHardHitAdvances = 9;	// ハンマーのハードヒットによる消費

/** 乱数位置を保持し、消費と参照を管理するクラス */
export class KssRng {
	/** @param {number} index 初期乱数位置 */
	constructor(index=0) {
		this.index = index;
	}
	/** KssRngのメソッド呼び出しをフックするProxyを作成
	 * @typedef {function({startingIndex: number, endingIndex: number, p: keyof KssRng, result: any, args: any[]}): void} DebugCallback デバッグコールバック
	 * @param {DebugCallback} debugCallback
	 * @param {(p: string) => boolean} [ignore] 関数名に無視するか判定する
	 * @returns {KssRng}
	 */
	withProxy(debugCallback, ignore = p => ['randi', 'advance', 'getIndex', 'getValue', 'withProxy'].includes(p)) {
		return new Proxy(this, {
			get(target, /** @type {keyof KssRng} */ p, receiver) {
				if (typeof p !== 'string') return Reflect.get(target, p, receiver);
				const v = /** @type {Function} */ (target[p]);
				if (typeof v !== 'function' || ignore(p)) return v;
				return function(/** @type {any[]} */...args) {
					const startingIndex = target.getIndex();
					const result = v.call(receiver, ...args);
					const endingIndex = target.getIndex();
					debugCallback({ startingIndex, endingIndex, p, result, args });
					return result;
				};
			}
		});
	}
	/** 現在の乱数位置を取得 */
	getIndex() {
		return this.index;
	}
	/** 現在の乱数値を取得 */
	getValue() {
		return RngCycle[this.index];
	}
	/** 乱数を1回進めて、0以上max未満の整数を返す
	 * @param {number} max */
	randi(max) {
		this.advance(1);
		return ((RngCycle[this.index] & 0xFF) * max) >> 8;
	}
	/** 乱数を指定の回数進める
	 * @param {number} count */
	advance(count) {
		this.index += count;
		if (this.index >= CYCLE_LEN) this.index -= CYCLE_LEN;
	}

	/** 着地時・壁や天井にぶつかった時に出る小さな星の出る方向 */
	starDirection() {
		this.advance(1);
		return this.randi(8);
	}
	/** ハンマーのヒット（ハードヒット判定 + ハードヒット時の乱数消費） */
	hammerHit() {
		const hardHit = this.checkHammerHardHit();
		if (hardHit) this.advance(HammerHardHitAdvances);
	}
	/** ハンマーがハードヒットするかどうか */
	checkHammerHardHit() {
		return this.randi(4) === 0;
	}
	/** 鬼殺し火炎ハンマーをし、敵ににヒットさせる */
	hammerFlipChargeAndHit() {
		this.advance(HammerFlipChargeAdvances);	//溜め中の土煙
		this.hammerHit();
		this.advance(HammerFlipFinishAdvances);	//攻撃後の土煙
	}
	/** 一連の行動をする */
	takeAction(/** @type {ActionTable} */{ dashes=0, slides=0, hammerFlips=0, stars=0, lateAdvances=0 }) {
		this.advance(dashes + (slides * SlideAdvances) + (hammerFlips * HammerFlipAdvances) + (stars * StarDirectionAdvances) - lateAdvances);
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
	/** @returns {DragonAction} */
	dragonActs() {
		return DragonActionTable[this.randi(10)];
	}
	/** バトルウィンドウズのコピーの元の出現
	 * @returns {BattleWindowsPowersResult} */
	battleWindowsPowers() {
		//右の出現
		let right;
		if (this.randi(4) === 1) {
			const poolIdx = this.randi(4) & 1;
			const pwrIdx = this.randi(12);
			right = BattleWindowsPowerTable[poolIdx * 12 + pwrIdx];
		} else {
			right = BattleWindowsPowerNone;
		}

		//左の出現 (左右とも出現して同じ種類だったら再抽選)
		let left;
		do {
			if (this.randi(4) === 2) {
				const poolIdx = this.randi(4) & 1;
				const pwrIdx = this.randi(12);
				left = BattleWindowsPowerTable[poolIdx * 12 + pwrIdx];
			} else {
				left = BattleWindowsPowerNone;
				break;
			}
		} while (left === right);

		return { left, right };
	}
	/** 鬼殺しのヒットとともに、バトルウィンドウズのコピーの元の出現を、ハードヒット判定の前か後に行う
	 * @param {boolean} earlyHardHitCheck
	 * @returns {BattleWindowsPowersResult} */
	battleWindowsPowersWithHammerFlipHit(earlyHardHitCheck) {
		let hardHit, powers;
		if (earlyHardHitCheck) {
			hardHit = this.checkHammerHardHit();
			powers = this.battleWindowsPowers();
		} else {
			powers = this.battleWindowsPowers();
			hardHit = this.checkHammerHardHit();
		}
		if (hardHit) this.advance(HammerHardHitAdvances);
		this.advance(HammerFlipFinishAdvances);
		return powers;
	}

	/** 銀河に願いをのバトルウィンドウズ戦を、理想的な乱数である限りシミュレートし、出現するコピーの元の配列を返す
	 * @typedef {BattleWindowsPowersResult[]} simulateBattleWindowsMWWResult
	 * @param {ActionTable} magician 魔法使いに対する行動
	 * @param {ActionCombination} actionCombination 魔法使い以外の行動の組み合わせ
	 * @param {number} hammerThrow ハンマー投げのダッシュによる乱数消費数
	 * @param {boolean} [allowDragonStar=false] レッドドラゴンの星攻撃も成功として扱うか
	 * @returns {simulateBattleWindowsMWWResult} 長さは、魔法使いで失敗なら0、悪魔の騎士で失敗なら1、レッドドラゴンで失敗なら2、レッドドラゴン2ターン目で失敗なら3、全て理想的なら4
	 */
	simulateBattleWindowsMWW(magician, actionCombination, hammerThrow, allowDragonStar=false) {
		/** @type {simulateBattleWindowsMWWResult} */
		const result = [];

		// --- 魔法使い ---
		const m = this.simulateMagician(magician);
		if (!m) return result;
		result.push(m);

		// --- 悪魔の騎士 ---
		this.takeAction(actionCombination.knight);
		if (actionCombination.knight.fast) {
			// Fastモード
			this.advance(8);
			const a = this.knightAttacksFirst();
			this.advance(1);
			const b = this.knightAttacksFirst();
			this.advance(2);
			if (a || b) return result;
			result.push(this.battleWindowsPowersWithHammerFlipHit(true));
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
		this.takeAction(actionCombination.dragon);
		if (actionCombination.dragon.fast) {
			// Fastモード
			this.advance(6);
			const a = this.dragonAttacksFirst();
			this.advance(1);
			const b = this.dragonAttacksFirst();
			this.advance(4);
			if (a || b) return result;
			result.push(this.battleWindowsPowersWithHammerFlipHit(true));
		} else {
			// Easyモード
			if (this.dragonAttacksFirst()) return result;
			result.push(this.battleWindowsPowers());
			this.hammerFlipChargeAndHit();
		}
		this.hammerFlipChargeAndHit();	// 2発目の鬼殺し火炎ハンマー

		// --- レッドドラゴン2ターン目 ---
		this.takeAction(actionCombination.dragonAction);
		const dragonAction = this.dragonActs();
		if (dragonAction === DragonGuard || (allowDragonStar && dragonAction === DragonStar)) {
			result.push(this.battleWindowsPowers());
		}

		return result;
	}

	/** 魔法使い戦のシミュレーション
	 * @param {ActionTable} magician 魔法使いに対する行動
	 * @returns {BattleWindowsPowersResult | null} 先制されたらnull
	 */
	simulateMagician(magician) {
		this.takeAction(magician);

		// 魔法使いが先制するかの判定
		if (this.magicianAttacksFirst()) return null;

		// 先制判定後からコピーの元判定前までの消費
		this.advance((magician.lateAdvances ?? 0) + (magician.fast ? HammerFlipChargeAdvances : 0));

		// コピーの元判定
		let powers;
		if (magician.fast) {
			powers =this.battleWindowsPowersWithHammerFlipHit(magician.earlyHardHitCheck ?? false);
		} else {
			powers = this.battleWindowsPowers();
			this.hammerFlipChargeAndHit();
		}

		return powers;
	}
}

/**
 * 星の方向に一致する乱数位置を探索し、星を消費した後の乱数位置のリストを返す
 * @param {number[]} stars 観測された星の向きの配列
 * @param {number} minIndex 探索開始の乱数位置
 * @param {number} maxIndex 探索終了の乱数位置
 * @returns {Uint16Array} 星消費後の乱数位置の配列
 */
export function findIndexesByStars(stars, minIndex, maxIndex) {
	const indexList = [];
	for (let i = minIndex; i <= maxIndex; i++) {
		const r = new KssRng(i);
		if (stars.every(v => r.starDirection() === v)) {
			indexList.push(r.getIndex());
		}
	}
	return new Uint16Array(indexList);
}

// --- 分岐方式の定義 ---
const obsLeft = (/**@type {BattleWindowsPowersResult}*/s) => s.left;
const obsRight = (/**@type {BattleWindowsPowersResult}*/s) => s.right;
const obsPowers = (/**@type {BattleWindowsPowersResult}*/s) => s.left + "-" + s.right;
/** @typedef {{ getObservable: function({sim: BattleWindowsPowersResult[]}): string, minSimLength: number, filterFallback: function(ActionCombination, ActionCombination): boolean }} BranchType */
/**
 * @param {number} simIndex
 * @param {function(BattleWindowsPowersResult): string} observableFn
 * @returns {BranchType}
 */
const createBranchType = (simIndex, observableFn) => ({
	getObservable: (/** @type {{sim: BattleWindowsPowersResult[]}} */ e) => observableFn(e.sim[simIndex]),
	minSimLength: simIndex + 1,
	filterFallback: /** @type {function(ActionCombination, ActionCombination): boolean} */ ([
		() => true,
		(/** @type {ActionCombination} */ p, /** @type {ActionCombination} */ a) => p.knight === a.knight,
		(/** @type {ActionCombination} */ p, /** @type {ActionCombination} */ a) => p.knight === a.knight && p.dragon === a.dragon,
	][simIndex])
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

/** @typedef {{ knight: ActionTable[], dragon: ActionTable[], dragonAction: ActionTable[] }} ActionsDifficultyTable */
/** BattleWindowsMWWManipulatorのactionsDifficultyTableデフォルト値 @type {ActionsDifficultyTable} */
const DefaultActionsDifficultyTable = {
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
		{ difficulty: 150, dashes: 1 },
		{ difficulty: 201, dashes: 1, hammerFlips: 1 },
		{ difficulty: 202, dashes: 1, slides: 1 },
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
		{ difficulty: 200, dashes: 1 },
		{ difficulty: 251, dashes: 1, slides: 1 },
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
		{ difficulty: 250, dashes: 1 },
		{ difficulty: 351, dashes: 1, slides: 1 },
		{ difficulty: 352, dashes: 1, hammerFlips: 1 },
	],
};

/** 魔法使いのFast @type {ActionTable[]} */
export const FastMagicianList = [
	{ lateAdvances: -8, frames: 1, name: "1st frame", fast: true, earlyHardHitCheck: true },
	{ lateAdvances: -6, frames: 3, name: "Fast1",     fast: true, earlyHardHitCheck: true },
	{ lateAdvances: -6, frames: 1, name: "5th frame", fast: true },
	{ lateAdvances: -4, frames: 4, name: "Fast2",     fast: true },
	{ lateAdvances: -2, frames: 4, name: "Fast3",     fast: true },
	{ lateAdvances:  0, frames: 4, name: "Fast4",     fast: true },
];
/** 魔法使いでの行動の優先順位 @type {{ easy: ActionTable[], conservativeFast: ActionTable[], aggressiveFast: ActionTable[] }} */
const MagicianPrioritiesTable = {
	easy: [
		{ },
		{ stars: 1 },
		{ hammerFlips: 1 },
		{ slides: 1 },
		{ dashes: 3 },
		{ dashes: 2, stars: 1 },
		{ dashes: 2, slides: 1 },
		{ dashes: 3, stars: 1 },
		{ dashes: 3, slides: 1 },
		{ slides: 2 },
		{ dashes: 1 },
		{ dashes: 1, slides: 1 },
	],
	conservativeFast: [
		{ },
		{ dashes: 2 },
		{ dashes: 3 },
		{ slides: 1, lateAdvances: 2 },
		{ slides: 1, lateAdvances: 1 },
		{ dashes: 1 },
		FastMagicianList[1],
		FastMagicianList[3],
		FastMagicianList[4],
		FastMagicianList[5],
	],
	aggressiveFast: [
		FastMagicianList[1],
		FastMagicianList[3],
		FastMagicianList[4],
		FastMagicianList[5],
		{ },
		{ dashes: 2 },
		{ dashes: 3 },
		{ slides: 1, lateAdvances: 2 },
		{ slides: 1, lateAdvances: 1 },
		{ dashes: 1 },
	],
};

/** 銀河に願いをのバトルウィンドウズの乱数調整 */
export class BattleWindowsMWWManipulator {
	/**
	 * @param {Object} options
	 * @param {ActionsDifficultyTable} [options.actionsDifficultyTable] 行動と難易度の定義テーブル
	 * @param {keyof MagicianPrioritiesTable} [options.magicianDifficulty] 魔法使いの難易度
	 * @param {boolean} [options.fastKnight] 悪魔の騎士をFastモードで倒すか
	 * @param {boolean} [options.fastDragon] レッドドラゴンをFastモードで倒すか
	 * @param {boolean} [options.allowDragonStar] レッドドラゴンの星攻撃も成功として扱うか
	 * @param {number} [options.hammerThrow] ハンマー投げのダッシュによる乱数消費数
	 * @param {number} [options.minIndex] 探索する乱数の開始位置
	 * @param {number} [options.maxIndex] 探索する乱数の終了位置
	 * @param {(keyof BranchTypes)[]} [options.branchPriorities] 完全一致しない場合にフォールバックとして試す分岐方式の優先順位
	 */
	constructor({
		actionsDifficultyTable = DefaultActionsDifficultyTable,
		magicianDifficulty = 'easy',
		fastKnight = false,
		fastDragon = false,
		allowDragonStar = false,
		hammerThrow = 1,
		minIndex = 2800,
		maxIndex = 3376,
		branchPriorities = ['knightPowers', 'dragonPowers', 'magicianPowers'],
	} = {}) {
		this.magicianDifficulty = magicianDifficulty;
		this.fastKnight = fastKnight;
		this.fastDragon = fastDragon;
		this.allowDragonStar = allowDragonStar;
		this.hammerThrow = hammerThrow;
		this.minIndex = minIndex;
		this.maxIndex = maxIndex;
		this.branchPriorities = branchPriorities;

		// 魔法使いでの行動
		this.magicianList = MagicianPrioritiesTable[this.magicianDifficulty];

		// 魔法使い以外の全ての行動の組み合わせを作成し、難易度の昇順にソート
		/** @type {ActionCombination[]} */
		this.actionCombinations = [];
		const knightList = actionsDifficultyTable.knight.map(e => ({ ...e,  fast: this.fastKnight }));
		const dragonList = actionsDifficultyTable.dragon.map(e => ({ ...e,  fast: this.fastDragon }));
		for (const knight of knightList) {
			for (const dragon of dragonList) {
				for (const dragonAction of actionsDifficultyTable.dragonAction) {
					this.actionCombinations.push({
						difficulty: (knight.difficulty ?? 0) + (dragon.difficulty ?? 0) + (dragonAction.difficulty ?? 0),
						knight,
						dragon,
						dragonAction,
					});
				}
			}
		}
		this.actionCombinations.sort((a, b) => a.difficulty - b.difficulty);
	}

	/** 部分一致候補から分岐方式を適用して解を探す
	 * @typedef {{ index: number, sim: BattleWindowsPowersResult[] }} SimResult シミュレーション結果
	 * @typedef {{ actionCombination: ActionCombination, successes: SimResult[], fails: SimResult[] }} ActionAttempt ある行動パターンに対する全乱数位置のシミュレーション結果
 	 * @typedef {{ type: keyof BranchTypes, value: string, fallbackActionCombination: ActionCombination }} Branch 分岐情報
	 * @param {keyof BranchTypes} branchTypeName 分岐方式の名前
	 * @param {ActionAttempt[]} bestAttempts 試行する行動パターンのリスト
	 * @param {ActionTable} magician 魔法使いに対する行動
	 * @returns {{actionCombination: ActionCombination, branch: Branch} | null}
	 */
	_tryBranch(branchTypeName, bestAttempts, magician) {
		const bt = BranchTypes[branchTypeName];

		for (const attempt of bestAttempts) {
			const { actionCombination, successes, fails } = attempt;
			// 成功と失敗が混在していない場合は分岐の意味がない
			if (fails.length === 0 || successes.length === 0) continue;

			// 失敗エントリのシミュレーション長が、分岐条件の観測に必要な長さに満たない場合はスキップ
			if (fails.some(e => e.sim.length < bt.minSimLength)) continue;

			// 失敗エントリの観測値が全て同一で且つ成功エントリの中にその観測値を持つものが一つもない（つまり2通りの分岐にできる）という条件に当てはまらなければスキップ
			const failObs = bt.getObservable(fails[0]);
			if (fails.some(e => bt.getObservable(e) !== failObs)) continue;
			if (successes.some(e => bt.getObservable(e) === failObs)) continue;

			// 分岐条件（観測値）が一致した場合に、全乱数位置で成功する代替行動を探す
			const failIndices = fails.map(e => e.index);
			for (const altActionCombination of this.actionCombinations) {
				// 分岐ポイントまでの行動が同一でない代替行動は除外
				if (!bt.filterFallback(actionCombination, altActionCombination)) continue;

				const allMatch = failIndices.every(index => {
					const sim = new KssRng(index).simulateBattleWindowsMWW(magician, altActionCombination, this.hammerThrow, this.allowDragonStar);
					return sim.length === 4;
				});

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
	 * @typedef {{ magician: ActionTable | null, actionCombination: ActionCombination | null, branch: Branch | null }} ManipulateResult
	 * @param {number[]} stars バトルウィンドウズ戦開始時に出した星の向き
	 * @returns {ManipulateResult}
	 */
	manipulate(stars) {
		// 星の方向が全て一致する乱数位置を探す（探索後は星消費後の乱数位置が返る）
		const indexList = findIndexesByStars(stars, this.minIndex, this.maxIndex);

		// 魔法使いに先制されない行動を探す。なければ全行動を候補とする
		const magicianFilteredList = this.magicianList.filter(magician => indexList.every(v => new KssRng(v).simulateMagician(magician)));
		const magicianList = magicianFilteredList.length ? magicianFilteredList : this.magicianList;

		/** @type {ManipulateResult} */
		let bestPartialResult = { magician: null, actionCombination: null, branch: null };
		/** @type {ActionAttempt | null} */
		let bestAttemptOverall = null;

		for (const magician of magicianList) {
			/** @type {(ActionAttempt)[]} */
			const bestAttemptsForThisMagician = [];
			let minFailCount = Infinity;

			// 難易度の低い順に行動を走査
			for (const actionCombination of this.actionCombinations) {
				const successes = [];
				const fails = [];

				for (const index of indexList) {
					const sim = new KssRng(index).simulateBattleWindowsMWW(magician, actionCombination, this.hammerThrow, this.allowDragonStar);
					const result = { index, sim };

					if (sim.length === 4) successes.push(result);
					else fails.push(result);
				}

				// 全乱数位置で理想的なら確定
				if (fails.length === 0) {
					return { magician, actionCombination, branch: null };
				}

				// 失敗がより少ない（＝成功が多い）結果を蓄積
				if (fails.length <= minFailCount) {
					if (fails.length < minFailCount) {
						bestAttemptsForThisMagician.length = 0;
						minFailCount = fails.length;
					}
					bestAttemptsForThisMagician.push({ actionCombination, successes, fails });
				}
			}

			// 分岐方式を優先度順に試す
			for (const branchTypeName of this.branchPriorities) {
				const branchResult = this._tryBranch(branchTypeName, bestAttemptsForThisMagician, magician);
				if (branchResult) {
					return { magician, actionCombination: branchResult.actionCombination, branch: branchResult.branch };
				}
			}

			// この魔法使いにおける最良の結果を、全魔法使いを通した中での最良と比較・更新
			for (const attempt of bestAttemptsForThisMagician) {
				const currentBestFailCount = bestAttemptOverall ? bestAttemptOverall.fails.length : Infinity;

				if (minFailCount < currentBestFailCount || !bestAttemptOverall) {
					// より良い（失敗が少ない）結果が見つかった場合は無条件で更新
					bestAttemptOverall = attempt;
					bestPartialResult = { magician, actionCombination: attempt.actionCombination, branch: null };
				} else if (minFailCount === currentBestFailCount) {
					// 失敗数が同じ場合は、より後ろの乱数位置に失敗があるものを優先
					for (let i = 0; i < attempt.fails.length; i++) {
						if (attempt.fails[i].index !== bestAttemptOverall.fails[i].index) {
							if (attempt.fails[i].index > bestAttemptOverall.fails[i].index) {
								bestAttemptOverall = attempt;
								bestPartialResult = { magician, actionCombination: attempt.actionCombination, branch: null };
							}
							break;
						}
					}
				}
			}
		}

		return bestPartialResult;
	}

	/** テスト用関数：設定された乱数範囲に対してシミュレーションを行い結果を集計する
	 * @param {number} stars バトルウィンドウズ戦開始前に消費する星の数
	 * @param {DebugCallback} [debugCallback]
	 * @param {(p: string) => boolean} [ignore]
	 */
	*testGenerator(stars, debugCallback, ignore) {
		const result = {
			magicianNGCount: 0,      // 魔法使いの条件に合う行動が見つからなかった回数
			otherNGCount: 0,         // 行動の組み合わせが見つからなかった回数
			wrongCounts: [0, 0, 0, 0], // 敵i体目で調整が失敗した回数
			successCount: 0,         // 全4体を倒せた回数
			unsolvableSuccessCount: 0, // 失敗が存在する星パターンにおける、成功回数
			branchCount: 0,          // 分岐が発生した回数
			totalBranchMatch: 0,     // 分岐が一致した回数（フォールバック行動を使用）
			totalBranchNoMatch: 0,   // 分岐が不一致だった回数（通常行動を使用）
			/** @type {Record<string, {true: number[], false: number[], starStr: string, type: string, valStr: string}>} */
			branchGroups: {},        // 分岐の種類・値ごとにグループ化した乱数位置の一覧
			/** @type {Record<string, {success: number[], fails: number[][], hasFail: boolean}>} */
			simulationGroups: {},    // 星の方向パターンごとにグループ化した成功・失敗乱数位置の一覧
			/** @type {Record<string, number>} */
			magicianCountList: {},   // 魔法使いの行動ごとの使用回数
			/** @type {Record<string, number>} */
			knightCountList: {},     // 騎士の行動ごとの使用回数
			/** @type {Record<string, number>} */
			dragonCountList: {},     // ドラゴンの行動ごとの使用回数
			/** @type {Record<string, number>} */
			dragonActionCountList: {}, // ドラゴン2ターン目の行動ごとの使用回数
			totalTime: 0,            // manipulate()の合計計算時間（ms）
			averageTime: 0,          // manipulate()の平均計算時間（ms）
			worstTime: 0,            // manipulate()の最悪計算時間（ms）
			// 進捗確認用
			count: 0,
			total: this.maxIndex - this.minIndex + 1,
		};

		for (let i = this.minIndex; i <= this.maxIndex; i++) {
			// debugCallback が指定されている場合のみ Proxy でメソッド呼び出しをフックする
			const r = debugCallback ? new KssRng(i).withProxy(debugCallback, ignore) : new KssRng(i);
			// 星の方向の確認
			const starDirectionList = [];
			for (let j = 0; j < stars; j++) {
				starDirectionList.push(r.starDirection());
			}
			const starStr = starDirectionList.map(v => StarDirectionChars[v]).join('');

			// 乱数調整の行動探索（処理時間を計測）
			const t0 = performance.now();
			let { magician, actionCombination, branch } = this.manipulate(starDirectionList);
			const elapsed = performance.now() - t0;

			// 計算時間の記録
			result.count++;
			result.totalTime += elapsed;
			result.averageTime = result.totalTime / result.count;
			if (elapsed > result.worstTime) result.worstTime = elapsed;

			// 解決不能の場合でもシミュレーションは継続（デフォルト行動で代替）
			if (magician === null) result.magicianNGCount++;
			else if (actionCombination === null) result.otherNGCount++;
			magician ??= this.magicianList[0];
			actionCombination ??= this.actionCombinations[0];

			// 分岐が存在する場合は現在の乱数で分岐条件を判定し、使用する行動を選択する
			let chosenActionCombination = actionCombination;
			if (branch) {
				const bt = BranchTypes[branch.type];
				// 分岐前の乱数位置からシミュレーションを行い、実際の観測値を取得する
				const tempSim = new KssRng(r.getIndex()).simulateBattleWindowsMWW(magician, actionCombination, this.hammerThrow, this.allowDragonStar);
				const isEqual = tempSim.length >= bt.minSimLength && bt.getObservable({ sim: tempSim }) === branch.value;
				if (isEqual) {
					// 分岐条件に一致した場合はフォールバック行動を使用する
					chosenActionCombination = branch.fallbackActionCombination;
				}

				// 分岐の発生を集計
				result.branchCount++;
				const valStr = branch.value;
				// 星パターン・分岐種類・値でキーを作り、一致/不一致ごとに乱数位置をグループ化する
				const key = `${starStr} ${branch.type} = ${valStr}`;
				if (!result.branchGroups[key]) result.branchGroups[key] = { true: [], false: [], starStr, type: branch.type, valStr };
				result.branchGroups[key][`${isEqual}`].push(i);
				
				if (isEqual) result.totalBranchMatch++;
				else result.totalBranchNoMatch++;
			}

			// 行動を適用
			const sim = r.simulateBattleWindowsMWW(magician, chosenActionCombination, this.hammerThrow, this.allowDragonStar);

			// 星パターンごとにグループを作成（初回のみ）
			if (!result.simulationGroups[starStr]) {
				result.simulationGroups[starStr] = {
					success: [],
					fails: [[], [], [], []],
					hasFail: false,
				};
			}

			// 行動の結果を確認
			if (sim.length !== 4) {
				result.wrongCounts[sim.length]++;
				result.simulationGroups[starStr].fails[sim.length].push(i);

				// これまでに記録されていた現在のパターンの成功回数を解決不能時の成功としてカウント
				if (!result.simulationGroups[starStr].hasFail) {
					result.simulationGroups[starStr].hasFail = true;
					result.unsolvableSuccessCount += result.simulationGroups[starStr].success.length;
				}
			} else {			
				result.simulationGroups[starStr].success.push(i);
				result.successCount++;
				if (result.simulationGroups[starStr].hasFail) result.unsolvableSuccessCount++;

				// 成功した行動の使用回数を集計する
				const magicianMsg = JSON.stringify(magician);
				result.magicianCountList[magicianMsg] = (result.magicianCountList[magicianMsg] ?? 0) + 1;

				const knightMsg = JSON.stringify(chosenActionCombination.knight);
				result.knightCountList[knightMsg] = (result.knightCountList[knightMsg] ?? 0) + 1;

				const dragonMsg = JSON.stringify(chosenActionCombination.dragon);
				result.dragonCountList[dragonMsg] = (result.dragonCountList[dragonMsg] ?? 0) + 1;

				const dragonActionMsg = JSON.stringify(chosenActionCombination.dragonAction);
				result.dragonActionCountList[dragonActionMsg] = (result.dragonActionCountList[dragonActionMsg] ?? 0) + 1;
			}

			yield result;
		}
	}
	/** testGeneratorを最後まで回し、最終結果を返す
	 * @param {number} stars
	 * @param {DebugCallback} [debugCallback]
	 * @param {(p: string) => boolean} [ignore]
	 */
	test(stars, debugCallback, ignore) {
		for (const result of this.testGenerator(stars, debugCallback, ignore)) {
			if (result.count === result.total) return result;
		}
	}
}

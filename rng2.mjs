// @ts-check

/**
 * @typedef {{ left: PowerName, right: PowerName, startingIndex: number }} BattleWindowsPowersResult コピーの元判定の結果
 * @typedef {{ difficulty?: number, dashes?: number, stars?: number, hammerFlips?: number, slides?: number, advances?: number, hardHitFirst?: boolean }} ActionTableEntry 行動テーブルのエントリ
 * @typedef {{ advances: number, messageJa: string, messageEn: string, difficulty: number, actions: ActionTableEntry }} EnemyAction 敵に対する行動
 * @typedef {{ advances1: number, advances2: number, fast: boolean, actions: ActionTableEntry, messageJa: string, messageEn: string }} MagicianAction 魔法使いに対する行動
 * @typedef {{ knight: EnemyAction, dragon: EnemyAction, dragonAction: EnemyAction, difficulty: number }} ActionCombination 魔法使い以外の行動の組み合わせ
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
		const hardHit = this.checkHammerHardHit();	//ハードヒットの判定
		const powers = this.battleWindowsPowers();
		if (hardHit) this.advance(HammerHardHitAdvances);	//ハードヒット
		this.advance(HammerFlipFinishAdvances);	//攻撃後の土煙
		return powers;
	}
	/** 魔法使いでの鬼殺しの溜め中の土煙と、先制されるか
	 * @param {number} advances */
	hammerFlipChargeForFastMagician(advances) {
		const a = this.magicianAttacksFirst();
		this.advance(advances);
		return a;
	}
	/** 魔法使いでの鬼殺しのヒットと、出現するコピーの元
	 * @param {boolean} hardHitFirst */
	hammerFlipHitForFastMagician(hardHitFirst) {
		let hardHit, powers;
		if (hardHitFirst) {
			// 先にハードヒットの判定
			hardHit = this.checkHammerHardHit();
			powers = this.battleWindowsPowers();
		} else {
			// 後にハードヒットの判定
			powers = this.battleWindowsPowers();
			hardHit = this.checkHammerHardHit();
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
	/** @returns {DragonAction} */
	dragonActs() {
		return DragonActionTable[this.randi(10)];
	}
	/** バトルウィンドウズのコピーの元の出現
	 * @returns {BattleWindowsPowersResult} */
	battleWindowsPowers() {
		const startingIndex = this.getIndex();
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

		return { left, right, startingIndex };
	}

	/** 銀河に願いをのバトルウィンドウズ戦を、理想的な乱数である限りシミュレートし、出現するコピーの元の配列を返す
	 * @param {MagicianAction} magician 魔法使いに対する行動
	 * @param {ActionCombination} actionCombination 魔法使い以外の行動の組み合わせ
	 * @param {boolean} fastKnight 悪魔の騎士をFastモードでするか
	 * @param {boolean} fastDragon レッドドラゴンをFastモードでするか
	 * @param {number} hammerThrow ハンマー投げのダッシュによる乱数消費数
	 * @param {boolean} [allowDragonStar=false] レッドドラゴンの星攻撃も成功として扱うか
	 * @returns {BattleWindowsPowersResult[]} 長さは、魔法使いで失敗なら0、悪魔の騎士で失敗なら1、レッドドラゴンで失敗なら2、レッドドラゴン2ターン目で失敗なら3、全て理想的なら4
	 */
	simulateBattleWindowsMWW(magician, actionCombination, fastKnight, fastDragon, hammerThrow, allowDragonStar=false) {
		/** @type {BattleWindowsPowersResult[]} */
		const result = [];

		// --- 魔法使い ---
		this.advance(magician.advances1);
		this.label(magician.messageJa);
		if (magician.fast) {
			// Fastモード
			if (this.hammerFlipChargeForFastMagician(magician.advances2)) return result;
			result.push(this.hammerFlipHitForFastMagician(magician.actions.hardHitFirst));
		} else {
			// Easyモード
			if (this.magicianAttacksFirst()) return result;
			this.advance(magician.advances2);	// スライディングは間に合わないから先制判定は間に挟まる
			if (magician.advances2 > 0) this.label("スライディングの残り");
			result.push(this.battleWindowsPowers());
			this.hammerFlipChargeAndHit();
		}

		// --- 悪魔の騎士 ---
		this.advance(actionCombination.knight.advances);
		this.label(actionCombination.knight.messageJa);
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
		this.label(actionCombination.dragon.messageJa);
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
		this.label(actionCombination.dragonAction.messageJa);
		const dragonAction = this.dragonActs();
		if (dragonAction === DragonGuard || (allowDragonStar && dragonAction === DragonStar)) {
			result.push({ ...this.battleWindowsPowers(), dragonAction });
		}

		return result;
	}

	/** @param {string} text */
	label(text) {
		return text;
	}
}

/**
 * 星の方向に一致する乱数位置を探索し、星を消費した後の乱数位置のリストを返す
 * @param {Array<number>} stars 観測された星の向きの配列
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
/** 魔法使いのFastの各タイミングの結果
 * @param {number} index */
export function simulateAllTimingsForFastMagician(index) {
	return [
		{ advances1: 8, hardHitFirst: true,  frames: 1, seg: "", name: "1st frame" },
		{ advances1: 6, hardHitFirst: true,  frames: 3, seg: "1", name: "Fast1" },
		{ advances1: 6, hardHitFirst: false, frames: 1, seg: "", name: "5th frame" },
		{ advances1: 4, hardHitFirst: false, frames: 4, seg: "2", name: "Fast2" },
		{ advances1: 2, hardHitFirst: false, frames: 4, seg: "3", name: "Fast3" },
		{ advances1: 0, hardHitFirst: false, frames: 4, seg: "4", name: "Fast4" },
		{ advances3: 2, hardHitFirst: false, frames: 4, seg: "", name: "Over1" },
		{ advances3: 12, hardHitFirst: false, frames: 0, seg: "", name: "Easy" },
	].map(v => {
		const r = new KssRng(index);
		
		const advances1StartingIndex = r.index;
		if (v.advances1) r.advance(v.advances1);
		const advances1EndingIndex = r.index;

		const kirbyAttacksFirstIndex = r.index;
		const kirbyAttacksFirst = !r.magicianAttacksFirst();
		
		const advances2StartingIndex = r.index;
		const advances2 = HammerFlipChargeAdvances - (v.advances1 ?? v.advances3);
		r.advance(advances2);
		const advances2EndingIndex = r.index;

		let hardHitIndex1 = null, hardHit1 = null;
		let hardHitIndex2 = null, hardHit2 = null;

		if (v.hardHitFirst) {
			hardHitIndex1 = r.index;
			hardHit1 = r.checkHammerHardHit();
		}

		const powersStartingIndex = r.index;
		const powers = r.battleWindowsPowers();
		const powersEndingIndex = r.index;
		const powersAdvances = powersEndingIndex - powersStartingIndex;

		const advances3StartingIndex = r.index;
		if (v.advances3) r.advance(v.advances3);
		const advances3EndingIndex = r.index;

		if (!v.hardHitFirst) {
			hardHitIndex2 = r.index;
			hardHit2 = r.checkHammerHardHit();
		}

		const hardHit = v.hardHitFirst ? hardHit1 : hardHit2;
		const hardHitStartingIndex = r.index;
		if (hardHit) r.advance(HammerHardHitAdvances);
		const hardHitEndingIndex = r.index;

		const finishStartingIndex = r.index;
		r.advance(HammerFlipFinishAdvances);
		const endingIndex = r.index;

		return {
			...v,
			advances1StartingIndex, advances1EndingIndex,
			kirbyAttacksFirstIndex, kirbyAttacksFirst,
			advances2StartingIndex, advances2EndingIndex, advances2,
			hardHitIndex1, hardHit1,
			powersStartingIndex, powers, powersEndingIndex, powersAdvances,
			advances3StartingIndex, advances3EndingIndex,
			hardHitIndex2, hardHit2,
			hardHit, hardHitStartingIndex, hardHitEndingIndex,
			finishStartingIndex, endingIndex,
		};
	});
}

// --- 分岐方式の定義 ---
/** @param {BattleWindowsPowersResult} s */
const obsLeft = s => s.left;
/** @param {BattleWindowsPowersResult} s */
const obsRight = s => s.right;
/** @param {BattleWindowsPowersResult} s */
const obsPowers = s => s.left + "-" + s.right;
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
		(/** @type {ActionCombination} */ p, /** @type {ActionCombination} */ a) => p.knight.advances === a.knight.advances,
		(/** @type {ActionCombination} */ p, /** @type {ActionCombination} */ a) => p.knight.advances === a.knight.advances && p.dragon.advances === a.dragon.advances
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

/** BattleWindowsMWWManipulatorのactionsDifficultyTableデフォルト値
 * @typedef {{ knight: ActionTableEntry[], dragon: ActionTableEntry[], dragonAction: ActionTableEntry[] }} ActionsDifficultyTable 
 * @type {ActionsDifficultyTable}
*/
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

/** 魔法使いでの行動の優先順位
 * @type {{ easy: ActionTableEntry[], conservativeFast: ActionTableEntry[], aggressiveFast: ActionTableEntry[] }}
*/
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
		{ slides: 1, advances: 4 },
		{ slides: 1, advances: 5 },
		{ dashes: 1 },
		{ hammerFlips: 1, advances: 6, hardHitFirst: true },
		{ hammerFlips: 1, advances: 4, hardHitFirst: false },
		{ hammerFlips: 1, advances: 2, hardHitFirst: false },
		{ hammerFlips: 1, advances: 0, hardHitFirst: false },
	],
	aggressiveFast: [
		{ hammerFlips: 1, advances: 6, hardHitFirst: true },
		{ hammerFlips: 1, advances: 4, hardHitFirst: false },
		{ hammerFlips: 1, advances: 2, hardHitFirst: false },
		{ hammerFlips: 1, advances: 0, hardHitFirst: false },
		{ },
		{ dashes: 2 },
		{ dashes: 3 },
		{ slides: 1, advances: 4 },
		{ slides: 1, advances: 5 },
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
	 * @param {Array<keyof BranchTypes>} [options.branchPriorities] 完全一致しない場合にフォールバックとして試す分岐方式の優先順位
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

		// --- 行動のテーブルを変換 ---
		/** @param {ActionTableEntry} a */
		const parseAdvances = ({ dashes=0, slides=0, hammerFlips=0, stars=0 }) => dashes + slides*SlideAdvances + hammerFlips*HammerFlipAdvances + stars*StarDirectionAdvances;

		/** @param {ActionTableEntry} a */
		const parseMessageJa = ({ dashes, slides, hammerFlips, stars, advances }) => {
			const a = [];
			if (advances !== undefined) {
				if (slides) a.push(["", "", "", "", "準速スライディング", "最速スライディング"][advances]);
				if (hammerFlips) a.push(["Fast4", "", "Fast3", "", "Fast2", "", "Fast1"][advances]);
			} else {
				if (dashes) a.push(["", "短ダッシュ", "ダッシュ", "長ダッシュ"][dashes]);
				if (stars) a.push(["", "星", "2星"][stars]);
				if (hammerFlips) a.push(["", "鬼殺し", "2鬼殺し"][hammerFlips]);
				if (slides) a.push(["", "スライディング", "2スライディング"][slides]);
			}
			return a.length ? a.join(" & ") : "待機";
		};

		/** @param {ActionTableEntry} a */
		const parseMessageEn = ({ dashes, slides, hammerFlips, stars, advances }) => {
			const a = [];
			if (advances !== undefined) {
				if (slides) a.push(["", "", "", "", "Sub-optimal Slide", "Optimal Slide"][advances]);
				if (hammerFlips) a.push(["Fast4", "", "Fast3", "", "Fast2", "", "Fast1"][advances]);
			} else {
				if (dashes) a.push(["", "Short Dash", "Dash", "Long Dash"][dashes]);
				if (stars) a.push(["", "Star", "2 Stars"][stars]);
				if (hammerFlips) a.push(["", "Flip", "2 Flips"][hammerFlips]);
				if (slides) a.push(["", "Slide", "2 Slides"][slides]);
			}
			return a.length ? a.join(" & ") : "Wait";
		};

		/** @param {ActionTableEntry[]} actionsData */
		const parseEnemyActions = (actionsData) => {
			return actionsData.map(a => ({
				difficulty: a.difficulty ?? 0,
				advances: parseAdvances(a),
				actions: a,
				messageJa: parseMessageJa(a),
				messageEn: parseMessageEn(a),
			}));
		};

		/** @type {ActionTableEntry[]} */
		const magicianActionList = MagicianPrioritiesTable[this.magicianDifficulty];
		/** @type {MagicianAction[]} */
		this.magicianActions = magicianActionList.map(a => {
			const advances = parseAdvances(a);
			return {
				advances1: a.advances === undefined ? advances : a.advances,
				advances2: a.advances === undefined ? 0 : (a.hammerFlips ? HammerFlipChargeAdvances : advances) - a.advances,
				fast: a.advances !== undefined && a.hammerFlips !== undefined,
				actions: a,
				messageJa: parseMessageJa(a),
				messageEn: parseMessageEn(a),
			};
		});

		const knightActions = parseEnemyActions(actionsDifficultyTable.knight);
		const dragonActions = parseEnemyActions(actionsDifficultyTable.dragon);
		const dragonActionActions = parseEnemyActions(actionsDifficultyTable.dragonAction);

		// 魔法使い以外の全ての行動の組み合わせを作成し、難易度の昇順にソート
		/** @type {ActionCombination[]} */
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

	/** 部分一致候補から分岐方式を適用して解を探す
	 * @typedef {{ actionCombination: ActionCombination, index: number, sim: BattleWindowsPowersResult[] }} SimulationEntry シミュレーション結果エントリ
 	 * @typedef {{ type: keyof BranchTypes, value: string, fallbackActionCombination: ActionCombination }} Branch 分岐情報
	 * @param {keyof BranchTypes} branchTypeName
	 * @param {SimulationEntry[][]} bestPartialMatches
	 * @param {MagicianAction} magician
	 * @returns {{actionCombination: ActionCombination, branch: Branch} | null}
	 */
	_tryBranch(branchTypeName, bestPartialMatches, magician) {
		const bt = BranchTypes[branchTypeName];

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

			// 失敗した乱数位置の群に対して機能するactionCombinationを探す
			const actionCombination = list[0].actionCombination;
			const failIndices = unmatched.map(e => e.index);
			for (const altActionCombination of this.actionCombinations) {
				if (!bt.filterFallback(actionCombination, altActionCombination)) continue;
				let allMatch = true;
				for (const index of failIndices) {
					const sim = new KssRng(index).simulateBattleWindowsMWW(magician, altActionCombination, this.fastKnight, this.fastDragon, this.hammerThrow, this.allowDragonStar);
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
	 * @typedef {{ magician: MagicianAction | null, actionCombination: ActionCombination | null, branch: Branch | null }} ManipulateResult
	 * @param {number[]} stars バトルウィンドウズ戦開始時に出した星の向き
	 * @returns {ManipulateResult}
	 */
	manipulate(stars) {
		// 星の方向が全て一致する乱数位置を探す（探索後は星消費後の乱数位置が返る）
		const indexList = findIndexesByStars(stars, this.minIndex, this.maxIndex);

		// 魔法使いに先制されない行動を探す
		// 先制されない行動があればそれだけ使う。なければ全行動を候補とする（全て先制される場合のフォールバック）
		const magicianFilteredList = this.magicianActions.filter(magician => indexList.every(v => !new KssRng(v + magician.advances1).magicianAttacksFirst()));
		const magicianList = magicianFilteredList.length ? magicianFilteredList : this.magicianActions;

		/** @type {ManipulateResult} */
		let bestPartialResult = { magician: null, actionCombination: null, branch: null };
		/** @type {SimulationEntry[]} */
		let bestPartialMatchAll = [];
		let bestMatchCountAll = 0;
		for (const magician of magicianList) {

			// 難易度の低い順に行動を走査
			/** @type {SimulationEntry[][]} */
			const bestPartialMatches = [];
			let bestMatchCount = 0;
			for (const actionCombination of this.actionCombinations) {
				// 可能性のある全ての乱数位置で理想的か確認
				const list = [];
				let matchCount = 0;
				for (const index of indexList) {
					const sim = new KssRng(index).simulateBattleWindowsMWW(magician, actionCombination, this.fastKnight, this.fastDragon, this.hammerThrow, this.allowDragonStar);
					if (sim.length === 4) matchCount++;
					list.push({ actionCombination, index, sim });
				}

				// 全乱数位置で理想的なら確定
				if (matchCount === indexList.length) {
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
				const branchResult = this._tryBranch(branchTypeName, bestPartialMatches, magician);
				if (branchResult) {
					return { magician, actionCombination: branchResult.actionCombination, branch: branchResult.branch };
				}
			}

			// 最良の部分一致を記録
			if (bestMatchCount >= bestMatchCountAll) {
				for (const list of bestPartialMatches) {
					if (bestMatchCount > bestMatchCountAll || bestPartialMatchAll.length === 0) {
						bestMatchCountAll = bestMatchCount;
						bestPartialMatchAll = list;
						bestPartialResult = { magician, actionCombination: list[0].actionCombination, branch: null };
					} else {
						// 数が同じ場合は、より後ろの乱数位置に失敗があるものを優先
						let isBetter = false;
						for (let i = 0; i < list.length; i++) {
							const newMatch = list[i].sim.length === 4;
							const oldMatch = bestPartialMatchAll[i].sim.length === 4;
							if (newMatch !== oldMatch) {
								isBetter = newMatch;
								break;
							}
						}
						if (isBetter) {
							bestPartialMatchAll = list;
							bestPartialResult = { magician, actionCombination: list[0].actionCombination, branch: null };
						}
					}
				}
			}
		}

		return bestPartialResult;
	}

	/** テスト用関数：設定された乱数範囲に対してシミュレーションを行い結果を集計する
	 * @typedef {function({depth: number, p: keyof KssRng, index: number, result: any, args: any[]}): void} DebugCallback デバッグコールバック
	 * @typedef {(p: keyof KssRng) => boolean} DebugIgnore 関数名に無視するか返す
	 * @param {number} stars バトルウィンドウズ戦開始前に消費する星の数
	 * @param {DebugCallback} [debugCallback]
	 * @param {DebugIgnore} [ignore]
	 */
	*testGenerator(stars, debugCallback, ignore = p => ['randi', 'advance', 'getIndex', 'getValue'].includes(p) ) {
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
		};

		const total = this.maxIndex - this.minIndex + 1;
		let count = 0;
		let progress = 0;

		for (let i = this.minIndex; i <= this.maxIndex; i++) {
			// debugCallback が指定されている場合のみ Proxy でメソッド呼び出しをフックする
			const r = debugCallback ? (() => {
				let depth = -1;
				return new Proxy(new KssRng(i), {
					get(target, /** @type {keyof KssRng} */ p, receiver) {
						if (typeof p !== 'string') return Reflect.get(target, p, receiver);
						const v = /** @type {Function} */ (target[p]);
						if (typeof v !== 'function' || ignore(p)) return v;
						return function(/** @type {any[]} */...args) {
							depth++;
							const result = v.call(receiver, ...args);
							const index = target.getIndex();
							debugCallback({ depth, p, index, result, args });
							depth--;
							return result;
						}
					}
				});
			})() : new KssRng(i);
			r.label("## 開始乱数");

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
			count++;
			result.totalTime += elapsed;
			result.averageTime = result.totalTime / count;
			if (elapsed > result.worstTime) result.worstTime = elapsed;

			// 解決不能の場合でもシミュレーションは継続（デフォルト行動で代替）
			if (magician === null) result.magicianNGCount++;
			else if (actionCombination === null) result.otherNGCount++;
			magician ??= this.magicianActions[0];
			actionCombination ??= this.actionCombinations[0];

			// 分岐が存在する場合は現在の乱数で分岐条件を判定し、使用する行動を選択する
			let chosenActionCombination = actionCombination;
			let branchStr = "なし";
			if (branch) {
				const bt = BranchTypes[branch.type];
				// 分岐前の乱数位置からシミュレーションを行い、実際の観測値を取得する
				const tempSim = new KssRng(r.getIndex()).simulateBattleWindowsMWW(magician, actionCombination, this.fastKnight, this.fastDragon, this.hammerThrow, this.allowDragonStar);
				const isEqual = tempSim.length >= bt.minSimLength && bt.getObservable({ sim: tempSim }) === branch.value;
				if (isEqual) {
					// 分岐条件に一致した場合はフォールバック行動を使用する
					chosenActionCombination = branch.fallbackActionCombination;
				}

				// 分岐の発生を集計
				result.branchCount++;
				const valStr = branch.value;
				branchStr = `${branch.type} ${isEqual ? "=" : "≠"} ${valStr}`;
				// 星パターン・分岐種類・値でキーを作り、一致/不一致ごとに乱数位置をグループ化する
				const key = `${starStr} ${branch.type} = ${valStr}`;
				if (!result.branchGroups[key]) result.branchGroups[key] = { true: [], false: [], starStr, type: branch.type, valStr };
				result.branchGroups[key][`${isEqual}`].push(i);
				
				if (isEqual) result.totalBranchMatch++;
				else result.totalBranchNoMatch++;
			}
			if (debugCallback && branchStr !== "なし") r.label("分岐: "+branchStr);

			// 行動を適用
			const sim = r.simulateBattleWindowsMWW(magician, chosenActionCombination, this.fastKnight, this.fastDragon, this.hammerThrow, this.allowDragonStar);

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
				const magicianMsg = magician.messageJa;
				result.magicianCountList[magicianMsg] = (result.magicianCountList[magicianMsg] ?? 0) + 1;

				const knightMsg = chosenActionCombination.knight.messageJa;
				result.knightCountList[knightMsg] = (result.knightCountList[knightMsg] ?? 0) + 1;

				const dragonMsg = chosenActionCombination.dragon.messageJa;
				result.dragonCountList[dragonMsg] = (result.dragonCountList[dragonMsg] ?? 0) + 1;

				const dragonActionMsg = chosenActionCombination.dragonAction.messageJa;
				result.dragonActionCountList[dragonActionMsg] = (result.dragonActionCountList[dragonActionMsg] ?? 0) + 1;
			}

			// 進捗が1%以上変化したタイミングで呼び出し元に処理を返す
			const newProgress = Math.floor(count / total * 100);
			if (newProgress !== progress) {
				progress = newProgress;
				yield { progress, result };
			}
		}
	}
	/** testGeneratorを最後まで回し、最終結果を返す
	 * @param {number} stars
	 * @param {DebugCallback} [debugCallback]
	 * @param {DebugIgnore} [ignore]
	 */
	test(stars, debugCallback, ignore) {
		for (const { progress, result } of this.testGenerator(stars, debugCallback, ignore)) {
			if (progress === 100) return result;
		}
	}
}

// @ts-check

/** @template T @typedef {number & {__brand: T}} ID */
/** @typedef {ID<'RngIndex'>} RngIndex 乱数位置 */
/** @typedef {{ difficulty?: number, dashes?: number, stars?: number, hammerFlips?: number, slides?: number, lateAdvances?: number, earlyHardHitCheck?: boolean, fast?: boolean, frames?: number, name?: string }} ActionTable 行動テーブル */
/** @typedef {{ knight: ActionTable, dragon: ActionTable, dragonAction: ActionTable, difficulty: number }} ActionCombination 魔法使い以外の行動の組み合わせ */

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

// --- KssRng.simulateBattleWindowsMWWの結果のインデックスの定義 ---
/** @typedef {0|1|2|3} SimIndex */
export const SIM_INDEX_MAGICIAN = 0;
export const SIM_INDEX_KNIGHT = 1;
export const SIM_INDEX_DRAGON = 2;
export const SIM_INDEX_DRAGON_TURN2 = 3;

// --- 乱数の結果を変換するテーブル ---

/** 星の方向を表す文字（randi(8)に対応） */
export const StarDirectionChars =  "↑↗→↘↓↙←↖";

/** @typedef {'Star' | 'Guard' | 'Other'} DragonAction レッドドラゴンの行動 */
/** @type {DragonAction[]}  レッドドラゴンの行動テーブル（randi(10)に対応）*/
export const DragonActionNames = ["Star", "Other", "Other", "Star", "Other", "Other", "Guard", "Other", "Other", "Guard"];
const parseDragonAction = (/**@type {DragonAction}*/v) => /**@type {ID<DragonAction>}*/(DragonActionNames.indexOf(v));
export const DragonActionMap = Uint8Array.from(DragonActionNames, v => parseDragonAction(v));
export const DragonStar = parseDragonAction('Star');
export const DragonGuard = parseDragonAction('Guard');

/** @typedef {'Fighter' | 'Plasma' | 'Hammer' | 'Beam' | 'Bomb' | 'Sword' | 'Stone' | 'Cutter' | 'Wheel' | 'Jet' | 'Ice' | 'Parasol' | 'Fire' | 'Suplex' | 'Ninja' | 'Yo-yo' | 'Mirror' | 'Wing' | 'None'} PowerName コピーの元の名前 */
/** @type {PowerName[]} コピーの元の名前テーブル（12個×2プール） */
export const BattleWindowsPowerNames = ["Fighter", "Plasma", "Hammer", "Beam", "Bomb", "Sword", "Hammer", "Bomb", "Plasma", "Sword", "Beam", "Fighter", "Stone", "Cutter", "Wheel", "Jet", "Ice", "Parasol", "Fire", "Suplex", "Ninja", "Yo-yo", "Mirror", "Wing", "None"];
const parseBattleWindowsPower = (/**@type {PowerName}*/v) => /**@type {ID<PowerName>}*/(BattleWindowsPowerNames.indexOf(v));
export const BattleWindowsPowerMap = Uint8Array.from(BattleWindowsPowerNames, v => parseBattleWindowsPower(v));
export const BattleWindowsPowerNone = parseBattleWindowsPower('None');
/** @typedef {ID<'BattleWindowsPowersPair'>} BattleWindowsPowersPair コピーの元判定の結果 */
export function getLeftPower(/**@type {BattleWindowsPowersPair}*/p) { return p >> 8; }
export function getRightPower(/**@type {BattleWindowsPowersPair}*/p) { return p & 0xFF; }

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
	/** @param {RngIndex} index 初期乱数位置 */
	constructor(index) {
		this.index = index;
	}
	/** KssRngのメソッド呼び出しをフックするProxyを作成
	 * @typedef {function({startingIndex: RngIndex, endingIndex: RngIndex, p: keyof KssRng, result: any, args: any[]}): void} DebugCallback デバッグコールバック
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
		this.index = KssRng.calcIndex(this.index, count);
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
	/** @return {ID<DragonAction>} */
	dragonActs() {
		return /**@type {ID<DragonAction>}*/(DragonActionMap[this.randi(10)]);
	}
	/** バトルウィンドウズのコピーの元の出現
	 * @returns {BattleWindowsPowersPair} */
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
		do {
			if (this.randi(4) === 2) {
				const poolIdx = this.randi(4) & 1;
				const pwrIdx = this.randi(12);
				left = BattleWindowsPowerMap[poolIdx * 12 + pwrIdx];
			} else {
				left = BattleWindowsPowerNone;
				break;
			}
		} while (left === right);

		return /**@type {BattleWindowsPowersPair}*/(left << 8 | right);
	}
	/** 鬼殺しのヒットとともに、バトルウィンドウズのコピーの元の出現を、ハードヒット判定の前か後に行う
	 * @param {boolean} earlyHardHitCheck
	 * @returns {BattleWindowsPowersPair} */
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
	 * @param {ActionTable} magician 魔法使いに対する行動
	 * @param {ActionCombination} actionCombination 魔法使い以外の行動の組み合わせ
	 * @param {number} hammerThrow ハンマー投げのダッシュによる乱数消費数
	 * @param {boolean} [allowDragonStar=false] レッドドラゴンの星攻撃も成功として扱うか
	 * @returns {BattleWindowsPowersPair[]} 長さは、魔法使いで失敗ならSIM_INDEX_MAGICIAN(0)、悪魔の騎士で失敗ならSIM_INDEX_KNIGHT(1)、レッドドラゴンで失敗ならSIM_INDEX_DRAGON(2)、レッドドラゴン2ターン目で失敗ならSIM_INDEX_DRAGON_TURN2(3)、全て理想的なら4
	 */
	simulateBattleWindowsMWW(magician, actionCombination, hammerThrow, allowDragonStar=false) {
		/** @type {BattleWindowsPowersPair[]} */
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
	 * @returns {BattleWindowsPowersPair | null} 先制されたらnull
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

	// --- ヘルパー関数 ---

	/** 乱数位置に値を加算してからモジュロ計算する
	 * @param {RngIndex} index 元の乱数位置
	 * @param {number} append 乱数位置に加算する値
	 * @returns {RngIndex} */
	static calcIndex(index, append) {
		return /**@type {RngIndex}*/(((index + append) % CYCLE_LEN + CYCLE_LEN) % CYCLE_LEN);
	}

	/** 連続する乱数位置のKssRngを順番に返す
	 * @param {number} minIndex
	 * @param {number} maxIndex
	 * @returns {IterableIterator<KssRng>}
	 */
	static *range(minIndex, maxIndex) {
		let i = /**@type {RngIndex}*/ (minIndex);
		while (true) {
			yield new KssRng(i);
			if (i === maxIndex) break;
			i = KssRng.calcIndex(i, 1);
		}
	}

	/** 星消費後の乱数位置から、消費前の乱数位置（到着位置）を逆算する
	 * @param {RngIndex} index 星消費後の乱数位置
	 * @param {number} starsCount 消費した星の数
	 * @returns {RngIndex} */
	static getArrivalIndex(index, starsCount) {
		return this.calcIndex(index, -starsCount * StarDirectionAdvances);
	}

	/**
	 * 星の方向に一致する乱数位置を探索し、星を消費した後の乱数位置のリストを返す
	 * @param {number[]} stars 観測された星の向きの配列
	 * @param {number} minIndex 探索開始の乱数位置
	 * @param {number} maxIndex 探索終了の乱数位置
	 * @returns {RngIndex[]} 星消費後の乱数位置の配列
	 */
	static findIndicesByStars(stars, minIndex, maxIndex) {
		/** @type {RngIndex[]} */
		const indices = [];
		for (const r of KssRng.range(minIndex, maxIndex)) {
			if (stars.every(v => r.starDirection() === v)) {
				indices.push(r.getIndex());
			}
		}
		return indices;
	}
}

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
/** @typedef {keyof MagicianPrioritiesTable} MagicianDifficulty */
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

/**
 * @typedef {{ simIndex: SimIndex, value: BattleWindowsPowersPair, fallbackActionCombination: ActionCombination }} Branch 分岐情報
 * @typedef {{ magician: ActionTable | null, actionCombination: ActionCombination | null, branch: Branch | null }} ManipulateResult
 */
/** 銀河に願いをのバトルウィンドウズの乱数調整 */
export class BattleWindowsMWWManipulator {
	/**
	 * @param {Object} options
	 * @param {ActionsDifficultyTable} [options.actionsDifficultyTable] 行動と難易度の定義テーブル
	 * @param {MagicianDifficulty} [options.magicianDifficulty] 魔法使いの難易度
	 * @param {boolean} [options.fastKnight] 悪魔の騎士をFastモードで倒すか
	 * @param {boolean} [options.fastDragon] レッドドラゴンをFastモードで倒すか
	 * @param {boolean} [options.allowDragonStar] レッドドラゴンの星攻撃も成功として扱うか
	 * @param {number} [options.hammerThrow] ハンマー投げのダッシュによる乱数消費数
	 * @param {number} [options.minIndex] 探索する乱数の開始位置
	 * @param {number} [options.maxIndex] 探索する乱数の終了位置
	 * @param {SimIndex[]} [options.branchPriorities] 完全一致しない場合にフォールバックとして試す分岐位置（SimIndex）の優先順位
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
		branchPriorities = [SIM_INDEX_KNIGHT, SIM_INDEX_DRAGON, SIM_INDEX_MAGICIAN],
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
	 * @typedef {{ index: RngIndex, sim: BattleWindowsPowersPair[] }} SimResult シミュレーション結果
	 * @typedef {{ actionCombination: ActionCombination, successes: SimResult[], fails: SimResult[] }} ActionAttempt ある行動パターンに対する全乱数位置のシミュレーション結果
	 * @param {SimIndex} simIndex 分岐方式のインデックス
	 * @param {ActionAttempt[]} bestAttempts 試行する行動パターンのリスト
	 * @param {ActionTable} magician 魔法使いに対する行動
	 * @returns {{actionCombination: ActionCombination, branch: Branch} | null}
	 */
	_tryBranch(simIndex, bestAttempts, magician) {
		const filterFallback = /** @type {function(ActionCombination, ActionCombination): boolean} */ ({
			[SIM_INDEX_MAGICIAN]: () => true,
			[SIM_INDEX_KNIGHT]: (/** @type {ActionCombination} */ p, /** @type {ActionCombination} */ a) => p.knight === a.knight,
			[SIM_INDEX_DRAGON]: (/** @type {ActionCombination} */ p, /** @type {ActionCombination} */ a) => p.knight === a.knight && p.dragon === a.dragon,
			[SIM_INDEX_DRAGON_TURN2]: (/** @type {ActionCombination} */ p, /** @type {ActionCombination} */ a) => p.knight === a.knight && p.dragon === a.dragon && p.dragonAction === a.dragonAction,
		}[simIndex]);

		for (const attempt of bestAttempts) {
			const { actionCombination, successes, fails } = attempt;
			// 成功と失敗が混在していない場合は分岐の意味がない
			if (fails.length === 0 || successes.length === 0) continue;

			// 失敗エントリのシミュレーション長が、分岐条件の観測に必要な長さに満たない場合はスキップ
			if (fails.some(e => e.sim.length <= simIndex)) continue;

			// 失敗エントリの観測値が全て同一で且つ成功エントリの中にその観測値を持つものが一つもない（つまり2通りの分岐にできる）という条件に当てはまらなければスキップ
			const failObs = fails[0].sim[simIndex];
			if (fails.some(e => e.sim[simIndex] !== failObs)) continue;
			if (successes.some(e => e.sim[simIndex] === failObs)) continue;

			// 分岐条件（観測値）が一致した場合に、全乱数位置で成功する代替行動を探す
			const failIndices = fails.map(e => e.index);
			for (const altActionCombination of this.actionCombinations) {
				// 分岐ポイントまでの行動が同一でない代替行動は除外
				if (!filterFallback(actionCombination, altActionCombination)) continue;

				const allMatch = failIndices.every(index => {
					const sim = new KssRng(index).simulateBattleWindowsMWW(magician, altActionCombination, this.hammerThrow, this.allowDragonStar);
					return sim.length === 4;
				});

				if (allMatch) {
					return {
						actionCombination,
						branch: { simIndex, value: failObs, fallbackActionCombination: altActionCombination },
					};
				}
			}
		}
		return null;
	}

	/** 銀河に願いをのバトルウィンドウズ戦の乱数調整のための行動を探す
	 * @param {number[]} stars バトルウィンドウズ戦開始時に出した星の向き
	 * @returns {ManipulateResult}
	 */
	manipulate(stars) {
		// 星の方向が全て一致する乱数位置を探す（探索後は星消費後の乱数位置が返る）
		const indices = KssRng.findIndicesByStars(stars, this.minIndex, this.maxIndex);

		// 魔法使いに先制されない行動を探す。なければ全行動を候補とする
		const magicianFilteredList = this.magicianList.filter(magician => indices.every(v => new KssRng(v).simulateMagician(magician)));
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

				for (const index of indices) {
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
			for (const simIndex of this.branchPriorities) {
				const branchResult = this._tryBranch(simIndex, bestAttemptsForThisMagician, magician);
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
			/** @type {Map<string, {true: number[], false: RngIndex[], simIndex: SimIndex, value: BattleWindowsPowersPair}>} */
			branchGroups: new Map(),        // 分岐の種類・値ごとにグループ化した乱数位置の一覧
			/** @type {Map<string, {success: number[], fails: RngIndex[][], hasFail: boolean, manipulateResult: ManipulateResult}>} */
			simulationGroups: new Map(),    // 星の方向パターンごとにグループ化した成功・失敗乱数位置の一覧
			/** @type {Map<ActionTable, number>} */
			magicianCountList: new Map(),   // 魔法使いの行動ごとの使用回数
			/** @type {Map<ActionTable, number>} */
			knightCountList: new Map(),     // 騎士の行動ごとの使用回数
			/** @type {Map<ActionTable, number>} */
			dragonCountList: new Map(),     // ドラゴンの行動ごとの使用回数
			/** @type {Map<ActionTable, number>} */
			dragonActionCountList: new Map(), // ドラゴン2ターン目の行動ごとの使用回数
			totalTime: 0,            // manipulate()の合計計算時間（ms）
			worstTime: 0,            // manipulate()の最悪計算時間（ms）
			// 進捗確認用
			count: 0,
			total: this.maxIndex - this.minIndex + 1,
		};

		for (const r_ of KssRng.range(this.minIndex, this.maxIndex)) {
			const i = r_.getIndex();
			// debugCallback が指定されている場合のみ Proxy でメソッド呼び出しをフックする
			const r = debugCallback ? r_.withProxy(debugCallback, ignore) : r_;
			// 星の方向の確認
			const starDirectionList = [];
			for (let j = 0; j < stars; j++) {
				starDirectionList.push(r.starDirection());
			}
			const starStr = starDirectionList.map(v => StarDirectionChars[v]).join('');

			// 既に同じ星のパターンの結果がないか確認
			let simGroup = result.simulationGroups.get(starStr);

			// 乱数調整の行動探索（処理時間を計測）
			const t0 = performance.now();
			const manipulateResult = simGroup ? simGroup.manipulateResult : this.manipulate(starDirectionList);
			const elapsed = performance.now() - t0;

			// 計算時間の記録
			result.count++;
			result.totalTime += elapsed;
			if (elapsed > result.worstTime) result.worstTime = elapsed;

			// 解決不能の場合でもシミュレーションは継続（デフォルト行動で代替）
			let { magician, actionCombination, branch } = manipulateResult;
			if (magician === null) result.magicianNGCount++;
			else if (actionCombination === null) result.otherNGCount++;
			magician ??= this.magicianList[0];
			actionCombination ??= this.actionCombinations[0];

			// 分岐が存在する場合は現在の乱数で分岐条件を判定し、使用する行動を選択する
			let chosenActionCombination = actionCombination;
			if (branch) {
				// 分岐前の乱数位置からシミュレーションを行い、実際の観測値を取得する
				const tempSim = new KssRng(r.getIndex()).simulateBattleWindowsMWW(magician, actionCombination, this.hammerThrow, this.allowDragonStar);
				const isEqual = tempSim.length > branch.simIndex && tempSim[branch.simIndex] === branch.value;
				if (isEqual) {
					// 分岐条件に一致した場合はフォールバック行動を使用する
					chosenActionCombination = branch.fallbackActionCombination;
				}

				// 分岐の発生を集計
				result.branchCount++;
				// 一致/不一致ごとに乱数位置をグループ化する
				let branchGroup = result.branchGroups.get(starStr);
				if (!branchGroup) {
					branchGroup = { true: [], false: [], simIndex: branch.simIndex, value: branch.value };
					result.branchGroups.set(starStr, branchGroup);
				}
				branchGroup[`${isEqual}`].push(i);

				if (isEqual) result.totalBranchMatch++;
				else result.totalBranchNoMatch++;
			}

			// 行動を適用
			const sim = r.simulateBattleWindowsMWW(magician, chosenActionCombination, this.hammerThrow, this.allowDragonStar);

			// 星パターンごとにグループを作成（初回のみ）
			if (!simGroup) {
				simGroup = {
					success: [],
					fails: [[], [], [], []],
					hasFail: false,
					manipulateResult,
				};
				result.simulationGroups.set(starStr, simGroup);
			}

			// 行動の結果を確認
			if (sim.length !== 4) {
				result.wrongCounts[sim.length]++;
				simGroup.fails[sim.length].push(i);

				// これまでに記録されていた現在のパターンの成功回数を解決不能時の成功としてカウント
				if (!simGroup.hasFail) {
					simGroup.hasFail = true;
					result.unsolvableSuccessCount += simGroup.success.length;
				}
			} else {			
				simGroup.success.push(i);
				result.successCount++;
				if (simGroup.hasFail) result.unsolvableSuccessCount++;

				// 成功した行動の使用回数を集計する
				result.magicianCountList.set(magician, (result.magicianCountList.get(magician) ?? 0) + 1);
				result.knightCountList.set(chosenActionCombination.knight, (result.knightCountList.get(chosenActionCombination.knight) ?? 0) + 1);
				result.dragonCountList.set(chosenActionCombination.dragon, (result.dragonCountList.get(chosenActionCombination.dragon) ?? 0) + 1);
				result.dragonActionCountList.set(chosenActionCombination.dragonAction, (result.dragonActionCountList.get(chosenActionCombination.dragonAction) ?? 0) + 1);
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

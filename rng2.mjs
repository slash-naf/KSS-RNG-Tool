// @ts-check

/** @template T @typedef {number & {__brand: T}} ID */
/** @template T @typedef {T extends Function | number | string | boolean | bigint | symbol | null | undefined ? T : T extends Array<infer U> ? ReadonlyArray<DeepReadonly<U>> : { readonly [K in keyof T]: DeepReadonly<T[K]> }} DeepReadonly */
/** @typedef {ID<'RngIndex'>} RngIndex 乱数位置 */
/** @typedef {{ difficulty?: number, timeloss?: number, dashes?: number, stars?: number, hammerFlips?: number, slides?: number, lateAdvances?: number, fast?: number, name?: string }} ActionTable 行動テーブル */

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
export function makePowersPair(/**@type {number}*/left, /**@type {number}*/right) { return /**@type {BattleWindowsPowersPair}*/(left << 8 | right); }
export function parsePowersPair(/**@type {PowerName}*/left, /**@type {PowerName}*/right) { return makePowersPair(parseBattleWindowsPower(left), parseBattleWindowsPower(right)); }
export const NoPowersPair = parsePowersPair('None', 'None');
export function getLeftPower(/**@type {BattleWindowsPowersPair}*/p) { return /**@type {ID<PowerName>}*/(p >> 8); }
export function getRightPower(/**@type {BattleWindowsPowersPair}*/p) { return /**@type {ID<PowerName>}*/(p & 0xFF); }

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
		this.hammerHardHit(hardHit);
	}
	/** ハンマーがハードヒットするかどうか */
	checkHammerHardHit() {
		return this.randi(4) === 0;
	}
	/** ハンマーのハードヒット
	 * @param {boolean} hardHit */
	hammerHardHit(hardHit){
		if (hardHit) this.advance(HammerHardHitAdvances);
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
	 * @param {boolean} noPowersFor3 3ターン連続でコピーの元が一切出ていないか
	 * @returns {BattleWindowsPowersPair} */
	battleWindowsPowers(noPowersFor3=false) {
		//右の出現
		let right;
		if (noPowersFor3 || this.randi(4) === 1) {
			const poolIdx = this.randi(4) & 1;
			const pwrIdx = this.randi(12);
			right = BattleWindowsPowerMap[poolIdx * 12 + pwrIdx];
		} else {
			right = BattleWindowsPowerNone;
		}

		//左の出現 (左右とも出現して同じ種類だったら再抽選)
		let left;
		do {
			if (noPowersFor3 || this.randi(4) === 2) {
				const poolIdx = this.randi(4) & 1;
				const pwrIdx = this.randi(12);
				left = BattleWindowsPowerMap[poolIdx * 12 + pwrIdx];
			} else {
				left = BattleWindowsPowerNone;
				break;
			}
		} while (left === right);

		return makePowersPair(left, right);
	}
	/** 鬼殺しのヒットとともに、バトルウィンドウズのコピーの元の出現を、ハードヒット判定の前か後に行う
	 * @param {boolean} earlyHardHitCheck
	 * @param {boolean} noPowersFor3
	 * @returns {BattleWindowsPowersPair} */
	battleWindowsPowersWithHammerFlipHit(earlyHardHitCheck=false, noPowersFor3=false) {
		let hardHit, powers;
		if (earlyHardHitCheck) {
			hardHit = this.checkHammerHardHit();
			powers = this.battleWindowsPowers(noPowersFor3);
		} else {
			powers = this.battleWindowsPowers(noPowersFor3);
			hardHit = this.checkHammerHardHit();
		}
		this.hammerHardHit(hardHit);
		this.advance(HammerFlipFinishAdvances);
		return powers;
	}

	/** 魔法使い戦のシミュレーション
	 * @param {ActionTable} action 魔法使いに対する行動
	 * @returns {BattleWindowsPowersPair | null} 先制されたらnull
	 */
	simulateMagician(action) {
		this.takeAction(action);
		let powers;
		if (action.fast) {
			// 最速で8消費。earlyHardHitCheckの境界は6消費。
			// fast: 0.5 (1st frame) -> 8消費, 1 (Fast1) -> 6消費, 1.5 (5th frame) -> 6消費, 2 (Fast2) -> 4消費, 3 (Fast3) -> 2消費, 4 (Fast4) -> 0消費
			const earlyHardHitCheck = action.fast <= 1;
			const advances1 = 8 - Math.floor(action.fast) * 2;
			const advances2 = HammerFlipChargeAdvances - advances1;
			this.advance(advances1);
			if (this.magicianAttacksFirst()) return null;
			this.advance(advances2);
			powers =this.battleWindowsPowersWithHammerFlipHit(earlyHardHitCheck);
		} else {
			if (this.magicianAttacksFirst()) return null;
			this.advance(action.lateAdvances ?? 0);
			powers = this.battleWindowsPowers();
			this.hammerFlipChargeAndHit();
		}
		return powers;
	}

	/** 悪魔の騎士戦のシミュレーション
	 * @param {ActionTable} action 悪魔の騎士に対する行動
	 * @param {number} hammerThrow ハンマー投げのダッシュによる乱数消費数
	 * @returns {BattleWindowsPowersPair | null} 先制されたらnull
	 */
	simulateKnight(action, hammerThrow) {
		this.takeAction(action);
		let powers;
		if (action.fast) {
			// Fastモード
			this.advance(8);
			const a = this.knightAttacksFirst();
			this.advance(1);
			const b = this.knightAttacksFirst();
			this.advance(2);
			if (a || b) return null;
			powers = this.battleWindowsPowersWithHammerFlipHit(true);
		} else {
			// Easyモード
			if (this.knightAttacksFirst()) return null;
			powers = this.battleWindowsPowers();
			this.hammerFlipChargeAndHit();
		}
		this.advance(hammerThrow);    // ハンマー投げのダッシュ
		this.hammerHit();    // ハンマー投げのスイングのヒット
		this.hammerHit();    // ハンマー投げのヒット
		return powers;
	}

	/** レッドドラゴン戦1ターン目のシミュレーション
	 * @param {ActionTable} action レッドドラゴンに対する行動
	 * @returns {BattleWindowsPowersPair | null} 先制されたらnull
	 */
	simulateDragon(action) {
		this.takeAction(action);
		let powers;
		if (action.fast) {
			// Fastモード
			this.advance(6);
			const a = this.dragonAttacksFirst();
			this.advance(1);
			const b = this.dragonAttacksFirst();
			this.advance(4);
			if (a || b) return null;
			powers = this.battleWindowsPowersWithHammerFlipHit(true);
		} else {
			// Easyモード
			if (this.dragonAttacksFirst()) return null;
			powers = this.battleWindowsPowers();
			this.hammerFlipChargeAndHit();
		}
		this.hammerFlipChargeAndHit();	// 2発目の鬼殺し火炎ハンマー
		return powers;
	}

	/** レッドドラゴンの行動のシミュレーション
	 * @param {ActionTable} action
	 * @returns {ID<DragonAction>} レッドドラゴンの行動
	 */
	simulateDragonAction(action) {
		this.takeAction(action);
		return this.dragonActs();
	}

	/** レッドドラゴンが行動した後のコピーの元のシミュレーション
	 * @param {ActionTable} action
	 * @param {boolean} noPowersFor3
	 * @returns {BattleWindowsPowersPair}
	*/
	simulateDragonPowers(action, noPowersFor3){
		this.takeAction(action);
		return this.battleWindowsPowers(noPowersFor3);
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
	 * @returns {IterableIterator<RngIndex>}
	 */
	static *range(minIndex, maxIndex) {
		let i = /**@type {RngIndex}*/ (minIndex);
		while (true) {
			yield i;
			if (i === maxIndex) break;
			i = KssRng.calcIndex(i, 1);
		}
	}

	/** 星の方向に一致する乱数位置を探索し、星を消費する前と後の乱数位置のリストを返す
	 * @param {number[]} stars 観測された星の向きの配列
	 * @param {number} minIndex 探索開始の乱数位置
	 * @param {number} maxIndex 探索終了の乱数位置
	 * @returns {{startingIndex: RngIndex, endingIndex: RngIndex}[]} 条件に一致する乱数位置情報の配列
	 */
	static findIndicesByStars(stars, minIndex, maxIndex) {
		/** @type {{startingIndex: RngIndex, endingIndex: RngIndex}[]} */
		const indices = [];
		for (const i of KssRng.range(minIndex, maxIndex)) {
			const r = new KssRng(i);
			if (stars.every(v => r.starDirection() === v)) {
				indices.push({ startingIndex: i, endingIndex: r.getIndex() });
			}
		}
		return indices;
	}

	/**
	 * 条件に一致する開始乱数位置と条件判定後の乱数位置のリストを返す
	 * @param {number} minIndex 探索開始の乱数位置
	 * @param {number} maxIndex 探索終了の乱数位置
	 * @param {(r: KssRng) => boolean} fn 条件
	 * @returns {{startingIndex: RngIndex, endingIndex: RngIndex}[]} 条件に一致する乱数位置の情報配列
	 */
	static findIndices(minIndex, maxIndex, fn) {
		/** @type {{startingIndex: RngIndex, endingIndex: RngIndex}[]} */
		const indices = [];
		for (const i of KssRng.range(minIndex, maxIndex)) {
			const r = new KssRng(i);
			if (fn(r)) indices.push({ startingIndex: i, endingIndex: r.getIndex() });
		}
		return indices;
	}
}

/** @typedef {{ knight: ActionTable[], dragon: ActionTable[], dragonTurn2: ActionTable[] }} ActionsDifficultyTable */
/** BattleWindowsMWWManipulatorのactionsDifficultyTableのデフォルト値 @type {ActionsDifficultyTable} */
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
};

/** 魔法使いのFast @type {ActionTable[]}*/
export const FastMagicianList = [
	{ fast: 0.5, name: "1st frame" },
	{ fast: 1,   name: "Fast1", timeloss: 0 },
	{ fast: 1.5, name: "5th frame" },
	{ fast: 2,   name: "Fast2", timeloss: 4 },
	{ fast: 3,   name: "Fast3", timeloss: 8 },
	{ fast: 4,   name: "Fast4", timeloss: 12 },
];
/** @typedef {keyof MagicianPrioritiesTable} MagicianDifficulty */
/** 魔法使いでの行動の優先順位 @type {{easy: ActionTable[], conservativeFast: ActionTable[], aggressiveFast: ActionTable[]}}*/
const MagicianPrioritiesTable = {
	easy: [
		{ difficulty: 0 },
		{ difficulty: 150, stars: 1 },
		{ difficulty: 151, hammerFlips: 1 },
		{ difficulty: 152, slides: 1 },
		{ difficulty: 165, dashes: 3 },
		{ difficulty: 170, dashes: 2, stars: 1 },
		{ difficulty: 171, dashes: 2, slides: 1 },
		{ difficulty: 190, dashes: 3, stars: 1 },
		{ difficulty: 191, dashes: 3, slides: 1 },
		{ difficulty: 193, slides: 2 },
		{ difficulty: 550, dashes: 1 },
		{ difficulty: 600, dashes: 1, slides: 1 },
	],
	conservativeFast: [
		{ difficulty: 0 },
		{ difficulty: 150, dashes: 2 },
		{ difficulty: 250, slides: 1, lateAdvances: 2 },
		{ difficulty: 300, slides: 1, lateAdvances: 1 },
		{ difficulty: 600, dashes: 1 },
		FastMagicianList[1],
		FastMagicianList[3],
		FastMagicianList[4],
		FastMagicianList[5],
	].map(e => ({...e, difficulty: e.difficulty ?? 1500})),
	aggressiveFast: [
		FastMagicianList[1],
		FastMagicianList[3],
		FastMagicianList[4],
		FastMagicianList[5],
		{ difficulty: 0 },
		{ difficulty: 150, dashes: 2 },
		{ difficulty: 250, slides: 1, lateAdvances: 2 },
		{ difficulty: 300, slides: 1, lateAdvances: 1 },
		{ difficulty: 600, dashes: 1 },
	].map(e => ({...e, timeloss: e.timeloss ?? 36})),
};

// バトルウィンドウズ戦のターン数
export const BATTLE_WINDOWS_MWW_TURNS = 4;

/**
 * @typedef {ActionTable & {penalty: number}} ActionTableEx
 * @typedef {{ action: ActionTableEx, branches?: Map<BattleWindowsPowersPair, ManipulateResult>, default: ManipulateResult } | null} ManipulateResult
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
	 * @param {'low' | 'medium' | 'high'} [options.branchReduction] 分岐削減の度合い
	 * @param {number} [options.maxStarsCount]
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
		branchReduction = 'medium',
		maxStarsCount = 6,
	} = {}) {
		this.magicianDifficulty = magicianDifficulty;
		this.fastKnight = fastKnight;
		this.fastDragon = fastDragon;
		this.allowDragonStar = allowDragonStar;
		this.hammerThrow = hammerThrow;
		this.minIndex = /**@type {RngIndex}*/(minIndex);
		this.maxIndex = /**@type {RngIndex}*/(maxIndex);
		this.middleOffset = this.rngIndexToOffset(this.maxIndex) / 2;
		this.maxStarsCount = maxStarsCount;

		//分岐削減の度合いに応じて、分岐とタイムロスのペナルティを設定
		switch(branchReduction){
		case 'low':
			//分岐数度外視
			this.branchDifficulty = 0;
			this.timelossPenalty = 1 << 15;
			break;
		case 'medium':
			//タイム最優先
			this.branchDifficulty = 1 << 15;
			this.timelossPenalty = 1 << (15 + 7);
			break;
		case 'high':
			//分岐削減最優先
			this.timelossPenalty = 1 << 15;
			this.branchDifficulty = 1 << (15 + 13);
			break;
		default:
			throw new Error(`Invalid branchReduction: ${branchReduction}`);
		}

		// 各ターンの難易度低い順行動リストを作成（枝刈りのためpenalty昇順でソート）
		/**@type {ActionTableEx[][]}*/
		this.actionsListByTurn = [
			MagicianPrioritiesTable[this.magicianDifficulty].map(e => ({ ...e, penalty: (e.difficulty ?? 0) + (e.timeloss ?? 0) * this.timelossPenalty })).sort((a, b) => a.penalty - b.penalty),
			actionsDifficultyTable.knight.map(e => ({ ...e, penalty: e.difficulty ?? 0, fast: this.fastKnight ? 1 : undefined })).sort((a, b) => a.penalty - b.penalty),
			actionsDifficultyTable.dragon.map(e => ({ ...e, penalty: e.difficulty ?? 0, fast: this.fastDragon ? 1 : undefined })).sort((a, b) => a.penalty - b.penalty),
			actionsDifficultyTable.dragonTurn2.map(e => ({ ...e, penalty: e.difficulty ?? 0})).sort((a, b) => a.penalty - b.penalty),
		];

		// 各状態からの遷移を作成
		const r = new KssRng(/**@type {RngIndex}*/(0));
		const steps = this.createSimulationSteps(r);
		let maxIndexByTurn = KssRng.calcIndex(this.maxIndex, this.maxStarsCount * StarDirectionAdvances);
		this.turns = steps.map((step, i) => this.actionsListByTurn[i].map(action => {
			let nextMaxIndex = maxIndexByTurn;
			/**@type {({obs: BattleWindowsPowersPair, stateId: number, statePenalty: number} | null)[]}*/
			const byStateId = [];
			for(const index of KssRng.range(this.minIndex, maxIndexByTurn)){
				for(const hasSeenPowers of [false, true]){
					//遷移後の状態を作成
					r.index = index;
					const stepResult = step(action, hasSeenPowers);
					const endingIndex = r.getIndex();

					if(stepResult === null){
						byStateId.push(null);
					}else{
						const { obs, statePenalty } = stepResult;
						const stateId = this.makeStateId(endingIndex, hasSeenPowers || obs !== NoPowersPair);
						byStateId.push({obs, stateId, statePenalty});

						//次のターンで到達可能な最も先の乱数位置を探す
						if(this.rngIndexToOffset(endingIndex) > this.rngIndexToOffset(nextMaxIndex)) nextMaxIndex = endingIndex;

						//最後のターン以外はhasSeenPowersでstepResultが変わらない
						if(i !== BATTLE_WINDOWS_MWW_TURNS - 1){
							byStateId.push({obs, stateId: this.makeStateId(endingIndex, true), statePenalty});
							break;
						}
					}
				}
			}
			maxIndexByTurn = nextMaxIndex;
			return {action, byStateId};
		}));
	}

	/** @typedef {{ obs: BattleWindowsPowersPair, dragonAction?: ID<DragonAction>, statePenalty: number, stateTimeloss: number }} SimulationStepResult */
	/** ターンごとのシミュレーション用の関数を生成する
	 * @param {KssRng} rng 
	 * @returns {((a: ActionTable, hasSeenPowers: boolean) => SimulationStepResult | null)[]}
	 */
	createSimulationSteps(rng) {
		/** @type {((a: ActionTable, hasSeenPowers: boolean) => { obs: BattleWindowsPowersPair | null, dragonAction?: ID<DragonAction>, statePenalty?: number, stateTimeloss?: number })[]} */
		const stepFunctions = [
			(/**@type {ActionTable}*/a) => ({ obs: rng.simulateMagician(a) }),
			(/**@type {ActionTable}*/a) => ({ obs: rng.simulateKnight(a, this.hammerThrow) }),
			(/**@type {ActionTable}*/a) => ({ obs: rng.simulateDragon(a) }),
			(/**@type {ActionTable}*/a, /** @type {boolean} */hasSeenPowers) => {
				const dragonAction = rng.simulateDragonAction(a);
				if (dragonAction === DragonGuard || dragonAction === DragonStar) {
					const obs = rng.simulateDragonPowers({}, !hasSeenPowers);
					let stateTimeloss = 0;
					let statePenalty = 0;
					if (dragonAction === DragonStar && !this.allowDragonStar) {
						stateTimeloss = 22;	//ガードに対して22Fのタイムロス
						statePenalty = stateTimeloss * this.timelossPenalty;
					}
					return { obs, dragonAction, statePenalty, stateTimeloss };
				}
				return { obs: null };
			},
		];
		return stepFunctions.map(fn => (/**@type {ActionTable}*/a, /**@type {boolean}*/hasSeenPowers) => {
			const result = fn(a, hasSeenPowers);
			if (result.obs === null) return null;
			return {
				obs: result.obs,
				dragonAction: result.dragonAction,
				statePenalty: result.statePenalty ?? 0,
				stateTimeloss: result.stateTimeloss ?? 0,
			};
		});
	}

	/** 遷移モデルの状態のIDを作成
	 * @param {RngIndex} index
	 * @param {boolean} hasSeenPowers
	*/
	makeStateId(index, hasSeenPowers=false) {
		return this.rngIndexToOffset(index) * 2 + (hasSeenPowers ? 1 : 0);
	}
	/** minIndexからのオフセットを計算
	 * @param {RngIndex} index 
	*/
	rngIndexToOffset(index) {
		return KssRng.calcIndex(index, -this.minIndex);
	}
	/** 乱数範囲の中央からの差を計算
	 * @param {number} offset
	 */
	offsetToDeviation(offset) {
		return Math.abs(offset - this.middleOffset);
	}
	/** 開始乱数位置の可能性の価値
	 * @param {RngIndex} index
	*/
	rngIndexToScore(index) {
		return Math.max(10000 - this.offsetToDeviation(this.rngIndexToOffset(index)), 1);
	}
	/** 平均ペナルティを計算
	 * @param {number} penalty
	 * @param {DeepReadonly<ManipulateState>} state
	 * @returns {number}
	*/
	calcAveragePenalty(penalty, state) {
		let sumOfScore = 0;
		let sumOfPenalty = 0;
		if(state.activeBranchGroups){
			for(const b of state.activeBranchGroups){
				for(const g of b.stateGroups){
					sumOfScore += g.score;
					sumOfPenalty += g.score * (penalty + g.statePenalty);
				}
			}
			for(const b of state.resolvedBranchGroups){
				for(const g of b.stateGroups){
					sumOfScore += g.score;
					sumOfPenalty += g.score * b.best.penalty;
				}
			}
			return sumOfPenalty / sumOfScore + state.resolvedBranchGroups.length * this.branchDifficulty;
		}else{
			for(const g of state.stateGroups){
				sumOfScore += g.score;
				sumOfPenalty += g.score * (penalty + g.statePenalty);
			}
			return sumOfPenalty / sumOfScore;
		}
	}

	/** あるターンからの乱数調整を探す
	 * @typedef {{stateId: number, score: number, statePenalty: number}} StateGroup
	 * @typedef {{obs: BattleWindowsPowersPair, stateGroups: readonly StateGroup[], cont: ManipulateResult | null, best: {penalty: number, failScore: number, resolvedBranchGroups: readonly BranchGroup[] | null}}} BranchGroup
	 * @typedef {readonly BranchGroup[]} BranchGroups
	 * @typedef {{stateGroups: null, activeBranchGroups: BranchGroups, resolvedBranchGroups: BranchGroups} | {stateGroups: readonly StateGroup[], activeBranchGroups: null, resolvedBranchGroups: null}} ManipulateState
	 * @param {number} turnIndex
	 * @param {DeepReadonly<ManipulateState>} state
	 * @param {{penalty: number, failScore: number, resolvedBranchGroups: readonly BranchGroup[] | null}} best
	 * @param {DeepReadonly<{penalty: number, failScore: number}>} current
	 * @returns {ManipulateResult}
	 */
	manipulateFrom(turnIndex, state, best={penalty: Infinity, failScore: Infinity, resolvedBranchGroups: null}, current={penalty: 0, failScore: 0}) {
		let result = null;
		const isLastTurn = turnIndex === BATTLE_WINDOWS_MWW_TURNS - 1;
		for(const {action, byStateId} of this.turns[turnIndex]){
			let penalty = current.penalty + action.penalty;

			//事前評価で枝刈り
			if((current.failScore - best.failScore || this.calcAveragePenalty(penalty, state) - best.penalty) >= 0) break;

			//次の状態を計算
			/** @type {ManipulateState} */
			let nextState;
			let failScore = current.failScore;
			if(state.activeBranchGroups){
				//失敗するところは分岐を使うとして進める
				const resolvedBranchGroups = [...state.resolvedBranchGroups];
				const activeBranchGroups = [];
				for(const b of state.activeBranchGroups){
					const stateGroups = [];
					let failed = false;
					for(const g of b.stateGroups){
						const turnResult = byStateId[g.stateId];
						if(turnResult){
							stateGroups.push({stateId: turnResult.stateId, score: g.score, statePenalty: g.statePenalty + turnResult.statePenalty});
						}else{
							failed = true;
							break;
						}
					}
					if(failed){
						failScore += b.best.failScore;
						resolvedBranchGroups.push(b);
					}else{
						activeBranchGroups.push({...b, stateGroups});
					}
				}
				if(activeBranchGroups.length === 0) continue;
				nextState = {stateGroups: null, activeBranchGroups, resolvedBranchGroups};
			}else{
				//観測値ごとに分ける
				/** @type {Map<BattleWindowsPowersPair, StateGroup[]>} */
				const groups = new Map();
				for(const g of state.stateGroups){
					const turnResult = byStateId[g.stateId];
					if(turnResult){
						let group = groups.get(turnResult.obs);
						if(!group) groups.set(turnResult.obs, group = []);
						group.push({stateId: turnResult.stateId, score: g.score, statePenalty: g.statePenalty + turnResult.statePenalty});
					}else{
						failScore += g.score;
					}
				}

				if(groups.size === 0){
					continue;
				}else if(groups.size === 1){
					//分岐が一つなら次を分岐作成ターンにする
					nextState = {stateGroups: [...groups.values()][0], activeBranchGroups: null, resolvedBranchGroups: null};
				}else if(isLastTurn){
					//最後のターンはその先の分岐が必要ない
					nextState = {stateGroups: [...groups.values()].flat(), activeBranchGroups: null, resolvedBranchGroups: null};
				}else{
					//分岐ごとの最適解を探しておく
					const activeBranchGroups = [];
					const resolvedBranchGroups = [];
					for(const [obs, stateGroups] of groups.entries()){
						const childBest = {penalty: Infinity, failScore: Infinity, resolvedBranchGroups: null};
						const cont = this.manipulateFrom(turnIndex + 1, {stateGroups, activeBranchGroups: null, resolvedBranchGroups: null}, childBest);
						childBest.penalty = penalty + childBest.penalty;
						if(cont){
							activeBranchGroups.push({obs, stateGroups, cont, best: childBest});
						}else{
							for(const g of stateGroups){
								failScore += g.score;
							}
						}
					}
					if(activeBranchGroups.length === 0) continue;

					//分岐削減度外視（low）の場合は全ての分岐を使う
					if(this.branchDifficulty === 0){
						for(const b of activeBranchGroups){
							failScore += b.best.failScore;
							resolvedBranchGroups.push(b);
						}
						activeBranchGroups.length = 0;
					}

					nextState = {stateGroups: null, activeBranchGroups, resolvedBranchGroups};
				}
			}
			const averagePenalty = this.calcAveragePenalty(penalty, nextState);
			if((failScore - best.failScore || averagePenalty - best.penalty) >= 0) continue;

			if(isLastTurn){
				//最後のターンなら更新
				result = {action, default: null};
				best.penalty = averagePenalty;
				best.failScore = failScore;
				best.resolvedBranchGroups = nextState.resolvedBranchGroups;
			}else if(this.branchDifficulty === 0 && nextState.resolvedBranchGroups){
				//分岐削減度外視（low）で分岐作成済みの場合
				const branches = new Map();
				for(const b of nextState.resolvedBranchGroups){
					branches.set(b.obs, b.cont);
				}
				result = {action, branches, default: null};
				best.penalty = averagePenalty;
				best.failScore = failScore;
				best.resolvedBranchGroups = nextState.resolvedBranchGroups;
			}else{
				//以降のターン
				const cont = this.manipulateFrom(turnIndex + 1, nextState, best, {penalty, failScore});
				if(cont){
					//分岐が作られたターンでbranchesに登録する
					const branches = new Map();
					if(!state.activeBranchGroups && best.resolvedBranchGroups && nextState.activeBranchGroups){
						for(const b of best.resolvedBranchGroups){
							branches.set(b.obs, b.cont);
						}
					}
					result = {action, branches, default: cont};
				}
			}
		}

		return result;
	}
	/** 星の向きを基に乱数調整のための行動を探す
	 * @param {number[]} stars バトルウィンドウズ戦開始時に出した星の向き
	 * @returns {ManipulateResult}
	 */
	manipulate(stars) {
		const indices = KssRng.findIndicesByStars(stars, this.minIndex, this.maxIndex);
		const stateGroups = indices.map(info => ({
			stateId: this.makeStateId(info.endingIndex),
			score: this.rngIndexToScore(info.startingIndex),
			statePenalty: 0,
		}));
		return this.manipulateFrom(0, {stateGroups, activeBranchGroups: null, resolvedBranchGroups: null});
	}

	/** テスト用関数：設定された乱数範囲に対してシミュレーションを行い結果を集計する
	 * @param {number} stars バトルウィンドウズ戦開始前に消費する星の数
	 * @param {DebugCallback} [debugCallback]
	 * @param {(p: string) => boolean} [ignore]
	 */
	*testGenerator(stars, debugCallback, ignore) {
		/** @param {number[]} arr */
		const calcMedian = (arr) => {
			if (arr.length === 0) return 0;
			const sorted = [...arr].sort((a, b) => a - b);
			const half = Math.floor(sorted.length / 2);
			return sorted.length % 2 === 0 ? (sorted[half - 1] + sorted[half]) / 2 : sorted[half];
		};

		const result = {
			// 進捗確認用
			count: 0,
			total: this.rngIndexToOffset(this.maxIndex) + 1,

			magicianNGCount: 0,      // 魔法使いの条件に合う行動が見つからなかった回数
			otherNGCount: 0,         // 行動の組み合わせが見つからなかった回数
			incompleteSimCounts: Array(BATTLE_WINDOWS_MWW_TURNS).fill(0), // 敵i体目で調整が失敗した回数
			successCount: 0,         // 最後まで成功した回数
			successDeviationsSum: 0,         // 最後まで成功した乱数位置がどれだけ中央に近いか
			unsolvableSuccessCount: 0, // 失敗が存在する星パターンにおける、成功回数

			//レッドドラゴンの行動のカウント
			dragonGuardCount: 0,
			dragonStarCount: 0,

			// manipulate()の計算時間（ms）
			totalTime: 0,
			worstTime: 0,

			// 難易度（本来の行動難易度）
			totalDifficulty: 0,
			worstDifficulty: 0,
			averageDifficulty: 0,
			medianDifficulty: 0,

			// ペナルティ（探索用コスト・タイムロスペナルティ含む）
			totalPenalty: 0,
			worstPenalty: 0,
			averagePenalty: 0,
			medianPenalty: 0,

			// タイムロス
			totalTimeloss: 0,
			worstTimeloss: 0,
			averageTimeloss: 0,
			medianTimeloss: 0,

			// 中央値計算用の一時配列（JSON出力には含めない）
			/** @type {number[]} */ _difficulties: [],
			/** @type {number[]} */ _penalties: [],
			/** @type {number[]} */ _timelosses: [],

			/** @type {number[][]} 各ターンごとに、到達したノードが持っていた分岐数ごとの該当回数 [turnIndex][branchSize] */
			turnBranchCounts: Array.from({ length: BATTLE_WINDOWS_MWW_TURNS }, () => []),

			/** @type {Map<string, {success: number[], fails: RngIndex[][], hasFail: boolean, manipulateResult: ManipulateResult}>} 星の方向パターンごとにグループ化した成功・失敗乱数位置の一覧 */
			simulationGroups: new Map(),

			/** @type {Map<ActionTable, number>} 魔法使いでの行動ごとの使用回数 */
			magicianCountList: new Map(),
			/** @type {Map<ActionTable, number>} 悪魔の騎士での行動ごとの使用回数 */
			knightCountList: new Map(),
			/** @type {Map<ActionTable, number>} ドラゴンでの行動ごとの使用回数 */
			dragonCountList: new Map(),
			/** @type {Map<ActionTable, number>} ドラゴン2ターン目での行動ごとの使用回数 */
			dragonTurn2CountList: new Map(),
		};

		Object.defineProperties(result, {
			_difficulties: { enumerable: false },
			_penalties: { enumerable: false },
			_timelosses: { enumerable: false },
		});

		for (const i of KssRng.range(this.minIndex, this.maxIndex)) {
			// debugCallback が指定されている場合のみ Proxy でメソッド呼び出しをフックする
			const r = debugCallback ? new KssRng(i).withProxy(debugCallback, ignore) : new KssRng(i);
			// 星の方向の確認
			const starDirectionList = [];
			for (let j = 0; j < stars; j++) {
				starDirectionList.push(r.starDirection());
			}
			const starStr = starDirectionList.map(v => StarDirectionChars[v]).join('');

			// 既に同じ星のパターンの結果がないか確認
			let simGroup = result.simulationGroups.get(starStr);
			// 乱数調整の行動探索
			let manipulateResult;
			if (simGroup) {
				manipulateResult = simGroup.manipulateResult;
			} else {
				const t0 = performance.now();
				manipulateResult = this.manipulate(starDirectionList);
				const elapsed = performance.now() - t0;

				// 星パターンごとにグループを作成
				simGroup = {
					success: [],
					fails: Array.from({ length: BATTLE_WINDOWS_MWW_TURNS }, () => []),
					hasFail: false,
					manipulateResult,
				};
				result.simulationGroups.set(starStr, simGroup);

				// 計算時間の記録
				result.totalTime += elapsed;
				if (elapsed > result.worstTime) result.worstTime = elapsed;
			}

			// ツリーを辿りながらシミュレーションを実行
			let difficulty = 0;
			let penalty = 0;
			let timeloss = 0;
			let hasSeenPowers = false;
			const actions = [];
			const turnResults = [];
			const steps = this.createSimulationSteps(r);
			for(let turnIndex = 0, current = manipulateResult; turnIndex < steps.length; turnIndex++){
				const step = steps[turnIndex];
				if (!current) break;
				actions.push(current.action);

				// 分岐の集計
				const branchSize = current.branches ? current.branches.size : 0;
				result.turnBranchCounts[turnIndex][branchSize] = (result.turnBranchCounts[turnIndex][branchSize] ?? 0) + 1;

				const stepResult = step(current.action, hasSeenPowers);
				if (stepResult === null) break;
				turnResults.push(stepResult.obs);
				
				if (stepResult.obs !== NoPowersPair) hasSeenPowers = true;

				// 難易度加算
				difficulty += current.action.difficulty ?? 0;
				penalty += current.action.penalty + branchSize * this.branchDifficulty + stepResult.statePenalty;
				timeloss += (current.action.timeloss ?? 0) + stepResult.stateTimeloss;

				if (stepResult.dragonAction === DragonGuard) result.dragonGuardCount++;
				else if (stepResult.dragonAction === DragonStar) result.dragonStarCount++;

				current = current.branches ? (current.branches.get(stepResult.obs) ?? current.default) : current.default;
			}

			// 行動の結果を確認
			if (turnResults.length !== BATTLE_WINDOWS_MWW_TURNS) {
				result.incompleteSimCounts[turnResults.length]++;
				simGroup.fails[turnResults.length].push(i);

				// これまでに記録されていた現在のパターンの成功回数を解決不能時の成功としてカウント
				if (!simGroup.hasFail) {
					simGroup.hasFail = true;
					result.unsolvableSuccessCount += simGroup.success.length;
				}
			} else {
				simGroup.success.push(i);
				result.successCount++;
				result.successDeviationsSum += this.offsetToDeviation(this.rngIndexToOffset(i));
				if (simGroup.hasFail) result.unsolvableSuccessCount++;

				// 各種指標（難易度、ペナルティ、タイムロス）の記録
				result.totalDifficulty += difficulty;
				if (difficulty > result.worstDifficulty) result.worstDifficulty = difficulty;
				result._difficulties.push(difficulty);

				result.totalPenalty += penalty;
				if (penalty > result.worstPenalty) result.worstPenalty = penalty;
				result._penalties.push(penalty);

				result.totalTimeloss += timeloss;
				if (timeloss > result.worstTimeloss) result.worstTimeloss = timeloss;
				result._timelosses.push(timeloss);

				// 成功した行動の使用回数を集計する
				result.magicianCountList.set(actions[0], (result.magicianCountList.get(actions[0]) ?? 0) + 1);
				result.knightCountList.set(actions[1], (result.knightCountList.get(actions[1]) ?? 0) + 1);
				result.dragonCountList.set(actions[2], (result.dragonCountList.get(actions[2]) ?? 0) + 1);
				result.dragonTurn2CountList.set(actions[3], (result.dragonTurn2CountList.get(actions[3]) ?? 0) + 1);
			}

			result.count++;
			if (result.count === result.total) {
				// 全てのイテレーションが完了したタイミングで、平均値と中央値を一括計算
				const c = result.successCount || 1; // ゼロ除算回避

				// 難易度の集計
				result.averageDifficulty = result.totalDifficulty / c;
				result.medianDifficulty = calcMedian(result._difficulties);

				// ペナルティの集計
				result.averagePenalty = result.totalPenalty / c;
				result.medianPenalty = calcMedian(result._penalties);

				// タイムロスの集計
				result.averageTimeloss = result.totalTimeloss / c;
				result.medianTimeloss = calcMedian(result._timelosses);
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

// @ts-check

/** @template T @typedef {number & {__brand: T}} ID */
/** @typedef {ID<'RngIndex'>} RngIndex 乱数位置 */
/** @typedef {{ difficulty: number, dashes?: number, stars?: number, hammerFlips?: number, slides?: number, lateAdvances?: number, earlyHardHitCheck?: boolean, fast?: boolean, frames?: number, name?: string }} ActionTable 行動テーブル */

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
export const NoPowersPair = makePowersPair(BattleWindowsPowerNone, BattleWindowsPowerNone);
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

		// 魔法使いが先制するかの判定
		if (this.magicianAttacksFirst()) return null;

		// 先制判定後からコピーの元判定前までの消費
		this.advance((action.lateAdvances ?? 0) + (action.fast ? HammerFlipChargeAdvances : 0));

		// コピーの元判定
		let powers;
		if (action.fast) {
			powers =this.battleWindowsPowersWithHammerFlipHit(action.earlyHardHitCheck);
		} else {
			powers = this.battleWindowsPowers();
			this.hammerFlipChargeAndHit();
		}

		return powers;
	}

	/** 悪魔の騎士戦のシミュレーション
	 * @param {ActionTable} knightAction 悪魔の騎士に対する行動
	 * @param {number} hammerThrow ハンマー投げのダッシュによる乱数消費数
	 * @returns {BattleWindowsPowersPair | null} 先制されたらnull
	 */
	simulateKnight(knightAction, hammerThrow) {
		this.takeAction(knightAction);
		let powers;
		if (knightAction.fast) {
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
	 * @param {ActionTable} dragonAction レッドドラゴンに対する行動
	 * @returns {BattleWindowsPowersPair | null} 先制されたらnull
	 */
	simulateDragon(dragonAction) {
		this.takeAction(dragonAction);
		let powers;
		if (dragonAction.fast) {
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

	/** レッドドラゴン戦2ターン目のシミュレーション
	 * @param {ActionTable} action レッドドラゴン2ターン目の行動
	 * @param {boolean} allowDragonStar 星攻撃も成功とするか
	 * @param {boolean} noPowersFor3
	 * @returns {BattleWindowsPowersPair | null} 望まない行動をされたらnull
	 */
	simulateDragonTurn2(action, allowDragonStar, noPowersFor3=false) {
		this.takeAction(action);
		const dragonAction = this.dragonActs();
		if (dragonAction === DragonGuard || (allowDragonStar && dragonAction === DragonStar)) {
			return this.battleWindowsPowers(noPowersFor3);
		}
		return null;
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
		for (const i of KssRng.range(minIndex, maxIndex)) {
			const r = new KssRng(i);
			if (stars.every(v => r.starDirection() === v)) {
				indices.push(r.getIndex());
			}
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
	dragonTurn2: [
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

/** 魔法使いのFast */
export const FastMagicianList = [
	{ lateAdvances: -8, frames: 1, name: "1st frame", fast: true, earlyHardHitCheck: true },
	{ lateAdvances: -6, frames: 3, name: "Fast1",     fast: true, earlyHardHitCheck: true },
	{ lateAdvances: -6, frames: 1, name: "5th frame", fast: true },
	{ lateAdvances: -4, frames: 4, name: "Fast2",     fast: true },
	{ lateAdvances: -2, frames: 4, name: "Fast3",     fast: true },
	{ lateAdvances:  0, frames: 4, name: "Fast4",     fast: true },
];
/** @typedef {keyof MagicianPrioritiesTable} MagicianDifficulty */
/** 魔法使いでの行動の優先順位 */
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
 * @typedef {{ action: ActionTable, branches?: Map<BattleWindowsPowersPair, ManipulateResult>, default: ManipulateResult } | null} ManipulateResult
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
	 * @param {number} [options.branchDifficulty] 分岐判断の1つあたりの追加難易度
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
		branchDifficulty = 100000000,
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
		this.branchDifficulty = branchDifficulty;
		this.maxStarsCount = maxStarsCount;

		// 各ターンの難易度低い順行動リストを作成
		this.actionsListByTurn = [
			MagicianPrioritiesTable[this.magicianDifficulty].map((e, i) => ({ ...e, difficulty: i * 1000000 })),
			actionsDifficultyTable.knight.map(e => ({ ...e, fast: this.fastKnight })),
			actionsDifficultyTable.dragon.map(e => ({ ...e, fast: this.fastDragon })),
			actionsDifficultyTable.dragonTurn2,
		];

		// 各状態からの遷移を作成
		const r = new KssRng(/**@type {RngIndex}*/(0));
		const steps = this.createSimulationSteps(r);
		let maxIndexByTurn = KssRng.calcIndex(this.maxIndex, this.maxStarsCount * StarDirectionAdvances);
		this.turns = steps.map((step, i) => this.actionsListByTurn[i].map(action => {
			let nextMaxIndex = maxIndexByTurn;
			/**@type {({obs: BattleWindowsPowersPair, stateId: number} | null)[]}*/
			const byStateId = [];
			for(const index of KssRng.range(this.minIndex, maxIndexByTurn)){
				for(const hasSeenPowers of [false, true]){
					//遷移後の状態を作成
					r.index = index;
					const obs = step(action, hasSeenPowers);
					byStateId.push(obs === null ? null : {obs, stateId: this.makeStateId(r.index, hasSeenPowers || obs !== NoPowersPair)});

					//次のターンで到達可能な最も先の乱数位置を探す
					if(obs !== null  && this.rngIndexToOffset(r.index) > this.rngIndexToOffset(nextMaxIndex)) nextMaxIndex = r.index;
				}
			}
			maxIndexByTurn = nextMaxIndex;
			return {action, byStateId};
		}));
	}

	/** ターンごとのシミュレーション用の関数を生成する
	 * @param {KssRng} rng 
	 * @returns {((a: ActionTable, forceHasSeenPowers?: boolean) => BattleWindowsPowersPair | null)[]}
	 */
	createSimulationSteps(rng) {
		let currentHasSeenPowers = false;
		const fns = [
			(/**@type {ActionTable}*/a) => rng.simulateMagician(a),
			(/**@type {ActionTable}*/a) => rng.simulateKnight(a, this.hammerThrow),
			(/**@type {ActionTable}*/a) => rng.simulateDragon(a),
			(/**@type {ActionTable}*/a, /** @type {boolean} */hasSeenPowers) => rng.simulateDragonTurn2(a, this.allowDragonStar, !hasSeenPowers),
		];
		return fns.map(fn => (/**@type {ActionTable}*/a, /**@type {boolean|undefined}*/forceHasSeenPowers) => {
			const h = forceHasSeenPowers !== undefined ? forceHasSeenPowers : currentHasSeenPowers;
			const obs = fn(a, h);
			if (forceHasSeenPowers === undefined && obs !== null) {
				currentHasSeenPowers ||= obs !== NoPowersPair;
			}
			return obs;
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
		return 0x10000 - this.offsetToDeviation(this.rngIndexToOffset(index));
	}
	/** 平均難易度を計算
	 * @param {number} difficulty
	 * @param {BranchGroups} activeBranchGroups
	 * @param {BranchGroups} resolvedBranchGroups
	*/
	calcAverageDifficulty(difficulty, activeBranchGroups, resolvedBranchGroups) {
		if(activeBranchGroups && resolvedBranchGroups && resolvedBranchGroups.length > 0){
			let sumOfScore = 0;
			for(const b of activeBranchGroups){
				for(const g of b.stateGroups){
					sumOfScore += g.score;
				}
			}
			let sumOfDifficulty = sumOfScore * difficulty;
			for(const b of resolvedBranchGroups){
				for(const g of b.stateGroups){
					sumOfScore += g.score;
					sumOfDifficulty += g.score * b.best.difficulty;
				}
			}
			return sumOfDifficulty / sumOfScore + resolvedBranchGroups.length * this.branchDifficulty;
		}else{
			return difficulty;
		}
	}

	/** あるターンからの乱数調整を探す
	 * @typedef {{stateId: number, score: number}} StateGroup
	 * @typedef {{obs: BattleWindowsPowersPair, stateGroups: StateGroup[], cont: ManipulateResult, best: {difficulty: number, failScore: number, resolvedBranchGroups: BranchGroups}}[] | null} BranchGroups
	 * @param {number} turnIndex
	 * @param {StateGroup[] | null} currentStateGroups
	 * @param {{difficulty: number, failScore: number, resolvedBranchGroups: BranchGroups}} best
	 * @param {{difficulty: number, failScore: number, activeBranchGroups: BranchGroups, resolvedBranchGroups: BranchGroups}} current
	 * @returns {ManipulateResult}
	 */
	manipulateFrom(turnIndex, currentStateGroups, best={difficulty: Infinity, failScore: Infinity, resolvedBranchGroups: null}, current={difficulty: 0, failScore: 0, activeBranchGroups: null, resolvedBranchGroups: null}) {
		let result = null;
		for(const {action, byStateId} of this.turns[turnIndex]){
			let difficulty = current.difficulty + action.difficulty;

			//事前評価で枝刈り
			if((current.failScore - best.failScore || this.calcAverageDifficulty(difficulty, current.activeBranchGroups, current.resolvedBranchGroups) - best.difficulty) >= 0) break;

			//次の状態を計算
			let nextStateGroups = null;
			let activeBranchGroups = null;
			let resolvedBranchGroups = null;
			let failScore = current.failScore;
			if(current.activeBranchGroups && current.resolvedBranchGroups){
				//失敗するところは分岐を使うとして進める
				activeBranchGroups = [];
				resolvedBranchGroups = [...current.resolvedBranchGroups];
				for(const b of current.activeBranchGroups){
					const stateGroups = [];
					let failed = false;
					for(const g of b.stateGroups){
						const turnResult = byStateId[g.stateId];
						if(turnResult){
							stateGroups.push({stateId: turnResult.stateId, score: g.score});
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
			}else if(currentStateGroups){
				//観測値ごとに分ける
				/** @type {Map<BattleWindowsPowersPair, StateGroup[]>} */
				const groups = new Map();
				for(const g of currentStateGroups){
					const turnResult = byStateId[g.stateId];
					if(turnResult){
						let group = groups.get(turnResult.obs);
						if(!group) groups.set(turnResult.obs, group = []);
						group.push({stateId: turnResult.stateId, score: g.score});
					}else{
						failScore += g.score;
					}
				}

				if(groups.size === 0){
					continue;
				}else if(groups.size === 1){
					//分岐が一つなら次を分岐作成ターンにする
					nextStateGroups = [...groups.values()][0];
				}else{
					//分岐ごとの最適解を探しておく
					activeBranchGroups = [];
					resolvedBranchGroups = [];
					for(const [obs, stateGroups] of groups.entries()){
						const best = {difficulty: Infinity, failScore: Infinity, resolvedBranchGroups: null};
						if(turnIndex !== 3){
							const cont = this.manipulateFrom(turnIndex + 1, stateGroups, best);
							best.difficulty = difficulty + best.difficulty;
							if(cont){
								activeBranchGroups.push({obs, stateGroups, cont, best});
							}else{
								for(const g of stateGroups){
									failScore += g.score;
								}
							}
						}else{
							activeBranchGroups.push({obs, stateGroups, cont: null, best});
						}
					}
					if(activeBranchGroups.length === 0) continue;
				}
			}else{
				break;
			}
			if((failScore - best.failScore || this.calcAverageDifficulty(difficulty, activeBranchGroups, resolvedBranchGroups) - best.difficulty) >= 0) continue;

			//次のターン
			if(turnIndex !== 3){
				const cont = this.manipulateFrom(turnIndex + 1, nextStateGroups, best, {difficulty, failScore, activeBranchGroups, resolvedBranchGroups});
				if(cont){
					//分岐が作られたターンでbranchesに登録する
					const branches = new Map();
					if(!current.activeBranchGroups && best.resolvedBranchGroups && activeBranchGroups){
						for(const b of best.resolvedBranchGroups){
							branches.set(b.obs, b.cont);
						}
					}
					result = {action, branches, default: cont};
				}
			}else{
				result = {action, default: null};
				best.difficulty = this.calcAverageDifficulty(difficulty, activeBranchGroups, resolvedBranchGroups);
				best.failScore = failScore;
				best.resolvedBranchGroups = resolvedBranchGroups;
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
		const stateGroups = indices.map(index => ({
			stateId: this.makeStateId(index),
			score: this.rngIndexToScore(KssRng.calcIndex(index, -stars.length * StarDirectionAdvances)),
		}));
		return this.manipulateFrom(0, stateGroups);
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
			successCount: 0,         // 最後まで成功した回数
			successDeviationsSum: 0,         // 最後まで成功した乱数位置がどれだけ中央に近いか
			unsolvableSuccessCount: 0, // 失敗が存在する星パターンにおける、成功回数
			/** @type {number[][]} 各ターンごとに、到達したノードが持っていた分岐数ごとの該当回数 [turnIndex][branchSize] */
			turnBranchCounts: Array.from({ length: 4 }, () => []),
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
			totalTime: 0,            // manipulate()の合計計算時間（ms）
			worstTime: 0,            // manipulate()の最悪計算時間（ms）
			totalDifficulty: 0,	// 合計難易度
			worstDifficulty: 0,	// 最悪難易度
			// 進捗確認用
			count: 0,
			total: this.maxIndex - this.minIndex + 1,
		};

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
					fails: [[], [], [], []],
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
			const actions = [];
			const sim = [];
			const steps = this.createSimulationSteps(r);
			for(let turnIndex = 0, current = manipulateResult; turnIndex < steps.length; turnIndex++){
				const step = steps[turnIndex];
				if (!current) break;
				actions.push(current.action);

				// 分岐の集計
				const branchSize = current.branches ? current.branches.size : 0;
				result.turnBranchCounts[turnIndex][branchSize] = (result.turnBranchCounts[turnIndex][branchSize] ?? 0) + 1;

				// 難易度加算
				difficulty += current.action.difficulty + branchSize * this.branchDifficulty;

				const obs = step(current.action);
				if (obs === null) break;
				sim.push(obs);

				current = current.branches ? (current.branches.get(obs) ?? current.default) : current.default;
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
				result.successDeviationsSum += this.offsetToDeviation(result.count);
				if (simGroup.hasFail) result.unsolvableSuccessCount++;

				// 難易度の記録
				result.totalDifficulty += difficulty;
				if (difficulty > result.worstDifficulty) result.worstDifficulty = difficulty;

				// 成功した行動の使用回数を集計する
				result.magicianCountList.set(actions[0], (result.magicianCountList.get(actions[0]) ?? 0) + 1);
				result.knightCountList.set(actions[1], (result.knightCountList.get(actions[1]) ?? 0) + 1);
				result.dragonCountList.set(actions[2], (result.dragonCountList.get(actions[2]) ?? 0) + 1);
				result.dragonTurn2CountList.set(actions[3], (result.dragonTurn2CountList.get(actions[3]) ?? 0) + 1);
			}

			result.count++;
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

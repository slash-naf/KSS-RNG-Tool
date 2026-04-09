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

	/** 銀河に願いをのバトルウィンドウズ戦をシミュレートし、理想的な乱数ならその結果を、そうでなければnullを返す
	 * @param {boolean} fastKnight 悪魔の騎士をFastモードでするか
	 * @param {boolean} fastDragon レッドドラゴンをFastモードでするか
	 * @param {number} hammerThrow ハンマー投げのダッシュの乱数消費数
	*/
	simulateBattleWindowsMWW(magician, actionsTable, fastKnight, fastDragon, hammerThrow) {
		const result = [];

		// --- 魔法使い ---
		let magicianPowers;
		if (magician.fast) {
			// Fastモード
			if (this.hammerFlipChargeForFastMagician(magician.advances1)) return result;
			magicianPowers = this.hammerFlipHitForFastMagician(magician.advances1 === 6);
		} else {
			// Easyモード
			this.advance(magician.advances1);
			if (this.magicianAttacksFirst()) return result;
			this.advance(magician.advances2);	// スライディングは間に合わないから先制判定は間に挟まる
			magicianPowers = this.battleWindowsPowers();
			this.hammerFlipChargeAndHit();
		}
		result.push(magicianPowers);

		// --- 悪魔の騎士 ---
		let knightPowers;
		this.advance(actionsTable.knight.advances);
		if (fastKnight) {
			// Fastモード
			if (this.hammerFlipChargeForFastKnight()) return result;
			knightPowers = this.hammerFlipHitForFastBattleWindowsPowers();
		} else {
			// Easyモード
			if (this.knightAttacksFirst()) return result;
			knightPowers = this.battleWindowsPowers();
			this.hammerFlipChargeAndHit();
		}
		this.advance(hammerThrow);    // ハンマー投げのダッシュ
		this.hammerHit();    // ハンマー投げのスイングのヒット
		this.hammerHit();    // ハンマー投げのヒット
		result.push(knightPowers);

		// --- レッドドラゴン ---
		let dragonPowers;
		this.advance(actionsTable.dragon.advances);
		if (fastDragon) {
			// Fastモード
			if (this.hammerFlipChargeForFastDragon()) return result;
			dragonPowers = this.hammerFlipHitForFastBattleWindowsPowers();
		} else {
			// Easyモード
			if (this.dragonAttacksFirst()) return result;
			dragonPowers = this.battleWindowsPowers();
			this.hammerFlipChargeAndHit();
		}
		this.hammerFlipChargeAndHit();	// 2発目の鬼殺し火炎ハンマー
		result.push(dragonPowers);

		// --- レッドドラゴン2ターン目 ---
		this.advance(actionsTable.dragonAction.advances);
		const dragonAction = this.dragonActs();
		if (dragonAction !== DragonGuard) return result;
		result.push(dragonAction);

		return result;
	}
}

export class Actions {
	constructor(t) {
		const parseAdvances = ({dashes=0, slides=0, hammerFlips=0, stars=0}) => dashes + slides*SlideAdvances + hammerFlips*HammerFlipAdvances + stars*StarDirectionAdvances;
		const parseMessage = ({dashes, slides, hammerFlips, stars, advances}) => {
			const a = [];
			if (advances !== undefined) {
				if (slides) a.push(["", "", "", "", "準速スライディング", "最速スライディング", ][advances]);
				if (hammerFlips) a.push(["fast4", "", "fast3", "", "fast2", "", "fast1"][advances]);
			} else {
				if (dashes) a.push(["", "短ダッシュ", "ダッシュ", "長ダッシュ"][dashes]);
				if (slides) a.push(["", "スライディング", "2スライディング"][slides]);
				if (hammerFlips) a.push(["", "鬼殺し", "2鬼殺し"][hammerFlips]);
				if (stars) a.push(["", "星", "2星"][stars]);
			}
			return a.length ? a.join(" & ") : "待機";
		};

		this.magicianList = t.magician.toSorted((a, b) => a.difficulty - b.difficulty).map(a => {
			const advances = parseAdvances(a);
			return {
				difficulty: a.difficulty,
				advances1: a.advances === undefined ? advances : a.advances,
				advances2: a.advances === undefined ? 0 : advances - a.advances,
				fast: a.hammerFlips !== undefined,
				actions: a,
				message: parseMessage(a),
			};
		});
		this.knightList = t.knight.toSorted((a, b) => a.difficulty - b.difficulty).map(a => ({difficulty: a.difficulty, advances: parseAdvances(a), actions: a, message: parseMessage(a)}));
		this.dragonList = t.dragon.toSorted((a, b) => a.difficulty - b.difficulty).map(a => ({difficulty: a.difficulty, advances: parseAdvances(a), actions: a, message: parseMessage(a)}));
		this.dragonActionList = t.dragonAction.toSorted((a, b) => a.difficulty - b.difficulty).map(a => ({difficulty: a.difficulty, advances: parseAdvances(a), actions: a, message: parseMessage(a)}));
		this.list = [];
		for (const knight of this.knightList) {
			for (const dragon of this.dragonList) {
				for (const dragonAction of this.dragonActionList) {
					this.list.push({
						difficulty: knight.difficulty + dragon.difficulty + dragonAction.difficulty,
						knight, dragon, dragonAction,
					});
				}
			}
		}
		this.list.sort((a, b) => a.difficulty - b.difficulty);
	}
}

/** 銀河に願いをのバトルウィンドウズ戦の乱数調整のための行動を探す
 * @param {Actions} actions 難易度が低い順の乱数調整行動全体
 * @param {Array<number>} stars バトルウィンドウズ戦開始時に出した星の向き
*/
export function manipulateBattleWindowsMWW(actions, fastMagician, fastKnight, fastDragon, hammerThrow, minIndex, maxIndex, stars) {
	const r = new KssRng();
	// 星の方向が全て一致する乱数位置を探す
	const indexList = [];
	for (let i=minIndex; i <= maxIndex; i++) {
		r.index = i;
		if (stars.every(v => r.starDirection() === v)) indexList.push(r.index);
	}
	const indexArray = new Uint16Array(indexList);

	// 魔法使いに先制されない行動を探す
	let resultMagician = null;
	for (const magician of actions.magicianList) {
		if ((!fastMagician) && magician.fast) continue;
		if (indexArray.some(v => new KssRng(v + magician.advances1).magicianAttacksFirst())) continue;
		resultMagician = magician;
		break;
	}
	if (resultMagician === null) return {magician: null, actionsTable: null};

	// 難易度の低い順に行動を走査
	let resultActionsTable = null;
	simulationLoop: for (const actionsTable of actions.list) {
		// 可能性のある全ての乱数位置で理想的か確認
		for (const index of indexArray) {
			r.index = index;
			const sim = r.simulateBattleWindowsMWW(resultMagician, actionsTable, fastKnight, fastDragon, hammerThrow);
			if (sim.length !== 4) continue simulationLoop;	// 理想的でなければ次の行動へ
		}
		// 全乱数位置で理想的なら確定
		return {magician: resultMagician, actionsTable};
	}

	return {magician: resultMagician, actionsTable: null};
}

const INITIAL_SEED = 0x7777
const CYCLE_LEN = 65534	//乱数変数が16bitであるなか、65534回で乱数列が1周する。つまり2つを除いた全ての乱数を通る。

/** 乱数のリスト */
export const rngCycle = new Uint8Array(CYCLE_LEN)
for(let i=0, s=INITIAL_SEED; i < CYCLE_LEN; i++) {
	rngCycle[i] = s;
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
const StarDirectionAdvances = 2;	// 着地時・壁や天井にぶつかった時に出る小さな星(1回は星の方向の判定)
const DashAdvances = 1;	// ダッシュ
const SlideAdvances = 6;	//スライディング
const HammerFlipChargeAdvances = 12;	// 鬼殺し火炎ハンマー溜め中の土煙
const HammerFlipFinishAdvances = 2;	// 鬼殺し火炎ハンマー後の土煙
const HammerFlipAdvances = HammerFlipChargeAdvances + HammerFlipFinishAdvances;	// 鬼殺し火炎ハンマーの素振り
const HammerHardHitAdvances = 9;

/** 乱数位置を保持し、消費と参照を管理するクラス */
export class KssRng {
	constructor(index=0) {
		this.index = index;
	}
	/** 現在の乱数値を取得 */
	getCurrentValue() {
		return rngCycle[this.index];
	}
	/** 乱数を1回進めて、0以上max未満の乱数を返す */
	randi(max) {
		return (rngCycle[++this.index] * max) >> 8;
	}
	/** 乱数を指定の回数進める */
	advance(count) {
		this.index += count;
	}

	// --- 基本アクション ---
	/** 着地時・壁や天井にぶつかった時に出る小さな星の出る方向 */
	starDirection() {
		this.advance(1);
		return this.randi(8);
	}
	/** ダッシュ */
	dash() {
		this.advance(DashAdvances);
	}
	/** スライディング */
	slide() {
		this.advance(SlideAdvances);
	}

	// --- ハンマーのアクション ---
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
	//コピーの元の出現に影響しないように、最速4Fで鬼殺しをする必要がある
	//先制判定は鬼殺しの溜め中の土煙の最中に行われ、前半の2Fと後半の2Fで乱数位置が違うため、両方を考慮する必要がある
	//コピーの元も、ハードヒット判定とヒットの間にコピーの元の判定が行われる
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
	hammerFlipChargeForFDragon() {
		this.advance(6);
		const a = this.dragonAttacksFirst();
		this.advance(1);
		const b = this.dragonAttacksFirst();
		this.advance(4);
		return a || b;
	}
	/** バトルウィンドウズでの鬼殺し火炎ハンマーのヒットと、出現するコピーの元 */
	hammerFlipHitForFastBattleWindowsPowers() {
		const hardHit = this.randi(4) === 0;	//ハードヒットの判定
		const powers = this.battleWindowsPowers();
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
	 * @param {{magician: number, knight: number, dragon: number, dragonAction: number}} advancesTable 乱数調整のための消費数
	 * @param {boolean} fastKnight 悪魔の騎士をFastモードでするか
	 * @param {boolean} fastDragon レッドドラゴンをFastモードでするか
	 * @param {number} hammerThrow ハンマー投げのダッシュの乱数消費数
	*/
	simulateBattleWindowsMWW(advancesTable, fastKnight, fastDragon, hammerThrow) {
		// --- 魔法使い (常にEasy) ---
		this.advance(advancesTable.magician);
		if (this.magicianAttacksFirst()) return null;
		const magicianPowers = this.battleWindowsPowers();
		this.hammerFlipChargeAndHit();
		const endingIndexMagician = this.index;

		// --- 悪魔の騎士 ---
		let knightPowers;
		this.advance(advancesTable.knight);
		if (fastKnight) {
			// Fastモード
			if (this.hammerFlipChargeForFastKnight()) return null;
			knightPowers = this.hammerFlipHitForFastBattleWindowsPowers();
		} else {
			// Easyモード
			if (this.knightAttacksFirst()) return null;
			knightPowers = this.battleWindowsPowers();
			this.hammerFlipChargeAndHit();
		}
		this.advance(hammerThrow);    // ハンマー投げのダッシュ
		this.hammerHit();    // ハンマー投げのスイングのヒット
		this.hammerHit();    // ハンマー投げのヒット
		const endingIndexKnight = this.index;

		// --- レッドドラゴン ---
		let dragonPowers;
		this.advance(advancesTable.dragon);
		if (fastDragon) {
			// Fastモード
			if (this.hammerFlipChargeForFDragon()) return null;
			dragonPowers = this.hammerFlipHitForFastBattleWindowsPowers();
		} else {
			// Easyモード
			if (this.dragonAttacksFirst()) return null;
			dragonPowers = this.battleWindowsPowers();
			this.hammerFlipChargeAndHit();
		}
		this.hammerFlipChargeAndHit();
		const endingIndexDragon = this.index;

		// --- レッドドラゴン2ターン目 ---
		this.advance(advancesTable.dragonAction);
		const dragonAction = this.dragonActs();

		return {
			powersTable: { magician: magicianPowers, knight: knightPowers, dragon: dragonPowers},
			endingIndexTable: { magician: endingIndexMagician, knight: endingIndexKnight, dragon: endingIndexDragon},
			dragonAction,
		};
	}
}

/** 銀河に願いをのバトルウィンドウズ戦の乱数調整のための行動を探す
 * @param {Iterable} advancesIterator 難易度が低い順の乱数調整行動全体
 * @param {Array<number>} stars バトルウィンドウズ戦開始時に出した星の向き
*/
export function manipulateBattleWindowsMWW(advancesIterator, fastKnight, fastDragon, hammerThrow, minIndex, maxIndex, stars) {
	const r = new KssRng();
	// 星の方向が全て一致する乱数位置を探す
	const indexList = [];
	for (let i=minIndex; i <= maxIndex; i++) {
		r.index = i;
		if (stars.every(v => r.starDirection() === v)) indexList.push(i);
	}
	const indexArray = new Uint16Array(indexList);

	// 難易度の低い順に行動を走査
	let minTimeLoss = CYCLE_LEN;
	let resultAdvancesTable = null;
	let resultFastKnghit = fastKnight;
	let resultFastDragon = fastDragon;
	simulationLoop: for (const advancesTable of advancesIterator) {
		// 可能性のある全ての乱数位置で理想的か確認
		let timeLoss = 0;
		for (const index of indexArray) {
			r.index = index;
			const sim = r.simulateBattleWindowsMWW(advancesTable, fastKnight, fastDragon, hammerThrow);

			// 理想的でなければ次の行動へ
			if (sim === null) continue simulationLoop;
			switch (sim.dragonAction) {
			case DragonGuard: break;
			case DragonStar: timeLoss++; break;
			default: continue simulationLoop;
			}

			if (timeLoss >= minTimeLoss) continue simulationLoop;	// タイムロスの総計がより小さくなければ次へ
		}

		// 更新
		resultAdvancesTable = advancesTable;
		minTimeLoss = timeLoss;
		resultFastKnghit = fastKnight;
		resultFastDragon = fastDragon;

		// タイムロスが0ならならそれで確定
		if (minTimeLoss === 0) break simulationLoop;
	}

	return { advancesTable: resultAdvancesTable, fastKnight: resultFastKnghit, fastDragon: resultFastDragon};
}

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

export const starDirectionChars =  "↑↗→↘↓↙←↖";
export const dragonActionNames = ["Star", "Other", "Other", "Star", "Other", "Other", "Guard", "Other", "Other", "Guard"];
const dragonActionMap = Int8Array.from(dragonActionNames, v => dragonActionNames.indexOf(v));
const dragonStar = dragonActionNames.indexOf("Star");
const dragonGuard = dragonActionNames.indexOf("Guard");
export const battleWindowsPowerNames = ["Fighter", "Plasma", "Hammer", "Beam", "Bomb", "Sword", "Hammer", "Bomb", "Plasma", "Sword", "Beam", "Fighter", "Stone", "Cutter", "Wheel", "Jet", "Ice", "Parasol", "Fire", "Suplex", "Ninja", "Yo-yo", "Mirror", "Wing"];
const battleWindowsPowerMap = Int8Array.from(battleWindowsPowerNames, v => battleWindowsPowerNames.indexOf(v));

/** 乱数位置を保持し、消費と参照を管理するクラス */
export class KssRng {
	constructor(startIndex=0) {
		this.index = startIndex;
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
	dash(count=1) {
		this.advance(count);
	}
	/** スライディング */
	slide(count=1) {
		this.advance(6 * count);
	}

	// --- ハンマーのアクション ---
	/** ハンマーのヒット */
	hammerHit() {
		const hardHit = this.randi(4) === 0;	//ハードヒットの判定
		if (hardHit) this.advance(9);	//ハードヒット
	}
	/** 鬼殺し火炎ハンマーをし、敵ににヒットさせる */
	hammerFlipChargeAndHit() {
		this.advance(12);	//溜め中の土煙
		this.hammerHit();
		this.advance(2);	//攻撃時の土煙
	}
	/** 鬼殺し火炎ハンマーの素振り */
	hammerFlip(count=1) {
		this.advance(14 * count);	//溜め中の土煙: +12, 攻撃時の土煙: +2
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
		if (hardHit) this.advance(9);	//ハードヒット
		this.advance(2);	//攻撃時の土煙
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
		return dragonActionMap[this.randi(10)];
	}
	/** バトルウィンドウズのコピーの元の出現 */
	battleWindowsPowers() {
		//右の出現
		let rightPower;
		if (this.randi(4) === 1) {
			const poolIdx = this.randi(4) & 1;
			const pwrIdx = this.randi(12);
			rightPower = battleWindowsPowerMap[poolIdx * 12 + pwrIdx];
		} else {
			rightPower = -1;
		}

		//左の出現 (左右とも出現して同じ種類だったら再抽選)
		let leftPower;
		do{
			if (this.randi(4) === 2) {
				const poolIdx = this.randi(4) & 1;
				const pwrIdx = this.randi(12);
				leftPower = battleWindowsPowerMap[poolIdx * 12 + pwrIdx];
			} else {
				leftPower = -1;
				break;
			}
		} while (leftPower === rightPower);

		return { leftPower, rightPower };
	}

	/** 銀河に願いをのバトルウィンドウズ戦をシミュレートし、理想的な乱数ならその結果を、そうでなければnullを返す */
	simulateBattleWindowsMWW(actionsForMagician, actionsForKnight, actionsForDragon, actionsForDragonAction, fastKnight, fastDragon, hammerThrow) {
		// --- 魔法使い (常にEasy) ---
		this.applyActions(actionsForMagician);
		if (this.magicianAttacksFirst()) return null;
		const magicianPowers = this.battleWindowsPowers();
		this.hammerFlipChargeAndHit();

		// --- 悪魔の騎士 ---
		let knightPowers;
		this.applyActions(actionsForKnight);
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
		this.dash(hammerThrow);    // ハンマー投げのダッシュ
		this.hammerHit();    // ハンマー投げのスイングのヒット
		this.hammerHit();    // ハンマー投げのヒット

		// --- レッドドラゴン ---
		let dragonPowers;
		this.applyActions(actionsForDragon);
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

		// --- レッドドラゴン2ターン目 ---
		this.applyActions(actionsForDragonAction);
		const dragonAction = this.dragonActs();

		return {
			magician: {action: actionsForMagician, powers: magicianPowers},
			knight: {action: actionsForKnight, powers: knightPowers},
			dragon: {action: actionsForDragon, powers: dragonPowers},
			actionsForDragonAction, dragonAction,
		};
	}

	applyActions({ stars=0, dashes=0, slides=0, hammerFlips=0 } ) {
		this.advance( 2*stars + 1*dashes + 6*slides + 14*hammerFlips );
	}
}

/** 銀河に願いをのバトルウィンドウズ戦の乱数調整のための行動を探す
 * @param {Iterable} actionsIterator 難易度が低い順の乱数調整行動全体
 * @param {Array<number>} stars バトルウィンドウズ戦開始時に出した星の向き
*/
export function manipulateBattleWindowsMWW(actionsIterator, fastKnight, fastDragon, hammerThrow, minIndex, maxIndex, stars) {
	const r = new KssRng();
	// 星の方向が全て一致する乱数位置を探す
	const indexList = [];
	for (let i=minIndex; i <= maxIndex; i++) {
		r.index = i;
		if (stars.every(v => r.starDirection() === v)) indexList.push(i);
	}
	const indexArray = new Uint16Array(indexList);

	// レッドドラゴンのタイムロスのフレーム数
	const dragonGuardTimeLoss = 0;
	const dragonStarTimeLoss = 50;

	// 走査するFastモードの組み合わせとタイムロスの初期値
	const fastList = [];
	if (fastKnight) fastList.push({ timeLoss: 40 * indexArray.length, fastKnight: false, fastDragon });
	if (fastDragon) fastList.push({ timeLoss: 40 * indexArray.length, fastKnight, fastDragon: false });
	fastList.push({ timeLoss: 0, fastKnight, fastDragon });

	// 難易度の低い順に行動を走査
	let resultActionsList = null;
	let minTimeLoss = CYCLE_LEN * 100;
	let resultFastKnghit = fastKnight;
	let resultFastDragon = fastDragon;
	for (const a of actionsIterator) {
		simulationLoop: for (let {timeLoss, fastKnight, fastDragon} of fastList) {
			if (timeLoss >= minTimeLoss) continue simulationLoop;	// タイムロスの総計がより小さくなければ次へ

			// 可能性のある全ての乱数位置で理想的か確認
			for (const index of indexArray) {
				r.index = index;
				const sim = r.simulateBattleWindowsMWW(a.magician, a.knight, a.dragon, a.dragonAction, fastKnight, fastDragon, hammerThrow);

				// 理想的でなければ次の行動へ
				if (sim === null) continue simulationLoop;
				switch (sim.dragonAction) {
				case dragonGuard: timeLoss += dragonGuardTimeLoss; break;
				case dragonStar: timeLoss += dragonStarTimeLoss; break;
				default: continue simulationLoop;
				}

				if (timeLoss >= minTimeLoss) continue simulationLoop;	// タイムロスの総計がより小さくなければ次へ
			}

			// 更新
			resultActionsList = a;
			minTimeLoss = timeLoss;
			resultFastKnghit = fastKnight;
			resultFastDragon = fastDragon;

			// タイムロスが0ならならそれで確定
			if (minTimeLoss === 0) return { actionsList: resultActionsList, fastKnight: resultFastKnghit, fastDragon: resultFastDragon};
		}
	}

	return { actionsList: resultActionsList, fastKnight: resultFastKnghit, fastDragon: resultFastDragon};
}

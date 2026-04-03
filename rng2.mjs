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

/** 乱数位置を保持し、消費と参照を管理するクラス */
export class KssRng {
	constructor(startIndex) {
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
	dragonGuards() {
		const r = this.randi(10);
		return r !== 6 && r !== 9;
	}
	/** バトルウィンドウズのコピーの元の出現 */
	battleWindowsPowers() {
		const POWER_POOLS = [
			["Fighter", "Plasma", "Hammer", "Beam", "Bomb", "Sword", "Hammer", "Bomb", "Plasma", "Sword", "Beam", "Fighter"],
			["Stone", "Cutter", "Wheel", "Jet", "Ice", "Parasol", "Fire", "Suplex", "Ninja", "Yo-yo", "Mirror", "Wing"]
		];

		//右の出現
		let rightPower;
		if (this.randi(4) === 1) {
			const poolIdx = this.randi(2);
			const pwrIdx = this.randi(12);
			rightPower = POWER_POOLS[poolIdx][pwrIdx];
		} else {
			rightPower = "None";
		}

		//左の出現 (左右とも出現して同じ種類だったら再抽選)
		let leftPower;
		do{
			if (this.randi(4) === 2) {
				const poolIdx = this.randi(2);
				const pwrIdx = this.randi(12);
				leftPower = POWER_POOLS[poolIdx][pwrIdx];
			} else {
				leftPower = "None";
				break;
			}
		} while (leftPower === rightPower);

		//最後に一律で1回進める
		this.advance(1);

		return { leftPower, rightPower };
	}
}

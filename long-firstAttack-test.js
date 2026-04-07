import { KssRng, CYCLE_LEN, StarDirectionChars, BattleWindowsPowerNames, HammerHardHitAdvances, HammerFlipFinishAdvances } from './rng2.mjs';

function find(startIdx, endIdx, displayLength) {
	console.log(startIdx +"-"+ endIdx, displayLength);

	const r = new KssRng();
	const countList = [];
	for (let i=startIdx; i <= endIdx; i++) {
		r.index = i;
		let count = 0;
		while (r.magicianAttacksFirst()) {
			count++;
		}
		countList.push({i, count});
	}

	countList.sort((a, b) => b.count - a.count);
	for (let i=0; i < displayLength; i++) {
		console.log(countList[i].count, countList[i].i);
	}
}

function test() {
	find(0, CYCLE_LEN, 3);
	/*
	0-65534 3
	8 26385
	7 8795
	7 26386
	*/

	find(26385, 26385 + 8, 9);
	/*
	26385-26393 9
	8 26385
	7 26386
	6 26387
	5 26388
	4 26389
	3 26390
	2 26391
	1 26392
	0 26393
	*/


	for (let i=26383; i < 26400; i++) {
		console.log(i, new KssRng(i).magicianAttacksFirst(), StarDirectionChars[new KssRng(i).starDirection()]);
	}
	/*
	26383 false ←
	26384 false →
	26385 true →
	26386 true →
	26387 true ↘
	26388 true ↘
	26389 true ↘
	26390 true →
	26391 true →
	26392 true ↑
	26393 false ↑
	26394 false ↑
	26395 false ↙
	26396 false ↙
	26397 false ↗
	26398 false ↖
	26399 false ↓
	*/
}

//test();

function testFastMagician(){
	for (let n=10; n >= 2; n -= 2) {
		for (let hardHitCheckFirst = 0; hardHitCheckFirst < 2; hardHitCheckFirst++) {
			for (let advances=8; advances >= 0; advances -= 2) {
				const startIndex = 26393 - n;
				const r = new KssRng(startIndex);


				r.advance(advances);
				const a = r.index;
				const attacksFirst = r.magicianAttacksFirst();
				r.advance(12 - advances);


				const h = hardHitCheckFirst === 0;
				let hardHit;
				if (h) hardHit = r.randi(4) === 0;	//先にハードヒットの判定

				const p = r.index;
				const powers = r.battleWindowsPowers();

				if (!h) hardHit = r.randi(4) === 0;	//後でハードヒットの判定

				if (hardHit) r.advance(HammerHardHitAdvances);	//ハードヒット
				r.advance(HammerFlipFinishAdvances);	//攻撃後の土煙


				const s1 = StarDirectionChars[r.starDirection()];
				const s2 = StarDirectionChars[r.starDirection()];
				const s3 = StarDirectionChars[r.starDirection()];


				console.log(startIndex +" "+ n +" "+ advances +" "+ a +"\t"+ attacksFirst +"\t"+ p +"\t"+ BattleWindowsPowerNames[powers.left] +"-"+ BattleWindowsPowerNames[powers.right] +"\t"+ h +"\t"+ s1 +" "+ s2 +" "+ s3);
			}
			console.log("---");
		}
	}
/*
26383 10 8 26391	true	26397	None-None	true	↓ ← ↓
26383 10 6 26389	true	26397	None-None	true	↓ ← ↓
26383 10 4 26387	true	26397	None-None	true	↓ ← ↓
26383 10 2 26385	true	26397	None-None	true	↓ ← ↓
26383 10 0 26383	false	26397	None-None	true	↓ ← ↓
---
26383 10 8 26391	true	26396	Beam-None	false	← ↓ ←
26383 10 6 26389	true	26396	Beam-None	false	← ↓ ←
26383 10 4 26387	true	26396	Beam-None	false	← ↓ ←
26383 10 2 26385	true	26396	Beam-None	false	← ↓ ←
26383 10 0 26383	false	26396	Beam-None	false	← ↓ ←
---
26385 8 8 26393	false	26399	Hammer-None	true	↗ ↓ ←
26385 8 6 26391	true	26399	Hammer-None	true	↗ ↓ ←
26385 8 4 26389	true	26399	Hammer-None	true	↗ ↓ ←
26385 8 2 26387	true	26399	Hammer-None	true	↗ ↓ ←
26385 8 0 26385	true	26399	Hammer-None	true	↗ ↓ ←
---
26385 8 8 26393	false	26398	None-None	false	← ↓ ←
26385 8 6 26391	true	26398	None-None	false	← ↓ ←
26385 8 4 26389	true	26398	None-None	false	← ↓ ←
26385 8 2 26387	true	26398	None-None	false	← ↓ ←
26385 8 0 26385	true	26398	None-None	false	← ↓ ←
---
26387 6 8 26395	false	26401	Beam-None	true	← ↘ ↘
26387 6 6 26393	false	26401	Beam-None	true	← ↘ ↘
26387 6 4 26391	true	26401	Beam-None	true	← ↘ ↘
26387 6 2 26389	true	26401	Beam-None	true	← ↘ ↘
26387 6 0 26387	true	26401	Beam-None	true	← ↘ ↘
---
26387 6 8 26395	false	26400	Plasma-None	false	← ↘ ↘
26387 6 6 26393	false	26400	Plasma-None	false	← ↘ ↘
26387 6 4 26391	true	26400	Plasma-None	false	← ↘ ↘
26387 6 2 26389	true	26400	Plasma-None	false	← ↘ ↘
26387 6 0 26387	true	26400	Plasma-None	false	← ↘ ↘
---
26389 4 8 26397	false	26403	None-None	true	← ↘ ↘
26389 4 6 26395	false	26403	None-None	true	← ↘ ↘
26389 4 4 26393	false	26403	None-None	true	← ↘ ↘
26389 4 2 26391	true	26403	None-None	true	← ↘ ↘
26389 4 0 26389	true	26403	None-None	true	← ↘ ↘
---
26389 4 8 26397	false	26402	Jet-None	false	↘ ↘ →
26389 4 6 26395	false	26402	Jet-None	false	↘ ↘ →
26389 4 4 26393	false	26402	Jet-None	false	↘ ↘ →
26389 4 2 26391	true	26402	Jet-None	false	↘ ↘ →
26389 4 0 26389	true	26402	Jet-None	false	↘ ↘ →
---
26391 2 8 26399	false	26405	None-Sword	true	↘ → ↑
26391 2 6 26397	false	26405	None-Sword	true	↘ → ↑
26391 2 4 26395	false	26405	None-Sword	true	↘ → ↑
26391 2 2 26393	false	26405	None-Sword	true	↘ → ↑
26391 2 0 26391	true	26405	None-Sword	true	↘ → ↑
---
26391 2 8 26399	false	26404	None-None	false	↘ ↘ →
26391 2 6 26397	false	26404	None-None	false	↘ ↘ →
26391 2 4 26395	false	26404	None-None	false	↘ ↘ →
26391 2 2 26393	false	26404	None-None	false	↘ ↘ →
26391 2 0 26391	true	26404	None-None	false	↘ ↘ →
---
*/
}
testFastMagician();

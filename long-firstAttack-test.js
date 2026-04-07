import { KssRng, CYCLE_LEN, StarDirectionChars } from './rng2.mjs';

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

test();

//@ts-check
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BattleWindowsMWWManipulator } from './rng2.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SNAPSHOT_FILE = path.join(__dirname, 'test-snapshot.json');

/** @type {NonNullable<ConstructorParameters<typeof BattleWindowsMWWManipulator>[0]>[]} */
const settingsList = [
	// 1. Easy（標準設定・分岐削減high）
	{
		magicianDifficulty: 'easy',
		fastKnight: false,
		fastDragon: false,
		allowDragonStar: true,
		hammerThrow: 1,
		minIndex: 2800,
		maxIndex: 3161,
		branchReduction: 'high',
	},
	// 2. Conservative Fast（標準設定・分岐削減high）
	{
		magicianDifficulty: 'conservativeFast',
		fastKnight: true,
		fastDragon: true,
		allowDragonStar: false,
		hammerThrow: 1,
		minIndex: 2800,
		maxIndex: 3161,
		branchReduction: 'high',
	},
	// 3. Aggressive Fast（標準設定・分岐削減high）
	{
		magicianDifficulty: 'aggressiveFast',
		fastKnight: true,
		fastDragon: true,
		allowDragonStar: false,
		hammerThrow: 1,
		minIndex: 2800,
		maxIndex: 3161,
		branchReduction: 'high',
	},
	// 4. Medium 分岐削減（Conservative Fast）
	{
		magicianDifficulty: 'conservativeFast',
		fastKnight: true,
		fastDragon: true,
		allowDragonStar: false,
		hammerThrow: 1,
		minIndex: 2800,
		maxIndex: 3161,
		branchReduction: 'medium',
	},
	// 5. Medium 分岐削減（Aggressive Fast）
	{
		magicianDifficulty: 'aggressiveFast',
		fastKnight: true,
		fastDragon: true,
		allowDragonStar: false,
		hammerThrow: 1,
		minIndex: 2800,
		maxIndex: 3161,
		branchReduction: 'medium',
	},
	// 6. Low 分岐削減（分岐度外視・Aggressive Fast）
	{
		magicianDifficulty: 'aggressiveFast',
		fastKnight: true,
		fastDragon: true,
		allowDragonStar: false,
		hammerThrow: 1,
		minIndex: 2800,
		maxIndex: 3161,
		branchReduction: 'low',
	},
	// 7. 騎士のみFast（変則設定）
	{
		magicianDifficulty: 'easy',
		fastKnight: true,
		fastDragon: false,
		allowDragonStar: false,
		hammerThrow: 1,
		minIndex: 2800,
		maxIndex: 3161,
		branchReduction: 'high',
	},
	// 8. ハンマー投げ消費変更（hammerThrow: 2）
	{
		magicianDifficulty: 'conservativeFast',
		fastKnight: true,
		fastDragon: true,
		allowDragonStar: false,
		hammerThrow: 2,
		minIndex: 2800,
		maxIndex: 3161,
		branchReduction: 'high',
	},
	// 9. 乱数探索範囲の拡大（デフォルト上限 3376）
	{
		magicianDifficulty: 'aggressiveFast',
		fastKnight: true,
		fastDragon: true,
		allowDragonStar: false,
		hammerThrow: 1,
		minIndex: 2800,
		maxIndex: 3376,
		branchReduction: 'high',
	},
];

async function main() {
	const newData = settingsList.map(v => {
		const manipulator = new BattleWindowsMWWManipulator(v);
		/** @type {Array<Array<[number, number]>>} */
		const a = [];
		/** @type {Array<[number, number]>} */
		let b;
		let n = Infinity;
		const result = manipulator.test(3, ({endingIndex, args}) => {
			if (endingIndex <= n) a.push(b = []);
			b.push([args[0], endingIndex]);
			n = endingIndex;
		}, p => p !== 'randi');
		console.log(JSON.stringify(result));
		return a;
	});


	if (fs.existsSync(SNAPSHOT_FILE)) {
		console.log(`\nスナップショットを ${SNAPSHOT_FILE} で発見しました。比較中...`);
		const oldData = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'));

		for (let settings_index = 0; settings_index < oldData.length; settings_index++) {
			const oldChunks = oldData[settings_index];
			const newChunks = newData[settings_index];
			for (let i = 0; i < oldChunks.length; i++) {
				const oldChunk = oldChunks[i];
				const newChunk = newChunks[i];
				const oldJson = JSON.stringify(oldChunk);
				const newJson = JSON.stringify(newChunk);
				if (oldJson !== newJson) {
					console.error("❌ 現在のロジックとスナップショットの間に差異が見つかりました！");
					console.log(JSON.stringify(settingsList[settings_index]));

					for (let j = 0; j < oldChunk.length; j++) {
						const oldLine = JSON.stringify(oldChunk[j]);
						const newLine = JSON.stringify(newChunk[j]);
						if (oldLine === newLine) {
							console.log(oldLine);
						} else {
							console.log(oldLine +" -> "+ newLine);
						}
					}

					process.exit(1);
				}
			}
		}

		console.log("✅ 差異は見つかりませんでした。結果はスナップショットと一致します。");
	} else {
		console.log(`\nスナップショットが見つかりませんでした。初期結果を ${SNAPSHOT_FILE} に保存します...`);
		fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(newData));
		console.log("✅ スナップショットが正常に保存されました。");
	}
}

main().catch(console.error);

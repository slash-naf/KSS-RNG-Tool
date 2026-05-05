import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BattleWindowsMWWManipulator } from './rng2.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SNAPSHOT_FILE = path.join(__dirname, 'test-snapshot.json');

const settingsList = [
	{
		magicianDifficulty: 'easy',
		fastKnight: false,
		fastDragon: false,
		allowDragonStar: true,
		hammerThrow: 1,
		minIndex: 2800,
		maxIndex: 3161,
	},
	{
		magicianDifficulty: 'conservativeFast',
		fastKnight: true,
		fastDragon: true,
		allowDragonStar: false,
		hammerThrow: 1,
		minIndex: 2800,
		maxIndex: 3161,
	},
	{
		magicianDifficulty: 'aggressiveFast',
		fastKnight: true,
		fastDragon: true,
		allowDragonStar: false,
		hammerThrow: 1,
		minIndex: 2800,
		maxIndex: 3161,
	},
];

async function main() {
	const newData = settingsList.map(v => {
		const manipulator = new BattleWindowsMWWManipulator(v);
		const a = [];
		let b;
		let n = 0x10000;
		manipulator.test(3, ({index, args}) => {
			if (index <= n) a.push(b = []);
			b.push([args[0], index]);
			n = index;
		}, p => p !== 'randi');
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

					for (let i = 0; i < oldChunk.length; i++) {
						const oldLine = JSON.stringify(oldChunk[i]);
						const newLine = JSON.stringify(newChunk[i]);
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

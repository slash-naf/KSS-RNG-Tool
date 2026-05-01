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
	const results = settingsList.map(v => {
		const manipulator = new BattleWindowsMWWManipulator(v);
		const a = [];
		manipulator.test(3, ({stack, result, index}) => {
			if (result === "## 開始乱数") a.push([]);
			a.at(-1).push([stack, result, index]);
		});
		return a;
	});


	if (fs.existsSync(SNAPSHOT_FILE)) {
		console.log(`\nスナップショットを ${SNAPSHOT_FILE} で発見しました。比較中...`);
		const oldData = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'));

		for (let settings_index = 0; settings_index < oldData.length; settings_index++) {
			for (let i = 0; i < oldData[settings_index].length; i++) {
				const oldChunk = oldData[settings_index][i].map(v => v[2]);
				const newChunk = results[settings_index][i].map(v => v[2]);
				newChunk.length = oldChunk.length

				const oldJson = JSON.stringify(oldChunk);
				const newJson = JSON.stringify(newChunk);
				if (oldJson !== newJson) {
					console.error("❌ 現在のロジックとスナップショットの間に差異が見つかりました！");
					console.log(JSON.stringify(settingsList[settings_index]));

					for (let i = 0; i < oldChunk.length; i++) {
						const oldJson = JSON.stringify(oldChunk[i]);
						const newJson = JSON.stringify(newChunk[i]);
						if (oldJson === newJson) {
							console.log(oldJson);
						} else {
							console.log(oldJson +" -> "+ newJson);
						}
					}

					process.exit(1);
				}
			}
		}

		console.log("✅ 差異は見つかりませんでした。結果はスナップショットと一致します。");
	} else {
		console.log(`\nスナップショットが見つかりませんでした。初期結果を ${SNAPSHOT_FILE} に保存します...`);
		fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(results));
		console.log("✅ スナップショットが正常に保存されました。");
	}
}

main().catch(console.error);

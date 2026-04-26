import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BattleWindowsMWWManipulator } from './rng2.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SNAPSHOT_FILE = path.join(__dirname, 'test-snapshot.json');

async function main() {
	const results = [
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
	].map(v => {
		const manipulator = new BattleWindowsMWWManipulator(v);
		const a = [];
		manipulator.test(3, ({name, result, index}) => {
			if (result === "## 開始乱数") a.push([]);
			a.at(-1).push([name, result, index]);
		});
		return a;
	});


	if (fs.existsSync(SNAPSHOT_FILE)) {
		console.log(`\nスナップショットを ${SNAPSHOT_FILE} で発見しました。比較中...`);
		const oldData = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'));

		let diffFound = false;
		for (let setting_index = 0; setting_index < oldData.length; setting_index++) {
			for (let i = 0; i < oldData[setting_index].length; i++) {
				const oldChunk = oldData[setting_index][i];
				const newChunk = results[setting_index][i];
				const oldJson = JSON.stringify(oldChunk);
				const newJson = JSON.stringify(newChunk);
				if (oldJson !== newJson) {
					diffFound = true;

					console.error("❌ 現在のロジックとスナップショットの間に差異が見つかりました！");
					console.log("setting_index = " + setting_index)

					const length = Math.max(oldChunk.length, newChunk.length);
					for (let i = 0; i < length; i++) {
						const oldJson = JSON.stringify(oldChunk[i]);
						const newJson = JSON.stringify(newChunk[i]);
						if (oldJson === newJson) {
							console.log(oldJson);
						} else {
							console.log(oldJson +" -> "+ newJson);
						}
					}
				}
			}
		}

		if (diffFound) process.exit(1);
		else console.log("✅ 差異は見つかりませんでした。結果はスナップショットと一致します。");
	} else {
		console.log(`\nスナップショットが見つかりませんでした。初期結果を ${SNAPSHOT_FILE} に保存します...`);
		fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(results));
		console.log("✅ スナップショットが正常に保存されました。");
	}
}

main().catch(console.error);

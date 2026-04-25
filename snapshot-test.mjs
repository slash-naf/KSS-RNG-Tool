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
			a.push([name, result, index]);
		});
		return a;
	});


	if (fs.existsSync(SNAPSHOT_FILE)) {
		console.log(`\nスナップショットを ${SNAPSHOT_FILE} で発見しました。比較中...`);
		const oldData = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'));

		const oldJson = JSON.stringify(oldData);
		const newJson = JSON.stringify(results);

		if (oldJson === newJson) {
			console.log("✅ 差異は見つかりませんでした。結果はスナップショットと一致します。");
		} else {
			console.error("❌ 現在のロジックとスナップショットの間に差異が見つかりました！");
			
			const newFile = path.join(__dirname, 'test-snapshot.new.json');
			fs.writeFileSync(newFile, JSON.stringify(results, null, 2));
			console.log(`比較のために新しい結果を ${newFile} に書き出しました。`);
			console.log(`diff ツール（例: 'diff test-snapshot.json test-snapshot.new.json'）を使用して変更点を確認してください。`);
			process.exit(1);
		}
	} else {
		console.log(`\nスナップショットが見つかりませんでした。初期結果を ${SNAPSHOT_FILE} に保存します...`);
		fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(results, null, 2));
		console.log("✅ スナップショットが正常に保存されました。");
	}
}

main().catch(console.error);

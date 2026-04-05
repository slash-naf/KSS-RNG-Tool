import { KssRng } from './rng2.mjs';


/** 銀河に願いをのバトルウィンドウズ戦の乱数調整をする従来の処理
 * @param {number} startIndex
 * @param {boolean} fastKnight
 * @param {boolean} fastDragon
 * @param {number} hammerThrow
 */
async function manipulateBattleWindowsMWW(startIndex, fastKnight, fastDragon, hammerThrow) {
    const startHex = countToHex(startIndex);
    const minDashes = '2';
    const twoDashOnHammerThrow = hammerThrow;

    // Magician (enemy=0, subgame=1, always Easy)
    const magResult = await easyPredictionRTA(startHex, 0, 1, minDashes);
    const magician = {
        powers: {
            leftPower: magResult[2],
            rightPower: magResult[3],
        },
        actions: parseActions(magResult[0]),
        endingIndex: hexToCount(magResult[4]),
        message: magResult[0],
    };

    // Knight (enemy=1, subgame=1)
    let knightResult;
    if (!fastKnight)
        knightResult = await easyPredictionRTA(magResult[4], 1, 1, twoDashOnHammerThrow, minDashes);
    else
        knightResult = await hardPredictionRTA(magResult[4], 1, 1, twoDashOnHammerThrow, minDashes);
    const knight = {
        powers: {
            leftPower: knightResult[2],
            rightPower: knightResult[3],
        },
        actions: parseActions(knightResult[0]),
        endingIndex: hexToCount(knightResult[4]),
        message: knightResult[0],
    };

    // Dragon (enemy=2, subgame=1)
    let dragonResult;
    if (!fastDragon)
        dragonResult = await easyPredictionRTA(knightResult[4], 2, 1, minDashes);
    else
        dragonResult = await hardPredictionRTA(knightResult[4], 2, 1, minDashes);
    const dragon = {
        powers: {
            leftPower: dragonResult[2],
            rightPower: dragonResult[3],
        },
        actions: parseActions(dragonResult[0]),
        endingIndex: hexToCount(dragonResult[4]),
        message: dragonResult[0],
    };

    // Dragon 2nd Turn
    const dragonSecondTurnResult = dragonSecondTurn(dragonResult[4], minDashes);
    const actionsForDragonAction = parseActions(dragonSecondTurnResult[0]);

    return { magician, knight, dragon, actionsForDragonAction };
}
// アクション文字列を構造化データに変換
function parseActions(message) {
    let dashes = 0, slides = 0, hammerFlips = 0;
    if (!message || message === "Do Nothing") return { dashes, slides, hammerFlips };

    const parts = message.split(" & ");
    for (const part of parts) {
        if (part === "Slide") slides = 1;
        else if (part === "up+y" || part === "up+b") hammerFlips = 1;
        else if (part.match(/^\d+ dash$/)) dashes = parseInt(part);
    }
    return { dashes, slides, hammerFlips };
}

/** 銀河に願いをのバトルウィンドウズ戦をシミュレートする
 * @param {number} startIndex
 * @param {{dashes: number, slides: number, hammerFlips: number}} actionsForMagician
 * @param {{dashes: number, slides: number, hammerFlips: number}} actionsForKnight
 * @param {{dashes: number, slides: number, hammerFlips: number}} actionsForDragon
 * @param {{dashes: number, slides: number, hammerFlips: number}} actionsForDragonAction
 * @param {boolean} fastKnight
 * @param {boolean} fastDragon
 */
function simulateBattleWindowsMWW(startIndex, actionsForMagician, actionsForKnight, actionsForDragon, actionsForDragonAction, fastKnight, fastDragon, hammerThrow) {
    const rng = new KssRng(startIndex);
    return rng.simulateBattleWindowsMWW(actionsForMagician, actionsForKnight, actionsForDragon, actionsForDragonAction, fastKnight, fastDragon, hammerThrow);
}

/** 銀河に願いをのバトルウィンドウズ戦の乱数調整とシミュレーションの結果の比較と乱数調整が成功したかを確認して合わない部分をコンソール出力
 * @param {number} startIndex
 * @param {boolean} fastKnight
 * @param {boolean} fastDragon
 */
async function compareManipulationAndSimulation(startIndex, fastKnight, fastDragon, hammerThrow, manipulate, simulate) {
    const manip = await manipulate(startIndex, fastKnight, fastDragon, hammerThrow);

    const sim = simulate(
        startIndex,
        manip.magician.actions,
        manip.knight.actions,
        manip.dragon.actions,
        manip.actionsForDragonAction,
        fastKnight,
        fastDragon,
        hammerThrow,
    );

    if (!sim) {
        return {sim, manip};
    }

    const enemies = ['magician', 'knight', 'dragon'];

    let m = null;
    let s = null;
    for (const name of enemies) {
        m = manip[name];
        s = sim[name];

        // コピーの元の比較
        if (m.powers.rightPower !== s.powers.rightPower) {
            console.log(`[DIFF] ${name} rightPower: manipulate=${m.powers.rightPower}, simulate=${s.powers.rightPower}`);
            return {sim, manip};
        }
        if (m.powers.leftPower !== s.powers.leftPower) {
            console.log(`[DIFF] ${name} leftPower: manipulate=${m.powers.leftPower}, simulate=${s.powers.leftPower}`);
            return {sim, manip};
        }

        // レッドドラゴンの行動を確認
        if (name === "dragon") {
            if (sim.dragonAction !== "Guard" && sim.dragonAction !== "Star") {
                console.log(`[NG] dragonAction: ${sim.dragonAction}`);
                return {sim, manip};
            }
        }
    }

    return null;
}

(async function(){
    let NGCount = 0;
    for (let i=3100; i <= 3400; i++) {
        const ng = await compareManipulationAndSimulation(i, true, true, 2, manipulateBattleWindowsMWW, simulateBattleWindowsMWW);
        if (ng) {
            console.log(ng);
            console.log("---");
            NGCount++
        }
    }
    console.log(`NGCount: ${NGCount}`)
})();


import { KssRng } from './rng2.mjs';


/** 銀河に願いをのバトルウィンドウズ戦の乱数調整をする
 * @param {number} startIndex
 * @param {boolean} fastKnight
 * @param {boolean} fastDragon
 * @param {number} hammerThrow
 * @returns {{magician: {leftPower, rightPower, actions: {dashes: number, slides: number, hammerFlips: number}, endingIndex: number}, knight: {leftPower, rightPower, actions: {dashes: number, slides: number, hammerFlips: number}, endingIndex: number}, dragon: {leftPower, rightPower, actions: {dashes: number, slides: number, hammerFlips: number}, endingIndex: number}, actionsForGuard: {dashes: number, slides: number, hammerFlips: number}}}
 */
async function manipulateBattleWindowsMWW(startIndex, fastKnight, fastDragon, hammerThrow) {
    const startHex = countToHex(startIndex);
    const minDashes = '2';
    const twoDashOnHammerThrow = hammerThrow;

    // Magician (enemy=0, subgame=1, always Easy)
    const magResult = await easyPredictionRTA(startHex, 0, 1, minDashes);
    const magician = {
        leftPower: magResult[2],
        rightPower: magResult[3],
        actions: parseActions(magResult[0]),
        endingIndex: hexToCount(magResult[4]),
    };

    // Knight (enemy=1, subgame=1)
    let knightResult;
    if (!fastKnight)
        knightResult = await easyPredictionRTA(magResult[4], 1, 1, twoDashOnHammerThrow, minDashes);
    else
        knightResult = await hardPredictionRTA(magResult[4], 1, 1, twoDashOnHammerThrow, minDashes);
    const knight = {
        leftPower: knightResult[2],
        rightPower: knightResult[3],
        actions: parseActions(knightResult[0]),
        endingIndex: hexToCount(knightResult[4]),
    };

    // Dragon (enemy=2, subgame=1)
    let dragonResult;
    if (!fastDragon)
        dragonResult = await easyPredictionRTA(knightResult[4], 2, 1, minDashes);
    else
        dragonResult = await hardPredictionRTA(knightResult[4], 2, 1, minDashes);
    const dragon = {
        leftPower: dragonResult[2],
        rightPower: dragonResult[3],
        actions: parseActions(dragonResult[0]),
        endingIndex: hexToCount(dragonResult[4]),
    };

    // Dragon 2nd Turn
    const guardResult = dragonSecondTurn(dragonResult[4], minDashes);
    const actionsForGuard = parseActions(guardResult[0]);

    return { magician, knight, dragon, actionsForGuard };
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
 * @param {{dashes: number, slides: number, hammerFlips: number}} actionsForGuard
 * @param {boolean} fastKnight
 * @param {boolean} fastDragon
 * @returns {{magician: {leftPower, rightPower, attacksFirst: boolean, endingIndex: number}, knight: {leftPower, rightPower, attacksFirst: boolean, endingIndex: number}, dragon: {leftPower, rightPower, attacksFirst: boolean, endingIndex: number}, guards: boolean}}
 */
function simulateBattleWindowsMWW(startIndex, actionsForMagician, actionsForKnight, actionsForDragon, actionsForGuard, fastKnight, fastDragon, hammerThrow) {
    const rng = new KssRng(startIndex);

    // --- 魔法使い (常にEasy) ---
    applyActions(rng, actionsForMagician);
    const magAttacksFirst = rng.magicianAttacksFirst();
    const magPowers = rng.battleWindowsPowers();
    rng.hammerFlipChargeAndHit();
    const magician = {
        leftPower: magPowers.leftPower,
        rightPower: magPowers.rightPower,
        attacksFirst: magAttacksFirst,
        endingIndex: rng.index,
    };

    // --- 悪魔の騎士 ---
    let knightAttacksFirst;
    let knightPowers;
    applyActions(rng, actionsForKnight);
    if (!fastKnight) {
        // Easyモード
        knightAttacksFirst = rng.knightAttacksFirst();
        knightPowers = rng.battleWindowsPowers();
        rng.hammerFlipChargeAndHit();
    } else {
        // Fastモード
        knightAttacksFirst = rng.hammerFlipChargeForFastKnight();
        knightPowers = rng.hammerFlipHitForFastBattleWindowsPowers();
    }
    rng.dash(hammerThrow);    // ハンマー投げのダッシュ
    rng.hammerHit();    // ハンマー投げのスイングのヒット
    rng.hammerHit();    // ハンマー投げのヒット
    const knight = {
        leftPower: knightPowers.leftPower,
        rightPower: knightPowers.rightPower,
        attacksFirst: knightAttacksFirst,
        endingIndex: rng.index,
    };

    // --- レッドドラゴン ---
    let dragonAttacksFirst;
    let dragonPowers;
    applyActions(rng, actionsForDragon);
    if (!fastDragon) {
        // Easyモード
        dragonAttacksFirst = rng.dragonAttacksFirst();
        dragonPowers = rng.battleWindowsPowers();
        rng.hammerFlipChargeAndHit();
        rng.hammerFlipChargeAndHit();
    } else {
        // Fastモード
        dragonAttacksFirst = rng.hammerFlipChargeForFDragon();
        dragonPowers = rng.hammerFlipHitForFastBattleWindowsPowers();
        rng.hammerFlipChargeAndHit();
    }
    const dragon = {
        leftPower: dragonPowers.leftPower,
        rightPower: dragonPowers.rightPower,
        attacksFirst: dragonAttacksFirst,
        endingIndex: rng.index,
    };

    // --- レッドドラゴン2ターン目 ---
    applyActions(rng, actionsForGuard);
    const guards = rng.dragonGuards();

    return { magician, knight, dragon, guards };
}
// アクションを RNG に適用するヘルパー
function applyActions(rng, actions) {
    rng.dash(actions.dashes);
    rng.slide(actions.slides);
    rng.hammerFlip(actions.hammerFlips);
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
        manip.actionsForGuard,
        fastKnight,
        fastDragon,
        hammerThrow,
    );

    let allMatch = true;
    const enemies = ['magician', 'knight', 'dragon'];

    for (const name of enemies) {
        const m = manip[name];
        const s = sim[name];

        // 先制されないことを確認
        if (s.attacksFirst) {
            console.log(`[NG] ${name}: 先制される (manipulate のアクション不足)`);
            allMatch = false;
        }

        // パワーの比較
        if (m.leftPower !== s.leftPower) {
            console.log(`[DIFF] ${name} leftPower: manipulate=${m.leftPower}, simulate=${s.leftPower}`);
            allMatch = false;
        }
        if (m.rightPower !== s.rightPower) {
            console.log(`[DIFF] ${name} rightPower: manipulate=${m.rightPower}, simulate=${s.rightPower}`);
            allMatch = false;
        }

        // 終了インデックスの比較
        if (m.endingIndex !== s.endingIndex) {
            console.log(`[DIFF] ${name} endingIndex: manipulate=${m.endingIndex}, simulate=${s.endingIndex}`);
            allMatch = false;
        }
    }

    // ガード判定の出力
    if (!sim.guards) {
        console.log(`[NG] Dragon guards: ${sim.guards}`);
        allMatch = false;
    }

    if (allMatch) {
        //console.log(`[OK] startIndex=${startIndex} fastKnight=${fastKnight} fastDragon=${fastDragon}: 全ての結果が一致`);
    } else {
        console.log(`[NG] startIndex=${startIndex} fastKnight=${fastKnight} fastDragon=${fastDragon}: 差異あり`);
        console.log('---');
    }

    return allMatch;
}

(async function(){
    let allMatchCount = 0;
    for (let i=3100; i <= 3400; i++) {
        const allMatch = await compareManipulationAndSimulation(i, true, true, 2, manipulateBattleWindowsMWW, simulateBattleWindowsMWW);
        if (!allMatch) {
            allMatchCount++
        }
    }
    console.log(`allMatchCount: ${allMatchCount}`)
})();


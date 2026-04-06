import { KssRng, battleWindowsPowerNames, dragonStar, dragonGuard } from './rng2.mjs';


/** 銀河に願いをのバトルウィンドウズ戦の乱数調整をする従来の処理 */
async function manipulateBattleWindowsMWW(startIndex, fastKnight, fastDragon, hammerThrow) {
    const startHex = countToHex(startIndex);
    const minDashes = '2';
    const twoDashOnHammerThrow = hammerThrow;

    // Magician (enemy=0, subgame=1, always Easy)
    let [message, advances, leftPower, rightPower, finalHex] = await easyPredictionRTA(startHex, 0, 1, minDashes);
    const magician = {message, advances, leftPower, rightPower, finalHex};

    // Knight (enemy=1, subgame=1)
    if (!fastKnight)
        [message, advances, leftPower, rightPower, finalHex] = await easyPredictionRTA(finalHex, 1, 1, twoDashOnHammerThrow, minDashes);
    else
        [message, advances, leftPower, rightPower, finalHex] = await hardPredictionRTA(finalHex, 1, 1, twoDashOnHammerThrow, minDashes);
    const knight = {message, advances, leftPower, rightPower, finalHex};

    // Dragon (enemy=2, subgame=1)
    if (!fastDragon)
        [message, advances, leftPower, rightPower, finalHex] = await easyPredictionRTA(finalHex, 2, 1, minDashes);
    else
        [message, advances, leftPower, rightPower, finalHex] = await hardPredictionRTA(finalHex, 2, 1, minDashes);
    const dragon = {message, advances, leftPower, rightPower, finalHex};

    // Dragon 2nd Turn
    const dragonSecondTurnResult = dragonSecondTurn(finalHex, minDashes);
    const dragonSecondTurnMessage = dragonSecondTurnResult[0];
    const dragonAction = dragonSecondTurnResult[1];

    // 新形式への変換
    const parseActions = message => {
        let dashes = 0, slides = 0, hammerFlips = 0;
        if (!message || message === "Do Nothing") return {message, dashes, slides, hammerFlips };

        const parts = message.split(" & ");
        for (const part of parts) {
            if (part === "Slide") slides = 1;
            else if (part === "up+y" || part === "up+b") hammerFlips = 1;
            else if (part.match(/^\d+ dash$/)) dashes = parseInt(part);
        }
        return {message, dashes, slides, hammerFlips };
    };
    const parsePowers = enemy => ({
        left: battleWindowsPowerNames.indexOf(enemy.leftPower),
        right: battleWindowsPowerNames.indexOf(enemy.rightPower),
    });

    return {
        actionsTable: {
            magician: parseActions(magician.message),
            knight: parseActions(knight.message),
            dragon: parseActions(dragon.message),
            dragonAction: parseActions(dragonSecondTurnMessage),
        },
        powersTable: {
            magician: parsePowers(magician),
            knight: parsePowers(knight),
            dragon: parsePowers(dragon),
        },
        dragonAction: dragonAction === 0 ? dragonGuard : dragonStar,
    };
}

/** 銀河に願いをのバトルウィンドウズ戦をシミュレートする */
function simulateBattleWindowsMWW(startIndex, actionsTable, fastKnight, fastDragon, hammerThrow) {
    const rng = new KssRng(startIndex);
    return rng.simulateBattleWindowsMWW(actionsTable, fastKnight, fastDragon, hammerThrow);
}

/** 銀河に願いをのバトルウィンドウズ戦の従来の乱数調整とシミュレーションの結果の比較 */
async function compareManipulationAndSimulation(startIndex, fastKnight, fastDragon, hammerThrow, manipulate, simulate) {
    const manip = await manipulate(startIndex, fastKnight, fastDragon, hammerThrow);

    const sim = simulate(
        startIndex,
        manip.actionsTable,
        fastKnight,
        fastDragon,
        hammerThrow,
    );

    if (!sim) {
        return {sim, manip};
    }

    const enemies = ['magician', 'knight', 'dragon'];

    for (const name of enemies) {
        const mPowers = manip.powersTable[name];
        const sPowers = sim.powersTable[name];

        // コピーの元の比較
        if (mPowers.right !== sPowers.right) {
            console.log(`[DIFF] ${name} right: manipulate=${battleWindowsPowerNames[mPowers.right]}, simulate=${battleWindowsPowerNames[sPowers.right]}`);
            return {sim, manip};
        }
        if (mPowers.left !== sPowers.left) {
            console.log(`[DIFF] ${name} left: manipulate=${battleWindowsPowerNames[mPowers.left]}, simulate=${battleWindowsPowerNames[sPowers.left]}`);
            return {sim, manip};
        }
    }

    // dragonActionの比較
    if (manip.dragonAction !== sim.dragonAction) {
        console.log(`[DIFF] dragonAction: manipulate=${manip.dragonAction}, simulate=${sim.dragonAction}`);
        return {sim, manip};
    }

    return null;
}
/** 乱数範囲に対して、銀河に願いをのバトルウィンドウズ戦の従来の乱数調整とシミュレーションの結果の比較 */
async function compareManipulationsAndSimulations(startIdx, endIdx){
    let diffCount = 0;
    for (let i=startIdx; i <= endIdx; i++) {
        for (let hammerThrow=0; hammerThrow < 2; hammerThrow++) {
            for (let fastFlags=0; fastFlags < 4; fastFlags++) {
                const fastKnight = (fastFlags & 1) !== 0;
                const fastDragon = (fastFlags & 2) !== 0;
                const ng = await compareManipulationAndSimulation(i, fastKnight, fastDragon, hammerThrow, manipulateBattleWindowsMWW, simulateBattleWindowsMWW);
                if (ng) {
                    console.log(ng);
                    console.log(i, fastKnight, fastDragon, hammerThrow);
                    console.log();
                    diffCount++
                }
            }
        }
    }
    console.log(`diffCount: ${diffCount}`)
}

compareManipulationsAndSimulations(3000, 3500);

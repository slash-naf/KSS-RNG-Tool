import { KssRng, BattleWindowsPowerNames, DragonStar, DragonGuard, SlideAdvances, HammerFlipAdvances, StarDirectionAdvances } from './rng2.mjs';


/** 銀河に願いをのバトルウィンドウズ戦の乱数調整をする従来の処理 */
async function manipulateBattleWindowsMWWOld(startIndex, fastKnight, fastDragon, hammerThrow) {
    const startHex = countToHex(startIndex);
    const minDashes = '1';
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
    const parseAdvances = ({dashes=0, slides=0, hammerFlips=0}) => dashes + slides*SlideAdvances + hammerFlips*HammerFlipAdvances;
    const parsePowers = enemy => ({
        left: BattleWindowsPowerNames.indexOf(enemy.leftPower),
        right: BattleWindowsPowerNames.indexOf(enemy.rightPower),
    });

    const magicianActions = parseActions(magician.message);
    const knightActions   = parseActions(knight.message);
    const dragonActions   = parseActions(dragon.message);
    const dragonActionActions = parseActions(dragonSecondTurnMessage);

    // simulateBattleWindowsMWW の magician 引数 (fast=false: Easyモード)
    const magicianArg = {
        fast: false,
        advances1: parseAdvances(magicianActions),
        advances2: 0,
    };
    // simulateBattleWindowsMWW の actionsTable 引数
    const actionsTable = {
        magician:    { message: magician.message,             advances: parseAdvances(magicianActions) },
        knight:      { message: knight.message,               advances: parseAdvances(knightActions) },
        dragon:      { message: dragon.message,               advances: parseAdvances(dragonActions) },
        dragonAction:{ message: dragonSecondTurnMessage,      advances: parseAdvances(dragonActionActions) },
    };
    return {
        magicianArg,
        actionsTable,
        fastKnight,
        fastDragon,

        powersTable: {
            magician: parsePowers(magician),
            knight: parsePowers(knight),
            dragon: parsePowers(dragon),
        },
        endingIndexTable: {
            magician: hexToCount(magician.finalHex),
            knight: hexToCount(knight.finalHex),
            dragon: hexToCount(dragon.finalHex),
        },
        dragonAction: dragonAction === 0 ? DragonGuard : DragonStar,
    };
}
/** 銀河に願いをのバトルウィンドウズ戦の従来の乱数調整とシミュレーションの結果の比較 */
async function compareManipulationAndSimulation(startIndex, fastKnight, fastDragon, hammerThrow, simulate) {
    const manip = await manipulateBattleWindowsMWWOld(startIndex, fastKnight, fastDragon, hammerThrow);

    const sim = simulate(
        startIndex,
        manip.magicianArg,
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
            console.log(`[DIFF] ${name} right: manipulate=${BattleWindowsPowerNames[mPowers.right]}, simulate=${BattleWindowsPowerNames[sPowers.right]}`);
            return {sim, manip};
        }
        if (mPowers.left !== sPowers.left) {
            console.log(`[DIFF] ${name} left: manipulate=${BattleWindowsPowerNames[mPowers.left]}, simulate=${BattleWindowsPowerNames[sPowers.left]}`);
            return {sim, manip};
        }
    }

    // レッドドラゴンの行動の比較
    if (manip.dragonAction !== sim.dragonAction) {
        console.log(`[DIFF] dragonAction: manipulate=${manip.dragonAction}, simulate=${sim.dragonAction}`);
        return {sim, manip};
    }

    return null;
}
/** 乱数範囲に対して、銀河に願いをのバトルウィンドウズ戦の従来の乱数調整とシミュレーションの結果の比較 */
async function compareManipulationsAndSimulations(startIdx, endIdx, simulate){
    console.log("# compareManipulationsAndSimulations")

    let diffCount = 0;
    let NGCount = 0;
    for (let i=startIdx; i <= endIdx; i++) {
        for (let hammerThrow=0; hammerThrow < 3; hammerThrow++) {
            for (let fastFlags=0; fastFlags < 4; fastFlags++) {
                const fastKnight = (fastFlags & 1) !== 0;
                const fastDragon = (fastFlags & 2) !== 0;
                const ng = await compareManipulationAndSimulation(i, fastKnight, fastDragon, hammerThrow, simulate);
                if (ng) {
                    if (
                        ng.manip.actionsTable.magician.message === "N" ||
                        ng.manip.actionsTable.knight.message === "N" ||
                        ng.manip.actionsTable.dragon.message === "N"
                    ) {
                        NGCount++;
                    } else {
                        console.log("---");
                        console.log("manip:", ng.manip.endingIndexTable);
                        console.log("sim:  ", ng.sim?.endingIndexTable);
                        console.log(i, fastKnight, fastDragon, hammerThrow);
                        diffCount++
                    }
                }
            }
        }
        if (i % 10 === 0) {
            console.log("---");
            console.log("i: " + i)
        }
    }
    console.log(`diffCount: ${diffCount}`)
    console.log(`NGCount: ${NGCount}`)
}

compareManipulationsAndSimulations(3000, 3500, (startIndex, magician, actionsTable, fastKnight, fastDragon, hammerThrow) => new KssRng(startIndex).simulateBattleWindowsMWW(magician, actionsTable, fastKnight, fastDragon, hammerThrow));

import { KssRng, BattleWindowsPowerNames, DragonStar, DragonGuard, SlideAdvances, HammerFlipAdvances, StarDirectionAdvances, Actions, BranchTypes, manipulateBattleWindowsMWW } from './rng2.mjs';


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

    // simが全ステップ失敗ならNG
    if (sim.length === 0) {
        return {sim, manip};
    }

    // sim[0]=magician, sim[1]=knight, sim[2]=dragonの順に格納される
    const enemies = ['magician', 'knight', 'dragon'];

    for (let idx = 0; idx < enemies.length; idx++) {
        const name = enemies[idx];
        const mPowers = manip.powersTable[name];
        const sPowers = sim[idx];
        const message = manip.actionsTable[name].message;

        if (sPowers === undefined) {
            if (message !== "N") {
                console.log(`[DIFF] ${name}: simulate 失敗`);
                return {sim, manip};
            } else {
                return null;
            }
        }

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
    if (manip.dragonAction === DragonGuard && sim.length !== 4) {
        console.log(`[DIFF] dragonAction: manipulate=${manip.dragonAction}, simulate length=${sim.length}`);
        return {sim, manip};
    }

    return null;
}
/** 乱数範囲に対して、銀河に願いをのバトルウィンドウズ戦の従来の乱数調整とシミュレーションの結果の比較 */
async function compareManipulationsAndSimulations(startIdx, endIdx, simulate){
    console.log("# compareManipulationsAndSimulations")

    let diffCount = 0;
    for (let i=startIdx; i <= endIdx; i++) {
        for (let hammerThrow=0; hammerThrow < 3; hammerThrow++) {
            for (let fastFlags=0; fastFlags < 4; fastFlags++) {
                const fastKnight = (fastFlags & 1) !== 0;
                const fastDragon = (fastFlags & 2) !== 0;
                const ng = await compareManipulationAndSimulation(i, fastKnight, fastDragon, hammerThrow, simulate);
                if (ng) {
                    console.log(i, fastKnight, fastDragon, hammerThrow);
                    console.log("---");
                    diffCount++
                }
            }
        }
        if (i % 10 === 0) {
            console.log("---");
            console.log("i: " + i)
        }
    }
    console.log(`diffCount: ${diffCount}`)
}

//compareManipulationsAndSimulations(3100, 3500, (startIndex, magician, actionsTable, fastKnight, fastDragon, hammerThrow) => new KssRng(startIndex).simulateBattleWindowsMWW(magician, actionsTable, fastKnight, fastDragon, hammerThrow));





const actionsDifficultyTable = {
    magician: [
        { difficulty: -4, hammerFlips: 1, advances: 6 },
        { difficulty: -3, hammerFlips: 1, advances: 4 },
        { difficulty: -2, hammerFlips: 1, advances: 2 },
        { difficulty: -1, hammerFlips: 1, advances: 0 },
        { difficulty: 0 },
        { difficulty: 201, slides: 1, advances: 4 },
        { difficulty: 202, dashes: 2 },
        { difficulty: 203, dashes: 3 },
        { difficulty: 204, slides: 1, advances: 5 },
        { difficulty: 205, dashes: 1 },
    ],
    knight: [
        { difficulty: 0 },
        { difficulty: 1, stars: 1 },
        { difficulty: 2, hammerFlips: 1 },
        { difficulty: 3, slides: 1 },
        { difficulty: 11, stars: 2 },
        { difficulty: 12, hammerFlips: 2 },
        { difficulty: 13, slides: 2 },
        { difficulty: 21, hammerFlips: 1, stars: 1 },
        { difficulty: 22, slides: 1, stars: 1 },
        { difficulty: 23, slides: 1, hammerFlips: 1 },
        { difficulty: 24, dashes: 3 },
        { difficulty: 41, dashes: 3, stars: 1 },
        { difficulty: 42, dashes: 3, hammerFlips: 1 },
        { difficulty: 43, dashes: 3, slides: 1 },
    ],
    dragon: [
        { difficulty: 0 },
        { difficulty: 4, stars: 1 },
        { difficulty: 5, slides: 1 },
        { difficulty: 16, stars: 2 },
        { difficulty: 17, slides: 2 },
        { difficulty: 31, slides: 1, stars: 1 },
        { difficulty: 32, dashes: 3 },
        { difficulty: 51, dashes: 3, stars: 1 },
        { difficulty: 52, dashes: 3, slides: 1 },
    ],
    dragonAction: [
        { difficulty: 0 },
        { difficulty: 1, stars: 1 },
        { difficulty: 1, hammerFlips: 1 },
        { difficulty: 1, slides: 1 },
        { difficulty: 1, dashes: 3 },
        { difficulty: 6, dashes: 2, stars: 1 },
        { difficulty: 7, dashes: 2, slides: 1 },
        { difficulty: 8, dashes: 2, hammerFlips: 1 },
    ],
};
const actions = new Actions(actionsDifficultyTable);
function testNewManipulation(startIdx, endIdx, fastMagician, fastKnight, fastDragon, hammerThrow, stars){
    console.log("# testNewManipulation");

    let magicianNGCount = 0;
    let otherNGCount = 0;
    let wrongCount = 0;
    let branchCount = 0;

    let magicianCountList = {};
    let knightCountList = {};
    let dragonCountList = {};
    let dragonActionCountList = {};

    for (let i=startIdx; i <= endIdx; i++) {
        const r = new KssRng(i);

        const starsList = [];
        for (let i=0; i < stars; i++) {
            starsList.push(r.starDirection());
        }

        const {magician, actionsTable, branch} = manipulateBattleWindowsMWW(actions, fastMagician, fastKnight, fastDragon, hammerThrow, startIdx, endIdx, starsList);

        if (magician === null) {
            magicianNGCount++;
            continue;
        }
        if (actionsTable === null) {
            otherNGCount++;
            continue;
        }

        // 分岐が設定されている場合、観測値に基づいてactionsTableを切り替え
        let chosenActionsTable = actionsTable;
        if (branch) {
            const bt = BranchTypes[branch.type];
            const tempSim = new KssRng(r.index).simulateBattleWindowsMWW(magician, actionsTable, fastKnight, fastDragon, hammerThrow);
            if (tempSim.length >= bt.minSimLength && bt.getObservable({ sim: tempSim }) === branch.value) {
                chosenActionsTable = branch.fallbackActionsTable;
                branchCount++;
            }
        }

        const result = r.simulateBattleWindowsMWW(magician, chosenActionsTable, fastKnight, fastDragon, hammerThrow);
        if (result.length !== 4) { wrongCount++; continue; }

        // メッセージ集計
        const magicianMsg = magician.message;
        magicianCountList[magicianMsg] = (magicianCountList[magicianMsg] || 0) + 1;

        const knightMsg = actionsTable.knight.message;
        knightCountList[knightMsg] = (knightCountList[knightMsg] || 0) + 1;

        const dragonMsg = actionsTable.dragon.message;
        dragonCountList[dragonMsg] = (dragonCountList[dragonMsg] || 0) + 1;

        const dragonActionMsg = actionsTable.dragonAction.message;
        dragonActionCountList[dragonActionMsg] = (dragonActionCountList[dragonActionMsg] || 0) + 1;
    }

    console.log('magicianNGCount: '+ magicianNGCount);
    console.log('otherNGCount: '+ otherNGCount);
    console.log('wrongCount: '+ wrongCount);
    console.log('branchCount: '+ branchCount);

    console.log("## magicianCountList");
    for (let [message, val] of Object.entries(magicianCountList)) {
        console.log(message +': '+ val);
    }
    console.log("## knightCountList");
    for (let [message, val] of Object.entries(knightCountList)) {
        console.log(message +': '+ val);
    }
    console.log("## dragonCountList");
    for (let [message, val] of Object.entries(dragonCountList)) {
        console.log(message +': '+ val);
    }
    console.log("## dragonActionCountList");
    for (let [message, val] of Object.entries(dragonActionCountList)) {
        console.log(message +': '+ val);
    }
}

testNewManipulation(3100, 3376, true, true, true, 1, 3);

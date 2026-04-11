import { KssRng, BattleWindowsPowerNames, DragonStar, DragonGuard, SlideAdvances, HammerFlipAdvances, StarDirectionAdvances, BranchTypes, BattleWindowsMWWManipulator, DragonActionNames } from './rng2.mjs';


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
    // simulateBattleWindowsMWW の actionCombination 引数
    const actionCombination = {
        magician:    { message: magician.message,             advances: parseAdvances(magicianActions) },
        knight:      { message: knight.message,               advances: parseAdvances(knightActions) },
        dragon:      { message: dragon.message,               advances: parseAdvances(dragonActions) },
        dragonAction:{ message: dragonSecondTurnMessage,      advances: parseAdvances(dragonActionActions) },
    };
    return {
        magicianArg,
        actionCombination,
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
        manip.actionCombination,
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
        const message = manip.actionCombination[name].message;

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
        console.log(`[DIFF] dragonAction: manipulate dragonAction=${DragonActionNames[manip.dragonAction]}, simulate length=${sim.length}`);
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

//compareManipulationsAndSimulations(3100, 3500, (startIndex, magician, actionCombination, fastKnight, fastDragon, hammerThrow) => new KssRng(startIndex).simulateBattleWindowsMWW(magician, actionCombination, fastKnight, fastDragon, hammerThrow));





function testNewManipulation(minIndex, maxIndex, fastMagician, fastKnight, fastDragon, hammerThrow, stars, branchPriorities){
    console.log("## 設定");
    console.log("魔法使い: " + (fastMagician ? "Fast" : "Easy"));
    console.log("悪魔の騎士: " + (fastKnight ? "Fast" : "Easy"));
    console.log("レッドドラゴン: " + (fastDragon ? "Fast" : "Easy"));
    console.log("ハンマー投げのダッシュによる消費数: " + hammerThrow);
    console.log("探索する乱数位置: " + minIndex + " ～ " + maxIndex);
    console.log("星を出す回数: " + stars);
    console.log("分岐の優先度: " + (branchPriorities ? branchPriorities.join(", ") : "未指定"));

    const manipulator = new BattleWindowsMWWManipulator({
        fastMagician, fastKnight, fastDragon, hammerThrow,
        minIndex, maxIndex, branchPriorities
    });

    const result = manipulator.test(stars);

    console.log("## 統計");

    console.log('魔法使いの条件に合う行動が存在しない: '+ result.magicianNGCount);
    console.log('敵の行動の組み合わせが存在しない: '+ result.otherNGCount);
    console.log('分岐発生数: '+ result.branchCount);
    if (Object.keys(result.branchGroups).length > 0) {
        for (const [key, indices] of Object.entries(result.branchGroups)) {
            console.log(`  ${key}: [${indices.join(', ')}]`);
        }
    }
    console.log('### 行動を適用してシミュレーションした結果');
    console.log('魔法使いで失敗: '+ result.wrongCounts[0]);
    console.log('悪魔の騎士で失敗: '+ result.wrongCounts[1]);
    console.log('レッドドラゴンで失敗: '+ result.wrongCounts[2]);
    console.log('レッドドラゴン2ターン目で失敗: '+ result.wrongCounts[3]);

    console.log("### 魔法使いでの行動");
    for (let [message, val] of Object.entries(result.magicianCountList)) console.log(message +': '+ val);
    console.log("### 悪魔の騎士での行動");
    for (let [message, val] of Object.entries(result.knightCountList)) console.log(message +': '+ val);
    console.log("### レッドドラゴンでの行動");
    for (let [message, val] of Object.entries(result.dragonCountList)) console.log(message +': '+ val);
    console.log("### レッドドラゴン2ターン目での行動");
    for (let [message, val] of Object.entries(result.dragonActionCountList)) console.log(message +': '+ val);
}

testNewManipulation(3100, 3376, true, true, true, 1, 3);

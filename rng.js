//Kirby Super Star RNG Simulator

//startRNG is the default RNG value when game starts up
const startRNG = "7777";
const minCount = 0;
const maxCount = 65536;
var hits = 0;
const threeBin = "00000011";
const eightBin = "00001000";

//Basic number calc functions
function hexToDecimal(hex) {
    return parseInt(hex, 16);
}

function twoHexToDecimal(hex) {
    hex1 = hex.slice(0, 2);
    hex2 = hex.slice(2);

    dec1 = hexToDecimal(hex1);
    dec2 = hexToDecimal(hex2);

    return [dec1, dec2];
}

function isBetween(x, low, high) {
    return low <= x && x <= high;
}

function boolToInt(result) {
    if (result) {
        return 1;
    }
    else {
        return 0;
    }
}

function hexToBin(hex) {
    let i = parseInt(hex, 16)
    var binary = toBinaryString(i);
    while (binary.length < 8) {
        binary = "0" + binary;
    }
    return binary;
}

function toBinaryString (number) {
    let num = number;
    let binary = (num % 2).toString();
    for (; num > 1; ) {
        num = parseInt(num / 2);
        binary =  (num % 2) + (binary);
    }
    return binary;
}

function convertToString (number) {
    if (typeof number === 'string' || number instanceof String) {
        return parseInt(number);
    }
}

function toHexString(number) {
    var str = Number(number).toString(16);
    return str.length == 1 ? "0" + str : str;
}

function numDigits(x) {
    return (Math.log10((x ^ (x >> 31)) - (x >> 31)) | 0) + 1;
}

function allAreTrue(arr) {
    const all =! arr.includes(false);
    return all;
}

function stringToBool(value) {
    return (value + '').toLowerCase() === 'true';
}

//"Count" conversions (count is a unit which is defined by how many steps are from the starting RNG, with the start being 0)
//7777 = 0, DDBD = 1, etc...
function countToHex(count) {
    var output = startRNG;
    for (var i = 0; i < count; i++) {
        output = nextHexRNG(output);
    }
    return output;
}

function countToDecimal(count) {
    return twoHexToDecimal(countToHex(count));
}

function advanceRNG (hex, amount) {
    var output = hex;
    for (var i = 0; i < amount; i++) {
        output = nextHexRNG(output);
    }
    return output;
}

function hexToCount(hexTarget) {
    hexTarget = hexTarget.toUpperCase();
    count = 0;
    testHex = startRNG;
    while ((!(testHex == hexTarget)) && (count < maxCount)){
        count++;
        testHex = nextHexRNG(testHex);
    }
    if (count < maxCount)
        return count;
    else
        return none;
}


//RNG-related functions
function nextHexRNG(initialHex) {
    initialHex = swapNumberPositions(initialHex);
    num = Number("0x" + initialHex);
    num = rng(num);
    result = num.toString(16).toUpperCase();
    while (result.length < 4) {
        result = "0" + result;
    }
    result = swapNumberPositions(result);
    return result;

    function rng(init) {
        seed = init;
        for (let i = 0; i < 11; i++) {
            const bit = ~(seed ^ (seed >> 1) ^ (seed >> 15)) & 1;
            seed = (seed << 1) | bit;
        }
        trim = seed & 0xffff;
        return trim;
    }

    function swapNumberPositions(hex) {
        hex1 = hex.slice(0, 2);
        hex2 = hex.slice(2);
        result = hex2 + hex1;
        return result;
    }
}

function hexToStarDirection(x) {
    const decimalValue = hexToDecimal(x);
    const ranges = [
        [0, 31],
        [32, 63],
        [64, 95],
        [96, 127],
        [128, 159],
        [160, 191],
        [192, 223],
        [224, 255]
    ];

    for (let i = 0; i < ranges.length; i++) {
        const [start, end] = ranges[i];
        if (isBetween(decimalValue, start, end)) {
        return i + 1;
        }
    }

    return 0;
}


function compareSixNumbers(num1, num2, num3, num4, num5, num6, startCount = 0, endCount = 65536, funct = hexToStarDirection, multiplier = 2) {
    startCount = Math.max(startCount, 0);
    endCount = Math.min(endCount, 65536);

    let num = [num6, num5, num4, num3, num2, num1].filter(n => n.length !== 0);
    const amount = num.length;

    if (amount === 0) {
        return;
    }

    const arraySize = ((amount * multiplier) - (multiplier - 1));

    const rngWindow = Array(arraySize).fill(0);
    const tempHexList = Array(arraySize).fill(0);
    const countList = [];
    const hexList = [];

    let count = startCount;
    hits = 0;
    let hex = advanceRNG("7777", startCount);

    while (count < endCount) {
        count++;
        hex = nextHexRNG(hex);
        tempHexList.unshift(hex);
        tempHexList.pop();

        const num1 = hex.slice(0, 2);

        rngWindow.unshift(funct(num1));
        rngWindow.pop();

        const doMatch = new Array(amount).fill(false);

        for (let i = 0; i < amount; i++) {
            if (!num[i] || rngWindow[i * multiplier] === num[i]) {
                doMatch[i] = true;
            }
        }

        if (doMatch.every(match => match) && count > 6 - amount) {
            countList.push(count);
            hexList.push(tempHexList[0]);
            hits++;
        }
    }

    return [hexList, countList, amount];
}

function NumpadToStarDirection(num) {
    const directionMap = {
        1: 6,
        2: 5,
        3: 4,
        4: 7,
        6: 3,
        7: 8,
        8: 1,
        9: 2
    };

    return directionMap[num] || 0;
}

function StarDirectionToArrow(num) {
    const arrowMap = {
        1: "↑",
        2: "↗",
        3: "→",
        4: "↘",
        5: "↓",
        6: "↙",
        7: "←",
        8: "↖"
    };

    return arrowMap[num] || "";
}

function NumpadToArrow(num) {
    const arrowMap = {
        8: "↑",
        9: "↗",
        6: "→",
        3: "↘",
        2: "↓",
        1: "↙",
        4: "←",
        7: "↖"
    };

    return arrowMap[num] || "";
}

function willWhaleBall(count) {
    var rng2HexFull = countToHex(count + 2);
    var rng5HexFull = countToHex(count + 5);
    var rng2Dec = hexToDecimal(rng2HexFull.slice(0, 2));
    var rng5Dec = hexToDecimal(rng5HexFull.slice(0, 2));

    var addThisDec = rng2Dec & 8;
    var newDec = rng5Dec & 3;
    var finalDec = (newDec * 2) + addThisDec;

    return (finalDec === 0 || finalDec === 4 || finalDec === 6 || finalDec === 12);
}


//Battle Windows

function battleWindowsAttackFirst(startHex, enemy) {

    //Enemy List:
    //0 : Slime
    //1 : Puppet
    //2 : Magician
    //3 : Dark Knight
    //4 : Red Dragon
    //5 : Red Dragon Turn 2 (Shield)

    //console.log("attacks first function hex: " + startHex);

    const attacksFirstNumber = advanceRngAndSlice(startHex, 1);

    //console.log("attacksFirstNumber: " + attacksFirstNumber);

    switch (enemy) {
        case 0:
        case 2:
            low = 64;
            high = 127;
            break;
        case 1:
        case 3:
            low = 128;
            high = 191;
            break;
        case 4:
            low = 192;
            high = 255;
            break;
        case 5:
            return (!isBetween(attacksFirstNumber, 154, 179) && !isBetween(attacksFirstNumber, 231, 255));
        case 6:
            return (!isBetween(attacksFirstNumber, 0, 25) && !isBetween(attacksFirstNumber, 77, 102));
        default:
            low = 0;
            high = 255;
            break;
    }
    return isBetween(attacksFirstNumber, low, high);
}

function battleWindowsPowers(startHex) {

    let rightPowerAppearance = false;
    let leftPowerAppearance = false;
    var leftPowerModifier = 1;
    var finalRNG = 0;

    //console.log("startHex: " + advanceRngAndSlice(startHex, 0));

    //find if right powerup shows up
    let rightPowerAppearanceNumber = advanceRngAndSlice(startHex, 0);
    if (isBetween(rightPowerAppearanceNumber, 64, 127)) {
        rightPowerAppearance = true;
        leftPowerModifier = 3;
    }
    //console.log("rightPowerAppearanceNumber: " + rightPowerAppearanceNumber);
    //console.log("rightPowerAppearance: " + rightPowerAppearance);

    //find if left powerup shows up
    let leftPowerAppearanceNumber = advanceRngAndSlice(startHex, leftPowerModifier);
    if (isBetween(leftPowerAppearanceNumber, 128, 191))
        leftPowerAppearance = true;

    //console.log("leftPowerAppearanceNumber: " + leftPowerAppearanceNumber);
    //console.log("leftPowerAppearance: " + leftPowerAppearance);

    //calculate right side
    if (rightPowerAppearance == true) {
        rightPower = determinePowerType(startHex, 0);
        finalRNG += 2;
    }
    else {
        rightPower = "None";
    }

    //console.log("rightPower: " + rightPower);

    //calculate left side
    if (leftPowerAppearance == true) {
        leftPower = determinePowerType(startHex, leftPowerModifier);
        finalRNG += 2;
    }
    else {
        leftPower = "None";
    }

    //console.log("leftPower: " + leftPower);

    //calculations for if both powers are the same
    if (finalRNG == 4) {
        var repeats = -1;
        while ((leftPower == rightPower)) {
            leftPowerAppearanceNumber = advanceRngAndSlice(startHex, 6 + (repeats * 3));
            if (isBetween(leftPowerAppearanceNumber, 128, 191)) {
                finalRNG += 3;
                repeats += 1;
                leftPower = determinePowerType(startHex, 6 + (repeats * 3));
                //console.log("new leftPower: " + leftPower);
            }
            else {
                finalRNG += 1;
                leftPower = "None";
            }
        }
        //console.log("new leftPower: " + leftPower);
    }

    finalRNG += 1;

    return [leftPower, rightPower, finalRNG, repeats];
}

function determinePowerType (startHex, modifier) {
    determinePowerPool = advanceRngAndSlice(startHex, 1 + modifier);
    //console.log("determinePowerPool: " + determinePowerPool);
    powerNumber = advanceRngAndSlice(startHex, 2 + modifier);
    //console.log("powerNumber: " + powerNumber);
    return battleWindowsPowerSelect(determinePowerPool, powerNumber);
}

function battleWindowsPowerSelect(determinePowerPool, powerNumber) {
    const pools = [
        ["Fighter", "Plasma", "Hammer", "Beam", "Bomb", "Sword", "Hammer", "Bomb", "Plasma", "Sword", "Beam", "Fighter"],
        ["Stone", "Cutter", "Wheel", "Jet", "Ice", "Parasol", "Fire", "Suplex", "Ninja", "Yo-yo", "Mirror", "Wing"]
    ];
    let poolIndex = 1;
    if ((isBetween(determinePowerPool, 0, 63) || isBetween(determinePowerPool, 128, 191))) {
        poolIndex = 0;
    }
    return pools[poolIndex][mapPowerNumber(powerNumber)];

    function mapPowerNumber(powerNumber) {
        const ranges = [0, 22, 43, 64, 86, 107, 128, 149, 171, 192, 214, 234, 255];
        for (let i = 0; i < ranges.length - 1; i++) {
            if (isBetween(powerNumber, ranges[i], ranges[i + 1] - 1)) {
                return i;
            }
        }
        return -1;
    }
}

function advanceRngAndSlice(hex, number) {
    return hexToDecimal((advanceRNG(hex, (number))).slice(0, 2));
}

function easyPredictionRTA (startHex, enemy, subgame, twoDashOnHammerThrow, minDashes) {

    var subgameModifier = subgame * 2;

    //console.log("Your starting Hex is: " + startHex);
    //console.log("Your starting RNG count is: " + hexToCount(startHex));

    var firstAttackResults = ["Do Nothing", 0]; //initialize first attack results array

    //calculate if enemy goes first
    if (battleWindowsAttackFirst(startHex, enemy + subgameModifier))
        firstAttackResults = battleWindowsKirbyActions(startHex, enemy, 0, subgame, minDashes);

    var message = firstAttackResults[0]; //message that is sent at the end
    var advances = firstAttackResults[1] + 1; //+1 first turn check
    var powers = battleWindowsPowers(advanceRNG(startHex, advances + 1));

    var leftPower = powers[0]; //what left power is 
    var rightPower = powers[1]; //what right power is
    advances += powers[2] + 1;  //how much RNG advances due to powers appearing, +1 for hit check

    //console.log("After powers appear: " +  advanceRngAndSlice(startHex, advances));

    advances += 12; //hammer smoke

    //console.log("hit check 1: " + advanceRngAndSlice(startHex, advances + 1));

    if (advanceRngAndSlice(startHex, advances + 1) < 64) //First battle windows hit
        advances += 10;
    else
        advances += 1;

    advances += 2;  //hammer smoke

    //Anything after this is stuff after the first hit (which varies across Windows enemies)

    if (subgame == 0) { //All GCO
        if (advanceRngAndSlice(startHex, advances + 1) < 64)
            advances += 10; //Hard hit
        else
            advances += 1;
    }
    else {
        if (enemy == 1) { //Knight 
            advances += twoDashOnHammerThrow;

            //console.log("twodashonhammer: " + twoDashOnHammerThrow);

            if (advanceRngAndSlice(startHex, advances + 1) < 64)
                advances += 10; //Hard hit
            else
                advances += 1;

            if (advanceRngAndSlice(startHex, advances + 1) < 64)
                advances += 10; //Hard hit
            else
                advances += 1;
        }
        else if (enemy == 2) { //Dragon
            advances += 12; //hammer charge

            if (advanceRngAndSlice(startHex, advances + 1) < 64) //Second dragon hit
                advances += 10;
            else
                advances += 1;
    
        advances += 2;  //hammer clouds
        }
    }
    
    var finalHex = advanceRNG(startHex, advances);
    //console.log("Ending: " +  advanceRngAndSlice(finalHex, 0));
    
    return new Promise(resolve => setTimeout(resolve, 0, [message, advances, leftPower, rightPower, finalHex]));
}

function slimePredictionRTA(startHex, minDashes) {

    //Keep in mind that the last frame is not going to be accurate so I will have to develop a check
    //for this eventually!!
    //Last frame affects power spawns and strong hits (I think just the final one but double check)
    //In addition to this, duplicate stars is also an issue I will need to combat at some point
    //It's gonna be foon

    //console.log("Your starting Hex is: " + startHex);
    //console.log("Your starting RNG count is: " + hexToCount(startHex));

    var firstAttack = false;
    var firstAttackResults = ["Do Nothing", 0]; //initialize first attack results array
    var hitCheckAdvance = 0; //initialize variable for if kirby gets a strong hit

    //calculate if Slime goes first
    if (battleWindowsAttackFirst(startHex, 0) || battleWindowsAttackFirst(advanceRNG(startHex, 2), 0))
        firstAttack = true; //0 = enemy type
    
    //console.log("Set first attack to: " + firstAttack);

    //If Slime attacks first, find the next RNG number where he will not attack first
    //Else, do nothing
    if (firstAttack)
        firstAttackResults = battleWindowsKirbyActions(startHex, 0, 1, 0, minDashes);

    //first fire cloud from hammer... +2 advances
    var advances = 2;

    //console.log("firstAttack: " + firstAttack);
    //console.log("firstAttack Number: " + advanceRngAndSlice(startHex, advances));

    //console.log("firstAttackResults: " + firstAttackResults[1]);

    advances += firstAttackResults[1] + 12; //RNG advance for rest of hammer fire clouds +10, +1 for first turn check, +1 for hit check, + manual RNG advancements

    if (advanceRngAndSlice(startHex, advances) < 64)
        hitCheckAdvance = 9; //we need to assign this to a variable because the RNG needs to be advanced AFTER power check
        //7 for the hit during power spawns, +2 for individual advances after

    //Power check calculation
    var powers = battleWindowsPowers(advanceRNG(startHex, advances + 1));

    var message = firstAttackResults[0]; //message that is sent at the end
    advances += 1; //advance 1 RNG for hit check
    //console.log("before powerup calculations: " + advanceRngAndSlice(startHex, advances));
    //console.log("advances: " + advances)

    var leftPower = powers[0]; //what left power is 
    var rightPower = powers[1]; //what right power is
    advances += powers[2];  //how much RNG advances due to powers appearing

    //console.log("advances: " + advances);

    //console.log("After powers appear: " +  advanceRngAndSlice(startHex, advances));

    advances += hitCheckAdvance; //Apply hit check RNG

    //Rest of the code is for calculating the ending so we can then find Puppet RNG...

    //console.log("First slime hit: " +  advanceRngAndSlice(startHex, advances));

    if (advanceRngAndSlice(startHex, advances + 1) < 64) //weak hit or strong hit...
        advances += 12; //advance 8 + 4 at end
    else
        advances += 3; //advance 1 + 2 at end


    //console.log("Ending: " +  advanceRngAndSlice(startHex, advances));

    var finalHex = advanceRNG(startHex, advances);

    return [message, advances, leftPower, rightPower, finalHex];
}


function hardPredictionRTA(startHex, enemy, subgame, twoDashOnHammerThrow, minDashes) {

    var subgameModifier = subgame * 2;

    //console.log("Your starting Hex is: " + startHex);
    //console.log("Your starting RNG count is: " + hexToCount(startHex));

    var firstAttack = false;
    var firstAttackResults = ["Do Nothing", 0]; //initialize first attack results array
    var hitCheckAdvance = 0; //initialize variable for if kirby gets a strong hit

    //first fire clouds from hammer... +8 advances
    if (enemy == 2) {
        var advances = 6;
    }
    else {
        var advances = 8;
    }

    //calculate if Puppet goes first
    if (battleWindowsAttackFirst(advanceRNG(startHex, advances), enemy + subgameModifier) || battleWindowsAttackFirst(advanceRNG(startHex, advances + 2), enemy + subgameModifier))
        firstAttack = true; //1 = enemy type
    
    //console.log("Set first attack to: " + firstAttack);

    //If Puppet attacks first, find the next RNG number where he will not attack first
    //Else, do nothing
    if (firstAttack) 
        firstAttackResults = battleWindowsKirbyActions(advanceRNG(startHex, advances), enemy, 1, subgame, minDashes);

    //console.log("firstAttack: " + firstAttack);
    //console.log("firstAttack Number: " + advanceRngAndSlice(startHex, advances));

    //console.log("firstAttackResults: " + firstAttackResults[1]);

    var message = firstAttackResults[0]; //message that is sent at the end
    advances += firstAttackResults[1]; 

    if (enemy == 2) { //+2 or +4 for hammer advance, +1 for first turn check, +1 for hit check, + manual RNG advancements
        advances += 8;
    }
    else {
        advances += 6;
    }

    //console.log("before powerup calculations: " + advanceRngAndSlice(startHex, advances));
    //console.log("advances: " + advances)

    if (advanceRngAndSlice(startHex, advances) < 64)
        hitCheckAdvance = 9; //we need to assign this to a variable because the RNG needs to be advanced AFTER power check
        //7 for the hit during power spawns, +2 for individual advances after

    //Power check calculation
    var powers = battleWindowsPowers(advanceRNG(startHex, advances + 1));

    var leftPower = powers[0]; //what left power is 
    var rightPower = powers[1]; //what right power is
    advances += powers[2] + hitCheckAdvance + 3;  //how much RNG advances due to powers appearing, +1 hit check, +1 power check, +2 dust clouds

    //console.log("advances: " + advances);
    //console.log("After powers appear: " +  advanceRngAndSlice(startHex, advances));

    //Anything after this is stuff after the first hit (which varies across Windows enemies)

    if (subgame == 0) {
        if (advanceRngAndSlice(startHex, advances + 1) < 64)
            advances += 10; //Hard hit
        else
            advances += 1;
    }
    else {
        if (enemy == 1) {
            advances += twoDashOnHammerThrow

            if (advanceRngAndSlice(startHex, advances + 1) < 64)
                advances += 10; //Hard hit
            else
                advances += 1;

            if (advanceRngAndSlice(startHex, advances + 1) < 64)
                advances += 10; //Hard hit
            else
                advances += 1;
        }
        else if (enemy == 2) {
            advances += 12; //hammer charge

            if (advanceRngAndSlice(startHex, advances + 1) < 64) //First battle windows hit
                advances += 10;
            else
                advances += 1;
    
        advances += 2;  //hammer clouds
        }
    }
    
    var finalHex = advanceRNG(startHex, advances);
    //console.log("Ending: " +  advanceRngAndSlice(finalHex, 0));
    
    return new Promise(resolve => setTimeout(resolve, 0, [message, advances, leftPower, rightPower, finalHex]));
}

function dragonSecondTurn(startHex, minDashes) {
    if (!battleWindowsAttackFirst(startHex, 5))
        return ["Do Nothing", 0];
    else
        var results = battleWindowsKirbyActions(startHex, 3, 0, 1, minDashes);
        return [results[0], results[2]];
}

function battleWindowsKirbyActions(startHex, enemy, difficulty, subgame, minDashes) {

    /*
    * This function is laid out in this way because preferably, we do not want to do more than two dashes before the boss spawns (it is inconvenient)
    * First, we check if RNG is good if Kirby dashes once, twice, or three times
    * If the RNG check fails, we test if RNG is good if Kirby does a hammer swing (which advances RNG 14 times)
    * If this check fails, we will resort to dashing in place however many times to get good RNG, which is not the best outcome but will be defaulted
      to if there is no other possible scenario

    * There are two checks in place because of how Hammer RNG influences the first turn
    * Slime has a four frame window. In the first two frames, the hammer cloud comes first, which means
      that the RNG that Slime will use is after the cloud.
    ** (Keep in mind we also run into the issue on the last frame that power-ups use a different number)
    * However, in the last two frames, Slime will choose its turn first.
    * Puppet has a six frame window. The first two frames are different from the last four.
    * Since this window is so small, it is best to check both circumstances and have Kirby act from both results.
    */

    switch (subgame) {
        case 0:
            //-------------Great Cave Offensive-------------------
            switch (difficulty) {

                //Easy difficulty 
                case 0:  
                    switch (enemy) {
                        case 0:
                            /*
                            For Slime, the only actions we can perform are dashes because there is not enough time to do anything
                            else. In additon, we cannot jump because of Wheelie, so the only thing we can do unfortunately is dash.
                            */
                           /*
                            if (battleWindowsAttackFirst(advanceRNG(startHex, 9), enemy) == false) {
                                //console.log("Leaving battle windows function with value: " + advanceRngAndSlice(startHex, i));
                                return ["Slide", 9];
                            }
                            */
                            for (var i = 1; i < 7; i++) { 
                                if (minDashes == '2' && i == 1) {
                                    i++;
                                }
                                if (battleWindowsAttackFirst(advanceRNG(startHex, i), enemy) == false) { //Kirby will dash i number of times
                                    //console.log("Leaving battle windows function with value: " + advanceRngAndSlice(startHex, i));
                                    return [(i) + " dash", i];
                                }
                            }
                            return "NG"; //RNG should be totally fine by 10 checks, but this is a failsafe in case it happens
                        case 1:
                        case 2: 
                            /*
                            For Puppet and Magician, we now have the time to perform actions other than dashing.
                            However, Wheelie makes this problematic, so we only include the up+b hammer attack.
                            */
                           /*
                            if (battleWindowsAttackFirst(advanceRNG(startHex, 9), enemy) == false) {
                                //console.log("Leaving battle windows function with value: " + advanceRngAndSlice(startHex, i));
                                return ["Slide", 9];
                            }
                            */
                            if (battleWindowsAttackFirst(advanceRNG(startHex, 14), enemy) == false) { //one up+y
                                //console.log("Leaving battle windows function with value: " + advanceRngAndSlice(startHex, i));
                                return ["up+y", 14];
                            }
                            for (var i = 1; i < 3; i++) { 
                                if (minDashes == '2' && i == 1) {
                                    i++;
                                }
                                if (battleWindowsAttackFirst(advanceRNG(startHex, i), enemy) == false) {
                                    //console.log("Leaving battle windows function with value: " + advanceRngAndSlice(startHex, i));
                                    return [(i) + " dash", i];
                                }
                            }
                            for (var i = 15; i < 17; i++) {
                                if (minDashes == '2' && i == 15) {
                                    i++;
                                }
                                if (battleWindowsAttackFirst(advanceRNG(startHex, i), enemy) == false) {
                                    //console.log("Leaving battle windows function with value: " + advanceRngAndSlice(startHex, i));
                                    return ["up+b & " + ((i - 13)) + " dash", i + 1];
                                }
                            }
                            for (var i = 3; i < 7; i++) { 
                                if (battleWindowsAttackFirst(advanceRNG(startHex, i), enemy) == false) {
                                    //console.log("Leaving battle windows function with value: " + advanceRngAndSlice(startHex, i));
                                    return [(i) + " dash", i];
                                }
                            }
                            return "NG";
                        default:
                            return "NG";
                    }

                //Hard difficulty 
                case 1:  
                    switch (enemy) {
                        case 0:
                            /*
                            For Slime, the only actions we can perform are dashes because there is not enough time to do anything
                            else. In additon, we cannot jump because of Wheelie, so the only thing we can do unfortunately is dash.
                            */
                            for (var i = 1; i < 10; i++) { 
                                if (minDashes == '2' && i == 1) {
                                    i++;
                                }
                                if ((battleWindowsAttackFirst(advanceRNG(startHex, i), enemy) == false) && (battleWindowsAttackFirst(advanceRNG(startHex, i + 2), enemy) == false)) { //Kirby will dash i number of times
                                    //console.log("Leaving battle windows function with value: " + advanceRngAndSlice(startHex, i));
                                    return [(i) + " dash", i];
                                }
                            }
                            return "NG"; //RNG should be totally fine by 10 checks, but this is a failsafe in case it happens
                        case 1:
                        case 2:
                            /*
                            For Puppet and Magician, we now have the time to perform actions other than dashing.
                            However, Wheelie makes this problematic, so we only include the up+b hammer attack.
                            */
                            for (var i = 1; i < 3; i++) { 
                                if (minDashes == '2' && i == 1) {
                                    i++;
                                }
                                if ((battleWindowsAttackFirst(advanceRNG(startHex, i), enemy) == false) && (battleWindowsAttackFirst(advanceRNG(startHex, i + 2), enemy) == false)) {
                                    //console.log("Leaving battle windows function with value: " + advanceRngAndSlice(startHex, i));
                                    return [(i) + " dash", i];
                                }
                            }
                            for (var i = 13; i < 16; i++) {
                                if (minDashes == '2' && i == 14) {
                                    i++;
                                }
                                if ((battleWindowsAttackFirst(advanceRNG(startHex, i), enemy) == false) && (battleWindowsAttackFirst(advanceRNG(startHex, i + 2), enemy) == false)) {
                                    //console.log("Leaving battle windows function with value: " + advanceRngAndSlice(startHex, i));
                                    return ["up+y & " + ((i - 13)) + " dash", i];
                                }
                            }
                            for (var i = 3; i < 10; i++) { 
                                if ((battleWindowsAttackFirst(advanceRNG(startHex, i), enemy) == false) && (battleWindowsAttackFirst(advanceRNG(startHex, i + 2), enemy) == false)) {
                                    //console.log("Leaving battle windows function with value: " + advanceRngAndSlice(startHex, i));
                                    return [(i) + " dash", i];
                                }
                            }
                            return "NG";
                        default:
                            return "NG";
                }

                default:
                        return "NG";
            }

        //----------------Milky Way Wishes--------------------
        case 1:
            switch (difficulty) {
                //Easy
                case 0:
                    //console.log("enemy: " + enemy);
                    //All enemies follow the same pattern
                    for (var j = 0; j < 2; j++) { //if it loops a second time, it goes for stars instead of shield
                        //console.log("j:" + j);
                        //console.log("checking slide");
                        if (battleWindowsAttackFirst(advanceRNG(startHex, 6), (enemy + 2 + j)) == false) { //one slide
                            //console.log("Leaving battle windows function with value: " + advanceRngAndSlice(startHex, i));
                            return ["Slide", 6, j];
                        }
                        //console.log("checking hammer");
                        if (enemy != 0) {
                            if (battleWindowsAttackFirst(advanceRNG(startHex, 14), (enemy + 2 + j)) == false) { //one up+y
                                //console.log("Leaving battle windows function with value: " + advanceRngAndSlice(startHex, i));
                                return ["up+y", 14, j];
                            }
                        }
                        //console.log("checking dash");
                        for (var i = 1; i < 2; i++) { 
                            if (minDashes == '2' && i == 1) {
                                i++;
                            }
                            if (battleWindowsAttackFirst(advanceRNG(startHex, i), (enemy + 2 + j)) == false) { //dashes
                                //console.log("Leaving battle windows function with value: " + advanceRngAndSlice(startHex, i));
                                return [(i) + " dash", i, j];
                            }
                        }
                        //console.log("checking slide + dash");
                        for (var i = 7; i < 9; i++) { 
                            if (minDashes == '2' && i == 7) {
                                i++;
                            }
                            if (battleWindowsAttackFirst(advanceRNG(startHex, i), (enemy + 2 + j)) == false) { //slide + dashes
                                //console.log("Leaving battle windows function with value: " + advanceRngAndSlice(startHex, i));
                                return ["Slide & " + (i - 6) + " dash", i, j];
                            }
                        }
                        if (enemy < 3) {
                            j = 3;
                        }
                    }

                    for (var j = 0; j < 2; j++) {
                        //console.log("checking hammer + dash");
                        if (enemy != 0) {
                            for (var i = 15; i < 17; i++) { 
                                if (minDashes == '2' && i == 15) {
                                    i++;
                                }
                                if (battleWindowsAttackFirst(advanceRNG(startHex, i), enemy + 2 + j) == false) { //up+y + dashes
                                    //console.log("Leaving battle windows function with value: " + advanceRngAndSlice(startHex, i));
                                    return ["up+y & " + (i - 14) + " dash", i, j];
                                }
                            }
                        }
                        //console.log("checking dash");
                        for (var i = 2; i < 10; i++) { 
                            if (battleWindowsAttackFirst(advanceRNG(startHex, i), enemy + 2 + j) == false) { //rest is dashes
                                //console.log("Leaving battle windows function with value: " + advanceRngAndSlice(startHex, i));
                                return [(i) + " dash", i, j];
                            }
                        }
                        if (enemy < 3) {
                            j = 3;
                        }
                    }
                    
                    return "NG";
                    
                //Hard
                case 1:
                    //console.log("enemy: " + enemy);
                    //All enemies follow the same pattern
                        //console.log("checking slide");
                        if ((battleWindowsAttackFirst(advanceRNG(startHex, 6), (enemy + 2)) == false) && (battleWindowsAttackFirst(advanceRNG(startHex, 8), (enemy + 2)) == false)) { //one slide
                            //console.log("Leaving battle windows function with value: " + advanceRngAndSlice(startHex, i));
                            return ["Slide", 6, j];
                        }
                        //console.log("checking hammer");
                        if (enemy != 0) {
                            if ((battleWindowsAttackFirst(advanceRNG(startHex, 14), (enemy + 2)) == false) && (battleWindowsAttackFirst(advanceRNG(startHex, 16), (enemy + 2)) == false)) { //one up+y
                                //console.log("Leaving battle windows function with value: " + advanceRngAndSlice(startHex, i));
                                return ["up+y", 14, j];
                            }
                        }
                        //console.log("checking dash");
                        for (var i = 1; i < 2; i++) { 
                            if (minDashes == '2' && i == 1) {
                                i++;
                            }
                            if ((battleWindowsAttackFirst(advanceRNG(startHex, i), (enemy + 2)) == false) && (battleWindowsAttackFirst(advanceRNG(startHex, i + 2), (enemy + 2)) == false)){ //dashes
                                //console.log("Leaving battle windows function with value: " + advanceRngAndSlice(startHex, i));
                                return [(i) + " dash", i, j];
                            }
                        }
                        //console.log("checking slide + dash");
                        for (var i = 7; i < 9; i++) { 
                            if (minDashes == '2' && i == 7) {
                                i++;
                            }
                            if ((battleWindowsAttackFirst(advanceRNG(startHex, i), (enemy + 2)) == false) && (battleWindowsAttackFirst(advanceRNG(startHex, i + 2), (enemy + 2)) == false)) { //slide + dashes
                                //console.log("Leaving battle windows function with value: " + advanceRngAndSlice(startHex, i));
                                return ["Slide & " + (i - 6) + " dash", i, j];
                            }
                        }
                        //console.log("checking hammer + dash");
                        if (enemy != 0) {
                            for (var i = 15; i < 17; i++) { 
                                if (minDashes == '2' && i == 15) {
                                    i++;
                                }
                                if ((battleWindowsAttackFirst(advanceRNG(startHex, i), (enemy + 2)) == false) && (battleWindowsAttackFirst(advanceRNG(startHex, i + 2), (enemy + 2)) == false)) { //up+y + dashes
                                    //console.log("Leaving battle windows function with value: " + advanceRngAndSlice(startHex, i));
                                    return ["up+y & " + (i - 14) + " dash", i, j];
                                }
                            }
                        }
                        //console.log("checking dash");
                        for (var i = 2; i < 10; i++) { 
                            if ((battleWindowsAttackFirst(advanceRNG(startHex, i), (enemy + 2)) == false) && (battleWindowsAttackFirst(advanceRNG(startHex, i + 2), (enemy + 2)) == false)) { //rest is dashes
                                //console.log("Leaving battle windows function with value: " + advanceRngAndSlice(startHex, i));
                                return [(i) + " dash", i, j];
                            }
                        }
                default:
                    return "NG";
                }
        default:
            return "NG";
    }
}

//welcome to spaghetti land

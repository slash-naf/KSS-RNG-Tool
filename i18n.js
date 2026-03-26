// i18n.js - Language switching module

const translations = {
    en: {
        // Common navigation
        nav: {
            mainPage: 'Main Page',
            tools: 'Tools',
            manual: 'Manual',
        },

        // rta_manipulator.html
        title: 'KSS RNG Manipulation RTA',
        subgame: 'Subgame: ',
        gco: 'Great Cave Offensive',
        mww: 'Milky Way Wishes',
        min: 'Min: ',
        max: 'Max: ',
        fillDefaults: 'Fill Defaults',
        stars: 'Stars: ',
        numpadHint: 'numpad: input - enter: reset - backspace: go back',
        pressNumpad: 'Press on Numpad to start',
        settings: 'Settings:',
        lowestDash: 'Lowest dash number for:',
        generalManip: 'General manipulation:',
        knightHammer: 'Knight hammer throw:',
        noNumpad: 'No Numpad:',
        techInfo: 'Technical Information:',
        results: 'Results:',
        notInRange: 'Not in Range.',
        warning: 'Warning: ',
        possibleRng: ' possible RNG points in this range!',
        predictedCount: 'Predicted RNG count: ',
        viewingCount: 'Viewing count ',
        allPossibleCounts: 'All possible counts:',
        inputMinMax: 'Please input values into the min and max boxes.',
        inputIntegers: 'Please only input integers.',
        advances: 'Advances: ',
        endingValue: 'Ending Value: ',

        // Enemy names
        enemy: {
            // GCO
            slime: 'Slime: ',
            puppet: 'Puppet: ',
            magician: 'Magician: ',
            // MWW
            magicianMww: 'Magician: ',
            knight: 'Knight: ',
            dragon: 'Dragon: ',
        },

        // rta_tools.html
        toolsTitle: 'KSS RNG Tools',
        findCount: 'Find RNG Count:',
        findDuplicate: 'Find duplicate RNG points in range:',
        largeRangeNote: 'Note: Large ranges and star amounts may take a long time.',
        find: 'Find',
        predictedRngCount: '- Predicted RNG Count: ',
        countBeforeJumping: '- Count Before Jumping: ',
        hexAfterJumps: '- Hex (After Jumps): ',
        decimalAfterJumps: '- Decimal (After Jumps): ',
        notValidCombo: 'Not a valid star combination.',
        amount: 'Amount',
        directions: 'Directions',
        hexes: 'Hexes',
        decimals: 'Decimals',
        counts: 'Counts',
        duplicateSets: 'Duplicate sets: ',
        chanceOfDuplicate: 'Chance of duplicate: ',
        noRepeating: 'No repeating values!',

        // rta_manual.html
        manual: {
            title: 'RTA RNG Manipulator Manual',
            whatIsThis: 'What is this?',
            reportBug: 'Report a Bug',
            aboutRng: 'About RNG',
            introduction: 'Introduction',
            rngCount: 'RNG "Count"',
            findingCount: 'Finding Count',
            setup: 'Setup',
            rngOverview: 'RNG Program Overview',
            whyRange: 'Why do we need to find our own range?',
            findingRange: 'Finding Count Range',
            usingCalc: 'Using the Calculator',
            fastMode: '"Fast" Mode Information',
            execution: 'Execution',
            darkKnight: 'Dark Knight',
            redDragon: 'Red Dragon',
            jpGuide: '日本語ガイド',
        },
    },
    ja: {
        // Common navigation
        nav: {
            mainPage: 'Main Page',
            tools: 'Tools',
            manual: 'Manual',
        },

        // rta_manipulator.html
        title: 'KSS RNG Manipulation RTA',
        subgame: 'ゲームモード: ',
        gco: '洞窟大作戦',
        mww: '銀河にねがいを',
        min: '最小: ',
        max: '最大: ',
        fillDefaults: 'デフォルト値を入力',
        stars: '星の回数: ',
        numpadHint: 'テンキー: 入力 - Enter: リセット - Backspace: 戻る',
        pressNumpad: 'テンキーを押して開始',
        settings: '設定:',
        lowestDash: 'ダッシュの最小回数:',
        generalManip: '通常操作:',
        knightHammer: 'あくまのきしのハンマー投げ:',
        noNumpad: 'テンキーなし:',
        techInfo: '技術情報:',
        results: '結果:',
        notInRange: '範囲外です。',
        warning: '警告: ',
        possibleRng: '通りの予測乱数位置があります。',
        predictedCount: '予測乱数位置: ',
        viewingCount: '表示中の乱数位置 ',
        allPossibleCounts: '乱数位置候補一覧:',
        inputMinMax: '最小・最大の欄に値を入力してください。',
        inputIntegers: '整数のみ入力してください。',
        advances: '消費回数: ',
        endingValue: '終了値: ',

        // Enemy names
        enemy: {
            // GCO
            slime: 'スライム: ',
            puppet: 'おどりにんぎょう: ',
            magician: 'まほうつかい: ',
            // MWW
            magicianMww: 'まほうつかい: ',
            knight: 'あくまのきし: ',
            dragon: 'レッドドラゴン: ',
        },

        // rta_tools.html
        toolsTitle: 'KSS RNG Tools',
        findCount: '乱数位置を検索:',
        findDuplicate: '範囲内の重複乱数位置を検索:',
        largeRangeNote: '範囲や星の回数が多すぎると時間がかかります。',
        find: '検索',
        predictedRngCount: '- 予測乱数位置: ',
        countBeforeJumping: '- ジャンプ前の乱数位置: ',
        hexAfterJumps: '- 16進数 (ジャンプ後): ',
        decimalAfterJumps: '- 10進数 (ジャンプ後): ',
        notValidCombo: '一致する乱数位置は見つかりませんでした。',
        amount: '重複数',
        directions: '星の向き',
        hexes: '16進数',
        decimals: '10進数',
        counts: '乱数位置',
        duplicateSets: '重複セット数: ',
        chanceOfDuplicate: '重複確率: ',
        noRepeating: '重複値なし！',

        // rta_manual.html
        manual: {
            title: 'RTA RNG Manipulator Manual',
            whatIsThis: 'このツールについて',
            reportBug: 'バグ報告',
            aboutRng: '乱数について',
            introduction: 'はじめに',
            rngCount: '乱数位置',
            findingCount: '乱数位置の特定',
            setup: 'セットアップ',
            rngOverview: '乱数調整ツールの概要',
            whyRange: 'なぜ自分専用の範囲を調べる必要があるのか',
            findingRange: '乱数範囲の探し方',
            usingCalc: '乱数調整ツールの使い方',
            fastMode: 'Fastモードについて',
            execution: '実行方法',
            darkKnight: 'あくまのきし',
            redDragon: 'レッドドラゴン',
            jpGuide: '日本語ガイド',
        },
    }
};

// t is a global object pointing to the current language's translations
var t = translations.en;

const i18n = {
    translateAction(text) {
        if (!text) return text;
        if (this.getCurrentLanguage() === 'en') return text;
        let res = String(text);
        res = res.replace("Do Nothing", "何もしない");
        res = res.replace("Slide", "スライディング");
        res = res.replace("up+y", "鬼殺し");
        res = res.replace(/(\d+) dash/g, "ダッシュ$1回");
        return res;
    },

    getCurrentLanguage() {
        return localStorage.getItem('kss-rng-lang') || 'en';
    },

    setLanguage(lang) {
        localStorage.setItem('kss-rng-lang', lang);
        t = translations[lang];
        this._applyTranslations();
        this._applyLangSections(lang);
        this._updateLangSelect(lang);
    },

    // Resolve a dot-notation path on the t object (for data-i18n attributes)
    _resolve(path) {
        return path.split('.').reduce((obj, key) => obj?.[key], t);
    },

    _applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const text = this._resolve(key);
            if (text !== undefined) {
                el.textContent = text;
            }
        });
    },

    _applyLangSections(lang) {
        document.querySelectorAll('.lang-en').forEach(el => {
            el.style.display = lang === 'en' ? '' : 'none';
        });
        document.querySelectorAll('.lang-ja').forEach(el => {
            el.style.display = lang === 'ja' ? '' : 'none';
        });
    },

    _updateLangSelect(lang) {
        const sel = document.getElementById('lang-select');
        if (sel) sel.value = lang;
    },

    init() {
        const lang = this.getCurrentLanguage();
        t = translations[lang];
        this._applyTranslations();
        this._applyLangSections(lang);
        this._updateLangSelect(lang);
    }
};

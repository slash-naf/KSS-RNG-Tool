// i18n.js - 言語切り替えモジュール

const i18n = {
    // 翻訳辞書
    translations: {
        en: {
            // 共通ナビゲーション
            'nav.mainPage': 'Main Page',
            'nav.tools': 'Tools',
            'nav.manual': 'Manual',

            // rta_manipulator.html
            'title': 'KSS RNG Manipulation RTA',
            'subgame': 'Subgame: ',
            'gco': 'Great Cave Offensive',
            'mww': 'Milky Way Wishes',
            'min': 'Min: ',
            'max': 'Max: ',
            'fillDefaults': 'Fill Defaults',
            'stars': 'Stars: ',
            'numpadHint': 'numpad: input - enter: reset - backspace: go back',
            'pressNumpad': 'Press on Numpad to start',
            'settings': 'Settings:',
            'lowestDash': 'Lowest dash number for:',
            'generalManip': 'General manipulation:',
            'knightHammer': 'Knight hammer throw:',
            'noNumpad': 'No Numpad:',
            'techInfo': 'Technical Information:',
            'results': 'Results:',
            'notInRange': 'Not in Range.',
            'warning': 'Warning: ',
            'possibleRng': ' possible RNG points in this range!',
            'predictedCount': 'Predicted RNG count: ',
            'viewingCount': 'Viewing count ',
            'allPossibleCounts': 'All possible counts:',
            'inputMinMax': 'Please input values into the min and max boxes.',
            'inputIntegers': 'Please only input integers.',
            'advances': 'Advances: ',
            'endingValue': 'Ending Value: ',

            // rta_manipulator.html - 敵名（GCO）
            'enemy.slime': 'Slime: ',
            'enemy.puppet': 'Puppet: ',
            'enemy.magician': 'Magician: ',
            // 敵名（MWW）
            'enemy.magician.mww': 'Magician: ',
            'enemy.knight': 'Knight: ',
            'enemy.dragon': 'Dragon: ',

            // rta_tools.html
            'toolsTitle': 'KSS RNG Tools',
            'findCount': 'Find RNG Count:',
            'findDuplicate': 'Find duplicate RNG points in range:',
            'largeRangeNote': 'Note: Large ranges and star amounts may take a long time.',
            'find': 'Find',
            'predictedRngCount': '- Predicted RNG Count: ',
            'countBeforeJumping': '- Count Before Jumping: ',
            'hexAfterJumps': '- Hex (After Jumps): ',
            'decimalAfterJumps': '- Decimal (After Jumps): ',
            'notValidCombo': 'Not a valid star combination.',
            'amount': 'Amount',
            'directions': 'Directions',
            'hexes': 'Hexes',
            'decimals': 'Decimals',
            'counts': 'Counts',
            'duplicateSets': 'Duplicate sets: ',
            'chanceOfDuplicate': 'Chance of duplicate: ',
            'noRepeating': 'No repeating values!',

            // rta_manual.html - 目次
            'toc.whatIsThis': 'What is this?',
            'toc.reportBug': 'Report a Bug',
            'toc.aboutRng': 'About RNG',
            'toc.introduction': 'Introduction',
            'toc.fastMode': 'Fast Mode',
            'toc.execution': 'Execution',
            'toc.jpGuide': '日本語ガイド',
        },
        ja: {
            // 共通ナビゲーション
            'nav.mainPage': 'メインページ',
            'nav.tools': 'ツール',
            'nav.manual': 'マニュアル',

            // rta_manipulator.html
            'title': 'KSS RNG Manipulation RTA',
            'subgame': 'ゲームモード: ',
            'gco': '洞窟大作戦',
            'mww': '銀河にねがいを',
            'min': '最小: ',
            'max': '最大: ',
            'fillDefaults': 'デフォルト値を入力',
            'stars': '星の回数: ',
            'numpadHint': 'テンキー: 入力 - Enter: リセット - Backspace: 戻る',
            'pressNumpad': 'テンキーを押して開始',
            'settings': '設定:',
            'lowestDash': 'ダッシュの最小回数:',
            'generalManip': '通常操作:',
            'knightHammer': 'あくまのきしのハンマー投げ:',
            'noNumpad': 'テンキーなし:',
            'techInfo': '技術情報:',
            'results': '結果:',
            'notInRange': '範囲外です。',
            'warning': '警告: ',
            'possibleRng': '通りの予測乱数位置があります。',
            'predictedCount': '予測乱数位置: ',
            'viewingCount': '表示中の乱数位置 ',
            'allPossibleCounts': '乱数位置候補一覧:',
            'inputMinMax': '最小・最大の欄に値を入力してください。',
            'inputIntegers': '整数のみ入力してください。',
            'advances': '消費回数: ',
            'endingValue': '終了値: ',

            // rta_manipulator.html - 敵名（GCO）
            'enemy.slime': 'スライム: ',
            'enemy.puppet': 'おどりにんぎょう: ',
            'enemy.magician': 'まほうつかい: ',
            // 敵名（MWW）
            'enemy.magician.mww': 'まほうつかい: ',
            'enemy.knight': 'あくまのきし: ',
            'enemy.dragon': 'レッドドラゴン: ',

            // rta_tools.html
            'toolsTitle': 'KSS RNG Tools',
            'findCount': '乱数位置を検索:',
            'findDuplicate': '範囲内の重複乱数位置を検索:',
            'largeRangeNote': '範囲や星の回数が多すぎると時間がかかります。',
            'find': '検索',
            'predictedRngCount': '- 予測乱数位置: ',
            'countBeforeJumping': '- ジャンプ前の乱数位置: ',
            'hexAfterJumps': '- 16進数 (ジャンプ後): ',
            'decimalAfterJumps': '- 10進数 (ジャンプ後): ',
            'notValidCombo': '一致する乱数位置は見つかりませんでした。',
            'amount': '重複数',
            'directions': '星の向き',
            'hexes': '16進数',
            'decimals': '10進数',
            'counts': '乱数位置',
            'duplicateSets': '重複セット数: ',
            'chanceOfDuplicate': '重複確率: ',
            'noRepeating': '重複値なし！',

            // rta_manual.html - 目次
            'toc.whatIsThis': 'このツールについて',
            'toc.reportBug': 'バグ報告',
            'toc.aboutRng': '乱数について',
            'toc.introduction': 'はじめに',
            'toc.fastMode': 'Fastモード',
            'toc.execution': '実行方法',
            'toc.jpGuide': '日本語ガイド',
        }
    },

    // 現在の言語を取得
    getCurrentLanguage() {
        return localStorage.getItem('kss-rng-lang') || 'en';
    },

    // 翻訳テキストを取得
    t(key) {
        const lang = this.getCurrentLanguage();
        return this.translations[lang][key] || this.translations['en'][key] || key;
    },

    // 言語を設定し、ページのテキストを更新
    setLanguage(lang) {
        localStorage.setItem('kss-rng-lang', lang);
        this._applyTranslations();
        this._applyLangSections(lang);
        this._updateLangButton(lang);
    },

    // data-i18n 属性を持つ要素のテキストを更新
    _applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const text = this.t(key);
            el.textContent = text;
        });
    },

    // lang-en / lang-ja セクションの表示切り替え（マニュアルページ用）
    _applyLangSections(lang) {
        document.querySelectorAll('.lang-en').forEach(el => {
            el.style.display = lang === 'en' ? '' : 'none';
        });
        document.querySelectorAll('.lang-ja').forEach(el => {
            el.style.display = lang === 'ja' ? '' : 'none';
        });
    },

    // 言語切り替えボタンの表示を更新
    _updateLangButton(lang) {
        const btn = document.getElementById('lang-toggle');
        if (btn) {
            btn.textContent = lang === 'en' ? '日本語' : 'English';
            btn.title = lang === 'en' ? '日本語に切り替え' : 'Switch to English';
        }
    },

    // 言語を切り替え
    toggle() {
        const current = this.getCurrentLanguage();
        this.setLanguage(current === 'en' ? 'ja' : 'en');
    },

    // ページ読み込み時の初期化
    init() {
        const lang = this.getCurrentLanguage();
        this._applyTranslations();
        this._applyLangSections(lang);
        this._updateLangButton(lang);
    }
};

// t() をグローバルに公開（各ページのスクリプトから使用）
function t(key) {
    return i18n.t(key);
}

import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';

const i18n = new I18n({
    ja: {
        appTitle: '将棋アプリ',
        gameMode: {
            pvp: '対人戦',
            ai: 'AI戦',
        },
        turn: {
            sente: '先手',
            gote: '後手',
            suffix: 'の手番',
            you: 'あなた',
            opponent: '相手',
        },
        hand: {
            sente: '先手持ち駒',
            gote: '後手持ち駒',
        },
        search: {
            depth: '深さ',
            score: '評価値',
            nodes: '探索局面数',
            time: '時間',
        },
        status: {
            thinking: 'AI思考中...',
            check: '王手！',
            checkmate: '詰み！',
        },
        result: {
            win: 'の勝ち',
            timeout: '時間切れ',
            resign: '投了',
            senteWin: '先手の勝ち',
            goteWin: '後手の勝ち',
        },
        time: {
            unlimited: '無制限',
            seconds: '秒',
        },
        buttons: {
            newGame: '新規対局',
            resign: '投了',
            rotate: '盤面反転',
            undo: '待った',
            cancel: 'キャンセル',
            ok: 'OK',
            close: '閉じる',
        },
        modals: {
            newGame: {
                title: '新規対局',
                mode: '対局モード',
                aiSide: 'あなたの手番',
                timeControl: '持ち時間',
                startPvp: '対人戦を開始',
                startAi: 'AI戦を開始',
            },
            resign: {
                title: '投了確認',
                message: 'が投了します。よろしいですか?',
                confirm: '投了する',
            },
            promote: {
                title: '成りますか？',
                yes: '成る',
                no: '成らない',
            },
            premium: {
                title: 'プレミアムプラン',
                subscribedTitle: 'プレミアム会員',
                description: 'プレミアムプランに加入すると、以下の特典が得られます：',
                subtitle: '無制限でプレイしよう！',
                thankYou: 'プレミアム版をご利用いただき\nありがとうございます！',
                benefit1: '・対局回数無制限',
                benefit2: '・広告非表示',
                benefit3: '・「待った」機能使い放題',
                features: {
                    unlimited: '無制限プレイ',
                    noAds: '広告なし',
                    allFeatures: 'すべての機能が利用可能',
                    oneTime: '買い切り（追加料金なし）',
                },
                price: {
                    label: '特別価格',
                    note: '買い切り・追加料金なし',
                },
                purchase: '今すぐ購入',
                restore: '購入を復元',
                subscribe: '登録する',
                subscribed: '登録済み',
                remaining: '残り{{count}}回',
                note: '※ 購入後、機種変更時も無料で復元できます\n※ 返金は購入後24時間以内に限り可能です',
                done: '閉じる',
                alerts: {
                    purchaseSuccess: {
                        title: '購入完了',
                        message: 'プレミアム版にアップグレードしました！\n無制限でプレイできます。',
                    },
                    purchaseError: {
                        title: 'エラー',
                        message: '購入に失敗しました。もう一度お試しください。',
                    },
                    restoreSuccess: {
                        title: '復元完了',
                        message: 'プレミアム版を復元しました！',
                    },
                    restoreError: {
                        title: 'エラー',
                        message: '復元に失敗しました。',
                    },
                    restoreNotFound: {
                        title: '情報',
                        message: '復元する購入履歴が見つかりませんでした。',
                    },
                },
            },
            playLimit: {
                title: '対局制限',
                message: '本日の無料対局回数を使い切りました。',
                upgrade: 'プレミアムに登録',
                tomorrow: 'また明日遊んでね！',
            },
            info: {
                title: 'お知らせ',
                rule: {
                    title: '独自の将棋ルール',
                    text: '本アプリでは、通常の将棋ルールに加えて以下の独自ルールを採用しています。\n新しい駒の酔象を追加。後ろ以外の周囲７マスに移動できる。\n成ると太子に成ることができる。玉と同じ動きができる。\n酔象は相手に取られると再利用できない。\nそれ以外は本将棋と同じルールにここではしています',
                    bullet1: '• プレイ回数制限（1日3回まで無料）',
                    bullet2: '• プレミアム会員は無制限プレイ可能',
                    bullet3: '• 敵陣に入った際の「成り」選択機能',
                },
                history: {
                    title: '変更履歴',
                    v1_1_0: '• UI改善：対局設定をドロップダウン形式に変更\n• お知らせ機能の追加\n• 成り選択機能の実装',
                    v1_0_0: '• アプリリリース\n• AI対局機能 おまけ程度\n• 課金機能（プレミアムプラン）の実装',
                },
            },
        },
    },
    en: {
        appTitle: 'Shogi App',
        gameMode: {
            pvp: 'PvP',
            ai: 'vs AI',
        },
        turn: {
            sente: 'Sente',
            gote: 'Gote',
            suffix: "'s Turn",
            you: 'You',
            opponent: 'Opponent',
        },
        hand: {
            sente: "Sente's Hand",
            gote: "Gote's Hand",
        },
        search: {
            depth: 'Depth',
            score: 'Score',
            nodes: 'Nodes',
            time: 'Time',
        },
        status: {
            thinking: 'AI Thinking...',
            check: 'Check!',
            checkmate: 'Checkmate!',
        },
        result: {
            win: ' Wins',
            timeout: 'Timeout',
            resign: 'Resigns',
            senteWin: 'Sente Wins',
            goteWin: 'Gote Wins',
        },
        time: {
            unlimited: 'Unlimited',
            seconds: 'sec',
        },
        buttons: {
            newGame: 'New Game',
            resign: 'Resign',
            rotate: 'Rotate',
            undo: 'Undo',
            cancel: 'Cancel',
            ok: 'OK',
            close: 'Close',
        },
        modals: {
            newGame: {
                title: 'New Game',
                mode: 'Game Mode',
                aiSide: 'Your Side',
                timeControl: 'Time Control',
                startPvp: 'Start PvP',
                startAi: 'Start vs AI',
            },
            resign: {
                title: 'Resign',
                message: 'will resign. Are you sure?',
                confirm: 'Resign',
            },
            promote: {
                title: 'Promote?',
                yes: 'Promote',
                no: 'Don\'t Promote',
            },
            premium: {
                title: 'Premium Plan',
                subscribedTitle: 'Premium Member',
                description: 'Subscribe to Premium to get:',
                subtitle: 'Play Unlimited!',
                thankYou: 'Thank you for using Premium!',
                benefit1: '・Unlimited Plays',
                benefit2: '・No Ads',
                benefit3: '・Unlimited Undo',
                features: {
                    unlimited: 'Unlimited Plays',
                    noAds: 'No Ads',
                    allFeatures: 'All Features Unlocked',
                    oneTime: 'One-time Purchase',
                },
                price: {
                    label: 'Special Price',
                    note: 'One-time purchase, no extra fees',
                },
                purchase: 'Purchase Now',
                restore: 'Restore Purchase',
                subscribe: 'Subscribe',
                subscribed: 'Subscribed',
                remaining: '{{count}} plays left',
                note: '* You can restore your purchase for free when changing devices.\n* Refunds are available within 24 hours of purchase.',
                done: 'Close',
                alerts: {
                    purchaseSuccess: {
                        title: 'Purchase Successful',
                        message: 'Upgraded to Premium!\nYou can now play unlimited games.',
                    },
                    purchaseError: {
                        title: 'Error',
                        message: 'Purchase failed. Please try again.',
                    },
                    restoreSuccess: {
                        title: 'Restore Successful',
                        message: 'Premium purchase restored!',
                    },
                    restoreError: {
                        title: 'Error',
                        message: 'Failed to restore purchase.',
                    },
                    restoreNotFound: {
                        title: 'Info',
                        message: 'No purchase history found to restore.',
                    },
                },
            },
            playLimit: {
                title: 'Play Limit Reached',
                message: 'You have used up your free plays for today.',
                upgrade: 'Upgrade to Premium',
                tomorrow: 'Come back tomorrow!',
            },
            info: {
                title: 'Information',
                rule: {
                    title: 'Unique Shogi Rules',
                    text: 'This app adopts the following unique rules in addition to standard Shogi rules.\nAdded a new piece "Drunken Elephant" (Suizo). It can move to any of the 7 surrounding squares except directly backward.\nIt can promote to "Crown Prince" (Taishi), which moves like a King.\nOnce captured, the Drunken Elephant cannot be dropped back onto the board.\nOther rules are the same as standard Shogi.',
                    bullet1: '• Play Limit (3 free plays per day)',
                    bullet2: '• Unlimited play for Premium members',
                    bullet3: '• "Promote" selection when entering enemy camp',
                },
                history: {
                    title: 'Version History',
                    v1_1_0: '• UI Improvements: Changed game settings to dropdown\n• Added Information feature\n• Implemented Promotion selection',
                    v1_0_0: '• App Release\n• AI Battle feature (Beta)\n• Premium Plan implementation',
                },
            },
        },
    },
});

i18n.enableFallback = true;
i18n.locale = getLocales()[0].languageCode ?? 'ja';
//i18n.locale = 'en';

export default i18n;

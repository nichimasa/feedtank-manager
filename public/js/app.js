// ブラウザ互換性対応
"use strict";

// Firebase設定
const firebaseConfig = {
    // ここにFirebaseコンソールからコピーした設定情報を貼り付けます
    apiKey: "AIzaSyANQNhOzWpYxDpyj7zvvI9N4GEfZOt6w7U",
    authDomain: "feedtank-manager.firebaseapp.com",
    projectId: "feedtank-manager",
    storageBucket: "feedtank-manager.firebasestorage.app",
    messagingSenderId: "845533476389",
    appId: "1:845533476389:web:c67da39b07acc3478371cc"
};

// Firebase初期化
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// タンク設定
const TANKS = [
    { id: 'A15', capacity: 5, defaultFeedType: 'growth' },
    { id: 'A16', capacity: 5, defaultFeedType: 'growth' },
    { id: 'A19', capacity: 5, defaultFeedType: 'growth' },
    { id: 'A20', capacity: 5, defaultFeedType: 'growth' },
    { id: 'A21', capacity: 5, defaultFeedType: 'growth' },
    { id: 'A22', capacity: 5, defaultFeedType: 'growth' },
    { id: 'A23', capacity: 7, defaultFeedType: 'pregnancy' },
    { id: 'A24', capacity: 7, defaultFeedType: 'pregnancy' },
    { id: 'A25', capacity: 7, defaultFeedType: 'pregnancy' },
    { id: 'A26', capacity: 7, defaultFeedType: 'pregnancy' },
    { id: 'A27', capacity: 7, defaultFeedType: 'pregnancy' },
    { id: 'A28', capacity: 7, defaultFeedType: 'pregnancy' }
];

// 餌種類の表示名とカラー
const FEED_TYPES = {
    'growth': { name: '育成期', color: '#4CAF50' },
    'pregnancy': { name: '妊娠期', color: '#2196F3' },
    'milk': { name: 'ミルク', color: '#FFC107' }
};

// 日付をYYYY-MM-DD形式に変換
function formatDate(date) {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}

// 日付文字列をDate型に変換
function parseDate(dateString) {
    return new Date(dateString);
}

// 消費量計算
function calculateConsumption(previousAmount, incomingAmount, currentAmount) {
    const consumption = previousAmount + incomingAmount - currentAmount;
    return consumption > 0 ? consumption : 0;
}

// 日付の差を日数で取得
function getDaysDifference(date1, date2) {
    const diffTime = Math.abs(date2 - date1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// エラーメッセージ表示
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    } else {
        alert(message);
    }
}

// 成功メッセージ表示
function showSuccess(message) {
    const successDiv = document.getElementById('success-message');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 3000);
    }
}

// タンクマスターのセットアップ (初回実行時)
async function setupTankMaster() {
    try {
        console.log("Setting up tank master data...");
        const batch = db.batch();
        
        // 既存のタンクマスターを取得
        const snapshot = await db.collection('tanks').get();
        if (snapshot.size === 0) {
            console.log("No tanks found, creating initial data...");
            // タンクマスターが存在しない場合、初期データを作成
            TANKS.forEach(tank => {
                const tankRef = db.collection('tanks').doc(tank.id);
                batch.set(tankRef, {
                    id: tank.id,
                    capacity: tank.capacity,
                    defaultFeedType: tank.defaultFeedType,
                    currentFeedType: tank.defaultFeedType,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
            
            await batch.commit();
            console.log('Tank master data initialized');
            
            // 画面をリロードして新しいデータを表示
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } else {
            console.log(`Found ${snapshot.size} existing tanks.`);
        }
    } catch (error) {
        console.error("Error in setupTankMaster:", error);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // 現在の日付をセット
    const today = new Date();
    const recordDateInput = document.getElementById('recordDate');
    if (recordDateInput) {
        recordDateInput.value = formatDate(today);
    }
    
    // タンク一覧の表示
    loadTanks();
    
    // フィルター処理の設定
    setupFilterHandlers();
    
    // 残量記録ボタンの処理
    const recordTodayBtn = document.getElementById('recordTodayBtn');
    if (recordTodayBtn) {
        recordTodayBtn.addEventListener('click', function() {
            window.location.href = 'tank-mass-input.html?date=' + recordDateInput.value;
        });
    }
});

// タンク一覧を読み込んで表示
async function loadTanks() {
    try {
        const tanksSnapshot = await db.collection('tanks').get();
        const tanksContainer = document.getElementById('tanksContainer');
        
        if (!tanksContainer) return;
        tanksContainer.innerHTML = '';
        
        // アラートエリアをクリア
        const alertArea = document.getElementById('alertArea');
        if (alertArea) {
            alertArea.innerHTML = '';
        }
        
        // 低残量のタンク
        const lowLevelTanks = [];
        // 1ヶ月以上空にならないタンク
        const stagnantTanks = [];
        
        for (const tankDoc of tanksSnapshot.docs) {
            const tank = tankDoc.data();
            
            // 最新の記録を取得
            const recordsSnapshot = await db.collection('dailyRecords')
                .where('tankId', '==', tank.id)
                .orderBy('date', 'desc')
                .limit(30)  // 過去30日分取得
                .get();
            
            let latestRecord = null;
            let averageConsumption = 0;
            let daysToEmpty = null;
            
            if (!recordsSnapshot.empty) {
                latestRecord = recordsSnapshot.docs[0].data();
                
                // 平均消費量計算 (過去7日間)
                if (recordsSnapshot.docs.length >= 2) {
                    let totalConsumption = 0;
                    let countedDays = 0;
                    
                    for (let i = 0; i < Math.min(7, recordsSnapshot.docs.length - 1); i++) {
                        const consumption = recordsSnapshot.docs[i].data().consumptionAmount || 0;
                        if (consumption > 0) {
                            totalConsumption += consumption;
                            countedDays++;
                        }
                    }
                    
                    if (countedDays > 0) {
                        averageConsumption = totalConsumption / countedDays;
                        if (averageConsumption > 0) {
                            daysToEmpty = latestRecord.remainingAmount / averageConsumption;
                        }
                    }
                }
                
                // アラートチェック
                if (latestRecord.remainingAmount <= 1) {
                    lowLevelTanks.push(tank.id);
                }
                
                // 空になっていないかチェック
                let hasBeenEmpty = false;
                for (const recordDoc of recordsSnapshot.docs) {
                    if (recordDoc.data().remainingAmount === 0) {
                        hasBeenEmpty = true;
                        break;
                    }
                }
                
                if (!hasBeenEmpty && recordsSnapshot.docs.length >= 30) {
                    stagnantTanks.push(tank.id);
                }
            }
            
            // タンクカードを作成
            const tankCard = createTankCard(tank, latestRecord, averageConsumption, daysToEmpty);
            tanksContainer.appendChild(tankCard);
        }
        
        // アラート表示
        if (lowLevelTanks.length > 0 || stagnantTanks.length > 0) {
            displayAlerts(lowLevelTanks, stagnantTanks);
        }
        
    } catch (error) {
        console.error('Error loading tanks:', error);
        showError('タンクデータの読み込み中にエラーが発生しました: ' + error.message);
    }
}

// タンクカードの作成
function createTankCar

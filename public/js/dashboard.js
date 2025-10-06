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
    // タンクカードの作成
function createTankCard(tank, latestRecord, averageConsumption, daysToEmpty) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'col-md-4 col-lg-3 mb-4';
    cardDiv.dataset.feedType = tank.currentFeedType;
    
    // 餌タイプに応じた色とラベルを取得
    const feedTypeInfo = FEED_TYPES[tank.currentFeedType] || { name: '不明', color: '#999' };
    
    // 残量情報
    let remainingAmount = 0;
    let remainingPercent = 0;
    let lastUpdated = '未記録';
    
    if (latestRecord) {
        remainingAmount = latestRecord.remainingAmount;
        remainingPercent = (remainingAmount / tank.capacity) * 100;
        lastUpdated = new Date(latestRecord.date).toLocaleDateString();
    }
    
    // 残量に応じたカラークラス
    let levelColorClass = 'bg-success';
    if (remainingAmount <= 1) {
        levelColorClass = 'bg-danger';
    } else if (remainingAmount <= 2) {
        levelColorClass = 'bg-warning';
    }
    
    // 消費予測
    let consumptionHtml = '<p class="mb-0">平均消費量: 記録不足</p>';
    if (averageConsumption > 0) {
        consumptionHtml = `
            <p class="mb-0">平均消費量: ${averageConsumption.toFixed(2)}t/日</p>
            ${daysToEmpty ? `<p class="mb-0">予測: ${daysToEmpty.toFixed(1)}日で空</p>` : ''}
        `;
    }
    
    cardDiv.innerHTML = `
        <div class="card h-100">
            <div class="card-header" style="background-color: ${feedTypeInfo.color}; color: white;">
                <h5 class="card-title mb-0">${tank.id}</h5>
                <small>${feedTypeInfo.name} (${tank.capacity}t)</small>
            </div>
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h2>${remainingAmount}t</h2>
                    <span class="badge bg-secondary">最終更新: ${lastUpdated}</span>
                </div>
                <div class="progress mb-3">
                    <div class="progress-bar ${levelColorClass}" style="width: ${remainingPercent}%" 
                        aria-valuenow="${remainingPercent}" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
                ${consumptionHtml}
                <a href="tank-detail.html?id=${tank.id}" class="btn btn-primary btn-sm mt-3 w-100">詳細・記録</a>
            </div>
        </div>
    `;
    
    return cardDiv;
}

// アラート表示
function displayAlerts(lowLevelTanks, stagnantTanks) {
    const alertArea = document.getElementById('alertArea');
    if (!alertArea) return;
    
    if (lowLevelTanks.length > 0) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'col-12 mb-2';
        alertDiv.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                <strong>残量警告!</strong> 以下のタンクの残量が1t以下です: ${lowLevelTanks.join(', ')}
            </div>
        `;
        alertArea.appendChild(alertDiv);
    }
    
    if (stagnantTanks.length > 0) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'col-12';
        alertDiv.innerHTML = `
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-circle-fill me-2"></i>
                <strong>注意!</strong> 以下のタンクは1ヶ月以上空になっていません: ${stagnantTanks.join(', ')}
            </div>
        `;
        alertArea.appendChild(alertDiv);
    }
}

// フィルター処理のセットアップ
function setupFilterHandlers() {
    const filterButtons = document.querySelectorAll('input[name="feedTypeFilter"]');
    filterButtons.forEach(button => {
        button.addEventListener('change', function() {
            const selectedType = this.id;
            const tankCards = document.querySelectorAll('#tanksContainer > div');
            
            tankCards.forEach(card => {
                if (selectedType === 'all' || card.dataset.feedType === selectedType) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
}

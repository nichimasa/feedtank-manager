let currentTankData = null;
let recordsData = [];

document.addEventListener('DOMContentLoaded', function() {
    // URLからタンクIDを取得
    const urlParams = new URLSearchParams(window.location.search);
    const tankId = urlParams.get('id');
    
    if (!tankId) {
        alert('タンクIDが指定されていません。');
        window.location.href = 'dashboard.html';
        return;
    }
    
    // 現在の日付をセット
    const today = new Date();
    const recordDateInput = document.getElementById('recordDate');
    if (recordDateInput) {
        recordDateInput.value = formatDate(today);
    }
    
    // タンク情報を読み込み
    loadTankDetails(tankId);
    
    // フォーム送信イベント
    const remainingForm = document.getElementById('remainingForm');
    if (remainingForm) {
        remainingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveRecord(tankId);
        });
    }
    
    // 餌種類変更イベント
    const feedTypeSelect = document.getElementById('currentFeedType');
    if (feedTypeSelect) {
        feedTypeSelect.addEventListener('change', function() {
            updateTankFeedType(tankId, this.value);
        });
    }
    
    // グラフ期間変更イベント
    const periodRadios = document.querySelectorAll('input[name="period"]');
    periodRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            updateChart(this.id);
        });
    });
    
    // 選択肢の作成
    populateAmountOptions();
});

// 残量と入荷量の選択肢を生成
function populateAmountOptions() {
    const remainingSelect = document.getElementById('remainingAmount');
    const incomingSelect = document.getElementById('incomingAmount');
    
    if (remainingSelect) {
        // 残量選択肢をクリア
        remainingSelect.innerHTML = '<option value="">選択してください</option>';
        
        // 0から最大容量までの選択肢を0.5t単位で生成
        if (currentTankData) {
            for (let i = 0; i <= currentTankData.capacity; i += 0.5) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = i.toFixed(1);
                remainingSelect.appendChild(option);
            }
        }
    }
    
    if (incomingSelect) {
        // 入荷量選択肢をクリア
        incomingSelect.innerHTML = '<option value="0">0.0</option>';
        
        // 0.5tから10tまでの選択肢を0.5t単位で生成
        for (let i = 0.5; i <= 10; i += 0.5) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i.toFixed(1);
            incomingSelect.appendChild(option);
        }
    }
}

// タンク詳細の読み込み
async function loadTankDetails(tankId) {
    try {
        // タンク情報を取得
        const tankDoc = await db.collection('tanks').doc(tankId).get();
        
        if (!tankDoc.exists) {
            alert('指定されたタンクが見つかりません。');
            window.location.href = 'dashboard.html';
            return;
        }
        
        // タンクデータを保存
        currentTankData = tankDoc.data();
        
        // タイトル表示
        const tankTitle = document.getElementById('tankTitle');
        if (tankTitle) {
            tankTitle.textContent = `タンク ${tankId} 詳細`;
        }
        
        // 容量表示
        const tankCapacity = document.getElementById('tankCapacity');
        if (tankCapacity) {
            tankCapacity.textContent = `容量: ${currentTankData.capacity}トン`;
        }
        
        // 現在の餌種類を選択
        const feedTypeSelect = document.getElementById('currentFeedType');
        if (feedTypeSelect) {
            feedTypeSelect.value = currentTankData.currentFeedType;
        }
        
        // 残量選択肢を再生成
        populateAmountOptions();
        
        // 記録を読み込み
        await loadTankRecords(tankId);
        
    } catch (error) {
        console.error('Error loading tank details:', error);
        alert('タンク情報の読み込み中にエラーが発生しました: ' + error.message);
    }
}

// タンクの記録を読み込み
async function loadTankRecords(tankId) {
    try {
        // 過去1年間の記録を取得
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        
        const recordsSnapshot = await db.collection('dailyRecords')
            .where('tankId', '==', tankId)
            .where('date', '>=', formatDate(oneYearAgo))
            .orderBy('date', 'desc')
            .get();
        
        recordsData = [];
        recordsSnapshot.forEach(doc => {
            recordsData.push(doc.data());
        });
        
        // 記録テーブルを更新
        updateRecordsTable();
        
        // 平均消費量を計算して表示
        calculateAverageConsumption();
        
        // グラフを更新
        initChart();
        
    } catch (error) {
        console.error('Error loading tank records:', error);
        alert('記録の読み込み中にエラーが発生しました: ' + error.message);
    }
}

// 記録テーブルの更新
function updateRecordsTable() {
    const recordsTable = document.getElementById('recordsTable');
    if (!recordsTable) return;
    
    recordsTable.innerHTML = '';
    
    if (recordsData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="5" class="text-center">記録がありません</td>';
        recordsTable.appendChild(row);
        return;
    }
    
    recordsData.forEach(record => {
        const row = document.createElement('tr');
        
        // 日付を日本語形式に変換
        const recordDate = new Date(record.date);
        const formattedDate = recordDate.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        
        // 餌種類の表示名を取得
        const feedTypeName = FEED_TYPES[record.feedType]?.name || record.feedType;
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${feedTypeName}</td>
            <td>${record.remainingAmount.toFixed(1)}</td>
            <td>${record.incomingAmount.toFixed(1)}</td>
            <td>${record.consumptionAmount ? record.consumptionAmount.toFixed(1) : '-'}</td>
        `;
        recordsTable.appendChild(row);
    });
}

// 平均消費量の計算
function calculateAverageConsumption() {
    const avgConsumptionElement = document.getElementById('avgConsumption');
    const emptyForecastElement = document.getElementById('emptyForecast');
    
    if (!avgConsumptionElement || recordsData.length < 7) {
        if (avgConsumptionElement) {
            avgConsumptionElement.textContent = '記録不足';
        }
        return;
    }
    
    // 直近7日間の記録を取得
    const recentRecords = recordsData.slice(0, 7);
    
    // 有効な消費量を持つ記録のみフィルタリング
    const validRecords = recentRecords.filter(record => record.consumptionAmount && record.consumptionAmount > 0);
    
    if (validRecords.length === 0) {
        avgConsumptionElement.textContent = '0.0 t/日';
        return;
    }
    
    // 平均消費量を計算
    const totalConsumption = validRecords.reduce((sum, record) => sum + record.consumptionAmount, 0);
    const avgConsumption = totalConsumption / validRecords.length;
    
    // 表示
    avgConsumptionElement.textContent = `${avgConsumption.toFixed(2)} t/日`;
    
    // 空になる予測日数を計算
    if (avgConsumption > 0 && recordsData[0]?.remainingAmount > 0) {
        const daysToEmpty = recordsData[0].remainingAmount / avgConsumption;
        const emptyDate = new Date();
        emptyDate.setDate(emptyDate.getDate() + Math.floor(daysToEmpty));
        
        // 表示
        emptyForecastElement.innerHTML = `
            <p>予測: ${Math.ceil(daysToEmpty)}日後に空 (${emptyDate.toLocaleDateString('ja-JP')})</p>
        `;
        
        // 1t到達予測
        if (recordsData[0].remainingAmount > 1) {
            const daysToLow = (recordsData[0].remainingAmount - 1) / avgConsumption;
            const lowDate = new Date();
            lowDate.setDate(lowDate.getDate() + Math.floor(daysToLow));
            
            emptyForecastElement.innerHTML += `
                <p>1t到達: ${Math.ceil(daysToLow)}日後 (${lowDate.toLocaleDateString('ja-JP')})</p>
            `;
        }
    }
}

// 記録の保存
async function saveRecord(tankId) {
    // フォームからデータを取得
    const recordDate = document.getElementById('recordDate').value;
    const remainingAmount = parseFloat(document.getElementById('remainingAmount').value);
    const incomingAmount = parseFloat(document.getElementById('incomingAmount').value || 0);
    const feedType = document.getElementById('currentFeedType').value;
    
    if (!recordDate || isNaN(remainingAmount)) {
        alert('日付と残量を入力してください。');
        return;
    }
    
    try {
        // 前日の記録を検索
        const previousDate = new Date(recordDate);
        previousDate.setDate(previousDate.getDate() - 1);
        
        const previousRecordSnapshot = await db.collection('dailyRecords')
            .where('tankId', '==', tankId)
            .where('date', '==', formatDate(previousDate))
            .get();
        
        let consumptionAmount = null;
        
        // 前日の記録がある場合は消費量を計算
        if (!previousRecordSnapshot.empty) {
            const previousRecord = previousRecordSnapshot.docs[0].data();
            consumptionAmount = calculateConsumption(
                previousRecord.remainingAmount,
                incomingAmount,
                remainingAmount
            );
        }
        
        // 記録データを作成
        const recordData = {
            tankId: tankId,
            date: recordDate,
            remainingAmount: remainingAmount,
            incomingAmount: incomingAmount,
            feedType: feedType,
            consumptionAmount: consumptionAmount,
            userId: firebase.auth().currentUser.uid,
            userName: firebase.auth().currentUser.displayName || firebase.auth().currentUser.email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // 既存の記録を検索
        const existingRecordSnapshot = await db.collection('dailyRecords')
            .where('tankId', '==', tankId)
            .where('date', '==', recordDate)
            .get();
        
        // トランザクション処理
        await db.runTransaction(async transaction => {
            // 既存の記録がある場合は更新、なければ新規作成
            if (!existingRecordSnapshot.empty) {
                transaction.update(existingRecordSnapshot.docs[0].ref, recordData);
            } else {
                transaction.set(db.collection('dailyRecords').doc(), recordData);
            }
            
            // 記録の日付が今日なら、タンクの現在の餌種類も更新
            const today = formatDate(new Date());
            if (recordDate === today) {
                transaction.update(db.collection('tanks').doc(tankId), {
                    currentFeedType: feedType
                });
            }
        });
        
        alert('記録を保存しました。');
        
        // 記録を再読み込み
        await loadTankRecords(tankId);
        
    } catch (error) {
        console.error('Error saving record:', error);
        alert('記録の保存中にエラーが発生しました: ' + error.message);
    }
}

// タンクの餌種類を更新
async function updateTankFeedType(tankId, feedType) {
    try {
        await db.collection('tanks').doc(tankId).update({
            currentFeedType: feedType
        });
        
        // 今日の記録があれば餌種類も更新
        const today = formatDate(new Date());
        const todayRecordSnapshot = await db.collection('dailyRecords')
            .where('tankId', '==', tankId)
            .where('date', '==', today)
            .get();
        
        if (!todayRecordSnapshot.empty) {
            await todayRecordSnapshot.docs[0].ref.update({
                feedType: feedType
            });
        }
        
        // 再読み込み
        await loadTankRecords(tankId);
        
    } catch (error) {
        console.error('Error updating feed type:', error);
        alert('餌種類の更新中にエラーが発生しました: ' + error.message);
    }
}

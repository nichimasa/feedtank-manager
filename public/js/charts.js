let tankChart = null;

// チャート初期化
function initChart() {
    const chartContext = document.getElementById('tankChart');
    if (!chartContext) return;
    
    // 既存のチャートがあれば破棄
    if (tankChart) {
        tankChart.destroy();
    }
    
    // デフォルトで日次表示
    updateChart('daily');
}

// チャート更新
function updateChart(period) {
    const chartContext = document.getElementById('tankChart');
    if (!chartContext || !recordsData || recordsData.length === 0) return;
    
    // データ集計
    let chartData;
    
    switch (period) {
        case 'weekly':
            chartData = aggregateDataByWeek();
            break;
        case 'monthly':
            chartData = aggregateDataByMonth();
            break;
        case 'daily':
        default:
            chartData = aggregateDataByDay();
            break;
    }
    
    // グラフ色設定
    const remainingColor = '#2196F3'; // 青
    const consumptionColor = '#FFC107'; // 黄
    
    // チャート設定
    const chartConfig = {
        type: 'bar',
        data: {
            labels: chartData.labels,
            datasets: [
                {
                    label: '残量 (t)',
                    data: chartData.remainingAmounts,
                    backgroundColor: remainingColor,
                    order: 1
                },
                {
                    label: '消費量 (t)',
                    data: chartData.consumptionAmounts,
                    backgroundColor: consumptionColor,
                    borderColor: '#FF9800',
                    type: 'line',
                    order: 0
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'トン (t)'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: chartData.title
                }
            }
        }
    };
    
    // チャート作成
    if (tankChart) {
        tankChart.destroy();
    }
    
    tankChart = new Chart(chartContext, chartConfig);
}

// 日次データ集計
function aggregateDataByDay() {
    // 日付の降順から昇順に並び替え
    const sortedRecords = [...recordsData].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // 最大30日間のデータを使用
    const records = sortedRecords.slice(-30);
    
    return {
        title: '日次残量・消費量推移',
        labels: records.map(record => {
            const date = new Date(record.date);
            return `${date.getMonth() + 1}/${date.getDate()}`;
        }),
        remainingAmounts: records.map(record => record.remainingAmount),
        consumptionAmounts: records.map(record => record.consumptionAmount || 0)
    };
}

// 週次データ集計
function aggregateDataByWeek() {
    // 日付の昇順にソート
    const sortedRecords = [...recordsData].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const weeklyData = {};
    
    sortedRecords.forEach(record => {
        const date = new Date(record.date);
        // 週の始めの日付を計算 (日曜日を週初めとする)
        const dayOfWeek = date.getDay();
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - dayOfWeek);
        
        const weekKey = formatDate(weekStart);
        
        if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = {
                remainingAmounts: [],
                consumptionTotal: 0,
                consumptionCount: 0,
                label: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`
            };
        }
        
        weeklyData[weekKey].remainingAmounts.push(record.remainingAmount);
        
        if (record.consumptionAmount) {
            weeklyData[weekKey].consumptionTotal += record.consumptionAmount;
            weeklyData[weekKey].consumptionCount++;
        }
    });
    
    const weeks = Object.keys(weeklyData).sort();
    
    // 最大12週間分のデータを使用
    const recentWeeks = weeks.slice(-12);
    
    return {
        title: '週次残量・消費量推移',
        labels: recentWeeks.map(week => weeklyData[week].label),
        // 各週の最終残量を使用
        remainingAmounts: recentWeeks.map(week => {
            const amounts = weeklyData[week].remainingAmounts;
            return amounts[amounts.length - 1];
        }),
        // 各週の平均消費量を計算
        consumptionAmounts: recentWeeks.map(week => {
            const data = weeklyData[week];
            return data.consumptionCount > 0 ? data.consumptionTotal / data.consumptionCount : 0;
        })
    };
}

// 月次データ集計
function aggregateDataByMonth() {
    // 日付の昇順にソート
    const sortedRecords = [...recordsData].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const monthlyData = {};
    
    sortedRecords.forEach(record => {
        const date = new Date(record.date);
        // 月の初めを計算
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        
        const monthKey = formatDate(monthStart);
        
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
                remainingAmounts: [],
                consumptionTotal: 0,
                consumptionCount: 0,
                label: `${monthStart.getFullYear()}/${monthStart.getMonth() + 1}`
            };
        }
        
        monthlyData[monthKey].remainingAmounts.push(record.remainingAmount);
        
        if (record.consumptionAmount) {
            monthlyData[monthKey].consumptionTotal += record.consumptionAmount;
            monthlyData[monthKey].consumptionCount++;
        }
    });
    
    const months = Object.keys(monthlyData).sort();
    
    // 最大12ヶ月分のデータを使用
    const recentMonths = months.slice(-12);
    
    return {
        title: '月次残量・消費量推移',
        labels: recentMonths.map(month => monthlyData[month].label),
        // 各月の最終残量を使用
        remainingAmounts: recentMonths.map(month => {
            const amounts = monthlyData[month].remainingAmounts;
            return amounts[amounts.length - 1];
        }),
        // 各月の平均消費量を計算
        consumptionAmounts: recentMonths.map(month => {
            const data = monthlyData[month];
            return data.consumptionCount > 0 ? data.consumptionTotal / data.consumptionCount : 0;
        })
    };
}

// ユーザー認証状態の監視
firebase.auth().onAuthStateChanged(function(user) {
    const currentPath = window.location.pathname;
    
    if (user) {
        // ユーザーがログインしている
        console.log('Logged in as:', user.displayName);
        
        // ユーザー名表示
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = user.displayName || user.email;
        }
        
        // タンクマスターのセットアップ
        setupTankMaster().then(() => {
            console.log('Tank master setup completed');
        }).catch(err => {
            console.error('Error setting up tank master:', err);
        });
        
        // ログインページにいる場合はダッシュボードへリダイレクト
        if (currentPath.endsWith('index.html') || currentPath.endsWith('/')) {
            window.location.href = 'dashboard.html';
        }
        
    } else {
        // ログインしていない場合
        console.log('Not logged in');
        
        // ログインページ以外にいる場合はログインページへリダイレクト
        if (!currentPath.endsWith('index.html') && !currentPath.endsWith('/')) {
            window.location.href = 'index.html';
        }
    }
});

// Googleログイン処理
document.addEventListener('DOMContentLoaded', function() {
    const googleLoginBtn = document.getElementById('googleLogin');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', function() {
            const provider = new firebase.auth.GoogleAuthProvider();
            firebase.auth().signInWithPopup(provider)
                .then((result) => {
                    // ログイン成功
                    console.log('Google login successful');
                })
                .catch((error) => {
                    // エラー処理
                    console.error('Google login error:', error);
                    const errorDiv = document.getElementById('loginError');
                    if (errorDiv) {
                        errorDiv.textContent = `ログインエラー: ${error.message}`;
                        errorDiv.style.display = 'block';
                    }
                });
        });
    }
    
    // ログアウトボタン
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            firebase.auth().signOut()
                .then(() => {
                    console.log('Logged out');
                    window.location.href = 'index.html';
                })
                .catch((error) => {
                    console.error('Logout error:', error);
                });
        });
    }
});

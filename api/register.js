<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: "Microsoft JhengHei", sans-serif; background-color: #f4f7f6; padding: 20px; display: flex; flex-direction: column; align-items: center; }
    .card { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); width: 100%; max-width: 480px; margin-bottom: 25px; text-align: center; }
    input, select { width: 100%; padding: 12px; margin: 10px 0; border: 1px solid #ddd; border-radius: 8px; box-sizing: border-box; font-size: 16px; }
    button { width: 100%; padding: 12px; background-color: #2980b9; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: bold; margin-top: 10px; }
    button:disabled { background: #bdc3c7; cursor: not-allowed; }
    .info-tag { background: #ebf5fb; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: left; border-left: 5px solid #2980b9; }
    #successMsg { display: none; color: #27ae60; padding: 20px; }
    
    /* 看板表格 */
    .stats-card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); width: 100%; max-width: 850px; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 600px; }
    th, td { padding: 12px 15px; border-bottom: 1px solid #eee; text-align: left; }
    th { background: #f8f9fa; color: #34495e; font-weight: bold; }
    .full { color: #e74c3c; font-weight: bold; }
    
    /* 錯誤警示 */
    #authErrorAlert { display: none; background: #fdf2f2; color: #9b1c1c; padding: 15px; border: 1px solid #f8d7da; border-radius: 8px; margin-bottom: 20px; width: 100%; max-width: 480px; text-align: left; }
  </style>
</head>
<body>

  <!-- 權限檢測提示區 -->
  <div id="authErrorAlert">
    <strong>⚠️ 無法載入資料 (權限衝突)：</strong><br>
    偵測到您登入了多個 Google 帳號。請嘗試：
    <ul style="margin-top: 8px;">
      <li>使用 <b>「無痕視窗」</b> 開啟此連結。</li>
      <li>在網址結尾加上 <b>?authuser=0</b> 並重新整理。</li>
    </ul>
  </div>

  <!-- 報名表單 -->
  <div class="card" id="mainCard">
    <h2 id="formTitle">社團報名系統</h2>
    
    <div id="step1">
      <input type="number" id="seatInput" placeholder="請輸入 4 碼班級座號 (如 1101)">
      <input type="password" id="idInput" placeholder="請輸入身分證後四碼" maxlength="4">
      <button id="vBtn" onclick="doVerify()">驗證身份</button>
    </div>

    <div id="step2" style="display:none">
      <div class="info-tag">
        ✅ 驗證成功！<br>
        <b>姓名：</b><span id="nameLabel"></span><br>
        <b>班級：</b><span id="classLabel"></span>
      </div>
      <input type="email" id="emailInput" placeholder="請輸入您的 Email (選填)">
      <select id="clubSelect"></select>
      <button id="sBtn" onclick="doSubmit()">確認提交報名</button>
    </div>

    <div id="successMsg">
      <h3>🎉 報名提交成功！</h3>
      <p>您可以關閉此視窗了。</p>
    </div>
  </div>

  <!-- 即時看板 -->
  <div class="stats-card">
    <h3 style="margin: 0 0 15px 0; color: #2c3e50;">📊 目前各社團報名即時看板</h3>
    <table id="statsTable">
      <thead>
        <tr>
          <th>社團名稱</th>
          <th>上限</th>
          <th>社團介紹</th>
          <th>已報名</th>
          <th>目前狀態</th>
        </tr>
      </thead>
      <tbody id="statsBody">
        <tr><td colspan="5" style="text-align:center;">資料載入中...</td></tr>
      </tbody>
    </table>
  </div>

  <script>
    let userData = {};

    window.onload = function() {
      checkAuth();    // 1. 權限檢測
      loadClubs();    // 2. 載入看板
    };

    // 權限檢測：若 4 秒內沒接到後端回應就顯示警告
    function checkAuth() {
      const timer = setTimeout(() => {
        document.getElementById('authErrorAlert').style.display = 'block';
      }, 4000);

      fetch("/api/verify").withSuccessHandler(() => {
        clearTimeout(timer);
      }).keepAlive();
    }

    // 載入即時看板資料
    function loadClubs() {
      fetch("/api/verify").withSuccessHandler(res => {
        const select = document.getElementById('clubSelect');
        const tbody = document.getElementById('statsBody');
        select.innerHTML = '<option value="">-- 請選擇社團 --</option>';
        tbody.innerHTML = "";

        res.clubs.forEach(c => {
          const isFull = c.currentCount >= c.capacity;
          const statusText = isFull ? '🔴 已額滿' : '🟢 尚有名額';
          
          // 更新選單
          const opt = document.createElement('option');
          opt.value = c.name;
          opt.text = `${c.name} (剩餘: ${c.capacity - c.currentCount})`;
          if (isFull) opt.disabled = true;
          select.add(opt);

          // 更新表格
          const row = tbody.insertRow();
          if (isFull) row.className = "full";
          row.innerHTML = `
            <td>${c.name}</td>
            <td>${c.capacity}</td>
            <td>${c.intro}</td>
            <td>${c.currentCount}</td>
            <td>${statusText}</td>
          `;
        });
      }).getClubInfo();
    }

    // 執行身分驗證
    function doVerify() {
      const seat = document.getElementById('seatInput').value;
      const id = document.getElementById('idInput').value;
      if(!seat || !id) return alert("請完整填寫座號與後四碼");

      document.getElementById('vBtn').disabled = true;
      fetch("/api/verify").withSuccessHandler(res => {
        if(res.success) {
          userData = { seat: seat, class: res.className, name: res.userName };
          document.getElementById('nameLabel').innerText = res.userName;
          document.getElementById('classLabel').innerText = res.className;
          document.getElementById('step1').style.display = 'none';
          document.getElementById('step2').style.display = 'block';
        } else {
          alert(res.message);
          document.getElementById('vBtn').disabled = false;
        }
      }).verifyUser(seat, id);
    }

    // 提交報名
    function doSubmit() {
      const club = document.getElementById('clubSelect').value;
      const email = document.getElementById('emailInput').value;
      if(!club) return alert("請選擇社團");

      document.getElementById('sBtn').disabled = true;
      const payload = { ...userData, seatNum: userData.seat, club: club, email: email };

      fetch("/api/verify").withSuccessHandler(res => {
        if(res.status === 'success') {
          document.getElementById('step2').style.display = 'none';
          document.getElementById('formTitle').style.display = 'none';
          document.getElementById('successMsg').style.display = 'block';
          loadClubs(); // 更新看板
        } else {
          alert(res.message);
          document.getElementById('sBtn').disabled = false;
        }
      }).processRegistration(payload);
    }
  </script>
</body>
</html>


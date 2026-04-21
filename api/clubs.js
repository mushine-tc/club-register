/**
 * 網頁入口：載入 Index.html
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('社團報名系統')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * 權限檢測空函式：供前端測試連線是否被多帳號登入擋下
 */
function keepAlive() {
  return true;
}

/**
 * 驗證使用者身分
 * 假設 Whitelist 結構：A座號(0), B班級(1), C姓名(2), D身分證後四碼(3)
 */
function verifyUser(seatNum, idSuffix) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Whitelist");
    const data = sheet.getDataRange().getValues(); // 獲取全表資料
    
    // 從第 2 列 (index 1) 開始搜尋
    for (let i = 1; i < data.length; i++) {
      let sheetSeat = data[i][0].toString().trim(); // A 欄
      let sheetId = data[i][3].toString().trim();   // D 欄
      
      if (sheetSeat === seatNum.toString().trim()) {
        if (sheetId === idSuffix.toString().trim()) {
          return { 
            success: true, 
            className: data[i][1].toString(), // B 欄
            userName: data[i][2].toString()    // C 欄
          };
        } else {
          return { success: false, message: "身分證後四碼錯誤！" };
        }
      }
    }
    return { success: false, message: "找不到此座號，請確認輸入（例如：1101）。" };
  } catch (e) {
    return { success: false, message: "系統錯誤：" + e.toString() };
  }
}

/**
 * 獲取社團資訊（看板與下拉選單）
 * 假設 報名統計 結構：
 * 第 1 列(0): 社團名稱 | 第 2 列(1): 上限 | 第 3 列(2): 介紹 | 第 4 列(3): 目前人數
 */
function getClubInfo() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const statsSheet = ss.getSheetByName('報名統計');
    const data = statsSheet.getDataRange().getValues(); 
    
    let clubs = [];
    // 從 B 欄 (index 1) 開始往右遍歷每個社團
    for (let j = 1; j < data[0].length; j++) {
      if (data[0][j] && data[0][j] !== "") {
        clubs.push({
          name: data[0][j].toString(),      // 第 1 列
          capacity: Number(data[1][j]) || 0, // 第 2 列
          intro: data[2][j].toString(),      // 第 3 列
          currentCount: Number(data[3][j]) || 0 // 第 4 列
        });
      }
    }
    return { clubs: clubs };
  } catch(e) { 
    return { clubs: [] }; 
  }
}

/**
 * 處理報名提交
 */
function processRegistration(formData) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // 鎖定防止同秒超報
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataSheet = ss.getSheetByName('報名資料') || ss.insertSheet('報名資料');
    const statsSheet = ss.getSheetByName('報名統計');
    
    // 1. 檢查是否重複報名 (根據座號)
    const existing = dataSheet.getDataRange().getValues();
    if (existing.some(row => row[1].toString() === formData.seatNum.toString())) {
      throw '您已報名過，每人限報一個社團。';
    }

    // 2. 尋找對應社團欄位並檢查名額
    const statsData = statsSheet.getDataRange().getValues();
    const clubNames = statsData[0]; // 第一列名稱
    const colIdx = clubNames.indexOf(formData.club);
    
    if (colIdx === -1) throw '系統找不到該社團資訊。';
    
    const capacity = Number(statsData[1][colIdx]); // 第二列上限
    const current = Number(statsData[3][colIdx]);  // 第四列目前人數
    
    if (current >= capacity) throw '該社團已額滿，請重選！';
    
    // 3. 寫入報名資料
    dataSheet.appendRow([
      new Date(), 
      formData.seatNum, 
      formData.class, 
      formData.name, 
      formData.email, 
      formData.club
    ]);
    
    // 4. 更新統計人數 (第 4 列，欄位索引 + 1)
    statsSheet.getRange(4, colIdx + 1).setValue(current + 1);
    
    return { status: 'success' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  } finally {
    lock.releaseLock();
  }
}


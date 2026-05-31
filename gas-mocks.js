// gas-mocks.js

global.PropertiesService = {
  getScriptProperties: () => ({
    getProperty: (key) => {
      const props = {
        'BOT_TOKEN': 'TEST_TOKEN',
        'SPREADSHEET_ID': 'TEST_SPREADSHEET_ID',
        'SHOP_SPREADSHEET_ID': 'TEST_SHOP_SPREADSHEET_ID',
        'ADMIN_CHAT_ID': 'TEST_ADMIN_CHAT_ID'
      };
      return props[key];
    },
    setProperties: () => {}
  })
};

const store = new Map();
global.CacheService = {
  getScriptCache: () => {
    return {
      get: (key) => store.get(key) || null,
      put: (key, val, ttl) => store.set(key, val),
      remove: (key) => store.delete(key)
    };
  }
};

global.LockService = {
  getScriptLock: () => ({
    waitLock: (timeout) => {},
    releaseLock: () => {}
  })
};

global.UrlFetchApp = {
  fetch: (...args) => {
    if (global.mockUrlFetchApp) {
      global.mockUrlFetchApp(...args);
    }
  }
};

global.SpreadsheetApp = {
  openById: (...args) => {
    if (global.mockSpreadsheetAppOpenById) {
      return global.mockSpreadsheetAppOpenById(...args);
    }
    return null;
  }
};

// Simulation of createTextFinder
class TextFinder {
  constructor(query, sheetData, lastColumn) {
    this.query = query;
    this.sheetData = sheetData; // Array of row arrays
    this.lastColumn = lastColumn;
    this._matchCase = false;
  }
  matchCase(val) {
    this._matchCase = val;
    return this;
  }
  findAll() {
    const results = [];
    for (let r = 0; r < this.sheetData.length; r++) {
      for (let c = 0; c < this.sheetData[r].length; c++) {
        const cellVal = String(this.sheetData[r][c] || '');
        const match = this._matchCase
          ? cellVal.includes(this.query)
          : cellVal.toLowerCase().includes(this.query.toLowerCase());
        if (match) {
          results.push({
            getRow: () => r + 1,
            getColumn: () => c + 1
          });
        }
      }
    }
    return results;
  }
}

global.TextFinderMock = TextFinder;

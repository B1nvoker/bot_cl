require('../gas-mocks');
const bot = require('../Telegram_clients');

describe('Telegram Bot Tests', () => {
  beforeEach(() => {
    bot.cache.remove('session_123');
    global.mockUrlFetchApp = jest.fn();
    global.mockSpreadsheetAppOpenById = jest.fn();
  });

  describe('14 Days Logic - STATE.ASK_DATE', () => {
    it('should accept date exactly 14 days ago', () => {
      bot.setState('123', { state: bot.STATE.ASK_DATE, data: {} });
      const now = new Date();
      const past = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const dateStr = `${String(past.getDate()).padStart(2, '0')}.${String(past.getMonth() + 1).padStart(2, '0')}.${past.getFullYear()}`;

      const msg = { chat: { id: 123 }, from: { id: 123 }, text: dateStr };
      bot.handleMessage(msg);

      const state = bot.getState('123');
      expect(state.state).toBe(bot.STATE.ASK_MODEL);
    });

    it('should reject date 15 days ago', () => {
      bot.setState('123', { state: bot.STATE.ASK_DATE, data: {} });
      const now = new Date();
      const past = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
      const dateStr = `${String(past.getDate()).padStart(2, '0')}.${String(past.getMonth() + 1).padStart(2, '0')}.${past.getFullYear()}`;

      const msg = { chat: { id: 123 }, from: { id: 123 }, text: dateStr };
      bot.handleMessage(msg);

      const state = bot.getState('123');
      expect(state).toBeNull(); // State cleared due to rejection
      expect(global.mockUrlFetchApp).toHaveBeenCalled();
      const payloadStr = global.mockUrlFetchApp.mock.calls[0][1].payload;
      expect(payloadStr).toContain('истёк');
    });

    it('should handle future date correctly (reject or handle gracefully)', () => {
      bot.setState('123', { state: bot.STATE.ASK_DATE, data: {} });
      const now = new Date();
      const future = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
      const dateStr = `${String(future.getDate()).padStart(2, '0')}.${String(future.getMonth() + 1).padStart(2, '0')}.${future.getFullYear()}`;

      const msg = { chat: { id: 123 }, from: { id: 123 }, text: dateStr };
      bot.handleMessage(msg);

      const state = bot.getState('123');
      // The state should be preserved as ASK_DATE (or cleared if rejected, but we'll choose preserving it to re-ask)
      expect(state.state).toBe(bot.STATE.ASK_DATE);
      expect(global.mockUrlFetchApp).toHaveBeenCalled();
      const payloadStr = global.mockUrlFetchApp.mock.calls[0][1].payload;
      expect(payloadStr).toContain('будущ');
    });
  });

  describe('Shop Search Logic', () => {
    it('should format price correctly, use price_bn if price is 0, and multiply by 3', () => {
      // Mock sheet structure
      const headers = ['model', 'price', 'price_bn', 'delivery_day', 'onliner_id', 'onliner_url'];
      const row1 = ['RTX 4060', '0', '1000.50', '2', '123', 'http'];
      const sheetData = [headers, row1];

      global.mockSpreadsheetAppOpenById = jest.fn().mockReturnValue({
        getSheetByName: jest.fn().mockReturnValue({
          getLastColumn: () => 6,
          getRange: (r, c, numRows, numCols) => {
            if (r === 1 && numRows === 1) return { getValues: () => [headers] };
            return { getValues: () => [sheetData[r-1]] }; // Returns a single row 2D array
          },
          createTextFinder: (query) => new global.TextFinderMock(query, sheetData, 6)
        })
      });

      bot.processShopSearch('123', 'RTX 4060');

      expect(global.mockUrlFetchApp).toHaveBeenCalled();
      const payloadStr = global.mockUrlFetchApp.mock.calls[0][1].payload;
      const payload = JSON.parse(payloadStr);

      // 1000.50 * 3 = 3001.50 -> formatPrice -> "3 001.50"
      expect(payload.text).toContain('3 001.50 руб.');
    });
  });

  describe('Markdown Escaping', () => {
    it('should correctly escape FIO and description in Markdown', () => {
      const text1 = 'Иванов_Иван';
      const escaped1 = bot.escapeMarkdown(text1);
      expect(escaped1).toBe('Иванов\\_Иван');

      const text2 = 'монитор не работает *экран*';
      const escaped2 = bot.escapeMarkdown(text2);
      expect(escaped2).toBe('монитор не работает \\*экран\\*');
    });
  });
});

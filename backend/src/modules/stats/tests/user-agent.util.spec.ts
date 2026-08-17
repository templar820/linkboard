import { describe, expect, it } from 'vitest';
import { detectBrowserName, detectDeviceType, normalizeReferer, toBrowserStats } from '../user-agent.util';

const CHROME_DESKTOP =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

describe('normalizeReferer', () => {
  it('UNIT-BE-35: сводит URL до хоста', () => {
    expect(normalizeReferer('https://t.me/channel/123?x=1')).toBe('t.me');
  });

  it('UNIT-BE-36: пустой, null и мусорный referer → (direct)', () => {
    expect(normalizeReferer(null)).toBe('(direct)');
    expect(normalizeReferer('')).toBe('(direct)');
    expect(normalizeReferer('   ')).toBe('(direct)');
    expect(normalizeReferer('not a url')).toBe('(direct)');
  });
});

describe('detectDeviceType', () => {
  it('UNIT-BE-37: десктопный Chrome → desktop', () => {
    expect(detectDeviceType(CHROME_DESKTOP)).toBe('desktop');
  });

  it('UNIT-BE-38: iPhone → mobile', () => {
    expect(detectDeviceType(SAFARI_IPHONE)).toBe('mobile');
  });

  it('UNIT-BE-39: боты и утилиты → bot', () => {
    expect(detectDeviceType('Googlebot/2.1 (+http://www.google.com/bot.html)')).toBe('bot');
    expect(detectDeviceType('curl/8.7.1')).toBe('bot');
  });

  it('UNIT-BE-40: отсутствующий UA → unknown', () => {
    expect(detectDeviceType(null)).toBe('unknown');
  });
});

describe('detectBrowserName', () => {
  it('UNIT-BE-41: распознаёт браузер, нераспознанное — unknown', () => {
    expect(detectBrowserName(CHROME_DESKTOP)).toBe('Chrome');
    expect(detectBrowserName(null)).toBe('unknown');
  });
});

describe('toBrowserStats', () => {
  it('UNIT-BE-42: схлопывает одинаковые ключи и сортирует по убыванию кликов', () => {
    expect(
      toBrowserStats([
        ['Chrome', 3],
        ['Safari', 10],
        ['Chrome', 4],
      ]),
    ).toEqual([
      { name: 'Safari', clicks: 10 },
      { name: 'Chrome', clicks: 7 },
    ]);
  });
});

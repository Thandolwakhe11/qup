import { describe, it, expect } from 'vitest';
import { clock, timeWindow } from './queue.js';
import { t } from './messages.js';

describe('timeWindow', () => {
  const now = new Date('2026-11-09T08:00:00Z'); // 10:00 in South Africa

  it('uses South African time, not UTC', () => {
    expect(clock(now)).toBe('10:00');
  });

  it('starts now when nobody is ahead', () => {
    expect(timeWindow(0, 9, now)).toEqual({ from: '10:00', to: '10:15' });
  });

  it('adds the average consult time for each person ahead', () => {
    // 5 people x 9 minutes = 45 minutes
    expect(timeWindow(5, 9, now)).toEqual({ from: '10:45', to: '11:00' });
  });
});

describe('messages', () => {
  it('ticket message shows code, people ahead and time window', () => {
    const msg = t('en').ticket('Sipho', 'ADD-047', 32, '11:00', '11:30');
    expect(msg).toContain('ADD-047');
    expect(msg).toContain('32');
    expect(msg).toContain('11:00');
    expect(msg).toContain('11:30');
  });

  it('every language has called and soon alerts with the ticket code', () => {
    for (const lang of ['en', 'zu', 'af'] as const) {
      expect(t(lang).called('Sipho', 'ADD-001')).toContain('ADD-001');
      expect(t(lang).soon('Sipho', 'ADD-001', 0)).toContain('ADD-001');
      expect(t(lang).soon('Sipho', 'ADD-001', 2)).toContain('ADD-001');
    }
  });

  it('soon alert says how many people are ahead', () => {
    expect(t('en').soon('Sipho', 'ADD-001', 2)).toContain('2');
  });
});
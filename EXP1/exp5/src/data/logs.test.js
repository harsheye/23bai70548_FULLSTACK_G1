import logs from './logs';

test('logs data should have correct length and values', () => {
  expect(logs.length).toBe(3);
  expect(logs[0].activity).toBe('Car Travel');
  expect(logs[2].carbon).toBe(0);
});

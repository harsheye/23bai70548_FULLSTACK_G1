import reducer, { refreshLogs } from './logSlice';

describe('logSlice reducer', () => {
  it('should handle initial state', () => {
    expect(reducer(undefined, {})).toEqual({
      data: [],
      status: 'idle',
      error: null,
    });
  });

  it('should handle refreshLogs', () => {
    const prevState = { data: [], status: 'idle', error: 'error' };
    expect(reducer(prevState, refreshLogs())).toEqual({
      data: [],
      status: 'loading',
      error: null,
    });
  });
});

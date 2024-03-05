Object.defineProperty(globalThis, "crypto", {
  value: {
    randomUUID: jest.fn().mockReturnValue(Math.round(Math.random() * 10000).toString()),
  },
});

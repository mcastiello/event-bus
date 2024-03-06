import { CancellablePromise } from "./promises";

describe("CancellablePromise", () => {
  test("It should be able to cancel a promise", async () => {
    const promise = new CancellablePromise((resolve) => {
      setTimeout(() => resolve(true), 10);
    });

    promise.cancel();

    expect(await promise).toEqual(undefined);
  });
  test("It should convert a function to a deferred callback", async () => {
    const callback = jest.fn().mockReturnValue(true);
    const deferred = CancellablePromise.defer(callback);
    const promise = deferred();

    expect(await promise).toEqual(true);
  });
  test("It should cancel a deferred callback", async () => {
    const callback = jest.fn().mockReturnValue(true);
    const deferred = CancellablePromise.defer(callback);
    const promise = deferred();

    promise.cancel();

    expect(await promise).toEqual(undefined);
  });
  test("It should intercept an error", async () => {
    const error = "Error";
    const callback = jest.fn().mockImplementation(() => {
      throw error;
    });
    const deferred = CancellablePromise.defer(callback);
    const promise = deferred();

    try {
      await promise;
    } catch (e) {
      expect(e).toEqual(error);
    }
  });
});

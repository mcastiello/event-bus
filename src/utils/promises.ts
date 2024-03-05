export class CancellablePromise<ReturnType = unknown> extends Promise<ReturnType | undefined> {
  #isCancelled: boolean = false;
  #isResolved: boolean = false;
  #controller: AbortController;

  constructor(
    executor: (
      resolve: (value?: ReturnType | PromiseLike<ReturnType>) => void,
      reject: (reason?: unknown) => void,
    ) => void,
  ) {
    const controller = new AbortController();
    super((resolve: (value?: ReturnType | PromiseLike<ReturnType>) => void, reject: (reason?: unknown) => void) => {
      const resolver = (value?: ReturnType | PromiseLike<ReturnType>) => {
        if (!this.#isCancelled) {
          this.#isResolved = true;
          resolve(value);
        }
      };

      executor(resolver, reject);

      controller.signal.addEventListener("abort", () => {
        if (!this.#isResolved) {
          this.#isCancelled = true;
          resolve(undefined);
        }
      });
    });

    this.#controller = controller;
  }

  cancel() {
    this.#controller.abort();
  }

  static defer<Args extends unknown[], ReturnType>(
    callback: (...args: Args) => ReturnType | PromiseLike<ReturnType>,
  ): (...args: Args) => CancellablePromise<ReturnType> {
    return (...args: Args) =>
      new CancellablePromise<ReturnType>(async (resolve, reject) => {
        try {
          const response = await callback(...args);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      });
  }
}

export class CancellablePromise<ReturnType = unknown> extends Promise<ReturnType | undefined> {
  #controller: AbortController;

  constructor(
    executor: (
      resolve: (value?: ReturnType | PromiseLike<ReturnType>) => void,
      reject: (reason?: unknown) => void,
    ) => void,
  ) {
    const controller = new AbortController();
    let isCancelled: boolean = false;
    let isResolved: boolean = false;
    super((resolve: (value?: ReturnType | PromiseLike<ReturnType>) => void, reject: (reason?: unknown) => void) => {
      const resolver = (value?: ReturnType | PromiseLike<ReturnType>) => {
        if (!isCancelled) {
          isResolved = true;
          resolve(value);
        }
      };

      executor(resolver, reject);

      controller.signal.addEventListener("abort", () => {
        if (!isResolved) {
          isCancelled = true;
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

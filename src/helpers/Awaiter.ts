export class Awaiter<R> {
    private promiseInfo?: {
        promise: Promise<R>;
        resolve: (result: R) => void;
        reject: (error?: any) => void;
    };

    get active() {
        return !!this.promiseInfo;
    }


    wait() {
        if (this.active) {
            return this.promiseInfo.promise;
        }

        let resolve: typeof this.promiseInfo['resolve'];
        let reject: typeof this.promiseInfo['reject'];
        
        const promise = new Promise<R>((res, rej) => {
            resolve = (result) => {
                res(result);
                this.promiseInfo = null;
            };

            reject = (...args) => {
                rej(...args);
                this.promiseInfo = null;
            };
        });

        this.promiseInfo = {
            promise,
            resolve,
            reject,
        };

        return promise;
    }

    resolve(result: R) {
        this.promiseInfo.resolve(result);
    }

    reject(error?: any) {
        this.promiseInfo.reject(error);
    }
}

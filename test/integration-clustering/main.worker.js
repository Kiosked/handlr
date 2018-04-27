const { registerHandler } = require("../../source/index.js");

registerHandler("test:succeed", job => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(
                Object.assign(
                    {
                        test: true
                    },
                    job
                )
            );
        }, 250);
    });
});

registerHandler("test:fail", job => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            reject(new Error("failed!"));
        }, 250);
    });
});

registerHandler("test:progress", (job, controls) => {
    return new Promise(resolve => {
        controls.setProgressMax(20);
        setTimeout(() => {
            controls.setProgress(5);
            setTimeout(() => {
                controls.setProgressMax(6);
                setTimeout(() => {
                    controls.setProgress(6);
                    resolve();
                }, 100);
            }, 100);
        }, 100);
    });
});

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

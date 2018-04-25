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

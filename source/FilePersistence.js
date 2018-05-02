const writeFileAtomic = require("write-file-atomic");
const VError = require("verror");
const Persistence = require("./Persistence.js");

class FilePersistence extends Persistence {
    constructor(filename, encryptionKey) {
        super(encryptionKey);
        this.filename =
            filename || `/tmp/handlr-jobs_${Date.now()}_${Math.floor(Math.random() * 10000)}.dat`;
    }

    persist(jobs) {
        super
            .persist(jobs)
            .then(
                payload =>
                    new Promise((resolve, reject) => {
                        writeFileAtomic(this.filename, payload, err => {
                            if (err) {
                                return reject(
                                    new VError(err, `Failed writing file: ${this.filename}`)
                                );
                            }
                            return resolve();
                        });
                    })
            )
            .catch(err => {
                throw new VError(
                    { cause: err, info: { code: "PERSIST_FILE" } },
                    "Failed persisting jobs to file"
                );
            });
    }
}

module.exports = FilePersistence;

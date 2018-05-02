const fs = require("fs");
const writeFileAtomic = require("write-file-atomic");
const fileExistsCB = require("file-exists");
const VError = require("verror");
const pify = require("pify");
const Persistence = require("./Persistence.js");

const fileExists = pify(fileExistsCB);
const readFile = pify(fs.readFile);

class FilePersistence extends Persistence {
    constructor(filename, encryptionKey) {
        super(encryptionKey);
        this.filename =
            filename || `/tmp/handlr-jobs_${Date.now()}_${Math.floor(Math.random() * 10000)}.dat`;
    }

    persist(jobs) {
        super
            .persist(jobs)
            .then(payload =>
                this.workChannel.enqueue(
                    () =>
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
            )
            .catch(err => {
                throw new VError(
                    { cause: err, info: { code: "PERSIST_FILE" } },
                    "Failed persisting jobs to file"
                );
            });
    }

    read() {
        return this.workChannel
            .enqueue(() =>
                fileExists(this.filename).then(
                    exists => (exists ? readFile(this.filename, "utf8") : null)
                )
            )
            .then(data => (data === null ? [] : super.read(data)));
    }
}

module.exports = FilePersistence;

const path = require("path");
const cluster = require("cluster");
const { createService } = require("../../source/index.js");

describe("clustering", function() {
    before(function() {
        cluster.setupMaster({
            exec: path.resolve(__dirname, "./main.worker.js")
        });
        this.service = createService({ wrapConsole: false });
        cluster.fork();
        cluster.fork();
    });

    describe("service", function() {
        it("fires event job:added with job data when new job is added", function(done) {
            const job = this.service.createJob("test:succeed");
            job.once("job:added", data => {
                expect(data.id).to.equal(job.id);
                done();
            });
            job.commit();
        });

        it("fires event job:started with job data when job is started", function(done) {
            const job = this.service.createJob("test:succeed");
            job.once("job:started", data => {
                expect(data.id).to.equal(job.id);
            });
            job.once("job:completed", () => done());
            job.commit();
        });

        it("fires event job:completed with job data and result when job is completed", function(done) {
            const job = this.service.createJob("test:succeed", { abc: 123 });
            job.once("job:completed", data => {
                expect(data.id).to.equal(job.id);
                expect(data.result).to.have.property("abc", 123);
                done();
            });
            job.commit();
        });
    });

    after(function(done) {
        this.service.shutdown();
        cluster.disconnect(done);
    });
});

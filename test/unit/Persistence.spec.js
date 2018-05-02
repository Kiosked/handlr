const { Channel } = require("@buttercup/channel-queue");
const { createSession } = require("iocane");
const Persistence = require("../../source/Persistence.js");

describe("Persistence", function() {
    it("initialises without error", function() {
        expect(() => {
            new Persistence();
        }).to.not.throw();
    });

    describe("get:workChannel", function() {
        it("returns a Channel instance", function() {
            const persistence = new Persistence();
            expect(persistence.workChannel).to.be.an.instanceof(Channel);
        });
    });

    describe("persist", function() {
        describe("with no encryption", function() {
            beforeEach(function() {
                this.persistence = new Persistence();
            });

            it("returns a JSON-encoded string", function() {
                const jobs = [{ id: "my-job-id-123" }];
                return this.persistence.persist(jobs).then(data => {
                    expect(JSON.parse(data)).to.deep.equal(jobs);
                });
            });
        });

        describe("with encryption", function() {
            beforeEach(function() {
                this.persistence = new Persistence("testing");
            });

            it("returns an encrypted string", function() {
                const jobs = [{ id: "my-job-id-123" }];
                return this.persistence.persist(jobs).then(data => {
                    expect(data).to.have.length.above(0);
                    expect(data).to.not.contain("my-job-id-123");
                });
            });
        });
    });

    describe("read", function() {
        describe("with no encryption", function() {
            beforeEach(function() {
                this.persistence = new Persistence();
            });

            it("returns an array of jobs", function() {
                const jobs = [{ id: "my-job-id-123" }];
                return this.persistence.read(JSON.stringify(jobs)).then(data => {
                    expect(data).to.deep.equal(jobs);
                });
            });
        });

        describe("with encryption", function() {
            beforeEach(function() {
                this.persistence = new Persistence("testing");
                return createSession()
                    .use("gcm")
                    .setDerivationRounds(500000)
                    .encrypt(JSON.stringify([{ id: "my-job-id-123" }]), "testing")
                    .then(data => {
                        this.data = data;
                    });
            });

            it("returns an array of jobs", function() {
                return this.persistence.read(this.data).then(data => {
                    expect(data).to.deep.equal([{ id: "my-job-id-123" }]);
                });
            });
        });
    });
});

# handlr
> Job queue and handler for NodeJS

[![Build Status](https://travis-ci.org/Kiosked/handlr.svg?branch=master)](https://travis-ci.org/Kiosked/handlr)

## About
Handlr is a toolkit for creating simple job queue processing services, and provides easy methods to start a service and register workers.

## Installation
Install handlr as a dependency: `npm install handlr --save`

## Usage
To start a **service**, run something like the following:

```javascript
const { createService } = require("handlr");

service.createJob("test", { someData: true }).commit();
```

This example would create a new job of type `test`, which has a payload of data. `createJob` outputs a harness which can be chained to affect many different job options. Calling `commit` sends the job to the service for immediate queuing, and returns a Promise which resolves once this process has completed.

For jobs to be executed, you should register at least one worker for each job type:

```javascript
const { registerHandler } = require("handlr");

registerHandler("test", job => {
    console.log(job); // Logs '{ someData: true }'
    return {
        someResult: 123
    };
});
```

The job handler above receives jobs of type `test` and responds with a result object. All results _should_ be objects, but if they aren't they will simply be placed into an object for storage (A result of `18` becomes `{ result: 18 }`).

## Dependent Jobs
Jobs can be marked as being dependent on the successful completion of other jobs, for example:

```javascript
Promise
    .all([
        service.createJob("test", { job1: true }).commit(),
        service.createJob("test", { job2: true }).commit()
    ])
    .then(([jobID1, jobID2]) =>
        service
            .createJob("test")
            .depends([jobID1, jobID2])
            .commit()
    );
```

This example creates 3 jobs - 2 that can run simultaneously and 1 that depends on the 2 first jobs. Once both of them complete successfully, the 3rd one will be able to start.

`depends` allows for a second parameter which determines the behaviour for when depended-upon jobs return results (what payload is passed to the dependent job), which can be one of the following:

 * `mergeDepends`: Take the payload of the current job and merge it with the _results_ from each of the depended-upon jobs. The payload is overwritten by the depended job results, and the results are overwritten by the result to the right (merged left to right). This is the **default** setting.
 * `mergePayload`: Take the payload of the current job and merge it with the _results_ from each of the depended-upon jobs. The results of the depended-upon jobs are merged left to right, and the payload is merged last (overwriting the results combination).
 * `discard`: Discard any results from depended-upon jobs and just use the provided payload.
 * `first`: Take the result of the first depended-upon job and use that for the payload. The payload of the dependent job is ignored in this case.

With just a single parameter for the `depends` call, the `mergeDepends` behaviour is used.

A handler for this example may look like:

```javascript
registerHandler("test", job => {
    console.log(job); // Logs as per the following:
    // first:  '{ job1: true }'
    // second: '{ job2: true }'
    // third:  '{ job1: true, job2: true }'
    return job;
});
```

## Attempts
Attempts can be set so that if a job fails it can be retried again later. By default no attempts are set for new jobs, and failed jobs will remain in that state unless manually changed. An attempts value of `1` means that the job can be _retried_ once.

Attempts can be set using the `attempts` method:

```javascript
service
    .createJob("test")
    .attempts(2)
    .commit();
```

_In this example, the new job will be retried twice if it continues to fail. If the job always fails, it will be run exactly 3 times._

`attempts` takes a second, optional parameter which configures the delay between a failure and a re-attempt. The delay value can be in one of the following forms:

 * A number, indicating the milliseconds between executions.
 * A string, which represents a time period between executions (eg. `5m` = 5 minutes). This follows the format of the [ms](https://www.npmjs.com/package/ms) project.
 * A function, which when called, should return true, false or a value representing a timed-delay similiar to one of the first 2 options. A value of `true` will indicate that the job _can_ run, whereas `false` will indicate that it cannot. The function is called with 1 parameter, which is the last execution's UTC timestamp (in milliseconds).

In the following example the delay between attempts will be 2 hours:

```javascript
service.createJob("test").attempts(5, "2h").commit();
```

A more complex use case might involve using a function to provide stepped delays:

```javascript
let currentDelay = 5; // minutes
service
    .createJob("test")
    .attempts(3, () => {
        const output = `${currentDelay}m`;
        currentDelay *= 2;
        return output;
    })
    .commit();
```

## Priorities
Jobs can have a priority in the following range: low/normal/high/critical. The priority can be set by using the `priority` method. `normal` is the default value.

## Events
You can listen for events on **services** or **jobs**:

```javascript
service.on("job:completed", job => {
    console.log("Completed job:", job.id);
});

service.once("job:failed", job => {
    console.log("A job failed");
});

service.on("service:shutdown", handleShutdown);

const job = service
    .createJob("test")
    .priority("high");
job.on("job:started", job => {
    console.log("Started:", job);
});
job.commit();
```

`job:*` events can be listened to on jobs (from `createJob`) or services. `service:*` events can be listened to on services only.

The following events are available for **jobs**:

 * `job:added`: Fired when a job is added to the service
 * `job:started`: Fired when a job is started
 * `job:completed`: Fired when a job is successfully completed
 * `job:failed`: Fired when a job fails
 * `job:stopped`: Fired when a job stops running
 * `job:progress`: Fired when job progress changes

The following events are available for **services**:

 * `service:shutdown`: Fired when the service shuts down
 * `service:idle`: Fired when the service becomes idle when there are no more jobs to process (currently)

## Job progress
Using the control harness (second parameter) in the job handler method, you can change the progress of a job (see [`ControlHarness`](https://github.com/Kiosked/handlr/blob/master/API.md#controlharness--object)):

```javascript
registerHandler("test", (data, harness) => {
    harness.setProgressMax(100);
    harness.setProgress(1);
});
```

## Cluster
`handlr` supports Node's `cluster` module and can be run on workers:

```javascript
const cluster = require("cluster");
const { createService, registerHandler } = require("handlr");

if (cluster.isMaster) {
    const service = createService();
    cluster.fork();
    cluster.fork();
    service.createJob("test", { a: 1 }).commit();
} else {
    registerHandler("test", job => {
        console.log("Got a job!", JSON.stringify(job, undefined, 2));
        return { ok: "go" };
    });
}
```

Detection of cluster/normal modes is done automatically.

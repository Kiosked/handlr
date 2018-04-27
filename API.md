## Functions

<dl>
<dt><a href="#registerHandler">registerHandler(jobType, callback, [serverIndex])</a></dt>
<dd><p>Register a job handler</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#ControlHarness">ControlHarness</a> : <code>Object</code></dt>
<dd><p>Job control harness</p>
</dd>
</dl>

<a name="registerHandler"></a>

## registerHandler(jobType, callback, [serverIndex])
Register a job handler

**Kind**: global function  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| jobType | <code>String</code> |  | The type of job to handle |
| callback | <code>function</code> |  | The callback method, which takes 2 parameters |
| [serverIndex] | <code>Number</code> | <code>0</code> | The optional server index, if multiple servers are used |

**Example**  
```js
registerHandler("jobType", (data, control) => {
     control.setProgressMax(100);
     control.setProgress(1);
     // do something with `data`
     return data.item + 1;
 });
```
<a name="ControlHarness"></a>

## ControlHarness : <code>Object</code>
Job control harness

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| id | <code>String</code> | The job ID |
| progress | <code>Number</code> | The job progress |
| progressMax | <code>Number</code> | The max progress |
| type | <code>String</code> | The job type |


* [ControlHarness](#ControlHarness) : <code>Object</code>
    * [.setProgress](#ControlHarness.setProgress) ⇒ [<code>ControlHarness</code>](#ControlHarness)
    * [.setProgressMax](#ControlHarness.setProgressMax) ⇒ [<code>ControlHarness</code>](#ControlHarness)

<a name="ControlHarness.setProgress"></a>

### ControlHarness.setProgress ⇒ [<code>ControlHarness</code>](#ControlHarness)
Set the current progress of the job

**Kind**: static property of [<code>ControlHarness</code>](#ControlHarness)  
**Returns**: [<code>ControlHarness</code>](#ControlHarness) - Self  

| Param | Type | Description |
| --- | --- | --- |
| progress | <code>Number</code> | The new progress value |

<a name="ControlHarness.setProgressMax"></a>

### ControlHarness.setProgressMax ⇒ [<code>ControlHarness</code>](#ControlHarness)
Set the max progress for the job

**Kind**: static property of [<code>ControlHarness</code>](#ControlHarness)  
**Returns**: [<code>ControlHarness</code>](#ControlHarness) - Self  

| Param | Type | Description |
| --- | --- | --- |
| max | <code>Number</code> | The new max progress value |


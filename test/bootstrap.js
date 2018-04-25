const chai = require("chai");
const sinon = require("sinon");

const { expect } = chai;

Object.assign(global, {
    expect,
    sinon
});

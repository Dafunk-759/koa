"use strict";

const request = require("../../test-helpers/context").request;
const assert = require("assert");

describe("ctx.length", () => {
  it("should return length in content-length", () => {
    const req = request();
    req.header["content-length"] = "10";
    debugger;
    assert.strictEqual(req.length, 10);
  });

  it("should return undefined with no content-length present", () => {
    const req = request();
    assert.strictEqual(req.length, undefined);
  });
});

"use strict";

const request = require("../../test-helpers/context").request;
const assert = require("assert");

describe("req.URL", () => {
  it("should not throw when host is void", () => {
    // Accessing the URL should not throw.
    let req = request()
    debugger;
    req.URL;
  });

  it("should not throw when header.host is invalid", () => {
    const req = request();
    req.header.host = "invalid host";
    // Accessing the URL should not throw.
    req.URL;
  });

  it("should return empty object when invalid", () => {
    const req = request();
    req.header.host = "invalid host";
    assert.deepStrictEqual(req.URL, Object.create(null));
  });
});

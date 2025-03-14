"use strict";

const request = require("supertest");
const assert = require("assert");
const Koa = require("../..");

describe("app.request", () => {
  const app1 = new Koa();
  app1.request.message = "hello";
  const app2 = new Koa();

  it("should merge properties", () => {
    app1.use((ctx, next) => {
      assert.strictEqual(ctx.request.message, "hello");
      ctx.status = 204;
    });

    return request(app1.listen()).get("/").expect(204);
  });

  it("should not affect the original prototype", () => {
    app2.use((ctx, next) => {
      assert.strictEqual(ctx.request.message, undefined);
      assert.ok(!(app1.request === app2.request));
      ctx.status = 204;
    });

    return request(app2.listen()).get("/").expect(204);
  });
});

"use strict";

const request = require("supertest");
const assert = require("assert");
const Koa = require("../..");

describe("app", () => {
  it("should handle socket errors", (done) => {
    debugger;
    const app = new Koa();

    app.use((ctx, next) => {
      // triggers ctx.socket.writable == false
      // console.log('ctx.socket.writable', ctx.socket.writable); false
      ctx.socket.emit("error", new Error("boom!!"));
    });

    app.on("error", (err) => {
      // debugger;
      assert.strictEqual(err.message, "boom!!");
      done();
    });

    request(app.callback())
      .get("/")
      .end(() => {});
  });

  it("should not .writeHead when !socket.writable", (done) => {
    const app = new Koa();

    // console.log("lala");
    app.use((ctx, next) => {
      console.log("called");
      ctx.res.end();
    });

    app.use((ctx, next) => {
      // 没被调用？

      // set .writable to false
      ctx.socket.writable = false;
      ctx.status = 204;
      console.log("ctx.status", ctx.status);
      console.log("ctx.socket.writable", ctx.socket.writable);
      // throw if .writeHead or .end is called
      ctx.res.writeHead = ctx.res.end = () => {
        throw new Error("response sent");
      };
    });

    // hackish, but the response should occur in a single tick
    setImmediate(done);

    request(app.callback())
      .get("/")
      .end(() => {});
  });

  it("should set development env when NODE_ENV missing", () => {
    const NODE_ENV = process.env.NODE_ENV;
    process.env.NODE_ENV = "";
    const app = new Koa();
    process.env.NODE_ENV = NODE_ENV;
    assert.strictEqual(app.env, "development");
    // process.env.NODE_ENV = "production";
    // assert.strictEqual(app.env, "production");
  });

  it("should set env from the constructor", () => {
    const env = "custom";
    const app = new Koa({ env });
    assert.strictEqual(app.env, env);
  });

  it("should set proxy flag from the constructor", () => {
    const proxy = true;
    const app = new Koa({ proxy });
    assert.strictEqual(app.proxy, proxy);
    assert.ok(app.proxy);
  });

  it("should set signed cookie keys from the constructor", () => {
    const keys = ["customkey"];
    const app = new Koa({ keys });
    assert.strictEqual(app.keys, keys);
  });

  it("should set subdomainOffset from the constructor", () => {
    const subdomainOffset = 3;
    const app = new Koa({ subdomainOffset });
    assert.strictEqual(app.subdomainOffset, subdomainOffset);
  });

  it("should set compose from the constructor", () => {
    const compose = () => (ctx) => {};
    const app = new Koa({ compose });
    assert.strictEqual(app.compose, compose);
  });

  it("should have a static property exporting `HttpError` from http-errors library", () => {
    const CreateError = require("http-errors");

    // const err = new Koa.HttpError();
    // console.log(
    //   "err is CreateError.HttpError?",
    //   err instanceof CreateError.HttpError
    // );
    assert.notEqual(Koa.HttpError, undefined);
    assert.deepStrictEqual(Koa.HttpError, CreateError.HttpError);
    assert.throws(() => {
      throw new CreateError(500, "test error");
    }, Koa.HttpError);
  });
});

"use strict";

const request = require("supertest");
const assert = require("assert");
const Koa = require("../..");

describe("app.use(fn)", () => {
  it("should compose middleware", async () => {
    // debugger;
    const app = new Koa();
    const calls = [];

    app.use((ctx, next) => {
      calls.push(1);
      return next().then(() => {
        calls.push(6);
      });
    });

    app.use((ctx, next) => {
      calls.push(2);
      return next().then(() => {
        calls.push(5);
      });
    });

    app.use((ctx, next) => {
      calls.push(3);
      return next().then(() => {
        calls.push(4);
      });
    });

    const server = app.listen();
    // debugger;

    let res = await request(server).get("/").expect(404);

    console.log("res", res.body, res.headers);

    assert.deepStrictEqual(calls, [1, 2, 3, 4, 5, 6]);
    // debugger;
  });

  it("should compose mixed middleware", async () => {
    const app = new Koa();
    const calls = [];

    app.use((ctx, next) => {
      calls.push(1);
      return next().then(() => {
        calls.push(6);
      });
    });

    app.use(async (ctx, next) => {
      calls.push(2);
      await next();
      calls.push(5);
    });

    app.use((ctx, next) => {
      calls.push(3);
      return next().then(() => {
        calls.push(4);
      });
    });

    const server = app.listen();

    await request(server).get("/").expect(404);

    assert.deepStrictEqual(calls, [1, 2, 3, 4, 5, 6]);
  });

  // https://github.com/koajs/koa/pull/530#issuecomment-148138051
  it("should catch thrown errors in non-async functions", () => {
    const app = new Koa();
    // debugger;
    app.use((ctx) => ctx.throw("Not Found", 404));
    // app.use(async (ctx) => {
    //   ctx.throw("Not Found", 404);
    // });

    return request(app.callback()).get("/").expect(404);

    // 这里使用cb会测试不通过 说.end() was called twice.
    // request(app.callback())
    //   .get("/")
    //   .expect(404, (err, res) => {
    //     console.log(res.body, res.headers);
    //   });
  });

  it("should throw error for non-function", () => {
    const app = new Koa();

    [null, undefined, 0, false, "not a function"].forEach((v) => {
      assert.throws(() => app.use(v), /middleware must be a function!/);
      // app.use(v);
    });
  });
});

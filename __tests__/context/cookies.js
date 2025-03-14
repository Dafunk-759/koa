"use strict";

const assert = require("assert");
const request = require("supertest");
const Koa = require("../..");

describe("ctx.cookies", () => {
  describe("ctx.cookies.set()", () => {
    it("should set an unsigned cookie", async () => {
      const app = new Koa();

      app.use((ctx, next) => {
        ctx.cookies.set("name", "jon");
        ctx.status = 204;
      });

      const server = app.listen();

      const res = await request(server).get("/").expect(204);

      const cookie = res.headers["set-cookie"].some((cookie) =>
        /^name=/.test(cookie)
      );
      assert.strictEqual(cookie, true);
      assert.ok(cookie);
    });

    describe("with .signed", () => {
      describe("when no .keys are set", () => {
        it("should error", () => {
          const app = new Koa();

          app.use((ctx, next) => {
            try {
              // console.log('set signed cookie')
              ctx.cookies.set("foo", "bar", { signed: true });
            } catch (err) {
              // console.log('err', err.message)
              ctx.body = err.message;
            }
          });

          return request(app.callback())
            .get("/")
            .expect(".keys required for signed cookies");
        });
      });

      it("should send a signed cookie", async () => {
        const app = new Koa();

        app.keys = ["a", "b"];

        // console.log(app.inspect());

        app.use((ctx, next) => {
          ctx.cookies.set("name", "jon", { signed: true });
          ctx.status = 204;
        });

        const server = app.listen();

        const res = await request(server).get("/").expect(204);

        const cookies = res.headers["set-cookie"];
        // console.log("cookies", cookies);

        assert.strictEqual(
          cookies.some((cookie) => /^name=/.test(cookie)),
          true
        );
        assert.strictEqual(
          cookies.some((cookie) => /(,|^)name\.sig=/.test(cookie)),
          true
        );
      });
    });

    describe("with secure", () => {
      it("should get secure from request", async () => {
        const app = new Koa();

        app.proxy = true;
        app.keys = ["a", "b"];

        app.use((ctx) => {
          ctx.cookies.set("name", "jon", { signed: true });
          ctx.status = 204;
        });

        const server = app.listen();

        const res = await request(server)
          .get("/")
          .set("x-forwarded-proto", "https") // mock secure
          .expect(204);

        const cookies = res.headers["set-cookie"];
        // console.log('cookies', cookies)
        assert.strictEqual(
          cookies.some((cookie) => /^name=/.test(cookie)),
          true
        );
        assert.strictEqual(
          cookies.some((cookie) => /(,|^)name\.sig=/.test(cookie)),
          true
        );
        assert.strictEqual(
          cookies.every((cookie) => /secure/.test(cookie)),
          true
        );
      });
    });
  });

  describe("ctx.cookies=", () => {
    it("should override cookie work", async () => {
      const app = new Koa();

      app.use((ctx, next) => {
        ctx.cookies = {
          set(key, value) {
            // console.log('setting cookie')
            ctx.set(key, value);
          },
        };
        ctx.cookies.set("name", "jon");
        ctx.status = 204;
      });

      const server = app.listen();

      let res = await request(server).get("/").expect("name", "jon").expect(204);
      // console.log(res.headers, res.body)
    });
  });
});

"use strict";

const request = require("supertest");
const statuses = require("statuses");
const assert = require("assert");
const Koa = require("../..");
const fs = require("fs");

describe("app.respond", () => {
  describe("when ctx.respond === false", () => {
    it("should function (ctx)", () => {
      const app = new Koa();

      app.use((ctx) => {
        ctx.body = "Hello";
        ctx.respond = false;

        const res = ctx.res;
        res.statusCode = 200;
        setImmediate(() => {
          // console.log("ctx.respond", ctx.respond);
          res.setHeader("Content-Type", "text/plain");
          res.setHeader("Content-Length", "3");
          res.end("lol");
        });
      });

      const server = app.listen();

      return request(server).get("/").expect(200).expect("lol");
    });

    it("should ignore set header after header sent", () => {
      const app = new Koa();
      app.use((ctx) => {
        ctx.body = "Hello";
        ctx.respond = false;

        const res = ctx.res;
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/plain");
        res.setHeader("Content-Length", "3");
        res.end("lol");
        ctx.set("foo", "bar");
      });

      const server = app.listen();

      return request(server)
        .get("/")
        .expect(200)
        .expect("lol")
        .expect((res) => {
          // console.log(res.headers);
          assert(!res.headers.foo);
        });
    });

    it("should ignore set status after header sent", () => {
      const app = new Koa();
      app.use((ctx) => {
        ctx.body = "Hello";
        ctx.respond = false;

        const res = ctx.res;
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/plain");
        res.setHeader("Content-Length", "3");
        res.end("lol");
        ctx.status = 201;
      });

      const server = app.listen();

      return request(server).get("/").expect(200).expect("lol");
    });
  });

  describe("when this.type === null", () => {
    it("should not send Content-Type header", async () => {
      const app = new Koa();

      app.use((ctx) => {
        ctx.body = "";
        ctx.type = null;
      });

      const server = app.listen();

      const res = await request(server).get("/").expect(200);
      // console.log(res.headers);
      assert.strictEqual(
        Object.prototype.hasOwnProperty.call(res.headers, "Content-Type"),
        false
      );
    });
  });

  describe("when HEAD is used", () => {
    it("should not respond with the body", async () => {
      const app = new Koa();

      app.use((ctx) => {
        ctx.body = "Hello";
      });

      const server = app.listen();

      const res = await request(server).head("/").expect(200);

      assert.strictEqual(
        res.headers["content-type"],
        "text/plain; charset=utf-8"
      );
      assert.strictEqual(res.headers["content-length"], "5");
      // console.log(res.headers);
      assert.ok(!res.text);
    });

    it("should keep json headers", async () => {
      const app = new Koa();

      app.use((ctx) => {
        ctx.body = { hello: "world" };
      });

      const server = app.listen();

      const res = await request(server).head("/").expect(200);

      assert.strictEqual(
        res.headers["content-type"],
        "application/json; charset=utf-8"
      );
      assert.strictEqual(res.headers["content-length"], "17");
      assert.ok(!res.text);
    });

    it("should keep string headers", async () => {
      const app = new Koa();

      app.use((ctx) => {
        ctx.body = "hello world";
      });

      const server = app.listen();

      const res = await request(server).head("/").expect(200);

      assert.strictEqual(
        res.headers["content-type"],
        "text/plain; charset=utf-8"
      );
      assert.strictEqual(res.headers["content-length"], "11");
      assert(!res.text);
    });

    it("should keep buffer headers", async () => {
      const app = new Koa();

      app.use((ctx) => {
        ctx.body = Buffer.from("hello world");
      });

      const server = app.listen();

      const res = await request(server).head("/").expect(200);

      assert.strictEqual(
        res.headers["content-type"],
        "application/octet-stream"
      );
      assert.strictEqual(res.headers["content-length"], "11");
      assert(!res.text);
    });

    it("should keep stream header if set manually", async () => {
      const app = new Koa();

      const { length } = fs.readFileSync("package.json");

      app.use((ctx) => {
        ctx.length = length;
        ctx.body = fs.createReadStream("package.json");
      });

      const server = app.listen();

      const res = await request(server).head("/").expect(200);
      let rh = ~~res.header["content-length"];
      // console.log("rh", rh, length);
      assert.strictEqual(rh, length);
      assert(!res.text);
    });

    it("should respond with a 404 if no body was set", () => {
      const app = new Koa();

      app.use((ctx) => {});

      const server = app.listen();

      return request(server).head("/").expect(404);
    });

    it('should respond with a 200 if body = ""', () => {
      const app = new Koa();

      app.use((ctx) => {
        ctx.body = "";
      });

      const server = app.listen();

      return request(server).head("/").expect(200);
    });

    it("should not overwrite the content-type", () => {
      const app = new Koa();

      app.use((ctx) => {
        ctx.status = 200;
        ctx.type = "application/javascript";
      });

      const server = app.listen();

      return request(server)
        .head("/")
        .expect("content-type", /application\/javascript/)
        .expect(200);
    });
  });

  describe("when no middleware is present", () => {
    it("should 404", () => {
      const app = new Koa();

      const server = app.listen();

      return request(server).get("/").expect(404);
    });
  });

  describe("when res has already been written to", () => {
    it("should not cause an app error", () => {
      const app = new Koa();

      app.use((ctx, next) => {
        const res = ctx.res;
        ctx.status = 200;
        res.setHeader("Content-Type", "text/html");
        res.write("Hello");
      });

      app.on("error", (err) => {
        console.log("never");
        throw err;
      });

      const server = app.listen();

      return request(server).get("/").expect(200);
    });

    it("should send the right body", () => {
      const app = new Koa();

      app.use((ctx, next) => {
        const res = ctx.res;
        ctx.status = 200;
        res.setHeader("Content-Type", "text/html");
        res.write("Hello");
        return new Promise((resolve) => {
          setTimeout(() => {
            res.end("Goodbye");
            resolve();
          }, 0);
        });
      });

      const server = app.listen();

      return request(server).get("/").expect(200).expect("HelloGoodbye");
    });
  });

  describe("when .body is missing", () => {
    describe("with status=400", () => {
      it("should respond with the associated status message", () => {
        const app = new Koa();

        app.use((ctx) => {
          ctx.status = 400;
        });

        const server = app.listen();

        return request(server)
          .get("/")
          .expect(400)
          .expect("Content-Length", "11")
          .expect("Bad Request");
      });
    });

    describe("with status=204", () => {
      it("should respond without a body", async () => {
        const app = new Koa();

        app.use((ctx) => {
          ctx.status = 204;
        });

        const server = app.listen();

        const res = await request(server).get("/").expect(204).expect("");

        assert.strictEqual(
          Object.prototype.hasOwnProperty.call(res.headers, "Content-Type"),
          false
        );
      });
    });

    describe("with status=205", () => {
      it("should respond without a body", async () => {
        const app = new Koa();

        app.use((ctx) => {
          ctx.status = 205;
        });

        const server = app.listen();

        const res = await request(server).get("/").expect(205).expect("");

        assert.strictEqual(
          Object.prototype.hasOwnProperty.call(res.headers, "Content-Type"),
          false
        );
      });
    });

    describe("with status=304", () => {
      it("should respond without a body", async () => {
        const app = new Koa();

        app.use((ctx) => {
          ctx.status = 304;
        });

        const server = app.listen();

        const res = await request(server).get("/").expect(304).expect("");

        assert.strictEqual(
          Object.prototype.hasOwnProperty.call(res.headers, "Content-Type"),
          false
        );
      });
    });

    describe("with custom status=700", () => {
      it("should respond with the associated status message", async () => {
        const app = new Koa();
        statuses["700"] = "custom status";

        app.use((ctx) => {
          ctx.status = 700;
        });

        const server = app.listen();

        const res = await request(server)
          .get("/")
          .expect(700)
          .expect("custom status");

        assert.strictEqual(res.res.statusMessage, "custom status");
      });
    });

    describe("with custom statusMessage=ok", () => {
      it("should respond with the custom status message", async () => {
        const app = new Koa();

        app.use((ctx) => {
          ctx.status = 200;
          ctx.message = "ok";
        });

        const server = app.listen();

        const res = await request(server).get("/").expect(200).expect("ok");
        // Object.keys(res).forEach((k) => console.log(k));
        assert.strictEqual(res.res.statusMessage, "ok");
      });
    });

    describe("with custom status without message", () => {
      it("should respond with the status code number", () => {
        const app = new Koa();

        app.use((ctx) => {
          ctx.res.statusCode = 701;
        });

        const server = app.listen();

        return request(server).get("/").expect(701).expect("701");
      });
    });
  });

  describe("when .body is a null", () => {
    it("should respond 204 by default", async () => {
      const app = new Koa();

      app.use((ctx) => {
        ctx.body = null;
      });

      const server = app.listen();

      const res = await request(server).get("/").expect(204).expect("");

      assert.strictEqual(
        Object.prototype.hasOwnProperty.call(res.headers, "Content-Type"),
        false
      );
    });

    it("should respond 204 with status=200", async () => {
      const app = new Koa();

      app.use((ctx) => {
        ctx.status = 200;
        ctx.body = null;
      });

      const server = app.listen();

      const res = await request(server).get("/").expect(204).expect("");

      assert.strictEqual(
        Object.prototype.hasOwnProperty.call(res.headers, "Content-Type"),
        false
      );
    });

    it("should respond 205 with status=205", async () => {
      const app = new Koa();

      app.use((ctx) => {
        ctx.status = 205;
        ctx.body = null;
      });

      const server = app.listen();

      const res = await request(server).get("/").expect(205).expect("");

      assert.strictEqual(
        Object.prototype.hasOwnProperty.call(res.headers, "Content-Type"),
        false
      );
    });

    it("should respond 304 with status=304", async () => {
      const app = new Koa();

      app.use((ctx) => {
        ctx.status = 304;
        ctx.body = null;
      });

      const server = app.listen();

      const res = await request(server).get("/").expect(304).expect("");

      assert.strictEqual(
        Object.prototype.hasOwnProperty.call(res.headers, "Content-Type"),
        false
      );
    });
  });

  describe("when .body is a string", () => {
    it("should respond", () => {
      const app = new Koa();

      app.use((ctx) => {
        ctx.body = "Hello";
      });

      const server = app.listen();

      return request(server).get("/").expect("Hello");
    });
  });

  describe("when .body is a Buffer", () => {
    it("should respond", () => {
      const app = new Koa();

      app.use((ctx) => {
        ctx.body = Buffer.from("Hello");
      });

      const server = app.listen();

      return request(server).get("/").expect(200).expect(Buffer.from("Hello"));
    });
  });

  describe("when .body is a Stream", () => {
    it("should respond", async () => {
      const app = new Koa();

      app.use((ctx) => {
        ctx.body = fs.createReadStream("package.json");
        ctx.set("Content-Type", "application/json; charset=utf-8");
      });

      const server = app.listen();

      const res = await request(server)
        .get("/")
        .expect("Content-Type", "application/json; charset=utf-8");

      const pkg = require("../../package");
      assert.strictEqual(
        Object.prototype.hasOwnProperty.call(res.headers, "content-length"),
        false
      );
      assert.deepStrictEqual(res.body, pkg);
    });

    it("should strip content-length when overwriting", async () => {
      const app = new Koa();

      app.use((ctx) => {
        ctx.body = "hello";
        ctx.body = fs.createReadStream("package.json");
        ctx.set("Content-Type", "application/json; charset=utf-8");
      });

      const server = app.listen();

      const res = await request(server)
        .get("/")
        .expect("Content-Type", "application/json; charset=utf-8");

      const pkg = require("../../package");
      assert.strictEqual(
        Object.prototype.hasOwnProperty.call(res.headers, "content-length"),
        false
      );
      assert.deepStrictEqual(res.body, pkg);
    });

    it("should keep content-length if not overwritten", async () => {
      const app = new Koa();

      app.use((ctx) => {
        ctx.length = fs.readFileSync("package.json").length;
        ctx.body = fs.createReadStream("package.json");
        ctx.set("Content-Type", "application/json; charset=utf-8");
      });

      const server = app.listen();

      const res = await request(server)
        .get("/")
        .expect("Content-Type", "application/json; charset=utf-8");

      const pkg = require("../../package");
      assert.strictEqual(
        Object.prototype.hasOwnProperty.call(res.headers, "content-length"),
        true
      );
      // console.log("content-length", res.headers["content-length"]);
      assert.deepStrictEqual(res.body, pkg);
    });

    it("should keep content-length if overwritten with the same stream", async () => {
      const app = new Koa();

      app.use((ctx) => {
        ctx.length = fs.readFileSync("package.json").length;
        const stream = fs.createReadStream("package.json");
        ctx.body = stream;
        ctx.body = stream;
        ctx.set("Content-Type", "application/json; charset=utf-8");
      });

      const server = app.listen();

      const res = await request(server)
        .get("/")
        .expect("Content-Type", "application/json; charset=utf-8");

      const pkg = require("../../package");
      assert.strictEqual(
        Object.prototype.hasOwnProperty.call(res.headers, "content-length"),
        true
      );
      assert.deepStrictEqual(res.body, pkg);
    });

    it("should handle errors", (done) => {
      const app = new Koa();

      app.use((ctx) => {
        ctx.set("Content-Type", "application/json; charset=utf-8");
        ctx.body = fs.createReadStream("does not exist");
      });

      const server = app.listen();

      request(server)
        .get("/")
        .expect("Content-Type", "text/plain; charset=utf-8")
        .expect(404)
        .end(done);
    });

    it("should handle errors when no content status", () => {
      const app = new Koa();

      app.use((ctx) => {
        ctx.status = 204;
        ctx.body = fs.createReadStream("does not exist");
      });

      const server = app.listen();

      return request(server).get("/").expect(204);
    });

    it("should handle all intermediate stream body errors", (done) => {
      const app = new Koa();

      app.use((ctx) => {
        ctx.body = fs.createReadStream("does not exist");
        ctx.body = fs.createReadStream("does not exist");
        ctx.body = fs.createReadStream("does not exist");
      });

      const server = app.listen();

      request(server).get("/").expect(404).end(done);
    });
  });

  describe("when .body is an Object", () => {
    it("should respond with json", () => {
      const app = new Koa();

      app.use((ctx) => {
        ctx.body = { hello: "world" };
      });

      const server = app.listen();

      return request(server)
        .get("/")
        .expect("Content-Type", "application/json; charset=utf-8")
        .expect('{"hello":"world"}');
    });
    describe("and headers sent", () => {
      it("should respond with json body and headers", () => {
        const app = new Koa();

        app.use((ctx) => {
          ctx.length = 17;
          ctx.type = "json";
          ctx.set("foo", "bar");
          ctx.res.flushHeaders();
          ctx.body = { hello: "world" };
        });

        const server = app.listen();

        return request(server)
          .get("/")
          .expect("Content-Type", "application/json; charset=utf-8")
          .expect("Content-Length", "17")
          .expect("foo", "bar")
          .expect('{"hello":"world"}');
      });
    });
  });

  describe("when an error occurs", () => {
    it('should emit "error" on the app', (done) => {
      const app = new Koa();

      app.use((ctx) => {
        throw new Error("boom");
      });

      app.on("error", (err) => {
        assert.strictEqual(err.message, "boom");
        // console.log("before done");
        done();
        // console.log("after done");
      });

      request(app.callback())
        .get("/")
        .end(() => {});
    });

    describe("with an .expose property", () => {
      it("should expose the message", () => {
        const app = new Koa();

        app.use((ctx) => {
          const err = new Error("sorry!");
          err.status = 403;
          err.expose = true;
          throw err;
        });

        return request(app.callback()).get("/").expect(403, "sorry!");
      });
    });

    describe("with a .status property", () => {
      it("should respond with .status", () => {
        const app = new Koa();

        app.use((ctx) => {
          const err = new Error("s3 explodes");
          err.status = 403;
          throw err;
        });

        return request(app.callback()).get("/").expect(403, "Forbidden");
      });
    });

    it("should respond with 500", () => {
      const app = new Koa();

      app.use((ctx) => {
        throw new Error("boom!");
      });

      const server = app.listen();

      return request(server).get("/").expect(500, "Internal Server Error");
    });

    it("should be catchable", () => {
      const app = new Koa();

      app.use((ctx, next) => {
        return next()
          .then(() => {
            ctx.body = "Hello";
          })
          .catch(() => {
            ctx.body = "Got error";
          });
      });

      app.use((ctx, next) => {
        throw new Error("boom!");
      });

      const server = app.listen();

      return request(server).get("/").expect(200, "Got error");
    });
  });

  describe("when status and body property", () => {
    it("should 200", () => {
      const app = new Koa();

      app.use((ctx) => {
        ctx.status = 304;
        ctx.body = "hello";
        ctx.status = 200;
      });

      const server = app.listen();

      return request(server).get("/").expect(200).expect("hello");
    });

    it("should 204", async () => {
      const app = new Koa();

      app.use((ctx) => {
        ctx.status = 200;
        ctx.body = "hello";
        ctx.set("content-type", "text/plain; charset=utf8");
        ctx.status = 204;
      });

      const server = app.listen();

      const res = await request(server).get("/").expect(204);

      // console.log("res.text", !!res.text);

      assert.strictEqual(
        Object.prototype.hasOwnProperty.call(res.headers, "Content-Type"),
        false
      );
    });
  });

  describe("with explicit null body", () => {
    it("should preserve given status", async () => {
      const app = new Koa();

      app.use((ctx) => {
        ctx.body = null;
        ctx.status = 404;
      });

      const server = app.listen();

      let res = await request(server)
        .get("/")
        .expect(404)
        .expect("")
        .expect({});

      // console.log("res.text", res.text);
      return;
    });
    it("should respond with correct headers", async () => {
      const app = new Koa();

      app.use((ctx) => {
        ctx.body = null;
        ctx.status = 401;
      });

      const server = app.listen();

      const res = await request(server)
        .get("/")
        .expect(401)
        .expect("")
        .expect({});

      assert.equal(
        Object.prototype.hasOwnProperty.call(res.headers, "transfer-encoding"),
        false
      );
      assert.equal(
        Object.prototype.hasOwnProperty.call(res.headers, "Content-Type"),
        false
      );
      assert.equal(
        Object.prototype.hasOwnProperty.call(res.headers, "content-length"),
        true
      );
    });

    it("should return content-length equal to 0", async () => {
      const app = new Koa();

      app.use((ctx) => {
        ctx.body = null;
        ctx.status = 401;
      });

      const server = app.listen();

      const res = await request(server)
        .get("/")
        .expect(401)
        .expect("")
        .expect({});

      assert.equal(res.headers["content-length"], 0);
    });
    it("should not overwrite the content-length", async () => {
      const app = new Koa();

      app.use((ctx) => {
        ctx.body = null;
        ctx.length = 10;
        ctx.status = 404;
      });

      const server = app.listen();

      const res = await request(server)
        .get("/")
        .expect(404)
        .expect("")
        .expect({});

      assert.equal(res.headers["content-length"], 0);
    });
  });
});

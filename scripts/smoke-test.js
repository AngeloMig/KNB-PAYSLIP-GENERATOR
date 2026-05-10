const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map((match) => match[1])
  .filter((script) => script.trim());

const fields = Object.create(null);

function field(id, value = "") {
  fields[id] = {
    id,
    value,
    dataset: {},
    classList: {
      add() {},
      remove() {},
      toggle() {}
    }
  };
}

[
  "basicSalary", "basicPay", "overtimePay", "bonuses", "allowances",
  "withholdingTax", "sssDeduction", "philhealthDeduction", "pagibigDeduction",
  "taxDeduction", "lateDeduction", "otherDeductions", "periodStart",
  "periodEnd", "paymentDate", "employeeName"
].forEach((id) => field(id));

const sandbox = {
  console,
  window: { scrollTo() {} },
  navigator: { platform: "Win32" },
  localStorage: {
    getItem() { return null; },
    setItem() {},
    removeItem() {}
  },
  document: {
    addEventListener() {},
    getElementById(id) {
      if (!fields[id]) field(id);
      return fields[id];
    },
    querySelector(selector) {
      const match = selector.match(/^label\[for="(.+)"\]$/);
      if (match) return { textContent: match[1] };
      return null;
    },
    querySelectorAll() {
      return [];
    },
    createElement() {
      return {
        className: "",
        classList: { add() {}, remove() {}, toggle() {} },
        append() {},
        appendChild() {},
        remove() {},
        style: {},
        dataset: {}
      };
    },
    body: { appendChild() {}, removeChild() {} },
    documentElement: { setAttribute() {}, getAttribute() { return "dark"; } }
  },
  requestAnimationFrame(fn) { fn(); },
  setTimeout(fn) { return fn(); },
  clearTimeout() {},
  setInterval() {}
};

vm.createContext(sandbox);
scripts.forEach((script) => vm.runInContext(script, sandbox));

assert.strictEqual(sandbox.computeSSS(35000), 1750);
assert.strictEqual(sandbox.computeSSS(3000), 250);
assert.strictEqual(sandbox.computePhilHealth(10000), 250);
assert.strictEqual(sandbox.computePhilHealth(100000), 2500);
assert.strictEqual(sandbox.computePagIbig(10000), 200);
assert.strictEqual(sandbox.computeWithholdingTaxMonthly(20833), 0);
assert.strictEqual(sandbox.computeSchedule("second", "2026-12").payment, "2027-01-05");

fields.basicPay.value = "-1";
assert.deepStrictEqual(
  Array.from(sandbox.getValidationErrors(), (err) => err.field),
  ["basicPay"]
);

fields.basicPay.value = "1000";
fields.periodStart.value = "2026-05-15";
fields.periodEnd.value = "2026-05-01";
fields.paymentDate.value = "2026-05-10";
assert.deepStrictEqual(
  Array.from(sandbox.getValidationErrors(), (err) => err.field),
  ["periodEnd", "paymentDate"]
);

console.log("smoke tests passed");

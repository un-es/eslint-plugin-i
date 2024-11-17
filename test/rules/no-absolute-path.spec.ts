import path from 'node:path'

import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'
import type { TestCaseError as TSESLintTestCaseError } from '@typescript-eslint/rule-tester'

import { createRuleTestCaseFunctions, parsers } from '../utils'
import type { GetRuleModuleMessageIds } from '../utils'

import rule from 'eslint-plugin-import-x/rules/no-absolute-path'

const ruleTester = new TSESLintRuleTester()

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

const ABSOLUTE_ERROR: TSESLintTestCaseError<
  GetRuleModuleMessageIds<typeof rule>
> = {
  messageId: 'absolute',
}

const absolutePath = (testPath: string) => path.join(__dirname, testPath)

ruleTester.run('no-absolute-path', rule, {
  valid: [
    tValid({ code: 'import _ from "lodash"' }),
    tValid({ code: 'import find from "lodash.find"' }),
    tValid({ code: 'import foo from "./foo"' }),
    tValid({ code: 'import foo from "../foo"' }),
    tValid({ code: 'import foo from "foo"' }),
    tValid({ code: 'import foo from "./"' }),
    tValid({ code: 'import foo from "@scope/foo"' }),
    tValid({ code: 'var _ = require("lodash")' }),
    tValid({ code: 'var find = require("lodash.find")' }),
    tValid({ code: 'var foo = require("./foo")' }),
    tValid({ code: 'var foo = require("../foo")' }),
    tValid({ code: 'var foo = require("foo")' }),
    tValid({ code: 'var foo = require("./")' }),
    tValid({ code: 'var foo = require("@scope/foo")' }),

    tValid({ code: 'import events from "events"' }),
    tValid({ code: 'import path from "path"' }),
    tValid({ code: 'var events = require("events")' }),
    tValid({ code: 'var path = require("path")' }),
    tValid({ code: 'import path from "path";import events from "events"' }),

    // still works if only `amd: true` is provided
    tValid({
      code: 'import path from "path"',
      options: [{ amd: true }],
    }),

    // amd not enabled by default
    tValid({ code: 'require(["/some/path"], function (f) { /* ... */ })' }),
    tValid({
      code: 'define(["/some/path"], function (f) { /* ... */ })',
      languageOptions: { parser: require(parsers.ESPREE) },
    }),
    tValid({
      code: 'require(["./some/path"], function (f) { /* ... */ })',
      options: [{ amd: true }],
    }),
    tValid({
      code: 'define(["./some/path"], function (f) { /* ... */ })',
      options: [{ amd: true }],
    }),
  ],
  invalid: [
    tInvalid({
      code: `import f from "${absolutePath('/foo')}"`,
      filename: absolutePath('/foo/bar/index.js'),
      errors: [ABSOLUTE_ERROR],
      output: 'import f from ".."',
    }),
    tInvalid({
      code: `import f from "${absolutePath('/foo/bar/baz.js')}"`,
      filename: absolutePath('/foo/bar/index.js'),
      errors: [ABSOLUTE_ERROR],
      output: 'import f from "./baz.js"',
    }),
    tInvalid({
      code: `import f from "${absolutePath('/foo/path')}"`,
      filename: absolutePath('/foo/bar/index.js'),
      errors: [ABSOLUTE_ERROR],
      output: 'import f from "../path"',
    }),
    tInvalid({
      code: `import f from "${absolutePath('/some/path')}"`,
      filename: absolutePath('/foo/bar/index.js'),
      errors: [ABSOLUTE_ERROR],
      output: 'import f from "../../some/path"',
    }),
    tInvalid({
      code: `import f from "${absolutePath('/some/path')}"`,
      filename: absolutePath('/foo/bar/index.js'),
      options: [{ amd: true }],
      errors: [ABSOLUTE_ERROR],
      output: 'import f from "../../some/path"',
    }),
    tInvalid({
      code: `var f = require("${absolutePath('/foo')}")`,
      filename: absolutePath('/foo/bar/index.js'),
      errors: [ABSOLUTE_ERROR],
      output: 'var f = require("..")',
    }),
    tInvalid({
      code: `var f = require("${absolutePath('/foo/path')}")`,
      filename: absolutePath('/foo/bar/index.js'),
      errors: [ABSOLUTE_ERROR],
      output: 'var f = require("../path")',
    }),
    tInvalid({
      code: `var f = require("${absolutePath('/some/path')}")`,
      filename: absolutePath('/foo/bar/index.js'),
      errors: [ABSOLUTE_ERROR],
      output: 'var f = require("../../some/path")',
    }),
    tInvalid({
      code: `var f = require("${absolutePath('/some/path')}")`,
      filename: absolutePath('/foo/bar/index.js'),
      options: [{ amd: true }],
      errors: [ABSOLUTE_ERROR],
      output: 'var f = require("../../some/path")',
    }),
    // validate amd
    tInvalid({
      code: `require(["${absolutePath('/some/path')}"], function (f) { /* ... */ })`,
      filename: absolutePath('/foo/bar/index.js'),
      options: [{ amd: true }],
      errors: [ABSOLUTE_ERROR],
      output: 'require(["../../some/path"], function (f) { /* ... */ })',
    }),
    tInvalid({
      code: `define(["${absolutePath('/some/path')}"], function (f) { /* ... */ })`,
      filename: absolutePath('/foo/bar/index.js'),
      languageOptions: { parser: require(parsers.ESPREE) },
      options: [{ amd: true }],
      errors: [ABSOLUTE_ERROR],
      output: 'define(["../../some/path"], function (f) { /* ... */ })',
    }),
  ],
})

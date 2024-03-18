import path from 'path'

import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import { minimatch } from 'minimatch'

import type { RuleContext } from '../types'
import { pkgUp } from '../utils/pkg-up'
import { createRule } from '../utils'

function getEntryPoint(context: RuleContext) {
  const pkgPath = pkgUp({
    cwd: context.getPhysicalFilename
      ? context.getPhysicalFilename()
      : context.getFilename(),
  })!
  try {
    return require.resolve(path.dirname(pkgPath))
  } catch (error) {
    // Assume the package has no entrypoint (e.g. CLI packages)
    // in which case require.resolve would throw.
    return null
  }
}

function findScope(context: RuleContext, identifier: string) {
  const { scopeManager } = context.getSourceCode()
  return scopeManager?.scopes
    .slice()
    .reverse()
    .find(scope =>
      scope.variables.some(variable =>
        variable.identifiers.some(node => node.name === identifier),
      ),
    )
}

function findDefinition(objectScope: TSESLint.Scope.Scope, identifier: string) {
  const variable = objectScope.variables.find(
    variable => variable.name === identifier,
  )!
  return variable.defs.find(
    def => 'name' in def.name && def.name.name === identifier,
  )
}

type Options = {
  exceptions?: string[]
}

type MessageId = 'notAllowed'

export = createRule<[Options?], MessageId>({
  name: 'no-import-module-exports',
  meta: {
    type: 'problem',
    docs: {
      category: 'Module systems',
      description: 'Forbid import statements with CommonJS module.exports.',
      recommended: true,
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          exceptions: { type: 'array' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      notAllowed:
        "Cannot use import declarations in modules that export using CommonJS (module.exports = 'foo' or exports.bar = 'hi')",
    },
  },
  defaultOptions: [],
  create(context) {
    const importDeclarations: TSESTree.ImportDeclaration[] = []
    const entryPoint = getEntryPoint(context)
    const options = context.options[0] || {}

    let alreadyReported = false

    return {
      ImportDeclaration(node) {
        importDeclarations.push(node)
      },
      MemberExpression(node) {
        if (alreadyReported) {
          return
        }

        const fileName = context.getPhysicalFilename
          ? context.getPhysicalFilename()
          : context.getFilename()
        const isEntryPoint = entryPoint === fileName
        const isIdentifier = node.object.type === 'Identifier'

        if (!('name' in node.object)) {
          return
        }

        const hasKeywords = /^(module|exports)$/.test(node.object.name)
        const objectScope = hasKeywords
          ? findScope(context, node.object.name)
          : undefined
        const variableDefinition =
          objectScope && findDefinition(objectScope, node.object.name)

        const isImportBinding = variableDefinition?.type === 'ImportBinding'
        const hasCJSExportReference =
          hasKeywords && (!objectScope || objectScope.type === 'module')
        const isException =
          !!options.exceptions &&
          options.exceptions.some(glob => minimatch(fileName, glob))

        if (
          isIdentifier &&
          hasCJSExportReference &&
          !isEntryPoint &&
          !isException &&
          !isImportBinding
        ) {
          importDeclarations.forEach(importDeclaration => {
            context.report({
              node: importDeclaration,
              messageId: 'notAllowed',
            })
          })
          alreadyReported = true
        }
      },
    }
  },
})
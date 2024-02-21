/* eslint-disable @typescript-eslint/no-var-requires */
const commonJs = require('@rollup/plugin-commonjs')
const fs = require('fs')
const nodeResolve = require('@rollup/plugin-node-resolve')
const terser = require('@rollup/plugin-terser')
const autoExternal = require('rollup-plugin-auto-external')
const typescript = require('rollup-plugin-typescript2')
/* eslint-enable @typescript-eslint/no-var-requires */

const OUTPUT_DIRECTORY = 'dist'
const MINIFY = process.env.MINIFY === 'true'
const commonPlugins = MINIFY
  ? [autoExternal(), typescript(), terser()]
  : [autoExternal(), typescript()]

module.exports = [
  {
    input: 'src/cloudfront-function/viewer-request.ts',
    output: {
      file: `${OUTPUT_DIRECTORY}/viewer-request.js`,
      format: 'cjs',
      name: 'handler',
    },
    plugins: [
      ...commonPlugins,
      {
        // Required since cff does not support export (needed testing)
        name: 'export-handler-fix',
        writeBundle: (bundle) => {
          const encoding = { encoding: 'utf8' }
          let finalViewerRequestOutput = fs.readFileSync(
            `${OUTPUT_DIRECTORY}/viewer-request.js`,
            encoding,
          )
          const functionDefinitionMatches = finalViewerRequestOutput.match(
            MINIFY
              ? /exports\.handler=async\s?(.+)=>\{/
              : /^const handler\s?=\s?async \((.+)\).*{/m,
          )
          if (
            functionDefinitionMatches?.[1] &&
            typeof functionDefinitionMatches[1] === 'string'
          ) {
            if (!MINIFY)
              finalViewerRequestOutput = finalViewerRequestOutput.replaceAll(
                'exports.handler = handler;',
                '',
              )
            finalViewerRequestOutput = finalViewerRequestOutput.replace(
              functionDefinitionMatches[0],
              'async function handler(event) {'.replace(
                'event',
                functionDefinitionMatches[1],
              ),
            )
          }
          fs.writeFileSync(
            `${OUTPUT_DIRECTORY}/viewer-request.js`,
            finalViewerRequestOutput,
            encoding,
          )
        },
      },
    ],
  },
  {
    input: 'src/edge/origin-response.ts',
    output: {
      file: `${OUTPUT_DIRECTORY}/origin-response.js`,
      format: 'cjs',
    },
    plugins: commonPlugins,
  },
  {
    input: 'src/api-gateway/store-message.ts',
    output: {
      file: `${OUTPUT_DIRECTORY}/store-message.js`,
      format: 'cjs',
    },
    plugins: commonPlugins,
  },
  {
    input: 'src/ses-s3/forward-email.ts',
    output: {
      file: `${OUTPUT_DIRECTORY}/forward-email.js`,
      format: 'cjs',
    },
    plugins: [
      autoExternal({
        dependencies: false,
        peerDependencies: true,
      }),
      nodeResolve(),
      commonJs(),
      typescript(),
      MINIFY ? terser() : null,
    ],
  },
]

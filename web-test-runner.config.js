import {esbuildPlugin} from '@web/dev-server-esbuild'
export default {
  files: ['test/*'],
  nodeResolve: true,
  plugins: [esbuildPlugin({ts: true, target: 'es2020'})],
  testFramework: {
    config: {
      ui: 'tdd',
      timeout: 500
    }
  }
}

console.log('rollup')

export default {
  input: 'packages/pvue/index',
  output: {
    file: 'lib/bundle.js',
    format: 'cjs',
  },
}

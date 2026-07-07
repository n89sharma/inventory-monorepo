/** dependency-cruiser config — React component/module graphs. See `npm run graph`. */
module.exports = {
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.app.json' },
    tsPreCompilationDeps: true,
    exclude: { path: '\\.(test|spec)\\.tsx?$' },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/(?:@[^/]+/[^/]+|[^/]+)',
        theme: {
          graph: { rankdir: 'LR', splines: 'ortho', bgcolor: 'white' },
          node: { shape: 'box', style: 'rounded,filled', fillcolor: '#ffffff' },
        },
      },
    },
  },
}

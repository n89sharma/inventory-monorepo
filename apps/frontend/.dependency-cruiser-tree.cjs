/** Rooted, top-down dependency tree for a single component. See `npm run graph:tree`. */
const SHADCN = 'src/components/shadcn'
const EXTERNAL = '(?:node_modules|packages/shared-types)'
const ROOT = 'search-instock-page\\.tsx$'

module.exports = {
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.app.json' },
    tsPreCompilationDeps: true,
    exclude: { path: '\\.(test|spec)\\.tsx?$' },
    reporterOptions: {
      dot: {
        collapsePattern: '(node_modules/(?:@[^/]+/[^/]+|[^/]+))|(packages/shared-types)',
        theme: {
          graph: { rankdir: 'TB', splines: 'true', bgcolor: 'white', ranksep: '0.6' },
          node: { shape: 'box', style: 'rounded,filled', fillcolor: '#ffffff' },
          edge: { arrowhead: 'vee', color: '#94a3b8' },
          modules: [
            { criteria: { source: ROOT }, attributes: { fillcolor: '#bbf7d0', penwidth: 2 } },
            { criteria: { source: SHADCN }, attributes: { fillcolor: '#bae6fd' } },
            { criteria: { source: EXTERNAL }, attributes: { fillcolor: '#e5e7eb', shape: 'cylinder' } },
          ],
        },
      },
    },
  },
}

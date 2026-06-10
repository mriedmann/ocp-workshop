import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    allowedHosts: true
  },
  plugins: [
    {
      // getSlidePath() in @slidev/client builds route paths as `${BASE_URL}${no}`.
      // When deployed to a subdirectory, BASE_URL = '/ocp-workshop/' and Vue Router
      // *also* prepends the base when generating browser URLs — doubling it.
      // Fix: replace BASE_URL with '/' only in that one file so router.push()
      // receives '/5' and Vue Router generates the correct URL itself.
      name: 'fix-slidev-route-base',
      enforce: 'pre',
      transform(code, id) {
        if (/node_modules\/@slidev\/client.*logic[/\\]slides/.test(id)) {
          return code.replace(/import\.meta\.env\.BASE_URL/g, '"/"')
        }
      },
    },
  ],
})

/* import * as singleSpa from 'single-spa'

singleSpa.registerApplication({
  name: 'app1',
  app: () => import('./app1/app1.js'),
  activeWhen: '#app1'
})
singleSpa.registerApplication({
  name: 'app2',
  app: () => import('./app2/app2.js'),
  activeWhen: '#app2'
})

singleSpa.start() */

import { registerApplication, start } from './utils/my-spa'

registerApplication({
  name: 'app1',
  app: () => import('./app1/app1.js'),
  activeWhen: (location) => location.href.includes('#app1')
})

registerApplication({
  name: 'app2',
  app: () => import('./app2/app2.js'),
  activeWhen: (location) => location.href.includes('#app2')
})

start()

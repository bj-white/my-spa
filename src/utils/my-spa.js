let apps = []
export function registerApplication ({name, app, activeWhen, customProps}) {
  apps.push({
    name,
    activeWhen,
    loadApp: app,
    customProps: customProps || {},
    status: 'NOT_LOADED'
  })
}

/*  */
let started = false
export function start () {
  started = true
  window.addEventListener('popstate', () => {
    reroute()
  })
  window.history.pushState = patchedUpdateState(window.history.pushState)
  window.history.replaceState = patchedUpdateState(window.history.replaceState)
  reroute()
}

function patchedUpdateState (originalMethod) {
  return function () {
    const urlBefore = window.location.href
    const result = originalMethod.apply(this, arguments)
    const urlAfter = window.location.href
    if (urlBefore !== urlAfter) {
      reroute()
    }
    return result
  }
}

/*  */
function getAppChanges () {
  const appsToUnmount = [], appsToLoad = [], appsToMount = []
  apps.forEach((app) => {
    const appShouldBeActive = shouldBeActive(app)
    switch (app.status) {
      case 'LOAD_ERROR': // 应用的加载功能返回了一个 rejected 的 Promise
      case 'NOT_LOADED': // 应用注册了，还未加载
      case 'LOADING_SOURCE_CODE': // 应用代码正在被拉取
        if (appShouldBeActive) {
          appsToLoad.push(app)
        }
        break
      case 'NOT_BOOTSTRAPPED': // 应用已经加载，还未初始化
      case 'NOT_MOUNTED': // 应用已经加载和初始化，还未挂载
        if (appShouldBeActive) {
          appsToMount.push(app)
        }
        break
      case 'MOUNTED': // 应用目前处于激活状态，已经挂载到 DOM 元素上
        if (!appShouldBeActive) {
          appsToUnmount.push(app)
        }
        break
    }
  })
  return {
    appsToUnmount,
    appsToLoad,
    appsToMount
  }
}

function shouldBeActive (app) {
  try {
    return app.activeWhen(window.location)
  } catch (err) {
    return false
  }
}

/*  */
let appChangeUnderway = false // 判断应用状态是否在变更中
let waitingOnAppChange = false // 应用状态在变更过程reroute是否被再次调用

async function reroute () {
  console.log('reroute...................')
  if (!started) {
    return
  }

  if (appChangeUnderway) {
    waitingOnAppChange = true
    return
  }

  const { appsToUnmount, appsToLoad, appsToMount } = getAppChanges()
  appChangeUnderway = true

  // 卸载应用
  const unmountPromises = appsToUnmount.map(toUnmountPromise)
  await Promise.all(unmountPromises)

  // 挂载应用
  const mountPromises = appsToMount.map(bootstrapAndMount)
  await Promise.all(mountPromises)

  // 加载应用
  const loadPromises = appsToLoad.map((app) => {
    return toLoadPromise(app).then(bootstrapAndMount)
  })
  await Promise.all(loadPromises)

  appChangeUnderway = false;
}

async function toBootstrapPromise (app) {
  if (app.status !== 'NOT_BOOTSTRAPPED') {
    return app
  }
  app.status = 'BOOTSTRAPPING'
  try {
    await app.bootstrap(app.customProps)
    app.status = 'NOT_MOUNTED'
  } catch (error) {
    console.log(error)
    app.status = 'SKIP_BECAUSE_BROKEN'
  }
}

async function bootstrapAndMount (app) {
  if (shouldBeActive(app)) {
    await toBootstrapPromise(app)
    if (shouldBeActive(app)) {
      return await toMountPromise(app)
    }
  }
  return app
}

async function toMountPromise (app) {
  if (app.status !== 'NOT_MOUNTED') {
    return app
  }
  app.status = 'MOUNTING'
  try {
    await app.mount(app.customProps)
    app.status = 'MOUNTED'
  } catch (error) {
    console.log(error)
    app.status = 'SKIP_BECAUSE_BROKEN'
  }
  return app
}

async function toLoadPromise (app) {
  const { loadPromise, status } = app
  if (loadPromise) {
    return loadPromise
  }
  if (!['NOT_LOADED', 'LOAD_ERROR'].includes(status)) {
    return app
  }
  app.status = 'LOADING_SOURCE_CODE'
  try {
    app.loadPromise = app.loadApp(app.customProps)
    const res = await app.loadPromise
    app.status = 'NOT_BOOTSTRAPPED'
    app.bootstrap = res.bootstrap
    app.mount = res.mount
    app.unmount = res.unmount
  } catch (error) {
    console.log(error)
    app.status = 'LOAD_ERROR'
  }
  delete app.loadPromise
  return app
}

async function toUnmountPromise (app) {
  const { status, unmount } = app
  if (status !== 'MOUNTED') {
    return app
  }
  app.status = 'UNMOUNTING'
  try {
    await unmount(app.customProps)
    app.status = 'NOT_MOUNTED'
  } catch (error) {
    console.log(error)
    app.status = 'SKIP_BECAUSE_BROKEN'
  }
  return app
}

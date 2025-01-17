/*global Web3*/

// need to make sure we aren't affected by overlapping namespaces
// and that we dont affect the app with our namespace
// mostly a fix for web3's BigNumber if AMD's "define" is defined...
let __define

/**
 * Caches reference to global define object and deletes it to
 * avoid conflicts with other global define objects, such as
 * AMD's define function
 */
const cleanContextForImports = () => {
  __define = global.define
  try {
    global.define = undefined
  } catch (_) {
    console.warn('KardiaChain Wallet - global.define could not be deleted.')
  }
}

/**
 * Restores global define object from cached reference
 */
const restoreContextAfterImports = () => {
  try {
    global.define = __define
  } catch (_) {
    console.warn('KardiaChain Wallet - global.define could not be overwritten.')
  }
}

cleanContextForImports()

import log from 'loglevel'
import LocalMessageDuplexStream from 'post-message-stream'
import MetamaskInpageProvider from './kardiaScript/kai-wallet-inpage-provider'

// TODO:deprecate:Q1-2020
import 'web3/dist/web3.min.js'

import setupDappAutoReload from './lib/auto-reload.js'

restoreContextAfterImports()

log.setDefaultLevel(process.env.METAMASK_DEBUG ? 'debug' : 'warn')

//
// setup plugin communication
//

// setup background connection
const metamaskStream = new LocalMessageDuplexStream({
  name: 'kai-inpage',
  target: 'kai-contentscript',
})

// compose the inpage provider
const inpageProvider = new MetamaskInpageProvider(metamaskStream)

// set a high max listener count to avoid unnecesary warnings
inpageProvider.setMaxListeners(100)

// Work around for web3@1.0 deleting the bound `sendAsync` but not the unbound
// `sendAsync` method on the prototype, causing `this` reference issues
const proxiedInpageProvider = new Proxy(inpageProvider, {
  // straight up lie that we deleted the property so that it doesnt
  // throw an error in strict mode
  deleteProperty: () => true,
})

//
// TODO:deprecate:Q1-2020
//

// setup web3

const web3 = new Web3(proxiedInpageProvider)
web3.setProvider = function () {
  log.debug('KardiaChain Wallet - overrode web3.setProvider')
}
log.debug('KardiaChain Wallet - injected web3')

proxiedInpageProvider._web3Ref = web3.eth

setupDappAutoReload(web3, inpageProvider.publicConfigStore)

//
// end deprecate:Q1-2020
//

window.kardiachain = proxiedInpageProvider

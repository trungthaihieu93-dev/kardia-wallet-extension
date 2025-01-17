const { EventEmitter } = require('events')
const ethUtil = require('ethereumjs-util')
const Transaction = require('ethereumjs-tx')
const HDKey = require('hdkey')
const TrezorConnect = require('trezor-connect').default
const hdPathString = `m/44'/60'/0'/0`
const keyringType = 'Trezor Hardware'
const pathBase = 'm'
const MAX_INDEX = 1000
const DELAY_BETWEEN_POPUPS = 1000
const TREZOR_CONNECT_MANIFEST = {
  email: 'support@metamask.io',
  appUrl: 'https://metamask.io',
}

class TrezorKeyring extends EventEmitter {
  constructor (opts = {}) {
    super()
    this.type = keyringType
    this.accounts = []
    this.hdk = new HDKey()
    this.page = 0
    this.perPage = 5
    this.unlockedAccount = 0
    this.paths = {}
    this.deserialize(opts)
    TrezorConnect.manifest(TREZOR_CONNECT_MANIFEST)
  }

  serialize () {
    return Promise.resolve({
      hdPath: this.hdPath,
      accounts: this.accounts,
      page: this.page,
      paths: this.paths,
      perPage: this.perPage,
      unlockedAccount: this.unlockedAccount,
    })
  }

  deserialize (opts = {}) {
    this.hdPath = opts.hdPath || hdPathString
    this.accounts = opts.accounts || []
    this.page = opts.page || 0
    this.perPage = opts.perPage || 5
    return Promise.resolve()
  }

  isUnlocked () {
    return !!(this.hdk && this.hdk.publicKey)
  }

  unlock () {
    if (this.isUnlocked()) return Promise.resolve('already unlocked')
    return new Promise((resolve, reject) => {
      TrezorConnect.getPublicKey({
          path: this.hdPath,
          coin: 'ETH',
        }).then(response => {
          if (response.success) {
            this.hdk.publicKey = new Buffer(response.payload.publicKey, 'hex')
            this.hdk.chainCode = new Buffer(response.payload.chainCode, 'hex')
            resolve('just unlocked')
          } else {
            reject(new Error(response.payload && response.payload.error || 'Unknown error'))
          }
        }).catch(e => {
          reject(new Error(e && e.toString() || 'Unknown error'))
        })
    })
  }

  setAccountToUnlock (index) {
    this.unlockedAccount = parseInt(index, 10)
  }

  addAccounts (n = 1) {

    return new Promise((resolve, reject) => {
      this.unlock()
        .then(_ => {
          const from = this.unlockedAccount
          const to = from + n
          // do not clear previous accounts on adding
          // this.accounts = []

          for (let i = from; i < to; i++) {
            const address = this._addressFromIndex(pathBase, i)
            if (!this.accounts.includes(address)) {
              this.accounts.push(address)
            }
            this.page = 0
          }
          resolve(this.accounts)
        })
        .catch(e => {
          reject(e)
        })
    })
  }

  getFirstPage () {
    this.page = 0
    return this.__getPage(1)
  }

  getNextPage () {
    return this.__getPage(1)
  }

  getPreviousPage () {
    return this.__getPage(-1)
  }

  __getPage (increment) {
    this.page += increment

    if (this.page <= 0) { this.page = 1 }

    return new Promise((resolve, reject) => {
      this.unlock()
        .then(_ => {

          const from = (this.page - 1) * this.perPage
          const to = from + this.perPage

          const accounts = []

          for (let i = from; i < to; i++) {
            const address = this._addressFromIndex(pathBase, i)
             accounts.push({
              address: address,
              balance: null,
              index: i,
            })
            this.paths[ethUtil.toChecksumAddress(address)] = i

          }
          resolve(accounts)
        })
        .catch(e => {
          reject(e)
        })
    })
  }

  getAccounts () {
    return Promise.resolve(this.accounts.slice())
  }

  removeAccount (address) {
    if (!this.accounts.map(a => a.toLowerCase()).includes(address.toLowerCase())) {
      throw new Error(`Address ${address} not found in this keyring`)
    }
    this.accounts = this.accounts.filter(a => a.toLowerCase() !== address.toLowerCase())
  }

  // tx is an instance of the ethereumjs-transaction class.
  signTransaction (address, tx) {
      return new Promise((resolve, reject) => {
        this.unlock()
          .then(status => {
            setTimeout(_ => {
              const _txParams = {
                to: this._normalize(tx.receiver),
                value: this._normalize(tx.amount),
                data: this._normalize(tx.data),
                nonce: this._normalize(tx.nonce),
                gasLimit: this._normalize(tx.gas),
                gasPrice: this._normalize(tx.gasPrice ? Number(tx.gasPrice) * 10 ** 9 : 10 ** 9),
              }
              TrezorConnect.ethereumSignTransaction({
                path: this._pathFromAddress(address),
                transaction: _txParams,
              }).then(response => {
                if (response.success) {

                  const signedTx = new Transaction(_txParams)
                  signedTx.v = response.payload.v
                  signedTx.r = response.payload.r
                  signedTx.s = response.payload.s

                  const addressSignedWith = ethUtil.toChecksumAddress(`0x${signedTx.from.toString('hex')}`)
                  const correctAddress = ethUtil.toChecksumAddress(address)
                  if (addressSignedWith !== correctAddress) {
                    reject(new Error('signature doesnt match the right address'))
                  }
                  resolve(signedTx)
                } else {
                  console.log('Trezor fail')
                  console.log('Trezor fail response', response)
                  reject(new Error(response.payload && response.payload.error || 'Unknown error'))
                }

              }).catch(e => {
                reject(new Error(e && e.toString() || 'Unknown error'))
              })

            // This is necessary to avoid popup collision
            // between the unlock & sign trezor popups
            }, status === 'just unlocked' ? DELAY_BETWEEN_POPUPS : 0)

          }).catch(e => {
            reject(new Error(e && e.toString() || 'Unknown error'))
          })
      })
  }

  signMessage (withAccount, data) {
    return this.signPersonalMessage(withAccount, data)
  }

  // For personal_sign, we need to prefix the message:
  signPersonalMessage (withAccount, message) {
    return new Promise((resolve, reject) => {
      this.unlock()
          .then(status => {
            setTimeout(_ => {
              TrezorConnect.ethereumSignMessage({
                path: this._pathFromAddress(withAccount),
                message: ethUtil.stripHexPrefix(message),
                hex: true,
              }).then(response => {
                if (response.success) {
                  if (response.payload.address !== ethUtil.toChecksumAddress(withAccount)) {
                    reject(new Error('signature doesnt match the right address'))
                  }
                  const signature = `0x${response.payload.signature}`
                  resolve(signature)
                } else {
                  reject(new Error(response.payload && response.payload.error || 'Unknown error'))
                }
              }).catch(e => {
                console.log('Error while trying to sign a message ', e)
                reject(new Error(e && e.toString() || 'Unknown error'))
              })
            // This is necessary to avoid popup collision
            // between the unlock & sign trezor popups
            }, status === 'just unlocked' ? DELAY_BETWEEN_POPUPS : 0)
          }).catch(e => {
            console.log('Error while trying to sign a message ', e)
            reject(new Error(e && e.toString() || 'Unknown error'))
          })
    })
  }

  signTypedData (withAccount, typedData) {
    // Waiting on trezor to enable this
    return Promise.reject(new Error('Not supported on this device'))
  }

  exportAccount (address) {
    return Promise.reject(new Error('Not supported on this device'))
  }

  forgetDevice (clearAccounts) {
    let accountsToForget = []
    if (clearAccounts) {
      accountsToForget = this.accounts
      this.accounts = []
    }
    this.hdk = new HDKey()
    this.page = 0
    this.unlockedAccount = 0
    this.paths = {}
    return accountsToForget
  }

  setHdPath (hdPath) {
    // Reset HDKey if the path changes
    if (this.hdPath !== hdPath) {
      this.hdk = new HDKey()
    }
    this.hdPath = hdPath
  }

  /* PRIVATE METHODS */

  _normalize (buf) {
    return ethUtil.bufferToHex(buf).toString()
  }

  _addressFromIndex (pathBase, i) {
    const dkey = this.hdk.derive(`${pathBase}/${i}`)
    const address = ethUtil
      .publicToAddress(dkey.publicKey, true)
      .toString('hex')
    return ethUtil.toChecksumAddress(address)
  }

  _pathFromAddress (address) {
    const checksummedAddress = ethUtil.toChecksumAddress(address)
    let index = this.paths[checksummedAddress]
    if (typeof index === 'undefined') {
      for (let i = 0; i < MAX_INDEX; i++) {
        if (checksummedAddress === this._addressFromIndex(pathBase, i)) {
          index = i
          break
        }
      }
    }

    if (typeof index === 'undefined') {
      throw new Error('Unknown address')
    }
    return `${this.hdPath}/${index}`
  }
}

TrezorKeyring.type = keyringType
module.exports = TrezorKeyring

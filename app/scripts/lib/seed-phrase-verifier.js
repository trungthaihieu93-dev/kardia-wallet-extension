import KeyringController from '../kardiaScript/kardia-keychain-controller'
const { getDPath } = require('../../../old-ui/app/util')

const seedPhraseVerifier = {

  /**
   * Verifies if the seed words can restore the accounts.
   *
   * Key notes:
   * - The seed words can recreate the primary keyring and the accounts belonging to it.
   * - The created accounts in the primary keyring are always the same.
   * - The keyring always creates the accounts in the same sequence.
   *
   * @param {array} createdAccounts The accounts to restore
   * @param {string} seedWords The seed words to verify
   * @returns {Promise<void>} Promises undefined
   *
  */
  verifyAccounts (createdAccounts, seedWords, network, isCreatedWithCorrectDPath) {
    return new Promise((resolve, reject) => {

      if (!createdAccounts || createdAccounts.length < 1) {
        return reject(new Error('No created accounts defined.'))
      }

      const dPath = getDPath(network, isCreatedWithCorrectDPath)
      const keyringController = new KeyringController({})
      const Keyring = keyringController.getKeyringClassForType('HD Key Tree')
      const opts = {
        mnemonic: seedWords,
        numberOfAccounts: createdAccounts.length,
        hdPath: dPath,
      }

      const keyring = new Keyring(opts)
      keyring.getAccounts()
        .then((restoredAccounts) => {

          if (restoredAccounts.length !== createdAccounts.length) {
            // this should not happen...
            return reject(new Error('Wrong number of accounts'))
          }

          for (let i = 0; i < restoredAccounts.length; i++) {
            if (restoredAccounts[i].toLowerCase() !== createdAccounts[i].toLowerCase()) {
              return reject(new Error('Not identical accounts! Original: ' + createdAccounts[i] + ', Restored: ' + restoredAccounts[i]))
            }
          }
          return resolve()
        })
    })
  },
}

export default seedPhraseVerifier

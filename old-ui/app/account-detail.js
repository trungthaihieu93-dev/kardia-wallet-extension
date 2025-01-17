const inherits = require('util').inherits
const extend = require('xtend')
const Component = require('react').Component
const h = require('react-hyperscript')
const connect = require('react-redux').connect
const actions = require('../../ui/app/actions')
const { getCurrentKeyring, ifContractAcc, valuesFor, toChecksumAddress, ifLooseAcc } = require('./util')
const Identicon = require('./components/identicon')
const EthBalance = require('./components/eth-balance')
const TransactionList = require('./components/transaction-list')
const ExportAccountView = require('./components/account-export')
const EditableLabel = require('./components/editable-label')
const TabBar = require('./components/tab-bar')
const TokenList = require('./components/token-list')
const AccountDropdowns = require('./components/account-dropdowns/account-dropdowns.component').AccountDropdowns
const CopyButton = require('./components/copy/copy-button')
import * as Toast from './components/toast'
import { getMetaMaskAccounts } from '../../ui/app/selectors'

module.exports = connect(mapStateToProps, mapDispatchToProps)(AccountDetailScreen)

function mapStateToProps (state) {
  const accounts = getMetaMaskAccounts(state)
  return {
    metamask: state.metamask,
    identities: state.metamask.identities,
    keyrings: state.metamask.keyrings,
    warning: state.appState.warning,
    accounts,
    address: state.metamask.selectedAddress,
    accountDetail: state.appState.accountDetail,
    network: state.metamask.network,
    unapprovedMsgs: valuesFor(state.metamask.unapprovedMsgs),
    shapeShiftTxList: state.metamask.shapeShiftTxList,
    transactions: state.metamask.selectedAddressTxList || [],
    conversionRate: state.metamask.conversionRate,
    currentCurrency: state.metamask.currentCurrency,
    currentAccountTab: state.metamask.currentAccountTab,
    tokens: state.metamask.tokens,
    suggestedTokens: state.metamask.suggestedTokens,
    computedBalances: state.metamask.computedBalances,
    kardiaTxList: state.metamask.kardiaTxList,
  }
}

function mapDispatchToProps (dispatch) {
  return {
    actions: {
      showSendPage: () => dispatch(actions.showSendPage()),
      showSendContractPage: ({ methodSelected, methodABI, inputValues }) => dispatch(actions.showSendContractPage({methodSelected, methodABI, inputValues})),
      buyEthView: (selected) => dispatch(actions.buyEthView(selected)),
      viewPendingTx: (txId) => dispatch(actions.viewPendingTx(txId)),
      setAccountLabel: (account, label) => dispatch(actions.setAccountLabel(account, label)),
      showRemoveTokenPage: (token) => dispatch(actions.showRemoveTokenPage(token)),
      showAddSuggestedTokenPage: () => dispatch(actions.showAddSuggestedTokenPage()),
      showAddTokenPage: () => dispatch(actions.showAddTokenPage()),
      setCurrentAccountTab: (key) => dispatch(actions.setCurrentAccountTab(key)),
      displayToast: (msg) => dispatch(actions.displayToast(msg)),
      isCreatedWithCorrectDPath: () => dispatch(actions.isCreatedWithCorrectDPath()),
      getKardiaTxHistory: (address) => dispatch(actions.getKardiaTxHistory(address)),
    },
  }
}

inherits(AccountDetailScreen, Component)
function AccountDetailScreen () {
  Component.call(this)
}

AccountDetailScreen.prototype.componentDidMount = function () {
  const props = this.props
  const { address, network, keyrings, identities } = props

  const getTx = () => {
    const selected = props.address || Object.keys(props.accounts)[0]
    const checksumAddress = selected && toChecksumAddress(network, selected)
    props.actions.getKardiaTxHistory(checksumAddress)
  }

  getTx()

  this.txInterval = setInterval(getTx, 10000)
  props.actions.isCreatedWithCorrectDPath()
  .then(isCreatedWithCorrectDPath => {
    if (!isCreatedWithCorrectDPath) {
      const currentKeyring = getCurrentKeyring(address, network, keyrings, identities)
      if (!ifLooseAcc(currentKeyring) && !ifContractAcc(currentKeyring)) {
        props.actions.displayToast(Toast.ERROR_ON_INCORRECT_DPATH)
      }
    }
  })
}

AccountDetailScreen.prototype.componentWillUnmount = function () {
  clearInterval(this.txInterval)
}

AccountDetailScreen.prototype.componentWillUpdate = function (nextProps) {
  const {
    network: oldNet,
  } = this.props
  const {
    network: newNet,
  } = nextProps

  if (oldNet !== newNet) {
    const props = this.props
    const { address, keyrings, identities } = props
    props.actions.isCreatedWithCorrectDPath()
    .then(isCreatedWithCorrectDPath => {
      if (!isCreatedWithCorrectDPath) {
        const currentKeyring = getCurrentKeyring(address, newNet, keyrings, identities)
        if (!ifLooseAcc(currentKeyring) && !ifContractAcc(currentKeyring)) {
          props.actions.displayToast(Toast.ERROR_ON_INCORRECT_DPATH)
        }
      }
    })
  }
}

AccountDetailScreen.prototype.render = function () {
  const props = this.props
  const { network, conversionRate, currentCurrency } = props
  const selected = props.address || Object.keys(props.accounts)[0]
  const checksumAddress = selected && toChecksumAddress(network, selected)
  const identity = props.identities[selected]
  const account = props.accounts[selected]

  if (Object.keys(props.suggestedTokens).length > 0) {
    this.props.actions.showAddSuggestedTokenPage()
  }

  const currentKeyring = getCurrentKeyring(props.address, network, props.keyrings, props.identities)

  return (

    h('.account-detail-section.full-flex-height', [

      h(Toast.ToastComponent, {
        type: Toast.TOAST_TYPE_ERROR,
        hideManually: true,
        hideToast: true,
      }),

    // identicon, label, balance, etc
      h('.account-data-subsection', {
        style: {
          // padding: '30px 0px',
          flex: '1 0 auto',
          background: '#F7F7F8',
          width: '100%',
        },
      }, [

        // header - identicon + nav
        h('div', {
          style: {
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
            margin: '16px 0px',
          },
        }, [

          // large identicon and addresses
          h('.identicon-wrapper.select-none', [
            h(Identicon, {
              diameter: 40,
              address: selected,
            }),
          ]),
          h('flex-column', {
            style: {
              lineHeight: '10px',
              marginLeft: '20px',
              width: '100%',
            },
          }, [
            h(EditableLabel, {
              textValue: identity ? identity.name : '',
              state: {
                isEditingLabel: false,
              },
              saveText: (text) => {
                props.actions.setAccountLabel(selected, text)
              },
            }, [

              // What is shown when not editing + edit text:
              h('label.editing-label', [h('.edit-text', 'edit')]),
              h(
                'div',
                {
                  style: {
                    display: 'flex',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                  },
                },
                [
                  h(
                    'div.font-medium.color-forest',
                    {
                      name: 'edit',
                      style: {
                      },
                    },
                    [
                      h('h2', {
                        style: {
                          maxWidth: '180px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          padding: '5px 0px',
                          lineHeight: '25px',
                          color: '#333333',
                          fontWeight: 600,
                        },
                      }, [
                        identity && identity.name,
                      ]),
                    ],
                  ),
                  h(
                    AccountDropdowns,
                    {
                      style: {
                        marginRight: '10px',
                        marginLeft: 'auto',
                        cursor: 'pointer',
                      },
                      selected,
                      network,
                      identities: props.identities,
                      keyrings: props.keyrings,
                      enableAccountOptions: true,
                    },
                  ),
                ],
              ),
            ]),
            h('.flex-row', {
              style: {
                width: '15em',
                justifyContent: 'space-between',
                alignItems: 'baseline',
              },
            }, [

              // address

              h('div', {
                style: {
                  width: '8em',
                  display: 'inline-flex',
                  marginBottom: '15px',
                },
              }, [
                h('span', {style: {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  paddingTop: '3px',
                  width: '5em',
                  height: '15px',
                  fontSize: '14px',
                  fontFamily: 'Nunito Bold',
                  textRendering: 'geometricPrecision',
                  color: '#333333',
                }}, checksumAddress),
                h(CopyButton, {
                  value: checksumAddress,
                  isWhite: true,
                }),
              ]),
            ]),

            // account ballance

          ]),
        ]),
        h('.flex-row', {
          style: {
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#FFFFFF',
            boxShadow: '0px 0px 2px rgba(40, 41, 61, 0.04), 0px 4px 8px rgba(96, 97, 112, 0.16)',
            borderRadius: '8px',
            padding: '16px 12px',
            marginBottom: '16px',
          },
        }, [

          h(EthBalance, {
            value: account && account.balance,
            conversionRate,
            currentCurrency,
            network,
            style: {
              lineHeight: '7px',
              color: '#1C1C28',
            },
          }),

          h('.flex-grow'),

          // !ifContractAcc(currentKeyring) ? h('button', {
          //   onClick: () => props.actions.buyEthView(selected),
          //   style: { marginRight: '10px' },
          // }, 'Buy') : null,

          h('button', {
            onClick: () => {
              if (ifContractAcc(currentKeyring)) {
                return props.actions.showSendContractPage({})
              } else {
                return props.actions.showSendPage()
              }
            },
          }, ifContractAcc(currentKeyring) ? 'Execute methods' : 'Send'),

        ]),
      ]),

      // subview (tx history, pk export confirm, buy eth warning)
      this.subview(),

    ])
  )
}

AccountDetailScreen.prototype.subview = function () {
  let subview
  try {
    subview = this.props.accountDetail.subview
  } catch (e) {
    subview = null
  }

  switch (subview) {
    case 'transactions':
      return this.tabSections()
    case 'export':
      const state = extend({key: 'export'}, this.props)
      return h(ExportAccountView, state)
    default:
      return this.tabSections()
  }
}

AccountDetailScreen.prototype.tabSections = function () {
  const { currentAccountTab } = this.props

  return h('section.tabSection.full-flex-height.grow-tenx', [

    h(TabBar, {
      tabs: [
        { content: 'History', key: 'history', id: 'wallet-view__tab-history' },
        { content: 'Tokens', key: 'tokens', id: 'wallet-view__tab-tokens' },
      ],
      defaultTab: currentAccountTab || 'history',
      tabSelected: (key) => {
        this.props.actions.setCurrentAccountTab(key)
      },
    }),

    this.tabSwitchView(),
  ])
}

AccountDetailScreen.prototype.tabSwitchView = function () {
  const props = this.props
  const { address, network } = props
  const { currentAccountTab, tokens } = this.props

  switch (currentAccountTab) {
    case 'tokens':
      return h(TokenList, {
        userAddress: address,
        network,
        tokens,
        addToken: () => this.props.actions.showAddTokenPage(),
        removeToken: (token) => this.props.actions.showRemoveTokenPage(token),
      })
    default:
      return this.transactionList()
  }
}

AccountDetailScreen.prototype.transactionList = function () {
  const {unapprovedMsgs, address,
    network, shapeShiftTxList, conversionRate, kardiaTxList } = this.props

  return h(TransactionList, {
    transactions: kardiaTxList.sort((a, b) => b.time - a.time),
    network,
    unapprovedMsgs,
    conversionRate,
    address,
    shapeShiftTxList,
    viewPendingTx: (txId) => {
      this.props.actions.viewPendingTx(txId)
    },
  })
}

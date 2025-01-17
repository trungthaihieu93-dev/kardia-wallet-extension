const Component = require('react').Component
const PropTypes = require('prop-types')
const h = require('react-hyperscript')
const inherits = require('util').inherits
const connect = require('react-redux').connect
const { withRouter } = require('react-router-dom')
const { compose } = require('recompose')
const actions = require('../../actions')
const Dropdown = require('./components/dropdown').Dropdown
const DropdownMenuItem = require('./components/dropdown').DropdownMenuItem
const NetworkDropdownIcon = require('./components/network-dropdown-icon')
const R = require('ramda')
const { SETTINGS_ROUTE } = require('../../routes')

// classes from nodes of the toggle element.
const notToggleElementClassnames = [
  'menu-icon',
  'network-name',
  'network-indicator',
  'network-caret',
  'network-component',
]

function mapStateToProps (state) {
  return {
    provider: state.metamask.provider,
    frequentRpcList: state.metamask.frequentRpcList || [],
    networkDropdownOpen: state.appState.networkDropdownOpen,
  }
}

function mapDispatchToProps (dispatch) {
  return {
    hideModal: () => {
      dispatch(actions.hideModal())
    },
    setProviderType: (type) => {
      dispatch(actions.setProviderType(type))
    },
    setDefaultRpcTarget: type => {
      dispatch(actions.setDefaultRpcTarget(type))
    },
    setRpcTarget: (target) => {
      dispatch(actions.setRpcTarget(target))
    },
    delRpcTarget: (target) => {
      dispatch(actions.delRpcTarget(target))
    },
    showNetworkDropdown: () => dispatch(actions.showNetworkDropdown()),
    hideNetworkDropdown: () => dispatch(actions.hideNetworkDropdown()),
  }
}


inherits(NetworkDropdown, Component)
function NetworkDropdown () {
  Component.call(this)
}

NetworkDropdown.contextTypes = {
  t: PropTypes.func,
}

module.exports = compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps),
)(NetworkDropdown)


// TODO: specify default props and proptypes
NetworkDropdown.prototype.render = function () {
  const props = this.props
  const { provider: { type: providerType, rpcTarget: activeNetwork } } = props
  const rpcList = props.frequentRpcList
  const isOpen = this.props.networkDropdownOpen
  const dropdownMenuItemStyle = {
    fontSize: '16px',
    lineHeight: '20px',
    padding: '12px 0',
  }

  return h(Dropdown, {
    isOpen,
    onClickOutside: (event) => {
      const { classList } = event.target
      const isInClassList = className => classList.contains(className)
      const notToggleElementIndex = R.findIndex(isInClassList)(notToggleElementClassnames)

      if (notToggleElementIndex === -1) {
        this.props.hideNetworkDropdown()
      }
    },
    containerClassName: 'network-droppo',
    zIndex: 55,
    style: {
      position: 'absolute',
      top: '58px',
      width: '309px',
      zIndex: '55px',
    },
    innerStyle: {
      padding: '18px 8px',
    },
  }, [

    h('div.network-dropdown-header', {}, [
      h('div.network-dropdown-title', {}, this.context.t('networks')),

      h('div.network-dropdown-divider'),

      h('div.network-dropdown-content',
        {},
        this.context.t('defaultNetwork'),
      ),
    ]),

    h(
      DropdownMenuItem,
      {
        key: 'kardia_mainnet',
        closeMenu: () => this.props.hideNetworkDropdown(),
        onClick: () => props.setProviderType('kardia_mainnet'),
        style: dropdownMenuItemStyle,
      },
      [
        providerType === 'kardia_mainnet' ? h('i.fa.fa-check') : h('.network-check__transparent', '✓'),
        h(NetworkDropdownIcon, {
          backgroundColor: '#ff4a8d', // $wild-strawberry
          isSelected: providerType === 'kardia_mainnet',
        }),
        h('span.network-name-item', {
          style: {
            color: providerType === 'kardia_mainnet' ? '#ffffff' : '#9b9b9b',
          },
        }, this.context.t('kardia_mainnet')),
      ],
    ),

    h(
      DropdownMenuItem,
      {
        key: 'kardia_testnet',
        closeMenu: () => this.props.hideNetworkDropdown(),
        onClick: () => props.setProviderType('kardia_testnet'),
        style: dropdownMenuItemStyle,
      },
      [
        providerType === 'kardia_testnet' ? h('i.fa.fa-check') : h('.network-check__transparent', '✓'),
        h(NetworkDropdownIcon, {
          backgroundColor: '#7057ff', // $cornflower-blue
          isSelected: providerType === 'kardia_testnet',
        }),
        h('span.network-name-item', {
          style: {
            color: providerType === 'kardia_testnet' ? '#ffffff' : '#9b9b9b',
          },
        }, this.context.t('kardia_testnet')),
      ],
    ),

    h(
      DropdownMenuItem,
      {
        key: 'default',
        closeMenu: () => this.props.hideNetworkDropdown(),
        onClick: () => props.setProviderType('localhost'),
        style: dropdownMenuItemStyle,
      },
      [
        providerType === 'localhost' ? h('i.fa.fa-check') : h('.network-check__transparent', '✓'),
        h(NetworkDropdownIcon, {
          isSelected: providerType === 'localhost',
          innerBorder: '1px solid #9b9b9b',
        }),
        h('span.network-name-item', {
          style: {
            color: providerType === 'localhost' ? '#ffffff' : '#9b9b9b',
          },
        }, this.context.t('localhost')),
      ],
    ),

    this.renderCustomOption(props.provider),
    this.renderCommonRpc(rpcList, props.provider),

    h(
      DropdownMenuItem,
      {
        closeMenu: () => this.props.hideNetworkDropdown(),
        onClick: () => this.props.history.push(SETTINGS_ROUTE),
        style: dropdownMenuItemStyle,
      },
      [
        activeNetwork === 'custom' ? h('i.fa.fa-check') : h('.network-check__transparent', '✓'),
        h(NetworkDropdownIcon, {
          isSelected: activeNetwork === 'custom',
          innerBorder: '1px solid #9b9b9b',
        }),
        h('span.network-name-item', {
          style: {
            color: activeNetwork === 'custom' ? '#ffffff' : '#9b9b9b',
          },
        }, this.context.t('customRPC')),
      ],
    ),

  ])
}


NetworkDropdown.prototype.getNetworkName = function () {
  const { provider } = this.props
  const providerName = provider.type
  let name
  if (providerName === 'kardia_mainnet') {
    name = 'Kardia Mainnet'
  } else {
    name = this.context.t('unknownNetwork')
  }

  return name
}

NetworkDropdown.prototype.renderCommonRpc = function (rpcList, provider) {
  const props = this.props
  const reversedRpcList = rpcList.slice().reverse()

  return reversedRpcList.map((rpc) => {
    const currentRpcTarget = provider.type === 'rpc' && rpc === provider.rpcTarget

    if ((rpc === 'http://localhost:8545') || currentRpcTarget) {
      return null
    } else {
      return h(
        DropdownMenuItem,
        {
          key: `common${rpc}`,
          closeMenu: () => this.props.hideNetworkDropdown(),
          onClick: () => props.setRpcTarget(rpc),
          style: {
            fontSize: '16px',
            lineHeight: '20px',
            padding: '12px 0',
          },
        },
        [
          currentRpcTarget ? h('i.fa.fa-check') : h('.network-check__transparent', '✓'),
          h('i.fa.fa-question-circle.fa-med.menu-icon-circle'),
          h('span.network-name-item', {
            style: {
              color: currentRpcTarget ? '#ffffff' : '#9b9b9b',
            },
          }, rpc),
          h('i.fa.fa-times.delete',
          {
            onClick: (e) => {
              e.stopPropagation()
              props.delRpcTarget(rpc)
            },
          }),
        ],
      )
    }
  })
}

NetworkDropdown.prototype.renderCustomOption = function (provider) {
  const { rpcTarget, type } = provider
  const props = this.props

  if (type !== 'rpc') return null

  switch (rpcTarget) {

    case 'http://localhost:8545':
      return null

    default:
      return h(
        DropdownMenuItem,
        {
          key: rpcTarget,
          onClick: () => props.setRpcTarget(rpcTarget),
          closeMenu: () => this.props.hideNetworkDropdown(),
          style: {
            fontSize: '16px',
            lineHeight: '20px',
            padding: '12px 0',
          },
        },
        [
          h('i.fa.fa-check'),
          h('i.fa.fa-question-circle.fa-med.menu-icon-circle'),
          h('span.network-name-item', {
            style: {
              color: '#ffffff',
            },
          }, rpcTarget),
        ],
      )
  }
}

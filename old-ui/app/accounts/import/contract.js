import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import actions from '../../../../ui/app/actions'
import Web3 from 'web3'
import log from 'loglevel'
import CopyButton from '../../components/copy/copy-button'
import ErrorComponent from '../../components/error'
import { getFullABI } from './helpers'

class ContractImportView extends Component {
  constructor (props) {
    super(props)

    const web3 = new Web3(global.ethereumProvider)
    this.state = {
      contractAddr: '',
      abi: '',
      abiInputDisabled: false,
      importDisabled: true,
      web3,
    }
  }

  static propTypes = {
    error: PropTypes.string,
    network: PropTypes.string,
    RPC_URL: PropTypes.string,
    provider: PropTypes.object,
    type: PropTypes.string,
    displayWarning: PropTypes.func,
    importNewAccount: PropTypes.func,
    hideWarning: PropTypes.func,
    showLoadingIndication: PropTypes.func,
    hideLoadingIndication: PropTypes.func,
  }

  addressOnChange (contractAddr) {
    this.setState({
      contractAddr,
    }, () => {
      this.autodetectContractABI()
    })
  }

  abiOnChange (abi, APIInputDisabled) {
    this.props.hideWarning()
    try {
      if (abi) {
        this.setState({
          abi: abi,
          abiInputDisabled: APIInputDisabled || false,
          importDisabled: false,
        })
      }
    } catch (e) {
      this.clearABI()
    }
  }

  componentDidUpdate (prevProps) {
    if (this.props.type !== prevProps.type) {
      this.clearInputs()
    }
  }

  render () {
    const { error } = this.props

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '5px 0px 0px 0px',
      }}>
        <ErrorComponent error={error} />
        <span>Paste address of contract here</span>
        <input
          className="large-input"
          id="address-box"
          value={this.state.contractAddr}
          onChange={(e) => this.addressOnChange(e.target.value)}
          style={{
            width: '100%',
            marginTop: '12px',
          }}
        />
        <span style={{ marginTop: '20px' }}>Paste ABI of contract here
          <CopyButton
            value={this.state.abi}
            style={{
              display: 'inline-block',
            }}
            tooltipPosition="right"
          />
        </span>
        <textarea
          id="abi-box"
          disabled={this.state.abiInputDisabled}
          value={this.state.abi}
          onChange={(e) => this.abiOnChange(e.target.value) }
          style={{
            marginTop: '12px',
            width: '100%',
            height: '50px',
          }}
          onKeyPress={(e) => this.createKeyringOnEnter(e)}
        />
        <button
          disabled={this.state.importDisabled}
          onClick={(e) => this.createNewKeychain(e)}
          style={{ margin: '20px' }}
        >Import</button>
        {error ? <span className="error">{error}</span> : null}
      </div>
    )
  }

  autodetectContractABI = () => {
    const { contractAddr, web3 } = this.state
    const { type, network, provider, RPC_URL } = this.props
    if (!contractAddr || !web3.isAddress(contractAddr)) {
      this.clearABI()
      return
    }
    getFullABI(web3.eth, contractAddr, network, type, RPC_URL, provider)
      .then(finalABI => {
        if (finalABI) {
          finalABI = JSON.stringify(finalABI)
          const APIInputDisabled = true
          return this.abiOnChange(finalABI, APIInputDisabled)
        } else {
          return null
        }
      })
      .catch(e => {
        this.clearABI()
        log.debug(e)
        this.props.displayWarning(e.message)
      })
  }

  createKeyringOnEnter (event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      this.createNewKeychain()
    }
  }

  async getContractCode () {
    this.props.showLoadingIndication()
    const { contractAddr, web3 } = this.state
    return new Promise((resolve, reject) => {
      web3.eth.getCode(contractAddr, (err, addrCode) => {
        if (err) {
          reject(err)
        } else {
          resolve(addrCode)
        }
        this.props.hideLoadingIndication()
      })
    })
  }

  async createNewKeychain () {
    const { contractAddr, web3 } = this.state

    if (!contractAddr || !web3.isAddress(contractAddr)) {
      this.clearABI()
      return this.props.displayWarning('Invalid contract address')
    }

    const contractAddrCode = await this.getContractCode()
    if (contractAddrCode === '0x') {
      this.clearABI()
      return this.props.displayWarning('This is not a contract address')
    }

    let abi
    try {
      abi = JSON.parse(this.state.abi)
    } catch (e) {
      this.clearABI()
      this.props.displayWarning('Invalid ABI')
    }

    if (!abi) {
      this.clearABI()
      return this.props.displayWarning('Invalid contract ABI')
    }

    this.props.importNewAccount(this.props.type, { addr: contractAddr, network: this.props.network, abi })
    // JS runtime requires caught rejections but failures are handled by Redux
    .catch()
  }

  clearInputs () {
    this.setState({
      contractAddr: '',
      abi: '',
      abiInputDisabled: false,
      importDisabled: true,
    })
  }

  clearABI () {
    this.setState({
      abi: '',
      abiInputDisabled: false,
      importDisabled: true,
    })
  }

}

function mapStateToProps (state) {
  const warning = state.appState.warning
  const result = {
    error: warning && (warning || warning.message),
    network: state.metamask.network,
    provider: state.metamask.provider,
		RPC_URL: state.appState.RPC_URL,
  }

  return result
}

function mapDispatchToProps (dispatch) {
  return {
    showLoadingIndication: () => dispatch(actions.showLoadingIndication()),
    hideLoadingIndication: () => dispatch(actions.hideLoadingIndication()),
    hideWarning: () => dispatch(actions.hideWarning()),
    displayWarning: (msg) => dispatch(actions.displayWarning(msg)),
    importNewAccount: (strategy, args) => dispatch(actions.importNewAccount(strategy, args)),
  }
}

module.exports = connect(mapStateToProps, mapDispatchToProps)(ContractImportView)

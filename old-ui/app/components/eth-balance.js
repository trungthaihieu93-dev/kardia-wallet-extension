const Component = require('react').Component
const h = require('react-hyperscript')
const inherits = require('util').inherits
const formatBalance = require('../util').formatBalance
const generateBalanceObject = require('../util').generateBalanceObject

module.exports = KAIBalanceComponent

inherits(KAIBalanceComponent, Component)
function KAIBalanceComponent () {
  Component.call(this)
}

KAIBalanceComponent.prototype.render = function () {
  const props = this.props
  let { value } = props
  const { style, width, network, isToken, tokenSymbol } = props
  const needsParse = this.props.needsParse !== undefined ? this.props.needsParse : true
  value = value ? formatBalance(value, 6, needsParse, network, isToken, tokenSymbol) : '...'

  return (

    h('.ether-balance-amount', {
      style,
    }, [
      h('div', {
        style: {
          display: 'inline',
          width,
        },
      }, this.renderBalance(value)),
    ])

  )
}
KAIBalanceComponent.prototype.renderBalance = function (value) {
  const props = this.props
  const { shorten, incoming } = props
  if (value === 'None') return value
  if (value === '...') return value
  const balanceObj = generateBalanceObject(value, shorten ? 1 : 3)
  let balance

  if (shorten) {
    balance = balanceObj.shortBalance
  } else {
    balance = balanceObj.balance
  }

  const { label } = balanceObj
  const valueStyle = props.valueStyle ? props.valueStyle : {
    width: '100%',
    textAlign: 'right',
    fontWeight: '600',
  }
  const dimStyle = props.dimStyle ? props.dimStyle : {
    marginLeft: '5px',
  }

  return (
    h('div.flex-column', [
      h('.flex-row', {
        style: {
          alignItems: 'flex-end',
          textRendering: 'geometricPrecision',
          fontSize: '15px',
          lineHeight: '20px',
          color: '#1C1C28',
          marginTop: '10px',
        },
        'data-tip': '',
        'data-for': 'ethBalance',
      }, [
        h('div', {
          style: valueStyle,
        }, incoming ? `+${balance}` : balance),
        h('div', {
          style: dimStyle,
        }, label),
      ]),
    ]))
}

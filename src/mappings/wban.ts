/* eslint-disable prefer-const */
import { BigInt, BigDecimal, store, Address, log } from '@graphprotocol/graph-ts'
import {
  WBANToken as WBAN,
  User,
  WBANToken,
  Transaction,
  Wrap,
  Unwrap
} from '../types/schema'
import { Transfer, SwapToBan } from '../types/WBANToken/WBANToken'
import { createUser, convertTokenToDecimal, WBAN_ADDRESS, ADDRESS_ZERO, BI_18, ONE_BI } from './helpers'
/// import { Pair as PairContract, Mint, Burn, Swap, Transfer, Sync } from '../types/templates/Pair/Pair'
// import { updatePairDayData, updateTokenDayData, updateUniswapDayData, updatePairHourData } from './dayUpdates'
// import { getEthPriceInUSD, findEthPerToken, getTrackedVolumeUSD, getTrackedLiquidityUSD } from './pricing'
/*
import {
  convertTokenToDecimal,
  ADDRESS_ZERO,
  FACTORY_ADDRESS,
  ONE_BI,
  createUser,
  createLiquidityPosition,
  ZERO_BD,
  BI_18,
  createLiquiditySnapshot
} from './helpers'
*/

let BD_ZERO = BigDecimal.fromString("0")
let BD_ONE  = BigDecimal.fromString("1")

export function handleTransfer(event: Transfer): void {
  let wban = WBANToken.load(WBAN_ADDRESS)
  if (wban === null) {
    wban = new WBANToken(WBAN_ADDRESS)
    wban.totalSupply = BD_ZERO
    wban.hodlersCount = BD_ZERO
  }

  let from = event.params.from
  let to = event.params.to

  // if new users increase hodler count
  if (User.load(to.toHexString()) == null) {
    const oldCount = wban.hodlersCount
    wban.hodlersCount = oldCount.plus(BD_ONE)
  }

  const transactionHash = event.transaction.hash.toHexString()

  // token amount being transfered
  const value = convertTokenToDecimal(event.params.value, BI_18)

  // user stats
  createUser(from)
  createUser(to)

  // update amounts of each user
  let userFrom = User.load(from.toHexString())
  let userTo = User.load(to.toHexString())
  userFrom.amount = userFrom.amount.minus(value)
  userTo.amount = userTo.amount.plus(value)
  // update transaction count for this user
  userFrom.txnCount = userFrom.txnCount.plus(BD_ONE)

  /*
  // if sender has no wBAN left, decrease hodlers count
  if (userFrom.amount.equals(BD_ZERO)) {
    const oldCount = wban.hodlersCount
    wban.hodlersCount = oldCount.minus(BD_ONE)
  }
  */

  // get or create transaction
  let transaction = Transaction.load(transactionHash)
  if (transaction === null) {
    transaction = new Transaction(transactionHash)
    transaction.blockNumber = event.block.number
    transaction.timestamp = event.block.timestamp
    transaction.wraps = []
    transaction.unwraps = []
  }

  // wraps
  let wraps = transaction.wraps
  if (from.toHexString() === ADDRESS_ZERO) {
    // update total supply
    wban.totalSupply = wban.totalSupply.plus(value)
    // create new wrap
    let wrap = new Wrap(
        event.transaction.hash
          .toHexString()
          .concat('-')
          .concat(BigInt.fromI32(wraps.length).toString())
      )
    wrap.transaction = transaction.id
    wrap.to = to
    wrap.amount = value
    wrap.timestamp = transaction.timestamp
    wrap.save()
    
    // update wraps in transaction
    transaction.wraps = wraps.concat([wrap.id])
    // update wraps in user
    userTo.wraps = userTo.wraps.concat([wrap.id])
  }
  
  if (to.toHexString() == ADDRESS_ZERO) {
    // update total supply
    wban.totalSupply = wban.totalSupply.minus(value)
  }

  transaction.save()
  userFrom.save()
  userTo.save()
  wban.save()
}

export function handleSwapToBan(event: SwapToBan): void {
  // update user Banano address when he unwraps
  if (event.params.banAddress) {
    let user = User.load(event.params.from.toHexString())
    user.banAddress = event.params.banAddress
    user.save()
  }
}
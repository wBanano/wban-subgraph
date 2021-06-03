/* eslint-disable prefer-const */
import { BigInt, BigDecimal, store, Address } from '@graphprotocol/graph-ts'
import {
  BenisDeposit,
  BenisFarm,
  BenisWithdrawal,
  BenisUser
} from '../types/schema'
import { Deposit, Withdraw, EmergencyWithdraw } from '../types/Benis/Benis'
import { createUser, convertTokenToDecimal, WBAN_ADDRESS, ADDRESS_ZERO, BI_18, ONE_BI, ZERO_BI } from './helpers'

let BD_ZERO = BigDecimal.fromString("0")
let BD_ONE  = BigDecimal.fromString("1")

export function handleDeposit(event: Deposit): void {
  const transactionHash = event.transaction.hash.toHexString()
  const farmID = event.params.pid
  const user = event.params.user.toHexString()

  // update farm stats
  let farm = BenisFarm.load(farmID.toString())
  if (farm === null) {
    farm = new BenisFarm(farmID.toString())
    farm.depositsCount = ZERO_BI
    farm.withdrawalsCount = ZERO_BI
  }
  farm.depositsCount = farm.depositsCount.plus(ONE_BI)
  farm.save()

  // update user stats for this farm
  let userStats = BenisUser.load(user)
  if (userStats === null) {
    userStats = new BenisUser(user)
    userStats.farm = event.params.pid
    userStats.depositsCount = ZERO_BI
    userStats.withdrawalsCount = ZERO_BI
  }
  userStats.depositsCount = userStats.depositsCount.plus(ONE_BI)
  userStats.save()
  
  // track farm deposit
  let deposit = new BenisDeposit(transactionHash)
  deposit.user = event.params.user.toHexString()
  deposit.farm = farmID
  deposit.amount = convertTokenToDecimal(event.params.amount, BI_18)
  deposit.timestamp = event.block.timestamp
  deposit.save()
}

export function handleWithdraw(event: Withdraw): void {
  const transactionHash = event.transaction.hash.toHexString()
  const farmID = event.params.pid
  const user = event.params.user.toHexString()

  // update farm stats
  let farm = BenisFarm.load(farmID.toString())
  farm.withdrawalsCount = farm.withdrawalsCount.plus(ONE_BI)
  farm.save()

  // update user stats for this farm
  let userStats = BenisUser.load(user)
  if (userStats === null) {
    userStats = new BenisUser(user)
    userStats.farm = farmID
    userStats.depositsCount = ZERO_BI
    userStats.withdrawalsCount = ZERO_BI
  }
  userStats.withdrawalsCount = userStats.withdrawalsCount.plus(ONE_BI)
  userStats.save()

  // track farm withdrawal
  let withdrawal = new BenisWithdrawal(transactionHash)
  withdrawal.user = event.params.user.toHexString()
  withdrawal.farm = farmID
  withdrawal.amount = convertTokenToDecimal(event.params.amount, BI_18)
  withdrawal.timestamp = event.block.timestamp
  withdrawal.save()
}

export function handleEmergencyWithdraw(event: EmergencyWithdraw): void {
}

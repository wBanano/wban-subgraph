/* eslint-disable prefer-const */
import { BigInt, BigDecimal, store, Address } from '@graphprotocol/graph-ts'
import {
  BenisDeposit,
  BenisFarm,
  BenisWithdrawal,
  BenisUser,
	User
} from '../types/schema'
import { Deposit, Withdraw, EmergencyWithdraw } from '../types/Benis/Benis'
import { createUser, convertTokenToDecimal, WBAN_ADDRESS, ADDRESS_ZERO, BI_18, ONE_BI, ZERO_BI } from './helpers'

let BD_ZERO = BigDecimal.fromString("0")
let BD_ONE  = BigDecimal.fromString("1")

export function handleDeposit(event: Deposit): void {
  let transactionHash = event.transaction.hash.toHexString()
  let farmID = event.params.pid
	let amount = convertTokenToDecimal(event.params.amount, BI_18)
  let user = event.params.user.toHexString()

  // update farm stats
  let farm = BenisFarm.load(farmID.toString())
  if (farm === null) {
    farm = new BenisFarm(farmID.toString())
		farm.totalAmount = BD_ZERO
    farm.depositsCount = ZERO_BI
    farm.withdrawalsCount = ZERO_BI
		farm.currentHoldersCount = ZERO_BI
		farm.allTimeHoldersCount = ZERO_BI
		farm.currentHolders = []
		farm.allTimeHolders = []
  }
	farm.totalAmount = farm.totalAmount.plus(amount)
  farm.depositsCount = farm.depositsCount.plus(ONE_BI)

  // update user stats for this farm
  let userStats = BenisUser.load(user)
  if (userStats === null) {
    userStats = new BenisUser(user)
    userStats.farm = event.params.pid
		userStats.position = BD_ZERO
    userStats.depositsCount = ZERO_BI
    userStats.withdrawalsCount = ZERO_BI
  }
	if (User.load(user) != null) {
		let wbanUser = User.load(user)
		userStats.banAddress = wbanUser.banAddress
	}
	userStats.position = userStats.position.plus(amount)
  userStats.depositsCount = userStats.depositsCount.plus(ONE_BI)

	if (!farm.allTimeHolders.includes(user)) {	// check if user is new in this farm
		let alltimeHolders = farm.allTimeHolders
		alltimeHolders.push(user)
		farm.allTimeHolders = alltimeHolders
		farm.allTimeHoldersCount = farm.allTimeHoldersCount.plus(ONE_BI)
		let currentHolders = farm.currentHolders
		currentHolders.push(user)
		farm.currentHolders = currentHolders
		farm.currentHoldersCount = farm.currentHoldersCount.plus(ONE_BI)
	} else if (!farm.currentHolders.includes(user)) { // check if user is a new hodler in this farm
		let holders = farm.currentHolders
		holders.push(user)
		farm.currentHolders = holders
		farm.currentHoldersCount = farm.currentHoldersCount.plus(ONE_BI)
	}

  // track farm deposit
  let deposit = new BenisDeposit(transactionHash)
  deposit.user = event.params.user.toHexString()
  deposit.farm = farmID
  deposit.amount = convertTokenToDecimal(event.params.amount, BI_18)
  deposit.timestamp = event.block.timestamp

	farm.save()
	userStats.save()
	deposit.save()
}

export function handleWithdraw(event: Withdraw): void {
  let transactionHash = event.transaction.hash.toHexString()
  let farmID = event.params.pid
	let amount = convertTokenToDecimal(event.params.amount, BI_18)
  let user = event.params.user.toHexString()

  // update farm stats
  let farm = BenisFarm.load(farmID.toString())
	farm.totalAmount = farm.totalAmount.minus(amount)
  farm.withdrawalsCount = farm.withdrawalsCount.plus(ONE_BI)

  // update user stats for this farm
  let userStats = BenisUser.load(user)
  if (userStats === null) {
    userStats = new BenisUser(user)
    userStats.farm = farmID
		userStats.position = BD_ZERO
    userStats.depositsCount = ZERO_BI
    userStats.withdrawalsCount = ZERO_BI
  }
	userStats.position = userStats.position.minus(amount)
  userStats.withdrawalsCount = userStats.withdrawalsCount.plus(ONE_BI)

	// check if user has still some value deposited into the farm
	if (userStats.position.equals(BD_ZERO)) {
		let holders = farm.currentHolders
		holders.push(user)
		farm.currentHolders = holders
		let userIndex = holders.indexOf(user);
		if (userIndex > -1) {
			holders.splice(userIndex, 1);
			farm.currentHolders = holders
			farm.currentHoldersCount = farm.currentHoldersCount.minus(ONE_BI)
		}
	}

  // track farm withdrawal
  let withdrawal = new BenisWithdrawal(transactionHash)
  withdrawal.user = event.params.user.toHexString()
  withdrawal.farm = farmID
  withdrawal.amount = convertTokenToDecimal(event.params.amount, BI_18)
  withdrawal.timestamp = event.block.timestamp

	farm.save()
	userStats.save()
	withdrawal.save()
}

export function handleEmergencyWithdraw(event: EmergencyWithdraw): void {
}

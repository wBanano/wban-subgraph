/* eslint-disable prefer-const */
import { log, BigDecimal } from '@graphprotocol/graph-ts'
import { BenisFarm, BenisPosition, User } from '../types/schema'
import { Deposit, Withdraw, EmergencyWithdraw } from '../types/Benis/Benis'
import { createBenisPosition, convertTokenToDecimal, BI_18, ONE_BI, ZERO_BI, createUser, createBenisFarm } from './helpers'

let BD_ZERO = BigDecimal.fromString("0")
let BD_ONE  = BigDecimal.fromString("1")

export function handleDeposit(event: Deposit): void {
  let farmID = event.params.pid
	let amount = convertTokenToDecimal(event.params.amount, BI_18)
  let userAddress = event.params.user.toHexString()

  // update farm stats
	createBenisFarm(farmID)
  let farm = BenisFarm.load(farmID.toString())
	farm.totalAmount = farm.totalAmount.plus(amount)
  farm.depositsCount = farm.depositsCount.plus(ONE_BI)

  // update user stats for this farm
	createUser(event.params.user)
	let user = User.load(userAddress)

	// update user position data
	log.info("Benis deposit in farm {} of {}", [farmID.toString(), amount.toString()]);
	createBenisPosition(farmID.toString(), userAddress)
	let positionID = farmID.toString() + "-" + userAddress
	let position = BenisPosition.load(positionID)
	position.tokenAmount = position.tokenAmount.plus(amount)
  position.depositsCount = position.depositsCount.plus(ONE_BI)

	// update farm data
	if (!farm.allTimeHolders.includes(userAddress)) {	// check if user is new in this farm
		let alltimeHolders = farm.allTimeHolders
		alltimeHolders.push(userAddress)
		farm.allTimeHolders = alltimeHolders
		farm.allTimeHoldersCount = farm.allTimeHoldersCount.plus(ONE_BI)
		let currentHolders = farm.currentHolders
		currentHolders.push(userAddress)
		farm.currentHolders = currentHolders
		farm.currentHoldersCount = farm.currentHoldersCount.plus(ONE_BI)
	} else if (!farm.currentHolders.includes(userAddress)) { // check if user is a new hodler in this farm
		let holders = farm.currentHolders
		holders.push(userAddress)
		farm.currentHolders = holders
		farm.currentHoldersCount = farm.currentHoldersCount.plus(ONE_BI)
	}

	farm.save()
	position.save()
	user.save()
}

export function handleWithdraw(event: Withdraw): void {
  let farmID = event.params.pid
	let amount = convertTokenToDecimal(event.params.amount, BI_18)
  let userAddress = event.params.user.toHexString()

	// update farm stats
	createBenisFarm(farmID)
	let farm = BenisFarm.load(farmID.toString())
	farm.totalAmount = farm.totalAmount.minus(amount)
  farm.withdrawalsCount = farm.withdrawalsCount.plus(ONE_BI)

	// update user stats for this farm
	createUser(event.params.user)
	let user = User.load(userAddress)

	// update user position data
	createBenisPosition(farmID.toString(), userAddress)
	let positionID = farmID.toString() + "-" + userAddress
	let position = BenisPosition.load(positionID)
	position.tokenAmount = position.tokenAmount.minus(amount)
	position.depositsCount = position.withdrawalsCount.plus(ONE_BI)

	// check if user has still some value deposited into the farm
	if (position.tokenAmount.equals(BD_ZERO)) {
		let holders = farm.currentHolders
		holders.push(userAddress)
		farm.currentHolders = holders
		let userIndex = holders.indexOf(userAddress);
		if (userIndex > -1) {
			holders.splice(userIndex, 1);
			farm.currentHolders = holders
			farm.currentHoldersCount = farm.currentHoldersCount.minus(ONE_BI)
		}
	}

	farm.save()
	position.save()
	user.save()
}

export function handleEmergencyWithdraw(event: EmergencyWithdraw): void {
}

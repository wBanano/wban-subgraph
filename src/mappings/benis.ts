/* eslint-disable prefer-const */
import { log, BigDecimal, BigInt, Address } from '@graphprotocol/graph-ts'
import { BenisFarm, BenisPosition, User } from '../types/schema'
import { Deposit, Withdraw, EmergencyWithdraw, Benis } from '../types/Benis/Benis'
import {
	createBenisPosition,
	convertTokenToDecimal,
	BI_18, ONE_BI,
	createUser, createBenisFarm,
	BENIS_ADDRESS
} from './helpers'

let BD_ZERO = BigDecimal.fromString("0")
let BD_ONE  = BigDecimal.fromString("1")

export function handleDeposit(event: Deposit): void {
	let farmID = event.params.pid
	let amount = convertTokenToDecimal(event.params.amount, BI_18)
	let userAddress = event.params.user.toHexString()
	let benis = Benis.bind(Address.fromString(BENIS_ADDRESS))
	log.info("Requesting poolInfo #{}", [farmID.toString()])
	let poolInfo = benis.poolInfo(farmID)

	// update farm stats
	createBenisFarm(farmID)
	let farm = BenisFarm.load(farmID.toString())
	farm.totalAmount = farm.totalAmount.plus(amount)
	farm.depositsCount = farm.depositsCount.plus(ONE_BI)
	farm.allocPoint = poolInfo.value4
	farm.allocWbanPerSecond = convertTokenToDecimal(benis.wbanPerSecond(), BI_18)
		.times(BigInt.fromI32(farm.allocPoint).toBigDecimal())
		.div(benis.totalAllocPoint().toBigDecimal())

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

	/*
	STUFF KEPT FOR LATER, EVENTUALLY -- AND PROBABLY NOT WORKING
	let stakingToken = poolInfo.value0
	if (stakingToken != Address.fromString(WBAN_ADDRESS)) {
		let pair = Pair.bind(stakingToken)
		log.info("Pair {} made of {} & {}", [stakingToken.toHexString(), pair.token0().toHexString(), pair.token1().toHexString()])
		let token0 = ERC20.bind(pair.token0())
		let token1 = ERC20.bind(pair.token1())
		let liquidityToken0 = convertTokenToDecimalUsingI32(token0.balanceOf(stakingToken), token0.decimals())
		let liquidityToken1 = convertTokenToDecimalUsingI32(token1.balanceOf(stakingToken), token1.decimals())
		let totalSupply = convertTokenToDecimalUsingI32(pair.totalSupply(), pair.decimals())
		// compute user liquidities -- pool token A * (user LP token / total supply) + pool token B * (user LP token / total supply)
		position.token0 = liquidityToken0.times(position.tokenAmount).div(totalSupply)
		position.token1 = liquidityToken1.times(position.tokenAmount).div(totalSupply)
	}
	*/

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
	let benis = Benis.bind(Address.fromString(BENIS_ADDRESS))
	log.info("Requesting poolInfo #{}", [farmID.toString()])
	let poolInfo = benis.poolInfo(farmID)

	// update farm stats
	createBenisFarm(farmID)
	let farm = BenisFarm.load(farmID.toString())
	farm.totalAmount = farm.totalAmount.minus(amount)
  farm.withdrawalsCount = farm.withdrawalsCount.plus(ONE_BI)
	farm.allocPoint = poolInfo.value4
	farm.allocWbanPerSecond = convertTokenToDecimal(benis.wbanPerSecond(), BI_18)
		.times(BigInt.fromI32(farm.allocPoint).toBigDecimal())
		.div(benis.totalAllocPoint().toBigDecimal())
	// update user stats for this farm
	createUser(event.params.user)
	let user = User.load(userAddress)

	// update user position data
	createBenisPosition(farmID.toString(), userAddress)
	let positionID = farmID.toString() + "-" + userAddress
	let position = BenisPosition.load(positionID)
	position.tokenAmount = position.tokenAmount.minus(amount)
	position.depositsCount = position.withdrawalsCount.plus(ONE_BI)

	/*
	STUFF KEPT FOR LATER, EVENTUALLY -- AND PROBABLY NOT WORKING
	let stakingToken = poolInfo.value0
	if (stakingToken != Address.fromString(WBAN_ADDRESS)) {
		let pair = Pair.bind(stakingToken)
		log.info("Pair {} made of {} & {}", [stakingToken.toHexString(), pair.token0().toHexString(), pair.token1().toHexString()])
		let token0 = ERC20.bind(pair.token0())
		let token1 = ERC20.bind(pair.token1())
		let liquidityToken0 = convertTokenToDecimalUsingI32(token0.balanceOf(stakingToken), token0.decimals())
		let liquidityToken1 = convertTokenToDecimalUsingI32(token1.balanceOf(stakingToken), token1.decimals())
		let totalSupply = convertTokenToDecimalUsingI32(pair.totalSupply(), pair.decimals())
		// compute user liquidities -- pool token A * (user LP token / total supply) + pool token B * (user LP token / total supply)
		position.token0 = liquidityToken0.times(position.tokenAmount).div(totalSupply)
		position.token1 = liquidityToken1.times(position.tokenAmount).div(totalSupply)
	}
	*/

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

import { BigInt, BigDecimal, Address } from '@graphprotocol/graph-ts'
import { Benis } from '../types/Benis/Benis'
import { BenisFarm, BenisPosition, User } from '../types/schema'

export const WBAN_ADDRESS = '{{wban_address}}'
export const BENIS_ADDRESS = '{{benis_address}}'

export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'
export let BI_18 = BigInt.fromI32(18)
export let ZERO_BI = BigInt.fromI32(0)
export let ONE_BI = BigInt.fromI32(1)
let ZERO_BD = BigDecimal.fromString("0")

export function createUser(address: Address): void {
  let user = User.load(address.toHexString())
  if (user === null) {
		user = new User(address.toHexString())
		user.banAddress = ''
		user.wbanBalance = ZERO_BD
		user.save()
  }
}

export function createBenisFarm(farmID: BigInt): void {
	let farm = BenisFarm.load(farmID.toString())
	let benis = Benis.bind(Address.fromString(BENIS_ADDRESS))
	let poolInfo = benis.poolInfo(farmID)
	if (farm === null) {
		farm = new BenisFarm(farmID.toString())
		let stakingToken = poolInfo.value0
		if (stakingToken == Address.fromString(WBAN_ADDRESS)) {
			farm.type = "Staking"
		} else {
			farm.type = "LiquidityPool"
		}
		farm.allocPoint = 0
		farm.allocWbanPerSecond = ZERO_BD
		farm.totalAmount = ZERO_BD
		farm.depositsCount = ZERO_BI
		farm.withdrawalsCount = ZERO_BI
		farm.currentHoldersCount = ZERO_BI
		farm.allTimeHoldersCount = ZERO_BI
		farm.currentHolders = []
		farm.allTimeHolders = []
		farm.save()
	}
}

export function createBenisPosition(farmID: string, userAddress: string): void {
	let positionID = farmID + "-" + userAddress
	let position = BenisPosition.load(positionID)
	if (position === null) {
		position = new BenisPosition(positionID)
		position.farm = farmID
		position.user = userAddress
		position.tokenAmount = ZERO_BD
		// position.token0 = ZERO_BD
		// position.token1 = ZERO_BD
		position.depositsCount = ZERO_BI
		position.withdrawalsCount = ZERO_BI
		position.save()
	}
}

export function convertTokenToDecimal(tokenAmount: BigInt, exchangeDecimals: BigInt): BigDecimal {
  if (exchangeDecimals == ZERO_BI) {
    return tokenAmount.toBigDecimal()
  }
  return tokenAmount.toBigDecimal().div(exponentToBigDecimal(exchangeDecimals))
}

export function convertTokenToDecimalUsingI32(tokenAmount: BigInt, exchangeDecimals: i32): BigDecimal {
  if (exchangeDecimals == 0) {
    return tokenAmount.toBigDecimal()
  }
  return tokenAmount.toBigDecimal().div(exponentToBigDecimal(BigInt.fromI32(exchangeDecimals)))
}

export function exponentToBigDecimal(decimals: BigInt): BigDecimal {
  let bd = BigDecimal.fromString('1')
  for (let i = ZERO_BI; i.lt(decimals as BigInt); i = i.plus(ONE_BI)) {
    bd = bd.times(BigDecimal.fromString('10'))
  }
  return bd
}

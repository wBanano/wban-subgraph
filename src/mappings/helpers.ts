import { log, BigInt, BigDecimal, Address, ethereum } from '@graphprotocol/graph-ts'
import { BenisFarm, BenisPosition, User } from '../types/schema'

export const WBAN_ADDRESS = '0xe20b9e246db5a0d21bf9209e4858bc9a3ff7a034'
export const BENIS_ADDRESS = '0x1e30e12e82956540bf870a40fd1215fc083a3751'

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
	if (farm === null) {
		farm = new BenisFarm(farmID.toString())
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

export function exponentToBigDecimal(decimals: BigInt): BigDecimal {
  let bd = BigDecimal.fromString('1')
  for (let i = ZERO_BI; i.lt(decimals as BigInt); i = i.plus(ONE_BI)) {
    bd = bd.times(BigDecimal.fromString('10'))
  }
  return bd
}

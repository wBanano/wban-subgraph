import { log, BigInt, BigDecimal, Address, ethereum } from '@graphprotocol/graph-ts'
import { User } from '../types/schema'

export const WBAN_ADDRESS = '0x9222D24274E912F4d5E889b460924C4fEFe97954'
export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'
export let BI_18 = BigInt.fromI32(18)
export let ZERO_BI = BigInt.fromI32(0)
export let ONE_BI = BigInt.fromI32(1)
let ZERO_BD = BigDecimal.fromString("0")

export function createUser(address: Address): void {
  let user = User.load(address.toHexString())
  if (user === null) {
    user = new User(address.toHexString())
    user.amount = ZERO_BD
    user.txnCount = ZERO_BD
    user.save()
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
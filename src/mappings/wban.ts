/* eslint-disable prefer-const */
import { BigDecimal, log } from '@graphprotocol/graph-ts'
import {
  WBANToken as WBAN,
  User,
  WBANToken
} from '../types/schema'
import { Transfer, SwapToBan } from '../types/WBANToken/WBANToken'
import { createUser, convertTokenToDecimal, WBAN_ADDRESS, ADDRESS_ZERO, BI_18, ONE_BI, ZERO_BI } from './helpers'

let BD_ZERO = BigDecimal.fromString("0")

export function handleTransfer(event: Transfer): void {
  let wban = WBANToken.load(WBAN_ADDRESS)
  if (wban === null) {
    wban = new WBANToken(WBAN_ADDRESS)
    wban.totalSupply = BD_ZERO
		wban.currentHoldersCount = ZERO_BI
		wban.allTimeHoldersCount = ZERO_BI
  }

  let from = event.params.from
  let to = event.params.to

	let isNewUser = User.load(to.toHexString()) === null;
	if (isNewUser) {
		// if new users increase totalHodlers count
		wban.allTimeHoldersCount = wban.allTimeHoldersCount.plus(ONE_BI)
		let oldCount = wban.currentHoldersCount
		wban.currentHoldersCount = oldCount.plus(ONE_BI)
  } else if (User.load(to.toHexString()).wbanBalance.equals(BD_ZERO)) {
		// if users had a zero balance, increase hodlers count
		let oldCount = wban.currentHoldersCount
		wban.currentHoldersCount = oldCount.plus(ONE_BI)
	}

  // token amount being transfered
  let value = convertTokenToDecimal(event.params.value, BI_18)

	log.info("Transfer of {} wBAN: {} -> {}", [value.toString(), from.toHexString(), to.toHexString()]);

  // users
  createUser(from)
  createUser(to)

  // update amounts of each user
  let userFrom = User.load(from.toHexString())
  let userTo = User.load(to.toHexString())

	if (from.toHexString() !== ADDRESS_ZERO) {
		userFrom.wbanBalance = userFrom.wbanBalance.minus(value)
	}
	if (to.toHexString() !== ADDRESS_ZERO) {
		userTo.wbanBalance = userTo.wbanBalance.plus(value)
	}

  // if sender has no wBAN left, decrease hodlers count
	if (userFrom.wbanBalance.equals(BD_ZERO)) {
		let oldCount = wban.currentHoldersCount
		wban.currentHoldersCount = oldCount.minus(ONE_BI)
  }

	// increase total supply when minting wBAN
	if (from.toHexString() == ADDRESS_ZERO) {
		// update total supply
		wban.totalSupply = wban.totalSupply.plus(value)
	}
	// decrease total supply when wBAN are burnt
  if (to.toHexString() == ADDRESS_ZERO) {
    // update total supply
    wban.totalSupply = wban.totalSupply.minus(value)
  }

  // transaction.save()
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

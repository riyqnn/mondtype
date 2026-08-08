import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { monadTestnet } from './chain'
import { TYPERACE_PVP_ADDRESS, TYPERACE_PVP_ABI } from '../web3/abi'

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
})

function getOracleAccount() {
  const key = process.env.ORACLE_PRIVATE_KEY ?? ''
  if (!key) return null
  try {
    return privateKeyToAccount(key as `0x${string}`)
  } catch {
    return null
  }
}

export async function submitResultToContract(
  roomId: number,
  rankedWinners: string[],
): Promise<string> {
  const account = getOracleAccount()
  if (!account) {
    throw new Error('ORACLE_PRIVATE_KEY not set or invalid')
  }

  const walletClient = createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(),
  })

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const hash = await walletClient.writeContract({
        address: TYPERACE_PVP_ADDRESS as `0x${string}`,
        abi: TYPERACE_PVP_ABI as any,
        functionName: 'submitResult',
        args: [BigInt(roomId), rankedWinners as `0x${string}`[]],
        chain: monadTestnet,
      })

      await publicClient.waitForTransactionReceipt({ hash })

      return hash
    } catch (err: any) {
      lastError = err
      console.error(`[Oracle] Attempt ${attempt}/3 failed:`, err.shortMessage || err.message)
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 2000 * attempt))
      }
    }
  }

  throw lastError || new Error('submitResult failed after 3 attempts')
}
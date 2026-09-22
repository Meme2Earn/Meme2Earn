# Meme2Earn Contracts

## Robinhood Testnet

- Chain ID: `46630`
- RPC: `https://rpc.testnet.chain.robinhood.com`
- Explorer: `https://explorer.testnet.chain.robinhood.com`
- Deployed fee-enabled `DareEscrow`: `0xc4a814d48E63679F3033Aa23a7970578C470b2d9`
- Deployed `Meme2EarnTestToken` (`M2ET`): `0x269c486937D7076B6a6567bb7E7d24ddC3BEEF19`
- `M2ET` transfer for testing: `1,000,000` tokens sent to `0x2EC32DebF00222943Fd9DAF93A625D9A5ccAB319`
- Creator-funded dare fee: `2.5%`, paid at campaign launch to the escrow fee recipient.

## Commands

```bash
pnpm run contracts:compile
pnpm run deploy:robinhood-testnet
```

The deploy script allowlists the supported Meme2Earn tokens after deployment.

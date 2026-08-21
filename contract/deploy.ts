import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import WebSocket from 'isomorphic-ws';
const WSConstructor = (WebSocket as any).default || WebSocket;
(globalThis as any).WebSocket = WSConstructor;
import * as bip39 from 'bip39';

import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { NetworkId } from '@midnight-ntwrk/wallet-sdk-abstractions';
import {
  LedgerParameters,
  ZswapSecretKeys,
  DustSecretKey,
} from '@midnight-ntwrk/ledger-v8';
import { WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
import { UnshieldedWallet, PublicKey, createKeystore } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { DustWallet } from '@midnight-ntwrk/wallet-sdk-dust-wallet';

import { Contract } from './managed/private-campus-poll/contract/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env
const rootEnvPath = path.join(rootDir, '.env');
const rootEnvExamplePath = path.join(rootDir, '.env.example');

if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else if (fs.existsSync(rootEnvExamplePath)) {
  dotenv.config({ path: rootEnvExamplePath });
}

function updateEnvFile(key: string, value: string) {
  let envContent = '';
  if (fs.existsSync(rootEnvPath)) {
    envContent = fs.readFileSync(rootEnvPath, 'utf8');
  } else if (fs.existsSync(rootEnvExamplePath)) {
    envContent = fs.readFileSync(rootEnvExamplePath, 'utf8');
  }

  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(envContent)) {
    envContent = envContent.replace(regex, `${key}="${value}"`);
  } else {
    envContent += `\n${key}="${value}"\n`;
  }

  fs.writeFileSync(rootEnvPath, envContent.trim() + '\n', 'utf8');
}

const CONSTANT_WALLET_MNEMONIC =
  'shuffle crunch verify barely pave fine gallery weasel comic fabric steel believe debris false alone rural pudding boost guide segment notice deposit nuclear donkey';

function parseSeedOrMnemonic(raw: string): { seed: Uint8Array; seedHex: string } | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;

  // Check BIP-39 mnemonic phrase
  if (trimmed.includes(' ')) {
    try {
      const seedBuffer = bip39.mnemonicToSeedSync(trimmed).subarray(0, 32);
      return {
        seed: new Uint8Array(seedBuffer),
        seedHex: Buffer.from(seedBuffer).toString('hex'),
      };
    } catch {
      return null;
    }
  }

  // Check 64-character hex seed
  const cleanHex = trimmed.replace(/^0x/i, '');
  if (cleanHex.length === 64 && /^[0-9a-fA-F]{64}$/.test(cleanHex)) {
    const seedBuffer = Buffer.from(cleanHex, 'hex');
    return {
      seed: new Uint8Array(seedBuffer),
      seedHex: cleanHex.toLowerCase(),
    };
  }

  return null;
}

function resolveDeployerSeed(): { seed: Uint8Array; seedHex: string } {
  const envSeed =
    process.env.MIDNIGHT_WALLET_SEED ||
    process.env.WALLET_SEED ||
    process.env.DEPLOYER_SEED ||
    CONSTANT_WALLET_MNEMONIC;

  const resolved = parseSeedOrMnemonic(envSeed) || parseSeedOrMnemonic(CONSTANT_WALLET_MNEMONIC)!;
  return resolved;
}

async function main() {
  console.log('================================================================');
  console.log('  Midnight Smart Contract Deployment: Private Campus Poll');
  console.log('================================================================\n');

  const rawNetwork = process.env.VITE_MIDNIGHT_NETWORK_ID || 'preview';
  let networkId: NetworkId.NetworkId;
  if (rawNetwork === 'preview') {
    networkId = NetworkId.NetworkId.Preview;
  } else if (rawNetwork === 'testnet-02' || rawNetwork === 'testnet') {
    networkId = NetworkId.NetworkId.TestNet;
  } else if (rawNetwork === 'undeployed') {
    networkId = NetworkId.NetworkId.Undeployed;
  } else {
    networkId = rawNetwork as NetworkId.NetworkId;
  }

  const indexerUri = process.env.VITE_INDEXER_URI || 'https://indexer.testnet-02.midnight.network/api/v1/graphql';
  const indexerWsUri = process.env.VITE_INDEXER_WS_URI || 'wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws';
  const nodeUri = process.env.VITE_NODE_URI || 'https://rpc.testnet-02.midnight.network';
  const proofServerUri = process.env.VITE_PROOF_SERVER_URI || 'https://proof-server.testnet-02.midnight.network';
  const storagePassword = process.env.WALLET_STORAGE_PASSWORD || 'Midnight#Private#Storage#Pass2026!';

  console.log(`[Config] Network ID:       ${networkId} (env: ${rawNetwork})`);
  console.log(`[Config] Indexer GraphQL:  ${indexerUri}`);
  console.log(`[Config] Indexer WS:       ${indexerWsUri}`);
  console.log(`[Config] Node RPC URI:     ${nodeUri}`);
  console.log(`[Config] Proof Server:     ${proofServerUri}\n`);

  setNetworkId(networkId);

  // 1. Resolve Constant Deployer Seed & Keys
  const { seed, seedHex } = resolveDeployerSeed();
  console.log(`[Wallet] Deployer Wallet:   Constant Wallet`);
  console.log(`[Wallet] Seed (hex):        ${seedHex.slice(0, 12)}...${seedHex.slice(-8)}`);

  const shieldedSecretKeys = ZswapSecretKeys.fromSeed(seed);
  const dustSecretKey = DustSecretKey.fromSeed(seed);
  const unshieldedKeystore = createKeystore(seed, networkId);
  const unshieldedPublicKey = PublicKey.fromKeyStore(unshieldedKeystore);

  const unshieldedAddress = unshieldedKeystore.getBech32Address().asString();
  console.log(`[Wallet] Unshielded Address (Faucet recipient):`);
  console.log(`         >>> ${unshieldedAddress} <<<\n`);

  // 2. Initialize Providers
  const contractArtifactsPath = path.join(__dirname, 'managed', 'private-campus-poll');
  if (!fs.existsSync(path.join(contractArtifactsPath, 'keys')) || !fs.existsSync(path.join(contractArtifactsPath, 'zkir'))) {
    throw new Error(`Compiled contract artifacts missing in ${contractArtifactsPath}. Run 'npm run contract:build:zk' first.`);
  }

  console.log(`[Providers] Initializing ZK config provider from: ${contractArtifactsPath}`);
  const zkConfigProvider = new NodeZkConfigProvider(contractArtifactsPath);

  console.log(`[Providers] Connecting to Proof Server: ${proofServerUri}`);
  const proofProvider = httpClientProofProvider(proofServerUri, zkConfigProvider);

  console.log(`[Providers] Connecting to Indexer: ${indexerUri}`);
  const publicDataProvider = indexerPublicDataProvider(indexerUri, indexerWsUri, WSConstructor);

  console.log(`[Providers] Setting up local private state storage...`);
  const privateStateProvider = levelPrivateStateProvider({
    midnightDbName: 'midnight-deploy-state',
    accountId: unshieldedPublicKey.address,
    privateStoragePasswordProvider: () => storagePassword,
  });

  console.log(`[Wallet] Initializing Wallet Facade...`);
  const wallet = await WalletFacade.init({
    configuration: {
      networkId,
      indexerClientConnection: {
        indexerHttpUrl: indexerUri,
        indexerWsUrl: indexerWsUri,
      },
      relayURL: new URL(nodeUri),
      provingServerUrl: new URL(proofServerUri),
    },
    shielded: (config) => ShieldedWallet(config).startWithSeed(seed),
    unshielded: (config) => UnshieldedWallet(config).startWithPublicKey(unshieldedPublicKey),
    dust: (config) => DustWallet(config).startWithSeed(seed, LedgerParameters.initialParameters().dust),
  });

  console.log(`[Wallet] Starting wallet synchronization with Midnight network...`);
  await wallet.start(shieldedSecretKeys, dustSecretKey);

  console.log(`[Wallet] Waiting for wallet state to sync with chain tip...`);
  
  // Track sync progress via state stream
  let currentWalletState: any = null;
  const stateSub = (wallet as any).state?.subscribe?.((state: any) => {
    currentWalletState = state;
    const coins = state?.unshielded?.availableCoins?.length || 0;
    const dust = state?.dust ? state.dust.balance(new Date()) : 0n;
    if (coins > 0 || dust > 0n) {
      console.log(`[Wallet] Received state update: ${coins} UTXOs, DUST: ${dust}`);
    }
  });

  let syncedState: any;
  try {
    syncedState = await Promise.race([
      wallet.waitForSyncedState(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Wallet sync timeout (300s).')), 300000)),
    ]);
    console.log(`[Wallet] Successfully synced with chain tip!`);
  } catch (err: any) {
    console.warn(`[Wallet] Sync note: ${err?.message || err}`);
    syncedState = currentWalletState;
  }
  if (stateSub?.unsubscribe) stateSub.unsubscribe();

  // Check and report balances
  const unshieldedCoins = syncedState?.unshielded?.availableCoins || [];
  const totalUnshieldedBalance = unshieldedCoins.reduce((sum: bigint, c: any) => sum + c.utxo.value, 0n);
  const dustBalance = syncedState?.dust ? syncedState.dust.balance(new Date()) : 0n;

  console.log(`\n--- Wallet Balance Summary ---`);
  console.log(`Unshielded UTXOs:   ${unshieldedCoins.length}`);
  console.log(`Unshielded NIGHT:   ${totalUnshieldedBalance}`);
  console.log(`DUST Balance:       ${dustBalance}`);
  console.log(`------------------------------\n`);

  // Handle DUST generation if needed
  if (dustBalance === 0n && unshieldedCoins.length > 0) {
    console.log(`[Funding] DUST balance is 0. Registering available Night UTXOs for DUST generation...`);
    try {
      const recipe = await wallet.registerNightUtxosForDustGeneration(
        unshieldedCoins,
        unshieldedKeystore.getPublicKey(),
        (payload) => unshieldedKeystore.signData(payload)
      );
      const finalized = await wallet.finalizeRecipe(recipe);
      const txId = await wallet.submitTransaction(finalized);
      console.log(`[Funding] DUST registration submitted (txId: ${txId}).`);
      console.log(`[Funding] Waiting for DUST generation...`);
      await wallet.waitForGeneratedDust(unshieldedCoins, 1000000n);
      console.log(`[Funding] DUST generated successfully.\n`);
    } catch (regErr) {
      console.warn(`[Funding] DUST registration notice:`, regErr);
    }
  }

  const faucetUrl =
    rawNetwork === 'preview'
      ? 'https://faucet.preview.midnight.network'
      : 'https://faucet.testnet-02.midnight.network';

  if (totalUnshieldedBalance === 0n && dustBalance === 0n) {
    console.error(`\n[ERROR] Deployer wallet has 0 Unshielded NIGHT and 0 DUST balance.`);
    console.error(`On Midnight, smart contract deployment requires UNSHIELDED tokens (to balance and submit the deployment tx).`);
    console.error(`Please request test tokens for this deployer's Unshielded address:`);
    console.error(`  1. Open Faucet:  ${faucetUrl}`);
    console.error(`  2. Paste Address: ${unshieldedAddress}`);
    console.error(`  3. Request tNIGHT / tDUST`);
    console.error(`  4. Once received in faucet, re-run: npm run contract:deploy\n`);
    await wallet.stop();
    process.exit(1);
  }

  // 3. Assemble Providers
  const walletProvider = {
    async balanceTx(tx: any, ttl?: Date) {
      const recipe = await wallet.balanceUnboundTransaction(
        tx,
        { shieldedSecretKeys, dustSecretKey },
        { ttl: ttl ?? new Date(Date.now() + 3600 * 1000) }
      );
      return await wallet.finalizeRecipe(recipe);
    },
    getCoinPublicKey() {
      return shieldedSecretKeys.coinPublicKey;
    },
    getEncryptionPublicKey() {
      return shieldedSecretKeys.encryptionPublicKey;
    },
  };

  const midnightProvider = {
    async submitTx(tx: any) {
      return await wallet.submitTransaction(tx);
    },
  };

  const providers = {
    privateStateProvider,
    publicDataProvider,
    zkConfigProvider,
    proofProvider,
    walletProvider,
    midnightProvider,
  };

  // 4. Construct Contract & Deploy
  console.log(`[Deploy] Preparing contract constructor for 'private-campus-poll'...`);
  const witnesses = {
    localSecretKey: (context: any) => [context.privateState, new Uint8Array(32)],
    voteChoice: (context: any) => [context.privateState, 0n],
  };

  const compiledContract = CompiledContract.make('private-campus-poll', Contract).pipe(
    CompiledContract.withWitnesses(witnesses),
    CompiledContract.withCompiledFileAssets(contractArtifactsPath)
  );

  console.log(`[Deploy] Submitting deployment transaction to Midnight network...`);
  console.log(`[Deploy] (Proving and on-chain submission in progress — this may take 1-3 minutes)...\n`);

  const deployedContract = await deployContract(providers as any, {
    compiledContract: compiledContract as any,
    privateStateId: 'pollPrivateState',
    initialPrivateState: undefined,
  });

  const contractAddress = deployedContract.deployTxData.public.contractAddress;
  const txId = (deployedContract.deployTxData.public as any).txId || 'N/A';
  const blockHeight = (deployedContract.deployTxData.public as any).blockHeight || 'N/A';

  console.log('\n================================================================');
  console.log('  SUCCESSFULLY DEPLOYED TO MIDNIGHT TESTNET-02!');
  console.log('================================================================');
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Transaction ID:   ${txId}`);
  console.log(`Block Height:     ${blockHeight}`);
  console.log('================================================================\n');

  // 5. Verify on-chain deployment
  console.log(`[Verify] Verifying deployed contract on-chain state via indexer...`);
  try {
    const onChainState = await publicDataProvider.queryContractState(contractAddress as any);
    if (onChainState) {
      console.log(`[Verify] Contract verified on-chain! Initial state active.`);
    } else {
      console.log(`[Verify] Contract submitted. State indexing will complete shortly.`);
    }
  } catch (vErr) {
    console.warn(`[Verify] State query notice:`, vErr);
  }

  // 6. Update .env with VITE_POLL_CONTRACT_ADDRESS
  updateEnvFile('VITE_POLL_CONTRACT_ADDRESS', contractAddress);
  console.log(`\n[Environment] Updated VITE_POLL_CONTRACT_ADDRESS in .env`);
  console.log(`Frontend is now configured to interact with this contract.\n`);

  // Stop wallet background workers
  await wallet.stop();
  console.log(`[Done] Deployment complete.`);
}

main().catch((err) => {
  console.error('\n[FATAL] Deployment failed:', err);
  process.exit(1);
});

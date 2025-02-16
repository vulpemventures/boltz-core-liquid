import { ECPairFactory, ECPairInterface, ECPairAPI, TinySecp256k1Interface } from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import { crypto, address, Transaction, networks } from 'liquidjs-lib';
import ChainClient from './utils/ChainClient';
import { ClaimDetails, RefundDetails } from '../../lib/consts/Types';
import { p2wpkhOutput, p2shOutput, p2wshOutput, p2shP2wshOutput } from '../../lib/swap/Scripts';
import { Networks, OutputType, detectSwap, constructClaimTransaction, constructRefundTransaction } from '../../lib/Boltz';

export const bitcoinClient = new ChainClient({
  host: '127.0.0.1',
  port: 18884,
  rpcuser: 'elements',
  rpcpass: 'elements',
});

const tinysecp: TinySecp256k1Interface = ecc;
export const ECPair: ECPairAPI = ECPairFactory(tinysecp);

export const destinationOutput = p2wpkhOutput(
  crypto.hash160(
    ECPair.makeRandom({ network: Networks.liquidRegtest }).publicKey!,
  ),
);

export const claimSwap = async (claimDetails: ClaimDetails): Promise<void> => {
  const claimTransaction = constructClaimTransaction(
    [claimDetails],
    destinationOutput,
    1,
    true,
    networks.regtest.assetHash,
  );

  await bitcoinClient.sendRawTransaction(claimTransaction.toHex());
};

export const refundSwap = async (refundDetails: RefundDetails, blockHeight: number): Promise<void> => {
  const refundTransaction = constructRefundTransaction(
    [refundDetails],
    destinationOutput,
    blockHeight,
    1,
    true,
    networks.regtest.assetHash
  );

  await bitcoinClient.sendRawTransaction(refundTransaction.toHex());
};

export const createSwapDetails = async (
  generateScript: (preimageHash: Buffer, claimPublicKey: Buffer, refundPublicKey: Buffer, timeoutBlockHeight: number) => Buffer,
  preimage: Buffer,
  preimageHash: Buffer,
  claimKeys: ECPairInterface,
  refundKeys: ECPairInterface,
): Promise<{
  claimDetails: ClaimDetails[],
  refundDetails: RefundDetails[],
}> => {
  const claimDetails: ClaimDetails[] = [];
  const refundDetails: RefundDetails[] = [];

  for (let i = 0; i < 2; i += 1) {
    const claimOutputs = await createOutputs(generateScript, preimageHash, claimKeys, refundKeys);

    claimOutputs.forEach((out) => {
      claimDetails.push({
        preimage,
        keys: claimKeys,
        redeemScript: out.redeemScript,
        ...out.swapOutput,
      });
    });

    const refundOutputs = await createOutputs(generateScript, preimageHash, claimKeys, refundKeys);

    refundOutputs.forEach((out) => {
      refundDetails.push({
        keys: refundKeys,
        redeemScript: out.redeemScript,
        ...out.swapOutput,
      });
    });
  }

  return {
    claimDetails,
    refundDetails,
  };
};

const createOutputs = async (
  generateScript: (preimageHash: Buffer, claimPublicKey: Buffer, refundPublicKey: Buffer, timeoutBlockHeight: number) => Buffer,
  preimageHash: Buffer,
  claimKeys: ECPairInterface,
  refundKeys: ECPairInterface,
) => {
  const { blocks } = await bitcoinClient.getBlockchainInfo();
  const timeoutBlockHeight = blocks + 1;

  const redeemScript = generateScript(preimageHash, claimKeys.publicKey!, refundKeys.publicKey!, timeoutBlockHeight);

  return [
    await sendFundsToRedeemScript(p2shOutput, OutputType.Legacy, redeemScript, timeoutBlockHeight),
    await sendFundsToRedeemScript(p2wshOutput, OutputType.Bech32, redeemScript, timeoutBlockHeight),
    await sendFundsToRedeemScript(p2shP2wshOutput, OutputType.Compatibility, redeemScript, timeoutBlockHeight),
  ];
};

export const sendFundsToRedeemScript = async (
  outputFunction: (scriptHex: Buffer) => Buffer,
  outputType: OutputType,
  redeemScript: Buffer,
  timeoutBlockHeight: number,
): Promise<{
  redeemScript: Buffer,
  timeoutBlockHeight: number,
  swapOutput: {
    vout: number,
    value: Buffer,
    script: Buffer,
    asset: Buffer,
    nonce: Buffer,
    txHash: Buffer,
    type: OutputType,
  },
}> => {
  const swapAddress = address.fromOutputScript(outputFunction(redeemScript), Networks.liquidRegtest);
  const transactionId = await bitcoinClient.sendToAddress(swapAddress, 10000);
  const transaction = Transaction.fromHex(await bitcoinClient.getRawTransaction(transactionId) as string);

  const { vout, value, script, asset, nonce } = detectSwap(redeemScript, transaction)!;

  return {
    redeemScript,
    timeoutBlockHeight,
    swapOutput: {
      vout,
      value,
      script,
      asset,
      nonce,
      type: outputType,
      txHash: transaction.getHash(),
    },
  };
};


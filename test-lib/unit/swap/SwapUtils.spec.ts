import ops from '@boltz/bitcoin-ops';
import { Transaction, crypto, script } from 'liquidjs-lib';
import Networks from '../../../lib/consts/Networks';
import * as scripts from '../../../lib/swap/Scripts';
import { OutputType } from '../../../lib/consts/Enums';
import { getHexString, getHexBuffer } from '../../../lib/Utils';
import {
  encodeCltv,
  encodeSignature,
  toPushdataScript,
  getOutputScriptType,
  scriptBuffersToScript,
} from '../../../lib/swap/SwapUtils';
import { ECPair } from './Utils';

describe('SwapUtils', () => {
  const publicKeyHash = '0000000000000000000000000000000000000000';

  test('should encode signatures', () => {
    const testData = [
      {
        args: {
          flag: Transaction.SIGHASH_ALL,
          signature: '4e45e16932b8af514961a1d3a1a25fdf3f4f7732e9d624c6c61548ab5fb8cd41181522ec8eca07de4860a4acdd12909d831cc56cbbac4622082221a8768d1d09',
        },
        result: '304402204e45e16932b8af514961a1d3a1a25fdf3f4f7732e9d624c6c61548ab5fb8cd410220181522ec8eca07de4860a4acdd12909d831cc56cbbac4622082221a8768d1d0901',
      },
      {
        args: {
          flag: Transaction.SIGHASH_ALL,
          signature: '82235e21a2300022738dabb8e1bbd9d19cfb1e7ab8c30a23b0afbb8d178abcf324bf68e256c534ddfaf966bf908deb944305596f7bdcc38d69acad7f9c868724',
        },
        result: '304502210082235e21a2300022738dabb8e1bbd9d19cfb1e7ab8c30a23b0afbb8d178abcf3022024bf68e256c534ddfaf966bf908deb944305596f7bdcc38d69acad7f9c86872401',
      },
      {
        args: {
          flag: Transaction.SIGHASH_ALL,
          signature: '1cadddc2838598fee7dc35a12b340c6bde8b389f7bfd19a1252a17c4b5ed2d71c1a251bbecb14b058a8bd77f65de87e51c47e95904f4c0e9d52eddc21c1415ac',
        },
        result: '304502201cadddc2838598fee7dc35a12b340c6bde8b389f7bfd19a1252a17c4b5ed2d71022100c1a251bbecb14b058a8bd77f65de87e51c47e95904f4c0e9d52eddc21c1415ac01',
      },
      {
        args: {
          flag: Transaction.SIGHASH_ALL,
          signature: '1b19519b38ca1e6813cd25649ad36be8bc6a6f2ad9758089c429acd9ce0b572f3bf32193c8a3a3de1f847cd6e6eebf43c96df1ffa4d7fe920f8f71708920c65f',
        },
        result: '304402201b19519b38ca1e6813cd25649ad36be8bc6a6f2ad9758089c429acd9ce0b572f02203bf32193c8a3a3de1f847cd6e6eebf43c96df1ffa4d7fe920f8f71708920c65f01',
      },
    ];

    testData.forEach((data) => {
      const { flag, signature } = data.args;

      const result = encodeSignature(flag, getHexBuffer(signature));
      expect(getHexString(result)).toEqual(data.result);
    });
  });

  test('should get formed scripts', () => {
    const testData = {
      args: {
        elements: [
          getHexBuffer(publicKeyHash),
          ops.OP_PUSHDATA1,
        ],
      },
      result: '1400000000000000000000000000000000000000004c',
    };

    const result = scriptBuffersToScript(testData.args.elements);
    expect(getHexString(result)).toEqual(testData.result);
  });

  test('should get formed pushdata scripts', () => {
    const testData = {
      args: {
        elements: [
          ops.OP_HASH160,
          crypto.hash160(getHexBuffer(publicKeyHash)),
          ops.OP_EQUALVERIFY,
        ],
      },
      result: 'a914944f997c5553a6f3e1028e707c71b5fa0dd3afa788',
    };

    const result = toPushdataScript(testData.args.elements);
    expect(getHexString(result)).toEqual(testData.result);
  });

  test('should get the correct output type of output scripts', () => {
    const keys = ECPair.makeRandom({ network: Networks.liquidRegtest });
    const publicKeyHash = crypto.hash160(keys.publicKey!);

    // PKH outputs
    expect(getOutputScriptType(scripts.p2wpkhOutput(publicKeyHash))).toEqual({ type: OutputType.Bech32, isSh: false });
    expect(getOutputScriptType(scripts.p2pkhOutput(publicKeyHash))).toEqual({ type: OutputType.Legacy, isSh: false });

    // SH outputs
    expect(getOutputScriptType(scripts.p2wshOutput(publicKeyHash))).toEqual({ type: OutputType.Bech32, isSh: true });
    expect(getOutputScriptType(scripts.p2shOutput(publicKeyHash))).toEqual({ type: OutputType.Legacy, isSh: true });

    // Compatibility output
    expect(getOutputScriptType(scripts.p2shP2wpkhOutput(publicKeyHash).outputScript)).toEqual({ type: OutputType.Legacy, isSh: true });
    expect(getOutputScriptType(scripts.p2shP2wshOutput(publicKeyHash))).toEqual({ type: OutputType.Legacy, isSh: true });

    // It should return "undefined" if the output script is an unknown one
    expect(getOutputScriptType(script.compile([ops.OP_INVALIDOPCODE]))).toBeUndefined();
  });

  test('should encode CLTVs', () => {
    expect(encodeCltv(608861)).toEqual(getHexBuffer('5d4a09'));
  });
});

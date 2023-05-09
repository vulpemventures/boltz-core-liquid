import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';
import { getHexBuffer } from '../../../lib/Utils';
import { OutputType } from '../../../lib/consts/Enums';
import { RefundDetails } from '../../../lib/consts/Types';
import { constructRefundTransaction } from '../../../lib/swap/Refund';
import { LBTC_REGTEST } from './Utils';
import { Nonce } from '../../../lib/consts/Buffer';
import { confidential, networks } from 'liquidjs-lib';

const bip32 = BIP32Factory(ecc);

describe('Refund', () => {
  const utxo = {
    txHash: getHexBuffer('285d227e2823c679c224b4d562a9b5b5b7b927badd483df9f4225c6fc761d754'),
    vout: 0,
    value: confidential.satoshiToConfidentialValue(2000),

    keys: bip32.fromBase58('xprv9xgxR6htMdXUXGipynZp1janNrWNYJxaz2o4tH9fdtZqcF26BX5VB88GSM5KgZHWCyAyb8FZpQik2UET84CHfGWXFMG5zWWjmtDMgqYuo19'),
    redeemScript: getHexBuffer('a914a0738c92fde6361f09d28950c7bd0d2bf32b34be87632103be4a251dae719d565ce1d6a7a5787df99fc1ecc1f6e847567981a686f32abce167027802b1752103f7877d4ae985bb30b6f150ad6b6b9935c342432beed1a4781347b169c1e2417368ac'),
  };

  const refundDetails = [
    {
      ...utxo,
      type: OutputType.Bech32,
      script: getHexBuffer('00206f38b6ce82427d4df080a9833d06cc6c66ab816545c9fd4df50f9d1ca8430b9e'),
      asset: LBTC_REGTEST,
      nonce: Nonce,
    },
    {
      ...utxo,
      type: OutputType.Legacy,
      script: getHexBuffer('a9143cdeb56e328a10d3bfe107fd5a16bd73871adb8d87'),
      asset: LBTC_REGTEST,
      nonce: Nonce,
    },
    {
      ...utxo,
      type: OutputType.Compatibility,
      script: getHexBuffer('a9148f439aff651860bdb28c66500c6e958cfbe7a69387'),
      asset: LBTC_REGTEST,
      nonce: Nonce,
    },
  ];

  const testRefund = (utxos: RefundDetails[], fee: number) => {
    return constructRefundTransaction(
      utxos,
      getHexBuffer('00140000000000000000000000000000000000000000'),
      11,
      fee,
      true,
      networks.regtest.assetHash
    );
  };

  test('should refund a P2WSH swap', () => {
    const expected = '010000000101285d227e2823c679c224b4d562a9b5b5b7b927badd483df9f4225c6fc761d7540000000000fdffffff020125b251070e29ca19043cf33ccd7324e2ddab03ecc4ae0b5e77c4fc0e5cf6c95a0100000000000007510016001400000000000000000000000000000000000000000125b251070e29ca19043cf33ccd7324e2ddab03ecc4ae0b5e77c4fc0e5cf6c95a01000000000000007f00000b000000000003473044022033541e497b8ece22c3325678ecfa9e67581edce28e82e132675174efada1f89f02202a8e88e8a041eb9191c603170507fd9fca6ae441cc4cab5ec3b9e2e95051f1eb010064a914a0738c92fde6361f09d28950c7bd0d2bf32b34be87632103be4a251dae719d565ce1d6a7a5787df99fc1ecc1f6e847567981a686f32abce167027802b1752103f7877d4ae985bb30b6f150ad6b6b9935c342432beed1a4781347b169c1e2417368ac0000000000';

    expect(testRefund([
      refundDetails[0],
    ], 127).toHex()).toEqual(expected);
  });

  test('should refund a P2SH swap', () => {
    const expected = '010000000001285d227e2823c679c224b4d562a9b5b5b7b927badd483df9f4225c6fc761d75400000000af47304402200259e547b1c5319f0284fccf1b675a4e70bfb4dd354533bf4cf7bc75f9ec7ff20220190c92b3fb4f8ec1a7a828a29ec1e98ce46c15d4c1c700fa7961e84c85326c4a01004c64a914a0738c92fde6361f09d28950c7bd0d2bf32b34be87632103be4a251dae719d565ce1d6a7a5787df99fc1ecc1f6e847567981a686f32abce167027802b1752103f7877d4ae985bb30b6f150ad6b6b9935c342432beed1a4781347b169c1e2417368acfdffffff020125b251070e29ca19043cf33ccd7324e2ddab03ecc4ae0b5e77c4fc0e5cf6c95a0100000000000006ce0016001400000000000000000000000000000000000000000125b251070e29ca19043cf33ccd7324e2ddab03ecc4ae0b5e77c4fc0e5cf6c95a01000000000000010200000b000000';

    expect(testRefund([refundDetails[1]], 258).toHex()).toEqual(expected);
  });

  test('should refund a P2SH nested P2WSH swap', () => {
    const expected = '010000000101285d227e2823c679c224b4d562a9b5b5b7b927badd483df9f4225c6fc761d75400000000232200206f38b6ce82427d4df080a9833d06cc6c66ab816545c9fd4df50f9d1ca8430b9efdffffff020125b251070e29ca19043cf33ccd7324e2ddab03ecc4ae0b5e77c4fc0e5cf6c95a01000000000000072e0016001400000000000000000000000000000000000000000125b251070e29ca19043cf33ccd7324e2ddab03ecc4ae0b5e77c4fc0e5cf6c95a0100000000000000a200000b0000000000034830450221009f66d3c2543ce27b6c05e98bcce115760b52b7ce6bcc7e9ad308d44c7543bbb30220541db3a2425d14367286655d11aa734d8acd9923052d1d37a284010b9384b69f010064a914a0738c92fde6361f09d28950c7bd0d2bf32b34be87632103be4a251dae719d565ce1d6a7a5787df99fc1ecc1f6e847567981a686f32abce167027802b1752103f7877d4ae985bb30b6f150ad6b6b9935c342432beed1a4781347b169c1e2417368ac0000000000';

    expect(testRefund([refundDetails[2]], 162).toHex()).toEqual(expected);
  });

  test('should refund multiple swaps in one transaction', () => {
    const expected = '010000000103285d227e2823c679c224b4d562a9b5b5b7b927badd483df9f4225c6fc761d7540000000000fdffffff285d227e2823c679c224b4d562a9b5b5b7b927badd483df9f4225c6fc761d75400000000af47304402203d61efe2c55984f67759592084cf3bc22f133c6b54a0021d6ab678b9184b6f120220193adda5da6fe1166f2bdb935ab9ee05548171fdf6dba8df1aeb3a1cc1ac3f9701004c64a914a0738c92fde6361f09d28950c7bd0d2bf32b34be87632103be4a251dae719d565ce1d6a7a5787df99fc1ecc1f6e847567981a686f32abce167027802b1752103f7877d4ae985bb30b6f150ad6b6b9935c342432beed1a4781347b169c1e2417368acfdffffff285d227e2823c679c224b4d562a9b5b5b7b927badd483df9f4225c6fc761d75400000000232200206f38b6ce82427d4df080a9833d06cc6c66ab816545c9fd4df50f9d1ca8430b9efdffffff020125b251070e29ca19043cf33ccd7324e2ddab03ecc4ae0b5e77c4fc0e5cf6c95a01000000000000159e0016001400000000000000000000000000000000000000000125b251070e29ca19043cf33ccd7324e2ddab03ecc4ae0b5e77c4fc0e5cf6c95a0100000000000001d200000b0000000000034730440220118b3ed783265094633ec0503e4fe6b1830391d893acfed5008ae3d89dd72171022047b79de7c4f42d6dfd738c19f582c2875d811420a183e24ebc0cc2600b822193010064a914a0738c92fde6361f09d28950c7bd0d2bf32b34be87632103be4a251dae719d565ce1d6a7a5787df99fc1ecc1f6e847567981a686f32abce167027802b1752103f7877d4ae985bb30b6f150ad6b6b9935c342432beed1a4781347b169c1e2417368ac00000000000000034730440220118b3ed783265094633ec0503e4fe6b1830391d893acfed5008ae3d89dd72171022047b79de7c4f42d6dfd738c19f582c2875d811420a183e24ebc0cc2600b822193010064a914a0738c92fde6361f09d28950c7bd0d2bf32b34be87632103be4a251dae719d565ce1d6a7a5787df99fc1ecc1f6e847567981a686f32abce167027802b1752103f7877d4ae985bb30b6f150ad6b6b9935c342432beed1a4781347b169c1e2417368ac0000000000';

    expect(testRefund(refundDetails, 466).toHex()).toEqual(expected);
  });
});
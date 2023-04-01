import { Shamir, evaluatePolynomial, interpolate } from './Add';
import {
  isReady,
  shutdown,
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  AccountUpdate,
  UInt64,
} from 'snarkyjs';

/*
 * This file specifies how to test the `Add` example smart contract. It is safe to delete this file and replace
 * with your own tests.
 *
 * See https://docs.minaprotocol.com/zkapps for more info.
 */

let proofsEnabled = false;

describe('Add', () => {
  let deployerAccount: any,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: Shamir;

  beforeAll(async () => {
    await isReady;
    if (proofsEnabled) Shamir.compile();
  });

  beforeEach(() => {
    const Local = Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    deployerAccount = Local.testAccounts[0].privateKey;

    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new Shamir(zkAppAddress);
  });

  afterAll(() => {
    // `shutdown()` internally calls `process.exit()` which will exit the running Jest process early.
    // Specifying a timeout of 0 is a workaround to defer `shutdown()` until Jest is done running all tests.
    // This should be fixed with https://github.com/MinaProtocol/mina/issues/10943
    setTimeout(shutdown, 0);
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.deploy();
    });
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([zkAppPrivateKey]).send();
  }

  it('tests polynomial 1', async () => {
    await localDeploy();
    const txn = await Mina.transaction(deployerAccount, () => {
        let x = UInt64.from(2); // x = 2
        // pol = 2 + x + xˆ2
        const res = evaluatePolynomial(x, [UInt64.from(2), UInt64.from(1), UInt64.from(1)]);
        // 2 + 2 + 2^2 = 8
        expect(res).toEqual(UInt64.from(8));
    });
    await txn.prove();
    await txn.send();
  });

  it('tests polynomial 2', async () => {
    await localDeploy();
    const txn = await Mina.transaction(deployerAccount, () => {
        let x = UInt64.from(33); // x = 2
        // pol = 2 + 5 * x + 7 * xˆ2 + 10 * x^3
        const res = evaluatePolynomial(x, [UInt64.from(2), UInt64.from(5), UInt64.from(7), UInt64.from(10)]);
        // 2 + 5 * 33 + 7 * 33ˆ2 + 10 * 33^3
        // = 
        expect(res).toEqual(UInt64.from(367160));
    });
    await txn.prove();
    await txn.send();
  });

  // example from https://www.geeksforgeeks.org/shamirs-secret-sharing-algorithm-cryptography/
  // secret 65 
  //  (1, 80), (3, 110)
  // WORKS
  it('interpolates polynomial', async () => {
    const zkAppInstance = new Shamir(zkAppAddress);
    await localDeploy();
    const txn = await Mina.transaction(deployerAccount, () => {
        let x1 = UInt64.from(1);
        let x2 = UInt64.from(3);
        let y1 = UInt64.from(80);
        let y2 = UInt64.from(110);
        const res = interpolate([x1, x2], [y1, y2], UInt64.from(2));
        expect(res).toEqual(UInt64.from(65));
    });
    await txn.prove();
    await txn.send();
  });
  
});

import { Field, SmartContract, state, State, method, UInt64, Int64, Struct, Circuit } from 'snarkyjs';

/*
return the evaluation of polynomial created with given coefficients and the given value for x

Example:
a + bx + cxˆ2 + dx^3 with x = 5 given input
(5, [a,b,c,d])
*/
// WORKS
export function evaluatePolynomial(x_value: UInt64, coefficients: UInt64[]) : UInt64 {

  let poly: UInt64 = UInt64.zero;

  for (let i = coefficients.length - 1; i > 0; i--) {
    let xval  = UInt64.one;
    for (let j = 0; j < i; j++) {
      xval =  x_value.mul(xval); // 0, x, xˆ2, xˆ3 etc
    }
    poly = poly.add(xval.mul(coefficients[i])); // coefficient * xval
  }
  poly = poly.add(coefficients[0]);
  return poly;

}

/** 
 * Evaluation of polynomial at x = 0, using the points that have been given
*/
// WORKS
export function interpolate(x_shares: UInt64[], y_shares: UInt64[], poly_degree: UInt64) {
  let result: Int64 = Int64.zero;

  for (let ii=0;ii<poly_degree.toBigInt();ii++){
      let nums: Int64 = Int64.one;
      let denoms: Int64 = Int64.one;
      let x = 0; // evaluation at 0
      // TODO x doesn't have to be a variable
      for (let jj=0;jj<poly_degree.toBigInt();jj++){
        if (ii == jj) {
          continue;
        }
        let num: Int64= Int64.from(x).sub(x_shares[jj]);  
        let denom: Int64 = Int64.from(x_shares[ii]).sub(x_shares[jj]); 
        nums = nums.mul(num);
        denoms = denoms.mul(denom);
      }
      let group: Int64 = (Int64.from(y_shares[ii]).mul(nums)).div(denoms); 
      result = result.add(group);
  }

  return result.magnitude; // gets the uint64 out of int64
}

// TODO add functions to smart contract
export class Shamir extends SmartContract {
  @state(Field) num = State<Field>();

  init() {
    super.init();
    this.num.set(Field(1));
  }

  @method update() {
    const currentState = this.num.get();
    this.num.assertEquals(currentState); // precondition that links this.num.get() to the actual on-chain state
    const newState = currentState.add(2);
    this.num.set(newState);
  }
}

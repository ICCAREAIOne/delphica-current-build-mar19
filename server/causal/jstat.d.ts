/**
 * Minimal type declaration for jstat — covers only the Beta distribution
 * methods used by the Thompson Sampling implementation.
 */
declare module 'jstat' {
  interface JStatBeta {
    /** Sample a single value from Beta(alpha, beta) */
    sample(alpha: number, beta: number): number;
    /** CDF of Beta(alpha, beta) at x */
    cdf(x: number, alpha: number, beta: number): number;
    /** PDF of Beta(alpha, beta) at x */
    pdf(x: number, alpha: number, beta: number): number;
    /** Mean of Beta(alpha, beta) */
    mean(alpha: number, beta: number): number;
  }

  interface JStatGamma {
    sample(shape: number, scale: number): number;
  }

  interface JStatStatic {
    beta: JStatBeta;
    gamma: JStatGamma;
  }

  const jStat: JStatStatic;
  export = jStat;
}

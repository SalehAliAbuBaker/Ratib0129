/* Configure ONLY after a separate staging Worker is deployed and its public key is reviewed.
   Empty keys intentionally keep this review branch read-only. Never add a private key here. */
window.RATIB_LICENSE_CONFIG=Object.freeze({
 endpoint:'',
 issuer:'',
 publicKeys:{},
 clockToleranceMs:300000,
 syncIntervalMs:900000
});

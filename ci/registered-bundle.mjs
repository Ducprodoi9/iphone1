export function selectRegisteredBundle(bundles,identifier) {
 const exact=Array.isArray(bundles)?bundles.filter(bundle=>bundle.attributes?.identifier===identifier):[];
 if(exact.length!==1)throw new Error('Expected exactly one exact existing registered bundle ID for '+identifier);
 return exact[0].id;
}

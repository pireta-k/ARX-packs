import { Block } from "@minecraft/server";

/**
 * Set block permutation
 * @param {Block} block 
 * @param {string} permutationName 
 * @param {string | number | boolean | undefined } value 
 */
export function sPerm(block, permutationName, value) {
    block.setPermutation(block.permutation.withState(permutationName, value))
}
export {
	Offset
}

class Offset {
	static get sides() { return [{x:0,y:0,z:-1},{x:0,y:0,z:1},{x:1,y:0,z:0},{x:-1,y:0,z:0}] }
	static get corners() { return [{x:-1,y:0,z:-1},{x:1,y:0,z:-1},{x:1,y:0,z:1},{x:-1,y:0,z:1}] }
	static get near() { return [{x:0,y:-1,z:0},{x:0,y:1,z:0},{x:0,y:0,z:1},{x:0,y:0,z:-1},{x:1,y:0,z:0},{x:-1,y:0,z:0}] }
	static get cubeSides() { return [{x:0,y:0,z:-1},{x:0,y:0,z:1},{x:1,y:0,z:0},{x:-1,y:0,z:0},{x:-1,y:0,z:-1},{x:1,y:0,z:-1},{x:1,y:0,z:1},{x:-1,y:0,z:1}] }
	static get none() { return [{x:0,y:0,z:0}] }
	static get stairs() { return [{x:-1,y:0,z:0},{x:-1,y:0,z:1},{x:0,y:0,z:1},{z:1,y:0,x:1},{x:1,y:0,z:0},{x:1,y:0,z:-1},{x:0,y:0,z:-1},{x:-1,y:0,z:-1}] }

	/** @param {import('@minecraft/server').Vector3} from @param {import('@minecraft/server').Vector3} to */
	static getCorners(from, to) {
		return [
			{x: from.x, y: from.y, z: from.z},{x: from.x, y: from.y, z: to.z},{x: to.x, y: from.y, z: from.z},{x: to.x, y: from.y, z: to.z},{x: from.x, y: to.y, z: from.z},{x: from.x, y: to.y, z: to.z},{x: to.x, y: to.y, z: from.z},{x: to.x, y: to.y, z: to.z}
		];
	}
}
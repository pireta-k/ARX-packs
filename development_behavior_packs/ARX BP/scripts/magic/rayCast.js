/** This function casts a ray and returns all collided Entities
 * The ray can ricochet from blocks
 */
export function rayCast(p, distance) {
    const d = p.dimension
    let collisions = []

    let distancePassed = 0
    let lastCollision

    // Cast ray
    while (distance < distancePassed) {
        // Logical ray - get block
        d.getBlockFromRay(p.getHeadLocation(),)

        // Logical ray - get entities
    }
}

class CollisionPlace {
    constructor(location, vectorIn, collisionAxis) {

    }
}
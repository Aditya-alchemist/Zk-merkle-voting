use std::hash::pedersen_hash;

fn main() {
    let alice_secret: Field = 123;
    let bob_secret: Field = 456;
    let charlie_secret: Field = 789;
    let david_secret: Field = 999;

    // Leaves
    let alice = pedersen_hash([alice_secret]);
    let bob = pedersen_hash([bob_secret]);
    let charlie = pedersen_hash([charlie_secret]);
    let david = pedersen_hash([david_secret]);

    // Internal nodes
    let ab = pedersen_hash([alice, bob]);
    let cd = pedersen_hash([charlie, david]);

    // Root
    let root = pedersen_hash([ab, cd]);

    // Alice's nullifier for poll 1
    let nullifier = pedersen_hash([alice_secret, 1]);

    println("Alice leaf:");
    println(alice);

    println("Bob leaf:");
    println(bob);

    println("Charlie leaf:");
    println(charlie);

    println("David leaf:");
    println(david);

    println("AB:");
    println(ab);

    println("CD:");
    println(cd);

    println("ROOT:");
    println(root);

    println("Alice nullifier:");
    println(nullifier);
}
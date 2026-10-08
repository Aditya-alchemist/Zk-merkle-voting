use std::hash::pedersen_hash;

fn merkle_hash(left: Field, right: Field) -> Field {
    pedersen_hash([left, right])
}

fn calculate_merkle_root(
    leaf: Field,
    path: [Field; 2],
    indices: [bool; 2],
) -> Field {
    let mut current = leaf;

    for i in 0..2 {
        if indices[i] {
            current = merkle_hash(path[i], current);
        } else {
            current = merkle_hash(current, path[i]);
        }
    }

    current
}

fn main(
secret: Field,
merkle_path: [Field; 2],
path_indices: [bool; 2],
vote_choice: Field,
merkle_root: pub Field,
poll_id: pub Field,
nullifier: pub Field,
) {
   let leaf =pedersen_hash([secret]);
   let calculated_root = calculate_merkle_root(
        leaf,
        merkle_path,
        path_indices,
    );
   assert(calculated_root == merkle_root);

    let calculated_nullifier =
        pedersen_hash([secret, poll_id]);

    assert(calculated_nullifier == nullifier);

    assert((vote_choice == 0) | (vote_choice == 1));
}
#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, symbol_short, Address, BytesN, Env};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    Unauthorized = 2,
    NotFound = 3,
}

#[contracttype]
pub enum DataKey {
    Admin,
    Record(Address), // Maps a user's Address to their KYC hash
}

#[contract]
pub struct KycRegistry;

#[contractimpl]
impl KycRegistry {
    /// Initializes the contract with an admin. Can only be called once.
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        Ok(())
    }

    /// Adds or updates a KYC record for a user.
    /// Requires the authorization of the admin.
    pub fn add_kyc(env: Env, admin: Address, user: Address, kyc_hash: BytesN<32>) -> Result<(), Error> {
        admin.require_auth();
        
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        if admin != stored_admin {
            return Err(Error::Unauthorized);
        }
        
        // Store the KYC hash persistently
        env.storage().persistent().set(&DataKey::Record(user.clone()), &kyc_hash);
        
        // Emit an event for off-chain indexers and dApps
        env.events().publish((symbol_short!("add_kyc"), user), kyc_hash);
        Ok(())
    }

    /// Checks if a user has a valid KYC record.
    pub fn is_verified(env: Env, user: Address) -> bool {
        env.storage().persistent().has(&DataKey::Record(user))
    }

    /// Retrieves the privacy-preserving KYC hash for a user.
    pub fn get_kyc_hash(env: Env, user: Address) -> Result<BytesN<32>, Error> {
        env.storage().persistent().get(&DataKey::Record(user)).ok_or(Error::NotFound)
    }
}